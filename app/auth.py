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

@bp.route('/check-auth', methods=['GET'])
def check_auth():
<<<<<<< Updated upstream
    """Check if user is authenticated and return user details including profile completion status"""
=======
    """Check if user is authenticated"""
>>>>>>> Stashed changes
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({"authenticated": False})
    
    user = User.query.get(user_id)
    if user is None:
        return jsonify({"authenticated": False})
        
    return jsonify({
        "authenticated": True,
        "username": user.username,
        "avatarSeed": user.data.get("avatar-seed"),
<<<<<<< Updated upstream
        "permissionLevel": user.data.get("permission_level", 0),
        "profileCompleted": user.data.get("profile_created", False)
    })


=======
        "permissionLevel": user.data.get("permission_level", 0)
    })

>>>>>>> Stashed changes
@bp.route('/register', methods=['POST'])
def register():
    """Register new user - step 1"""
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    # Store in session temporarily
    session["username"] = username
    session["password"] = password
    
    return jsonify({"success": True})

@bp.route('/check-username', methods=['POST'])
def check_username_availability():
    """Check if username is available"""
    username = request.json.get('username')
    user = User.query.filter_by(username=username).first()
    
    return jsonify({'available': user is None})
<<<<<<< Updated upstream


@bp.route('/profile-submit', methods=['POST'])
# @login_required  # Ensure user is authenticated
def profile_submit():
    """Update user profile data for authenticated user"""
    profile_data = request.json.get('userProfileData', {})
    
    # User must be authenticated to reach this point due to @login_required
    user = g.user
    
    # Extract relevant profile data
    user_profile_data = {key: profile_data.get(key) for key in user_profile_keys}
    
    # Keep existing permission level
    user_profile_data["permission_level"] = user.data.get("permission_level", 0)
    user_profile_data["profile_created"] = True
    
    # Add avatar seed if not present
    if "avatar-seed" not in user_profile_data and "avatar-seed" not in user.data:
        user_profile_data["avatar-seed"] = profile_data.get("avatar_id") or hash(user.username) % 1000
    
    # Update user data
    update_user(user, user_profile_data)
    
    # Update session data
    session["avatar-seed"] = user.data.get("avatar-seed")
    
    return jsonify({
        "success": True,
        "username": user.username,
        "permissionLevel": user.data.get("permission_level", 0),
        "profileCompleted": True
=======
    
@bp.route('/profile-submit', methods=['POST'])
def profile_submit():
    """Complete user registration with profile data"""
    if not session.get("username") or not session.get("password"):
        return jsonify({"error": "Registration session expired"}), 400
        
    profile_data = request.json.get('userProfileData')
    username = session["username"]
    password = session["password"]

    # Extract relevant profile data
    user_profile_data = {key: profile_data.get(key) for key in user_profile_keys}
    permission_level = admin_users.get(username, 0)
    user_profile_data["permission_level"] = permission_level
    user_profile_data["profile_created"] = True

    # Set session data
    session["permission_level"] = permission_level
    session["avatar-seed"] = user_profile_data["avatar-seed"]
    session["dev_mode"] = IS_DEV_MODE
    session["session_id"] = 1
    session["free_test"] = True
    session["chat_mode"] = "respond"
    session["first_input"] = True
    session["annotation_submitted"] = True
    session["history"] = []
    clear_current_turn()

    # Create or update user
    user = User.query.filter_by(username=username).first()
    if user is None:
        create_user(username, password, user_profile_data)
        user = User.query.filter_by(username=username).first()
    else:
        update_user(user, user_profile_data)

    session["user_id"] = user.id

    return jsonify({
        "success": True,
        "username": username,
        "permissionLevel": permission_level
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    # Login success
    session["user_id"] = user.id
    session["username"] = username
    session["avatar-seed"] = user.data.get("avatar-seed")
    session["permission_level"] = user.data.get("permission_level", 0)
=======
    # Check if profile is complete
    user_profile_created = user.data.get('profile_created', True)
    if not user_profile_created:
        session["username"] = username
        session["password"] = password
        return jsonify({'needsProfile': True})
    
    # Login success
    session["user_id"] = user.id
    session["username"] = username
    session["avatar-seed"] = user.data["avatar-seed"]
    session["permission_level"] = user.data["permission_level"]
>>>>>>> Stashed changes
    session["session_id"] = 1
    session["free_test"] = True
    session["first_input"] = True
    session["annotation_submitted"] = True
    session["chat_mode"] = "respond"
    session["process"] = []
    session["dev_mode"] = IS_DEV_MODE
    clear_current_turn()

<<<<<<< Updated upstream
    # Check if profile is complete
    profile_completed = user.data.get('profile_created', False)

    return jsonify({
        'success': True,
        'username': username,
        'permissionLevel': user.data.get("permission_level", 0),
        'avatarSeed': user.data.get("avatar-seed"),
        'profileCompleted': profile_completed
=======
    return jsonify({
        'success': True,
        'username': username,
        'permissionLevel': user.data["permission_level"],
        'avatarSeed': user.data["avatar-seed"]
>>>>>>> Stashed changes
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

def login_required(f):
    """Decorator to require login for routes"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is None:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function