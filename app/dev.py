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
import uuid
import traceback

from .llm.llm import *
from .llm.rag import knn

bp = Blueprint('dev', __name__, url_prefix="/api/dev")

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Add this handler to make the logs display in the console
handler = logging.StreamHandler()
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

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
    # Get parameters from query string
    user_input = request.args.get('query', '')
    first_input = request.args.get('first', 'false').lower() == 'true'
    session_id = request.args.get('session', '')
    
    session["chat_mode"] = "respond"
    user_id = session.get("user_id")
    
    logger.info(f"Received input request: query='{user_input}', first={first_input}, session={session_id}")

    # Set proper headers for Server-Sent Events
    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }
    
    return Response(stream_with_context(process_user_input_stream(user_input, first_input, session_id, user_id)), headers=headers)


def process_user_input_stream(user_input, first_input, session_id, user_id):
    """Main processing function that yields SSE events as the processing progresses"""
    time_count = {}
    title_match_hint = ''
    thought_process = []
    
    # Initialize chat history and context
    prev_chat_history, first_user_query, last_user_intent = initialize_chat_context(user_id, first_input, user_input)
    
    # Yield initial connection and typing indicators
    yield event_data('connection', 'Connected')
    yield event_data('typing', 'Traitement en cours...')
    # Title matching (only for first input)
    if first_input:
        title_match_hint, title_matching_time = find_exact_title_matches(user_input)
        time_count["title_matching"] = f"{title_matching_time:.3f}s"
        yield event_data('time', time_count)
        
        if title_match_hint:
            thought_process.append("Correspondance de titre trouvée")
            yield event_data('info', thought_process)

    # Detect conversation intent
    conv_intent, conv_intent_time = detect_conversation_intent(prev_chat_history + [user_input])
    if isinstance(conv_intent, str) and conv_intent.startswith("Error:"):
        logger.info(f"Connection closing: Error in conversation intent detection - {conv_intent}")
        yield event_data('error', conv_intent)
        return
        
    time_count["conv_intent_detection"] = conv_intent_time
    yield event_data('time', time_count)
    
    # Process based on conversation intent
    thought_process.append("Analyse de votre requête...")
    yield event_data('info', thought_process)
    
    # Handle different conversation intents
    if conv_intent == "abandon":
        logger.info(f"Connection closing: Abandon intent detected for session {session_id}")
        yield from handle_abandon_intent(user_id, first_input, prev_chat_history, user_input, session_id)
        return
    
    elif conv_intent == "search":
        logger.info(f"Connection closing: Search intent detected for session {session_id}")
        yield from handle_search_intent(user_id, first_input, prev_chat_history, user_input, last_user_intent, 
                                      first_user_query, session_id, time_count, thought_process)
        return
    
    # Handle entity disambiguation for 'continue' intent
    if conv_intent == "continue":
        disambiguation_result = yield from handle_entity_disambiguation(user_id, first_input, prev_chat_history, user_input, 
                                              session_id, time_count, thought_process)
        if disambiguation_result:
            logger.info(f"Connection already closed by entity disambiguation for session {session_id}")
            return
    
    # Summarize conversation for non-first inputs
    current_user_intent = summarize_conversation(prev_chat_history, user_input, first_input, 
                                                time_count, thought_process)
    yield event_data('intent', current_user_intent)
    
    # Handle respond_and_search intent
    if conv_intent == "respond_and_search":
        logger.info(f"Connection closing: respond_and_search intent detected for session {session_id}")
        yield from handle_respond_search_intent(current_user_intent, first_user_query, 
                                              time_count, thought_process)
        return
    
    # Perform knowledge retrieval
    retrieval_result = perform_knowledge_retrieval(current_user_intent, time_count, thought_process)
    if not retrieval_result:
        logger.info(f"Connection closing: No topics found for session {session_id}")
        yield from handle_no_topics_found(user_id, first_input, prev_chat_history, user_input, 
                                        last_user_intent, first_user_query, session_id, time_count, thought_process)
        return
    
    topics, sru_hints = retrieval_result
    
    # Check relevance of retrieved topics
    relevant_topics, relevant_hints = check_topic_relevance(current_user_intent, topics, sru_hints, 
                                                           time_count, thought_process)
    if not relevant_topics:
        logger.info(f"Connection closing: No relevant facets for session {session_id}")
        yield from handle_no_relevant_facets(user_id, first_input, prev_chat_history, user_input, 
                                           last_user_intent, first_user_query, session_id, time_count, thought_process)
        return
    
    # Display relevant topics
    thought_process.append("Sujets pertinents identifiés:")
    for ix, topic in enumerate(relevant_topics):
        thought_process.append(f"{ix+1}. {topic}")
    yield event_data('info', thought_process)
    
    # Check if clarification is needed
    clarification_needed, clarification_question = check_clarification_needed(
        prev_chat_history, user_input, relevant_topics, time_count, thought_process)
    
    if clarification_needed:
        logger.info(f"Connection closing: Clarification needed for session {session_id}")
        yield from handle_clarification_needed(user_id, first_input, prev_chat_history, user_input, 
                                             clarification_question, current_user_intent, session_id, time_count, thought_process)
        return
    
    # Final search workflow
    logger.info(f"Connection closing: Proceeding to final search for session {session_id}")
    yield from handle_final_search(user_id, first_input, prev_chat_history, user_input, 
                                 current_user_intent, first_user_query, session_id, time_count, thought_process)


