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
        "username": session.get("username", "Test User"),
        "userId": user_id,
        "sessionId": user.session_id if user else session.get("session_id", 1),
        "timerExercise": user.timer_exercise if user else session.get("timer_exercise", 300),
        "timerTest": user.timer_test if user else session.get("timer_test", 2100),
        "avatarSeed": user.avatar_seed if user else session.get("avatar-seed", "default"),
    }
    return jsonify(session_data)
@bp.route('/chat-history', methods=['GET'])
@login_required
def get_chat_history():
    """Get current chat history for the specified session"""
    from datetime import datetime  # Make sure to import the datetime class correctly
    
    user_id = session.get("user_id")
    
    # Get session ID from query parameter or from user's current session
    session_id = request.args.get('sessionId')
    if session_id:
        try:
            session_id = int(session_id)
        except (ValueError, TypeError):
            session_id = None
    else:
        # Use the user's current session_id
        user = User.query.get(user_id) if user_id and user_id != 123 else None
        session_id = user.session_id if user else session.get("session_id", 1)
    
    # If we have a real user ID, try to get their latest chat
    if user_id and user_id != 123:
        # Query for a chat matching user_id and session_id
        query = Chat.query.filter_by(user_id=user_id)
        
        # Filter by session if specified
        if session_id:
            query = query.filter_by(session_id=session_id)
        
        # Get the most recent chat
        latest_chat = query.order_by(Chat.updated_at.desc()).first()
        
        if latest_chat and latest_chat.chat_history:
            # Convert the chat_history format to match what the frontend expects
            formatted_messages = []
            for msg in latest_chat.chat_history:
                # Transform from role/content to sender/message format
                formatted_messages.append({
                    'sender': 'user' if msg.get('role') == 'user' else 'bot' if msg.get('role') == 'assistant' else 'system',
                    'message': msg.get('content', ''),
                    'timestamp': msg.get('timestamp', datetime.now().isoformat())
                })
                
            return jsonify({
                "messages": formatted_messages,
                "chatId": latest_chat.id,
                "sessionId": latest_chat.session_id
            })
    
    # If no user ID or no chats, return empty history
    return jsonify({
        "messages": [],
        "chatId": None,
        "sessionId": session_id
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
    
    new_chat_id = None
    
    # If we have a real user, end ongoing chats and create a new one
    if user_id and user_id != 123:
        # End any existing ongoing chats
        end_ongoing_chats(user_id, "terminated_by_restart")
        
        # Get user's current session_id
        user = User.query.get(user_id)
        session_id = user.session_id if user else session.get("session_id", 1)
        
        # Create a new chat with the correct session_id
        chat = create_chat(user_id, session_id=session_id)
        new_chat_id = chat.id if chat else None
    
    # Clear session chat history
    session["chat_history"] = []
    return jsonify({"success": True, "chatId": new_chat_id})



@bp.route('/change-session', methods=['POST'])
@login_required
def change_session():
    """Change the current session for the user"""
    data = request.json
    user_id = session.get("user_id")
    
    if not user_id or user_id == 123:
        return jsonify({"error": "No authenticated user"}), 401
    
    session_id = data.get('sessionId')
    if not session_id or session_id not in [1, 2, 3]:
        return jsonify({"error": "Invalid session ID"}), 400
    
    # Get the user
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Reset the timer value for the new session
    # TODO to keep or not to keep ?
    # if session_id == 2:
    #     user.timer_exercise = 300  # Reset to 5 minutes
    # elif session_id == 3:
    #     user.timer_test = 2100  # Reset to 35 minutes
    
    # Update user session
    user.session_id = session_id
    db.session.commit()
    
    # Update Flask session
    session["session_id"] = session_id
    
    # End any existing ongoing chats
    end_ongoing_chats(user_id, "terminated_by_session_change")
    
    # Create a new chat for this session
    chat = create_chat(user_id, session_id=session_id)
    
    return jsonify({
        "success": True,
        "sessionId": session_id,
        "chatId": chat.id,
        "timerExercise": user.timer_exercise,
        "timerTest": user.timer_test
    })

@bp.route('/complete-tutorial', methods=['POST'])
@login_required
def complete_tutorial():
    """Mark the tutorial as completed for the user"""
    user_id = session.get("user_id")
    
    if not user_id or user_id == 123:
        return jsonify({"error": "No authenticated user"}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # End tutorial chats
    end_ongoing_chats(user_id, "tutorial_completed")
    
    return jsonify({
        "success": True,
        "message": "Tutorial completed"
    })


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

@bp.route('/update-session', methods=['POST'])
@login_required
def update_session_data():
    """Update session data for the current user"""
    data = request.json
    user_id = session.get("user_id")
    
    if not user_id or user_id == 123:
        return jsonify({"error": "No authenticated user"}), 401
    
    session_id = data.get('sessionId')
    timer_exercise = data.get('timerExercise')
    timer_test = data.get('timerTest')
    
    # Update user session data
    user = update_user_session(user_id, session_id, timer_exercise, timer_test)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get or create chat for this session
    chat = get_or_create_chat_for_session(user_id, session_id)
    
    # Update session object
    session["session_id"] = session_id
    session["timer_exercise"] = timer_exercise if timer_exercise is not None else user.timer_exercise
    session["timer_test"] = timer_test if timer_test is not None else user.timer_test
    
    return jsonify({
        "success": True,
        "userId": user_id,
        "sessionId": session_id,
        "chatId": chat.id,
        "timerExercise": user.timer_exercise,
        "timerTest": user.timer_test
    })

@bp.route('/current-chat', methods=['GET'])
@login_required
def get_current_chat():
    """Get the current ongoing chat for the user's session"""
    user_id = session.get("user_id")
    session_id = session.get("session_id", 1)  # Default to tutorial if not set
    
    if not user_id or user_id == 123:
        return jsonify({"error": "No authenticated user"}), 401
    
    # Get ongoing chat for this session
    chat = Chat.query.filter_by(
        user_id=user_id,
        status="ongoing",
        session_id=session_id
    ).order_by(Chat.created_at.desc()).first()
    
    if not chat:
        return jsonify({"chatId": None, "sessionId": session_id}), 404
    
    return jsonify({
        "chatId": chat.id,
        "sessionId": session_id,
        "status": chat.status,
        "created": chat.created_at.isoformat() if chat.created_at else None,
        "updated": chat.updated_at.isoformat() if chat.updated_at else None,
        "messageCount": len(chat.chat_history) if chat.chat_history else 0
    })


@bp.route('/update-timer', methods=['POST'])
@login_required
def update_timer():
    """Update timer values for a session"""
    user_id = session.get("user_id")
    
    if not user_id or user_id == 123:
        return jsonify({"error": "No authenticated user"}), 401
    
    data = request.json
    session_id = data.get('sessionId')
    timer_value = data.get('timerValue')  # This will be seconds remaining
    
    # Get the user
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Update the appropriate timer based on session
    if session_id == 2:
        user.timer_exercise = timer_value
    elif session_id == 3:
        user.timer_test = timer_value
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "sessionId": session_id,
        "timerValue": timer_value
    })


@bp.route('/abandon-chat', methods=['POST'])
@login_required
def abandon_chat():
    """Abandon the current chat and create a new one"""
    user_id = session.get("user_id")
    data = request.json
    chat_id = data.get('chatId')
    
    if not user_id or user_id == 123:
        return jsonify({"error": "No authenticated user"}), 401
    
    # Get user's session
    user = User.query.get(user_id)
    session_id = data.get('sessionId') or (user.session_id if user else 1)
    
    # End the specific chat if chat_id provided
    if chat_id:
        chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
        if chat:
            chat.status = "abandoned"
            db.session.commit()
    else:
        # Otherwise end all ongoing chats for this session
        end_ongoing_chats(user_id, "abandoned", session_id)
    
    # Create a new chat for this session
    new_chat = create_chat(user_id, session_id=session_id)
    
    return jsonify({
        "success": True,
        "chatId": new_chat.id if new_chat else None
    })