# app/models.py


from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine, Table, Column, Integer, MetaData, select, update, insert, delete, inspect, text
from sqlalchemy.engine import reflection
from sqlalchemy.orm import Session
from .db import db
import datetime

class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    
    # User profile data
    age = db.Column(db.String(10), nullable=True)
    diploma = db.Column(db.String(100), nullable=True)
    situation = db.Column(db.String(50), nullable=True)
    other_situation = db.Column(db.String(100), nullable=True)
    engaged_in_academic_research = db.Column(db.Boolean, nullable=True)
    engaged_in_amateur_research = db.Column(db.Boolean, nullable=True)
    is_gallica_user = db.Column(db.Boolean, nullable=True)
    frequency_usage_gallica = db.Column(db.String(50), nullable=True)
    time_usage_gallica = db.Column(db.String(50), nullable=True)
    accept_further_contact = db.Column(db.Boolean, nullable=True)
    avatar_seed = db.Column(db.Integer, nullable=True)
    profile_created = db.Column(db.Boolean, nullable=False, default=False)

    session_step = db.Column(db.String(20), nullable=False, default="tutoriel")
    timer_exercise = db.Column(db.Integer, nullable=False, default=300)
    timer_test = db.Column(db.Integer, nullable=False, default=2100)

    def __init__(self, username, password, **kwargs):
        self.username = username
        self.set_password(password)   # Hash the password
        
        # Process other kwargs
        self.age = kwargs.get('age')
        self.diploma = kwargs.get('diploma')
        self.situation = kwargs.get('situation')
        self.other_situation = kwargs.get('other-situation')
        self.engaged_in_academic_research = kwargs.get('engaged-in-academic-research-activities')
        self.engaged_in_amateur_research = kwargs.get('engaged-in-amateur-research-activities')
        self.is_gallica_user = kwargs.get('is-gallica-user')
        self.frequency_usage_gallica = kwargs.get('frequency-usage-gallica')
        self.time_usage_gallica = kwargs.get('time-usage-gallica')
        self.accept_further_contact = kwargs.get('accept-further-contact')
        self.avatar_seed = kwargs.get('avatar-seed')
        self.profile_created = kwargs.get('profile_created', False)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)
    
    def to_dict(self):
        """Convert user object to dictionary for front-end"""
        return {
            'id': self.id,
            'username': self.username,
            'avatarSeed': self.avatar_seed,
            'profileCompleted': self.profile_created
        }
    
    def update_profile(self, profile_data):
        """Update user profile with data from form"""
        self.age = profile_data.get('age', self.age)
        self.diploma = profile_data.get('diploma', self.diploma)
        self.situation = profile_data.get('situation', self.situation)
        self.other_situation = profile_data.get('other-situation', self.other_situation)
        self.engaged_in_academic_research = profile_data.get('engaged-in-academic-research-activities', 
                                                           self.engaged_in_academic_research)
        self.engaged_in_amateur_research = profile_data.get('engaged-in-amateur-research-activities', 
                                                          self.engaged_in_amateur_research)
        self.is_gallica_user = profile_data.get('is-gallica-user', self.is_gallica_user)
        self.frequency_usage_gallica = profile_data.get('frequency-usage-gallica', self.frequency_usage_gallica)
        self.time_usage_gallica = profile_data.get('time-usage-gallica', self.time_usage_gallica)
        self.accept_further_contact = profile_data.get('accept-further-contact', self.accept_further_contact)
        
        # Handle avatar seed if provided
        if 'avatar-seed' in profile_data:
            self.avatar_seed = profile_data['avatar-seed']
        elif self.avatar_seed is None and self.username:
            self.avatar_seed = hash(self.username) % 1000
            
        # Mark profile as created
        self.profile_created = True

