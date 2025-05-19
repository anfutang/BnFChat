from flask import Blueprint, request, Response, session, stream_with_context, json
import time
import traceback
import logging
from urllib.parse import unquote

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

bp = Blueprint('demo2', __name__, url_prefix="/api/demo2")

@bp.route("/stream", methods=['GET'])
def stream_processing():
    try:
        # Get query parameters
        user_input = request.args.get('query', '')
        is_first_input = request.args.get('first', 'false').lower() == 'true'
        
        # URL-decode the input
        user_input = unquote(user_input)
        
        logger.info(f"Received stream request: query='{user_input}', first={is_first_input}")
        
        # Store in session if needed
        session["chat_mode"] = "respond"
        session["user_input"] = user_input
        
        def generate_stream():
            """Generator function that yields chat processing results as SSE format"""
            
            # Initialize processing state
            timing_info = {}
            
            try:
                # Send an initial message to establish the connection
                yield f"data: {json.dumps({'type': 'connection', 'content': 'Connected'})}\n\n"
                
                # Initial typing indicator
                yield f"data: {json.dumps({'type': 'typing', 'content': 'Initialisation...'})}\n\n"
                
                # Step 1: Initialize conversation if first input
                if is_first_input:
                    yield f"data: {json.dumps({'type': 'info', 'content': '- Nouvelle conversation initiée'})}\n\n"
                    
                    # Simulate title matching process
                    start_time = time.time()
                    yield f"data: {json.dumps({'type': 'typing', 'content': 'Recherche de titres similaires...'})}\n\n"
                    time.sleep(2)  # Simulating work
                    end_time = time.time()
                    
                    timing_info["title_matching_time"] = f"{end_time - start_time:.3f} s"
                    yield f"data: {json.dumps({'type': 'time', 'content': timing_info})}\n\n"
                    
                    yield f"data: {json.dumps({'type': 'info', 'content': '- Recherche de titre: ✅'})}\n\n"
                
                # Step 2: Entity disambiguation
                start_time = time.time()
                yield f"data: {json.dumps({'type': 'typing', 'content': 'Analyse des entités dans votre requête...'})}\n\n"
                time.sleep(2)  # Simulating work
                end_time = time.time()
                
                timing_info["entity_disambiguation_time"] = f"{end_time - start_time:.3f} s"
                yield f"data: {json.dumps({'type': 'time', 'content': timing_info})}\n\n"
                
                # Determine if query has clear focus (simulated)
                has_clear_focus = True  # Could be determined by some function
                
                if has_clear_focus:
                    yield f"data: {json.dumps({'type': 'info', 'content': '- Requête avec focus clair: ✔️'})}\n\n"
                    
                    # Step 3: Convert to SRU query
                    start_time = time.time()
                    yield f"data: {json.dumps({'type': 'typing', 'content': 'Conversion de votre recherche en SRU...'})}\n\n"
                    time.sleep(2)  # Simulating NL2SRU conversion
                    sru_query = f'dc.title all "{user_input}"'  # Simulated SRU query
                    end_time = time.time()
                    
                    timing_info["nl2sru_time"] = f"{end_time - start_time:.3f} s"
                    yield f"data: {json.dumps({'type': 'time', 'content': timing_info})}\n\n"
                    
                    yield f"data: {json.dumps({'type': 'info', 'content': f'- NL2SRU: ✔️\n- Requête SRU: {sru_query}'})}\n\n"
                    
                    # Step 4: Retrieve from Gallica
                    start_time = time.time()
                    yield f"data: {json.dumps({'type': 'typing', 'content': 'Recherche dans les bases de données Gallica...'})}\n\n"
                    time.sleep(2)  # Simulating retrieval
                    num_results = 42  # Simulated result count
                    end_time = time.time()
                    
                    timing_info["gallica_retrieval_time"] = f"{end_time - start_time:.3f} s"
                    yield f"data: {json.dumps({'type': 'time', 'content': timing_info})}\n\n"
                    
                    yield f"data: {json.dumps({'type': 'info', 'content': f'- Récupération depuis Gallica: ✔️\n- {num_results} documents disponibles'})}\n\n"
                    
                    # Final preparation step
                    yield f"data: {json.dumps({'type': 'typing', 'content': 'Préparation des résultats...'})}\n\n"
                    time.sleep(2)  # Simulating final formatting
                    
                    # Final response
                    response_html = f"""
                    <div class="bot-response">
                        <p>Voici les résultats pour votre recherche <strong>"{user_input}"</strong>:</p>
                        <ul>
                            <li>J'ai trouvé {num_results} références qui correspondent à votre recherche</li>
                            <li>Parmi ces résultats, plusieurs semblent particulièrement pertinents</li>
                        </ul>
                        <p>Souhaitez-vous affiner votre recherche ou consulter ces résultats?</p>
                    </div>
                    """
                    
                    # Send the final response
                    yield f"data: {json.dumps({'type': 'response', 'content': response_html})}\n\n"
                    
                else:
                    # Handle unclear query
                    yield f"data: {json.dumps({'type': 'info', 'content': '- Requête avec focus clair: ✖️'})}\n\n"
                    
                    yield f"data: {json.dumps({'type': 'typing', 'content': "Formulation d'une demande de précision..."})}\n\n"
                    time.sleep(0.5)  # Simulating thinking
                    
                    clarification_html = """
                    <div class="bot-response">
                        <p>Votre requête est un peu générale. Pourriez-vous préciser:</p>
                        <ul>
                            <li>Le type de document que vous recherchez (livre, article, etc.)</li>
                            <li>L'époque ou la période qui vous intéresse</li>
                            <li>Des auteurs ou sujets spécifiques</li>
                        </ul>
                    </div>
                    """
                    
                    yield f"data: {json.dumps({'type': 'response', 'content': clarification_html})}\n\n"
                    
            except Exception as e:
                logger.error(f"Error in stream generation: {str(e)}")
                logger.error(traceback.format_exc())
                # Handle errors
                yield f"data: {json.dumps({'type': 'typing', 'content': 'Une erreur est survenue...'})}\n\n"
                yield f"data: {json.dumps({'type': 'error', 'content': f'Une erreur est survenue: {str(e)}'})}\n\n"
        
        # Set proper headers for Server-Sent Events
        headers = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
        
        return Response(
            stream_with_context(generate_stream()),
            headers=headers
        )
    
    except Exception as e:
        logger.error(f"Error in stream handler: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}, 500


@bp.route("/count", methods=['GET'])
def count_stream():
    def generate():
        for i in range(11):  # 0 to 10
            print(f"Generating count: {i}", flush=True)  # Add flush=True
            # Create a JSON chunk
            data = json.dumps({
                "count": i,
                "message": f"Count is now {i}"
            })
            
            # Use proper SSE format with "data:" prefix and double newlines
            # Only yield once per iteration
            yield f"data: {data}\n\n"
            
            # Wait 1 second
            time.sleep(1)
    
    # Set proper headers for Server-Sent Events
    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }
    
    # Remove direct_passthrough parameter
    return Response(
        stream_with_context(generate()),
        headers=headers
    )