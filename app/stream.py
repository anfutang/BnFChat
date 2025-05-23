import time
import json
import random
import threading
import traceback
import uuid
from datetime import datetime
from typing import TypedDict, Annotated
from flask import Blueprint, request, current_app
from flask_socketio import emit, disconnect, join_room, leave_room
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

from .chat_manager import ChatManager
from .db import db
from .models import User, Chat
from .auth import login_required
from .utils.constant import *
from .llm.llm import *
from .llm.rag import knn
from functools import wraps

# Store user sessions for SocketIO
socket_user_sessions = {}

def socketio_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = socket_user_sessions.get(request.sid)
        if not user_id:
            emit('error', {'message': 'Utilisateur non authentifié'})
            return
        return f(*args, **kwargs)
    return decorated_function

bp = Blueprint('stream', __name__)
socketio = None

def init_socketio(socketio_instance):
    """Initialize the SocketIO instance"""
    global socketio
    socketio = socketio_instance
    register_socketio_events()

# Simple workflow state
class BNFWorkflowState(TypedDict):
    user_input: str
    user_id: int
    chat_id: int
    session_id: int
    socketio_session_id: str
    chat_history: list
    detected_intent: str
    user_intent_summary: str
    topics_found: list
    detected_topic: str
    final_response: str
    workflow_status: str
    time_metrics: dict

