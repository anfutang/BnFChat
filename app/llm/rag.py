import os
import sqlite3
from dotenv import load_dotenv
import openai
import faiss
import numpy as np

from utils.utils import normalize, get_cosine_sim
from utils.constant import METADATA_DIR, RAG_EMBED_DIM
from utils.rag_db_utils import get_rag_db

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

faiss_index = faiss.read_index(os.path.join(METADATA_DIR,"demo_hnsw_index.faiss"))
faiss_index.hnsw.efSearch = 64

def knn(query,k):
    xq = normalize(np.array([openai.embeddings.create(
        model="text-embedding-3-small",
        input=[query],
        dimensions=RAG_EMBED_DIM 
    ).data[0].embedding]))
    D, I = faiss_index.search(xq, k=k)
    cosine_sim = get_cosine_sim(D)
    if cosine_sim < 0.5:
        return False
    else:
        return find_facets(I[0].tolist())

def find_facets(target_ids):
    db = get_rag_db()
    c = db.cursor()

    placeholders = ', '.join(['?'] * len(target_ids))
    search_query = f"SELECT id, key, value FROM kv_mapping WHERE id IN ({placeholders})"
    c.execute(search_query, target_ids)
    rows = c.fetchall()
    id_to_kv = {row[0]: (row[1], row[2]) for row in rows}

    ordered_kv_dict = {"topic":[],"sru_statements":[]}
    for id_ in target_ids:
        if id_ in id_to_kv:
            k, v = id_to_kv[id_]
            ordered_kv_dict["topic"].append(k)
            ordered_kv_dict["sru_statements"].append(v)
    return ordered_kv_dict