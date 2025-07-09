import os
import random
import time
import json
import sqlite3
from dotenv import load_dotenv
import openai
import faiss
import numpy as np
from gevent.lock import Semaphore

from ..utils.utils import normalize, get_cosine_sim
from ..utils.constant import METADATA_DIR, RAG_EMBED_DIM
# from ..utils.rag_db_utils import get_rag_db

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

faiss_index = faiss.read_index(os.path.join("./instance","hnsw_index.faiss"))
faiss_index.hnsw.efSearch = 64

faiss_lock = Semaphore(1)

# COUNTER = 1

def knn(query,k):
    global COUNTER
    query_emb = openai.embeddings.create(
        model="text-embedding-3-small",
        input=[query],
        dimensions=RAG_EMBED_DIM 
    ).data[0].embedding
    
    with faiss_lock:
        xq = normalize(np.array([query_emb]))
        # print(f'🟡 start faiss {COUNTER}')
        # start_time = time.time()
        D, I = faiss_index.search(xq, k=k)
        # print(f'🔵 end faiss {COUNTER}: {time.time()-start_time:.3f} s.')
        # COUNTER += 1
    cosine_sim = get_cosine_sim(D)[0]

    if cosine_sim[0] < 0.5:
        return {}
    else:
        if cosine_sim[0] > 0.8:
            max_sim = cosine_sim[0]
        else:
            max_sim = 0.5
        ix = 0
        while ix < len(cosine_sim):
            if cosine_sim[ix] < max_sim:
                break
            ix += 1
        return find_facets(cosine_sim[:ix],I[0].tolist()[:ix])

def find_facets(similarity_scores,target_ids):
    # db = get_rag_db()
    with sqlite3.connect("./instance/kv_mapping.db") as db:
        c = db.cursor()

        placeholders = ', '.join(['?'] * len(target_ids))
        search_query = f"SELECT id, key, value, num_record FROM kv_mapping WHERE id IN ({placeholders})"
        c.execute(search_query, target_ids)
        rows = c.fetchall()
        id_to_kv = {row[0]: (row[1], row[2], row[3]) for row in rows}

    ordered_kv_dict = {"facet":[],"sru":[],"score":[],"id":[],"num_records":[]}
    for score, id_ in zip(similarity_scores,target_ids):
        if id_ in id_to_kv:
            k, v, nr = id_to_kv[id_]
            ordered_kv_dict["id"].append(id_)
            ordered_kv_dict["score"].append(float(score))
            ordered_kv_dict["facet"].append(k)
            rand_index = random.choice(list(range(len(json.loads(nr)))))
            ordered_kv_dict["sru"].append(json.loads(v)[rand_index])
            ordered_kv_dict["num_records"].append(json.loads(nr)[rand_index])
    return ordered_kv_dict