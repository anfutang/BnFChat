// src/hooks/useChat.js - With Result Events
import { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';

export const useChat = ({setMessageModal}) => {
  // Single source of truth states
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [explicitUserInputDisabled, setExplicitUserInputDisabled] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState('');
  const [detectedUserIntent, setDetectedUserIntent] = useState('');
  
  // User Data 
  const [userData, setUserData] = useState({});
  
  // User Feedback
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Socket Ref
  const socketRef = useRef(null);

  // ADD RESULT EVENT CALLBACKS
  const resultTriggeredCallbackRef = useRef(null);
  const resultDataCallbackRef = useRef(null);
  const resultErrorCallbackRef = useRef(null);
  const feedbackSavedCallbackRef = useRef(null);

  useEffect(() => {
    if (socketRef.current && isConnected && userData) {
      socketRef.current.emit('get_chat_state');
    }
  }, [isConnected, userData]);
  
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

        const socket = io(process.env.REACT_APP_SOCKET_URL || '', {
          auth: {
            userId: authData.user.userId
          }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          setIsConnected(true);
          setError(null);
          console.log('Socket connected');
          
          // Request initial data
          socket.emit('get_user_data');
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
          console.log('Socket disconnected');
        });

        // ==========  USER DATA EVENTS ==========
        socket.on('user_data_response', (data) => {
          setUserData(data);
          console.log(userData);
          socket.emit('get_chat_state');
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

        socket.on('mode_change_success', (data) => {
          console.log(`🟢 Success: ${data["message"]}`);
        })

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
          // console.log("📩 assistant_response received:", data);

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

        socket.on('generated_sru', (data) => {
          // setGeneratedSRU(data.sru);

          // Add SRU message
          const sruMessage = {
            id: `sru_${Date.now()}`,
            role: 'sru', 
            content: data.sru,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => {
            if (prev[prev.length - 1].role === 'assistant') {
              const updated = [...prev, sruMessage];
              return updated;
            } else {
              console.warn("⚠️ repeatitive adding message");
              return prev;
            }
          });
        })

        socket.on('gallica_retrieval_message', (data) => {
          // Add SRU message
          const gallicaMessage = {
            id: `gallica_${Date.now()}`,
            role: 'gallica', 
            content: data.message,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prev => {
            if (prev[prev.length - 1].role === 'sru') {
              const updated = [...prev, gallicaMessage];
              return updated;
            } else {
              console.warn("⚠️ repeatitive adding message");
              return prev;
            }
          });
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
        socket.on('conv_feedback_saved', (data) => {
          console.log('Feedback saved successfully:', data);
          if (feedbackSavedCallbackRef.current) {
            feedbackSavedCallbackRef.current(data);
          }
        });

        socket.on('feedback_status', (data) => {
          console.log(`📩 Feedback stauts: ${data.submitted}`);
          setFeedbackSubmitted(data.submitted);
        })

        socket.on('user_feedback_saved', (data) => {
          console.log(`User feedback saved successfully; user id: ${data.userId}`);
        })

        // ========== CHAT END EVENTS ==========
        socket.on('chat_ended', (data) => {
          console.log('Chat ended:', data.reason);
          setExplicitUserInputDisabled(false);
          setCurrentChatId(null);
          setMessages([]);
          setDetectedUserIntent('');
          setAssistantStatus();
          setIsStreaming(false);
        });

        socket.on('disable_user_input', () => {
          console.log('User input temporarily disabled explicitly.');
          setExplicitUserInputDisabled(true);
        });

        // socket.on('ongoing_chats_terminated', (data) => {
        //   console.log('Ongoing chats terminated:', data.reason);
        //   setCurrentChatId(null);
        //   setMessages([]);
        //   setDetectedUserIntent('');
        //   setAssistantStatus();
        //   setIsStreaming(false);
        // });

        // ========== SESSION CHANGE EVENTS ==========
        socket.on('test_ended_success', () => {
          console.log('🎉 Test ended successfully: quit.')
        });

        // ========== ERROR HANDLING ==========
        socket.on('error', (data) => {
          // setError(data.message);
          setMessageModal('warning',"Une erreur s'est produite",data["error"],'OK');
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
  const startNewChat = (end_chat_reason) => {
    socketRef.current.emit('start_new_chat', { end_chat_reason });
  };

  // Change session
  const changeMode = useCallback((mode) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('mode_change', { mode: mode });
    setUserData(prev => ({ ...prev, mode }));
  }, [isConnected]);

  // Select topic
  const selectTopic = useCallback((topicId) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('select_topic', { topicId });
  }, [isConnected]);

  // Get session data
  const getUserData = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('get_user_data');
  }, [isConnected]);

  // Get topics
  const getTopics = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('get_topics');
  }, [isConnected]);

  // Update Timer
  const updateTimer = useCallback((sessionId, timerValue) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('update_timer',{
      sessionId,
      timerValue
    });
  }, [isConnected])

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
    setIsStreaming,
    explicitUserInputDisabled,
    setExplicitUserInputDisabled,
    error,
    assistantStatus,
    detectedUserIntent,
    setDetectedUserIntent,
    setAssistantStatus,
    userData,
    setUserData,
    feedbackSubmitted,
    setFeedbackSubmitted,
    
    // Refs
    socketRef,
    
    // Actions
    sendMessage,
    getChatState,
    getUserData,
    clearError,
    setCurrentChatId,
    setMessages,
    startNewChat,
    changeMode,
    
    // ADD RESULT EVENT HANDLERS
    onResultsTriggered,
    onResultsData,
    onResultsError,
    onFeedbackSaved
  };
};

export default useChat;