import os
import re
import time
import json
import pickle
from collections import defaultdict, Counter
import requests
import xml.etree.ElementTree as ET
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from datasketch import MinHash
from rapidfuzz import fuzz, process
# import hdbscan
# from sentence_transformers import SentenceTransformer
from .constant import *

# model = SentenceTransformer('all-MiniLM-L6-v2')

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)

#=== 2025.3.2 Gallica ===
base_gallica_url = "https://gallica.bnf.fr/SRU?version=1.2&operation=searchRetrieve&query={sruQuery}&maximumRecords={maximumRecords}&startRecord={startRecord}"
test_gallica_url = "https://gallica.bnf.fr/SRU?version=1.2&operation=searchRetrieve&query={sruQuery}&maximumRecords=1&startRecord=1"
target_dc_tags = ["creator","description","subject","title","type","contributor","date"]
xml_namespaces = {
            "srw": "http://www.loc.gov/zing/srw/",
            "dc": "http://purl.org/dc/elements/1.1/",
            "oai_dc": "http://www.openarchives.org/OAI/2.0/oai_dc/"
        }

headers = {
    "User-Agent": "Mozilla/5.0", 
    "Accept": "application/xml"   
}

def build_search_result_single_page(url):
    try:
        root = ET.fromstring(requests.get(url,headers=headers).text)
        records = []
    
        for record in root.findall(".//srw:record", xml_namespaces):
            record_data = defaultdict(list)
            
            dc_elements = record.findall(".//oai_dc:dc/*", xml_namespaces)
    
            for elem in dc_elements:
                tag = elem.tag.split('}')[-1] 
                if tag in target_dc_tags:
                    if elem.text:
                        record_data[tag].append(elem.text.strip())
    
            records.append({ky:' | '.join(val) for ky, val in record_data.items()})
        return True, records
    except:
        return False, []

def fetch_titles_and_subjects_only(records):
    titles, subjects = set(), set()
    for record in records:
        if "title" in record:
            titles.add(record["title"])
        if "subject" in record:
         subjects.add(record["subject"])
    return "Titles: " + "\n".join(titles) + "\nSubjects: " + "\n".join(subjects)

def retrieve_result_page(sru_query_with_clarif,query_without_clarif):
    url_wc = base_gallica_url.format(sruQuery=sru_query_with_clarif,startRecord=1,maximumRecords=5)
    url_woc = base_gallica_url.format(sruQuery=f"gallica all {query_without_clarif}",startRecord=1,maximumRecords=5)
    success_wc, records_wc = build_search_result_single_page(url_wc)
    success_woc, records_woc = build_search_result_single_page(url_woc)
    if not success_wc:
        return Exception("Error in communication uing Gallica API: w/ clarification.")
    if not success_woc:
        return Exception("Error in communication uing Gallica API: w/o clarification.")
    return records_wc, records_woc

