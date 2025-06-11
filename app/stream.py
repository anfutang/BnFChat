import time
import json
from flask import Blueprint, request
from flask import session
from flask_socketio import emit, disconnect, join_room, leave_room
from .chat_manager import ChatManager
from .db import db
from .models import User, Chat
from .llm.graph import build_graph
from .utils.constant import *
from .utils.retriever import retrieve_result_page
import datetime

bp = Blueprint('stream', __name__)
socketio = None
# REMOVED: socket_user_sessions = {}

def init_socketio(socketio_instance):
    global socketio
    socketio = socketio_instance
    register_socketio_events()

def socketio_auth_required(f):
    def decorated_function(*args, **kwargs):
        # Use Flask-SocketIO's session instead of global dict
        user_id = session.get('user_id')
        if not user_id:
            emit('error', {'error': 'Not authenticated'})
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
            
            # IMPORTANT: Store the user_id in the session for this socket connection
            session['user_id'] = user_id  # Add this line!
            
            # Join a room specific to this user for targeted messaging
            join_room(f'user_{user_id}')
            
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
        user_id = session.get('user_id')
        if user_id:
            leave_room(f'user_{user_id}')
            # Optionally clear the session data
            session.pop('user_id', None)
    
    # ========== SESSION DATA (moved from HTTP) ==========
    @socketio.on('get_session_data')
    @socketio_auth_required
    def handle_get_session_data():
        try:
            user_id = session.get('user_id')
            user = User.query.get(user_id)
            
            if not user:
                emit('error', {'error': 'User not found'})
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
                'timerExercise': user.timer_exercise or None,
                'timerTest': user.timer_test or None
            })
            
        except Exception as e:
            print(f"Error getting session data: {str(e)}")
            emit('error', {'error': 'Error getting session data'})

    # ========== TOPICS (moved from HTTP) ==========
    @socketio.on('get_topics')
    @socketio_auth_required
    def handle_get_topics():
        try:
            user_id = session.get('user_id')
            user = User.query.get(user_id)
            
            if not user:
                emit('error', {'error': 'User not found'})
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
            emit('error', {'error': 'Error getting topics'})

    # ========== TOPIC SELECTION (moved from HTTP) ==========
    @socketio.on('select_topic')
    @socketio_auth_required
    def handle_select_topic(data):
        try:
            user_id = session.get('user_id')
            topic_id = data.get('topicId')
            
            if topic_id is None or topic_id < 0:
                emit('error', {'error': 'Valid topic ID required'})
                return
            
            user = User.query.get(user_id)
            if not user:
                emit('error', {'error': 'User not found'})
                return
            
            # Validate topic for current session
            if user.session_id in TOPICS and topic_id > 0:
                topic_info = next((t for t in TOPICS[user.session_id] if t["id"] == topic_id), None)
                if not topic_info:
                    emit('error', {'error': 'Invalid topic for current session'})
                    return
            
            # End any ongoing chat before topic change
            ongoing_chat = Chat.query.filter_by(
                user_id=user_id,
                session_id=user.session_id,
                status="ongoing"
            ).first()
            
            if ongoing_chat:
                ChatManager.end_chat(ongoing_chat.id, "end:topic_change", user_id)
            
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
            emit('error', {'error': 'Error selecting topic'})

    # ========== TIMER OPERATIONS =========
    @socketio.on('update_timer')
    @socketio_auth_required
    def handle_update_timer(data):
        try:
            session_id = data.get('sessionId',0)
            timer_value = data.get('timerValue',-1)

            if session_id < 1 or timer_value < 0:
                emit('error', {'error': 'Invalid session id or timer value.'})
                return 
            
            user_id = session.get('user_id')
            user = User.query.get(user_id)
            if not user:
                emit('error', {'error': 'User not found'})
                return
            
            # Update the appropriate timer based on session
            if session_id == 2:
                user.timer_exercise = timer_value
            elif session_id == 3:
                user.timer_test = timer_value
            
            db.session.commit()
            
            emit('timer_updated', {
                "success": True,
                "sessionId": session_id,
                "timerValue": timer_value
            })

        except Exception as e:
            print(f"Error in handle_update_timer: {str(e)}")
            emit('error', {'error': 'Error updating timer'})

    # ========== CHAT OPERATIONS ==========
    @socketio.on('send_message')
    @socketio_auth_required
    def handle_send_message(data):
        try:
            user_input = data.get('message', '').strip()
            user_id = session.get('user_id')
            
            if not user_input:
                emit('error', {'error': 'Empty message'})
                return
            
            # Get user session info
            user = User.query.get(user_id)
            if not user:
                emit('error', {'error': 'User not found'})
                return
            
            session_id = user.session_id
            
            # Validate topic selection for sessions > 1
            if session_id > 1:
                topic_id = user.exercise_topic_id if session_id == 2 else user.test_topic_id
                if topic_id <= 0:
                    emit('error', {
                        'error': 'Please select a topic before starting conversation',
                        'error_type': 'topic_required'
                    })
                    return
            
            # Check for ongoing chat or create new one
            existing_chat, error = ChatManager.get_ongoing_chat(user_id, session_id)
            
            if existing_chat:
                # Add message to existing chat
                success, error = ChatManager.add_message_to_chat(existing_chat.id, 'user', user_input)
                if not success:
                    emit('error', {'error': f'Failed to add message: {error}'})
                    return
                chat = existing_chat
            else:
                # Create new chat with first message
                chat, error = ChatManager.create_chat_with_first_message(user_id, session_id, user_input)
                if error:
                    emit('error', {'error': f'Failed to create chat: {error}'})
                    return
            
            # Emit message received
            emit('message_received', {
                'message': user_input,
                'chat_id': chat.id,
                'session_id': session_id
            })
            
            # Process message with workflow
            process_chat_message(user_input, user_id, chat.id, session_id)
            
        except Exception as e:
            print(f"Error in handle_send_message: {str(e)}")
            emit('error', {'error': 'Error processing message'})

    # only for test
    @socketio.on('demo_join')
    @socketio_auth_required # UNCOMMENT THIS LINE FOR PRODUCTION 
    def demo_join(data):
        room = data['room']
        user_id = data['id']
        join_room(room) 
        emit('demo_room_joined', {'msg': f'✅ Joined room {room}', 'id': user_id}, room=room)

    @socketio.on('demo_send_message')
    @socketio_auth_required # UNCOMMENT THIS LINE FOR PRODUCTION 
    def handle_demo_send_message(data):
        try:
            message = data.get('message').strip()
            user_id = data.get('user_id')
            chat_id = data.get('chat_id')
            # Process message with workflow
            demo_process_chat_message(message.split('#'),user_id,chat_id)
        except Exception as e:
            print(f"===>>>Error demo_send_message")
            emit('error', {'error': 'Error processing message'})

    @socketio.on('get_chat_state')
    @socketio_auth_required
    def handle_get_chat_state():
        try:
            user_id = session.get('user_id')
            user = User.query.get(user_id)
            
            if not user:
                emit('error', {'error': 'User not found'})
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
            emit('error', {'error': 'Error getting chat state'})

    @socketio.on('erase_chat')
    @socketio_auth_required
    def erase_chat():
        user_id = session.get('user_id')
        
        # Get user session info
        user = User.query.get(user_id)
        if not user:
            emit('error', {'error': 'User not found'})
            return
        
        session_id = user.session_id
        
        # Validate topic selection for sessions > 1
        if session_id > 1:
            topic_id = user.exercise_topic_id if session_id == 2 else user.test_topic_id
            if topic_id <= 0:
                emit('error', {
                    'error': 'Please select a topic before starting conversation',
                    'error_type': 'topic_required'
                })
                return
        
        # Check for ongoing chat or create new one
        existing_chat, error = ChatManager.get_ongoing_chat(user_id, session_id)
        
        # if not existing_chat:
        #     emit('error', {'message': 'Erase an empty chat.'})
        #     return
        if existing_chat:
            ChatManager.end_chat(existing_chat.id, "end:user_restart", user_id)
        return

    @socketio.on('session_change')
    @socketio_auth_required
    def handle_session_change(data):
        try:
            new_session_id = data.get('session_id')
            user_id = session.get('user_id')
            
            if new_session_id not in [1, 2, 3, 4]:
                emit('error', {'error': 'Invalid session ID'})
                return
            
            user = User.query.get(user_id)
            if not user:
                emit('error', {'error': 'User not found'})
                return
            
            old_session_id = user.session_id
            
            # End ongoing chats
            Chat.query.filter_by(
                user_id=user_id,
                status="ongoing"
            ).update({"status": "end:user_session_change"})
            
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

    @socketio.on('submit_conv_feedback')
    @socketio_auth_required
    def handle_submit_conv_feedback(data):
        try:
            chat_id = data.get('chatId')
            user_intent = data.get('userIntent')
            sru_query = data.get('sruQuery')
            feedback_data = {
                **data.get('formData'),
                'timestamp': datetime.datetime.now().isoformat()
            }
            
            # Save feedback and end chat
            chat = Chat.query.get(chat_id)
            if chat:
                chat.feedback = feedback_data
                chat.user_intent = user_intent
                chat.sru_query = sru_query
                chat.status = "end:user_feedback"
                chat.updated_at = datetime.datetime.now()
                db.session.commit()
                
                # Emit feedback saved first
                emit('feedback_saved', {
                    'success': True,
                    'chatId': chat_id
                })
                
                # Then end the chat
                emit('chat_ended', {
                    'chat_id': chat_id,
                    'reason': 'end:user_feedback'
                })
                
                # Clear chat UI
                emit('ongoing_chats_terminated', {
                    'reason': 'feedback_submitted',
                    'message': 'Chat ended after feedback submission'
                })
        except Exception as e:
            emit('error', {'error': str(e)})

    @socketio.on('submit_final_feedback')
    @socketio_auth_required
    def handle_submit_final_feedback(data):
        try:
            user_id = data.get('userId')
            feedback_data = {
                **data.get('formData'),
                'timestamp': datetime.datetime.now().isoformat()
            }
            
            # Save feedback and end chat
            user = User.query.get(user_id)
            if user:
                user.feedback = feedback_data
                db.session.commit()
                
                # Emit feedback saved first
                emit('final_feedback_saved', {
                    'success': True,
                    'userId': user_id
                })
                
                # Then end the chat
                emit('test_ended_success', {})
        except Exception as e:
            emit('error', {'error': str(e)})