# Helper functions

def event_data(event_type, content):
    """Format and return SSE event data"""
    return f"data: {json.dumps({'type': event_type, 'content': content})}\n\n"


def initialize_chat_context(user_id, first_input, user_input):
    """Initialize chat context based on whether this is the first input or not"""
    if first_input:
        session["process"] = []
        prev_chat_history = []
        last_user_intent = ""
        save_conv(user_id, first_input, [])
        first_user_query = user_input
    else:
        _, _, prev_chat_data = fetch_last_chat_entry(user_id)
        prev_chat_history = prev_chat_data["chat_history"]
        last_user_intent = prev_chat_data.get("user_intent", "")
        first_user_query = prev_chat_history[0]
    
    return prev_chat_history, first_user_query, last_user_intent


def detect_conversation_intent(chat_history):
    """Detect the conversation intent"""
    result = call_conv_intent_detection(chat_history)
    if isinstance(result, str):
        return f"Error: {result}", None
    
    return result[1], result[0]


def summarize_conversation(prev_chat_history, user_input, first_input, time_count, thought_process):
    """Summarize the conversation to extract user intent"""
    if first_input:
        return user_input
    
    thought_process.append("Résumé de la conversation...")
    
    result = call_conv_summarization(prev_chat_history + [user_input])
    if isinstance(result, str):
        return f"Error: {result}"
    
    time_count["conv_summarization"] = result[0]
    return result[1]


def perform_knowledge_retrieval(current_user_intent, time_count, thought_process):
    """Perform knowledge retrieval using KNN"""
    thought_process.append("Recherche dans la base de connaissances...")
    
    start_time = time.time()
    result = knn(current_user_intent, 20)
    time_count["retrieval"] = f"{time.time()-start_time:.3f}s"
    
    if not result or not result["topic"]:
        thought_process.append("Aucun sujet pertinent trouvé")
        return None
    
    return result["topic"], result["sru_statements"]


def check_topic_relevance(current_user_intent, topics, sru_hints, time_count, thought_process):
    """Check the relevance of retrieved topics"""
    thought_process.append("Vérification de la pertinence des résultats...")
    
    result = call_relevance_checker(current_user_intent, topics)
    if isinstance(result, str):
        return None, None
    
    time_count["relevance_check"] = result[0]
    conclusion, facet_ids = result[1]
    
    if conclusion == "no":
        thought_process.append("Aucun sujet jugé pertinent")
        return None, None
    
    # Filter topics based on facet IDs
    filtered_topics = [topics[ix-1] for ix in facet_ids]
    filtered_hints = [sru_hints[ix-1] for ix in facet_ids]
    
    return filtered_topics, filtered_hints


