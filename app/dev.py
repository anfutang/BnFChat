from flask import Blueprint, jsonify, request, session
import logging
from datetime import datetime

from .db import db
from .models import User, Chat
from .auth import login_required
from .chat_manager import ChatManager  # Import ChatManager

bp = Blueprint('dev', __name__, url_prefix="/api/dev")

logger = logging.getLogger(__name__)

# Topic definitions - centralized in backend
TOPICS = {
    2: [  # Exercise session topics
        {"id": 1, "name": "Voltaire", "description": "Philosophe et écrivain des Lumières (1694-1778)", "category": "Littérature"},
        {"id": 2, "name": "Napoléon III", "description": "Empereur des Français (1808-1873)", "category": "Histoire"},
        {"id": 3, "name": "Watteau", "description": "Peintre rococo (1684-1721)", "category": "Arts visuels"},
        {"id": 4, "name": "Michel Foucault", "description": "Philosophe contemporain (1926-1984)", "category": "Philosophie"}
    ],
    3: [  # Test session topics
        {"id": 5, "name": "Mozart", "description": "Compositeur classique (1756-1791)", "category": "Musique"},
        {"id": 6, "name": "Frédéric Chopin", "description": "Compositeur et pianiste (1810-1849)", "category": "Musique"},
        {"id": 7, "name": "Victor Hugo", "description": "Écrivain romantique (1802-1885)", "category": "Littérature"},
        {"id": 8, "name": "Rembrandt", "description": "Peintre hollandais (1606-1669)", "category": "Arts visuels"},
        {"id": 9, "name": "Marguerite Duras", "description": "Écrivaine contemporaine (1914-1996)", "category": "Littérature"}
    ]
}

# dev.py - Updated select_topic to reject topic_id=0

@bp.route('/select-topic', methods=['POST'])
@login_required
def select_topic():
    """Handle topic selection and end current conversation"""
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "No authenticated user"}), 401
        
        data = request.json
        topic_id = data.get('topicId')
        
        # REJECT topic_id=0 - no libre topic allowed
        if topic_id is None or topic_id <= 0:
            return jsonify({"error": "Valid topic ID required (must be > 0)"}), 400
        
        # Get user's current session
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        session_id = user.session_id
        
        # Validate topic for current session
        topic_info = None
        if session_id in TOPICS:
            session_topics = TOPICS[session_id]
            topic_info = next((t for t in session_topics if t["id"] == topic_id), None)
        
        if topic_info is None:
            return jsonify({"error": "Invalid topic for current session"}), 400
        
        # Get current ongoing chat if exists
        current_chat = Chat.query.filter_by(
            user_id=user_id,
            session_id=session_id,
            status="ongoing"
        ).first()
        
        # End current chat if exists
        if current_chat:
            success, error = ChatManager.end_chat(
                current_chat.id, 
                "end_by_topic_change", 
                user_id
            )
            if not success:
                logger.warning(f"Failed to end current chat: {error}")
        
        # Store selected topic in user record for this session
        if session_id == 2:
            user.exercise_topic_id = topic_id
        elif session_id == 3:
            user.test_topic_id = topic_id
        
        db.session.commit()
        
        logger.info(f"User {user_id} selected topic {topic_id} ({topic_info['name']}) in session {session_id}")
        
        return jsonify({
            "success": True,
            "topicId": topic_id,
            "topicInfo": topic_info,
            "sessionId": session_id,
            "chatEnded": current_chat is not None,
            "message": f"Topic selected: '{topic_info['name']}'"
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in select_topic: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Updated get_chat_topics to ensure a topic is always selected
@bp.route('/chat-topics', methods=['GET'])
@login_required
def get_chat_topics():
    """Get available topics for current session"""
    user_id = session.get("user_id")
    user = User.query.get(user_id) if user_id else None
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    session_id = user.session_id
    
    # Get topics for current session
    topics = TOPICS.get(session_id, [])
    
    # Get current selected topic
    current_topic_id = None
    if session_id == 2:
        current_topic_id = getattr(user, 'exercise_topic_id', None)
    elif session_id == 3:
        current_topic_id = getattr(user, 'test_topic_id', None)
    
    # If no topic selected and topics available, auto-select first one
    if (current_topic_id is None or current_topic_id <= 0) and topics:
        current_topic_id = topics[0]["id"]
        # Update user record
        if session_id == 2:
            user.exercise_topic_id = current_topic_id
        elif session_id == 3:
            user.test_topic_id = current_topic_id
        db.session.commit()
    
    return jsonify({
        "topics": topics,
        "currentTopicId": current_topic_id,
        "sessionId": session_id
    })

# Update the get_session_data route to include current topic info
@bp.route('/session-data', methods=['GET'])
@login_required
def get_session_data():
    """Get current session data for client"""
    user_id = session.get("user_id")
    user = User.query.get(user_id) if user_id else None
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get current topic based on session
    current_topic_id = 0
    current_topic_info = None
    
    if user.session_id == 2:
        current_topic_id = getattr(user, 'exercise_topic_id', 0)
        if current_topic_id > 0:
            current_topic_info = next((t for t in TOPICS[2] if t["id"] == current_topic_id), None)
    elif user.session_id == 3:
        current_topic_id = getattr(user, 'test_topic_id', 0)
        if current_topic_id > 0:
            current_topic_info = next((t for t in TOPICS[3] if t["id"] == current_topic_id), None)
    
    session_data = {
        "username": user.username,
        "userId": user_id,
        "sessionId": user.session_id,
        "timerExercise": user.timer_exercise,
        "timerTest": user.timer_test,
        "avatarSeed": user.avatar_seed,
        "permissionLevel": getattr(user, 'permission_level', 0),
        "currentTopicId": current_topic_id,
        "currentTopicInfo": current_topic_info
    }
    return jsonify(session_data)

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


@bp.route('/current-chat', methods=['GET'])
@login_required
def get_current_chat():
    """Get current ongoing chat - returns 404 if none exists"""
    user_id = session.get("user_id")
    
    if not user_id:
        return jsonify({"error": "No authenticated user"}), 401
    
    # Get user's current session
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    session_id = user.session_id
    
    # Use ChatManager to get ongoing chat
    existing_chat, error = ChatManager.get_ongoing_chat(user_id, session_id)
    
    if error:
        return jsonify({"error": error}), 500
    
    if existing_chat:
        return jsonify({
            "chatId": existing_chat.id,
            "sessionId": session_id,
            "status": existing_chat.status,
            "topic": existing_chat.topic,
            "messageCount": len(existing_chat.chat_history) if existing_chat.chat_history else 0
        })
    else:
        return jsonify({
            "chatId": None, 
            "sessionId": session_id,
            "message": "No ongoing chat - will be created with first message"
        }), 200  # Changed from 404 to 200 since this is normal

@bp.route('/chat-history', methods=['GET'])
@login_required
def get_chat_history():
    """Get chat history - returns empty if no ongoing chat"""
    user_id = session.get("user_id")
    
    if not user_id:
        return jsonify({"error": "No authenticated user"}), 401
    
    # Get user's current session
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    session_id = user.session_id
    
    # Use ChatManager to get state
    chat_state = ChatManager.get_chat_state(user_id, session_id)
    
    return jsonify(chat_state)

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