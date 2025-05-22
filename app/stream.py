import time
import json
import random
import threading
import traceback
import uuid
from datetime import datetime
from typing import TypedDict, Annotated
from flask import Blueprint, request, session
from flask_socketio import emit, disconnect, join_room, leave_room
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

from .db import db
from .models import User, Chat, add_message_to_chat, get_chat_by_id, create_chat, end_ongoing_chats
from .auth import login_required

bp = Blueprint('stream', __name__)

# Global SocketIO instance - will be set by init_socketio
socketio = None

def init_socketio(socketio_instance):
    """Initialize the SocketIO instance"""
    global socketio
    socketio = socketio_instance
    
    # Register all SocketIO event handlers
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

def create_chat_graph(user_id, chat_id, session_id, socketio_session_id):
    """Create a LangGraph workflow for chat processing"""
    
    def input_processor(state: ChatState) -> ChatState:
        """Process the initial user input"""
        socketio.emit('workflow_progress', {
            'step': 'input_processing',
            'status': 'Analyse de votre question...',
            'session_id': socketio_session_id
        })
        time.sleep(1)  # Simulate processing
        
        processed_input = f"Analysé: {state['user_input']}"
        socketio.emit('workflow_progress', {
            'step': 'input_processing',
            'status': 'Question analysée avec succès',
            'result': processed_input,
            'session_id': socketio_session_id
        })
        
        return {
            **state,
            'current_step': 'input_processing',
            'messages': [f"Input traité: {processed_input}"]
        }
    
    def intent_analyzer(state: ChatState) -> ChatState:
        """Analyze user intent"""
        socketio.emit('workflow_progress', {
            'step': 'intent_analysis',
            'status': 'Analyse de l\'intention...',
            'session_id': socketio_session_id
        })
        time.sleep(1.5)
        
        # Mock intent analysis
        intents = ['recherche_document', 'information_generale', 'aide_navigation', 'question_technique']
        detected_intent = random.choice(intents)
        
        intent_result = f"Intention détectée: {detected_intent}"
        
        socketio.emit('workflow_progress', {
            'step': 'intent_analysis',
            'status': 'Intention analysée',
            'result': intent_result,
            'session_id': socketio_session_id
        })
        
        return {
            **state,
            'intent_analysis': intent_result,
            'current_step': 'intent_analysis'
        }
    
    def search_processor(state: ChatState) -> ChatState:
        """Process search if needed"""
        socketio.emit('workflow_progress', {
            'step': 'search_processing',
            'status': 'Recherche dans les collections BNF...',
            'session_id': socketio_session_id
        })
        time.sleep(2)
        
        # Mock search results
        search_results = {
            'query': state['user_input'],
            'results_count': random.randint(5, 50),
            'collections': ['Manuscrits', 'Livres imprimés', 'Cartes et plans']
        }
        
        socketio.emit('workflow_progress', {
            'step': 'search_processing',
            'status': f"Trouvé {search_results['results_count']} résultats",
            'result': f"Recherche terminée: {search_results['results_count']} documents trouvés",
            'session_id': socketio_session_id
        })
        
        return {
            **state,
            'search_results': search_results,
            'current_step': 'search_processing'
        }
    
    def response_generator(state: ChatState) -> ChatState:
        """Generate the final response"""
        socketio.emit('workflow_progress', {
            'step': 'response_generation',
            'status': 'Génération de la réponse...',
            'session_id': socketio_session_id
        })
        time.sleep(1)
        
        # Generate a contextual response based on the workflow
        if state.get('search_results'):
            final_response = f"Voici ce que j'ai trouvé concernant '{state['user_input']}'. "
            final_response += f"J'ai identifié {state['search_results']['results_count']} documents pertinents dans nos collections. "
            final_response += f"Les collections principales sont: {', '.join(state['search_results']['collections'])}. "
            final_response += "Souhaitez-vous que je vous aide à affiner votre recherche ou que je vous montre des résultats spécifiques?"
        else:
            final_response = f"Merci pour votre question: '{state['user_input']}'. "
            final_response += "Je suis votre assistant de recherche BNF et je peux vous aider à naviguer dans nos collections. "
            final_response += "Pouvez-vous me donner plus de détails sur ce que vous recherchez?"
        
        socketio.emit('workflow_progress', {
            'step': 'response_generation',
            'status': 'Réponse générée avec succès',
            'result': final_response,
            'session_id': socketio_session_id
        })
        
        return {
            **state,
            'final_response': final_response,
            'current_step': 'response_generation'
        }
    
    # Build the graph
    workflow = StateGraph(ChatState)
    
    # Add nodes
    workflow.add_node("input_processor", input_processor)
    workflow.add_node("intent_analyzer", intent_analyzer)
    workflow.add_node("search_processor", search_processor)
    workflow.add_node("response_generator", response_generator)
    
    # Add edges
    workflow.set_entry_point("input_processor")
    workflow.add_edge("input_processor", "intent_analyzer")
    workflow.add_edge("intent_analyzer", "search_processor")
    workflow.add_edge("search_processor", "response_generator")
    workflow.add_edge("response_generator", END)
    
    return workflow.compile()

