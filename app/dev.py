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
    
    try:
        # Call the retrieval function with both queries
        result = retrieve_result_page(sru_query, original_query)
        retrieval_result_wc, retrieval_result_woc = result
        
        # Generate a unique ID for this result set
        result_id = str(uuid.uuid4())
        
        # Log the processed results
        logger.info(f"Returning results for query: {sru_query}")
        
        return jsonify({
            "id": result_id,
            "items": retrieval_result_wc,  # Using the results with clarification
            "query": {
                "sru": sru_query,
                "original": original_query
            }
        })
        
    except Exception as e:
        logger.error(f"Error retrieving results: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve results",
            "message": str(e)
        }), 500

@bp.route("/result-feedback", methods=['POST'])
@login_required
def result_feedback():
    """Save user feedback about search results"""
    data = request.json
    rating = data.get('rating')
    comment = data.get('comment', '')
    result_id = data.get('resultId')
    
    logger.info(f"Received feedback for result {result_id}: rating={rating}, comment='{comment}'")
    
    #TODO save in db
    # In a real implementation, this would save the feedback to a database
    
    return jsonify({
        "success": True,
        "message": "Feedback enregistré avec succès"
    })