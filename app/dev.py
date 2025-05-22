from flask import Blueprint, jsonify, request, session
import logging
from datetime import datetime

from .db import db
from .models import User, Chat, end_ongoing_chats, create_chat, get_or_create_chat_for_session
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

@bp.route('/change-session', methods=['POST'])
@login_required
def change_session():
    """Change the current session for the user"""
    data = request.json
    user_id = session.get("user_id")
    
    if not user_id:
        return jsonify({"error": "No authenticated user"}), 401
    
    session_id = data.get('sessionId')
    if not session_id or session_id not in [1, 2, 3]:
        return jsonify({"error": "Invalid session ID"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
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

# Chat Management Routes
@bp.route('/chat-history', methods=['GET'])
@login_required
def get_chat_history():
    """Get current chat history for the specified session"""
    user_id = session.get("user_id")
    
    # Get session ID from query parameter or from user's current session
    session_id = request.args.get('sessionId')
    if session_id:
        try:
            session_id = int(session_id)
        except (ValueError, TypeError):
            session_id = None
    else:
        user = User.query.get(user_id) if user_id else None
        session_id = user.session_id if user else session.get("session_id", 1)
    
    # Get user's latest chat for this session
    if user_id:
        query = Chat.query.filter_by(user_id=user_id)
        
        if session_id:
            query = query.filter_by(session_id=session_id)
        
        latest_chat = query.order_by(Chat.updated_at.desc()).first()
        
        if latest_chat and latest_chat.chat_history:
            formatted_messages = []
            for msg in latest_chat.chat_history:
                formatted_messages.append({
                    'sender': 'user' if msg.get('role') == 'user' else 'bot' if msg.get('role') == 'assistant' else 'system',
                    'message': msg.get('content', ''),
                    'timestamp': msg.get('timestamp', datetime.now().isoformat())
                })
                
            return jsonify({
                "messages": formatted_messages,
                "chatId": latest_chat.id,
                "sessionId": latest_chat.session_id,
                "topic": latest_chat.topic
            })
    
    return jsonify({
        "messages": [],
        "chatId": None,
        "sessionId": session_id,
        "topic": None
    })

@bp.route('/current-chat', methods=['GET'])
@login_required
def get_current_chat():
    """Get the current ongoing chat for the user's session"""
    user_id = session.get("user_id")
    session_id = session.get("session_id", 1)
    
    if not user_id:
        return jsonify({"error": "No authenticated user"}), 401
    
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
        "topic": chat.topic,
        "created": chat.created_at.isoformat() if chat.created_at else None,
        "updated": chat.updated_at.isoformat() if chat.updated_at else None,
        "messageCount": len(chat.chat_history) if chat.chat_history else 0
    })

@bp.route('/create-chat', methods=['POST'])
@login_required
def create_new_chat():
    """Create a new chat for the current session"""
    user_id = session.get("user_id")
    
    if not user_id:
        return jsonify({"error": "No authenticated user"}), 401
    
    data = request.json
    session_id = data.get('sessionId')
    first_message = data.get('firstMessage')
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Use user's current session if not specified
    if not session_id:
        session_id = user.session_id
    
    # End any existing ongoing chats for this session
    end_ongoing_chats(user_id, "terminated_by_new_chat", session_id)
    
    # Create new chat
    chat = create_chat(user_id, first_message=first_message, session_id=session_id)
    
    return jsonify({
        "success": True,
        "chatId": chat.id,
        "sessionId": session_id,
        "status": chat.status
    })

# Topic and Result Management Routes
@bp.route('/chat-topics', methods=['GET'])
@login_required
def get_chat_topics():
    """Get available topics for current session"""
    session_id = request.args.get('sessionId', type=int)
    
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
    
    # Mock metadata - replace with actual implementation
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
    
    # End tutorial chats
    end_ongoing_chats(user_id, "tutorial_completed")
    
    # Move to exercise session
    user.session_id = 2
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Tutorial completed",
        "nextSession": 2
    })