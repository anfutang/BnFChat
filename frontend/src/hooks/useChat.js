// src/hooks/useChat.js - With Result Events
import { Message } from '@chatscope/chat-ui-kit-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';

export const useChat = () => {
  // Single source of truth states
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [assistantStatus, setAssistantStatus] = useState('');
  const [detectedUserIntent, setDetectedUserIntent] = useState('');
  
  // Session and topic data (via SocketIO)
  const [sessionData, setSessionData] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  const socketRef = useRef(null);

  // ADD RESULT EVENT CALLBACKS
  const resultTriggeredCallbackRef = useRef(null);
  const resultDataCallbackRef = useRef(null);
  const resultErrorCallbackRef = useRef(null);
  const feedbackSavedCallbackRef = useRef(null);

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

        socket.on('graph_update', (data) => {
          if (data.node === "finalize") {
            setIsStreaming(false);
          } else {
            setAssistantStatus(data.info);
          }
        });

        socket.on('assistant_response', (data) => {
          console.log("📩 assistant_response received:", data);

          // if (data.status.split(':')[0] !== "search") {
          //   setIsStreaming(false);
          // }
          setCurrentChatId(data.chat_id);
          
          // Add assistant message
          const assistantMessage = {
            id: `assistant_${Date.now()}`,
            role: 'assistant', 
            content: data.content,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => {
            if (prev[prev.length - 1].role === 'user') {
              const updated = [...prev, assistantMessage];
              return updated;
            } else {
              console.warn("⚠️ repeatitive adding message");
              return prev;
            }
          });
        });

        socket.on('user_intent', (data) => {
          setDetectedUserIntent(data.user_intent);
        })

        // ========== RESULT EVENTS ==========
        socket.on('results_triggered', (data) => {
          console.log('⭐ Results triggered event received:', data);
          if (resultTriggeredCallbackRef.current) {
            resultTriggeredCallbackRef.current();
          }
        });

        socket.on('results_data', (data) => {
          console.log('⭐ Results data event received:', data);
          if (resultDataCallbackRef.current) {
            resultDataCallbackRef.current(data);
          }
        });

        socket.on('results_error', (data) => {
          console.log('⭐ Results error event received:', data);
          if (resultErrorCallbackRef.current) {
            resultErrorCallbackRef.current(data);
          }
        });

        // ========== FEEDBACK EVENTS ==========
        socket.on('feedback_saved', (data) => {
          console.log('Feedback saved successfully:', data);
          if (feedbackSavedCallbackRef.current) {
            feedbackSavedCallbackRef.current(data);
          }
        });

        // ========== CHAT END EVENTS ==========
        socket.on('chat_ended', (data) => {
          console.log('Chat ended:', data.reason);
          setCurrentChatId(null);
          setMessages([]);
          setDetectedUserIntent('');
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

    setIsStreaming(true);

    socketRef.current.emit('send_message', {
      message: content.trim()
    });
  }, [isConnected]);

  // Get current chat state
  const getChatState = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('get_chat_state');
  }, [isConnected]);

  // Erase chat
  const eraseChat = () => {
    socketRef.current.emit('erase_chat');
  };

  // Change session
  const changeSession = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('session_change', { session_id: sessionData.sessionId+1 });
    console.log(typeof sessionData.sessionId); 
    sessionData.sessionId += 1;
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

  // ADD RESULT EVENT CALLBACK SETTERS
  const onResultsTriggered = useCallback((callback) => {
    resultTriggeredCallbackRef.current = callback;
  }, []);

  const onResultsData = useCallback((callback) => {
    resultDataCallbackRef.current = callback;
  }, []);

  const onResultsError = useCallback((callback) => {
    resultErrorCallbackRef.current = callback;
  }, []);

  const onFeedbackSaved = useCallback((callback) => {
    feedbackSavedCallbackRef.current = callback;
  }, []);

  return {
    // State
    currentChatId,
    messages,
    isConnected,
    isStreaming,
    error,
    assistantStatus,
    detectedUserIntent,
    setDetectedUserIntent,
    
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
    clearError,
    setCurrentChatId,
    setMessages,
    eraseChat,
    
    // ADD RESULT EVENT HANDLERS
    onResultsTriggered,
    onResultsData,
    onResultsError,
    onFeedbackSaved
  };
};

export default useChat;