def check_clarification_needed(prev_chat_history, user_input, topics, time_count, thought_process):
    """Check if additional clarification is needed"""
    thought_process.append("Analyse du besoin de clarification...")
    
    result = call_rac(prev_chat_history + [user_input], topics)
    if isinstance(result, str):
        return False, None
    
    time_count["rac"] = result[0]
    conclusion, clarification_question = result[1]
    
    if False: #conclusion == "yes" # TODO: for a reason is always returning yes
        thought_process.append("Demande de clarification nécessaire")
        return True, clarification_question
    else:
        thought_process.append("Requête suffisamment claire, préparation de la recherche finale")
        return False, None


def convert_to_sru(user_intent, first_user_query, time_count, thought_process):
    """Convert natural language to SRU query"""
    rag_result = knn(user_intent, 1)
    sru_hint = rag_result["sru_statements"][0]
    
    thought_process.append("Conversion de la requête naturelle en SRU...")
    
    result = call_nl2sru(user_intent, sru_hint)
    if isinstance(result, str):
        return f"Error: {result}", None
    
    time_count["nl2sru"] = result[0]
    
    nl2sru_result = extract_sru_query(result[1])
    if isinstance(nl2sru_result, Exception):
        return f"Erreur lors de l'analyse NL2SRU: {fetch_error(nl2sru_result)}", None
    
    original_sru_query = f"gallica all {first_user_query}"
    return nl2sru_result, original_sru_query


# Handler functions for different conversation paths

def handle_abandon_intent(user_id, first_input, prev_chat_history, user_input, session_id):
    """Handle the 'abandon' conversation intent"""
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
    yield event_data('reinitialize', '')
    logger.info(f"Connection closing: Completed abandon intent handling for session {session_id}")
    yield event_data('close_connection', '')


def handle_search_intent(user_id, first_input, prev_chat_history, user_input, last_user_intent, 
                       first_user_query, session_id, time_count, thought_process):
    """Handle the 'search' conversation intent"""
    if last_user_intent:
        # Process search with last intent
        thought_process.append("Préparation de la recherche...")
        yield event_data('info', thought_process)
        
        nl2sru_result, original_sru_query = convert_to_sru(last_user_intent, first_user_query, time_count, thought_process)
        if nl2sru_result.startswith("Error:") or nl2sru_result.startswith("Erreur"):
            logger.info(f"Connection not closing: Error in NL2SRU conversion for search intent in session {session_id}: {nl2sru_result}")
            yield event_data('error', nl2sru_result)
            return
        
        yield event_data('time', time_count)
        
        response_data = {'type': 'result', 'content': f"{nl2sru_result}###{original_sru_query}"}
        yield f"data: {json.dumps(response_data)}\n\n"
        logger.info(f"Connection closing: Completed search with last intent for session {session_id}")
        yield event_data('close_connection', '')
    else:
        # No intent available
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
        yield event_data('reinitialize', '')
        logger.info(f"Connection closing: No intent available for search in session {session_id}")
        yield event_data('close_connection', '')


def handle_entity_disambiguation(user_id, first_input, prev_chat_history, user_input, 
                               session_id, time_count, thought_process):
    """Handle entity disambiguation for 'continue' intent"""
    thought_process.append("Analyse des entités...")
    yield event_data('info', thought_process)
    
    result = call_entity_disambiguation(prev_chat_history + [user_input])
    if isinstance(result, str):
        logger.info(f"Connection not closing: Error in entity disambiguation for session {session_id}: {result}")
        yield event_data('error', result)
        return True
    
    time_count["entity_disambiguation"] = result[0]
    yield event_data('time', time_count)
    
    if result[1][0].lower() in ["no", "false"]:
        # ambiguous query
        clarification_question = result[1][1]
        session["llm_response"] = clarification_question
        
        thought_process.append("Requête ambiguë détectée")
        yield event_data('info', thought_process)
        
        response_data = {
            'type': 'response',
            'content': {
                'message': clarification_question,
                'metadata': {'session': session_id, 'query': user_input},
                'needsAnnotation': False
            }
        }
        yield f"data: {json.dumps(response_data)}\n\n"
        
        save_conv(user_id, first_input, prev_chat_history + [user_input, clarification_question])
        logger.info(f"Connection closing: Ambiguous query detected in session {session_id}")
        yield event_data('close_connection', '')
        return True
    
    return False


