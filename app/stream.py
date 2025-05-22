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
from .models import User, Chat, add_message_to_chat, get_chat_by_id, create_chat, end_ongoing_chats
from .auth import login_required

from functools import wraps

# Store user sessions for SocketIO
socket_user_sessions = {}

def socketio_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get user_id from our socket session store
        user_id = socket_user_sessions.get(request.sid)
        
        if not user_id:
            emit('error', {'message': 'Utilisateur non authentifié'})
            return
            
        return f(*args, **kwargs)
    return decorated_function

bp = Blueprint('stream', __name__)

# Global SocketIO instance
socketio = None

def init_socketio(socketio_instance):
    """Initialize the SocketIO instance"""
    global socketio
    socketio = socketio_instance
    register_socketio_events()

# Define the state structure for GraphChain
class ChatState(TypedDict):
    messages: Annotated[list, add_messages]
    user_input: str
    user_id: int
    chat_id: int
    session_id: int
    analysis_result: str
    reasoning_output: str
    final_response: str
    current_step: str
    intent_analysis: str
    search_results: dict
    topic: str

def create_chat_graph(user_id, chat_id, session_id, socketio_session_id):
    """Create a LangGraph workflow for chat processing"""
    
    def input_processor(state: ChatState) -> ChatState:
        """Process the initial user input"""
        socketio.emit('workflow_progress', {
            'step': 'input_processing',
            'status': 'Analyse de votre question...',
            'session_id': socketio_session_id
        }, to=socketio_session_id)  # ✅ Target specific session
        time.sleep(1)
        
        return {
            **state,
            'current_step': 'input_processing',
            'messages': [f"Input traité: {state['user_input']}"]
        }
    
    def intent_analyzer(state: ChatState) -> ChatState:
        """Analyze user intent"""
        socketio.emit('workflow_progress', {
            'step': 'intent_analysis',
            'status': 'Analyse de l\'intention...',
            'session_id': socketio_session_id
        }, to=socketio_session_id)  # ✅ Target specific session
        time.sleep(1.5)
        
        # Mock intent analysis based on keywords
        intents = ['recherche_document', 'information_generale', 'aide_navigation', 'question_technique']
        detected_intent = random.choice(intents)
        
        intent_result = f"Intention détectée: {detected_intent}"
        
        socketio.emit('workflow_progress', {
            'step': 'intent_analysis',
            'status': 'Intention analysée',
            'result': intent_result,
            'session_id': socketio_session_id
        }, to=socketio_session_id)  # ✅ Target specific session
        
        return {
            **state,
            'intent_analysis': intent_result,
            'current_step': 'intent_analysis'
        }
    
    def search_processor(state: ChatState) -> ChatState:
        """Process search in BNF collections"""
        socketio.emit('workflow_progress', {
            'step': 'search_processing',
            'status': 'Recherche dans les collections BNF...',
            'session_id': socketio_session_id
        }, to=socketio_session_id)  # ✅ Target specific session
        time.sleep(2)
        
        # Extract topic from user input (simple keyword matching)
        user_input_lower = state['user_input'].lower()
        detected_topic = None
        
        # Simple topic detection
        topic_keywords = {
            'voltaire': 'Voltaire',
            'napoleon': 'Napoléon III',
            'watteau': 'Watteau',
            'foucault': 'Michel Foucault',
            'mozart': 'Mozart',
            'chopin': 'Frédéric Chopin',
            'hugo': 'Victor Hugo',
            'rembrandt': 'Rembrandt',
            'duras': 'Marguerite Duras'
        }
        
        for keyword, topic in topic_keywords.items():
            if keyword in user_input_lower:
                detected_topic = topic
                break
        
        # Mock search results
        search_results = {
            'query': state['user_input'],
            'results_count': random.randint(5, 50),
            'collections': ['Manuscrits', 'Livres imprimés', 'Cartes et plans'],
            'topic': detected_topic
        }
        
        # Update chat topic in database using ChatManager if detected
        if detected_topic and state['chat_id']:
            try:
                # Use direct SQL update since ChatManager doesn't have topic update method
                with db.session.begin():
                    chat = db.session.query(Chat).filter_by(id=state['chat_id']).with_for_update().first()
                    if chat:
                        chat.topic = detected_topic
                        chat.updated_at = datetime.utcnow()
                        db.session.commit()
            except Exception as e:
                print(f"Error updating chat topic: {e}")
        
        socketio.emit('workflow_progress', {
            'step': 'search_processing',
            'status': f"Trouvé {search_results['results_count']} résultats",
            'result': f"Recherche terminée: {search_results['results_count']} documents trouvés",
            'topic': detected_topic,
            'session_id': socketio_session_id
        }, to=socketio_session_id)  # ✅ Target specific session
        
        return {
            **state,
            'search_results': search_results,
            'topic': detected_topic or '',
            'current_step': 'search_processing'
        }
    
    def response_generator(state: ChatState) -> ChatState:
        """Generate the final response"""
        socketio.emit('workflow_progress', {
            'step': 'response_generation',
            'status': 'Génération de la réponse...',
            'session_id': socketio_session_id
        }, to=socketio_session_id)  # ✅ Target specific session
        time.sleep(1)
        
        # Generate contextual response
        if state.get('search_results'):
            topic_text = f" sur {state['topic']}" if state.get('topic') else ""
            final_response = f"Voici ce que j'ai trouvé{topic_text} concernant '{state['user_input']}'. "
            final_response += f"J'ai identifié {state['search_results']['results_count']} documents pertinents dans nos collections. "
            final_response += f"Les collections principales sont: {', '.join(state['search_results']['collections'])}. "
            final_response += "Souhaitez-vous que je vous aide à affiner votre recherche?"
        else:
            final_response = f"Merci pour votre question: '{state['user_input']}'. "
            final_response += "Je suis votre assistant de recherche BNF et je peux vous aider à naviguer dans nos collections. "
            final_response += "Pouvez-vous me donner plus de détails sur ce que vous recherchez?"
        
        return {
            **state,
            'final_response': final_response,
            'current_step': 'response_generation'
        }
    
    # Build the graph (unchanged)
    workflow = StateGraph(ChatState)
    workflow.add_node("input_processor", input_processor)
    workflow.add_node("intent_analyzer", intent_analyzer)
    workflow.add_node("search_processor", search_processor)
    workflow.add_node("response_generator", response_generator)
    
    workflow.set_entry_point("input_processor")
    workflow.add_edge("input_processor", "intent_analyzer")
    workflow.add_edge("intent_analyzer", "search_processor")
    workflow.add_edge("search_processor", "response_generator")
    workflow.add_edge("response_generator", END)
    
    return workflow.compile()