def create_bnf_workflow(socketio_session_id):
    """Create simple BNF workflow"""
    
    def check_special_commands(state: BNFWorkflowState) -> BNFWorkflowState:
        """Check for special chat commands first"""
        socketio.emit('workflow_progress', {
            'step': 'command_check',
            'status': 'Vérification des commandes spéciales...',
        }, to=socketio_session_id)
        
        user_input_lower = state['user_input'].lower().strip()
        
        # Check for special commands
        if 'abandon' in user_input_lower:
            return {**state, 'workflow_status': 'abandon', 'final_response': abandon_response}
        elif 'recommencer' in user_input_lower or 'recommence' in user_input_lower:
            return {**state, 'workflow_status': 'recommencer', 'final_response': "Conversation redémarrée."}
        elif 'résultat' in user_input_lower or 'resultat' in user_input_lower:
            return {**state, 'workflow_status': 'resultat', 'final_response': "Ouverture de la fenêtre d'évaluation..."}
        
        return {**state, 'workflow_status': 'continue'}
    
    def analyze_conversation(state: BNFWorkflowState) -> BNFWorkflowState:
        """Analyze conversation intent and summarize"""
        if state['workflow_status'] != 'continue':
            return state
            
        socketio.emit('workflow_progress', {
            'step': 'conversation_analysis',
            'status': 'Analyse de la conversation...',
        }, to=socketio_session_id)
        
        try:
            # Build chat history for analysis
            history_for_analysis = []
            for msg in state['chat_history']:
                if isinstance(msg, dict):
                    history_for_analysis.append(msg.get('content', ''))
                else:
                    history_for_analysis.append(str(msg))
            history_for_analysis.append(state['user_input'])
            
            # Detect intent
            start_time = time.time()
            intent_result = call_conv_intent_detection(history_for_analysis)
            intent_time = time.time() - start_time
            
            if isinstance(intent_result, str):
                detected_intent = 'continue'
            else:
                _, detected_intent = intent_result
            
            # Summarize if not first message
            if len(state['chat_history']) > 0:
                start_time = time.time()
                summary_result = call_conv_summarization(history_for_analysis)
                summary_time = time.time() - start_time
                
                if isinstance(summary_result, str):
                    user_intent = state['user_input']
                else:
                    _, user_intent = summary_result
                    
                state['time_metrics']['summarization'] = f"{summary_time:.3f}s"
            else:
                user_intent = state['user_input']
            
            socketio.emit('workflow_progress', {
                'step': 'conversation_analysis',
                'status': f'Intention: {detected_intent}',
                'result': user_intent,
            }, to=socketio_session_id)
            
            # Emit user intent to frontend
            socketio.emit('user_intent_detected', {
                'intent': user_intent,
            }, to=socketio_session_id)
            
            return {
                **state,
                'detected_intent': detected_intent,
                'user_intent_summary': user_intent,
                'time_metrics': {**state.get('time_metrics', {}), 'intent_detection': f"{intent_time:.3f}s"}
            }
            
        except Exception as e:
            print(f"Error in conversation analysis: {e}")
            return {**state, 'user_intent_summary': state['user_input']}
    
    def search_knowledge(state: BNFWorkflowState) -> BNFWorkflowState:
        """Search in knowledge base"""
        if state['workflow_status'] != 'continue':
            return state
            
        socketio.emit('workflow_progress', {
            'step': 'knowledge_search',
            'status': 'Recherche dans les collections BNF...',
        }, to=socketio_session_id)
        
        try:
            start_time = time.time()
            user_intent = state.get('user_intent_summary', state['user_input'])
            
            # Search using KNN
            search_result = knn(user_intent, 20)
            search_time = time.time() - start_time
            
            if search_result and search_result.get("topic"):
                topics = search_result["topic"]
                detected_topic = topics[0] if topics else None
                
                socketio.emit('workflow_progress', {
                    'step': 'knowledge_search',
                    'status': f'Trouvé {len(topics)} sujets pertinents',
                    'topic': detected_topic,
                }, to=socketio_session_id)
                
                return {
                    **state,
                    'topics_found': topics,
                    'detected_topic': detected_topic or '',
                    'time_metrics': {**state.get('time_metrics', {}), 'search': f"{search_time:.3f}s"}
                }
            else:
                socketio.emit('workflow_progress', {
                    'step': 'knowledge_search',
                    'status': 'Aucun sujet pertinent trouvé',
                }, to=socketio_session_id)
                
                return {**state, 'topics_found': [], 'detected_topic': ''}
                
        except Exception as e:
            print(f"Error in knowledge search: {e}")
            return {**state, 'topics_found': [], 'detected_topic': ''}
    
    def generate_response(state: BNFWorkflowState) -> BNFWorkflowState:
        """Generate final response"""
        socketio.emit('workflow_progress', {
            'step': 'response_generation',
            'status': 'Génération de la réponse...',
        }, to=socketio_session_id)
        
        # Handle special commands
        if state['workflow_status'] in ['abandon', 'recommencer', 'resultat']:
            return state  # Response already set
        
        # Generate response based on search results
        topics_found = state.get('topics_found', [])
        detected_topic = state.get('detected_topic', '')
        user_intent = state.get('user_intent_summary', state['user_input'])
        
        if len(topics_found) > 0:
            topic_text = f" sur {detected_topic}" if detected_topic else ""
            final_response = f"Voici ce que j'ai trouvé{topic_text} concernant '{user_intent}'. "
            final_response += f"J'ai identifié {len(topics_found)} sujets pertinents dans nos collections. "
            final_response += "Souhaitez-vous que je lance une recherche détaillée?"
            workflow_status = 'topics_found'
        else:
            final_response = refusal_response
            if state.get('user_intent_summary'):
                final_response += " " + search_notification
                workflow_status = 'refused_with_search'
            else:
                final_response += " " + reinitialization_notification
                workflow_status = 'refused'
        
        return {
            **state,
            'final_response': final_response,
            'workflow_status': workflow_status
        }
    
    # Build workflow
    workflow = StateGraph(BNFWorkflowState)
    workflow.add_node("check_commands", check_special_commands)
    workflow.add_node("analyze_conversation", analyze_conversation)
    workflow.add_node("search_knowledge", search_knowledge)
    workflow.add_node("generate_response", generate_response)
    
    workflow.set_entry_point("check_commands")
    workflow.add_edge("check_commands", "analyze_conversation")
    workflow.add_edge("analyze_conversation", "search_knowledge")
    workflow.add_edge("search_knowledge", "generate_response")
    workflow.add_edge("generate_response", END)
    
    return workflow.compile()

