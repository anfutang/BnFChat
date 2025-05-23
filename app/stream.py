import time
import json
from flask import Blueprint, request, session
from flask_socketio import emit, disconnect
from .chat_manager import ChatManager
from .db import db
from .models import User, Chat
from .llm.llm import create_simple_workflow
from .utils.constant import *

bp = Blueprint('stream', __name__)
socketio = None
socket_user_sessions = {}

# Topic definitions
TOPICS = {
    2: [  # Exercise topics
        {"id": 1, "name": "Voltaire", "description": "Philosophe des Lumières", "category": "Littérature"},
        {"id": 2, "name": "Napoléon III", "description": "Empereur des Français", "category": "Histoire"},
        {"id": 3, "name": "Watteau", "description": "Peintre rococo", "category": "Arts visuels"},
        {"id": 4, "name": "Foucault", "description": "Philosophe contemporain", "category": "Philosophie"}
    ],
    3: [  # Test topics
        {"id": 5, "name": "Mozart", "description": "Compositeur classique", "category": "Musique"},
        {"id": 6, "name": "Chopin", "description": "Compositeur et pianiste", "category": "Musique"},
        {"id": 7, "name": "Victor Hugo", "description": "Écrivain romantique", "category": "Littérature"},
        {"id": 8, "name": "Rembrandt", "description": "Peintre hollandais", "category": "Arts visuels"}
    ]
}

def init_socketio(socketio_instance):
    global socketio
    socketio = socketio_instance
    register_socketio_events()

def socketio_auth_required(f):
    def decorated_function(*args, **kwargs):
        user_id = socket_user_sessions.get(request.sid)
        if not user_id:
            emit('error', {'message': 'Not authenticated'})
            return
        return f(*args, **kwargs)
    return decorated_function

