import time
import json
from flask import Blueprint, request
from flask import session
from flask_socketio import emit, disconnect, join_room, leave_room
from .chat_manager import ChatManager
from .db import db
from .models import User, Chat, create_feedback
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
                handle_get_user_data()  # This will emit session_data_response
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
    @socketio.on('get_user_data')
    @socketio_auth_required
    def handle_get_user_data():
        try:
            user_id = session.get('user_id')
            user = User.query.get(user_id)
            
            if not user:
                emit('error', {'error': 'User not found'})
                return


            emit('user_data_response', {
                'userId': user.id,
                'username': user.username,
                'mode': user.mode
            })
            
        except Exception as e:
            print(f"Error getting user data: {str(e)}")
            emit('error', {'error': 'Error getting user data'})

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
            
            # Check for ongoing chat or create new one
            existing_chat, error = ChatManager.get_ongoing_chat(user_id)
            
            if existing_chat:
                # Add message to existing chat
                success, error = ChatManager.add_message_to_chat(existing_chat.id, 'user', user_input)
                if not success:
                    emit('error', {'error': f'Failed to add message: {error}'})
                    return
                chat = existing_chat
            else:
                # Create new chat with first message
                chat, error = ChatManager.create_chat_with_first_message(user_id, user.mode, user_input)
                if error:
                    emit('error', {'error': f'Failed to create chat: {error}'})
                    return
            
            # Emit message received
            emit('message_received', {
                'message': user_input,
                'chat_id': chat.id
            })
            
            # Process message with workflow
            process_chat_message(user_id, chat.id, chat.mode)
            
        except Exception as e:
            print(f"Error in handle_send_message: {str(e)}")
            emit('error', {'error': 'Error processing message'})

    # only for local concurrency test
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
            
            chat_state = ChatManager.get_chat_state(user_id)
            
            # Always emit response, even if no ongoing chat
            emit('chat_state_response', {
                'chat': chat_state.get('chat'),
                'hasOngoingChat': chat_state.get('chat') is not None
            })
            
        except Exception as e:
            print(f"Error in handle_get_chat_state: {str(e)}")
            emit('error', {'error': 'Error getting chat state'})

    @socketio.on('start_new_chat')
    @socketio_auth_required
    def start_new_chat(data):
        user_id = session.get('user_id')
        
        # Get user session info
        user = User.query.get(user_id)
        if not user:
            emit('error', {'error': 'User not found'})
            return
    
        # Check for ongoing chat or create new one
        existing_chat, error = ChatManager.get_ongoing_chat(user_id)
        
        if existing_chat:
            ChatManager.end_chat(existing_chat.id, data.get('end_chat_reason'), user_id)
        return

    @socketio.on('mode_change')
    @socketio_auth_required
    def handle_mode_change(data):
        try:
            new_mode = data.get('mode')
            user_id = session.get('user_id')
            
            user = User.query.get(user_id)
            if not user:
                emit('error', {'error': 'User not found'})
                return
            
            # Update user session
            user.mode = new_mode
            db.session.commit()

            session["mode"] = new_mode
            
            # Notify client
            emit('mode_change_success', {
                'message': f'Mode changed to {new_mode}.'
            })
            
        except Exception as e:
            db.session.rollback()
            print(f"Error in handle_session_change: {str(e)}")
            emit('error', {'error': str(e)})

    # Feedback events
    @socketio.on('submit_conv_feedback')
    @socketio_auth_required
    def handle_submit_conv_feedback(data):
        # Per-conversation feedback
        try:
            chat_id = data.get('chatId')
            feedback = data.get('feedback')
            
            # Save feedback and end chat
            chat = Chat.query.get(chat_id)
            if chat:
                chat.feedback = feedback
                # chat.status = "end:user_feedback"
                chat.updated_at = datetime.datetime.now()
                db.session.commit()
                
                # Emit feedback saved first
                emit('conv_feedback_saved', {
                    'success': True,
                    'chatId': chat_id
                })
                
                # # Then end the chat
                # emit('chat_ended', {
                #     'chat_id': chat_id,
                #     'reason': 'end:user_feedback'
                # })
        except Exception as e:
            emit('error', {'error': str(e)})

    @socketio.on('get_feedback_status')
    @socketio_auth_required
    def handle_get_feedback_status(data):
        try:
            chat_id = data.get('chatId')
            chat = Chat.query.get(chat_id)
            
            if chat:
                emit('feedback_status', {
                    'submitted': chat.feedback is not None
                })
            else:
                emit('error', {'error': f"Chat {chat_id} NOT FOUND. Error fetching user feedback status."})
        except Exception as e:
            emit('error', {'error': str(e)})

    @socketio.on('submit_user_feedback')
    @socketio_auth_required
    def handle_submit_user_feedback(data):
        try:
            user_id = data.get('userId')
            feedback = data.get('feedback')

            # Save feedback
            save_result = create_feedback(user_id,feedback)
            if type(save_result) is Exception:
                emit('error', {'error': str(e)})
            else:
                emit('user_feedback_saved', {
                    'success': True,
                    'userId': user_id
                })
        except Exception as e:
            emit('error', {'error': str(e)})