def stream_chat_response(user_input, user_id, chat_id, session_id, socketio_session_id):
    """Stream chat response using GraphChain workflow"""
    try:
        # Send start signal
        message_id = str(uuid.uuid4())
        socketio.emit('stream_start', {
            'message_id': message_id,
            'session_id': socketio_session_id,
            'workflow': 'bnf_chat_workflow'
        })
        
        # Save user message to database
        if chat_id:
            add_message_to_chat(chat_id, 'user', user_input)
        
        # Create and run the graph
        graph = create_chat_graph(user_id, chat_id, session_id, socketio_session_id)
        
        # Initial state
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
            "search_results": {}
        }
        
        # Execute the workflow
        result = graph.invoke(initial_state)
        
        # Stream the final response word by word
        socketio.emit('workflow_progress', {
            'step': 'streaming_response',
            'status': 'Diffusion de la réponse...',
            'session_id': socketio_session_id
        })
        
        final_response = result.get('final_response', 'Aucune réponse générée')
        words = final_response.split()
        
        for i, word in enumerate(words):
            socketio.emit('stream_chunk', {
                'content': word + " ",
                'session_id': socketio_session_id,
                'progress': f"{i+1}/{len(words)}"
            })
            time.sleep(0.05)  # Slightly faster streaming
        
        # Save assistant response to database
        if chat_id:
            add_message_to_chat(chat_id, 'assistant', final_response)
        
        # Send completion signal
        socketio.emit('stream_end', {
            'session_id': socketio_session_id,
            'message_id': message_id,
            'final_response': final_response,
            'workflow_completed': True
        })
        
    except Exception as e:
        print(f"Error in stream_chat_response: {str(e)}")
        traceback.print_exc()
        socketio.emit('stream_error', {
            'error': str(e),
            'session_id': socketio_session_id,
            'error_type': 'workflow_error'
        })

