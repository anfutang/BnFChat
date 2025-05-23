// hooks/useChat.js

import { useState, useRef, useCallback, useEffect } from 'react';
import io from 'socket.io-client';

const useChat = (currentSession, onResultReceived) => {
  const [chatState, setChatState] = useState({
    chatId: null,
    messages: [],
    userInput: '',
    currentTopic: null,
    detectedIntent: null,
    isFirstMessage: true,
    actualSessionId: null
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
  const pendingUserMessages = useRef(new Set());
  const lastLoadedSession = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    initializeSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Load chat state when session changes or connection is established
  useEffect(() => {
    if (currentSession > 0 && socketRef.current?.connected) {
      // Only request chat state if session actually changed
      if (lastLoadedSession.current !== currentSession) {
        console.log(`Session changed from ${lastLoadedSession.current} to ${currentSession} - loading chat state`);
        lastLoadedSession.current = currentSession;
        requestChatState();
      }
    } else if (currentSession === 1) {
      // Tutorial - clear everything immediately
      clearChatState();
      lastLoadedSession.current = 1;
    }
  }, [currentSession, socketRef.current?.connected]);

  // Clear chat state helper
  const clearChatState = useCallback(() => {
    setChatState({
      chatId: null,
      messages: [],
      userInput: '',
      currentTopic: null,
      detectedIntent: null,
      isFirstMessage: true,
      actualSessionId: null
    });
    pendingUserMessages.current.clear();
    setStreamState({
      thoughtProcess: [],
      currentStreamingMessage: '',
      isStreaming: false
    });
  }, []);

  // Message deduplication helper
  const isDuplicateMessage = useCallback((newMessage, existingMessages) => {
    return existingMessages.some(msg => 
      msg.content === newMessage.content && 
      msg.role === newMessage.role &&
      Math.abs(new Date(msg.timestamp) - new Date(newMessage.timestamp)) < 5000 // 5 second window
    );
  }, []);

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
        
        // Load chat state for current session
        if (currentSession > 0) {
          setTimeout(() => requestChatState(), 100);
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
      socket.on('results_window_requested', handleConversationAction);
      socket.on('result_data', handleResultData);
      
      // Session change events
      socket.on('ongoing_chats_terminated', handleOngoingChatsTerminated);
      socket.on('session_change_success', handleSessionChangeSuccess);
      socket.on('session_change_error', handleSessionChangeError);
      
      // Error events
      socket.on('error', handleSocketError);

    } catch (error) {
      console.error('Socket initialization failed:', error);
      setConnectionState(prev => ({ ...prev, error: 'Connection failed' }));
    }
  };

  // Session change event handlers
  const handleOngoingChatsTerminated = useCallback((data) => {
    console.log('Ongoing chats terminated:', data);
    // Clear current chat state immediately
    clearChatState();
  }, [clearChatState]);

  const handleSessionChangeSuccess = useCallback((data) => {
    console.log('Session change successful:', data);
    
    // Update local session tracking
    lastLoadedSession.current = data.session_id;
    
    // Clear and request fresh chat state
    clearChatState();
    
    // Small delay then request new chat state
    setTimeout(() => {
      if (socketRef.current?.connected) {
        requestChatState();
      }
    }, 200);
  }, [clearChatState]);

  const handleSessionChangeError = useCallback((data) => {
    console.error('Session change error:', data);
    setConnectionState(prev => ({ 
      ...prev, 
      error: `Session change failed: ${data.error}` 
    }));
  }, []);

  // Event handlers
  const handleChatStateResponse = useCallback((data) => {
    console.log('Chat state received:', data);
    
    const formattedMessages = data.messages?.map(msg => ({
      id: `${msg.timestamp}-${msg.sender}-${msg.message.slice(0, 10)}`,
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
      isFirstMessage: formattedMessages.length === 0,
      actualSessionId: data.session_id  // Track actual session from server
    });
    
    // Clear pending messages since we got fresh state
    pendingUserMessages.current.clear();
    
    // Update last loaded session
    if (data.session_id) {
      lastLoadedSession.current = data.session_id;
    }
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
    
    // Remove from pending messages
    if (data.message) {
      pendingUserMessages.current.delete(data.message);
    }
    
    // Update chat ID if provided (especially important for first messages that create chats)
    if (data.chat_id && data.chat_id !== chatState.chatId) {
      console.log(`Updating chat ID from ${chatState.chatId} to ${data.chat_id}`);
      setChatState(prev => ({ ...prev, chatId: data.chat_id }));
    }
    
    // Update session tracking if provided
    if (data.session_id) {
      setChatState(prev => ({ ...prev, actualSessionId: data.session_id }));
    }
    
    // Log if chat was just created
    if (data.chat_created) {
      console.log('New chat created on first message');
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
    
    // Add complete message to chat (with deduplication)
    if (data.final_response) {
      const newMessage = {
        id: `${Date.now()}-assistant-${Math.random()}`,
        content: data.final_response,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        isSystem: false
      };

      setChatState(prev => {
        // Check for duplicates before adding
        if (!isDuplicateMessage(newMessage, prev.messages)) {
          return {
            ...prev,
            messages: [...prev.messages, newMessage],
            isFirstMessage: false,
            currentTopic: data.detected_topic || prev.currentTopic,
            detectedIntent: data.detected_intent || prev.detectedIntent
          };
        }
        return prev;
      });
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
  }, [isDuplicateMessage]);

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
    
    // Determine if this is an abandon action by checking the message content
    const isAbandon = data.message && data.message.includes('abandonner');
    const isRestart = data.new_chat_id || (data.message && data.message.includes('redémarrée'));
    const isResults = data.message && data.message.includes('évaluation');
    
    // Handle different action types
    if (isAbandon || isRestart) {
      // Clear messages for abandon and restart
      setChatState(prev => ({
        ...prev,
        chatId: data.new_chat_id || null,
        messages: [], // Always clear messages for abandon/restart
        isFirstMessage: true,
        currentTopic: null,
        detectedIntent: null
      }));
      
      // Clear pending messages
      pendingUserMessages.current.clear();
    }
    
    // Add system message if there's content
    if (data.message) {
      const systemMessage = {
        id: `${Date.now()}-system-${Math.random()}`,
        content: data.message,
        role: 'system',
        timestamp: new Date().toISOString(),
        isSystem: true
      };
      
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, systemMessage]
      }));
    }
    
    setTimeout(scrollToBottom, 100);
  }, []);

  const handleResultData = useCallback((data) => {
    console.log('Result data received:', data);
    
    // Add system message about results
    const systemMessage = {
      id: `${Date.now()}-system-result-${Math.random()}`,
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
    if (socketRef.current?.connected) {
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

    const messageContent = message.trim();
    
    // Check if this message is already pending (prevent spam)
    if (pendingUserMessages.current.has(messageContent)) {
      console.log('Message already pending, ignoring duplicate');
      return false;
    }

    // Add to pending messages
    pendingUserMessages.current.add(messageContent);

    // Add user message immediately (optimistic update)
    const userMessage = {
      id: `${Date.now()}-user-${Math.random()}`,
      content: messageContent,
      role: 'user',
      timestamp: new Date().toISOString(),
      isSystem: false
    };

    setChatState(prev => {
      // Check for duplicates before adding
      if (!isDuplicateMessage(userMessage, prev.messages)) {
        return {
          ...prev,
          messages: [...prev.messages, userMessage],
          userInput: '',
          isFirstMessage: false
        };
      }
      return { ...prev, userInput: '' };
    });

    // Note: chat_id can be null for first message - server will create chat
    socketRef.current.emit('send_message', {
      message: messageContent,
      chat_id: chatState.chatId, 
    });

    setTimeout(scrollToBottom, 100);
    return true;
  }, [connectionState.isConnected, chatState.chatId, isDuplicateMessage]);

  const abandonConversation = useCallback(() => {
    if (!connectionState.isConnected || !chatState.chatId) return false;
    
    socketRef.current.emit('send_message', {
      message: 'abandon',
      chat_id: chatState.chatId,
    });
    return true;
  }, [connectionState.isConnected, chatState.chatId]);

  const restartConversation = useCallback(() => {
    if (!connectionState.isConnected) return false;
    
    socketRef.current.emit('send_message', {
      message: 'recommencer',
      chat_id: chatState.chatId,
    });
    return true;
  }, [connectionState.isConnected, chatState.chatId]);

  const requestResults = useCallback((queryData) => {
    if (!connectionState.isConnected || !chatState.chatId) return false;
    
    socketRef.current.emit('send_message', {
      message: 'résultat',
      chat_id: chatState.chatId,
    });
    return true;
  }, [connectionState.isConnected, chatState.chatId]);

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
    actualSessionId: chatState.actualSessionId,
    
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
    socketRef,
    
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