# In paste-4.txt - Replace the stream_chat_response function

def stream_chat_response(user_input, user_id, chat_id, session_id, socketio_session_id, app):
    """Stream chat response using GraphChain workflow"""
    
    # Wrap everything in app context for database access in thread
    with app.app_context():
        try:
            message_id = str(uuid.uuid4())
            
            # Emit only to the specific user session
            socketio.emit('stream_start', {
                'message_id': message_id,
                'session_id': socketio_session_id,
                'workflow': 'bnf_chat_workflow'
            }, to=socketio_session_id)  # ✅ Target specific session
            
            # Save user message using ChatManager (atomic operation)
            if chat_id:
                success, error = ChatManager.add_message_to_chat(chat_id, 'user', user_input)
                if not success:
                    raise Exception(f"Failed to save user message: {error}")
            
            # Create and run the graph
            graph = create_chat_graph(user_id, chat_id, session_id, socketio_session_id)
            
            initial_state = {
                "messages": [],
                "user_input": user_input,
                "user_id": user_id,
                "chat_id": chat_id,
                "session_id": session_id,
                "analysis_result": "",
                "reasoning_output": "",
                "final_response": "",
                "current_step": "",
                "intent_analysis": "",
                "search_results": {},
                "topic": ""
            }
            
            # Execute the workflow
            result = graph.invoke(initial_state)
            
            # Stream the final response
            socketio.emit('workflow_progress', {
                'step': 'streaming_response',
                'status': 'Diffusion de la réponse...',
                'session_id': socketio_session_id
            }, to=socketio_session_id)
            
            final_response = result.get('final_response', 'Aucune réponse générée')
            words = final_response.split()
            
            for i, word in enumerate(words):
                socketio.emit('stream_chunk', {
                    'content': word + " ",
                    'session_id': socketio_session_id,
                    'progress': f"{i+1}/{len(words)}"
                }, to=socketio_session_id)  # ✅ Target specific session
                time.sleep(0.05)
            
            # Save assistant response using ChatManager (atomic operation)
            if chat_id:
                success, error = ChatManager.add_message_to_chat(chat_id, 'assistant', final_response)
                if not success:
                    raise Exception(f"Failed to save assistant message: {error}")
            
            # Send completion signal with topic and intent
            socketio.emit('stream_end', {
                'session_id': socketio_session_id,
                'message_id': message_id,
                'final_response': final_response,
                'detected_topic': result.get('topic', ''),
                'detected_intent': result.get('intent_analysis', ''),
                'workflow_completed': True
            }, to=socketio_session_id)  # ✅ Target specific session
            
        except Exception as e:
            print(f"Error in stream_chat_response: {str(e)}")
            traceback.print_exc()
            socketio.emit('stream_error', {
                'error': str(e),
                'session_id': socketio_session_id,
                'error_type': 'workflow_error'
            }, to=socketio_session_id)  # ✅ Target specific session




