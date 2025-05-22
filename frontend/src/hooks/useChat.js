// hooks/useChat.js - Single source of truth for chat state

import { useState, useRef, useCallback, useEffect } from 'react';
import io from 'socket.io-client';

const useChat = (currentSession, onResultReceived) => {
  // Core chat state - single source of truth
  const [chatState, setChatState] = useState({
    chatId: null,
    messages: [],
    userInput: '',
    currentTopic: null,
    detectedIntent: null,
    isFirstMessage: true
  });
  
  // Connection and UI state
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    isLoading: false,
    error: null
  });
  
  // Streaming state
  const [streamState, setStreamState] = useState({
    thoughtProcess: [],
    currentStreamingMessage: '',
    isStreaming: false
  });
  
  const socketRef = useRef(null);
  const messageListRef = useRef(null);
  const currentMessageRef = useRef('');
  const [needsChatStateLoad, setNeedsChatStateLoad] = useState(false);
  // Initialize socket connection
  useEffect(() => {
    initializeSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Load chat state when session changes
  useEffect(() => {
    if (currentSession > 1 && socketRef.current?.connected) {
      requestChatState();
    } else if (currentSession === 1) {
      // Tutorial - clear everything
      setChatState({
        chatId: null,
        messages: [],
        userInput: '',
        currentTopic: null,
        detectedIntent: null,
        isFirstMessage: true
      });
    }
  }, [currentSession]);

  useEffect(() => {
    if (currentSession > 1 && socketRef.current?.connected) {
      console.log(`Loading chat state for session ${currentSession}`);
      requestChatState();
      setNeedsChatStateLoad(false);
    } else if (currentSession === 1) {
      // Tutorial - clear everything
      setChatState({
        chatId: null,
        messages: [],
        userInput: '',
        currentTopic: null,
        detectedIntent: null,
        isFirstMessage: true
      });
      setNeedsChatStateLoad(false);
    } else if (currentSession > 1 && !socketRef.current?.connected) {
      // Mark that we need to load chat state once connected
      setNeedsChatStateLoad(true);
    }
  }, [currentSession, socketRef.current?.connected]);

  const initializeSocket = async () => {
    try {
      // Get auth data
      const response = await fetch('/api/dev/session-data', { credentials: 'include' });
      const { userId } = await response.json();

      if (!userId) {
        setConnectionState(prev => ({ ...prev, error: 'Authentication failed' }));
        return;
      }

      // Create socket connection
      socketRef.current = io('http://127.0.0.1:5001', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        withCredentials: true,
        forceNew: true,
        auth: { userId }
      });

      const socket = socketRef.current;
      
      // Connection events
      socket.on('connect', () => {
        console.log('Socket connected');
        setConnectionState(prev => ({ ...prev, isConnected: true, error: null }));
        
        // ✅ Load chat state immediately if needed (for page refresh scenario)
        if (currentSession > 1 || needsChatStateLoad) {
          console.log(`Socket connected - requesting chat state for session ${currentSession}`);
          setTimeout(() => requestChatState(), 100); // Small delay to ensure socket is fully ready
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnectionState(prev => ({ ...prev, isConnected: false }));
      });

      // Chat state events
      socket.on('chat_state_response', handleChatStateResponse);
      socket.on('chat_state_updated', handleChatStateUpdate);
      
      // Message events
      socket.on('message_received', handleMessageReceived);
      
      // Streaming events
      socket.on('stream_start', handleStreamStart);
      socket.on('workflow_progress', handleWorkflowProgress);
      socket.on('stream_chunk', handleStreamChunk);
      socket.on('stream_end', handleStreamEnd);
      socket.on('stream_error', handleStreamError);
      
      // Chat action events
      socket.on('conversation_abandoned', handleConversationAction);
      socket.on('conversation_restarted', handleConversationAction);
      socket.on('result_data', handleResultData);
      
      // Error events
      socket.on('error', handleSocketError);

    } catch (error) {
      console.error('Socket initialization failed:', error);
      setConnectionState(prev => ({ ...prev, error: 'Connection failed' }));
    }
  };

  // Event handlers
  const handleChatStateResponse = useCallback((data) => {
    console.log('Chat state received:', data);
    
    const formattedMessages = data.messages?.map(msg => ({
      id: Date.now() + Math.random(),
      content: msg.message,
      role: msg.sender === 'user' ? 'user' : 'assistant',
      timestamp: msg.timestamp,
      isSystem: false
    })) || [];

    setChatState({
      chatId: data.chat_id,
      messages: formattedMessages,
      userInput: '',
      currentTopic: data.topic,
      detectedIntent: null,
      isFirstMessage: formattedMessages.length === 0
    });
  }, []);

  const handleChatStateUpdate = useCallback((data) => {
    console.log('Chat state updated:', data);
    
    // Update chat ID if it changed
    if (data.chat_id && data.chat_id !== chatState.chatId) {
      setChatState(prev => ({ ...prev, chatId: data.chat_id }));
    }
  }, [chatState.chatId]);

  const handleMessageReceived = useCallback((data) => {
    console.log('Message received confirmation:', data);
    
    // Update chat ID if provided
    if (data.chat_id && data.chat_id !== chatState.chatId) {
      setChatState(prev => ({ ...prev, chatId: data.chat_id }));
    }
  }, [chatState.chatId]);

  const handleStreamStart = useCallback((data) => {
    console.log('Stream starting:', data);
    setStreamState({
      thoughtProcess: [],
      currentStreamingMessage: '',
      isStreaming: true
    });
    setConnectionState(prev => ({ ...prev, isLoading: true }));
    currentMessageRef.current = '';
  }, []);

  const handleWorkflowProgress = useCallback((data) => {
    const progressStep = {
      step: data.step,
      status: data.status,
      result: data.result,
      topic: data.topic,
      timestamp: new Date().toISOString()
    };
    
    setStreamState(prev => ({
      ...prev,
      thoughtProcess: [...prev.thoughtProcess, progressStep]
    }));

    // Update topic if detected
    if (data.topic) {
      setChatState(prev => ({ ...prev, currentTopic: data.topic }));
    }
  }, []);

  const handleStreamChunk = useCallback((data) => {
    currentMessageRef.current += data.content;
    setStreamState(prev => ({
      ...prev,
      currentStreamingMessage: currentMessageRef.current
    }));
  }, []);

  const handleStreamEnd = useCallback((data) => {
    console.log('Stream ended:', data);
    
    setConnectionState(prev => ({ ...prev, isLoading: false }));
    setStreamState(prev => ({ ...prev, isStreaming: false }));
    
    // Add complete message to chat
    if (data.final_response) {
      const newMessage = {
        id: Date.now() + Math.random(),
        content: data.final_response,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        isSystem: false
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage],
        isFirstMessage: false,
        currentTopic: data.detected_topic || prev.currentTopic,
        detectedIntent: data.detected_intent || prev.detectedIntent
      }));
    }
    
    // Clear streaming state
    setStreamState(prev => ({
      ...prev,
      currentStreamingMessage: '',
      isStreaming: false
    }));
    currentMessageRef.current = '';
    
    // Auto-scroll
    setTimeout(scrollToBottom, 100);
  }, []);

  const handleStreamError = useCallback((data) => {
    console.error('Stream error:', data);
    setConnectionState(prev => ({ 
      ...prev, 
      isLoading: false, 
      error: `Stream error: ${data.error}` 
    }));
    setStreamState(prev => ({ 
      ...prev, 
      currentStreamingMessage: '', 
      isStreaming: false 
    }));
    currentMessageRef.current = '';
  }, []);

  const handleConversationAction = useCallback((data) => {
    console.log('Conversation action:', data);
    
    // Update chat ID
    if (data.new_chat_id) {
      setChatState(prev => ({
        ...prev,
        chatId: data.new_chat_id,
        messages: [],
        isFirstMessage: true,
        currentTopic: null,
        detectedIntent: null
      }));
    }
    
    // Add system message
    const systemMessage = {
      id: Date.now() + Math.random(),
      content: data.message,
      role: 'system',
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage]
    }));
    
    setTimeout(scrollToBottom, 100);
  }, []);

  const handleResultData = useCallback((data) => {
    console.log('Result data received:', data);
    
    // Add system message about results
    const systemMessage = {
      id: Date.now() + Math.random(),
      content: 'Résultats de recherche disponibles',
      role: 'system',
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage]
    }));
    
    // If onResultReceived callback is provided, call it
    if (onResultReceived) {
      onResultReceived(data.results);
    }
    
    setTimeout(scrollToBottom, 100);
  }, [onResultReceived]);

  const handleSocketError = useCallback((data) => {
    console.error('Socket error:', data);
    setConnectionState(prev => ({ 
      ...prev, 
      error: data.message || 'Socket error',
      isLoading: false 
    }));
  }, []);

  // Actions
  const requestChatState = useCallback(() => {
    if (socketRef.current?.connected && currentSession > 0) {
      console.log(`Requesting chat state for session ${currentSession}`);
      socketRef.current.emit('get_chat_state', { session_id: currentSession });
    } else {
      console.warn(`Cannot request chat state - connected: ${socketRef.current?.connected}, session: ${currentSession}`);
    }
  }, [currentSession]);


  const sendMessage = useCallback((message) => {
    if (!message?.trim() || !connectionState.isConnected) {
      return false;
    }

    // Add user message immediately
    const userMessage = {
      id: Date.now() + Math.random(),
      content: message.trim(),
      role: 'user',
      timestamp: new Date().toISOString(),
      isSystem: false
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      userInput: '',
      isFirstMessage: false
    }));

    // Send to server
    socketRef.current.emit('send_message', {
      message: message.trim(),
      chat_id: chatState.chatId,
      session_id: currentSession
    });

    setTimeout(scrollToBottom, 100);
    return true;
  }, [connectionState.isConnected, chatState.chatId, currentSession]);

  const abandonConversation = useCallback(() => {
    if (!connectionState.isConnected || !chatState.chatId) return false;
    
    socketRef.current.emit('abandon', {
      chat_id: chatState.chatId,
      session_id: currentSession
    });
    return true;
  }, [connectionState.isConnected, chatState.chatId, currentSession]);

  const restartConversation = useCallback(() => {
    if (!connectionState.isConnected) return false;
    
    socketRef.current.emit('recommencer', {
      chat_id: chatState.chatId,
      session_id: currentSession
    });
    return true;
  }, [connectionState.isConnected, chatState.chatId, currentSession]);

  const requestResults = useCallback((queryData) => {
    if (!connectionState.isConnected || !chatState.chatId) return false;
    
    socketRef.current.emit('resultat', {
      chat_id: chatState.chatId,
      query_data: queryData,
      session_id: currentSession
    });
    return true;
  }, [connectionState.isConnected, chatState.chatId, currentSession]);

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  const clearError = useCallback(() => {
    setConnectionState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // Chat state
    chatId: chatState.chatId,
    messages: chatState.messages,
    userInput: chatState.userInput,
    setUserInput: (value) => setChatState(prev => ({ ...prev, userInput: value })),
    isFirstMessage: chatState.isFirstMessage,
    currentTopic: chatState.currentTopic,
    detectedIntent: chatState.detectedIntent,
    
    // Connection state
    isConnected: connectionState.isConnected,
    isLoading: connectionState.isLoading,
    error: connectionState.error,
    
    // Streaming state
    thoughtProcess: streamState.thoughtProcess,
    currentStreamingMessage: streamState.currentStreamingMessage,
    isStreaming: streamState.isStreaming,
    
    // Refs
    messageListRef,
    
    // Actions
    sendMessage,
    abandonConversation,
    restartConversation,
    requestResults,
    requestChatState,
    clearError
  };
};

export default useChat;