from flask import Blueprint, jsonify, request, session, Response, stream_with_context
import time
import json
import random
import functools
from datetime import datetime

from .db import db
from .models import *
from .utils.utils import *
from .utils.constant import *
from .utils.tutorial_llm_responses import fetch_demo_llm_responses
from .utils.retriever import *
from .utils.constant import *

from .llm.llm import *
from .llm.rag import knn

bp = Blueprint('dev', __name__, url_prefix="/api/dev")

stream_split_marker = '\n'

# Mock data
MOCK_RESPONSES = [
    "Je vous recommande de consulter les ressources suivantes sur ce sujet dans notre catalogue...",
    "D'après la base de données de la BNF, voici quelques ouvrages pertinents que vous pourriez consulter...",
    "J'ai trouvé plusieurs références qui pourraient vous intéresser sur cette thématique...",
    "La BNF dispose de nombreux ouvrages sur ce thème. Voici une sélection des plus pertinents...",
    "Plusieurs documents dans nos collections correspondent à votre requête, notamment..."
]

MOCK_METADATA = [
    "<ul><li>Auteur: Victor Hugo</li><li>Date: 1862</li><li>Cote: RF-12345</li><li>Collection: Littérature française</li></ul>",
    "<ul><li>Auteur: Émile Zola</li><li>Date: 1885</li><li>Cote: LF-67890</li><li>Collection: Romans naturalistes</li></ul>",
    "<ul><li>Auteur: Marcel Proust</li><li>Date: 1913</li><li>Cote: MS-24680</li><li>Collection: Manuscrits modernes</li></ul>",
    "<ul><li>Auteur: Simone de Beauvoir</li><li>Date: 1949</li><li>Cote: PH-97531</li><li>Collection: Philosophie</li></ul>"
]

# Helper function to check login
def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Always consider user as logged in for the dummy backend
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/session-data', methods=['GET'])
@login_required
def get_session_data():
    """Get current session data for client"""
    # Use session data if available, otherwise provide defaults
    session_data = {
        "username": session.get("username", "Utilisateur Test"),
        "userId": session.get("user_id", 123),
        "avatarSeed": session.get("avatar-seed", "default"),
        "permissionLevel": session.get("permission_level", 1),
        "sessionId": session.get("session_id", 1),
        "freeTest": session.get("free_test", True),
        "chatMode": session.get("chat_mode", "respond"),
        "devMode": session.get("dev_mode", True)
    }
    return jsonify(session_data)

@bp.route('/chat-history', methods=['GET'])
@login_required
def get_chat_history():
    """Get current chat history"""
    # Return empty history or mock history
    if not session.get("chat_history"):
        session["chat_history"] = []
    return jsonify(session["chat_history"])