# In paste-4.txt - Replace the event handlers with these fixed versions

def register_socketio_events():
    """Register all SocketIO event handlers"""
    
    @socketio.on('connect')
    def handle_connect(auth):
        """Handle client connection"""
        print(f'Client connected: {request.sid}')
        print(f'Auth data: {auth}')
        
        user_id = None
        if auth and 'userId' in auth:
            user_id = auth['userId']
            socket_user_sessions[request.sid] = user_id
            print(f'User {user_id} authenticated via auth token')
        
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
        """Handle client disconnection"""
        print(f'Client disconnected: {request.sid}')
        
        user_id = socket_user_sessions.get(request.sid)
        if user_id:
            leave_room(f"user_{user_id}")
            del socket_user_sessions[request.sid]

    @socketio.on('send_message')
    @socketio_login_required
    def handle_send_message(data):
        """Handle user message with proper chat state management"""
        try:
            user_input = data.get('message', '').strip()
            session_id = data.get('session_id', 2)
            user_id = socket_user_sessions.get(request.sid)
            
            if not user_input:
                emit('error', {'message': 'Message vide reçu'})
                return
            
            print(f"Processing message from user {user_id}, session {session_id}: {user_input}")
            
            # Get or create ongoing chat atomically
            chat, error = ChatManager.get_or_create_ongoing_chat(
                user_id, session_id
            )
            
            if error:
                emit('error', {'message': f'Erreur chat: {error}'})
                return
            
            print(f"Using chat {chat.id} for user {user_id}, session {session_id}")
            
            # Emit chat state update to frontend
            emit('chat_state_updated', {
                'chat_id': chat.id,
                'session_id': session_id,
                'status': chat.status,
                'message_added': True
            })
            
            # Acknowledge receipt with current chat info
            emit('message_received', {
                'message': user_input,
                'session_id': request.sid,
                'chat_id': chat.id,
                'chat_status': chat.status
            })
            
            # Start workflow in separate thread
            thread = threading.Thread(
                target=stream_chat_response,
                args=(user_input, user_id, chat.id, session_id, request.sid, current_app._get_current_object())
            )
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            print(f"Error in handle_send_message: {str(e)}")
            traceback.print_exc()
            emit('error', {
                'message': 'Erreur lors du traitement du message',
                'error': str(e)
            })

    @socketio.on('abandon')
    @socketio_login_required
    def handle_abandon_conversation(data):
        """Handle conversation abandonment"""
        try:
            chat_id = data.get('chat_id')
            session_id = data.get('session_id', 2)
            user_id = socket_user_sessions.get(request.sid)
            
            if not chat_id:
                emit('error', {'message': 'Chat ID manquant'})
                return
            
            print(f"Abandoning chat {chat_id} for user {user_id}")
            
            # End current chat
            success, error = ChatManager.end_chat(chat_id, "abandoned", user_id)
            if not success:
                emit('error', {'message': f'Erreur abandon: {error}'})
                return
            
            # Create new chat for session
            new_chat, error = ChatManager.get_or_create_ongoing_chat(user_id, session_id)
            if error:
                emit('error', {'message': f'Erreur nouvelle conversation: {error}'})
                return
            
            print(f"Created new chat {new_chat.id} after abandonment")
            
            emit('conversation_abandoned', {
                'success': True,
                'old_chat_id': chat_id,
                'new_chat_id': new_chat.id,
                'session_id': session_id,
                'message': 'Conversation abandonnée. Nouvelle conversation créée.'
            })
            
        except Exception as e:
            print(f"Error in handle_abandon_conversation: {str(e)}")
            traceback.print_exc()
            emit('error', {'message': 'Erreur lors de l\'abandon', 'error': str(e)})

    @socketio.on('recommencer')
    @socketio_login_required
    def handle_restart_conversation(data):
        """Handle conversation restart"""
        try:
            session_id = data.get('session_id', 2)
            chat_id = data.get('chat_id')
            user_id = socket_user_sessions.get(request.sid)
            
            print(f"Restarting conversation for user {user_id}, session {session_id}")
            
            # End current chat if specified
            if chat_id:
                success, error = ChatManager.end_chat(chat_id, "restarted", user_id)
                if not success:
                    print(f"Warning: Could not end chat {chat_id}: {error}")
            
            # Create new chat
            new_chat, error = ChatManager.get_or_create_ongoing_chat(user_id, session_id)
            if error:
                emit('error', {'message': f'Erreur redémarrage: {error}'})
                return
            
            print(f"Created new chat {new_chat.id} after restart")
            
            emit('conversation_restarted', {
                'success': True,
                'old_chat_id': chat_id,
                'new_chat_id': new_chat.id,
                'session_id': session_id,
                'message': 'Conversation redémarrée avec succès.'
            })
            
        except Exception as e:
            print(f"Error in handle_restart_conversation: {str(e)}")
            traceback.print_exc()
            emit('error', {'message': 'Erreur redémarrage', 'error': str(e)})

    @socketio.on('resultat')
    @socketio_login_required
    def handle_result_request(data):
        """Handle result/evaluation window request"""
        try:
            chat_id = data.get('chat_id')
            user_id = socket_user_sessions.get(request.sid)
            
            if not chat_id:
                emit('error', {'message': 'Chat ID manquant pour résultats'})
                return
            
            print(f"Processing results request for chat {chat_id}")
            
            # End chat with completed status
            success, error = ChatManager.end_chat(chat_id, "completed", user_id)
            if not success:
                emit('error', {'message': f'Erreur finalisation: {error}'})
                return
            
            # Generate mock results
            mock_results = {
                'id': str(uuid.uuid4()),
                'chat_id': chat_id,
                'results': [
                    {'title': 'Document BNF 1', 'author': 'Auteur Example', 'cote': 'MS-12345'},
                    {'title': 'Document BNF 2', 'author': 'Autre Auteur', 'cote': 'LI-67890'}
                ],
                'total_count': 25
            }
            
            emit('result_data', {
                'success': True,
                'results': mock_results,
                'chat_id': chat_id,
                'chat_completed': True,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"Error in handle_result_request: {str(e)}")
            traceback.print_exc()
            emit('error', {'message': 'Erreur résultats', 'error': str(e)})

    @socketio.on('get_chat_state')
    @socketio_login_required
    def handle_get_chat_state(data):
        """Get current chat state for session"""
        try:
            session_id = data.get('session_id', 2)
            user_id = socket_user_sessions.get(request.sid)
            
            print(f"[CHAT_STATE] Getting chat state for user {user_id}, session {session_id}")
            
            chat_state = ChatManager.get_chat_state(user_id, session_id)
            
            # Add more detailed logging
            message_count = len(chat_state.get('messages', []))
            chat_id = chat_state.get('chat_id')
            print(f"[CHAT_STATE] Found chat {chat_id} with {message_count} messages for user {user_id}, session {session_id}")
            
            emit('chat_state_response', chat_state)
            
        except Exception as e:
            print(f"[CHAT_STATE] Error in handle_get_chat_state: {str(e)}")
            traceback.print_exc()
            emit('error', {'message': 'Erreur état chat', 'error': str(e)})
# Health check endpoint
@bp.route('/health')
def health_check():
    return {'status': 'SocketIO stream service healthy'}