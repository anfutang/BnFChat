from flask import Blueprint, jsonify, request, session, Response, stream_with_context
import time
import json
import random
import functools
from datetime import datetime
import logging

from .db import db
from .models import *
from .utils.utils import *
from .utils.constant import *
from .utils.tutorial_llm_responses import fetch_demo_llm_responses
from .utils.retriever import *
from .utils.constant import *
import traceback

from .llm.llm import *
from .llm.rag import knn

bp = Blueprint('dev', __name__, url_prefix="/api/dev")

logger = logging.getLogger(__name__)

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


@bp.route("/input", methods=['GET'])
def user_input():
    """Process user input and generate response"""
    # Get parameters from query string instead of JSON body
    user_input = request.args.get('query', '')
    first_input = request.args.get('first', 'false').lower() == 'true'
    session_id = request.args.get('session', '')
    
    session["chat_mode"] = "respond"
    user_id = session.get("user_id")
    
    logger.info(f"Received input request: query='{user_input}', first={first_input}, session={session_id}")

    def multi_stage_process_user_input():
        time_count = {}
        title_match_hint = ''
        
        # Initial connection message
        yield f"data: {json.dumps({'type': 'connection', 'content': 'Connected'})}\n\n"
        
        # Initial typing indicator
        yield f"data: {json.dumps({'type': 'typing', 'content': 'Traitement en cours...'})}\n\n"

        if first_input:
            session["process"] = []
            prev_chat_history = []
            last_user_intent = ""
            save_conv(user_id, first_input, [])
            # module-1: title match
            start_time = time.time()
            title_match_hint, title_matching_time = find_exact_title_matches(user_input)
            time_count["title_matching"] = f"{title_matching_time:.3f}s"
            first_user_query = user_input
        else:
            _, _, prev_chat_data = fetch_last_chat_entry(user_id)
            prev_chat_history = prev_chat_data["chat_history"]
            last_user_intent = prev_chat_data.get("user_intent", "")
            first_user_query = prev_chat_history[0]

        # Update with timing info
        yield f"data: {json.dumps({'type': 'time', 'content': time_count})}\n\n"
        
        # Intent detection
        result = call_conv_intent_detection(prev_chat_history + [user_input])
        if isinstance(result, str):
            yield f"data: {json.dumps({'type': 'error', 'content': result})}\n\n"
            return
            
        time_count["conv_intent_detection"] = result[0]
        yield f"data: {json.dumps({'type': 'time', 'content': time_count})}\n\n"

        conv_intent = result[1]
        print(conv_intent)
        
        # Process user intent
        thought_process = ["Analyse de votre requête..."]
        yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
        
        if conv_intent == "abandon":
            session["llm_response"] = abandon_response
            response_data = {
                'type': 'response',
                'content': {
                    'message': abandon_response,
                    'metadata': {'session': session_id, 'query': user_input},
                    'needsAnnotation': False
                }
            }
            yield f"data: {json.dumps(response_data)}\n\n"
            save_conv(user_id, first_input, prev_chat_history + [user_input, refusal_response], "abandoned")
            yield f"data: {json.dumps({'type': 'reinitialize', 'content': ''})}\n\n"
            return
        elif conv_intent == "search":
            if last_user_intent:
                # Process search with last intent
                thought_process.append("Préparation de la recherche...")
                yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
                
                rag_result = knn(last_user_intent, 1)
                sru_hint = rag_result["sru_statements"][0]
                result = call_nl2sru(last_user_intent, sru_hint)
                
                if isinstance(result, str):
                    yield f"data: {json.dumps({'type': 'error', 'content': result})}\n\n"
                    return
                    
                time_count["nl2sru"] = result[0]
                yield f"data: {json.dumps({'type': 'time', 'content': time_count})}\n\n"
                
                thought_process.append("Conversion en requête SRU...")
                yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
                
                nl2sru_result = extract_sru_query(result[1])
                if isinstance(nl2sru_result, Exception):
                    response_data = json.dumps({'type': 'error', 'content': f"Erreur lors de l'analyse NL2SRU: {fetch_error(nl2sru_result)}"})
                    yield f"data: {response_data}\n\n"
                    return
                
                original_sru_query = f"gallica all {first_user_query}"
                response_data = json.dumps({'type': 'result', 'content': f"{nl2sru_result}###{original_sru_query}"})
                yield f"data: {response_data}\n\n"
            else:
                session["llm_response"] = no_intent_response
                response_data = {
                    'type': 'response',
                    'content': {
                        'message': no_intent_response,
                        'metadata': {'session': session_id, 'query': user_input},
                        'needsAnnotation': False
                    }
                }
                yield f"data: {json.dumps(response_data)}\n\n"
                save_conv(user_id, first_input, prev_chat_history + [user_input, refusal_response], "refused")
                yield f"data: {json.dumps({'type': 'reinitialize', 'content': ''})}\n\n"
            return

        if title_match_hint:
            thought_process.append("Correspondance de titre trouvée")
            yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
        
        # Continue with the rest of your processing (entity disambiguation, etc.)
        if conv_intent == "continue":
            thought_process.append("Analyse des entités...")
            yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
            
            # module-2: entity disambiguation
            result = call_entity_disambiguation(prev_chat_history + [user_input])
            if isinstance(result, str):
                yield f"data: {json.dumps({'type': 'error', 'content': result})}\n\n"
                return
                
            time_count["entity_disambiguation"] = result[0]
            yield f"data: {json.dumps({'type': 'time', 'content': time_count})}\n\n"
            
            if result[1][0].lower() in ["no", "false"]:
                # ambiguous query
                cq = result[1][1]
                session["llm_response"] = cq
                
                thought_process.append("Requête ambiguë détectée")
                yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
                
                response_data = {
                    'type': 'response',
                    'content': {
                        'message': cq,
                        'metadata': {'session': session_id, 'query': user_input},
                        'needsAnnotation': False
                    }
                }
                yield f"data: {json.dumps(response_data)}\n\n"
                save_conv(user_id, first_input, prev_chat_history + [user_input, cq])
                return
        
                # Conversation summarization
        if not first_input:
            thought_process.append("Résumé de la conversation...")
            yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
            
            result = call_conv_summarization(prev_chat_history + [user_input])
            if isinstance(result, str):
                yield f"data: {json.dumps({'type': 'error', 'content': result})}\n\n"
                return
                
            time_count["conv_summarization"] = result[0]
            yield f"data: {json.dumps({'type': 'time', 'content': time_count})}\n\n"
            current_user_intent = result[1]
        else:
            current_user_intent = user_input

        yield f"data: {json.dumps({'type': 'intent', 'content': current_user_intent})}\n\n"

        # Handle respond_and_search intent
        if conv_intent == "respond_and_search":
            thought_process.append("Préparation de la recherche...")
            yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
            
            rag_result = knn(current_user_intent, 1)
            sru_hint = rag_result["sru_statements"][0]
            
            thought_process.append("Conversion de la requête naturelle en SRU...")
            yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
            
            result = call_nl2sru(current_user_intent, sru_hint)
            if isinstance(result, str):
                yield f"data: {json.dumps({'type': 'error', 'content': result})}\n\n"
                return
                
            time_count["nl2sru"] = result[0]
            yield f"data: {json.dumps({'type': 'time', 'content': time_count})}\n\n"
            
            nl2sru_result = extract_sru_query(result[1])
            if isinstance(nl2sru_result, Exception):
                response_data = json.dumps({'type': 'error', 'content': f"Erreur lors de l'analyse NL2SRU: {fetch_error(nl2sru_result)}"})
                yield f"data: {response_data}\n\n"
                return
                
            original_sru_query = f"gallica all {first_user_query}"
            response_data = json.dumps({'type': 'result', 'content': f"{nl2sru_result}###{original_sru_query}"})
            yield f"data: {response_data}\n\n"
            return

        # KNN retrieval
        thought_process.append("Recherche dans la base de connaissances...")
        yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
        
        start_time = time.time()
        result = knn(current_user_intent, 20)
        time_count["retrieval"] = f"{time.time()-start_time:.3f}s"
        
        yield f"data: {json.dumps({'type': 'time', 'content': time_count})}\n\n"
        
        if not result or not result["topic"]:
            # No relevant topics based on vector cosine similarity
            thought_process.append("Aucun sujet pertinent trouvé")
            yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
            
            response = refusal_response
            if last_user_intent:
                response += search_notification
                session["llm_response"] = response
                
                response_data = {
                    'type': 'response',
                    'content': {
                        'message': response,
                        'metadata': {'session': session_id, 'query': user_input},
                        'needsAnnotation': False
                    }
                }
                yield f"data: {json.dumps(response_data)}\n\n"
                
                save_conv(user_id, first_input, prev_chat_history + [user_input, refusal_response], "refused_and_search")

                # nl2sru processing
                thought_process.append("Tentative de recherche alternative...")
                yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
                
                rag_result = knn(last_user_intent, 1)
                sru_hint = rag_result["sru_statements"][0]
                result = call_nl2sru(last_user_intent, sru_hint)
                
                if isinstance(result, str):
                    yield f"data: {json.dumps({'type': 'error', 'content': result})}\n\n"
                    return
                    
                time_count["nl2sru"] = result[0]
                yield f"data: {json.dumps({'type': 'time', 'content': time_count})}\n\n"
                
                nl2sru_result = extract_sru_query(result[1])
                if isinstance(nl2sru_result, Exception):
                    response_data = json.dumps({'type': 'error', 'content': f"Erreur lors de l'analyse NL2SRU: {fetch_error(nl2sru_result)}"})
                    yield f"data: {response_data}\n\n"
                    return
                    
                original_sru_query = f"gallica all {first_user_query}"
                response_data = json.dumps({'type': 'result', 'content': f"{nl2sru_result}###{original_sru_query}"})
                yield f"data: {response_data}\n\n"
            else:
                response += reinitialization_notification
                session["llm_response"] = response
                
                response_data = {
                    'type': 'response',
                    'content': {
                        'message': response,
                        'metadata': {'session': session_id, 'query': user_input},
                        'needsAnnotation': False
                    }
                }
                yield f"data: {json.dumps(response_data)}\n\n"
                
                save_conv(user_id, first_input, prev_chat_history + [user_input, refusal_response], "refused")
                yield f"data: {json.dumps({'type': 'reinitialize', 'content': ''})}\n\n"
            return

        # Extract topics and SRU hints
        topics, sru_hints = result["topic"], result["sru_statements"]

        # Relevance checker
        thought_process.append("Vérification de la pertinence des résultats...")
        yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
        
        result = call_relevance_checker(current_user_intent, topics)
        if isinstance(result, str):
            yield f"data: {json.dumps({'type': 'error', 'content': result})}\n\n"
            return
            
        time_count["relevance_check"] = result[0]
        yield f"data: {json.dumps({'type': 'time', 'content': time_count})}\n\n"
        
        conclusion, facet_ids = result[1]
        
        if conclusion == "no":
            # No relevant facets based on LLM relevance checker
            thought_process.append("Aucun sujet jugé pertinent")
            yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
            
            response = refusal_response
            if last_user_intent:
                response += search_notification
                session["llm_response"] = response
                response_data = {
                    'type': 'response',
                    'content': {
                        'message': cq,
                        'metadata': {'session': session_id, 'query': user_input},
                        'needsAnnotation': False
                    }
                }
                yield f"data: {json.dumps(response_data)}\n\n"
                
                save_conv(user_id, first_input, prev_chat_history + [user_input, refusal_response], "refused_and_search")
            else:
                response += reinitialization_notification
                session["llm_response"] = response
                
                response_data = {
                    'type': 'response',
                    'content': {
                        'message': terminate_response,
                        'metadata': {'session': session_id, 'query': user_input},
                        'needsAnnotation': False
                    }
                }
                yield f"data: {json.dumps(response_data)}\n\n"
                
                save_conv(user_id, first_input, prev_chat_history + [user_input, refusal_response], "refused")
                yield f"data: {json.dumps({'type': 'reinitialize', 'content': ''})}\n\n"
            return
            
        # Filter topics based on facet IDs
        sru_hints = [sru_hints[ix-1] for ix in facet_ids]
        topics = [topics[ix-1] for ix in facet_ids]

        # Display relevant topics
        thought_process.append("Sujets pertinents identifiés:")
        for ix, topic in enumerate(topics):
            thought_process.append(f"{ix+1}. {topic}")
        
        yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"

        # RAC (Request for Additional Clarification)
        thought_process.append("Analyse du besoin de clarification...")
        yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
        
        result = call_rac(prev_chat_history + [user_input], topics)
        if isinstance(result, str):
            yield f"data: {json.dumps({'type': 'error', 'content': result})}\n\n"
            return
            
        time_count["rac"] = result[0]
        yield f"data: {json.dumps({'type': 'time', 'content': time_count})}\n\n"

        conclusion, cq = result[1]
        if conclusion == "yes":
            thought_process.append("Demande de clarification nécessaire")
            yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"

            session["llm_response"] = cq
            response_data = {
                'type': 'response',
                'content': {
                    'message': terminate_response,
                    'metadata': {'session': session_id, 'query': user_input},
                    'needsAnnotation': False
                }
            }
            yield f"data: {json.dumps(response_data)}\n\n"
            
            save_conv(user_id, first_input, prev_chat_history + [user_input, cq], user_intent=current_user_intent)
        else:
            thought_process.append("Requête suffisamment claire, préparation de la recherche finale")
            yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"

            session["llm_response"] = terminate_response
            response_data = {
                'type': 'response',
                'content': {
                    'message': terminate_response,
                    'metadata': {'session': session_id, 'query': user_input},
                    'needsAnnotation': False
                }
            }
            yield f"data: {json.dumps(response_data)}\n\n"
            
            save_conv(user_id, first_input, prev_chat_history + [user_input, terminate_response], status="termintated_by_system")

            # NL2SRU conversion for search
            rag_result = knn(current_user_intent, 1)
            sru_hint = rag_result["sru_statements"][0]
            
            thought_process.append("Conversion de la requête naturelle en SRU...")
            yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
            
            result = call_nl2sru(current_user_intent, sru_hint)
            if isinstance(result, str):
                yield f"data: {json.dumps({'type': 'error', 'content': result})}\n\n"
                return
                
            time_count["nl2sru"] = result[0]
            yield f"data: {json.dumps({'type': 'time', 'content': time_count})}\n\n"
            
            nl2sru_result = extract_sru_query(result[1])
            if isinstance(nl2sru_result, Exception):
                response_data = json.dumps({'type': 'error', 'content': f"Erreur lors de l'analyse NL2SRU: {fetch_error(nl2sru_result)}"})
                yield f"data: {response_data}\n\n"
                return
                
            original_sru_query = f"gallica all {first_user_query}"
            
            thought_process.append("Recherche finalisée")
            yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
            
            response_data = json.dumps({'type': 'result', 'content': f"{nl2sru_result}###{original_sru_query}"})
            yield f"data: {response_data}\n\n"

    # Set proper headers for Server-Sent Events
    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }
    
    return Response(stream_with_context(multi_stage_process_user_input()), headers=headers)


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


