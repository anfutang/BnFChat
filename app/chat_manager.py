# services/chat_manager.py
from sqlalchemy.orm import Session
from sqlalchemy import and_
from models import Chat, Message, User
from datetime import datetime
from typing import Optional, Dict, Any
import uuid

class ChatManager:
    def __init__(self, db: Session):
        self.db = db
    
    def get_ongoing_chat(self, user_id: str, session_id: str) -> Optional[Chat]:
        """
        Get the single ongoing chat for this user/session combination.
        Returns None if no ongoing chat exists.
        """
        return self.db.query(Chat).filter(
            and_(
                Chat.user_id == user_id,
                Chat.session_id == session_id,
                Chat.status == 'active'
            )
        ).first()
    
    def create_chat_with_first_message(
        self, 
        user_id: str, 
        session_id: str, 
        message_content: str
    ) -> Chat:
        """
        Create new chat and add first user message.
        Gets topic from user table - single source of truth.
        """
        # Get user to determine topic
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Determine topic based on session type
        topic_id = None
        if session_id.startswith('exercise_'):
            topic_id = user.exercise_topic_id
        elif session_id.startswith('test_'):
            topic_id = user.test_topic_id
        
        # Create new chat
        chat = Chat(
            id=str(uuid.uuid4()),
            user_id=user_id,
            session_id=session_id,
            topic_id=topic_id,
            status='active',
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(chat)
        self.db.flush()  # Get chat ID
        
        # Add first user message
        self.add_message_to_chat(chat.id, 'user', message_content)
        
        self.db.commit()
        return chat
    
    def add_message_to_chat(
        self, 
        chat_id: str, 
        role: str, 
        content: str
    ) -> Message:
        """
        Add message to existing chat.
        """
        message = Message(
            id=str(uuid.uuid4()),
            chat_id=chat_id,
            role=role,
            content=content,
            created_at=datetime.utcnow()
        )
        
        self.db.add(message)
        
        # Update chat timestamp
        chat = self.db.query(Chat).filter(Chat.id == chat_id).first()
        if chat:
            chat.updated_at = datetime.utcnow()
        
        self.db.commit()
        return message
    
    def end_chat(self, chat_id: str, status: str = 'completed') -> bool:
        """
        End ongoing chat with given status.
        Statuses: completed, abandoned, terminated
        """
        chat = self.db.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            return False
        
        chat.status = status
        chat.ended_at = datetime.utcnow()
        chat.updated_at = datetime.utcnow()
        
        self.db.commit()
        return True
    
    def terminate_ongoing_chats(self, user_id: str, session_id: str = None) -> int:
        """
        Terminate all ongoing chats for user.
        If session_id provided, only terminate chats for that session.
        Used when topic changes or session changes.
        """
        query = self.db.query(Chat).filter(
            and_(
                Chat.user_id == user_id,
                Chat.status == 'active'
            )
        )
        
        if session_id:
            query = query.filter(Chat.session_id == session_id)
        
        ongoing_chats = query.all()
        count = len(ongoing_chats)
        
        for chat in ongoing_chats:
            chat.status = 'terminated'
            chat.ended_at = datetime.utcnow()
            chat.updated_at = datetime.utcnow()
        
        self.db.commit()
        return count
    
    def get_chat_with_messages(self, chat_id: str) -> Optional[Dict[Any, Any]]:
        """
        Get chat with all messages for frontend state.
        """
        chat = self.db.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            return None
        
        messages = self.db.query(Message).filter(
            Message.chat_id == chat_id
        ).order_by(Message.created_at).all()
        
        return {
            'id': chat.id,
            'user_id': chat.user_id,
            'session_id': chat.session_id,
            'topic_id': chat.topic_id,
            'status': chat.status,
            'created_at': chat.created_at.isoformat(),
            'messages': [
                {
                    'id': msg.id,
                    'role': msg.role,
                    'content': msg.content,
                    'timestamp': msg.created_at.isoformat()
                }
                for msg in messages
            ]
        }
    
    def update_user_topic(
        self, 
        user_id: str, 
        exercise_topic_id: str = None, 
        test_topic_id: str = None
    ) -> bool:
        """
        Update user topic and terminate ongoing chats.
        Called when user selects new topic.
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Update topic
        if exercise_topic_id is not None:
            user.exercise_topic_id = exercise_topic_id
        if test_topic_id is not None:
            user.test_topic_id = test_topic_id
        
        user.updated_at = datetime.utcnow()
        
        # Terminate ongoing chats since topic changed
        self.terminate_ongoing_chats(user_id)
        
        self.db.commit()
        return True