import os
import re
import base64
import string
import random
from collections import defaultdict
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for
)
import numpy as np

from .constant import *

def update_chat_history(prev_chat_history):
    # newly received conversation
    if session["chat_mode"] == "select" and not session["first_input"]:
        new_conv = ['',session["llm_responses"],session["evals"]]
    else:
        new_conv = [session["user_input"],session["llm_responses"],session["evals"]]

    # get current conversation turn id
    prev_chat_history.append([new_conv])

    return prev_chat_history

def collect_evaluations(client_end_data={}):
    chat_mode = "select"
    evals = {}

    if chat_mode == "select":
        turn_annotations = client_end_data.get("turnAnnotations")
        # for ky in ["redondant","unnatural","incomplete"]:
        #     evals[ky] = turn_annotations.get(ky)
        for ky in ["selectedResponseIndex","eliminatedResponseIndexes","selectionClickCounts","eliminationClickCounts"]:
            evals[ky] = client_end_data.get(ky)
    else:
        turn_annotations = client_end_data.get("turnAnnotations")
        for ky in ["unnatural","incomplete"]:
            evals[ky] = turn_annotations.get(ky)
    # evals["user_response_time"] = session.get("user_response_time",-1.0) # first input, no user response time
    # evals["llm_response_time"] = session["llm_response_time"]
    
    session["evals"] = evals

def clear_session(safe_keys):
    current_keys = list(session.keys())
    for k in current_keys:
        if k not in safe_keys:
            session.pop(k,'')

def get_chat_template(bp_name,tag):
    chat_mode = session["chat_mode"]
    return f"/{bp_name}/chat/{chat_mode}_{tag}.html"
    
def turn_tutorial_text_to_html(text):
    text_blocks = text.split('\n')
    return '<br>'.join([f"<p class='tutorial-p'>{text_block}</p>" for text_block in text_blocks])

def string2boolean(s):
    if s.lower() in ['true','y', 'yes']:
        return True
    elif s.lower() in ['false', 'n', 'no']:
        return False
    else:
        print("invalid boolean variable.")

def fetch_error(e):
    return f"{type(e).__name__}: {str(e)}"

def encode_html(html_string):
    return base64.b64encode(html_string.encode()).decode()

def normalize(x):
    return x / np.linalg.norm(x, axis=1, keepdims=True)

def get_cosine_sim(distance):
    return 1 - distance / 2

def extract_sru_query(text):
    try:
        match = re.search(r"#SRU:\s*(.+)", text)
        return match.group(1).strip()
    except Exception as e:
        return e