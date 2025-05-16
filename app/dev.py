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
<<<<<<< Updated upstream
from .utils.constant import THRES_OPEN_GENERATION, THRES_STOPPING
=======
from .utils.constant import THRES_OPEN_GENERATION, THRES_STOPPING, refusal_response, terminate_response, reinitialization_notification, search_notification

>>>>>>> Stashed changes
from .llm.llm import *
from .llm.rag import knn

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

<<<<<<< Updated upstream
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
=======
@bp.route('/', methods=['GET'])
@login_required
def index():
    session["chat_mode"] = "respond"
    return render_template("dev/index.html",**session)

# the user inputs the initial query or responds to a CQ 
@bp.route("/input",methods=['POST'])
>>>>>>> Stashed changes
@login_required
def user_input():
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
<<<<<<< Updated upstream
            # Module 1: title match
=======
            last_user_intent = ""
            save_conv(user_id,first_input,[])
            # module-1: title match
>>>>>>> Stashed changes
            title_match_hint, title_matching_time = find_exact_title_matches(user_input)
            time_count["title_matching"] = f"{title_matching_time:.3f} s"
            first_user_query = user_input
        else:
            _, _, prev_chat_data = fetch_last_chat_entry(session["user_id"])
            prev_chat_history = prev_chat_data["chat_history"]
            last_user_intent = prev_chat_data["user_intent"]
            first_user_query = prev_chat_history[0]

        # print(last_user_intent)
        # print(prev_chat_history)

        if title_match_hint:
            session["process"].append("- Title matching: ✅")
<<<<<<< Updated upstream
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
=======
            yield json.dumps({"type": "time", 
                              "content": encode_html(render_template("dev/thought/time.html",time_count=time_count))
                            }) + stream_split_marker
        

        # module-2: entity disambiguation
        result = call_entity_disambiguation(prev_chat_history+[user_input])
        if isinstance(result,str):
            yield result + stream_split_marker
            return 
        time_count["entity_disambiguation"] = result[0]
        yield json.dumps({"type": "time", "content": encode_html(render_template("dev/thought/time.html",time_count=time_count))}) + stream_split_marker
>>>>>>> Stashed changes
        
        if result[1][0].lower() in ["no", "false"]:
            # ambiguous query
            cq = result[1][1]
            session["llm_response"] = cq
