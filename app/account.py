from flask import (Blueprint, Flask, jsonify, request)
from .db import db
from .models import get_all_users, get_all_user_profiles, get_all_user_chats, get_all_user_feedback, reset_user_password
from .utils.constant import USERS_PER_PAGE, CHATS_PER_PAGE

bp = Blueprint('account', __name__, url_prefix="/api/account")

@bp.route('/user-list',methods=['GET'])
def get_users():
    page = int(request.args.get('page', 1))
    thres = int(request.args.get('threshold', 1))
    offset = (page - 1) * USERS_PER_PAGE
    return jsonify(get_all_users(offset,USERS_PER_PAGE,thres))

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

@bp.route('/user-feedback', methods=['GET'])
def api_user_feedback():
    return jsonify(get_all_user_feedback())

@bp.route('/reset-user', methods=['POST'])
def api_reset_user():
    data = request.get_json()
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({'error': 'user_id required'}), 400
    reset_user_password(user_id)
    return jsonify({'success': True})

