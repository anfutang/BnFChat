import os
import json
import time
import logging

import requests

from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for
)

from .constant import *
from .random_sents import fetch_random_french_sentences

logging.basicConfig(format='%(asctime)s - %(levelname)s - %(message)s',datefmt='%m/%d/%Y %H:%S',level=logging.INFO,filename="llm.log",filemode='w')

def build_chat_history(session):
    chat_mode = session["chat_mode"]
    if chat_mode == "select":
        chat_history = []
        if len(session["chat_history"]) == 1:
            assert session["chat_history"][0][0], "{user_input} should not be empty for the first chat record."
            chat_history.append(session["chat_history"][0][0])
        else:
            chat_history.append(session["chat_history"][-1][2])
    # elif chat_mode == "respond":
    #     chat_history = []
    #     for ix, (user_input, _, cq, _) in enumerate(session["chat_history"]):
    #         if ix == 0:
    #             chat_history.append(f"Requête : {user_input}"+'\n'+f"Question de clarification : {cq}")
    #         else:
    #             chat_history.append(f"Réponse : {user_input}"+'\n'+f"Question de clarification : {cq}")
    #     current_turn_response = session["user_input"]
    #     chat_history.append(f"Réponse: {current_turn_response}")
    else:
        chat_history = []
        for ix, (user_input, _, selected_cq, _) in enumerate(session["chat_history"]):
            if ix == 0:
                chat_history.append(f"Requête : {user_input}"+'\n'+f"Question de clarification : {selected_cq}")
            else:
                chat_history.append(f"Réponse : {user_input}"+'\n'+f"Question de clarification : {selected_cq}")
        current_turn_response = session["user_input"]
        chat_history.append(f"Réponse: {current_turn_response}")
    return '\n'.join(chat_history)

def prepare_input_data(session,refresh,previous_output):
    if "chat_history" not in session:
        return {"input":session["user_input"],
                "chat_mode":session["chat_mode"],
                "prompt_type":PROMPT_TYPE,
                "first_input":True,
                "refresh":refresh,
                "previous_output":previous_output
        }
    else:
        return {"input":build_chat_history(session),
                "chat_mode":session["chat_mode"],
                "prompt_type":PROMPT_TYPE,
                "first_input":False,
                "refresh":refresh,
                "previous_output":previous_output
        }
    
def pseudo_interaction_with_llm(session,refresh,previous_output):
    if session["chat_mode"] == "respond":
        return fetch_random_french_sentences(1)
    else:
        return fetch_random_french_sentences(5)

def interact_with_llm(session,refresh=False,previous_output=[]):
    if session["dev_mode"]:
        return pseudo_interaction_with_llm(session,refresh,previous_output)
    data_to_send = prepare_input_data(session,refresh,previous_output)
    logging.info('='*10)
    logging.info("data prepared: "+data_to_send["chat_mode"]+';'+str(data_to_send["first_input"]))
    logging.info(data_to_send["input"])

    start_time = time.time()
    response = requests.post(LLM_API_URL, json=data_to_send)
    end_time = time.time()

    logging.info(f"time used: {end_time-start_time:.5f} s.")
    logging.info('='*10)
    
    try:
        result = response.json()["result"][chatmode2ky[session["chat_mode"]]]
        with open('tmp_result.json','w') as f:
            json.dump({'output':result},f)
    except:
        # if session["chat_mode"] == "respond":
        #     result = response.json()["result"]
        # else:
        #     result = [response.json()["result"]]
        result = response.json()["result"]
        with open('error_tmp_result.json','w') as f:
            json.dump({'output':result},f)
    return result


# def interact_with_llm(session):
#     return []