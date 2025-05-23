# socket_handlers.py
from flask_socketio import emit, join_room, leave_room
from services.chat_manager import ChatManager
from services.workflow_processor import WorkflowProcessor
from database import get_db
from auth import get_user_from_token
import logging

logger = logging.getLogger(__name__)

def register_chat_handlers(socketio):
    """Register all simplified chat SocketIO handlers"""
    
    @socketio.on('connect')
    def handle_connect(auth):
        """Handle client connection"""
        try:
            user = get_user_from_token(auth.get('token'))
            if not user:
                return False
            
            # Join user room for personal events
            join_room(f"user_{user['id']}")
            logger.info(f"User {user['id']} connected")
            
        except Exception as e:
            logger.error(f"Connection error: {e}")
            return False
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        logger.info("Client disconnected")
    
    @socketio.on('send_message')
    def handle_send_message(data):
        """
        Send message - creates chat lazily if needed.
        Core workflow entry point.
        """
        try:
            user = get_user_from_token(request.headers.get('Authorization'))
            if not user:
                emit('error', {'message': 'Unauthorized'})
                return
            
            db = next(get_db())
            chat_manager = ChatManager(db)
            
            user_id = user['id']
            session_id = user['session_id']  # From user table
            message_content = data['content']
            provided_chat_id = data.get('chat_id')
            
            # Check if ongoing chat exists
            ongoing_chat = chat_manager.get_ongoing_chat(user_id, session_id)
            
            if ongoing_chat:
                # Add to existing chat
                chat_id = ongoing_chat.id
                message = chat_manager.add_message_to_chat(
                    chat_id, 'user', message_content
                )
            else:
                # LAZY CREATION: Create new chat with first message
                chat = chat_manager.create_chat_with_first_message(
                    user_id, session_id, message_content
                )
                chat_id = chat.id
                # Get the created message
                chat_data = chat_manager.get_chat_with_messages(chat_id)
                message = chat_data['messages'][-1]  # Last message is the user message
            
            # Emit message received
            emit('message_received', {
                'message': {
                    'id': message['id'] if isinstance(message, dict) else message.id,
                    'role': 'user',
                    'content': message_content,
                    'timestamp': message['timestamp'] if isinstance(message, dict) else message.created_at.isoformat()
                },
                'chat_id': chat_id
            })
            
            # Process with workflow (streaming response)
            workflow_processor = WorkflowProcessor(db, socketio)
            workflow_processor.process_message(chat_id, message_content)
            
        except Exception as e:
            logger.error(f"Error in send_message: {e}")
            emit('error', {'message': 'Failed to send message'})
    
    @socketio.on('get_chat_state')
    def handle_get_chat_state():
        """
        Get current chat state for user/session.
        Returns chat with messages or null if no ongoing chat.
        """
        try:
            user = get_user_from_token(request.headers.get('Authorization'))
            if not user:
                emit('error', {'message': 'Unauthorized'})
                return
            
            db = next(get_db())
            chat_manager = ChatManager(db)
            
            # Get ongoing chat
            ongoing_chat = chat_manager.get_ongoing_chat(
                user['id'], user['session_id']
            )
            
            if ongoing_chat:
                chat_data = chat_manager.get_chat_with_messages(ongoing_chat.id)
                emit('chat_state_response', {'chat': chat_data})
            else:
                emit('chat_state_response', {'chat': None})
                
        except Exception as e:
            logger.error(f"Error in get_chat_state: {e}")
            emit('error', {'message': 'Failed to get chat state'})
    
    @socketio.on('session_change')
    def handle_session_change(data):
        """
        Change user session - terminates ongoing chats.
        Updates user.session_id and clears frontend.
        """
        try:
            user = get_user_from_token(request.headers.get('Authorization'))
            if not user:
                emit('error', {'message': 'Unauthorized'})
                return
            
            db = next(get_db())
            chat_manager = ChatManager(db)
            
            new_session_id = data['session_id']
            user_id = user['id']
            
            # Terminate ongoing chats for old session
            terminated_count = chat_manager.terminate_ongoing_chats(
                user_id, user['session_id']
            )
            
            # Update user session_id in database
            from models import User
            db_user = db.query(User).filter(User.id == user_id).first()
            if db_user:
                db_user.session_id = new_session_id
                db_user.updated_at = datetime.utcnow()
                db.commit()
            
            # Notify success
            emit('session_change_success', {
                'session_id': new_session_id,
                'terminated_chats': terminated_count
            })
            
            if terminated_count > 0:
                emit('ongoing_chats_terminated', {
                    'count': terminated_count
                })
            
        except Exception as e:
            logger.error(f"Error in session_change: {e}")
            emit('error', {'message': 'Failed to change session'})
    
    @socketio.on('update_topic')
    def handle_update_topic(data):
        """
        Update user topic - terminates ongoing chats.
        Updates user topic fields and clears frontend.
        """
        try:
            user = get_user_from_token(request.headers.get('Authorization'))
            if not user:
                emit('error', {'message': 'Unauthorized'})
                return
            
            db = next(get_db())
            chat_manager = ChatManager(db)
            
            user_id = user['id']
            exercise_topic_id = data.get('exercise_topic_id')
            test_topic_id = data.get('test_topic_id')
            
            # Update topic and terminate chats
            success = chat_manager.update_user_topic(
                user_id, exercise_topic_id, test_topic_id
            )
            
            if success:
                emit('topic_update_success', {
                    'exercise_topic_id': exercise_topic_id,
                    'test_topic_id': test_topic_id
                })
                
                emit('ongoing_chats_terminated', {
                    'reason': 'topic_change'
                })
            else:
                emit('error', {'message': 'Failed to update topic'})
                
        except Exception as e:
            logger.error(f"Error in update_topic: {e}")
            emit('error', {'message': 'Failed to update topic'})

