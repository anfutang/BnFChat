# app/models.py

import json
import datetime
import random
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from .db import db
from .utils.constant import PROFILE_KEYS

class User(db.Model):
    __tablename__ = 'user'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    permission_level = db.Column(db.Integer,nullable=False)
    mode = db.Column(db.String(50),nullable=False,default="search")
    avatar_seed = db.Column(db.Integer, nullable=True)
    online = db.Column(db.Boolean, nullable=False, default=False)
    request_reset_password = db.Column(db.Boolean, nullable=False, default=False)
    allowed_reset_password = db.Column(db.Boolean, nullable=False, default=False)
    profile_created = db.Column(db.Boolean, nullable=True, default=False)
    feedback = db.Column(db.JSON, nullable=True)
    profile = db.Column(db.JSON, nullable=True)
    
    # Relationship
    chats = db.relationship('Chat', backref='user', lazy=True)
    
    def __init__(self, username, password, permission_level=1, profile_created=False):
        self.username = username
        self.password = generate_password_hash(password)
        self.permission_level = permission_level
        self.avatar_seed = 1
        self.profile_created = profile_created
    
    def check_password(self, password):
        """Check if provided password matches stored hash"""
        return check_password_hash(self.password, password)
    
    def set_password(self, password):
        """Set new password hash"""
        self.password = generate_password_hash(password)
    
    def __repr__(self):
        return f'<User {self.username}>'


class Chat(db.Model):
    __tablename__ = 'chat'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    mode = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='ongoing')
    user_intent = db.Column(db.Text, nullable=True)
    generated_sru = db.Column(db.Text, nullable=True)
    chat_history = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now)
    result = db.Column(db.JSON,nullable=True)
    feedback = db.Column(db.String(20), nullable=True) 
    
    def __init__(self, user_id, mode, status='ongoing'):
        self.user_id = user_id
        self.mode = mode
        self.status = status
        self.chat_history = []
        self.created_at = datetime.datetime.now()
        self.updated_at = datetime.datetime.now()
    
    def add_message(self, role, content):
        """Add a message to the chat history"""
        message = {
            'role': role,
            'content': content,
            'timestamp': datetime.datetime.now().isoformat()
        }
        
        if self.chat_history is None:
            self.chat_history = []
        
        # Create a new list to ensure SQLAlchemy detects the change
        # This is crucial for JSON column change detection
        new_history = list(self.chat_history)
        new_history.append(message)
        self.chat_history = new_history
        
        self.updated_at = datetime.datetime.now()
        
        # Explicitly mark the attribute as modified
        # from sqlalchemy.orm.attributes import flag_modified
        # flag_modified(self, 'chat_history')
    
    def add_result(self, result, user_intent, generated_sru):
        if result:
            self.result = {"id":[int(ix) for ix in result["id"]]}
        if user_intent:
            self.user_intent = user_intent
        if generated_sru:
            self.generated_sru = generated_sru
        self.updated_at = datetime.datetime.now()
    
    def __repr__(self):
        return f'<Chat {self.id} - User {self.user_id}>'


def create_user(username, password):
    """Create a new user and save to database"""
    user = User(username=username, password=password)
    db.session.add(user)
    db.session.commit()
    return user

def update_user(user, profile_data):
    """Update user profile with provided data"""
    # Update avatar seed if provided
    if 'avatar_seed' in profile_data:
        user.avatar_seed = profile_data['avatar_seed']

    # Profile question answers
    user.profile = {ky:profile_data[ky] for ky in PROFILE_KEYS}    
    
    # Mark profile as created
    user.profile_created = True
    
    # Commit changes
    db.session.commit()
    
    return user

def get_all_user_chats():
    result = []
    users = User.query.all()
    for user in users:
        chats = Chat.query.filter_by(user_id=user.id).all()
        result.append({
            'user_id': user.id,
            'username': user.username,
            'chats': [{'chat_id': c.id, 
                       'chat_history': [msg["content"] for msg in c.chat_history], 
                       'user_intent': c.user_intent,
                       'sru_query': c.sru_query, 
                       'feedback': c.feedback
                       } for c in chats]
        })
    return result

def get_all_user_feedback():
    users = User.query.all()
    return [
        {
            'user_id': u.id,
            'feedback': u.feedback,
        }
        for u in users
    ]

def reset_user_password(user_id):
    user = User.query.filter_by(id=user_id).first()
    if user:
        user.allowed_reset_password = True
        db.session.commit()