# Create a new file: chatbot.py

from flask import Blueprint, jsonify

bp = Blueprint('chatbot', __name__, url_prefix='/api/chatbot')

@bp.route('/status', methods=['GET'])
def status():
    """
    Simple endpoint to check if the chatbot API is working
    """
    return jsonify({
        'status': 'online',
        'version': '0.1.0',
        'message': 'Chatbot API is running'
    })
    print("Chatbot API is running")