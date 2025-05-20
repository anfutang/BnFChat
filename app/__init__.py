# app/__init__.py

import os
from flask import Flask, jsonify
from .db import init_app, ensure_database_exists
from . import auth, dev, stream
from flask_cors import CORS

from .utils.rag_db_utils import close_rag_db

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    CORS(app)

    # Default configuration
    app.config.from_mapping(
        SECRET_KEY="dev",
        DATABASE=os.path.join(app.instance_path, "bnf_chat.sqlite"),
        SQLALCHEMY_DATABASE_URI='sqlite:///' + os.path.join(app.instance_path, 'bnf_chat.sqlite'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )

    if test_config is None:
        # Load the instance config, if it exists, when not testing
        app.config.from_pyfile("config.py", silent=True)
    else:
        # Load the test config if passed in
        app.config.from_mapping(test_config)

    # Ensure the instance folder exists
    os.makedirs(app.instance_path, exist_ok=True)

    app.teardown_appcontext(close_rag_db)
    
    # Initialize the database with the Flask app
    init_app(app)
    
    # Ensure the database file exists
    ensure_database_exists(app)

    # Register blueprints
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(dev.bp, url_prefix='/api/dev')
    app.register_blueprint(stream.bp, url_prefix='/api/stream')
    
    @app.route('/api/status')
    def status():
        return jsonify({"status": "ok"})

    return app