# tentatively retrieving the first page and get the number of relevant documents
# if N > threshold, open-domain CG + filter;
# if N < threshold, RAG.
def retrieve_with_gallica(sru_query,tentative=False):
    # tentative retrieval: only to get the number of relevant records
    target_url = test_gallica_url.format(sruQuery=sru_query,startRecord=1)
    root = ET.fromstring(requests.get(target_url).text)
    number_of_records = int(root.find(".//srw:numberOfRecords", xml_namespaces).text)

    if tentative or number_of_records > THRES_OPEN_GENERATION:
        return number_of_records, []
    else:
        complete_records = []
        # fetch up to 500 results
        for startIndex in range(min(MAX_NUM_PAGES_TO_RETRIEVAL,(number_of_records - 1) // 50+1)):
            target_url = base_gallica_url.format(sruQuery=sru_query,startRecord=1+startIndex*50,maximumRecords=50)
            success, tmp_records = build_search_result_single_page(target_url)
            if success:
                complete_records += tmp_records
        return number_of_records, complete_records

# quickly verify if a SRU query is valid
def is_valid_sru(sru_query):
    try:
        target_url = test_gallica_url.format(sruQuery=sru_query)
        root = ET.fromstring(requests.get(target_url).text)
        number_of_records = int(root.find(".//srw:numberOfRecords", xml_namespaces).text)
        return number_of_records != 0
    except:
        return False

# tfidf
def extract_tfidf_keywords(texts, top_n=10):
    vectorizer = TfidfVectorizer(ngram_range=(2, 10))
    tfidf_matrix = vectorizer.fit_transform(texts)
    feature_names = vectorizer.get_feature_names_out()
    
    # Compute mean TF-IDF score for each word/phrase
    scores = np.array(tfidf_matrix.mean(axis=0)).flatten()
    sorted_indices = np.argsort(scores)[::-1]  # Sort by importance (descending)
    
    keywords = [(feature_names[i], scores[i]) for i in sorted_indices[:top_n * 2]]  # Get extra for filtering
    return keywords

# clustering + randomly sample titles from each cluster
# def extract_titles_from_document_clusters(titles):
#     if len(titles) < THRES_TITLE_SAMPLING:
#         return titles, 0.0
#     start_time = time.time()

#     embeddings = model.encode(titles)

#     clusterer = hdbscan.HDBSCAN(min_cluster_size=5, min_samples=1)
#     labels = clusterer.fit_predict(embeddings)

#     sampled_titles = []
#     for l in range(max(labels)+1):
#         sampled_titles.append(titles[np.random.choice(np.where(labels==l)[0])])

#     end_time = time.time()
#     return sampled_titles, end_time-start_time

def remove_overlapping_keywords(keywords, top_n=10):
    """Removes overlapping keywords by keeping only the longest, highest-ranked ones."""
    selected_keywords = []
    
    for kw, _ in keywords:
        if not any(kw in selected for selected in selected_keywords):  # Avoid overlapping phrases
            selected_keywords.append(kw)
        if len(selected_keywords) >= top_n:  # Stop once we have enough
            break
    
    return selected_keywords

def extract_non_overlapping_tfidf_keywords(texts, top_n=10):
    """Pipeline: Extracts and filters non-overlapping TF-IDF keywords."""
    keywords = extract_tfidf_keywords(texts, top_n * 5)  # Get extra for filtering
    return remove_overlapping_keywords(keywords, top_n)

def clean_string(text):
    text = re.sub(r'\s*\([^)]*\)', '', text)
    text = text.split('.')[0].strip()
    if ',' in text:
        text = ''.join(text.split(','))
    return text

def clean_texts(texts):
    res = Counter()
    for text in texts:
        for s in text.split('|'):
            s = clean_string(s)
            res[s] += 1
    return list(list(zip(*res.most_common(20)))[0])

def tfidf_extraction(records):
    texts = {criterion:[record[criterion] for record in records if criterion in record] for criterion in target_dc_tags}
    creator_description = clean_texts(texts['creator'])
    contributor_description = clean_texts(texts['contributor'])
    title_description = extract_non_overlapping_tfidf_keywords(texts['title'],30)
    tfidf_kw_description = '\n'.join([f'dc.creator: {creator_description}',f'dc.contributor: {contributor_description}', f'dc.title: {title_description}'])
    return tfidf_kw_description

#=== Exact title matching===
# DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'instance')
# titles = pickle.load(open(os.path.join(DATA_DIR, 'titles.pkl'), 'rb'))
# lsh = pickle.load(open(os.path.join(DATA_DIR, 'lsh_index.pkl'), 'rb'))
demo_titles = ["petit journal", "journal officiel", "le genie civil"]

def get_char_ngrams(text, n=3):
    return set(text[i:i+n] for i in range(len(text) - n + 1)) if len(text) >= n else {text}

def compute_minhash(text, num_perm=128, n=3):
    shingles = get_char_ngrams(text, n)
    m = MinHash(num_perm=num_perm)
    for shingle in shingles:
        m.update(shingle.encode("utf-8"))
    return m

def is_exact_or_covered_query(query, title, token_coverage=0.9, word_similarity_thresh=85):
    query = query.lower().strip()
    title = title.lower().strip()

    if query in title:
        return True

    q_words = query.split()
    t_words = title.split()

    matched = 0
    for qw in q_words:
        if any(fuzz.ratio(qw, tw) >= word_similarity_thresh for tw in t_words):
            matched += 1

    coverage = matched / len(q_words)
    return coverage >= token_coverage

def token_level_coverage(query, title, word_thresh=85, min_coverage=0.9):
    q_tokens = query.lower().strip().split()
    t_tokens = title.lower().strip().split()
    
    matched = 0
    for qw in q_tokens:
        if any(fuzz.ratio(qw, tw) >= word_thresh for tw in t_tokens):
            matched += 1
    
    coverage = matched / len(q_tokens) if q_tokens else 0
    return coverage >= min_coverage, coverage

def find_exact_title_matches(query):
    # start_time = time.time()

    # # 1st step: roughly find matches using lsh
    # query_mh = compute_minhash(query.lower(), num_perm=128, n=3)
    # result_keys = lsh.query(query_mh)

    # # 2nd step: further narrow down using edit distance
    # candidate_titles = []
    # for key in result_keys:
    #     idx = int(key.replace("title_", ""))
    #     title = titles[idx]
    #     score = fuzz.ratio(query, title)
    #     if score >= 0.9:
    #         candidate_titles.append((title, score/100))
    
    # # 3nd step: force token-level matching
    # final_results = {}

    # for title in candidate_titles[:10]:
    #     passed, coverage = token_level_coverage(query, title[0], word_thresh=100, min_coverage=0.8)
    #     if title[0] not in final_results:
    #         final_results[title[0]] = (coverage + title[1]) / 2
    
    # final_results = [(k,v) for k,v in final_results.items()]
    # final_results.sort(key=lambda x: x[1], reverse=True)

    # end_time = time.time()

    # return [(k,v) for k,v in final_results if v > 0.9], end_time - start_time
    if query in demo_titles:
        return query, 0.0
    else:
        return '', 0.0