@bp.route("/input",methods=['POST'])
@login_required
def user_input():
    """Process user input and generate response"""
    session["chat_mode"] = "respond"
    user_input = request.json.get("userInput", "")
    first_input = request.json.get("firstInput", True)
    user_id = session.get("user_id")
    print(user_input,first_input)
    print(user_id)

    def multi_stage_process_user_input():
        time_count = {}
        title_match_hint = ''

        if first_input:
            session["process"] = []
            prev_chat_history = []
            last_user_intent = ""
            save_conv(user_id,first_input,[])
            # module-1: title match
            title_match_hint, title_matching_time = find_exact_title_matches(user_input)
            time_count["title_matching"] = f"{title_matching_time:.3f} s"
            first_user_query = user_input
        else:
            _, _, prev_chat_data = fetch_last_chat_entry(user_id)
            prev_chat_history = prev_chat_data["chat_history"]
            print(prev_chat_history)
            last_user_intent = prev_chat_data.get("user_intent","")
            first_user_query = prev_chat_history[0]

        result = call_conv_intent_detection(prev_chat_history+[user_input])
        if isinstance(result,str):
            yield result + stream_split_marker
            return 
        time_count["conv_intent_detection"] = result[0]
        yield json.dumps({"type": "time", "content": time_count}) + stream_split_marker

        conv_intent = result[1]
        print(conv_intent)
        if conv_intent == "abandon":
            session["llm_response"] = abandon_response
            yield json.dumps({
                    "type": "response",
                    "content": {
                        "message": abandon_response,
                        "metadata": None,
                        "needsAnnotation": False
                    }
                }) + "\n"
            save_conv(user_id,first_input,prev_chat_history+[user_input,refusal_response],"abandoned")
            yield json.dumps({"type": "reinitialize", "content": ""}) + stream_split_marker
            return
        elif conv_intent == "search":
            if last_user_intent:
                rag_result = knn(last_user_intent,1)
                sru_hint = rag_result["sru_statements"][0]
                result = call_nl2sru(last_user_intent,sru_hint)
                if isinstance(result,str):
                    yield result + stream_split_marker
                    return
                time_count["nl2sru"] = result[0]
                yield json.dumps({"type": "time", "content": time_count}) + stream_split_marker
                session["process"].append("- [Conversion to SRU query] ✔️")
                nl2sru_result = extract_sru_query(result[1])
                if isinstance(nl2sru_result,Exception):
                    yield json.dumps({"type": "error", "content": f"parse NL2SRU result\n"+fetch_error(nl2sru_result)}) + stream_split_marker
                    return
                original_sru_query = f"gallica all {first_user_query}"
                result = retrieve_result_page(nl2sru_result,original_sru_query)
                if isinstance(result,Exception):
                    yield json.dumps({"type": "error", "content": str(result)}) + stream_split_marker
                    return
                retrieval_result_wc, retrieval_result_woc = result
                yield json.dumps({"type": "result", "content": encode_html(render_template("dev/retrieve/retrieval_result.html",retrieval_result_wc=retrieval_result_wc,retrieval_result_woc=retrieval_result_woc,sru_query=nl2sru_result,original_sru_query=original_sru_query))}) + stream_split_marker
            else:
                session["llm_response"] = no_intent_response
                yield json.dumps({
                    "type": "response",
                    "content": {
                        "message": no_intent_response,
                        "metadata": None,
                        "needsAnnotation": False
                    }
                }) + "\n"
                save_conv(user_id,first_input,prev_chat_history+[user_input,refusal_response],"refused")
                yield json.dumps({"type": "reinitialize", "content": ""}) + stream_split_marker
            return

        if title_match_hint:
            session["process"].append("- Title matching: ✅")
            yield json.dumps({"type": "time", "content": time_count}) + stream_split_marker
        
        if conv_intent == "continue":
            # module-2: entity disambiguation
            result = call_entity_disambiguation(prev_chat_history+[user_input])
            if isinstance(result,str):
                yield result + stream_split_marker
                return 
            time_count["entity_disambiguation"] = result[0]
            yield json.dumps({"type": "time", "content": time_count}) + stream_split_marker
            
            if result[1][0].lower() in ["no", "false"]:
                # ambiguous query
                cq = result[1][1]
                session["llm_response"] = cq
                # session["process"].append("- [Ambiguity analysis] Ambiguous or facetted? Ambiguous")

                # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker
                yield json.dumps({
                    "type": "response",
                    "content": {
                        "message": cq,
                        "metadata": None,
                        "needsAnnotation": False
                    }
                }) + "\n"
                save_conv(user_id,first_input,prev_chat_history+[user_input,cq])
                return
        
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
            yield json.dumps({"type": "time", "content": time_count}) + stream_split_marker
            # session["process"].append("- [Conversation summarization] ✔️")
            # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker
            current_user_intent = result[1]
        else:
            current_user_intent = user_input

        yield json.dumps({"type": "intent", "content": current_user_intent}) + stream_split_marker

        if conv_intent == "respond_and_search":
            rag_result = knn(current_user_intent,1)
            sru_hint = rag_result["sru_statements"][0]
            result = call_nl2sru(current_user_intent,sru_hint)
            if isinstance(result,str):
                yield result + stream_split_marker
                return
            time_count["nl2sru"] = result[0]
            yield json.dumps({"type": "time", "content": time_count}) + stream_split_marker
            session["process"].append("- [Conversion to SRU query] ✔️")
            nl2sru_result = extract_sru_query(result[1])
            if isinstance(nl2sru_result,Exception):
                yield json.dumps({"type": "error", "content": f"parse NL2SRU result\n"+fetch_error(nl2sru_result)}) + stream_split_marker
                return
            original_sru_query = f"gallica all {first_user_query}"
            # result = retrieve_result_page(nl2sru_result,original_sru_query)
            # if isinstance(result,Exception):
            #     yield json.dumps({"type": "error", "content": str(result)}) + stream_split_marker
            #     return
            # retrieval_result_wc, retrieval_result_woc = result
            # yield json.dumps({"type": "result", "content": encode_html(render_template("dev/retrieve/retrieval_result.html",retrieval_result_wc=retrieval_result_wc,retrieval_result_woc=retrieval_result_woc,sru_query=nl2sru_result,original_sru_query=original_sru_query))}) + stream_split_marker
            yield json.dumps({"type": "result", "content": f"{nl2sru_result}###{original_sru_query}"})
            return

        # module-3: KNN retrieval 
        start_time = time.time()
        result = knn(current_user_intent,20)
        time_count["retrieval"] = f"{time.time()-start_time:.3f}"
        yield json.dumps({"type": "time", "content": time_count}) + stream_split_marker
        # session["process"].append("- [Retrieval using the vector database] ✔️")
        # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker
        if not result or not result["topic"]:
            # no relevant topics based on vector cosine similarity
            response = refusal_response
            if last_user_intent:
                response += search_notification
                session["llm_response"] = response
                yield json.dumps({
                    "type": "response",
                    "content": {
                        "message": response,
                        "metadata": None,
                        "needsAnnotation": False
                    }
                }) + "\n"
                save_conv(user_id,first_input,prev_chat_history+[user_input,refusal_response],"refused_and_search")

                # nl2sru
                rag_result = knn(last_user_intent,1)
                sru_hint = rag_result["sru_statements"][0]
                result = call_nl2sru(last_user_intent,sru_hint)
                if isinstance(result,str):
                    yield result + stream_split_marker
                    return
                time_count["nl2sru"] = result[0]
                yield json.dumps({"type": "time", "content": time_count}) + stream_split_marker
                session["process"].append("- [Conversion to SRU query] ✔️")
                nl2sru_result = extract_sru_query(result[1])
                if isinstance(nl2sru_result,Exception):
                    yield json.dumps({"type": "error", "content": f"parse NL2SRU result\n"+fetch_error(nl2sru_result)}) + stream_split_marker
                    return
                original_sru_query = f"gallica all {first_user_query}"
                # result = retrieve_result_page(nl2sru_result,original_sru_query)
                # if isinstance(result,Exception):
                #     yield json.dumps({"type": "error", "content": str(result)}) + stream_split_marker
                #     return
                # retrieval_result_wc, retrieval_result_woc = result
                yield json.dumps({"type": "result", "content": f"{nl2sru_result}###{original_sru_query}"})
            else:
                response += reinitialization_notification
                session["llm_response"] = response
                yield json.dumps({
                    "type": "response",
                    "content": {
                        "message": response,
                        "metadata": None,
                        "needsAnnotation": False
                    }
                }) + "\n"
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
        yield json.dumps({"type": "time", "content": time_count}) + stream_split_marker
        
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
                yield json.dumps({
                    "type": "response",
                    "content": {
                        "message": response,
                        "metadata": None,
                        "needsAnnotation": False
                    }
                }) + "\n"
                save_conv(user_id,first_input,prev_chat_history+[user_input,refusal_response],"refused_and_search")
            else:
                response += reinitialization_notification
                session["llm_response"] = response
                yield json.dumps({
                    "type": "response",
                    "content": {
                        "message": response,
                        "metadata": None,
                        "needsAnnotation": False
                    }
                }) + "\n"
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
        yield json.dumps({"type": "time", "content": time_count}) + stream_split_marker

        conclusion, cq = result[1]
        if conclusion == "yes":
            # session["process"].append(f"- [RAC] could be further clarified? {conclusion}")
            # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker

            session["llm_response"] = cq
            yield json.dumps({
                    "type": "response",
                    "content": {
                        "message": cq,
                        "metadata": None,
                        "needsAnnotation": False
                    }
                }) + "\n"
            save_conv(user_id,first_input,prev_chat_history+[user_input,cq],user_intent=current_user_intent)
        else:
            # session["process"].append(f"- [RAC] could be further clarified? {conclusion}")
            # yield json.dumps({"type": "info", "content": '\n'.join(session["process"])}) + stream_split_marker

            session["llm_response"] = terminate_response
            yield json.dumps({
                    "type": "response",
                    "content": {
                        "message": terminate_response,
                        "metadata": None,
                        "needsAnnotation": False
                    }
                }) + "\n"
            save_conv(user_id,first_input,prev_chat_history+[user_input,terminate_response],status="termintated_by_system")

            # otherwise: terminate, use hint SRU statements from the previous turn for NL2SRU 
            rag_result = knn(current_user_intent,1)
            sru_hint = rag_result["sru_statements"][0]
            result = call_nl2sru(current_user_intent,sru_hint)
            if isinstance(result,str):
                yield result + stream_split_marker
                return
            time_count["nl2sru"] = result[0]
            yield json.dumps({"type": "time", "content": time_count}) + stream_split_marker
            # session["process"].append("- [Conversion to SRU query] ✔️")
            nl2sru_result = extract_sru_query(result[1])
            if isinstance(nl2sru_result,Exception):
                yield json.dumps({"type": "error", "content": f"parse NL2SRU result\n"+fetch_error(nl2sru_result)}) + stream_split_marker
                return
            original_sru_query = f"gallica all {first_user_query}"
            # result = retrieve_result_page(nl2sru_result,original_sru_query)
            # if isinstance(result,Exception):
            #     yield json.dumps({"type": "error", "content": str(result)}) + stream_split_marker
            #     return
            # retrieval_result_wc, retrieval_result_woc = result
            yield json.dumps({"type": "result", "content": f"{nl2sru_result}###{original_sru_query}"})
    return Response(stream_with_context(multi_stage_process_user_input()), content_type='text/html')