class Chat(db.Model):
    __tablename__ = 'chat'
    
    # Single primary key (auto-incrementing)
    id = db.Column(db.Integer, primary_key=True)
    
    # These should NOT be primary keys anymore
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    
    # Other columns remain the same
    topic = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="ongoing")
    session_step = db.Column(db.String(20), nullable=False, default="tutoriel")
    updated_at = db.Column(db.DateTime, nullable=False, 
                         default=db.func.current_timestamp(),
                         onupdate=db.func.current_timestamp())
    user_intent = db.Column(db.Text, nullable=True)
    chat_history = db.Column(db.JSON, nullable=False, default=list)
    feedback_value1 = db.Column(db.Text, nullable=True)
    user = db.relationship('User', backref='chats')
    
    def to_dict(self):
        """Convert chat to dictionary for the frontend"""
        return {
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'topic': self.topic,
            'status': self.status,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user_intent': self.user_intent,
            'chat_history': self.chat_history
        }
    
    def add_message(self, role, content):
        """Add a new message to chat_history"""
        if self.chat_history is None:
            self.chat_history = []
            
        message = {
            'role': role,
            'content': content,
            'timestamp': datetime.datetime.utcnow().isoformat()
        }
        
        self.chat_history.append(message)
        self.updated_at = datetime.datetime.utcnow()
        return message
    
def create_user(username, password, user_profile_data=None):
    """Create a new user with profile data"""
    if user_profile_data is None:
        user_profile_data = {}
    new_user = User(
        username=username,
        password=password,
        **user_profile_data
    )
    
    db.session.add(new_user)
    db.session.commit()
    return new_user

def update_user(user, user_profile_data):
    """Update a user's profile data"""
    user.update_profile(user_profile_data)
    db.session.commit()
    return user

def get_user_chats(user_id):
    """Get all chats for a user"""
    return Chat.query.filter_by(user_id=user_id).order_by(Chat.updated_at.desc()).all()

def get_chat_content(user_id, chat_id):
    """Get the content of a specific chat"""
    chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
    if not chat:
        return None
    return chat.to_dict()

def create_chat(user_id, first_message=None, status="ongoing", user_intent="", topic=None, session_step="session_exercise"):
    """Create a new chat for a user"""
    # Initialize with empty chat history
    chat_history = []
    
    # Add first message if provided
    if first_message:
        chat_history.append({
            'role': 'user',
            'content': first_message,
            'timestamp': datetime.datetime.utcnow().isoformat()
        })
    
    # Create new chat - no need to set the ID manually
    chat = Chat(
        user_id=user_id,
        created_at=datetime.datetime.utcnow(),
        topic=topic,
        status=status,
        user_intent=user_intent,
        chat_history=chat_history,
        session_step=session_step
    )
    
    db.session.add(chat)
    db.session.commit()
    
    # After commit, chat.id will contain the auto-assigned ID
    return chat

def add_message_to_chat(chat_id, role, content):
    """Add a message to an existing chat identified by chat_id"""
    # Find the chat
    chat = Chat.query.filter_by(id=chat_id).first()
    
    if not chat:
        raise ValueError(f"Chat not found for chat_id={chat_id}")
    
    # Create new message
    message = {
        'role': role,
        'content': content,
        'timestamp': datetime.datetime.utcnow().isoformat()
    }
    
    # Add message to chat history
    if chat.chat_history is None:
        chat.chat_history = []
    
    chat.chat_history.append(message)
    
    # Update timestamp
    chat.updated_at = datetime.datetime.utcnow()
    
    db.session.commit()
    
    return message

def get_latest_chat(user_id):
    """Get the latest chat for a user"""
    return Chat.query.filter_by(user_id=user_id).order_by(Chat.created_at.desc()).first()

def add_message_to_latest_chat(user_id, role, content):
    """Add a message to the user's latest chat"""
    chat = get_latest_chat(user_id)
    
    if not chat:
        # No existing chat, create one with this message
        return create_chat(user_id, first_message=content if role == 'user' else None)
    
    # Create new message
    message = {
        'role': role,
        'content': content,
        'timestamp': datetime.datetime.utcnow().isoformat()
    }
    
    # Add message to chat history
    if chat.chat_history is None:
        chat.chat_history = []
    
    chat.chat_history.append(message)
    
    # Update timestamp
    chat.updated_at = datetime.datetime.utcnow()
    
    db.session.commit()
    
    return message

