from flask import (
    Blueprint, flash, g, redirect, render_template, render_template_string, request, session, url_for, jsonify, Response, stream_with_context
)

import os
import time
from datetime import datetime

import functools

from .db import db
from .models import *

from .utils.utils import *
from .utils.constant import *
from .utils.llm import *
from .utils.tutorial_llm_responses import fetch_demo_llm_responses
from .utils.retriever import *
from .utils.constant import THRES_OPEN_GENERATION, THRES_STOPPING

from .llm.llm import *
from .llm.rag import knn

bp = Blueprint('user', __name__, url_prefix="/user")

stream_split_marker = '\n'
thres_stopping_num_records = 20

def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        loggedin, target_url = make_sure_loggedin()
        if not loggedin:
            return target_url 
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/')
@login_required
def index():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    tutorial_text__path = os.path.join(current_dir, 'tutorial_text.json')
    with open(tutorial_text__path, 'r', encoding='utf-8') as f:
        tutorial_texts = json.load(f)
    tutorial_texts = {k:turn_tutorial_text_to_html(v) for k,v in tutorial_texts.items()}
    session["chat_mode"] = "respond"
    return render_template('user/index.html',**session,tutorial_texts=tutorial_texts)

def save_conv(user_id,chat_history,first_input):
    if first_input:
        insert_chat_entry(user_id,{"status":"ongoing","chat_mode":"respond","chat_history":chat_history})
    else:
        update_chat_entry(user_id,{"status":"ongoing","chat_mode":"respond","chat_history":chat_history})

# the user inputs the initial query or responds to a CQ ("response" or "select+respond" mode) through the input box at the bottom.
@bp.route("/input",methods=['POST'])
@login_required
def user_input():
    session["chat_mode"] = "respond"
    user_input = request.form["user-input"]
    session["user_input"] = user_input
    first_input = request.form["first-input"].lower() == "true"
    user_id = session["user_id"]

    def multi_stage_process_user_input():
        
        time_count = {}
        title_match_hint = ''

        if first_input:
            session["process"] = []
            prev_chat_history = []
            # module-1: title match
            title_match_hint, title_matching_time = find_exact_title_matches(user_input)
            time_count["title_matching_time"] = f"{title_matching_time:.3f} s"
        else:
            _, _, prev_chat_data = fetch_last_chat_entry(session["user_id"])
            prev_chat_history = prev_chat_data["chat_history"]

        if title_match_hint:
            session["process"].append("- Title matching: ✅")
            yield json.dumps({"type": "time", 
                              "content": encode_html(render_template("user/thought/time.html",**time_count))
                            }) + stream_split_marker
        

        # module-2: entity disambiguation
        start_time = time.time()
        result = call_entity_disambiguation(prev_chat_history+[user_input])
        end_time = time.time()
        time_count["entity_disambiguation_time"] = f"{end_time-start_time:.3f} s"
        yield json.dumps({"type": "time", "content": encode_html(render_template("user/thought/time.html",**time_count))}) + stream_split_marker

        if isinstance(result,Exception):
            yield json.dumps({"type": "error", "content": fetch_error(result)}) + stream_split_marker
            return
        
        if result[0].lower() in ["no", "false"]:
            cq = result[1]
            session["llm_response"] = cq
            session["process"].append("- Query with a clear focus? ✖️")
            save_conv(user_id,prev_chat_history+[user_input,cq],first_input)

            yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker
            yield json.dumps({"type": "response", "content": encode_html(render_template(get_chat_template('user','to_annotate'),**session))}) + stream_split_marker
        else:
            session["process"].append("- Query with a clear focus? ✔️")
            yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker

            # module-3: conversation summarization
            if not first_input:
                try:
                    current_q = call_conv_summarization(prev_chat_history+[user_input])
                except Exception as e:
                    yield json.dumps({"type": "error", "content": fetch_error(e)}) + stream_split_marker
                    return
            else:
                curret_q = user_input
            
            yield json.dumps({"type": "intent", "content":current_q}) + stream_split_marker
            
            # module-4: RAG using vector database; find most relevant topics
            search_result = knn(current_q)
            if isinstance(search_result,bool):
                yield json.dumps({"type": "irrelevant", "content": '\n'.join(session["process"])}) + stream_split_marker
                return 
        


            # module-3: NL2SRU
            start_time = time.time()
            result = call_nl2sru(prev_chat_history+[user_input])
            end_time = time.time()
            time_count["nl2sru_time"] = f"{end_time-start_time:.3f} s"
            yield json.dumps({"type": "time", "content": encode_html(render_template("user/thought/time.html",**time_count))}) + stream_split_marker

            session["process"].append("- NL2SRU: ✔️")
            session["process"].append(f"- SRU query: {result[1]}")
            yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker


            # module-4: RAG using only vector database 

            start_time = time.time()
            # module-4: retrieve using Gallica
            try: 
                num_total_records, records = retrieve_with_gallica(result[1])
            except Exception as e:
                yield json.dumps({"type": "error", "content": fetch_error(e)}) + stream_split_marker
                return
            end_time = time.time()
            time_count["gallica_retrieval_time"] = f"{end_time-start_time:.3f}"
            yield json.dumps({"type": "time", "content": encode_html(render_template("user/thought/time.html",**time_count))}) + stream_split_marker
            session["process"].append("- Retrieve using Gallica: ✔️")
            session["process"].append(f"- {num_total_records} available records; {len(records)} fetched.")
            yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker

            # module-5: process the raw metadata to ambiguity analysis in NL
            start_time = time.time()
            metadata_summary = call_metadata_processor(prev_chat_history+[user_input],fetch_titles_and_subjects_only(records))
            end_time = time.time()
            time_count["metadata_processing_time"] = f"{end_time-start_time:.3f}"
            yield json.dumps({"type": "time", "content": encode_html(render_template("user/thought/time.html",**time_count))}) + stream_split_marker
            session["process"].append("- Extract facets from the metadata: ✔️")
            yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker

            print('='*10)
            print(metadata_summary)
            
            # module-6: RAG



    return Response(stream_with_context(multi_stage_process_user_input()), content_type='text/html')