@bp.route("/stream", methods=['GET'])
def stream_processing():
    try:
        # Get query parameters
        user_input = request.args.get('query', '')
        is_first_input = request.args.get('first', 'false').lower() == 'true'
        current_session = request.args.get('session', '1')
        
        # URL-decode the input
        # user_input = unquote(user_input)
        
        logger.info(f"Received stream request: query='{user_input}', first={is_first_input}, session={current_session}")
        
        # Store in session if needed
        session["chat_mode"] = "respond"
        session["user_input"] = user_input
        session["session_id"] = current_session
        
        def generate_stream():
            """Generator function that yields chat processing results as SSE format"""
            
            # Initialize processing state
            timing_info = {}
            
            try:
                # Send an initial message to establish the connection
                yield f"data: {json.dumps({'type': 'connection', 'content': 'Connected'})}\n\n"
                
                # Initial typing indicator
                yield f"data: {json.dumps({'type': 'typing', 'content': 'Initialisation...'})}\n\n"
                
                # Get existing processing steps from your regular input handler
                # This allows you to reuse the existing processing logic
                
                # Step 1: Process the query - adapt from your existing input handler
                start_time = time.time()
                
                # Update information about processing
                thought_process = ["Analyse de votre requête..."]
                yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
                
                # Here you would add your actual processing logic that was in your 
                # existing /input route, sending updates through the stream
                
                # Example: Entity extraction
                start_entity_time = time.time()
                # ... your actual entity extraction code here ...
                end_entity_time = time.time()
                
                timing_info["entity_extraction"] = f"{end_entity_time - start_entity_time:.3f}s"
                yield f"data: {json.dumps({'type': 'time', 'content': timing_info})}\n\n"
                
                thought_process.append("Entités extraites...")
                yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
                
                # Example: Query construction
                start_query_time = time.time()
                # ... your actual query construction code here ...
                end_query_time = time.time()
                
                timing_info["query_construction"] = f"{end_query_time - start_query_time:.3f}s"
                yield f"data: {json.dumps({'type': 'time', 'content': timing_info})}\n\n"
                
                thought_process.append("Construction de la requête...")
                yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
                
                # Example: Search execution
                start_search_time = time.time()
                # ... your actual search execution code here ...
                end_search_time = time.time()
                
                timing_info["search_execution"] = f"{end_search_time - start_search_time:.3f}s"
                yield f"data: {json.dumps({'type': 'time', 'content': timing_info})}\n\n"
                
                thought_process.append("Recherche exécutée...")
                yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
                
                # Example: Response generation
                start_response_time = time.time()
                # ... your actual response generation code here ...
                end_response_time = time.time()
                
                timing_info["response_generation"] = f"{end_response_time - start_response_time:.3f}s"
                yield f"data: {json.dumps({'type': 'time', 'content': timing_info})}\n\n"
                
                thought_process.append("Génération de la réponse...")
                yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
                
                # Generate final response 
                # This should be adapted from your existing input handler's response generation
                
                # Example response
                response_data = {
                    "message": f"Voici votre réponse pour '{user_input}'",
                    "metadata": {
                        "session": current_session,
                        "query": user_input,
                        # Add any other metadata you need
                    },
                    "needsAnnotation": False  # Set to True if annotation is needed
                }
                
                # Calculate total time
                end_time = time.time()
                timing_info["total_time"] = f"{end_time - start_time:.3f}s"
                yield f"data: {json.dumps({'type': 'time', 'content': timing_info})}\n\n"
                
                # Final thought process update
                thought_process.append("Traitement terminé!")
                yield f"data: {json.dumps({'type': 'info', 'content': thought_process})}\n\n"
                
                # Send the final response
                yield f"data: {json.dumps({'type': 'response', 'content': response_data})}\n\n"
                
            except Exception as e:
                logger.error(f"Error in stream generation: {str(e)}")
                logger.error(traceback.format_exc())
                
                # Handle errors
                yield f"data: {json.dumps({'type': 'typing', 'content': 'Une erreur est survenue...'})}\n\n"
                yield f"data: {json.dumps({'type': 'error', 'content': f'Une erreur est survenue: {str(e)}'})}\n\n"
        
        # Set proper headers for Server-Sent Events
        headers = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
        
        return Response(
            stream_with_context(generate_stream()),
            headers=headers
        )
    
    except Exception as e:
        logger.error(f"Error in stream handler: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}, 500