def handle_respond_search_intent(current_user_intent, first_user_query, time_count, thought_process):
    """Handle the 'respond_and_search' conversation intent"""
    thought_process.append("Préparation de la recherche...")
    yield event_data('info', thought_process)
    
    nl2sru_result, original_sru_query = convert_to_sru(current_user_intent, first_user_query, time_count, thought_process)
    if nl2sru_result.startswith("Error:") or nl2sru_result.startswith("Erreur"):
        logger.info(f"Connection not closing: Error in NL2SRU conversion for respond_search_intent: {nl2sru_result}")
        yield event_data('error', nl2sru_result)
        return
    
    yield event_data('time', time_count)
    
    response_data = {'type': 'result', 'content': f"{nl2sru_result}###{original_sru_query}"}
    yield f"data: {json.dumps(response_data)}\n\n"
    logger.info(f"Connection closing: Completed respond_and_search intent")
    yield event_data('close_connection', '')


def handle_no_topics_found(user_id, first_input, prev_chat_history, user_input, last_user_intent, 
                          first_user_query, session_id, time_count, thought_process):
    """Handle case where no relevant topics are found"""
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

        # Try alternative search
        thought_process.append("Tentative de recherche alternative...")
        yield event_data('info', thought_process)
        
        nl2sru_result, original_sru_query = convert_to_sru(last_user_intent, first_user_query, time_count, thought_process)
        if nl2sru_result.startswith("Error:") or nl2sru_result.startswith("Erreur"):
            logger.info(f"Connection not closing: Error in NL2SRU conversion for no topics found in session {session_id}: {nl2sru_result}")
            yield event_data('error', nl2sru_result)
            return
        
        yield event_data('time', time_count)
        
        response_data = {'type': 'result', 'content': f"{nl2sru_result}###{original_sru_query}"}
        yield f"data: {json.dumps(response_data)}\n\n"
        logger.info(f"Connection closing: Completed alternative search for no topics in session {session_id}")
        yield event_data('close_connection', '')
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
        yield event_data('reinitialize', '')
        logger.info(f"Connection closing: No intent available for no topics in session {session_id}")
        yield event_data('close_connection', '')


def handle_no_relevant_facets(user_id, first_input, prev_chat_history, user_input, last_user_intent, 
                             first_user_query, session_id, time_count, thought_process):
    """Handle case where no relevant facets are found"""
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
        
        # Continue with alternative search
        nl2sru_result, original_sru_query = convert_to_sru(last_user_intent, first_user_query, time_count, thought_process)
        if nl2sru_result.startswith("Error:") or nl2sru_result.startswith("Erreur"):
            logger.info(f"Connection not closing: Error in NL2SRU conversion for no relevant facets in session {session_id}: {nl2sru_result}")
            yield event_data('error', nl2sru_result)
            return
        
        response_data = {'type': 'result', 'content': f"{nl2sru_result}###{original_sru_query}"}
        yield f"data: {json.dumps(response_data)}\n\n"
        logger.info(f"Connection closing: Completed alternative search for no relevant facets in session {session_id}")
        yield event_data('close_connection', '')
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
        yield event_data('reinitialize', '')
        logger.info(f"Connection closing: No intent available for no relevant facets in session {session_id}")
        yield event_data('close_connection', '')


def handle_clarification_needed(user_id, first_input, prev_chat_history, user_input, clarification_question, 
                               current_user_intent, session_id, time_count, thought_process):
    """Handle case where clarification is needed"""
    session["llm_response"] = clarification_question
    response_data = {
        'type': 'response',
        'content': {
            'message': clarification_question,
            'metadata': {'session': session_id, 'query': user_input},
            'needsAnnotation': False
        }
    }
    yield f"data: {json.dumps(response_data)}\n\n"
    
    save_conv(user_id, first_input, prev_chat_history + [user_input, clarification_question], user_intent=current_user_intent)
    logger.info(f"Connection closing: Clarification needed in session {session_id}")
    yield event_data('close_connection', '')