def register_socketio_events():
    
    @socketio.on('connect')
    def handle_connect(auth):
        print(f'Client connected: {request.sid}')
        
        user_id = None
        if auth and 'userId' in auth:
            user_id = auth['userId']
            socket_user_sessions[request.sid] = user_id
            print(f'User {user_id} authenticated via socket')
            
            # Auto-trigger session data retrieval after authentication
            emit('connected', {
                'status': 'connected',
                'session_id': request.sid,
                'user_id': user_id
            })
            
            # Automatically send session data and chat state
            try:
                handle_get_session_data()  # This will emit session_data_response
                handle_get_chat_state()    # This will emit chat_state_response
            except Exception as e:
                print(f"Error in auto-retrieval: {str(e)}")
        else:
            emit('connected', {
                'status': 'connected',
                'session_id': request.sid,
                'user_id': None
            })

    @socketio.on('disconnect')
    def handle_disconnect():
        print(f'Client disconnected: {request.sid}')
        if request.sid in socket_user_sessions:
            del socket_user_sessions[request.sid]
    
    # ========== SESSION DATA (moved from HTTP) ==========
    @socketio.on('get_session_data')
    @socketio_auth_required
    def handle_get_session_data():
        try:
            user_id = socket_user_sessions.get(request.sid)
            user = User.query.get(user_id)
            
            if not user:
                emit('error', {'message': 'User not found'})
                return
            
            # Get current topic info
            current_topic_info = None
            current_topic_id = 0
            
            if user.session_id == 2:
                current_topic_id = user.exercise_topic_id
                if current_topic_id > 0:
                    current_topic_info = next((t for t in TOPICS[2] if t["id"] == current_topic_id), None)
            elif user.session_id == 3:
                current_topic_id = user.test_topic_id
                if current_topic_id > 0:
                    current_topic_info = next((t for t in TOPICS[3] if t["id"] == current_topic_id), None)
            
            emit('session_data_response', {
                'userId': user.id,
                'username': user.username,
                'sessionId': user.session_id,
                'currentTopicId': current_topic_id,
                'currentTopicInfo': current_topic_info,
                'timerExercise': user.timer_exercise,
                'timerTest': user.timer_test
            })
            
        except Exception as e:
            print(f"Error getting session data: {str(e)}")
            emit('error', {'message': 'Error getting session data'})

    # ========== TOPICS (moved from HTTP) ==========
    @socketio.on('get_topics')
    @socketio_auth_required
    def handle_get_topics():
        try:
            user_id = socket_user_sessions.get(request.sid)
            user = User.query.get(user_id)
            
            if not user:
                emit('error', {'message': 'User not found'})
                return
            
            session_topics = TOPICS.get(user.session_id, [])
            
            # Get current selected topic
            current_topic_id = 0
            if user.session_id == 2:
                current_topic_id = user.exercise_topic_id
            elif user.session_id == 3:
                current_topic_id = user.test_topic_id
            
            emit('topics_response', {
                'topics': session_topics,
                'currentTopicId': current_topic_id,
                'sessionId': user.session_id
            })
            
        except Exception as e:
            print(f"Error getting topics: {str(e)}")
            emit('error', {'message': 'Error getting topics'})

    # ========== TOPIC SELECTION (moved from HTTP) ==========
    @socketio.on('select_topic')
    @socketio_auth_required
    def handle_select_topic(data):
        try:
            user_id = socket_user_sessions.get(request.sid)
            topic_id = data.get('topicId')
            
            if topic_id is None or topic_id < 0:
                emit('error', {'message': 'Valid topic ID required'})
                return
            
            user = User.query.get(user_id)
            if not user:
                emit('error', {'message': 'User not found'})
                return
            
            # Validate topic for current session
            if user.session_id in TOPICS and topic_id > 0:
                topic_info = next((t for t in TOPICS[user.session_id] if t["id"] == topic_id), None)
                if not topic_info:
                    emit('error', {'message': 'Invalid topic for current session'})
                    return
            
            # End any ongoing chat before topic change
            ongoing_chat = Chat.query.filter_by(
                user_id=user_id,
                session_id=user.session_id,
                status="ongoing"
            ).first()
            
            if ongoing_chat:
                ChatManager.end_chat(ongoing_chat.id, "ended_by_topic_change", user_id)
            
            # Update user's topic selection
            if user.session_id == 2:
                user.exercise_topic_id = topic_id
            elif user.session_id == 3:
                user.test_topic_id = topic_id
            
            db.session.commit()
            
            topic_info = None
            if topic_id > 0 and user.session_id in TOPICS:
                topic_info = next((t for t in TOPICS[user.session_id] if t["id"] == topic_id), None)
            
            # Clear chat UI
            emit('ongoing_chats_terminated', {
                'reason': 'topic_change',
                'message': 'Chat ended by topic change'
            })
            
            emit('topic_selected', {
                'success': True,
                'topicId': topic_id,
                'topicInfo': topic_info,
                'chatEnded': ongoing_chat is not None
            })
            
        except Exception as e:
            db.session.rollback()
            print(f"Error selecting topic: {str(e)}")
            emit('error', {'message': 'Error selecting topic'})

    # ========== CHAT OPERATIONS ==========
    @socketio.on('send_message')
    @socketio_auth_required
    def handle_send_message(data):
        try:
            user_input = data.get('message', '').strip()
            user_id = socket_user_sessions.get(request.sid)
            
            if not user_input:
                emit('error', {'message': 'Empty message'})
                return
            
            # Get user session info
            user = User.query.get(user_id)
            if not user:
                emit('error', {'message': 'User not found'})
                return
            
            session_id = user.session_id
            
            # Validate topic selection for sessions > 1
            if session_id > 1:
                topic_id = user.exercise_topic_id if session_id == 2 else user.test_topic_id
                if topic_id <= 0:
                    emit('error', {
                        'message': 'Please select a topic before starting conversation',
                        'error_type': 'topic_required'
                    })
                    return
            
            # Check for ongoing chat or create new one
            existing_chat, error = ChatManager.get_ongoing_chat(user_id, session_id)
            
            if existing_chat:
                # Add message to existing chat
                success, error = ChatManager.add_message_to_chat(existing_chat.id, 'user', user_input)
                if not success:
                    emit('error', {'message': f'Failed to add message: {error}'})
                    return
                chat = existing_chat
            else:
                # Create new chat with first message
                chat, error = ChatManager.create_chat_with_first_message(user_id, session_id, user_input)
                if error:
                    emit('error', {'message': f'Failed to create chat: {error}'})
                    return
            
            # Emit message received
            emit('message_received', {
                'message': user_input,
                'chat_id': chat.id,
                'session_id': session_id
            })
            
            # Process message with workflow
            process_chat_message(user_input, user_id, chat.id, session_id, request.sid)
            
        except Exception as e:
            print(f"Error in handle_send_message: {str(e)}")
            emit('error', {'message': 'Error processing message'})

    @socketio.on('get_chat_state')
    @socketio_auth_required
    def handle_get_chat_state():
        try:
            user_id = socket_user_sessions.get(request.sid)
            user = User.query.get(user_id)
            
            if not user:
                emit('error', {'message': 'User not found'})
                return
            
            chat_state = ChatManager.get_chat_state(user_id, user.session_id)
            
            # Always emit response, even if no ongoing chat
            emit('chat_state_response', {
                'chat': chat_state.get('chat'),
                'sessionId': user.session_id,
                'hasOngoingChat': chat_state.get('chat') is not None
            })
            
        except Exception as e:
            print(f"Error in handle_get_chat_state: {str(e)}")
            emit('error', {'message': 'Error getting chat state'})

    @socketio.on('session_change')
    @socketio_auth_required
    def handle_session_change(data):
        try:
            new_session_id = data.get('session_id')
            user_id = socket_user_sessions.get(request.sid)
            
            if new_session_id not in [1, 2, 3]:
                emit('error', {'error': 'Invalid session ID'})
                return
            
            user = User.query.get(user_id)
            if not user:
                emit('error', {'error': 'User not found'})
                return
            
            old_session_id = user.session_id
            
            if old_session_id == new_session_id:
                emit('session_change_success', {
                    'session_id': new_session_id,
                    'message': f'Already in session {new_session_id}'
                })
                return
            
            # End ongoing chats
            Chat.query.filter_by(
                user_id=user_id,
                status="ongoing"
            ).update({"status": "ended_by_session_change"})
            
            # Update user session
            user.session_id = new_session_id
            db.session.commit()
            
            # Notify client
            emit('ongoing_chats_terminated', {
                'old_session_id': old_session_id,
                'new_session_id': new_session_id,
                'reason': 'session_change'
            })
            
            emit('session_change_success', {
                'session_id': new_session_id,
                'message': f'Session changed to {new_session_id}'
            })
            
        except Exception as e:
            db.session.rollback()
            print(f"Error in handle_session_change: {str(e)}")
            emit('error', {'error': str(e)})