def process_chat_message(user_input, user_id, chat_id, session_id, socketio_session_id):
    """Process chat message with single workflow - NO THREADING"""
    try:
        message_id = str(uuid.uuid4())
        
        # Emit stream start
        socketio.emit('stream_start', {
            'message_id': message_id,
            'workflow': 'bnf_chat'
        }, to=socketio_session_id)
        
        # Get current chat history from ChatManager
        chat_state = ChatManager.get_chat_state(user_id, session_id)
        chat_history = []
        
        # Extract message content from chat state
        if chat_state.get('messages'):
            for msg in chat_state['messages']:
                chat_history.append({
                    'role': msg.get('sender', ''),
                    'content': msg.get('message', ''),
                    'timestamp': msg.get('timestamp', '')
                })
        
        # Save user message first
        try:
            # Ensure clean session state
            db.session.close()
            db.session.configure(bind=db.engine)
        except:
            pass
            
        success, error = ChatManager.add_message_to_chat(chat_id, 'user', user_input)
        if not success:
            raise Exception(f"Failed to save user message: {error}")
        
        # Create workflow
        workflow = create_bnf_workflow(socketio_session_id)
        
        # Execute workflow
        initial_state = {
            "user_input": user_input,
            "user_id": user_id,
            "chat_id": chat_id,
            "session_id": session_id,
            "socketio_session_id": socketio_session_id,
            "chat_history": chat_history,
            "detected_intent": "",
            "user_intent_summary": "",
            "topics_found": [],
            "detected_topic": "",
            "final_response": "",
            "workflow_status": "",
            "time_metrics": {}
        }
        
        final_state = workflow.invoke(initial_state)
        
        # Stream response
        final_response = final_state.get('final_response', 'Aucune réponse générée')
        workflow_status = final_state.get('workflow_status', 'completed')
        
        socketio.emit('workflow_progress', {
            'step': 'streaming_response',
            'status': 'Diffusion de la réponse...',
        }, to=socketio_session_id)
        
        # Stream word by word
        words = final_response.split()
        for i, word in enumerate(words):
            socketio.emit('stream_chunk', {
                'content': word + " ",
                'progress': f"{i+1}/{len(words)}"
            }, to=socketio_session_id)
            time.sleep(0.05)
        
        # Save assistant response
        try:
            # Ensure clean session for save
            db.session.close()
        except:
            pass
            
        success, error = ChatManager.add_message_to_chat(chat_id, 'assistant', final_response)
        if not success:
            print(f"Warning: Failed to save assistant message: {error}")
        
        # Update topic if detected
        detected_topic = final_state.get('detected_topic')
        if detected_topic:
            try:
                db.session.close()
            except:
                pass
            ChatManager.update_chat_topic(chat_id, detected_topic, user_id)
        
        # Handle special workflow outcomes
        handle_workflow_outcome(workflow_status, chat_id, user_id, session_id, final_response, socketio_session_id)
        
        # Send completion
        socketio.emit('stream_end', {
            'message_id': message_id,
            'final_response': final_response,
            'detected_topic': detected_topic or '',
            'user_intent': final_state.get('user_intent_summary', ''),
            'workflow_status': workflow_status,
            'time_metrics': final_state.get('time_metrics', {}),
            'workflow_completed': True
        }, to=socketio_session_id)
        
    except Exception as e:
        print(f"Error in process_chat_message: {str(e)}")
        traceback.print_exc()
        socketio.emit('stream_error', {
            'error': str(e),
            'error_type': 'workflow_error'
        }, to=socketio_session_id)