# the user submits the evaluation form of the current turn, and the current turn finishes.
@bp.route('/user_annotation', methods=['POST'])
@login_required
def user_annotation():
    user_id = session["user_id"]
    chat_mode = "select"

    _, _, prev_chat_data = fetch_last_chat_entry(user_id)
    current_chat_history = prev_chat_data["chat_history"]
    session["llm_responses"] = current_chat_history[-1][1]

    annotation_data = request.get_json()
    conv_label = annotation_data["convLabel"]
    
    collect_evaluations(annotation_data)

    # print(session["llm_responses"])
    # print(session["evals"]["selectedResponseIndex"])

    selected_response_tuple = session["llm_responses"][session["evals"]["selectedResponseIndex"]] # tuple (sru_query, user_input)
    selected_llm_response = '#'.join(list(selected_response_tuple))

    # every time user submits evaluations, update the most recent record.
    current_chat_history[-1][2] = session["evals"]

    # terminate current turn
    update_chat_entry(user_id,{"status":"ongoing","chat_mode":chat_mode,"chat_history":current_chat_history})

    # if end conversation
    if conv_label:
        end_conversation(user_id,chat_mode,conv_label)

    session["first_input"] = False
    session["annotation_submitted"] = True
        
    return jsonify({"html": render_template(get_chat_template('user','annotated'),**session),
                    "selectedLLMResponse": selected_llm_response})

@bp.route('/erase_chat',methods=['POST'])
def erase_chat():
    clear_session(user_global_keys)
    session["first_input"] = True
    session["annotation_submitted"] = True
    session["chat_mode"] = "respond"
    session["process"] = []
    return render_template(get_chat_template('user','to_annotate'),**session)

@bp.route('/previous_chat',methods=['POST'])
@login_required
def get_previous_chat():
    if session["first_input"]:
        prev_chat_history = []
    else:
        _, _, prev_chat_data = fetch_last_chat_entry(session["user_id"])
        prev_chat_history = prev_chat_data.get("chat_history",[])
        
    user_input = session.get("user_input",'')
    if not session["first_input"] and session["chat_mode"] == "select":
        user_input = ''
    llm_responses = session.get("llm_responses",[])
    return render_template(get_chat_template('user','full_page'),chat_history=prev_chat_history,user_input=user_input,llm_responses=llm_responses)

@bp.route("/change_session",methods=['POST'])
@login_required
def change_session():
    clear_session(user_global_keys)

    new_session_id = request.get_json().get('sessionId')
    session["session_id"] = new_session_id
    session["free_test"] = request.get_json().get('isFreeTest')
    session["chat_mode"] = USER_MODES[new_session_id-1]
    # print(session["session_id"],session["free_test"],session["chat_mode"])
    session["first_input"] = True
    session.modified = True
    return render_template(get_chat_template('user','to_annotate'),**session)
    # return jsonify({"status":"success"})

# the user selected to end the current conversation
# @bp.route("/end_conversation",methods=['POST'])
# @login_required
def end_conversation(user_id,chat_mode,conv_label):
    _, last_chat_id, current_chat_data = fetch_last_chat_entry(user_id)

    # terminate current conversation
    # if not session["in_tutorial"]:
    #     chat_data = {"timestamp":datetime.now().strftime('%Y-%m-%d %H:%M:%S'), "username":session["username"], "chat_history":current_chat_data["chat_history"],
    #                 "label":conv_label, "chat_mode":chat_mode, "status":"finished","free_test":session["free_test"]}
    #     update_chat_entry(user_id,chat_data)
    #     session["first_input"] = True
    # else:
    #     delete_chat_entry(user_id,last_chat_id)

    delete_chat_entry(user_id,last_chat_id)