@bp.route('/user-annotation', methods=['POST'])
@login_required
def user_annotation():
    """Process user annotation/feedback"""
    # Just acknowledge receipt of the annotation
    conv_label = request.json.get("convLabel", "")
    
    # End conversation if user chose to end it
    if conv_label:
        session["chat_history"] = []
    
    return jsonify({
        "success": True,
        "selectedResponse": "dummyResponse"
    })

@bp.route('/restart-chat', methods=['POST'])
@login_required
def restart_chat():
    """Reset the chat session"""
    session["chat_history"] = []
    return jsonify({"success": True})

@bp.route('/abandon-chat', methods=['POST'])
@login_required
def abandon_chat():
    """Abandon the current chat"""
    session["chat_history"] = []
    return jsonify({"success": True})

@bp.route('/confirm-chat', methods=['POST'])
@login_required
def confirm_chat():
    """Confirm the current chat as satisfactory"""
    return jsonify({"success": True})

@bp.route('/change-session', methods=['POST'])
@login_required
def change_session():
    """Change the current session settings"""
    data = request.json
    session["session_id"] = data.get('sessionId', 1)
    session["free_test"] = data.get('isFreeTest', True)
    session["chat_mode"] = "respond"
    session["chat_history"] = []
    
    return jsonify({"success": True})

@bp.route('/tutorial-texts', methods=['GET'])
@login_required
def get_tutorial_texts():
    """Get tutorial texts data"""
    tutorial_texts = {
        "step1": "Bienvenue dans le tutoriel BNF Chat. Ceci est l'étape 1.",
        "step2": "Apprenez à rechercher des références. Ceci est l'étape 2.",
        "step3": "Utilisez des filtres pour affiner vos résultats. Ceci est l'étape 3.",
        "step4": "Évaluez la pertinence des résultats. Ceci est l'étape 4."
    }
    return jsonify(tutorial_texts)