def process_chat_message(user_input, user_id, chat_id, session_id):
    """Process chat message with simple workflow"""
    try:
        # Refresh chat from database to ensure we have latest data
        chat = Chat.query.get(chat_id)
        if not chat:
            socketio.emit('error', {'error': 'Chat not found'}, room=f'user_{user_id}')
            return
        
        # Force refresh to ensure we have the latest chat history
        db.session.refresh(chat)
        
        # Build conversation history as list of user messages only
        # (based on your original code, the graph expects user messages only)
        conv_history = []
        if chat.chat_history:
            for msg in chat.chat_history:
                conv_history.append(msg['content'])
        
        # Create and execute workflow with expected format
        graph = build_graph(socketio, user_id)  # Pass user_id to build_graph
        # print(f"##### {chat_id}; {type(chat_id)}")
        state = graph.invoke({"conv_history": conv_history, "chat_id":chat_id})
        
        # Get assistant response
        assistant_response = state.get("response", "Une erreur s'est produite. Veillez effacer la conversation.")
        
        # Save assistant response to database
        success, error = ChatManager.add_message_to_chat(chat_id, 'assistant', assistant_response)
        if not success:
            print(f"[process_chat_message] Failed to save assistant response: {error}")
            socketio.emit('error', {'error': f'Failed to save response: {error}'}, room=f'user_{user_id}')
            return
        
        # Handle special statuses
        status_tag = state.get("status", "").split(':')[0]
        if status_tag == "search":
            socketio.emit("results_triggered", {
                "info": "Recherche déclenchée"
            }, room=f'user_{user_id}')

            # Process search results
            try:
                wc_results = state.get("search_result", [[], []])[0]  # with conversation results
                woc_results = state.get("search_result", [[], []])[1]  # without conversation results
                
                result_data = {
                    'chatId': chat_id,  # Include chat ID for feedback submission
                    'userIntent': state.get("user_intent",""),
                    'sruQuery': state.get("generated_sru_query", ""),
                    'originalQuery': state.get("original_sru_query", ""),
                    'wcResults': wc_results,
                    'wocResults': woc_results,
                    'timestamp': datetime.datetime.now().isoformat()
                }
                
                socketio.emit('results_data', result_data, room=f'user_{user_id}')
            except Exception as e:
                print(f"[process_chat_message] Error processing results: {str(e)}")
                socketio.emit('results_error', {'error': str(e)}, room=f'user_{user_id}')
                
        elif status_tag == "end":
            # Handle chat ending
            ChatManager.end_chat(chat_id, state.get("status"), user_id)
            time.sleep(3)
            socketio.emit('chat_ended', {
                'chat_id': chat_id,
                'reason': state.get("status")
            }, room=f'user_{user_id}')
        elif status_tag == "error":
            # Handle error state
            error_msg = state.get("error_message", "Unknown error occurred")
            print(f"[process_chat_message] Graph error: {error_msg}")
            socketio.emit('error', {
                'error': error_msg
            }, room=f'user_{user_id}')

    except Exception as e:
        print(f"[process_chat_message] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        socketio.emit('error', {
            'error': str(e)
        }, room=f'user_{user_id}')

