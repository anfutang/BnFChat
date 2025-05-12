import functools
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify
)
from werkzeug.security import generate_password_hash, check_password_hash
from .db import db
from .models import User, create_user, update_user
from .utils.constant import *
from .utils.utils import *

bp = Blueprint('auth', __name__, url_prefix="/auth")

@bp.route('/',methods=['GET'])
def index():
    session.clear()
    return render_template('auth/index.html')

@bp.route('/register',methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        session["username"] = request.form.get("username")
        session["password"] = request.form.get("password")
        return render_template('auth/register_form.html') 
    session.clear()
    return render_template('auth/register.html')

@bp.route('/profile_submit',methods=['POST'])
def profile_submit():
    if request.method == 'POST':
        register_data = request.get_json().get('userProfileData')
        username = session["username"]
        password = session["password"]

        user_profile_data = {ky:register_data.get(ky) for ky in user_profile_keys}
        permission_level = admin_users.get(username,0)
        user_profile_data["permission_level"] = permission_level
        user_profile_data["profile_created"] = True

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

        user = User.query.filter_by(username=username).first()

        if user is None:
            create_user(username,password,user_profile_data)
            user = User.query.filter_by(username=username).first()
        else:
            update_user(user,user_profile_data)

        # note here: SUBMIT then fetch the new user's id !!! otherwise the user id is None
        session["user_id"] = user.id

        return jsonify({"username":username,"permission_level":permission_level})

@bp.route('/register/check_username_availability',methods=['POST'])
def check_username_availability():
    username = request.get_json().get('username')
    user = User.query.filter_by(username=username).first()
    if user is not None:
        return jsonify({'available': False})
    else:
        return jsonify({'available': True})
    
@bp.route('/profile',methods=['GET'])
def profile():
    return render_template('auth/register_form.html')

@bp.route('/login', methods=['GET', 'POST'])
def login():
    session.clear()
    if request.method == "POST":
        username = request.get_json().get("username")
        password = request.get_json().get("password")
        session["username"] = username
        session["password"] = password

        user = User.query.filter_by(username=username).first()

        if user is None:
            return jsonify({'user_error': True})
        elif not user.check_password(password):
            return jsonify({'password_error': True})

        # if profile questions not answered yet 
        user_profile_created = user.data.get('profile_created',True)

        if not user_profile_created:
            return jsonify({'url': url_for('auth.profile')})
        
        # login success & profile already created
        session["user_id"] = user.id
        session["avatar-seed"] = user.data["avatar-seed"]
        session["permission_level"] = user.data["permission_level"]
        session["session_id"] = 1
        session["free_test"] = True
        session["first_input"] = True
        session["annotation_submitted"] = True
        session["chat_mode"] = "respond"
        session["process"] = []
        session["dev_mode"] = IS_DEV_MODE
        clear_current_turn()

        if session["permission_level"] == 0:
            return jsonify({'url': url_for('dev.index')})
        else:
            return jsonify({'url': url_for('admin.index')})
    return render_template('auth/login.html')

@bp.before_app_request
def load_logged_in_user():
    user_id = session.get("user_id")

    if user_id is None:
        g.user = None
    else:
        g.user = User.query.get(user_id)

@bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.login'))   

def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            return redirect(url_for('auth.login'))
        return view(**kwargs)
    return wrapped_view

