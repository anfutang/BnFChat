
// src/hooks/useChat.js - ALL non-auth operations via SocketIO
import { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';

export const useChat = () => {
  // Single source of truth states
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  
  // Session and topic data (via SocketIO)
  const [sessionData, setSessionData] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  const socketRef = useRef(null);


  useEffect(() => {
    if (socketRef.current && isConnected && sessionData) {
      socketRef.current.emit('get_chat_state');
    }
  }, [isConnected, sessionData]);
  
  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        // Get current user ID for socket auth
        const authResponse = await fetch('/api/auth/check-auth');
        const authData = await authResponse.json();
        
        if (!authData.authenticated) {
          setError('Not authenticated');
          return;
        }

        const socket = io('http://127.0.0.1:5001/', {
          auth: {
            userId: authData.user.id
          }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          setIsConnected(true);
          setError(null);
          console.log('Socket connected');
          
          // Request initial data
          socket.emit('get_session_data');
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
          console.log('Socket disconnected');
        });

        // ========== SESSION DATA EVENTS ==========
        socket.on('session_data_response', (data) => {
          setSessionData(data);
          // Also request topics for current session
          socket.emit('get_topics');
          socket.emit('get_chat_state');
        });

        // ========== TOPIC EVENTS ==========
        socket.on('topics_response', (data) => {
          setTopics(data.topics);
          
          // Set current topic if available
          if (data.currentTopicId > 0) {
            const currentTopic = data.topics.find(t => t.id === data.currentTopicId);
            setSelectedTopic(currentTopic);
          } else {
            setSelectedTopic(null);
          }
        });

        socket.on('topic_selected', (data) => {
          if (data.success) {
            setSelectedTopic(data.topicInfo);
            
            // Clear chat state if chat was ended
            if (data.chatEnded) {
              setCurrentChatId(null);
              setMessages([]);
            }
          }
        });

        // ========== CHAT EVENTS ==========
        socket.on('chat_state_response', (data) => {
          if (data.chat) {
            setCurrentChatId(data.chat.id);
            setMessages(data.chat.messages || []);
          } else {
            setCurrentChatId(null);
            setMessages([]);
          }
        });

        socket.on('message_received', (data) => {
          const userMessage = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: data.message,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, userMessage]);
        });

        // ========== STREAMING EVENTS ==========
        socket.on('stream_start', (data) => {
          setIsStreaming(true);
          setCurrentChatId(data.chat_id);
          // Add AI message placeholder
          setMessages(prev => [...prev, {
            id: `temp_${Date.now()}`,
            role: 'assistant',
            content: '',
            isStreaming: true
          }]);
        });

        socket.on('stream_chunk', (data) => {
          setMessages(prev => prev.map(msg => 
            msg.isStreaming ? 
              { ...msg, content: msg.content + data.content } : 
              msg
          ));
        });

        socket.on('stream_end', (data) => {
          setIsStreaming(false);
          setMessages(prev => prev.map(msg => 
            msg.isStreaming ? 
              { ...msg, isStreaming: false, id: `assistant_${Date.now()}` } : 
              msg
          ));
        });

        // ========== CHAT END EVENTS ==========
        socket.on('chat_ended', (data) => {
          console.log('Chat ended:', data.reason);
          setCurrentChatId(null);
          setMessages([]);
        });

        socket.on('ongoing_chats_terminated', (data) => {
          console.log('Ongoing chats terminated:', data.reason);
          setCurrentChatId(null);
          setMessages([]);
        });

        // ========== SESSION CHANGE EVENTS ==========
        socket.on('session_change_success', (data) => {
          console.log('Session changed successfully:', data.session_id);
          setCurrentChatId(null);
          setMessages([]);
          
          // Request fresh data
          socket.emit('get_session_data');
        });

        // ========== ERROR HANDLING ==========
        socket.on('error', (data) => {
          setError(data.message);
          console.error('Socket error:', data);
        });

      } catch (error) {
        setError('Failed to initialize socket connection');
        console.error('Socket init error:', error);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // ========== SOCKET ACTIONS ==========
  
  // Send message
  const sendMessage = useCallback((content) => {
    if (!socketRef.current || !isConnected) {
      setError('Not connected to server');
      return;
    }

    if (!content?.trim()) {
      return;
    }

    socketRef.current.emit('send_message', {
      message: content.trim()
    });
  }, [isConnected]);

  // Get current chat state
  const getChatState = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('get_chat_state');
  }, [isConnected]);

  // Change session
  const changeSession = useCallback((sessionId) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('session_change', { session_id: sessionId });
  }, [isConnected]);

  // Select topic
  const selectTopic = useCallback((topicId) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('select_topic', { topicId });
  }, [isConnected]);

  // Get session data
  const getSessionData = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('get_session_data');
  }, [isConnected]);

  // Get topics
  const getTopics = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('get_topics');
  }, [isConnected]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    currentChatId,
    messages,
    isConnected,
    isStreaming,
    error,
    
    // Session and topic data
    sessionData,
    topics,
    selectedTopic,
    
    // Refs
    socketRef,
    
    // Actions
    sendMessage,
    getChatState,
    changeSession,
    selectTopic,
    getSessionData,
    getTopics,
    clearError
  };
};

export default useChat;