def demo_process_chat_message(conv_history,user_id,chat_id):
    """Process chat message with simple workflow"""
    try:

        # Create and execute workflow with expected format
        graph = build_graph(socketio, user_id)  # Pass user_id to build_graph
        # print(f"##### {chat_id}; {type(chat_id)}")
        state = graph.invoke({"conv_history": conv_history, "chat_id":chat_id})

        if state["status"] == "error":
            socketio.emit('demo_error', {"error_message":"❌ "+state["error_message"], "id":user_id}, room=f'user_{user_id}')
            return
        
        # Get assistant response
        assistant_response = state.get("response", "Une erreur s'est produite. Veillez effacer la conversation.")
        socketio.emit('demo_response', {"response":assistant_response,"id":user_id}, room=f'user_{user_id}')

        status_tag = state.get("status", "").split(':')[0]
        if status_tag == "search":
            # Get search results
            wc_results = state.get("search_result", [[], []])[0]  
            woc_results = state.get("search_result", [[], []])[1]  

            if not wc_results and not woc_results:
                socketio.emit('demo_search_result', {"response":"🔴 no results both", "id":user_id}, room=f'user_{user_id}')
            elif not wc_results:
                socketio.emit('demo_search_result', {"response":"🟠 no results w/ clarification", "id":user_id}, room=f'user_{user_id}')
            elif not woc_results:
                socketio.emit('demo_search_result', {"response":"🟠 no results w/o clarification", "id":user_id}, room=f'user_{user_id}')
            else:
                socketio.emit('demo_search_result', {"response":"🟢 search results ok", "id":user_id}, room=f'user_{user_id}')

        # print(assistant_response)

    except Exception as e:
        print(f"[demo_process_chat_message] Error: {str(e)}")

