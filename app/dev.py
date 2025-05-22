from flask import Blueprint, jsonify, request, session
import logging
from datetime import datetime

from .db import db
from .models import User, Chat, end_ongoing_chats, create_chat, update_user_session, get_or_create_chat_for_session
from .auth import login_required

bp = Blueprint('dev', __name__, url_prefix="/api/dev")

logger = logging.getLogger(__name__)

@bp.route('/session-data', methods=['GET'])
@login_required
def get_session_data():
    """Get current session data for client"""
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
    user_id = session.get("user_id")
    
    # Get session ID from query parameter or from user's current session
    session_id = request.args.get('sessionId')
    if session_id:
        try:
            session_id = int(session_id)
        except (ValueError, TypeError):
            session_id = None
    else:
        user = User.query.get(user_id) if user_id and user_id != 123 else None
        session_id = user.session_id if user else session.get("session_id", 1)
    
    # If we have a real user ID, try to get their latest chat
    if user_id and user_id != 123:
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
                "sessionId": latest_chat.session_id
            })
    
    return jsonify({
        "messages": [],
        "chatId": None,
        "sessionId": session_id
    })

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

@bp.route('/update-timer', methods=['POST'])
@login_required
def update_timer():
    """Update timer values for a session"""
    user_id = session.get("user_id")
    
    if not user_id or user_id == 123:
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

@bp.route('/current-chat', methods=['GET'])
@login_required
def get_current_chat():
    """Get the current ongoing chat for the user's session"""
    user_id = session.get("user_id")
    session_id = session.get("session_id", 1)
    
    if not user_id or user_id == 123:
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
        "created": chat.created_at.isoformat() if chat.created_at else None,
        "updated": chat.updated_at.isoformat() if chat.updated_at else None,
        "messageCount": len(chat.chat_history) if chat.chat_history else 0
    })

# Legacy HTTP endpoints for backward compatibility
@bp.route('/restart-chat', methods=['POST'])
@login_required
def restart_chat():
    """Reset the chat session (HTTP fallback)"""
    user_id = session.get("user_id")
    
    new_chat_id = None
    
    if user_id and user_id != 123:
        end_ongoing_chats(user_id, "terminated_by_restart")
        
        user = User.query.get(user_id)
        session_id = user.session_id if user else session.get("session_id", 1)
        
        chat = create_chat(user_id, session_id=session_id)
        new_chat_id = chat.id if chat else None
    
    session["chat_history"] = []
    return jsonify({"success": True, "chatId": new_chat_id})

@bp.route('/abandon-chat', methods=['POST'])
@login_required
def abandon_chat():
    """Abandon the current chat and create a new one (HTTP fallback)"""
    user_id = session.get("user_id")
    data = request.json
    chat_id = data.get('chatId')
    
    if not user_id or user_id == 123:
        return jsonify({"error": "No authenticated user"}), 401
    
    user = User.query.get(user_id)
    session_id = data.get('sessionId') or (user.session_id if user else 1)
    
    if chat_id:
        chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
        if chat:
            chat.status = "abandoned"
            db.session.commit()
    else:
        end_ongoing_chats(user_id, "abandoned", session_id)
    
    new_chat = create_chat(user_id, session_id=session_id)
    
    return jsonify({
        "success": True,
        "chatId": new_chat.id if new_chat else None
    })