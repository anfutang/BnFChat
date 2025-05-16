from flask import (
    Blueprint, g, render_template, request, session, jsonify, Response, stream_with_context
)

import os
import time
import json
from datetime import datetime
import functools

from .db import db
from .models import *
from .utils.utils import *
from .utils.constant import *
from .utils.tutorial_llm_responses import fetch_demo_llm_responses
from .utils.retriever import *
from .utils.constant import THRES_OPEN_GENERATION, THRES_STOPPING
from .llm.llm import *

bp = Blueprint('dev', __name__, url_prefix="/api/dev")

stream_split_marker = '\n'
thres_stopping_num_records = 20

def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is None:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/tutorial-texts', methods=['GET'])
@login_required
def get_tutorial_texts():
    """Get tutorial texts data"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    tutorial_text__path = os.path.join(current_dir, 'tutorial_text.json')
    with open(tutorial_text__path, 'r', encoding='utf-8') as f:
        tutorial_texts = json.load(f)
    tutorial_texts = {k: turn_tutorial_text_to_html(v) for k, v in tutorial_texts.items()}
    return jsonify(tutorial_texts)

@bp.route('/session-data', methods=['GET'])
@login_required
def get_session_data():
    """Get current session data for client"""
    session_data = {
        "username": session.get("username"),
        "userId": session.get("user_id"),
        "avatarSeed": session.get("avatar-seed"),
        "permissionLevel": session.get("permission_level"),
        "sessionId": session.get("session_id", 1),
        "freeTest": session.get("free_test", True),
        "chatMode": session.get("chat_mode", "respond"),
        "devMode": session.get("dev_mode", False)
    }
    return jsonify(session_data)

@bp.route('/chat-history', methods=['GET'])
@login_required
def get_chat_history():
    """Get current chat history"""
    user_id = session["user_id"]
    if session.get("first_input", True):
        return jsonify([])
    
    _, _, prev_chat_data = fetch_last_chat_entry(user_id)
    prev_chat_history = prev_chat_data.get("chat_history", [])
    return jsonify(prev_chat_history)

@bp.route('/input', methods=['POST'])
@login_required
def user_input():
    print("user_input")
    """Process user input and generate response"""
    session["chat_mode"] = "respond"
    user_input = request.json.get("userInput")
    session["user_input"] = user_input
    first_input = request.json.get("firstInput", True)
    user_id = session["user_id"]

    def multi_stage_process_user_input():
        time_count = {}
        title_match_hint = ''

        if first_input:
            session["process"] = []
            prev_chat_history = []
            # Module 1: title match
            title_match_hint, title_matching_time = find_exact_title_matches(user_input)
            time_count["title_matching_time"] = f"{title_matching_time:.3f} s"
        else:
            _, _, prev_chat_data = fetch_last_chat_entry(session["user_id"])
            prev_chat_history = prev_chat_data["chat_history"]

        if title_match_hint:
            session["process"].append("- Title matching: ✅")
            yield json.dumps({
                "type": "time", 
                "content": time_count
            }) + stream_split_marker

        # Module 2: entity disambiguation
        start_time = time.time()
        result = call_entity_disambiguation(prev_chat_history+[user_input])
        end_time = time.time()
        time_count["entity_disambiguation_time"] = f"{end_time-start_time:.3f} s"
        yield json.dumps({
            "type": "time", 
            "content": time_count
        }) + stream_split_marker

        if isinstance(result, Exception):
            yield json.dumps({
                "type": "error", 
                "content": fetch_error(result)
            }) + stream_split_marker
            return
        
        if result[0].lower() in ["no", "false"]:
            cq = result[1]
            session["llm_response"] = cq
            session["process"].append("- Query with a clear focus? ✖️")
            save_conv(user_id, prev_chat_history+[user_input, cq], first_input)

            yield json.dumps({
                "type": "info", 
                "content": session["process"]
            }) + stream_split_marker
            
            yield json.dumps({
                "type": "response", 
                "content": {
                    "message": cq,
                    "needsAnnotation": True
                }
            }) + stream_split_marker
        else:
            session["process"].append("- Query with a clear focus? ✔️")
            yield json.dumps({
                "type": "info", 
                "content": session["process"]
            }) + stream_split_marker

        # Module 3: NL2SRU
        start_time = time.time()
        try:
            # Pass the correct parameters
            result = call_nl2sru(prev_chat_history+[user_input], "")  # Add empty string as sru_hint
            
            # Debug the result
            print("NL2SRU result:", result)
            
            if not result or len(result) < 2:
                raise Exception("Invalid response format from NL2SRU")
                
            end_time = time.time()
            time_count["nl2sru_time"] = f"{end_time-start_time:.3f} s"
            
            yield json.dumps({
                "type": "time", 
                "content": time_count
            }) + stream_split_marker
            
            session["process"].append("- NL2SRU: ✔️")
            session["process"].append(f"- SRU query: {result[1]}")
            
            yield json.dumps({
                "type": "info", 
                "content": session["process"]
            }) + stream_split_marker
        except Exception as e:
            print(f"Error in NL2SRU processing: {e}")
            yield json.dumps({
                "type": "error", 
                "content": fetch_error(e)
            }) + stream_split_marker
            return

        # Module 4: RAG with Gallica
        start_time = time.time()
        try: 
            if not result[1] or not isinstance(result[1], str):
                raise ValueError(f"Invalid SRU query format: {result[1]}")
                
            num_total_records, records = retrieve_with_gallica(result[1])
            
            end_time = time.time()
            time_count["gallica_retrieval_time"] = f"{end_time-start_time:.3f} s"
            
            yield json.dumps({
                "type": "time", 
                "content": time_count
            }) + stream_split_marker
            
            session["process"].append("- Retrieve using Gallica: ✔️")
            session["process"].append(f"- {num_total_records} available records; {len(records)} fetched.")
            
            yield json.dumps({
                "type": "info", 
                "content": session["process"]
            }) + stream_split_marker
        except Exception as e:
            print(f"Error in Gallica retrieval: {e}")
            print(f"Query that caused error: {result[1] if 'result' in locals() else 'No query generated'}")
            
            yield json.dumps({
                "type": "error", 
                "content": fetch_error(e)
            }) + stream_split_marker
            return
            # Module 5: Process metadata
            start_time = time.time()
            metadata_summary = call_metadata_processor(
                prev_chat_history+[user_input],
                fetch_titles_and_subjects_only(records)
            )
            end_time = time.time()
            time_count["metadata_processing_time"] = f"{end_time-start_time:.3f} s"
            yield json.dumps({
                "type": "time", 
                "content": time_count
            }) + stream_split_marker
            
            session["process"].append("- Extract facets from the metadata: ✔️")
            yield json.dumps({
                "type": "info", 
                "content": session["process"]
            }) + stream_split_marker
            
            # Module 6: RAG (would continue with the rest of the processing)
            # For now, we'll send a sample response
            yield json.dumps({
                "type": "response", 
                "content": {
                    "message": "Here is what I found based on your query...",
                    "metadata": metadata_summary
                }
            }) + stream_split_marker

    return Response(stream_with_context(multi_stage_process_user_input()), content_type='application/json')

@bp.route('/user-annotation', methods=['POST'])
@login_required
def user_annotation():
    """Process user annotation/feedback"""
    user_id = session["user_id"]
    chat_mode = "select"

    _, _, prev_chat_data = fetch_last_chat_entry(user_id)
    current_chat_history = prev_chat_data["chat_history"]
    session["llm_responses"] = current_chat_history[-1][1]

    annotation_data = request.json
    conv_label = annotation_data.get("convLabel")
    
    collect_evaluations(annotation_data)

    selected_response_tuple = session["llm_responses"][session["evals"]["selectedResponseIndex"]]
    selected_llm_response = '#'.join(list(selected_response_tuple))

    # Update chat history with evaluation
    current_chat_history[-1][2] = session["evals"]
    update_chat_entry(user_id, {
        "status": "ongoing",
        "chat_mode": chat_mode,
        "chat_history": current_chat_history
    })

    # End conversation if needed
    if conv_label:
        end_conversation(user_id, chat_mode, conv_label)

    session["first_input"] = False
    session["annotation_submitted"] = True
        
    return jsonify({
        "success": True,
        "selectedResponse": selected_llm_response
    })

@bp.route('/erase-chat', methods=['POST'])
@login_required
def erase_chat():
    """Reset the chat session"""
    clear_session(user_global_keys)
    session["first_input"] = True
    session["annotation_submitted"] = True
    session["chat_mode"] = "respond"
    session["process"] = []
    return jsonify({"success": True})

@bp.route('/change-session', methods=['POST'])
@login_required
def change_session():
    """Change the current session settings"""
    clear_session(user_global_keys)

    data = request.json
    new_session_id = data.get('sessionId')
    session["session_id"] = new_session_id
    session["free_test"] = data.get('isFreeTest')
    session["chat_mode"] = USER_MODES[new_session_id-1]
    session["first_input"] = True
    session.modified = True
    
    return jsonify({"success": True})

def save_conv(user_id, chat_history, first_input):
    """Save conversation to database"""
    if first_input:
        insert_chat_entry(user_id, {
            "status": "ongoing",
            "chat_mode": "respond",
            "chat_history": chat_history
        })
    else:
        update_chat_entry(user_id, {
            "status": "ongoing",
            "chat_mode": "respond",
            "chat_history": chat_history
        })

def end_conversation(user_id, chat_mode, conv_label):
    """End the current conversation"""
    _, last_chat_id, _ = fetch_last_chat_entry(user_id)
    delete_chat_entry(user_id, last_chat_id)