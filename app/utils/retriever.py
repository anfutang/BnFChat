import os
import re
import time
import json
import pickle
from collections import defaultdict, Counter
import requests
import xml.etree.ElementTree as ET
import numpy as np
# from sklearn.feature_extraction.text import TfidfVectorizer
# from datasketch import MinHash
# from rapidfuzz import fuzz, process
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

def retrieve_result_page(sru_query_with_clarif,sru_query_without_clarif):
    url_wc = base_gallica_url.format(sruQuery=sru_query_with_clarif,startRecord=1,maximumRecords=5)
    url_woc = base_gallica_url.format(sruQuery=sru_query_without_clarif,startRecord=1,maximumRecords=5)
    success_wc, records_wc = build_search_result_single_page(url_wc)
    success_woc, records_woc = build_search_result_single_page(url_woc)
    if not success_wc:
        return Exception("Une erreur s'est produite lors de la communication avec l'API Gallica : avec clarification.")
    if not success_woc:
        return Exception("Une erreur s'est produite lors de la communication avec l'API Gallica : sans clarification.")
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

def remove_overlapping_keywords(keywords, top_n=10):
    """Removes overlapping keywords by keeping only the longest, highest-ranked ones."""
    selected_keywords = []
    
    for kw, _ in keywords:
        if not any(kw in selected for selected in selected_keywords):  # Avoid overlapping phrases
            selected_keywords.append(kw)
        if len(selected_keywords) >= top_n:  # Stop once we have enough
            break
    
    return selected_keywords

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