def process_chat_message(user_input, user_id, chat_id, session_id, socket_session_id):
    """Process chat message with simple workflow"""
    try:
        # Create and execute workflow
        workflow = create_simple_workflow()
        
        # Execute workflow
        result = workflow.execute({
            'user_input': user_input,
            'user_id': user_id,
            'chat_id': chat_id,
            'session_id': session_id
        })
        
        # Stream response
        response = result.get('response', 'No response generated')
        workflow_status = result.get('status', 'completed')
        
        # Emit stream start
        socketio.emit('stream_start', {
            'chat_id': chat_id
        }, to=socket_session_id)
        
        # Stream response word by word
        words = response.split()
        for i, word in enumerate(words):
            socketio.emit('stream_chunk', {
                'content': word + " "
            }, to=socket_session_id)
            time.sleep(0.03)  # Small delay for streaming effect
        
        # Save assistant response
        ChatManager.add_message_to_chat(chat_id, 'assistant', response)
        
        # Handle special workflow outcomes
        if workflow_status in ['abandon', 'restart', 'results']:
            ChatManager.end_chat(chat_id, f"ended_by_{workflow_status}", user_id)
            
            socketio.emit('chat_ended', {
                'reason': workflow_status,
                'message': response
            }, to=socket_session_id)
        
        # Emit stream end
        socketio.emit('stream_end', {
            'response': response,
            'status': workflow_status
        }, to=socket_session_id)
        
    except Exception as e:
        print(f"Error in process_chat_message: {str(e)}")
        socketio.emit('stream_error', {
            'error': str(e)
        }, to=socket_session_id)
