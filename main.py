#!/usr/bin/env python3
"""
Main application runner for BNF Chatbot with SocketIO support
"""

from app import create_app


# Create app with SocketIO
app, socketio = create_app()

if __name__ == '__main__':
    # Run with SocketIO - only runtime options here
    socketio.run(
        app, 
        debug=True, 
        host='0.0.0.0', 
        port=5001,
        allow_unsafe_werkzeug=True
    )