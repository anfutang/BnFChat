from flask import Blueprint, jsonify, request, session, Response, stream_with_context
import time
import json
import random
import functools
from datetime import datetime

bp = Blueprint('dev', __name__, url_prefix="/api/dev")

# Mock data
MOCK_RESPONSES = [
    "Je vous recommande de consulter les ressources suivantes sur ce sujet dans notre catalogue...",
    "D'après la base de données de la BNF, voici quelques ouvrages pertinents que vous pourriez consulter...",
    "J'ai trouvé plusieurs références qui pourraient vous intéresser sur cette thématique...",
    "La BNF dispose de nombreux ouvrages sur ce thème. Voici une sélection des plus pertinents...",
    "Plusieurs documents dans nos collections correspondent à votre requête, notamment..."
]

MOCK_METADATA = [
    "<ul><li>Auteur: Victor Hugo</li><li>Date: 1862</li><li>Cote: RF-12345</li><li>Collection: Littérature française</li></ul>",
    "<ul><li>Auteur: Émile Zola</li><li>Date: 1885</li><li>Cote: LF-67890</li><li>Collection: Romans naturalistes</li></ul>",
    "<ul><li>Auteur: Marcel Proust</li><li>Date: 1913</li><li>Cote: MS-24680</li><li>Collection: Manuscrits modernes</li></ul>",
    "<ul><li>Auteur: Simone de Beauvoir</li><li>Date: 1949</li><li>Cote: PH-97531</li><li>Collection: Philosophie</li></ul>"
]

# Helper function to check login
def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Always consider user as logged in for the dummy backend
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/session-data', methods=['GET'])
@login_required
def get_session_data():
    """Get current session data for client"""
    # Use session data if available, otherwise provide defaults
    session_data = {
        "username": session.get("username", "Utilisateur Test"),
        "userId": session.get("user_id", 123),
        "avatarSeed": session.get("avatar-seed", "default"),
        "permissionLevel": session.get("permission_level", 1),
        "sessionId": session.get("session_id", 1),
        "freeTest": session.get("free_test", True),
        "chatMode": session.get("chat_mode", "respond"),
        "devMode": session.get("dev_mode", True)
    }
    return jsonify(session_data)

@bp.route('/chat-history', methods=['GET'])
@login_required
def get_chat_history():
    """Get current chat history"""
    # Return empty history or mock history
    if not session.get("chat_history"):
        session["chat_history"] = []
    return jsonify(session["chat_history"])


@bp.route('/input', methods=['POST'])
@login_required
def user_input():
    """Process user input and generate mock response"""
    user_input_text = request.json.get("userInput", "")
    first_input = request.json.get("firstInput", True)
    
    # Initialize chat history if needed
    if "chat_history" not in session:
        session["chat_history"] = []
    
    # Add user message to chat history
    user_message = {
        "sender": "user",
        "message": user_input_text,
        "timestamp": datetime.now().isoformat()
    }
    session["chat_history"].append(user_message)
    session.modified = True  # Important: mark session as modified
    
    def generate_mock_stream():
        # Stream thinking process (unchanged)
        yield json.dumps({
            "type": "info",
            "content": [
                "- Analyse de la requête...", 
                "- Recherche de références bibliographiques...",
                "- Query avec focus clair ? ✓",
                "- SRU query: dc.title all \"" + user_input_text + "\" sortby dc.date/sort.descending"
            ]
        }) + "\n"
        
        time.sleep(0.5)
        
        # Stream timing info (unchanged)
        yield json.dumps({
            "type": "time",
            "content": {
                "entity_disambiguation_time": "0.234 s",
                "nl2sru_time": "0.456 s",
                "gallica_retrieval_time": "0.789 s",
                "metadata_processing_time": "0.321 s"
            }
        }) + "\n"
        
        time.sleep(1.0)
        
        # Generate random response
        response = random.choice(MOCK_RESPONSES)
        metadata = random.choice(MOCK_METADATA) if random.random() > 0.3 else None
        needs_annotation = random.random() < 0.3
        
        # Add bot response to chat history
        bot_message = {
            "sender": "bot",
            "message": response,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat()
        }
        session["chat_history"].append(bot_message)
        session.modified = True  # Important: mark session as modified
        
        # Stream bot response
        yield json.dumps({
            "type": "response",
            "content": {
                "message": response,
                "metadata": metadata,
                "needsAnnotation": needs_annotation
            }
        }) + "\n"
    
    return Response(stream_with_context(generate_mock_stream()), content_type='application/json')

@bp.route('/user-annotation', methods=['POST'])
@login_required
def user_annotation():
    """Process user annotation/feedback"""
    # Just acknowledge receipt of the annotation
    conv_label = request.json.get("convLabel", "")
    
    # End conversation if user chose to end it
    if conv_label:
        session["chat_history"] = []
    
    return jsonify({
        "success": True,
        "selectedResponse": "dummyResponse"
    })

@bp.route('/restart-chat', methods=['POST'])
@login_required
def restart_chat():
    """Reset the chat session"""
    session["chat_history"] = []
    return jsonify({"success": True})

@bp.route('/abandon-chat', methods=['POST'])
@login_required
def abandon_chat():
    """Abandon the current chat"""
    session["chat_history"] = []
    return jsonify({"success": True})

@bp.route('/confirm-chat', methods=['POST'])
@login_required
def confirm_chat():
    """Confirm the current chat as satisfactory"""
    return jsonify({"success": True})

@bp.route('/change-session', methods=['POST'])
@login_required
def change_session():
    """Change the current session settings"""
    data = request.json
    session["session_id"] = data.get('sessionId', 1)
    session["free_test"] = data.get('isFreeTest', True)
    session["chat_mode"] = "respond"
    session["chat_history"] = []
    
    return jsonify({"success": True})

@bp.route('/tutorial-texts', methods=['GET'])
@login_required
def get_tutorial_texts():
    """Get tutorial texts data"""
    tutorial_texts = {
        "step1": "Bienvenue dans le tutoriel BNF Chat. Ceci est l'étape 1.",
        "step2": "Apprenez à rechercher des références. Ceci est l'étape 2.",
        "step3": "Utilisez des filtres pour affiner vos résultats. Ceci est l'étape 3.",
        "step4": "Évaluez la pertinence des résultats. Ceci est l'étape 4."
    }
    return jsonify(tutorial_texts)