<<<<<<< Updated upstream
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

            # Rest of the processing logic - summarization, NL2SRU, etc.
            # Module 3: NL2SRU
            start_time = time.time()
            result = call_nl2sru(prev_chat_history+[user_input])
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

            # Module 4: RAG with Gallica
            start_time = time.time()
            try: 
                num_total_records, records = retrieve_with_gallica(result[1])
            except Exception as e:
                yield json.dumps({
                    "type": "error", 
                    "content": fetch_error(e)
                }) + stream_split_marker
                return
                
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
=======
            # session["process"].append("- [Ambiguity analysis] Ambiguous or facetted? Ambiguous")

            # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker
            yield json.dumps({"type": "response", "content": encode_html(render_template(get_chat_template('dev','to_annotate'),**session))}) + stream_split_marker
            save_conv(user_id,first_input,prev_chat_history+[user_input,cq])
        else:
            # faceted query
            # session["process"].append("- [Ambiguity analysis] Ambiguous or facetted? Facetted")
            # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker

            # module-3: conversation summarization
            if not first_input:
                result = call_conv_summarization(prev_chat_history+[user_input])
                if isinstance(result,str):
                    yield result + stream_split_marker
                    return
                time_count["conv_summarization"] = result[0]
                yield json.dumps({"type": "time", "content": encode_html(render_template("dev/thought/time.html",time_count=time_count))}) + stream_split_marker
                # session["process"].append("- [Conversation summarization] ✔️")
                # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker
                current_user_intent = result[1]
            else:
                current_user_intent = user_input

            yield json.dumps({"type": "intent", "content": current_user_intent}) + stream_split_marker

            # module-3: KNN retrieval 
            start_time = time.time()
            result = knn(current_user_intent,20)
            time_count["retrieval"] = f"{time.time()-start_time:.3f}"
            yield json.dumps({"type": "time", "content": encode_html(render_template("dev/thought/time.html",time_count=time_count))}) + stream_split_marker
            # session["process"].append("- [Retrieval using the vector database] ✔️")
            # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker
            if not result or not result["topic"]:
                # no relevant topics based on vector cosine similarity
                response = refusal_response
                if last_user_intent:
                    response += search_notification
                    session["llm_response"] = response
                    yield json.dumps({"type": "response", "content": encode_html(render_template(get_chat_template('dev','to_annotate'),**session))}) + stream_split_marker
                    save_conv(user_id,first_input,prev_chat_history+[user_input,refusal_response],"refused_and_search")

                    # nl2sru
                    rag_result = knn(last_user_intent,1)
                    sru_hint = rag_result["sru_statements"][0]
                    result = call_nl2sru(last_user_intent,sru_hint)
                    if isinstance(result,str):
                        yield result + stream_split_marker
                        return
                    time_count["nl2sru"] = result[0]
                    yield json.dumps({"type": "time", "content": encode_html(render_template("dev/thought/time.html",time_count=time_count))}) + stream_split_marker
                    session["process"].append("- [Conversion to SRU query] ✔️")
                    nl2sru_result = extract_sru_query(result[1])
                    if isinstance(nl2sru_result,Exception):
                        yield json.dumps({"type": "error", "content": f"parse NL2SRU result\n"+fetch_error(nl2sru_result)}) + stream_split_marker
                        return
                    result = retrieve_result_page(nl2sru_result,first_user_query)
                    if isinstance(result,Exception):
                        yield json.dumps({"type": "error", "content": str(result)}) + stream_split_marker
                        return
                    retrieval_result_wc, retrieval_result_woc = result
                    yield json.dumps({"type": "result", "content": encode_html(render_template("dev/retrieve/retrieval_result.html",retrieval_result_wc=retrieval_result_wc,retrieval_result_woc=retrieval_result_woc))}) + stream_split_marker
                else:
                    response += reinitialization_notification
                    session["llm_response"] = response
                    yield json.dumps({"type": "response", "content": encode_html(render_template(get_chat_template('dev','to_annotate'),**session))}) + stream_split_marker
                    save_conv(user_id,first_input,prev_chat_history+[user_input,refusal_response],"refused")
                    yield json.dumps({"type": "reinitialize", "content": ""}) + stream_split_marker
                return
            # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker

            topics, sru_hints = result["topic"], result["sru_statements"]

            # module-4: retrieval result relevance checker
            result = call_relevance_checker(current_user_intent,topics)
            if isinstance(result,str):
                yield result + stream_split_marker
                return
            time_count["relevance_check"] = result[0]
            yield json.dumps({"type": "time", "content": encode_html(render_template("dev/thought/time.html",time_count=time_count))}) + stream_split_marker
            
            conclusion, facet_ids = result[1]
            # session["process"].append(f"- [Relevance check] Retrieval result relevant? {conclusion}")
            # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker
            conclusion, facet_ids = result[1]
            
            if conclusion == "no":
                # no relevant facets based on LLM relevance checker
                response = refusal_response
                if last_user_intent:
                    response += search_notification
                    session["llm_response"] = response
                    yield json.dumps({"type": "response", "content": encode_html(render_template(get_chat_template('dev','to_annotate'),**session))}) + stream_split_marker
                    save_conv(user_id,first_input,prev_chat_history+[user_input,refusal_response],"refused_and_search")
                else:
                    response += reinitialization_notification
                    session["llm_response"] = response
                    yield json.dumps({"type": "response", "content": encode_html(render_template(get_chat_template('dev','to_annotate'),**session))}) + stream_split_marker
                    save_conv(user_id,first_input,prev_chat_history+[user_input,refusal_response],"refused")
                    yield json.dumps({"type": "reinitialize", "content": ""}) + stream_split_marker
                return
            sru_hints = [sru_hints[ix-1] for ix in facet_ids]
            topics = [topics[ix-1] for ix in facet_ids]

            session["process"].append("Sujets pertinents:")
            for ix, topic in enumerate(topics):
                session["process"].append(f"{ix+1}. {topic}")
                yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker

            # module-5: RAC. If relevant, CQ generation based on relevant topics
            result = call_rac(prev_chat_history+[user_input],topics)
            if isinstance(result,str):
                yield result + stream_split_marker
                return
            time_count["rac"] = result[0]
            yield json.dumps({"type": "time", "content": encode_html(render_template("dev/thought/time.html",time_count=time_count))}) + stream_split_marker

            conclusion, cq = result[1]
            if conclusion == "yes":
                # session["process"].append(f"- [RAC] could be further clarified? {conclusion}")
                # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker

                session["llm_response"] = cq
                yield json.dumps({"type": "response", "content": encode_html(render_template(get_chat_template('dev','to_annotate'),**session))}) + stream_split_marker 
                save_conv(user_id,first_input,prev_chat_history+[user_input,cq],user_intent=current_user_intent)
            else:
                # session["process"].append(f"- [RAC] could be further clarified? {conclusion}")
                # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker

                session["llm_response"] = terminate_response
                yield json.dumps({"type": "response", "content": encode_html(render_template(get_chat_template('dev','to_annotate'),**session))}) + stream_split_marker 
                save_conv(user_id,first_input,prev_chat_history+[user_input,terminate_response],status="termintated_by_system")

                # otherwise: terminate, use hint SRU statements from the previous turn for NL2SRU 
                rag_result = knn(current_user_intent,1)
                sru_hint = rag_result["sru_statements"][0]
                result = call_nl2sru(current_user_intent,sru_hint)
                if isinstance(result,str):
                    yield result + stream_split_marker
                    return
                time_count["nl2sru"] = result[0]
                yield json.dumps({"type": "time", "content": encode_html(render_template("dev/thought/time.html",time_count=time_count))}) + stream_split_marker
                # session["process"].append("- [Conversion to SRU query] ✔️")
                nl2sru_result = extract_sru_query(result[1])
                if isinstance(nl2sru_result,Exception):
                    yield json.dumps({"type": "error", "content": f"parse NL2SRU result\n"+fetch_error(nl2sru_result)}) + stream_split_marker
                    return
                result = retrieve_result_page(nl2sru_result,first_user_query)
                if isinstance(result,Exception):
                    yield json.dumps({"type": "error", "content": str(result)}) + stream_split_marker
                    return
                retrieval_result_wc, retrieval_result_woc = result
                yield json.dumps({"type": "result", "content": encode_html(render_template("dev/retrieve/retrieval_result.html",retrieval_result_wc=retrieval_result_wc,retrieval_result_woc=retrieval_result_woc))}) + stream_split_marker

    return Response(stream_with_context(multi_stage_process_user_input()), content_type='text/html')

