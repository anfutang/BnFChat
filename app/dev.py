from flask import Blueprint, jsonify, request, session
import logging
from datetime import datetime

from .db import db
from .models import User, Chat, end_ongoing_chats
from .auth import login_required

bp = Blueprint('dev', __name__, url_prefix="/api/dev")

logger = logging.getLogger(__name__)

# Session Management Routes
@bp.route('/session-data', methods=['GET'])
@login_required
def get_session_data():
    """Get current session data for client"""
    user_id = session.get("user_id")
    user = User.query.get(user_id) if user_id else None
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    session_data = {
        "username": user.username,
        "userId": user_id,
        "sessionId": user.session_id,
        "timerExercise": user.timer_exercise,
        "timerTest": user.timer_test,
        "avatarSeed": user.avatar_seed,
        "permissionLevel": getattr(user, 'permission_level', 0)
    }
    return jsonify(session_data)

from .chat_manager import ChatManager

@bp.route('/change-session', methods=['POST'])
@login_required
def change_session():
    """Change session using HTTP - fallback method (no empty chats)"""
    data = request.json
    user_id = session.get("user_id")
    
    if not user_id:
        return jsonify({"error": "No authenticated user"}), 401
    
    new_session_id = data.get('sessionId')
    if not new_session_id or new_session_id not in [1, 2, 3]:
        return jsonify({"error": "Invalid session ID"}), 400
    
    try:
        db.session.rollback()
        db.session.close()
        
        # Lock and update user session atomically
        user = db.session.query(User).filter_by(id=user_id).with_for_update().first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        old_session_id = user.session_id
        
        if old_session_id == new_session_id:
            return jsonify({
                "success": True,
                "sessionId": new_session_id,
                "chatId": None,
                "message": f"Already in session {new_session_id}",
                "no_change": True
            })
        
        # Update user session
        user.session_id = new_session_id
        
        existing_ongoing_chats = db.session.query(Chat).filter_by(
            user_id=user_id,
            status="ongoing"
        ).all()
        
        terminated_count = 0
        for chat in existing_ongoing_chats:
            chat.status = "terminated_by_session_change"
            chat.updated_at = datetime.utcnow()
            terminated_count += 1
        
        db.session.commit()
        logger.info(f"HTTP Session change: User {user_id} from {old_session_id} to {new_session_id}, terminated {terminated_count} existing chats")
        
        # Update Flask session
        session["session_id"] = new_session_id
        
        return jsonify({
            "success": True,
            "sessionId": new_session_id,
            "chatId": None,
            "message": f"Session changed to {new_session_id} via HTTP",
            "terminated_count": terminated_count
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in HTTP change_session: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route('/chat-history', methods=['GET'])
@login_required
def get_chat_history():
    """Get chat history using ChatManager"""
    user_id = session.get("user_id")
    
    # Get session ID from user's current session (not query parameter)
    user = User.query.get(user_id) if user_id else None
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    session_id = user.session_id  # Use user's actual session
    
    if not user_id:
        return jsonify({"error": "No authenticated user"}), 401
    
    # Use ChatManager to get state
    chat_state = ChatManager.get_chat_state(user_id, session_id)
    
    return jsonify(chat_state)

@bp.route('/current-chat', methods=['GET'])
@login_required
def get_current_chat():
    """Get current chat using ChatManager"""
    user_id = session.get("user_id")
    
    # Get session_id from user's database record
    user = User.query.get(user_id) if user_id else None
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    session_id = user.session_id
    
    if not user_id:
        return jsonify({"error": "No authenticated user"}), 401
    
    chat_state = ChatManager.get_chat_state(user_id, session_id)
    
    if chat_state.get("chat_id"):
        return jsonify({
            "chatId": chat_state["chat_id"],
            "sessionId": session_id,
            "status": chat_state.get("status", "ongoing"),
            "topic": chat_state.get("topic"),
            "messageCount": len(chat_state.get("messages", []))
        })
    else:
        return jsonify({"chatId": None, "sessionId": session_id}), 404

@bp.route('/create-chat', methods=['POST'])
@login_required
def create_new_chat():
    """Create new chat using ChatManager"""
    user_id = session.get("user_id")
    
    if not user_id:
        return jsonify({"error": "No authenticated user"}), 401
    
    data = request.json
    first_message = data.get('firstMessage')
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Use user's current session from database
    session_id = user.session_id
    
    # Use ChatManager for atomic creation
    new_chat, error = ChatManager.get_or_create_ongoing_chat(
        user_id, session_id, first_message
    )
    
    if error:
        return jsonify({"error": error}), 500
    
    return jsonify({
        "success": True,
        "chatId": new_chat.id,
        "sessionId": session_id,
        "status": new_chat.status
    })

@bp.route('/update-timer', methods=['POST'])
@login_required
def update_timer():
    """Update timer values for a session"""
    user_id = session.get("user_id")
    
    if not user_id:
        return jsonify({"error": "No authenticated user"}), 401
    
    data = request.json
    session_id = data.get('sessionId')
    timer_value = data.get('timerValue')
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Verify session_id matches user's current session
    if session_id != user.session_id:
        logger.warning(f"Timer update session mismatch: user has {user.session_id}, request has {session_id}")
        session_id = user.session_id  # Use user's actual session
    
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


@bp.route('/chat-topics', methods=['GET'])
@login_required
def get_chat_topics():
    """Get available topics for current session"""
    user_id = session.get("user_id")
    user = User.query.get(user_id) if user_id else None
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    session_id = user.session_id  # Use user's actual session
    
    # Define topics based on session
    if session_id == 2:  # Exercise
        topics = [
            {"id": 1, "name": "Voltaire", "description": "Philosophe et écrivain des Lumières"},
            {"id": 2, "name": "Napoléon III", "description": "Empereur des Français"},
            {"id": 3, "name": "Watteau", "description": "Peintre rococo"},
            {"id": 4, "name": "Michel Foucault", "description": "Philosophe contemporain"}
        ]
    elif session_id == 3:  # Test
        topics = [
            {"id": 5, "name": "Mozart", "description": "Compositeur classique"},
            {"id": 6, "name": "Frédéric Chopin", "description": "Compositeur et pianiste"},
            {"id": 7, "name": "Victor Hugo", "description": "Écrivain romantique"},
            {"id": 8, "name": "Rembrandt", "description": "Peintre hollandais"},
            {"id": 9, "name": "Marguerite Duras", "description": "Écrivaine contemporaine"}
        ]
    else:  # Tutorial
        topics = []
    
    return jsonify({"topics": topics})

@bp.route('/result-metadata', methods=['GET'])
@login_required
def get_result_metadata():
    """Get metadata for search results"""
    chat_id = request.args.get('chatId')
    
    if not chat_id:
        return jsonify({"error": "Chat ID required"}), 400
    
    user_id = session.get("user_id")
    chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
    
    if not chat:
        return jsonify({"error": "Chat not found"}), 404
    
    metadata = {
        "chatId": chat.id,
        "topic": chat.topic,
        "totalQueries": len(chat.chat_history) // 2 if chat.chat_history else 0,
        "collections": ["Manuscrits", "Livres imprimés", "Cartes et plans"],
        "searchTime": "0.45s",
        "lastUpdate": chat.updated_at.isoformat() if chat.updated_at else None
    }
    
    return jsonify(metadata)

# Tutorial and Session Completion Routes
@bp.route('/complete-tutorial', methods=['POST'])
@login_required
def complete_tutorial():
    """Mark the tutorial as completed for the user"""
    user_id = session.get("user_id")
    
    if not user_id:
        return jsonify({"error": "No authenticated user"}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Move to exercise session
    user.session_id = 2
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Tutorial completed",
        "nextSession": 2
    })
