# app/auth.py

import functools
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify
)
from werkzeug.security import generate_password_hash, check_password_hash
from .db import db
from .models import User, create_user, update_user
from .utils.constant import *
from .utils.utils import *

bp = Blueprint('auth', __name__, url_prefix="/api/auth")

def login_required(f):
    """Decorator to require login for routes"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is None:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/check-auth', methods=['GET'])
def check_auth():
    """Check if user is authenticated and return user details including profile completion status"""
    user_id = session.get("user_id")    
    if user_id is None:
        return jsonify({"authenticated": False})
    
    user = User.query.get(user_id)
    if user is None:
        return jsonify({"authenticated": False})
        
    return jsonify({
        "authenticated": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "permission_level": user.permission_level,
            "avatarSeed": user.avatar_seed,
            "profileCompleted": user.profile_created
        }
    })


@bp.route('/register', methods=['POST'])
def register():
    """Register new user - step 1"""
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    # Check if username already exists
    if User.query.filter_by(username=username).first() is not None:
        return jsonify({"error": "L'utilisateur existe déjà"}), 400
    
    # Create the user in the database
    user = create_user(username, password)
    
    print("========USER CREATED")

    # Store user ID in session
    session["user_id"] = user.id
    session["username"] = username
    session["avatar-seed"] = 1
    
    return jsonify({
        "success": True,
        "username": username,
        "avatarSeed": 1,
        "profileCompleted": False
    })

@bp.route('/check-username', methods=['POST'])
def check_username_availability():
    """Check if username is available"""
    username = request.json.get('username')
    user = User.query.filter_by(username=username).first()
    
    return jsonify({'available': user is None})

@bp.route('/profile-submit', methods=['POST'])
@login_required
def profile_submit():
    """Update user profile data for authenticated user"""
    user_profile_data = request.json.get('userProfileData', {})
    
    # User must be authenticated to reach this point due to @login_required
    user = g.user
    
    # Update user with profile data
    update_user(user, user_profile_data)
    
    # Update session data
    session["avatar_seed"] = user.avatar_seed
    
    return jsonify({
        "success": True,
        "username": user.username,
        "permissionLevel": user.permission_level,
        "avatarSeed":user.avatar_seed,
        "profileCompleted": True
    })

@bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    session.clear()
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    user = User.query.filter_by(username=username).first()

    if user is None:
        return jsonify({'error': 'User not found'}), 401
    elif not user.check_password(password):
        return jsonify({'error': 'Incorrect password'}), 401

    # Login success
    session["user_id"] = user.id
    session["username"] = username
    session["permission_level"] = user.permission_level
    session["avatar_seed"] = user.avatar_seed
    # session["first_input"] = True
    # session["annotation_submitted"] = True
    # session["chat_mode"] = "respond"
    # session["process"] = []
    # session["dev_mode"] = IS_DEV_MODE
    clear_current_turn()

    # Return user data
    return jsonify({
        'success': True,
        'username': username,
        'avatarSeed': user.avatar_seed,
        'userLevel': user.permission_level,
        'profileCompleted': user.profile_created
    })

@bp.route('/logout', methods=['POST'])
def logout():
    """Logout user"""
    session.clear()
    return jsonify({"success": True})

@bp.before_app_request
def load_logged_in_user():
    """Load user data before each request"""
    user_id = session.get("user_id")

    if user_id is None:
        g.user = None
    else:
        g.user = User.query.get(user_id)