# @bp.route('/search',methods=['GET','POST'])
# @login_required
# def search(sru_query,original_query):
#     result = retrieve_result_page(sru_query,original_query)
#     if isinstance(result,Exception):
#         print(str(result))
#         return
#     retrieval_result_wc, retrieval_result_woc = result
#     return render_template("dev/retrieve/retrieval_result.html",retrieval_result_wc=retrieval_result_wc,retrieval_result_woc=retrieval_result_woc)

# the user submits the evaluation form of the current turn, and the current turn finishes.
@bp.route('/user_annotation', methods=['POST'])
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    return jsonify({"success": True})
=======
    return render_template(get_chat_template('dev','to_annotate'),**session)
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
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
=======
# def save_conv(user_id, chat_history, first_input):
#     """Save conversation to database"""
#     if first_input:
#         insert_chat_entry(user_id, {
#             "status": "ongoing",
#             "chat_mode": "respond",
#             "chat_history": chat_history
#         })
#     else:
#         update_chat_entry(user_id, {
#             "status": "ongoing",
#             "chat_mode": "respond",
#             "chat_history": chat_history
#         })
>>>>>>> Stashed changes

def end_conversation(user_id, chat_mode, conv_label):
    """End the current conversation"""
    _, last_chat_id, _ = fetch_last_chat_entry(user_id)
    delete_chat_entry(user_id, last_chat_id)