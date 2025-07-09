from flask import (Blueprint, Flask, jsonify, request)
from .db import db
from .models import (get_single_user, get_all_users, get_user_activities, get_all_user_profiles, get_all_user_chats, get_all_user_feedbacks, 
                     update_avatar_seed, promote_user, degrade_user, approve_reset_user_password)
from .utils.constant import USERS_PER_PAGE, CHATS_PER_PAGE, FEEDBACKS_PER_PAGE

bp = Blueprint('account', __name__, url_prefix="/api/account")

# change avatar seed
@bp.route('/change-avatar-seed',methods=['GET'])
def change_avatar_seed():
    user_id = int(request.args.get('userId'))
    new_avatar_seed = int(request.args.get('avatarSeed'))
    try:
        update_avatar_seed(user_id, new_avatar_seed)
        return jsonify({"success":True})
    except: 
        return jsonify({"success":False})

# get user profiles / conversations / feedbacks
@bp.route('/fetch-user',methods=['GET'])
def fetch_user():
    user_id = int(request.args.get('userId'))
    return jsonify(get_single_user(user_id))

@bp.route('/user-list',methods=['GET'])
def get_users():
    page = int(request.args.get('page', 1))
    thres = int(request.args.get('threshold', 1))
    table = request.args.get('table')
    offset = (page - 1) * USERS_PER_PAGE
    return jsonify(get_all_users(offset,USERS_PER_PAGE,thres,table))

@bp.route('/user-profile', methods=['GET'])
def get_user_profiles():
    page = int(request.args.get('page', 1))
    thres = int(request.args.get('threshold', 1))
    offset = (page - 1) * USERS_PER_PAGE
    return jsonify(get_all_user_profiles(offset,USERS_PER_PAGE,thres))

@bp.route('/user-chats', methods=['GET'])
def get_user_chats():
    user_id = request.args.get("user_id", type=int)
    page = request.args.get("page", 1, type=int)
    offset = (page - 1) * CHATS_PER_PAGE
    return jsonify(get_all_user_chats(user_id, offset,CHATS_PER_PAGE))

@bp.route('/user-feedbacks', methods=['GET'])
def api_user_feedback():
    user_id = request.args.get("user_id", type=int)
    page = request.args.get("page", 1, type=int)
    offset = (page - 1) * FEEDBACKS_PER_PAGE
    return jsonify(get_all_user_feedbacks(user_id, offset,FEEDBACKS_PER_PAGE))

# user management
@bp.route('promote-user')
def promote_user_permission_level():
    user_id = int(request.args.get('userId'))
    promote_user(user_id)
    try:
        promote_user(user_id)
        return jsonify({"success":True})
    except: 
        return jsonify({"success":False})
    
@bp.route('degrade-user')
def degrade_user_permissino_level():
    user_id = int(request.args.get('userId'))
    try:
        degrade_user(user_id)
        return jsonify({"success":True})
    except: 
        return jsonify({"success":False})

@bp.route('/approve-reset-password')
def approve_user_reset_password_request():
    user_id = int(request.args.get('userId'))
    try:
        approve_reset_user_password(user_id)
        return jsonify({"success":True})
    except: 
        return jsonify({"success":False})

# show recent activities
@bp.route('/recent-users')
def get_recent_users():
    thres = int(request.args.get('threshold', 1))
    try:
        return jsonify({"success":True,**get_user_activities(thres)})
    except:
        return jsonify({"success":False})
        