def process_chat_message(user_id, chat_id, mode):
    """Process chat message with simple workflow"""
    # (2025.6.25) user_id used only for socketio communication; chat_id for managing the conversation (fetch conv history and save on the fly)
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
                if msg["role"] != "sru":
                    conv_history.append(msg['content'])
        
        # Create and execute workflow with expected format
        graph = build_graph(socketio, user_id, mode)  # Pass user_id to build_graph; 
        # print(f"##### {chat_id}; {type(chat_id)}")
        state = graph.invoke({"conv_history": conv_history, "chat_id":chat_id})
        
        # Get assistant response
        assistant_response = state.get("response", "Une erreur s'est produite. Veillez commencer une nouvelle conversation.")
        # Save assistant response to database
        success, error = ChatManager.add_message_to_chat(chat_id, 'assistant', assistant_response)
        if not success:
            print(f"[process_chat_message] Failed to save assistant response: {error}")
            socketio.emit('error', {'error': f'Failed to save response: {error}'}, room=f'user_{user_id}')
            return

        if chat.mode == "search":
            generated_sru_query = state.get("generated_sru_query", "")
            gallica_retrieval_message = state.get("gallica_retrieval_message", "")

            # Save generated SRU
            success, error = ChatManager.add_message_to_chat(chat_id, 'sru', generated_sru_query)
            if not success:
                print(f"[process_chat_message] Failed to save generated sru: {error}")
                socketio.emit('error', {'error': f'Failed to save generated sru: {error}'}, room=f'user_{user_id}')
                return
            
            # Save also the message showing the number of corresponding Gallica bibliographic records
            success, error = ChatManager.add_message_to_chat(chat_id, 'gallica', gallica_retrieval_message)
            if not success:
                print(f"[process_chat_message] Failed to save gallica-related retrieval message: {error}")
                socketio.emit('error', {'error': f'Failed to save generated sru: {error}'}, room=f'user_{user_id}')
                return
            
            socketio.emit('results_data', {"chatId":chat_id}, room=f'user_{user_id}')
        
        # Handle special statuses
        status_tag = state.get("status", "").split(':')[0]
        if status_tag == "search":
            socketio.emit("results_triggered", {
                "info": "Recherche déclenchée"
            }, room=f'user_{user_id}')

            # Process search results
            try:
                search_result = state.get("search_result", {})
                success, error = ChatManager.save_search_result(chat_id, search_result, state.get("user_intent",""))
                
                if not success:
                    print(f"[process_chat_message] Failed to save conversation result : {error}")
                    socketio.emit('error', {'error': f'Failed to save conversation result: {error}'}, room=f'user_{user_id}')
                    return

                socketio.emit('results_data', {**search_result,"chatId":chat_id}, room=f'user_{user_id}')
            except Exception as e:
                print(f"[process_chat_message] Error processing results: {str(e)}")
                socketio.emit('results_error', {'error': str(e)}, room=f'user_{user_id}')
                
        elif status_tag == "end":
            # Handle chat ending
            ChatManager.end_chat(chat_id, state.get("status"), user_id)
            socketio.emit('disable_user_input', {}, room=f'user_{user_id}')
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

