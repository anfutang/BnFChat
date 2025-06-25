from flask import (Blueprint, Flask, jsonify, request)
from .db import db
from .models import get_all_user_chats, get_all_user_feedback, reset_user_password

bp = Blueprint('admin', __name__, url_prefix="/api/admin")

@bp.route('/user-chats', methods=['GET'])
def api_user_chats():
    return jsonify(get_all_user_chats())

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

