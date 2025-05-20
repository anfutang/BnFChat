# app/models.py


from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine, Table, Column, Integer, MetaData, select, update, insert, delete, inspect, text
from sqlalchemy.engine import reflection
from sqlalchemy.orm import Session
from .db import db

class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    
    # User profile data
    raw_password = db.Column(db.String(200), nullable=True)  # For development/testing
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
    permission_level = db.Column(db.Integer, nullable=False, default=0)
    profile_created = db.Column(db.Boolean, nullable=False, default=False)
    
    # Relationships can be added here later
    # For example: chats = db.relationship('Chat', backref='user', lazy=True)

    def __init__(self, username, password, **kwargs):
        self.username = username
        self.raw_password = password  # Store plaintext password temporarily 
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
        self.permission_level = kwargs.get('permission_level', 0)
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
            'permissionLevel': self.permission_level,
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
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="ongoing")
    chat_mode = db.Column(db.String(20), nullable=False, default="respond")
    user_intent = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, nullable=False, 
                         default=db.func.current_timestamp(),
                         onupdate=db.func.current_timestamp())
    
    # Relationship
    messages = db.relationship('ChatMessage', backref='chat', lazy=True, cascade="all, delete-orphan")
    
    def to_dict(self):
        """Convert chat to dictionary for the frontend"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'status': self.status,
            'chat_mode': self.chat_mode,
            'user_intent': self.user_intent,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'chat_history': [message.to_dict() for message in self.messages]
        }

class ChatMessage(db.Model):
    __tablename__ = 'chat_message'
    
    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.Integer, db.ForeignKey('chat.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    
    def to_dict(self):
        """Convert message to dictionary for frontend"""
        return {
            'id': self.id,
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
    
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

def create_chat(user_id, first_message=None, status="ongoing", user_intent=""):
    """Create a new chat for a user"""
    chat = Chat(
        user_id=user_id,
        status=status,
        chat_mode="respond",
        user_intent=user_intent
    )
    
    db.session.add(chat)
    db.session.commit()
    
    # Add first message if provided
    if first_message:
        add_message_to_chat(chat.id, "user", first_message)
    
    return chat

def add_message_to_chat(chat_id, role, content):
    """Add a message to an existing chat"""
    message = ChatMessage(
        chat_id=chat_id,
        role=role,
        content=content
    )
    
    db.session.add(message)
    db.session.commit()
    
    # Update the chat's updated_at timestamp
    chat = Chat.query.get(chat_id)
    chat.updated_at = db.func.current_timestamp()
    db.session.commit()
    
    return message

def save_conv(user_id, first_input, chat_history, status="ongoing", user_intent=""):
    """Save conversation to database and/or session"""
    # Save to session for all users
    if isinstance(chat_history, list) and len(chat_history) > 0:
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
                    'content': message
                })
        
        # Update session
        session["chat_history"] = [msg if isinstance(msg, str) else msg['content'] for msg in chat_history]
        
        # Save to database if real user
        if user_id and user_id != 123:  # Real authenticated user
            if first_input:
                # Create a new chat
                chat = Chat(
                    user_id=user_id,
                    status=status,
                    chat_mode="respond",
                    user_intent=user_intent
                )
                db.session.add(chat)
                db.session.commit()
                
                # Add messages
                for msg in formatted_chat_history:
                    message = ChatMessage(
                        chat_id=chat.id,
                        role=msg['role'],
                        content=msg['content']
                    )
                    db.session.add(message)
                
                db.session.commit()
            else:
                # Update existing chat
                chat = Chat.query.filter_by(user_id=user_id).order_by(Chat.updated_at.desc()).first()
                if chat:
                    # Update chat fields
                    chat.status = status
                    chat.user_intent = user_intent
                    
                    # Get existing messages
                    existing_messages = {i: msg for i, msg in enumerate(chat.messages)}
                    max_existing = len(existing_messages)
                    
                    # Update or add messages
                    for i, msg in enumerate(formatted_chat_history):
                        if i < max_existing:
                            # Update existing message
                            existing_messages[i].role = msg['role']
                            existing_messages[i].content = msg['content']
                        else:
                            # Add new message
                            message = ChatMessage(
                                chat_id=chat.id,
                                role=msg['role'],
                                content=msg['content']
                            )
                            db.session.add(message)
                    
                    db.session.commit()

def operate_on_users(selected_user_ids, action):
    """Perform operations on multiple users"""
    selected_users = User.query.filter(User.id.in_(selected_user_ids)).all()

    if action == 'delete':
        for user in selected_users:
            # Delete associated chats (cascade will handle chat messages)
            Chat.query.filter_by(user_id=user.id).delete()
            db.session.delete(user)
    elif action == 'promote':
        for user in selected_users:
            user.permission_level = 1
    elif action == 'reset':
        for user in selected_users:
            user.age = None
            user.diploma = None
            user.situation = None
            user.other_situation = None
            user.engaged_in_academic_research = None
            user.engaged_in_amateur_research = None
            user.is_gallica_user = None
            user.frequency_usage_gallica = None
            user.time_usage_gallica = None
            user.accept_further_contact = None
            user.profile_created = False
    
    db.session.commit()

def get_all_users_with_chats():
    """Get all users who have at least one chat"""
    return User.query.join(Chat).distinct().all()