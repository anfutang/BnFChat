# app/models.py

import json
import datetime
import random
from math import ceil
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import load_only
from .db import db
from .utils.constant import PROFILE_KEYS, MAXIMUM_NUM_ONLINE_USERS
from .llm.rag import find_facets

class User(db.Model):
    __tablename__ = 'user'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    plaintext_password = db.Column(db.String(200), nullable=True)
    password = db.Column(db.String(200), nullable=False)
    permission_level = db.Column(db.Integer,nullable=False)
    mode = db.Column(db.String(50),nullable=False,default="search")
    avatar_seed = db.Column(db.Integer, nullable=True)
    online = db.Column(db.Boolean, nullable=False, default=False)
    request_reset_password = db.Column(db.Boolean, nullable=False, default=False)
    allowed_reset_password = db.Column(db.Boolean, nullable=False, default=False)
    profile_created = db.Column(db.Boolean, nullable=True, default=False)
    profile = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now)
    last_login_at = db.Column(db.DateTime, nullable=True)
    
    # Relationship
    chats = db.relationship('Chat', backref='user', lazy=True)
    
    def __init__(self, username, password, permission_level=1, profile_created=False, save_password_in_plain_text=False):
        self.username = username
        self.password = generate_password_hash(password)
        self.permission_level = permission_level
        self.avatar_seed = 1
        self.profile_created = profile_created
        self.created_at = datetime.datetime.now()
        if save_password_in_plain_text:
            self.plaintext_password = password
    
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
    
    def add_result(self, result, user_intent):
        if result:
            self.result = {"id":[int(ix) for ix in result["id"]]}
        if user_intent:
            self.user_intent = user_intent
        self.updated_at = datetime.datetime.now()
    
    def __repr__(self):
        return f'<Chat {self.id} - User {self.user_id}>'

class Feedback(db.Model):
    __tablename__ = 'feedback'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now)
    content = db.Column(db.Text, nullable=False) 
    
    def __init__(self, user_id, content):
        self.user_id = user_id
        self.content = content
        self.created_at = datetime.datetime.now()
    
    def __repr__(self):
        return f'<Feedback {self.id} - User {self.user_id}>'

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

def delete_user(username):
    user = User.query.filter_by(username=username).first()
    db.session.delete(user)
    db.session.commit()

#  login / logout user
def login_user(user):
    # admin users not counted when blocking users if too much users online at the same time
    nb_online_users = User.query.filter(User.permission_level < 2).filter_by(online=True).count()
    # is_user_already_online = User.query.filter(
    #     User.online == True,
    #     User.username == user.username
    # ).first() is not None
    # admin users can always log in
    # print(">>>>>>>>",nb_online_users,MAXIMUM_NUM_ONLINE_USERS,is_user_already_online)
    if user.permission_level < 2 and nb_online_users > MAXIMUM_NUM_ONLINE_USERS:
        return False
    user.online = True
    user.last_login_at = datetime.datetime.now()
    db.session.commit()
    return True

def logout_user(user):
    user.online = False
    db.session.commit()

# promote / degrade user permission level; approuve user request for reset password
def promote_user(user_id):
    user = User.query.get(user_id)
    if user and user.permission_level < 2:
        user.permission_level = 2
        db.session.commit()

def degrade_user(user_id):
    user = User.query.get(user_id)
    if user and user.permission_level == 2:
        user.permission_level = 1
        db.session.commit()

def request_reset_user_password(user):
    user.request_reset_password = True
    db.session.commit()

def reset_user_password(user,password):
    user.set_password(password)
    user.request_reset_password = False
    user.allowed_reset_password = False
    db.session.commit()

def approve_reset_user_password(user_id):
    user = User.query.filter_by(id=user_id).first()
    if user and user.request_reset_password:
        user.allowed_reset_password = True
        db.session.commit()

# fetch user and user-related infos
def get_user_activities(level_threshold):
    nb_online_users = User.query.filter_by(online=True).count()

    users = (
        User.query
        .filter(User.permission_level <= level_threshold)
        .filter(User.last_login_at != None) 
        .order_by(User.last_login_at.desc())
        .options(load_only(User.username, User.permission_level, User.last_login_at, User.online))
        .limit(15)
        .all()
    )

    result = []
    for user in users:
        result.append({
            'username': user.username,
            'permission_level': user.permission_level,
            'last_login_at': user.last_login_at.strftime("%Y-%m-%d %H:%M:%S"),
            'online': user.online
        })

    return {
        'users': result,
        'nb_online_users': nb_online_users
    }

