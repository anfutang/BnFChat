# app/models.py

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
    session_id = db.Column(db.Integer, nullable=False, default=1)
    exercise_topic_id = db.Column(db.Integer, nullable=False, default=0)
    test_topic_id = db.Column(db.Integer, nullable=False, default=0)
    timer_exercise = db.Column(db.Integer, nullable=False, default=30)
    timer_test = db.Column(db.Integer, nullable=False, default=30)
    avatar_seed = db.Column(db.Integer, nullable=True)
    profile_created = db.Column(db.Boolean, nullable=True, default=False)
    feedback = db.Column(db.JSON, nullable=True)
    profile = db.Column(db.JSON, nullable=True)
    
    # Relationship
    chats = db.relationship('Chat', backref='user', lazy=True)
    
    def __init__(self, username, password, permission_level=1, profile_created=False):
        self.username = username
        self.password = generate_password_hash(password)
        self.permission_level = permission_level
        self.session_id = 1
        self.exercise_topic_id = 0
        self.test_topic_id = 0
        self.timer_exercise = 300
        self.timer_test = 2100
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
    session_id = db.Column(db.Integer, nullable=False)
    topic_id = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='ongoing')
    user_intent = db.Column(db.Text, nullable=True)
    chat_history = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now)
    feedback = db.Column(db.JSON, nullable=True) # replace with multiple columns instead when you know what you will have inside
    
    def __init__(self, user_id, session_id, topic_id, status='ongoing'):
        self.user_id = user_id
        self.session_id = session_id
        self.topic_id = topic_id
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
    
    def __repr__(self):
        return f'<Chat {self.id} - User {self.user_id} - Session {self.session_id}>'


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
    
    # Update exercise topic if provided
    if 'exerciseTopicId' in profile_data:
        user.exercise_topic_id = profile_data['exerciseTopicId']
    
    # Update test topic if provided
    if 'testTopicId' in profile_data:
        user.test_topic_id = profile_data['testTopicId']
    
    # Update timers if provided
    if 'timerExercise' in profile_data:
        user.timer_exercise = profile_data['timerExercise']
    
    if 'timerTest' in profile_data:
        user.timer_test = profile_data['timerTest']
    
    # Update session ID if provided
    if 'sessionId' in profile_data:
        user.session_id = profile_data['sessionId']

    # Profile question answers
    user.profile = {ky:profile_data[ky] for ky in PROFILE_KEYS}    
    
    # Mark profile as created
    user.profile_created = True
    
    # Commit changes
    db.session.commit()
    
    return user