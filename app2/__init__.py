from flask import Flask, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import time
import random
import threading
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Define the state structure
class GraphState(TypedDict):
    messages: Annotated[list, add_messages]
    user_input: str
    analysis_result: str
    reasoning_output: str
    final_response: str
    current_step: str

def create_analysis_graph(session_id):
    """Create a LangGraph workflow for message analysis"""
    
    def input_processor(state: GraphState) -> GraphState:
        """Process the initial user input"""
        socketio.emit('workflow_progress', {
            'step': 'input_processing',
            'status': 'Processing your input...',
            'session_id': session_id
        })
        time.sleep(1)  # Simulate processing
        
        processed_input = f"Processed: {state['user_input']}"
        socketio.emit('workflow_progress', {
            'step': 'input_processing',
            'status': 'Input processed successfully',
            'result': processed_input,
            'session_id': session_id
        })
        
        return {
            **state,
            'current_step': 'input_processing',
            'messages': [f"Input processed: {processed_input}"]
        }
    
    def analyzer(state: GraphState) -> GraphState:
        """Analyze the processed input"""
        socketio.emit('workflow_progress', {
            'step': 'analysis',
            'status': 'Analyzing your question...',
            'session_id': session_id
        })
        time.sleep(1.5)  # Simulate analysis
        
        analysis = f"Analysis of '{state['user_input']}': This appears to be a {random.choice(['question', 'request', 'statement'])} that requires {random.choice(['factual information', 'creative thinking', 'logical reasoning'])}"
        
        socketio.emit('workflow_progress', {
            'step': 'analysis',
            'status': 'Analysis completed',
            'result': analysis,
            'session_id': session_id
        })
        
        return {
            **state,
            'analysis_result': analysis,
            'current_step': 'analysis'
        }
    
    def reasoner(state: GraphState) -> GraphState:
        """Generate reasoning based on analysis"""
        socketio.emit('workflow_progress', {
            'step': 'reasoning',
            'status': 'Generating reasoning...',
            'session_id': session_id
        })
        time.sleep(2)  # Simulate reasoning
        
        reasoning = f"Based on my analysis, I need to consider: 1) The context of your question, 2) Relevant information, 3) Logical connections. Your input '{state['user_input']}' suggests you're looking for {random.choice(['information', 'help', 'clarification'])}."
        
        socketio.emit('workflow_progress', {
            'step': 'reasoning',
            'status': 'Reasoning completed',
            'result': reasoning,
            'session_id': session_id
        })
        
        return {
            **state,
            'reasoning_output': reasoning,
            'current_step': 'reasoning'
        }
    
    def response_generator(state: GraphState) -> GraphState:
        """Generate the final response"""
        socketio.emit('workflow_progress', {
            'step': 'response_generation',
            'status': 'Generating final response...',
            'session_id': session_id
        })
        time.sleep(1)  # Simulate response generation
        
        final_response = f"Thank you for your question: '{state['user_input']}'. {state['analysis_result']} {state['reasoning_output']} I hope this comprehensive analysis helps address your inquiry!"
        
        socketio.emit('workflow_progress', {
            'step': 'response_generation',
            'status': 'Response generated successfully',
            'result': final_response,
            'session_id': session_id
        })
        
        return {
            **state,
            'final_response': final_response,
            'current_step': 'response_generation'
        }
    
    # Build the graph
    workflow = StateGraph(GraphState)
    
    # Add nodes
    workflow.add_node("input_processor", input_processor)
    workflow.add_node("analyzer", analyzer)
    workflow.add_node("reasoner", reasoner)
    workflow.add_node("response_generator", response_generator)
    
    # Add edges
    workflow.set_entry_point("input_processor")
    workflow.add_edge("input_processor", "analyzer")
    workflow.add_edge("analyzer", "reasoner")
    workflow.add_edge("reasoner", "response_generator")
    workflow.add_edge("response_generator", END)
    
    return workflow.compile()

def langgraph_stream_response(message, session_id):
    """Stream response using LangGraph workflow"""
    try:
        # Send start signal
        socketio.emit('stream_start', {
            'message_id': str(random.randint(1000, 9999)),
            'session_id': session_id,
            'workflow': 'langgraph_analysis'
        })
        
        # Create and run the graph
        graph = create_analysis_graph(session_id)
        
        # Initial state
        initial_state = {
            "messages": [],
            "user_input": message,
            "analysis_result": "",
            "reasoning_output": "",
            "final_response": "",
            "current_step": ""
        }
        
        # Execute the workflow
        result = graph.invoke(initial_state)
        
        # Stream the final response word by word
        socketio.emit('workflow_progress', {
            'step': 'streaming_response',
            'status': 'Streaming final response...',
            'session_id': session_id
        })
        
        final_response = result.get('final_response', 'No response generated')
        words = final_response.split()
        
        for word in words:
            socketio.emit('stream_chunk', {
                'content': word + " ",
                'session_id': session_id
            })
            time.sleep(0.1)
        
        # Send completion signal
        socketio.emit('stream_end', {
            'session_id': session_id,
            'final_state': {
                'steps_completed': ['input_processing', 'analysis', 'reasoning', 'response_generation'],
                'total_steps': 4
            }
        })
        
    except Exception as e:
        socketio.emit('stream_error', {
            'error': str(e),
            'session_id': session_id
        })

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')
    emit('connected', {'data': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')

@socketio.on('send_message')
def handle_message(data):
    message = data.get('message', '')
    session_id = data.get('session_id', request.sid)
    
    print(f'Received message: {message} from session: {session_id}')
    
    # Acknowledge receipt
    emit('message_received', {
        'message': message,
        'session_id': session_id
    })
    
    # Start LangGraph workflow in a separate thread
    thread = threading.Thread(
        target=langgraph_stream_response, 
        args=(message, session_id)
    )
    thread.daemon = True
    thread.start()

@app.route('/health')
def health_check():
    return {'status': 'healthy'}

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)