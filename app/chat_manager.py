# app/chat_manager.py
from .db import db
from .models import Chat, User
from .utils.constant import get_topic_name
import datetime

class ChatManager:
    @staticmethod
    def get_ongoing_chat(user_id):
        """Get ongoing chat for user in current session"""
        try:
            chat = Chat.query.filter_by(
                user_id=user_id,
                status="ongoing"
            ).first()
            return chat, None
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def create_chat_with_first_message(user_id, mode, message):
        """Create new chat with first user message"""
        try:
            # Get user's current topic
            user = User.query.get(user_id)
            if not user:
                return None, "User not found"
            
            # Create new chat
            chat = Chat(
                user_id=user_id,
                mode=mode,
                status="ongoing"
            )
            
            # Add first message
            chat.add_message('user', message)
            
            db.session.add(chat)
            db.session.commit()
            
            return chat, None
            
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def add_message_to_chat(chat_id, role, content):
        """Add message to existing chat"""
        try:
            chat = Chat.query.get(chat_id)
            if not chat:
                return False, "Chat not found"
            
            # Debug logging
            print(f"[ChatManager] Before adding {role} message: {len(chat.chat_history)} messages in chat {chat_id}")
            
            chat.add_message(role, content)
            db.session.commit()
            
            # Verify the save
            db.session.refresh(chat)
            print(f"[ChatManager] After adding: {len(chat.chat_history)} messages")
            if chat.chat_history:
                print(f"[ChatManager] Last message: {chat.chat_history[-1]['role']}: {chat.chat_history[-1]['content'][:50]}...")
            
            return True, None
            
        except Exception as e:
            db.session.rollback()
            print(f"[ChatManager] Error adding message: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def save_search_result(chat_id, result={}, user_intent='', generated_sru=''):
        """Save (facet, SRU) results to the existing chat"""
        try:
            chat = Chat.query.get(chat_id)
            if not chat:
                return False, "Chat not found"
            
            chat.add_result(result, user_intent, generated_sru)
            db.session.commit()
            
            return True, None
            
        except Exception as e:
            db.session.rollback()
            print(f"[ChatManager] Error saving conversation result: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def end_chat(chat_id, status, user_id):
        """End ongoing chat"""
        try:
            chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
            if not chat:
                return False, "Chat not found"
            
            chat.status = status
            chat.updated_at = datetime.datetime.now()
            db.session.commit()
            
            return True, None
            
        except Exception as e:
            db.session.rollback()
            return False, str(e)
    
    @staticmethod
    def get_chat_state(user_id):
        """Get current chat state for frontend"""
        try:
            chat, error = ChatManager.get_ongoing_chat(user_id)
            
            if error:
                return {'error': error}
            
            if chat:
                # Convert chat history to frontend format
                messages = []
                for msg in (chat.chat_history or []):
                    messages.append({
                        'id': f"{msg['role']}_{len(messages)}",
                        'role': msg['role'],
                        'content': msg['content'],
                        'timestamp': msg['timestamp']
                    })
                
                return {
                    'chat': {
                        'id': chat.id,
                        'messages': messages,
                        'status': chat.status,
                        'userIntent': chat.user_intent
                    },
                }
            else:
                return {
                    'chat': None,
                }
                
        except Exception as e:
            return {'error': str(e)}