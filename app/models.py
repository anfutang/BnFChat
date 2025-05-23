# app/models.py
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func
from .db import db
import datetime

class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    
    # Session management
    session_id = db.Column(db.Integer, nullable=False, default=1)  # 1: tutorial, 2: exercise, 3: test
    
    # Topic selection per session
    exercise_topic_id = db.Column(db.Integer, nullable=False, default=0)
    test_topic_id = db.Column(db.Integer, nullable=False, default=0)
    
    # Timer settings
    timer_exercise = db.Column(db.Integer, nullable=False, default=300)  # 5 minutes
    timer_test = db.Column(db.Integer, nullable=False, default=2100)     # 35 minutes

    avatar_seed = db.Column(db.Integer, default=0)
    profile_created = db.Column(db.Boolean, default=False)


    def __init__(self, username, password, **kwargs):
        self.username = username
        self.set_password(password)
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'sessionId': self.session_id,
            'exerciseTopicId': self.exercise_topic_id,
            'testTopicId': self.test_topic_id,
            'timerExercise': self.timer_exercise,
            'timerTest': self.timer_test
        }

class Chat(db.Model):
    __tablename__ = 'chat'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    session_id = db.Column(db.Integer, nullable=False)
    topic_id = db.Column(db.Integer, nullable=False, default=0)
    
    status = db.Column(db.String(20), nullable=False, default="ongoing")
    user_intent = db.Column(db.Text, nullable=True)
    chat_history = db.Column(db.JSON, nullable=False, default=list)
    
    created_at = db.Column(db.DateTime, nullable=False, default=func.current_timestamp())
    updated_at = db.Column(db.DateTime, nullable=False, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    user = db.relationship('User', backref='chats')
    
    def add_message(self, role, content):
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
