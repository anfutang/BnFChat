import os
from flask import Flask, jsonify, send_from_directory, session
from flask_socketio import SocketIO
from .db import init_app, ensure_database_exists
from . import account, auth, stream
from flask_cors import CORS

from .utils.rag_db_utils import close_rag_db
from dotenv import load_dotenv

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE" # faiss-cpu + numpy may raise OMP-related error

load_dotenv()

def create_app():
    # Check if we're in production mode
    is_production = os.getenv('FLASK_ENV') == 'production' or os.getenv('NODE_ENV') == 'production'
    
    # Configure static files only for production
    if is_production:
        app = Flask(__name__, 
                   instance_relative_config=True,
                   static_folder='../frontend/build', 
                   static_url_path='')
    else:
        app = Flask(__name__, instance_relative_config=True)
    
    CORS(app)

    # Default configuration
    app.config.from_mapping(
        SECRET_KEY="dev",
        DATABASE=os.path.join(app.instance_path, "bnf_chat.sqlite"),
        SQLALCHEMY_DATABASE_URI='sqlite:///' + os.path.join(app.instance_path, 'bnf_chat.sqlite'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )

    os.makedirs(app.instance_path, exist_ok=True)

    app.teardown_appcontext(close_rag_db)
    init_app(app)
    ensure_database_exists(app)

    # Initialize SocketIO
    socketio = SocketIO(
        app, 
        cors_allowed_origins="*", 
        async_mode='threading',
        logger=True,
        engineio_logger=True,
        manage_session=True
    )

    # Register blueprints
    app.register_blueprint(auth.bp, url_prefix='/api/auth')

    app.register_blueprint(account.bp, url_prefix='/api/account')
    
    stream.init_socketio(socketio)
    app.register_blueprint(stream.bp, url_prefix='/api/stream')
    
    @app.route('/status',methods=['GET'])
    def status():
        return jsonify({"status": "ok"})
    
    # @app.route('/session')
    # def debug_session():
    #     return jsonify(session) 

    # Only add React serving routes in production
    if is_production:
        @app.route('/')
        def serve_react_app():
            return send_from_directory(app.static_folder, 'index.html')
        
        @app.errorhandler(404)
        def not_found(e):
            # If it's an API route, return JSON error
            if hasattr(e, 'original_exception') or '/api/' in str(e.description):
                return jsonify({"error": "API endpoint not found"}), 404
            # Otherwise serve React app for client-side routing
            return send_from_directory(app.static_folder, 'index.html')

    # print("==== All Registered Routes ====")
    # for rule in app.url_map.iter_rules():
    #     print(f"{rule}  →  methods: {rule.methods}")


    return app, socketio