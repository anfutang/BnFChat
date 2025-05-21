# app/dev.py
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

from .auth import login_required

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


@bp.route('/session-data', methods=['GET'])
@login_required
def get_session_data():
    """Get current session data for client"""
    # Use session data if available, otherwise provide defaults
    user_id = session.get("user_id", 123)
    user = User.query.get(user_id) if user_id != 123 else None
    
    session_data = {
        "username": session.get("username", "Utilisateur Test"),
        "userId": user_id,
        "avatarSeed": session.get("avatar-seed", "default") if not user else user.avatar_seed,
        "devMode": session.get("dev_mode", True)
    }
    return jsonify(session_data)

@bp.route('/chat-history', methods=['GET'])
@login_required
def get_chat_history():
    """Get current chat history"""
    user_id = session.get("user_id")
    
    # If we have a real user ID, try to get their latest chat
    if user_id and user_id != 123:
        latest_chat = Chat.query.filter_by(user_id=user_id).order_by(Chat.updated_at.desc()).first()
        
        if latest_chat and latest_chat.chat_history:
            # Convert the chat_history format to match what the frontend expects
            formatted_messages = []
            for msg in latest_chat.chat_history:
                # Transform from role/content to sender/message format
                formatted_messages.append({
                    'sender': 'user' if msg.get('role') == 'user' else 'bot' if msg.get('role') == 'assistant' else 'system',
                    'message': msg.get('content', ''),
                    'timestamp': msg.get('timestamp', datetime.datetime.utcnow().isoformat())
                })
                
            return jsonify({
                "messages": formatted_messages,
                "chatId": latest_chat.id
            })
    
    # If no user ID or no chats, return empty history or session-based history
    if not session.get("chat_history"):
        session["chat_history"] = []
        
    # Format session-based history if it exists
    formatted_session_history = []
    for msg in session.get("chat_history", []):
        if isinstance(msg, dict):
            # If it's already a dict with role/content format
            formatted_session_history.append({
                'sender': 'user' if msg.get('role') == 'user' else 'bot' if msg.get('role') == 'assistant' else 'system',
                'message': msg.get('content', ''),
                'timestamp': msg.get('timestamp', datetime.datetime.utcnow().isoformat())
            })
        else:
            # If it's just a string message (old format)
            formatted_session_history.append({
                'sender': 'system',
                'message': str(msg),
                'timestamp': datetime.datetime.utcnow().isoformat()
            })
            
    return jsonify({
        "messages": formatted_session_history,
        "chatId": None
    })

@bp.route('/user-annotation', methods=['POST'])
@login_required
def user_annotation():
    """Process user annotation/feedback"""
    # Just acknowledge receipt of the annotation
    conv_label = request.json.get("convLabel", "")
    user_id = session.get("user_id")
    
    # End conversation if user chose to end it
    if conv_label:
        if user_id and user_id != 123:
            # Mark latest chat as closed in database
            latest_chat = Chat.query.filter_by(user_id=user_id).order_by(Chat.updated_at.desc()).first()
            if latest_chat:
                latest_chat.status = "closed"
                db.session.commit()
        
        # Clear session chat history
        session["chat_history"] = []
    
    return jsonify({
        "success": True,
        "selectedResponse": "dummyResponse"
    })

@bp.route('/restart-chat', methods=['POST'])
@login_required
def restart_chat():
    """Reset the chat session"""
    user_id = session.get("user_id")
    
    # If we have a real user, create a new chat for them
    if user_id and user_id != 123:
        create_chat(user_id)
    
    # Clear session chat history
    session["chat_history"] = []
    return jsonify({"success": True})



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
            "wcResults": retrieval_result_wc,  # Using the results with clarification
            "wocResults": retrieval_result_woc,
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
    
    # TODO: Save feedback in a proper SearchFeedback model
    # This could be implemented with a new model like:
    # class SearchFeedback(db.Model):
    #     id = db.Column(db.Integer, primary_key=True)
    #     result_id = db.Column(db.String(36), nullable=False)
    #     user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    #     rating = db.Column(db.Integer, nullable=False)
    #     comment = db.Column(db.Text, nullable=True)
    #     created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    return jsonify({
        "success": True,
        "message": "Feedback enregistré avec succès"
    })