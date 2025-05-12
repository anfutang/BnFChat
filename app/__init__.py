import os
from flask import (Flask, g, session, redirect, url_for, render_template, jsonify)
from .db import db, init_app, ensure_database_exists
from . import auth, user, admin, dev, module
from .utils.rag_db_utils import close_rag_db

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    
    # Default configuration
    app.config.from_mapping(
        SECRET_KEY="dev",
        DATABASE=os.path.join(app.instance_path, "bnf_chat.sqlite"),
        SQLALCHEMY_DATABASE_URI='sqlite:///' + os.path.join(app.instance_path, 'bnf_chat.sqlite'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,  # Optional: Disable track modifications
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
    app.register_blueprint(auth.bp, url_prefix='/auth')
    app.register_blueprint(admin.bp, url_prefix='/admin')
    app.register_blueprint(user.bp, url_prefix='/user')
    app.register_blueprint(dev.bp, url_prefix='/dev')
    app.register_blueprint(module.bp, url_prefix='/module')

    # Set a default route if needed
    # app.add_url_rule('/', view_func=auth.login, endpoint='auth.index')
    @app.route('/')
    def home():
        session.clear()
        return redirect(url_for('auth.index'))
    
    @app.route('/show_session',methods=['GET'])
    def show_session():
        return jsonify(dict(session))

    @app.before_request
    def clear_session_on_startup():
        if not app.config.get('SESSION_CLEARED', False):
            session.clear()
            app.config['SESSION_CLEARED'] = True

    return app