from flask import Blueprint, request, jsonify, Response, stream_with_context
from datetime import datetime
import sqlite3
import os
from openai import OpenAI
import json

# Create a Blueprint for BNF routes
bp = Blueprint('demo', __name__, url_prefix='/api/demo')

# Configure OpenAI API client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))  # Get API key from environment variable

# Database connection
def get_db_connection():
    conn = sqlite3.connect('bnf_chat.db')
    conn.row_factory = sqlite3.Row
    return conn

# Initialize the database - ensure table exists
def init_db():
    conn = get_db_connection()
    conn.execute('''
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_message TEXT NOT NULL,
        bot_response TEXT,
        session_type TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    ''')
    conn.commit()
    conn.close()

# Track if we've initialized the DB
_is_initialized = False

@bp.before_app_request
def initialize_db():
    global _is_initialized
    if not _is_initialized:
        # Make sure the database file exists
        if not os.path.exists('bnf_chat.db'):
            init_db()
        else:
            # Check if our table exists
            conn = get_db_connection()
            result = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_messages'").fetchone()
            conn.close()
            
            if not result:
                init_db()
        
        _is_initialized = True

# Helper function to get chat history for context
def get_chat_history(session_type, limit=5):
    conn = get_db_connection()
    messages = conn.execute(
        'SELECT user_message, bot_response FROM chat_messages WHERE session_type = ? ORDER BY timestamp DESC LIMIT ?', 
        (session_type, limit)
    ).fetchall()
    conn.close()
    
    # Convert to format expected by OpenAI API and reverse to get chronological order
    history = []
    for msg in reversed(messages):
        history.append({"role": "user", "content": msg['user_message']})
        if msg['bot_response']:
            history.append({"role": "assistant", "content": msg['bot_response']})
    
    return history

# Chat endpoint - streaming version
@bp.route('/chat', methods=['POST'])
def demo_chat():
    data = request.json
    user_message = data.get('message', '')
    session_type = data.get('sessionType', 'free')
    
    # Get conversation history for context
    history = get_chat_history(session_type)
    
    # Prepare messages for OpenAI API
    messages = [
        {"role": "system", "content": "Vous êtes l'assistant de référence virtuel de la Bibliothèque nationale de France (BNF). Votre rôle est d'aider les utilisateurs avec leurs recherches, de fournir des informations sur les collections et services de la BNF, et de répondre aux questions sur la bibliothèque en français."}
    ]
    
    # Add conversation history
    messages.extend(history)
    
    # Add current user message
    messages.append({"role": "user", "content": user_message})
    
    def generate_response():
        full_response = ""
        
        try:
            # Create a streaming response using OpenAI API
            stream = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                stream=True
            )
            
            # Stream each chunk as it's received
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield f"data: {json.dumps({'chunk': content})}\n\n"
            
            # Store the conversation in the database once complete
            conn = get_db_connection()
            conn.execute(
                'INSERT INTO chat_messages (user_message, bot_response, session_type, timestamp) VALUES (?, ?, ?, ?)',
                (user_message, full_response, session_type, datetime.now().isoformat())
            )
            conn.commit()
            conn.close()
            
            # Send a completion event
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            yield f"data: {json.dumps({'error': error_msg})}\n\n"
    
    return Response(
        stream_with_context(generate_response()),
        mimetype='text/event-stream'
    )

# Endpoint to get conversation history
@bp.route('/history', methods=['GET'])
def get_history():
    conn = get_db_connection()
    messages = conn.execute('SELECT * FROM chat_messages ORDER BY timestamp DESC').fetchall()
    conn.close()
    
    return jsonify({
        'history': [dict(message) for message in messages]
    })

# Call init_db during import to ensure table exists
try:
    init_db()
except Exception as e:
    print(f"Warning: Could not initialize database: {e}")