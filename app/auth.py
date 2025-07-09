# app/auth.py

import functools
import time
import datetime 
import threading
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify, current_app
)
from werkzeug.security import generate_password_hash, check_password_hash

from .db import db
from .models import (User, create_user, update_user, request_reset_user_password, reset_user_password, 
                     delete_user, login_user, logout_user, get_number_of_online_users, log_connection)
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

@bp.before_app_request
def load_logged_in_user():
    """Load user data before each request"""
    user_id = session.get("user_id")

    if user_id is None:
        g.user = None
    else:
        g.user = User.query.get(user_id)

# IMPORTANT: socket-io calls this route function to build connection, relying on user_id
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
            "userId": user.id,
            "username": user.username,
            "permissionLevel": user.permission_level,
            "avatarSeed": user.avatar_seed,
            "profileCompleted": user.profile_created
        }
    })

@bp.route('/ping',methods=['POST'])
def ping():
    data = request.json
    user_id = data.get("userId")
    try:
        user = User.query.get(user_id)
        log_connection(user)
        return jsonify({"success": True})
    except:
        return jsonify({"success": False})

@bp.route('/check-username', methods=['POST'])
def check_username_availability():
    """Check if username is available"""
    username = request.json.get('username')
    user = User.query.filter_by(username=username).first()
    
    if user is None:
        return jsonify({'available': True})
    else:
        return jsonify({'available': False,
                        'user':{"request_reset_password": user.request_reset_password,
                                "allowed_reset_password": user.allowed_reset_password
                       }})

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

    # Store user ID in session
    # session["user_id"] = user.id
    session["username"] = username
    
    return jsonify({
        "success": True,
        "username": username,
        "profileCompleted": False
    })

@bp.route('/profile-submit', methods=['POST'])
def profile_submit():
    """Update user profile data for authenticated user"""
    user_profile_data = request.json.get('userProfileData', {})
    
    # User must be authenticated to reach this point due to @login_required
    user = User.query.filter_by(username=session["username"]).first()
    
    try:
        # Update user with profile data
        update_user(user, user_profile_data)
        allowed_login = login_user(user)
        
        # Update session data
        if allowed_login:
            session["user_id"] = user.id
            session["permission_level"] = user.permission_level
            session["avatar_seed"] = user.avatar_seed
        
        return jsonify({
            "success": True,
            'userId': user.id,
            "username": user.username,
            "avatarSeed":user.avatar_seed,
            "permissionLevel": user.permission_level,
            "requestResetPassword": user.request_reset_password,
            "allowedResetPassword": user.allowed_reset_password,
            "profileCompleted": True,
            'allowedLogin': allowed_login
        })
    except:
        return jsonify({
            "success":False
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
        return jsonify({'error': "L'utilisateur n'existe pas"}), 401
    elif not user.check_password(password):
        return jsonify({'error': 'Mot de passe incorrect'}), 401
    
    try: 
        allowed_login = login_user(user)

        if allowed_login:
            session["user_id"] = user.id
            session["username"] = username
            session["permission_level"] = user.permission_level
            session["avatar_seed"] = user.avatar_seed

        # Return user data
        return jsonify({
            'success': True,
            'userId': user.id,
            'username': username,
            'avatarSeed': user.avatar_seed,
            'permissionLevel': user.permission_level,
            'requestResetPassword': user.request_reset_password,
            'allowedResetPassword': user.allowed_reset_password,
            'profileCompleted': user.profile_created,
            'allowedLogin': allowed_login
        })
    except:
        return jsonify({
            'success':False,
            'userId': user.id
        })

@bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset user password"""
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    user = User.query.filter_by(username=username).first()
    if user is None:
        return jsonify({"error": "L'utilisateur n'existe pas"}), 400
    
    try:
        reset_user_password(user, password)
        return jsonify({"success": True})
    except:
        return jsonify({"success":False})

@bp.route('/request-reset-password', methods=['POST'])
def request_reset_password():
    """Send user request for password reset"""
    data = request.json
    username = data.get("username")
    
    user = User.query.filter_by(username=username).first()
    if user is None:
        return jsonify({"error": "L'utilisateur n'existe pas"}), 400
    
    try:
        request_reset_user_password(user)
        return jsonify({"success": True})
    except:
        return jsonify({"success":False})

@bp.route('/cancel', methods=['POST'])
def cancel():
    username = session.get('username')
    try:
        delete_user(username)
        return jsonify({
            'success':True,
            'username': username
        })
    except:
        return jsonify({"success":False})

@bp.route('/logout', methods=['POST'])
def logout():
    """Logout user"""
    data = request.json
    user_id = data.get("userId")
    try:
        user = User.query.get(user_id)
        logout_user(user)
        session.clear()
        return jsonify({"success": True})
    except:
        return jsonify({"success": False})
    
# only for logout when user closes the page or navigator (frontend sendBeacon method)
@bp.route('/auto-logout', methods=['POST'])
def auto_logout():
    user_id = request.form.get("userId")
    logout_trigger_time = datetime.datetime.now()
    print(f"📡 Beacon logout received: userId={user_id} at {logout_trigger_time:.3f}.")

    def check_if_user_refreshes():
        with current_app.app_context():
            time.sleep(0.5) # may be to be increased with the user load

            last_ping_time = User.query.get(user_id).last_connection_at

            # Distinguishing refreshing & closing: whether the user connects (send ping requests) in 1s after refreshing / closing page
            if last_ping_time > logout_trigger_time:
                print(f"🟡 Skipped logout: user {user_id} refreshed page.")
            else:
                try:
                    user = User.query.get(user_id)
                    logout_user(user)
                    session.clear()
                    print(f"🟢 Auto logout success: user {user_id}")
                except Exception as e:
                    print(f"🔴 Auto logout failed: {e}")

    check_if_user_refreshes()
    # threading.Thread(target=check_if_user_returns).start()
    return '', 204

