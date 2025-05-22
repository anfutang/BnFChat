import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const useSocketChat = (currentSession, currentChatId, onNewMessage) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [thoughtProcess, setThoughtProcess] = useState([]);
  const [error, setError] = useState(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const socketRef = useRef(null);
  const currentMessageRef = useRef('');

  // Get auth token function
  const getAuthToken = async () => {
    try {
      const response = await fetch('/api/dev/session-data', {
        credentials: 'include'
      });
      const data = await response.json();
      return data.userId;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      const userId = await getAuthToken();
      
      if (!userId) {
        setError('Impossible de récupérer les données d\'authentification');
        return;
      }

      socketRef.current = io('http://127.0.0.1:5001', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        withCredentials: true,
        forceNew: true,
        auth: {
          userId: userId  // Send user ID in auth
        }
      });

      const socket = socketRef.current;

      // Connection events
      socket.on('connect', () => {
        console.log('Connected to SocketIO server');
        setIsConnected(true);
        setError(null);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from SocketIO server');
        setIsConnected(false);
      });

      socket.on('connected', (data) => {
        console.log('Server connection confirmed:', data);
        if (data.status === 'connected_anonymous') {
          setError('Connexion non authentifiée');
        }
      });

      // Message handling events
      socket.on('message_received', (data) => {
        console.log('Message received by server:', data);
      });

      // Streaming events
      socket.on('stream_start', (data) => {
        console.log('Stream starting:', data);
        setIsLoading(true);
        setThoughtProcess([]);
        currentMessageRef.current = '';
        setCurrentStreamingMessage('');
      });

      socket.on('workflow_progress', (data) => {
        console.log('Workflow progress:', data);
        
        const progressMessage = {
          step: data.step,
          status: data.status,
          result: data.result,
          timestamp: new Date().toISOString()
        };
        
        setThoughtProcess(prev => [...prev, progressMessage]);
      });

      socket.on('stream_chunk', (data) => {
        currentMessageRef.current += data.content;
        setCurrentStreamingMessage(currentMessageRef.current);
      });

      socket.on('stream_end', (data) => {
        console.log('Stream ended:', data);
        setIsLoading(false);
        
        // Add the complete message to chat history
        if (onNewMessage && data.final_response) {
          onNewMessage({
            sender: 'bot',
            message: data.final_response,
            timestamp: new Date().toISOString(),
            messageId: data.message_id,
            detectedTopic: data.detected_topic,
            detectedIntent: data.detected_intent
          });
        }
        
        // Clear streaming state
        setCurrentStreamingMessage('');
        currentMessageRef.current = '';
      });

      socket.on('stream_error', (data) => {
        console.error('Stream error:', data);
        setIsLoading(false);
        setError(`Erreur de streaming: ${data.error}`);
        setCurrentStreamingMessage('');
        currentMessageRef.current = '';
      });

      // Chat event handlers
      socket.on('conversation_abandoned', (data) => {
        console.log('Conversation abandoned:', data);
        if (onNewMessage) {
          onNewMessage({
            sender: 'system',
            message: data.message,
            timestamp: new Date().toISOString(),
            isSystemMessage: true,
            newChatId: data.new_chat_id
          });
        }
      });

      socket.on('conversation_restarted', (data) => {
        console.log('Conversation restarted:', data);
        if (onNewMessage) {
          onNewMessage({
            sender: 'system',
            message: data.message,
            timestamp: new Date().toISOString(),
            isSystemMessage: true,
            clearHistory: true,
            newChatId: data.new_chat_id
          });
        }
      });

      socket.on('result_data', (data) => {
        console.log('Result data received:', data);
        if (onNewMessage) {
          onNewMessage({
            sender: 'system',
            message: 'Résultats de recherche disponibles',
            timestamp: new Date().toISOString(),
            isSystemMessage: true,
            resultData: data.results
          });
        }
      });

      socket.on('error_acknowledged', (data) => {
        console.log('Error acknowledged:', data);
        setError(null);
      });

      // General error handler
      socket.on('error', (data) => {
        console.error('Socket error:', data);
        setError(data.message || 'Erreur de connexion');
        setIsLoading(false);
      });

      return socket;
    };

    initSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onNewMessage]);

  // Send message function
  const sendMessage = useCallback((message) => {
    if (!socketRef.current || !isConnected) {
      setError('Pas de connexion au serveur');
      return false;
    }

    if (!message || !message.trim()) {
      setError('Message vide');
      return false;
    }

    setError(null);
    
    // Add user message to chat immediately
    if (onNewMessage) {
      onNewMessage({
        sender: 'user',
        message: message,
        timestamp: new Date().toISOString()
      });
    }

    // Send to server
    socketRef.current.emit('send_message', {
      message: message,
      chat_id: currentChatId,
      session_id: currentSession
    });

    return true;
  }, [isConnected, currentChatId, currentSession, onNewMessage]);

  // Abandon conversation
  const abandonConversation = useCallback(() => {
    if (!socketRef.current || !isConnected) {
      setError('Pas de connexion au serveur');
      return false;
    }

    socketRef.current.emit('abandon', {
      chat_id: currentChatId,
      session_id: currentSession
    });

    return true;
  }, [isConnected, currentChatId, currentSession]);

  // Restart conversation
  const restartConversation = useCallback(() => {
    if (!socketRef.current || !isConnected) {
      setError('Pas de connexion au serveur');
      return false;
    }

    socketRef.current.emit('recommencer', {
      session_id: currentSession
    });

    return true;
  }, [isConnected, currentSession]);

  // Report error
  const reportError = useCallback((errorType, errorMessage) => {
    if (!socketRef.current || !isConnected) {
      return false;
    }

    socketRef.current.emit('erreur', {
      error_type: errorType,
      error_message: errorMessage,
      chat_id: currentChatId,
      session_id: currentSession
    });

    return true;
  }, [isConnected, currentChatId, currentSession]);

  // Request results
  const requestResults = useCallback((queryData) => {
    if (!socketRef.current || !isConnected) {
      setError('Pas de connexion au serveur');
      return false;
    }

    socketRef.current.emit('resultat', {
      chat_id: currentChatId,
      query_data: queryData,
      session_id: currentSession
    });

    return true;
  }, [isConnected, currentChatId, currentSession]);

  return {
    isConnected,
    isLoading,
    thoughtProcess,
    error,
    currentStreamingMessage,
    sendMessage,
    abandonConversation,
    restartConversation,
    reportError,
    requestResults,
    clearError: () => setError(null)
  };
};

export default useSocketChat;