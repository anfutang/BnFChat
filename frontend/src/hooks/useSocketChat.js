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

  // Initialize socket connection
  useEffect(() => {
    const initSocket = () => {
      socketRef.current = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        autoConnect: true
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
            messageId: data.message_id
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
            isSystemMessage: true
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
            clearHistory: true
          });
        }
      });

      socket.on('result_data', (data) => {
        console.log('Result data received:', data);
        // Handle result modal opening
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

    const socket = initSocket();

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [onNewMessage]);

  // Join session room when session changes
  useEffect(() => {
    if (socketRef.current && isConnected && currentSession) {
      socketRef.current.emit('join_session', {
        session_id: currentSession
      });
    }
  }, [currentSession, isConnected]);

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