def save_conv(user_id, first_input, chat_history, status="ongoing", user_intent="", topic=None, chat_id=None):
    """Save conversation to database, using chat_id if provided"""
    # Only proceed if we have chat history and a real user
    if not (isinstance(chat_history, list) and len(chat_history) > 0 and user_id and user_id != 123):
        return
        
    # Format the chat history appropriately
    if isinstance(chat_history[0], dict):
        # Already in the right format for models
        formatted_chat_history = chat_history
    else:
        # Convert simple messages to dict format
        formatted_chat_history = []
        for i, message in enumerate(chat_history):
            role = 'user' if i % 2 == 0 else 'assistant'
            formatted_chat_history.append({
                'role': role,
                'content': message,
                'timestamp': datetime.datetime.utcnow().isoformat()
            })
    
    # Try to find the chat by ID if provided
    chat = None
    if chat_id:
        chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
    
    # If we found the chat, update it
    if chat:
        # Update chat fields
        chat.status = status
        chat.user_intent = user_intent
        if topic:
            chat.topic = topic
        
        # Update chat history
        chat.chat_history = formatted_chat_history
        
        # Update timestamp
        chat.updated_at = datetime.datetime.utcnow()
        
        db.session.commit()
        return chat
    
    # If chat not found by ID or first_input is True, handle accordingly
    if first_input:
        # End any existing ongoing chats
        end_ongoing_chats(user_id, "terminated_by_new_session")
        
        # Create a new chat with current timestamp
        new_chat = Chat(
            user_id=user_id,
            created_at=datetime.datetime.utcnow(),
            topic=topic,
            status=status,
            user_intent=user_intent,
            chat_history=formatted_chat_history
        )
        db.session.add(new_chat)
        db.session.commit()
        return new_chat
    else:
        # Try to get ongoing chat
        chat = get_ongoing_chat(user_id)
        
        if chat:
            # Update chat fields
            chat.status = status
            chat.user_intent = user_intent
            if topic:
                chat.topic = topic
            
            # Update chat history
            chat.chat_history = formatted_chat_history
            
            # Update timestamp
            chat.updated_at = datetime.datetime.utcnow()
            
            db.session.commit()
            return chat
        else:
            # If no ongoing chat exists (unusual case), create one
            new_chat = Chat(
                user_id=user_id,
                created_at=datetime.datetime.utcnow(),
                topic=topic,
                status=status,
                user_intent=user_intent,
                chat_history=formatted_chat_history
            )
            db.session.add(new_chat)
            db.session.commit()
            return new_chat

def get_all_users_with_chats():
    """Get all users who have at least one chat"""
    return User.query.join(Chat).distinct().all()


def get_ongoing_chat(user_id):
    """Get the ongoing chat for a user, or None if not found"""
    return Chat.query.filter_by(
        user_id=user_id,
        status="ongoing"
    ).order_by(Chat.created_at.desc()).first()

def get_chat_by_id(chat_id, user_id=None):
    """Get a specific chat by ID, optionally filtering by user"""
    query = Chat.query.filter_by(id=chat_id)
    if user_id:
        query = query.filter_by(user_id=user_id)
    return query.first()

def end_ongoing_chats(user_id, new_status="terminated"):
    """Mark all ongoing chats for a user as ended with the specified status"""
    ongoing_chats = Chat.query.filter_by(
        user_id=user_id,
        status="ongoing"
    ).all()
    
    for chat in ongoing_chats:
        chat.status = new_status
    
    db.session.commit()
    return len(ongoing_chats)

def get_or_create_chat(user_id, first_message=None, topic=None, user_intent="", session_step="session_exercise"):
    """Get the ongoing chat for a user, or create a new one if none exists"""
    
    # Try to find an ongoing chat
    chat = get_ongoing_chat(user_id)
    
    if chat:
        # Use the existing ongoing chat
        return chat
    
    # No ongoing chat found, create a new one
    chat_history = []
    
    # Add first message if provided
    if first_message:
        chat_history.append({
            'role': 'user',
            'content': first_message,
            'timestamp': datetime.datetime.utcnow().isoformat()
        })
    
    # Create new chat
    chat = Chat(
        user_id=user_id,
        created_at=datetime.datetime.utcnow(),
        topic=topic,
        status="ongoing",
        user_intent=user_intent,
        chat_history=chat_history,
        session_step=session_step
    )
    
    db.session.add(chat)
    db.session.commit()
    
    return chat