class WorkflowProcessor:
    """
    Handles workflow processing with streaming responses.
    Detects end commands and terminates chats accordingly.
    """
    
    def __init__(self, db, socketio):
        self.db = db
        self.socketio = socketio
        self.chat_manager = ChatManager(db)
    
    def process_message(self, chat_id: str, message_content: str):
        """
        Process message through workflow and stream response.
        Handles chat termination for end commands.
        """
        try:
            # Emit stream start
            self.socketio.emit('stream_start', {'chat_id': chat_id})
            
            # Detect end commands
            end_commands = ['abandon', 'recommencer', 'resultat']
            is_end_command = any(cmd in message_content.lower() for cmd in end_commands)
            
            # Process with your workflow logic here
            # This is where you'd integrate with your BNF workflow processor
            response_content = self._generate_response(message_content)
            
            # Stream response in chunks
            chunk_size = 50
            for i in range(0, len(response_content), chunk_size):
                chunk = response_content[i:i + chunk_size]
                self.socketio.emit('stream_chunk', {
                    'content': chunk,
                    'chat_id': chat_id
                })
                # Add small delay for realistic streaming
                import time
                time.sleep(0.1)
            
            # Add assistant message to chat
            message = self.chat_manager.add_message_to_chat(
                chat_id, 'assistant', response_content
            )
            
            # Handle chat end
            chat_ended = False
            if is_end_command:
                self.chat_manager.end_chat(chat_id, 'completed')
                chat_ended = True
            
            # Emit stream end
            self.socketio.emit('stream_end', {
                'chat_id': chat_id,
                'message_id': message.id,
                'chat_ended': chat_ended
            })
            
        except Exception as e:
            logger.error(f"Error processing workflow: {e}")
            self.socketio.emit('error', {
                'message': 'Failed to process message',
                'chat_id': chat_id
            })
    
    def _generate_response(self, message_content: str) -> str:
        """
        Generate response based on message content.
        Replace with your actual BNF workflow logic.
        """
        # Placeholder - implement your BNF workflow here
        if 'abandon' in message_content.lower():
            return "Session abandonnée. Vous pouvez commencer une nouvelle conversation."
        elif 'recommencer' in message_content.lower():
            return "Session redémarrée. Nous recommençons depuis le début."
        elif 'resultat' in message_content.lower():
            return "Voici vos résultats. Session terminée."
        else:
            return f"Réponse BNF pour: {message_content}"