def register_socketio_events():
    """Register all SocketIO event handlers"""
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection"""
        print(f'Client connected: {request.sid}')
        
        # Join user to their own room for targeted messaging
        user_id = session.get('user_id')
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
        
        user_id = session.get('user_id')
        if user_id:
            leave_room(f"user_{user_id}")

    @socketio.on('send_message')
    def handle_send_message(data):
        """Handle user message"""
        try:
            user_input = data.get('message', '').strip()
            user_id = session.get('user_id')
            chat_id = data.get('chat_id')
            session_id = data.get('session_id', 1)
            
            if not user_input:
                emit('error', {'message': 'Message vide reçu'})
                return
            
            if not user_id or user_id == 123:
                emit('error', {'message': 'Utilisateur non authentifié'})
                return
                
            print(f'Received message from user {user_id}: {user_input}')
            
            # Get or create chat
            if not chat_id:
                user = User.query.get(user_id)
                if user:
                    # End any ongoing chats for this session
                    end_ongoing_chats(user_id, "terminated_by_new_chat", session_id)
                    # Create new chat
                    chat = create_chat(user_id, first_message=user_input, session_id=session_id)
                    chat_id = chat.id if chat else None
            
            # Acknowledge receipt
            emit('message_received', {
                'message': user_input,
                'session_id': request.sid,
                'chat_id': chat_id
            })
            
            # Start chat workflow in a separate thread
            thread = threading.Thread(
                target=stream_chat_response,
                args=(user_input, user_id, chat_id, session_id, request.sid)
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
    def handle_abandon_conversation(data):
        """Handle conversation abandonment"""
        try:
            user_id = session.get('user_id')
            chat_id = data.get('chat_id')
            
            if not user_id or user_id == 123:
                emit('error', {'message': 'Utilisateur non authentifié'})
                return
            
            print(f'User {user_id} abandoning conversation {chat_id}')
            
            # Mark chat as abandoned if chat_id provided
            if chat_id:
                chat = get_chat_by_id(chat_id, user_id)
                if chat:
                    chat.status = "abandoned"
                    db.session.commit()
            
            # Create a new chat for the session
            user = User.query.get(user_id)
            if user:
                new_chat = create_chat(user_id, session_id=user.session_id)
                
                emit('conversation_abandoned', {
                    'success': True,
                    'new_chat_id': new_chat.id if new_chat else None,
                    'message': 'Conversation abandonnée. Nouvelle conversation créée.'
                })
            else:
                emit('error', {'message': 'Utilisateur non trouvé'})
                
        except Exception as e:
            print(f"Error in handle_abandon_conversation: {str(e)}")
            emit('error', {
                'message': 'Erreur lors de l\'abandon de la conversation',
                'error': str(e)
            })

    @socketio.on('recommencer')
    def handle_restart_conversation(data):
        """Handle conversation restart"""
        try:
            user_id = session.get('user_id')
            session_id = data.get('session_id', 1)
            
            if not user_id or user_id == 123:
                emit('error', {'message': 'Utilisateur non authentifié'})
                return
            
            print(f'User {user_id} restarting conversation for session {session_id}')
            
            # End all ongoing chats for this session
            end_ongoing_chats(user_id, "restarted", session_id)
            
            # Create a new chat
            new_chat = create_chat(user_id, session_id=session_id)
            
            emit('conversation_restarted', {
                'success': True,
                'new_chat_id': new_chat.id if new_chat else None,
                'session_id': session_id,
                'message': 'Conversation redémarrée avec succès.'
            })
            
        except Exception as e:
            print(f"Error in handle_restart_conversation: {str(e)}")
            emit('error', {
                'message': 'Erreur lors du redémarrage de la conversation',
                'error': str(e)
            })

    @socketio.on('erreur')
    def handle_error_event(data):
        """Handle error events from client"""
        try:
            user_id = session.get('user_id')
            error_type = data.get('error_type', 'unknown')
            error_message = data.get('error_message', 'Erreur inconnue')
            chat_id = data.get('chat_id')
            
            print(f'Error reported by user {user_id}: {error_type} - {error_message}')
            
            # Log error to database or monitoring system here
            # For now, just acknowledge the error
            
            emit('error_acknowledged', {
                'success': True,
                'error_type': error_type,
                'message': 'Erreur signalée et enregistrée.'
            })
            
            # Optionally restart the conversation on critical errors
            if error_type in ['critical', 'workflow_failure']:
                # Trigger a conversation restart
                handle_restart_conversation({'session_id': data.get('session_id', 1)})
            
        except Exception as e:
            print(f"Error in handle_error_event: {str(e)}")
            emit('error', {
                'message': 'Erreur lors du traitement de l\'erreur',
                'error': str(e)
            })

    @socketio.on('resultat')
    def handle_result_request(data):
        """Handle result/evaluation window request"""
        try:
            user_id = session.get('user_id')
            chat_id = data.get('chat_id')
            query_data = data.get('query_data', {})
            
            if not user_id or user_id == 123:
                emit('error', {'message': 'Utilisateur non authentifié'})
                return
            
            print(f'User {user_id} requesting results for chat {chat_id}')
            
            # Mock result data - replace with actual search/retrieval logic
            mock_results = {
                'id': str(uuid.uuid4()),
                'query': query_data.get('query', ''),
                'results': [
                    {
                        'title': 'Document BNF 1',
                        'author': 'Auteur Example',
                        'date': '2023',
                        'collection': 'Manuscrits',
                        'cote': 'MS-12345'
                    },
                    {
                        'title': 'Document BNF 2', 
                        'author': 'Autre Auteur',
                        'date': '2022',
                        'collection': 'Livres imprimés',
                        'cote': 'LI-67890'
                    }
                ],
                'total_count': 25,
                'search_time': 0.45
            }
            
            emit('result_data', {
                'success': True,
                'results': mock_results,
                'chat_id': chat_id,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"Error in handle_result_request: {str(e)}")
            emit('error', {
                'message': 'Erreur lors de la récupération des résultats',
                'error': str(e)
            })

    @socketio.on('join_session')
    def handle_join_session(data):
        """Handle user joining a specific session room"""
        user_id = session.get('user_id')
        session_id = data.get('session_id')
        
        if user_id and session_id:
            room_name = f"session_{session_id}_{user_id}"
            join_room(room_name)
            emit('session_joined', {
                'session_id': session_id,
                'room': room_name
            })

    @socketio.on('leave_session')
    def handle_leave_session(data):
        """Handle user leaving a session room"""
        user_id = session.get('user_id')
        session_id = data.get('session_id')
        
        if user_id and session_id:
            room_name = f"session_{session_id}_{user_id}"
            leave_room(room_name)
            emit('session_left', {
                'session_id': session_id,
                'room': room_name
            })

# Health check endpoint
@bp.route('/health')
def health_check():
    return {'status': 'SocketIO stream service healthy'}