def handle_final_search(user_id, first_input, prev_chat_history, user_input, current_user_intent, 
                       first_user_query, session_id, time_count, thought_process):
    """Handle final search workflow"""
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
    nl2sru_result, original_sru_query = convert_to_sru(current_user_intent, first_user_query, time_count, thought_process)
    if nl2sru_result.startswith("Error:") or nl2sru_result.startswith("Erreur"):
        logger.info(f"Connection not closing: Error in NL2SRU conversion for final search in session {session_id}: {nl2sru_result}")
        yield event_data('error', nl2sru_result)
        return
    
    yield event_data('time', time_count)
    
    thought_process.append("Recherche finalisée")
    yield event_data('info', thought_process)
    
    response_data = {'type': 'result', 'content': f"{nl2sru_result}###{original_sru_query}"}
    yield f"data: {json.dumps(response_data)}\n\n"
    logger.info(f"Connection closing: Completed final search in session {session_id}")
    yield event_data('close_connection', '')


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



@bp.route("/manage-result", methods=['POST'])
@login_required
def manage_result():
    """Process SRU query and return results"""
    data = request.json
    sru_query = data.get('sruQuery', '')
    original_query = data.get('originalQuery', '')
    
    logger.info(f"Processing search results: SRU query='{sru_query}', original='{original_query}'")
    
    # In a real implementation, this would call the actual SRU API
    # For demo purposes, we'll simulate a delay and return dummy data
    time.sleep(2)  # Simulate processing time
    
    # Generate a unique ID for this result set
    result_id = str(uuid.uuid4())
    
    # Dummy data for testing
    dummy_items = [
        {
            "title": "Les Misérables",
            "author": "Victor Hugo",
            "date": "1862",
            "description": "Roman historique et social se déroulant en France au début du XIXe siècle.",
            "link": "https://gallica.bnf.fr/ark:/12148/bpt6k6566116j"
        },
        {
            "title": "Notre-Dame de Paris",
            "author": "Victor Hugo",
            "date": "1831",
            "description": "Roman historique se déroulant dans la Paris médiévale du XVe siècle.",
            "link": "https://gallica.bnf.fr/ark:/12148/bpt6k6497802p"
        },
        {
            "title": "Le Comte de Monte-Cristo",
            "author": "Alexandre Dumas",
            "date": "1844",
            "description": "Roman d'aventures relatant l'histoire d'Edmond Dantès, injustement emprisonné.",
            "link": "https://gallica.bnf.fr/ark:/12148/bpt6k55886288"
        },
        {
            "title": "Germinal",
            "author": "Émile Zola",
            "date": "1885",
            "description": "Roman social sur la condition des mineurs au XIXe siècle.",
            "link": "https://gallica.bnf.fr/ark:/12148/bpt6k1057730v"
        }
    ]
    
    # Log the processed results
    logger.info(f"Returning {len(dummy_items)} results for query: {sru_query}")
    
    # If query contains certain keywords, return fewer results for testing
    if "poésie" in original_query.lower() or "poésie" in sru_query.lower():
        dummy_items = dummy_items[:2]
    elif "introuvable" in original_query.lower() or "introuvable" in sru_query.lower():
        dummy_items = []
    
    return jsonify({
        "id": result_id,
        "items": dummy_items,
        "query": {
            "sru": sru_query,
            "original": original_query
        }
    })

@bp.route("/result-feedback", methods=['POST'])
@login_required
def result_feedback():
    """Save user feedback about search results"""
    data = request.json
    rating = data.get('rating')
    comment = data.get('comment', '')
    result_id = data.get('resultId')
    
    logger.info(f"Received feedback for result {result_id}: rating={rating}, comment='{comment}'")
    
    # In a real implementation, this would save the feedback to a database
    
    return jsonify({
        "success": True,
        "message": "Feedback enregistré avec succès"
    })