def get_number_of_online_users():
    return User.query.filter(User.permission_level < 2).filter_by(online=True).count()

def get_single_user(user_id):
    user = User.query.filter_by(id=user_id).first()

    return {
        'id': user.id,
        'username': user.username,
        'created_at': user.created_at,
        'plaintext_password': user.plaintext_password,
        'permissionLevel': user.permission_level,
        'profile': user.profile  
    }

def get_all_users(offset,per_page,level_threshold):
    total_users = User.query.filter(User.permission_level <= level_threshold).count()
    total_pages = ceil(total_users / per_page)

    users = (
        User.query
        .filter(User.permission_level <= level_threshold)
        .options(load_only(User.id, User.username, User.permission_level))
        .offset(offset)
        .limit(per_page)
        .all()
    )

    result = []
    for user in users:
        result.append({
            'id': user.id,
            'username': user.username,
            'created_at': user.created_at,
            'permissionLevel': user.permission_level,
            'request_reset_password': user.request_reset_password,
            "allowed_reset_password": user.allowed_reset_password
        })

    return {
            'user': result,
            'total_pages': total_pages
        }

def get_all_user_profiles(offset,per_page,level_threshold):
    total_users = User.query.filter(User.permission_level <= level_threshold).count()
    total_pages = ceil(total_users / per_page)

    users = (
        User.query
        .filter(User.permission_level <= level_threshold)
        .options(load_only(User.id, User.username, User.permission_level, User.profile))
        .offset(offset)
        .limit(per_page)
        .all()
    )

    result = []
    for user in users:
        result.append({
            'id': user.id,
            'username': user.username,
            'created_at': user.created_at,
            'plaintext_password': user.plaintext_password,
            'permissionLevel': user.permission_level,
            'profile': user.profile  
        })

    return {
            'profile': result,
            'total_pages': total_pages
        }

def get_all_user_chats(user_id, offset, per_page):
    total_chats = Chat.query.filter_by(user_id=user_id).count()
    total_pages = ceil(total_chats / per_page)

    chats = (
        Chat.query
        .filter_by(user_id=user_id)
        .order_by(Chat.id.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )

    result = []
    for idx, c in enumerate(chats):
        if c.mode == "search" or c.result is None:
            result.append({
                "chat_id": idx+1,
                "mode":c.mode,
                "status": c.status,
                "user_intent": c.user_intent,
                "chat_history": c.chat_history, 
                "created_at": c.created_at,
                "updated_at": c.updated_at,
                "result":{},
                "feedback": c.feedback,
            })
        else:
            result.append({
                "chat_id": idx+1,
                "mode":c.mode,
                "status": c.status,
                "user_intent": c.user_intent,
                "chat_history": c.chat_history, 
                "created_at": c.created_at,
                "updated_at": c.updated_at,
                "result": find_facets([0]*len(c.result["id"]),c.result["id"]),
                "feedback": c.feedback,
            })

    return {
        "chats": result,
        "total_pages": total_pages,
    }

def get_all_user_feedbacks(user_id, offset, per_page):
    total_feedbacks = Feedback.query.filter_by(user_id=user_id).count()
    total_pages = ceil(total_feedbacks / per_page)

    feedbacks = (
        Feedback.query
        .filter_by(user_id=user_id)
        .order_by(Feedback.id.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )

    result = []
    for idx, f in enumerate(feedbacks):
        result.append({
            "feedback_id": idx+1,
            "content":f.content,
            "created_at": f.created_at,
        })
        
    return {
        "feedbacks": result,
        "total_pages": total_pages,
    }


# create a seperate and independant feedback table.
def create_feedback(user_id, content):
    """Create a feedback save to database"""
    try:
        feedback = Feedback(user_id=user_id, content=content)
        db.session.add(feedback)
        db.session.commit()
        return "success"
    except Exception as e:
        return e
    
# change avatar seed
def update_avatar_seed(user_id, avatar_seed):
    user = User.query.filter_by(id=user_id).first()
    user.avatar_seed = avatar_seed
    db.session.commit()


