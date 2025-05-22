# app/chat_manager.py - Updated with proper session handling

from sqlalchemy import text
from datetime import datetime
from .db import db
from .models import Chat, User
import logging

logger = logging.getLogger(__name__)

class ChatManager:
    """Centralized chat management with atomic operations"""
    
    @staticmethod
    def get_or_create_ongoing_chat(user_id, session_id, first_message=None):
        """
        Atomic operation: Get existing ongoing chat or create new one
        CRITICAL: Uses session_id from user's database record, not passed parameter
        """
        try:
            # Close any existing transaction and start fresh
            db.session.rollback()
            
            # Lock user row and verify session_id matches
            user = db.session.query(User).filter_by(id=user_id).with_for_update().first()
            if not user:
                db.session.rollback()
                return None, "User not found"
            
            # CRITICAL: Use the user's actual session_id from database
            actual_session_id = user.session_id
            if actual_session_id != session_id:
                logger.warning(f"Session mismatch for user {user_id}: requested {session_id}, actual {actual_session_id}")
                session_id = actual_session_id  # Use the actual session_id
            
            # Check for existing ongoing chat with row lock for THIS session only
            existing_chat = (db.session.query(Chat)
                           .filter_by(user_id=user_id, session_id=session_id, status="ongoing")
                           .with_for_update()
                           .first())
            
            if existing_chat:
                # Return existing chat
                db.session.commit()
                logger.info(f"Retrieved existing chat {existing_chat.id} for user {user_id} session {session_id}")
                return existing_chat, None
            
            # No ongoing chat exists for this session, create new one
            # First, safety check: end any other ongoing chats for this specific session
            terminated_count = db.session.query(Chat).filter_by(
                user_id=user_id, 
                session_id=session_id, 
                status="ongoing"
            ).update({"status": "terminated_safety"})
            
            if terminated_count > 0:
                logger.warning(f"Terminated {terminated_count} ongoing chats for user {user_id} session {session_id}")
            
            # Create new chat
            chat_history = []
            if first_message:
                chat_history.append({
                    'role': 'user',
                    'content': first_message,
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            new_chat = Chat(
                user_id=user_id,
                session_id=session_id,  # Use the verified session_id
                status="ongoing",
                chat_history=chat_history,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.session.add(new_chat)
            db.session.flush()  # Get the ID before commit
            
            db.session.commit()
            logger.info(f"Created new chat {new_chat.id} for user {user_id} session {session_id}")
            return new_chat, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error in get_or_create_ongoing_chat: {str(e)}")
            return None, str(e)
    
    @staticmethod
    def add_message_to_chat(chat_id, role, content):
        """Add message to chat with atomic update"""
        try:
            # Close any existing transaction and start fresh
            db.session.rollback()
            
            chat = db.session.query(Chat).filter_by(id=chat_id).with_for_update().first()
            if not chat:
                db.session.rollback()
                return False, "Chat not found"
            
            if chat.status != "ongoing":
                db.session.rollback()
                return False, f"Chat is not ongoing (status: {chat.status})"
            
            # Add message
            message = {
                'role': role,
                'content': content,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            if chat.chat_history is None:
                chat.chat_history = []
            
            chat.chat_history = chat.chat_history + [message]  # Create new list for JSON update
            chat.updated_at = datetime.utcnow()
            
            db.session.commit()
            return True, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error adding message to chat {chat_id}: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def end_chat(chat_id, new_status, user_id=None):
        """End a specific chat with new status"""
        try:
            # Close any existing transaction and start fresh
            db.session.rollback()
            
            query = db.session.query(Chat).filter_by(id=chat_id)
            if user_id:
                query = query.filter_by(user_id=user_id)
            
            chat = query.with_for_update().first()
            if not chat:
                db.session.rollback()
                return False, "Chat not found"
            
            chat.status = new_status
            chat.updated_at = datetime.utcnow()
            
            db.session.commit()
            logger.info(f"Ended chat {chat_id} with status {new_status}")
            return True, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error ending chat {chat_id}: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def end_all_ongoing_chats_for_user(user_id, new_status="terminated_by_session_change"):
        """End all ongoing chats for a user - useful for session changes"""
        try:
            db.session.rollback()
            
            updated_count = db.session.query(Chat).filter_by(
                user_id=user_id,
                status="ongoing"
            ).update({"status": new_status, "updated_at": datetime.utcnow()})
            
            db.session.commit()
            logger.info(f"Ended {updated_count} ongoing chats for user {user_id}")
            return True, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error ending ongoing chats for user {user_id}: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def get_chat_state(user_id, session_id):
        """Get current chat state for user session - uses user's actual session if mismatch"""
        try:
            # CRITICAL: Verify session_id against user's actual session
            user = db.session.query(User).filter_by(id=user_id).first()
            if not user:
                return {
                    "chat_id": None,
                    "messages": [],
                    "topic": None,
                    "session_id": session_id,
                    "error": "User not found"
                }
            
            # Use user's actual session_id
            actual_session_id = user.session_id
            if actual_session_id != session_id:
                logger.warning(f"Session mismatch for user {user_id}: requested {session_id}, actual {actual_session_id}")
                session_id = actual_session_id
            
            chat = (db.session.query(Chat)
                   .filter_by(user_id=user_id, session_id=session_id, status="ongoing")
                   .first())
            
            if not chat:
                return {
                    "chat_id": None,
                    "messages": [],
                    "topic": None,
                    "session_id": session_id
                }
            
            # Format messages for frontend
            formatted_messages = []
            if chat.chat_history:
                for msg in chat.chat_history:
                    formatted_messages.append({
                        'sender': 'user' if msg.get('role') == 'user' else 'bot',
                        'message': msg.get('content', ''),
                        'timestamp': msg.get('timestamp', datetime.now().isoformat())
                    })
            
            return {
                "chat_id": chat.id,
                "messages": formatted_messages,
                "topic": chat.topic,
                "session_id": session_id,
                "status": chat.status
            }
            
        except Exception as e:
            logger.error(f"Error getting chat state: {str(e)}")
            return {
                "chat_id": None,
                "messages": [],
                "topic": None,
                "session_id": session_id,
                "error": str(e)
            }
    
    @staticmethod
    def update_chat_topic(chat_id, topic, user_id=None):
        """Update chat topic with atomic operation"""
        try:
            db.session.rollback()
            
            query = db.session.query(Chat).filter_by(id=chat_id)
            if user_id:
                query = query.filter_by(user_id=user_id)
            
            chat = query.with_for_update().first()
            if not chat:
                db.session.rollback()
                return False, "Chat not found"
            
            chat.topic = topic
            chat.updated_at = datetime.utcnow()
            
            db.session.commit()
            logger.info(f"Updated chat {chat_id} topic to {topic}")
            return True, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating chat topic {chat_id}: {str(e)}")
            return False, str(e)
    
    @staticmethod 
    def debug_user_chats(user_id):
        """Debug method to see all chats for a user"""
        try:
            user = db.session.query(User).filter_by(id=user_id).first()
            chats = db.session.query(Chat).filter_by(user_id=user_id).all()
            
            print(f"=== Debug User {user_id} ===")
            print(f"User session_id: {user.session_id if user else 'User not found'}")
            print(f"Total chats: {len(chats)}")
            
            for chat in chats:
                print(f"  Chat {chat.id}: session={chat.session_id}, status={chat.status}, messages={len(chat.chat_history) if chat.chat_history else 0}")
            
            return True, None
        except Exception as e:
            print(f"Debug error: {e}")
            return False, str(e)