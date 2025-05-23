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

    session_id = db.Column(db.Integer, nullable=False, default=1)  # 1: tutoriel, 2: exercice, 3: test
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
    session_id = db.Column(db.Integer, nullable=False, default=2) # 1: tutoriel, 2: exercice, 3: test
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
