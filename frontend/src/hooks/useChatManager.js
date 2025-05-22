import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import useSocketChat from './useSocketChat';

const useChatManager = (setShowSessionMessage, currentSession, currentChatId) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isFirstInput, setIsFirstInput] = useState(true);
  const [needsAnnotation, setNeedsAnnotation] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [timingData, setTimingData] = useState({});
  const [intentData, setIntentData] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState(null);
  const [processingResult, setProcessingResult] = useState(false);
  
  const messageListRef = useRef(null);

  // Handle new messages from SocketIO
  const handleNewMessage = useCallback((messageData) => {
    if (messageData.clearHistory) {
      setChatHistory([]);
      setIsFirstInput(true);
      return;
    }

    if (messageData.resultData) {
      setResultModalData(messageData.resultData);
      setShowResultModal(true);
      return;
    }

    setChatHistory(prev => [...prev, messageData]);

    // Scroll to bottom
    setTimeout(() => {
      if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  // Initialize SocketIO chat
  const {
    isConnected,
    isLoading: socketLoading,
    thoughtProcess,
    error: socketError,
    currentStreamingMessage,
    sendMessage: socketSendMessage,
    abandonConversation,
    restartConversation,
    reportError,
    requestResults,
    clearError
  } = useSocketChat(currentSession, currentChatId, handleNewMessage);

  // Load chat history from server
  const loadChatHistory = useCallback(async (sessionId) => {
    try {
      const response = await axios.get('/api/dev/chat-history', {
        params: { sessionId }
      });
      
      if (response.data.messages && response.data.messages.length > 0) {
        setChatHistory(response.data.messages);
        setIsFirstInput(false);
      } else {
        setChatHistory([]);
        setIsFirstInput(true);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setChatHistory([]);
      setIsFirstInput(true);
    }
  }, []);

  // Handle message submission
  const handleSubmit = useCallback((message, sessionId) => {
    if (!message || !message.trim()) {
      return;
    }

    // Clear any previous errors
    clearError();

    // Hide session message on first input
    if (isFirstInput) {
      setShowSessionMessage(false);
      setIsFirstInput(false);
    }

    // Clear user input
    setUserInput('');

    // Send via SocketIO
    const success = socketSendMessage(message.trim());
    
    if (!success) {
      // Fallback to HTTP if socket fails
      console.warn('Socket send failed, falling back to HTTP');
      // You could implement HTTP fallback here if needed
    }
  }, [isFirstInput, setShowSessionMessage, socketSendMessage, clearError]);

  // Handle annotation submission (legacy support)
  const handleAnnotationSubmit = useCallback(async (annotation) => {
    try {
      await axios.post('/api/dev/user-annotation', {
        convLabel: annotation
      });
      setNeedsAnnotation(false);
      setCurrentResponse('');
    } catch (error) {
      console.error('Failed to submit annotation:', error);
      reportError('annotation_error', 'Failed to submit annotation');
    }
  }, [reportError]);

  // Handle chat restart
  const handleRestartChat = useCallback(async () => {
    try {
      const success = restartConversation();
      
      if (success) {
        setChatHistory([]);
        setIsFirstInput(true);
        setUserInput('');
        setNeedsAnnotation(false);
        setCurrentResponse('');
        setShowSessionMessage(true);
      } else {
        // Fallback to HTTP
        const response = await axios.post('/api/dev/restart-chat');
        if (response.data.success) {
          setChatHistory([]);
          setIsFirstInput(true);
          setUserInput('');
          setNeedsAnnotation(false);
          setCurrentResponse('');
          setShowSessionMessage(true);
        }
      }
    } catch (error) {
      console.error('Failed to restart chat:', error);
      reportError('restart_error', 'Failed to restart conversation');
    }
  }, [restartConversation, setShowSessionMessage, reportError]);

  // Handle chat abandonment
  const handleAbandonChat = useCallback(async () => {
    try {
      const success = abandonConversation();
      
      if (success) {
        setChatHistory([]);
        setIsFirstInput(true);
        setUserInput('');
        setNeedsAnnotation(false);
        setCurrentResponse('');
        setShowSessionMessage(true);
      } else {
        // Fallback to HTTP
        const response = await axios.post('/api/dev/abandon-chat', {
          chatId: currentChatId,
          sessionId: currentSession
        });
        if (response.data.success) {
          setChatHistory([]);
          setIsFirstInput(true);
          setUserInput('');
          setNeedsAnnotation(false);
          setCurrentResponse('');
          setShowSessionMessage(true);
        }
      }
    } catch (error) {
      console.error('Failed to abandon chat:', error);
      reportError('abandon_error', 'Failed to abandon conversation');
    }
  }, [abandonConversation, currentChatId, currentSession, setShowSessionMessage, reportError]);

  // Handle result modal close
  const handleCloseResultModal = useCallback(() => {
    setShowResultModal(false);
    setResultModalData(null);
    setProcessingResult(false);
  }, []);

  // Request search results
  const handleRequestResults = useCallback((queryData) => {
    setProcessingResult(true);
    const success = requestResults(queryData);
    
    if (!success) {
      setProcessingResult(false);
      reportError('result_request_error', 'Failed to request results');
    }
  }, [requestResults, reportError]);

  return {
    // State
    chatHistory,
    setChatHistory,
    userInput,
    setUserInput,
    isLoading: socketLoading,
    isFirstInput,
    setIsFirstInput,
    needsAnnotation,
    currentResponse,
    messageListRef,
    thoughtProcess,
    timingData,
    intentData,
    showResultModal,
    resultModalData,
    processingResult,
    isConnected,
    socketError,
    currentStreamingMessage,

    // Functions
    loadChatHistory,
    handleSubmit,
    handleAnnotationSubmit,
    handleRestartChat,
    handleAbandonChat,
    handleCloseResultModal,
    handleRequestResults,
    setShowResultModal,
    setResultModalData,
    setProcessingResult,
    reportError,
    clearError
  };
};

export default useChatManager;