def handle_workflow_outcome(workflow_status, chat_id, user_id, session_id, final_response, socketio_session_id):
    """Handle different workflow outcomes"""
    if workflow_status == 'abandon':
        ChatManager.end_chat(chat_id, "abandoned", user_id)
        # Create a new chat for the session after abandon
        new_chat, error = ChatManager.get_or_create_ongoing_chat(user_id, session_id)
        socketio.emit('conversation_abandoned', {
            'message': final_response,
            'chat_id': chat_id,
            'new_chat_id': new_chat.id if new_chat and not error else None  # Provide new chat ID
        }, to=socketio_session_id)
        
    elif workflow_status == 'recommencer':
        ChatManager.end_chat(chat_id, "restarted", user_id)
        new_chat, error = ChatManager.get_or_create_ongoing_chat(user_id, session_id)
        socketio.emit('conversation_restarted', {
            'message': final_response,
            'old_chat_id': chat_id,
            'new_chat_id': new_chat.id if new_chat else None
        }, to=socketio_session_id)
        
    elif workflow_status == 'resultat':
        ChatManager.end_chat(chat_id, "completed", user_id)
        socketio.emit('results_window_requested', {
            'message': final_response,
            'chat_id': chat_id
        }, to=socketio_session_id)

def register_socketio_events():
    """Register SocketIO event handlers"""
    
    @socketio.on('connect')
    def handle_connect(auth):
        print(f'Client connected: {request.sid}')
        
        user_id = None
        if auth and 'userId' in auth:
            user_id = auth['userId']
            socket_user_sessions[request.sid] = user_id
            print(f'User {user_id} authenticated')
        
        if user_id:
            join_room(f"user_{user_id}")
            emit('connected', {
                'status': 'connected',
                'session_id': request.sid,
                'user_id': user_id
            })
        else:
            emit('connected', {
                'status': 'connected_anonymous',
                'session_id': request.sid
            })

    @socketio.on('disconnect')
    def handle_disconnect():
        print(f'Client disconnected: {request.sid}')
        user_id = socket_user_sessions.get(request.sid)
        if user_id:
            leave_room(f"user_{user_id}")
            del socket_user_sessions[request.sid]

    @socketio.on('send_message')
    @socketio_login_required
    def handle_send_message(data):
        try:
            user_input = data.get('message', '').strip()
            provided_chat_id = data.get('chat_id')  # Can be null
            user_id = socket_user_sessions.get(request.sid)
            
            if not user_input:
                emit('error', {'message': 'Message vide reçu'})
                return
            
            # CRITICAL FIX: Get session_id from user's database record, not from client
            try:
                db.session.rollback()  # Ensure clean session
                user = db.session.query(User).filter_by(id=user_id).first()
                if not user:
                    emit('error', {'message': 'Utilisateur introuvable'})
                    return
                session_id = user.session_id  # Use user's current session from DB
            except Exception as e:
                print(f"Error getting user session: {e}")
                emit('error', {'message': 'Erreur accès session utilisateur'})
                return
            
            print(f"Processing message from user {user_id} in session {session_id}: {user_input}")
            print(f"Provided chat_id: {provided_chat_id}")
            
            # Get or create chat for the user's CURRENT session
            # This will only create a chat if none exists (no empty chats)
            chat, error = ChatManager.get_or_create_ongoing_chat(user_id, session_id)
            if error:
                emit('error', {'message': f'Erreur chat: {error}'})
                return
            
            # Emit acknowledgment with the actual chat ID (newly created or existing)
            emit('message_received', {
                'message': user_input,
                'chat_id': chat.id,
                'session_id': session_id,  # Send back actual session ID
                'socket_session_id': request.sid,
                'chat_created': provided_chat_id is None  # Flag if we just created the chat
            })
            
            # Process message directly (NO THREADING)
            process_chat_message(user_input, user_id, chat.id, session_id, request.sid)
            
        except Exception as e:
            print(f"Error in handle_send_message: {str(e)}")
            emit('error', {'message': 'Erreur traitement message', 'error': str(e)})

    @socketio.on('get_chat_state')
    @socketio_login_required
    def handle_get_chat_state(data):
        try:
            user_id = socket_user_sessions.get(request.sid)
            
            # CRITICAL FIX: Get session_id from user's database record
            try:
                db.session.rollback()  # Ensure clean session
                user = db.session.query(User).filter_by(id=user_id).first()
                if not user:
                    emit('error', {'message': 'Utilisateur introuvable'})
                    return
                session_id = user.session_id  # Use user's current session from DB
            except Exception as e:
                print(f"Error getting user session for chat state: {e}")
                emit('error', {'message': 'Erreur accès session utilisateur'})
                return
            
            print(f"Getting chat state for user {user_id} in session {session_id}")
            chat_state = ChatManager.get_chat_state(user_id, session_id)
            chat_state['session_id'] = session_id  # Ensure session_id is included
            emit('chat_state_response', chat_state)
            
        except Exception as e:
            print(f"Error in handle_get_chat_state: {str(e)}")
            emit('error', {'message': 'Erreur état chat', 'error': str(e)})

    @socketio.on('session_change')
    @socketio_login_required
    def handle_session_change(data):
        """Handle session change request via SocketIO"""
        try:
            new_session_id = data.get('session_id')
            user_id = socket_user_sessions.get(request.sid)
            
            if not new_session_id or new_session_id not in [1, 2, 3]:
                emit('session_change_error', {'error': 'Invalid session ID'})
                return
            
            print(f"User {user_id} requesting session change to {new_session_id}")
            
            # CRITICAL FIX: Update user's session_id in database FIRST
            try:
                db.session.rollback()
                db.session.close()
                
                # Lock and update user session
                user = db.session.query(User).filter_by(id=user_id).with_for_update().first()
                if not user:
                    emit('session_change_error', {'error': 'User not found'})
                    return
                
                old_session_id = user.session_id
                user.session_id = new_session_id
                
                # End all ongoing chats for the user (all sessions)
                db.session.query(Chat).filter_by(
                    user_id=user_id,
                    status="ongoing"
                ).update({"status": "terminated_by_session_change"})
                
                db.session.commit()
                print(f"Updated user {user_id} session from {old_session_id} to {new_session_id}")
                
            except Exception as e:
                db.session.rollback()
                print(f"Error updating user session: {e}")
                emit('session_change_error', {'error': f'Failed to update user session: {str(e)}'})
                return
            
            # Notify client that ongoing chats are being terminated
            emit('ongoing_chats_terminated', {
                'message': 'Conversations en cours terminées pour changement de session',
                'old_session_id': old_session_id,
                'new_session_id': new_session_id
            })
            
            # Give a small delay to ensure frontend processes the termination
            time.sleep(0.1)
            
            # Create new chat for the new session (user's session_id is now updated)
            new_chat, error = ChatManager.get_or_create_ongoing_chat(user_id, new_session_id)
            if error:
                emit('session_change_error', {'error': f'Failed to create new chat: {error}'})
                return
            
            # Emit success
            emit('session_change_success', {
                'session_id': new_session_id,
                'chat_id': new_chat.id if new_chat else None,
                'message': f'Session changée vers {new_session_id}'
            })
            
        except Exception as e:
            print(f"Error in handle_session_change: {str(e)}")
            emit('session_change_error', {'error': str(e)})

    # Handle stop current processing
    @socketio.on('stop_processing')
    @socketio_login_required  
    def handle_stop_processing(data):
        """Stop any ongoing processing for user"""
        try:
            user_id = socket_user_sessions.get(request.sid)
            chat_id = data.get('chat_id')
            
            print(f"User {user_id} requesting to stop processing for chat {chat_id}")
            
            # Emit stop signal - the frontend can handle this
            emit('processing_stopped', {
                'message': 'Traitement interrompu',
                'chat_id': chat_id
            })
            
        except Exception as e:
            print(f"Error in handle_stop_processing: {str(e)}")
            emit('error', {'message': 'Erreur arrêt traitement', 'error': str(e)})

# Health check
@bp.route('/health')
def health_check():
    return {'status': 'SocketIO BNF Chat Service Ready'}