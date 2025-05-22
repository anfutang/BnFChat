import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import useSocketChat from './useSocketChat';

const useChatManager = (currentSession, currentChatId) => {
  const [chatState, setChatState] = useState({
    messages: [],
    userInput: '',
    isFirstMessage: true,
    currentTopic: null,
    detectedIntent: null
  });
  
  const [uiState, setUiState] = useState({
    showResultModal: false,
    resultData: null,
    isProcessingResult: false
  });
  
  const messageListRef = useRef(null);

  // Handle new messages from SocketIO
  const handleNewMessage = useCallback((messageData) => {
    console.log('New message received:', messageData);
    
    // Handle special message types
    if (messageData.clearHistory) {
      setChatState(prev => ({ 
        ...prev, 
        messages: [], 
        isFirstMessage: true,
        currentTopic: null,
        detectedIntent: null 
      }));
      return;
    }

    if (messageData.resultData) {
      setUiState(prev => ({
        ...prev,
        resultData: messageData.resultData,
        showResultModal: true,
        isProcessingResult: false
      }));
      return;
    }

    // Add message to chat history
    const formattedMessage = {
      id: Date.now() + Math.random(),
      content: messageData.message,
      role: messageData.sender === 'user' ? 'user' : 'assistant',
      timestamp: messageData.timestamp || new Date().toISOString(),
      isSystem: messageData.isSystemMessage || false
    };

    setChatState(prev => ({ 
      ...prev, 
      messages: [...prev.messages, formattedMessage],
      isFirstMessage: false
    }));

    // Auto-scroll to bottom
    setTimeout(() => {
      if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  // Handle stream_end event to capture topic and intent
  const handleStreamEnd = useCallback((data) => {
    if (data.detected_topic) {
      setChatState(prev => ({ ...prev, currentTopic: data.detected_topic }));
    }
    if (data.detected_intent) {
      setChatState(prev => ({ ...prev, detectedIntent: data.detected_intent }));
    }
  }, []);

  // Enhanced SocketIO with stream_end handling
  const {
    isConnected,
    isLoading,
    thoughtProcess,
    error: socketError,
    currentStreamingMessage,
    sendMessage: socketSendMessage,
    abandonConversation,
    restartConversation,
    reportError,
    requestResults,
    clearError
  } = useSocketChat(currentSession, currentChatId, handleNewMessage, handleStreamEnd);

  // Load chat history when session/chat changes
  useEffect(() => {
    if (currentSession > 1) {
      loadChatHistory(currentSession);
    } else {
      // Clear history for tutorial
      setChatState(prev => ({ 
        ...prev, 
        messages: [], 
        isFirstMessage: true,
        currentTopic: null,
        detectedIntent: null 
      }));
    }
  }, [currentSession, currentChatId]);

  // Load chat history from server
  const loadChatHistory = useCallback(async (sessionId) => {
    try {
      const response = await axios.get('/api/dev/chat-history', {
        params: { sessionId }
      });
      
      if (response.data.messages?.length > 0) {
        const formattedMessages = response.data.messages.map(msg => ({
          id: Date.now() + Math.random(),
          content: msg.message,
          role: msg.sender === 'user' ? 'user' : 'assistant',
          timestamp: msg.timestamp,
          isSystem: msg.isSystemMessage || false
        }));
        
        setChatState(prev => ({ 
          ...prev, 
          messages: formattedMessages,
          isFirstMessage: false
        }));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      reportError?.('data_load_error', 'Failed to load chat history');
    }
  }, [reportError]);

  // Send message
  const sendMessage = useCallback((message) => {
    if (!message?.trim() || !isConnected) {
      if (!isConnected) {
        reportError?.('connection_error', 'No connection to server');
      }
      return false;
    }

    clearError?.();
    setChatState(prev => ({ ...prev, userInput: '' }));
    
    return socketSendMessage(message.trim());
  }, [isConnected, socketSendMessage, clearError, reportError]);

  // Chat event handlers
  const handleRestart = useCallback(async () => {
    try {
      const success = restartConversation();
      if (success) {
        setChatState(prev => ({ 
          ...prev, 
          messages: [], 
          isFirstMessage: true, 
          userInput: '',
          currentTopic: null,
          detectedIntent: null
        }));
      }
    } catch (error) {
      console.error('Failed to restart chat:', error);
      reportError?.('restart_error', 'Failed to restart conversation');
    }
  }, [restartConversation, reportError]);

  const handleAbandon = useCallback(async () => {
    try {
      const success = abandonConversation();
      if (success) {
        setChatState(prev => ({ 
          ...prev, 
          messages: [], 
          isFirstMessage: true, 
          userInput: '',
          currentTopic: null,
          detectedIntent: null
        }));
      }
    } catch (error) {
      console.error('Failed to abandon chat:', error);
      reportError?.('abandon_error', 'Failed to abandon conversation');
    }
  }, [abandonConversation, reportError]);

  const handleRequestResults = useCallback((query) => {
    setUiState(prev => ({ ...prev, isProcessingResult: true }));
    const success = requestResults({ query });
    
    if (!success) {
      setUiState(prev => ({ ...prev, isProcessingResult: false }));
      reportError?.('result_request_error', 'Failed to request results');
    }
  }, [requestResults, reportError]);

  const closeResultModal = useCallback(() => {
    setUiState(prev => ({
      ...prev,
      showResultModal: false,
      resultData: null,
      isProcessingResult: false
    }));
  }, []);

  // Update topic and intent from workflow results
  useEffect(() => {
    if (thoughtProcess?.length > 0) {
      const latestStep = thoughtProcess[thoughtProcess.length - 1];
      
      if (latestStep.result && latestStep.step === 'intent_analysis') {
        setChatState(prev => ({ ...prev, detectedIntent: latestStep.result }));
      }
      
      if (latestStep.topic && latestStep.step === 'search_processing') {
        setChatState(prev => ({ ...prev, currentTopic: latestStep.topic }));
      }
    }
  }, [thoughtProcess]);

  return {
    // Chat state
    messages: chatState.messages,
    userInput: chatState.userInput,
    setUserInput: (value) => setChatState(prev => ({ ...prev, userInput: value })),
    isFirstMessage: chatState.isFirstMessage,
    currentTopic: chatState.currentTopic,
    detectedIntent: chatState.detectedIntent,
    
    // UI state
    showResultModal: uiState.showResultModal,
    resultData: uiState.resultData,
    isProcessingResult: uiState.isProcessingResult,
    
    // SocketIO state
    isConnected,
    isLoading,
    thoughtProcess,
    socketError,
    currentStreamingMessage,
    
    // Refs
    messageListRef,
    
    // Actions
    sendMessage,
    handleRestart,
    handleAbandon,
    handleRequestResults,
    closeResultModal,
    reportError,
    clearError
  };
};

export default useChatManager;