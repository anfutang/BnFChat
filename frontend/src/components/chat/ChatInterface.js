import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainContainer, Avatar } from '@chatscope/chat-ui-kit-react';

import './ChatInterface.css';
// Context
import { useAuth } from '../../context/AuthContext';

// Components
import SessionSelector from './SessionSelector';
import SessionNavigation from './SessionNavigation';
import ThoughtProcess from './ThoughtProcess';
import ChatArea from './ChatArea';
import ResultModal from '../feedback/ResultModal';

// Custom hooks
import useSessionManager from '../../hooks/useSessionManager';
import useChat from '../../hooks/useChat';

const ChatInterface = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Get socket reference from useChat first
  const {
    // Chat state
    chatId,
    messages,
    userInput,
    setUserInput,
    currentTopic,
    detectedIntent,
    
    // Connection state
    isConnected,
    isLoading,
    error: socketError,
    
    // Streaming state
    thoughtProcess,
    currentStreamingMessage,
    isStreaming,
    
    // Refs
    messageListRef,
    socketRef, // Get socket ref from useChat
    
    // Actions
    sendMessage,
    abandonConversation,
    restartConversation,
    requestResults,
    requestChatState,
    clearError
  } = useChat();

  // Session management with socket reference
  const {
    currentSession,
    formattedTime,
    currentChatId: sessionChatId,
    isTransitioning,
    transitionToNextSession,
    saveTimerToServer
  } = useSessionManager(socketRef); // Pass socket ref

  // UI state for result modal
  const [uiState, setUiState] = useState({
    showResultModal: false,
    resultData: null,
    isProcessingResult: false
  });

  // UI state
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Handle session changes from SocketIO
  useEffect(() => {
    if (socketRef?.current) {
      const socket = socketRef.current;

      const handleSessionChangeSuccess = (data) => {
        console.log('Session changed successfully via SocketIO:', data);
        // Request fresh chat state after session change
        setTimeout(() => requestChatState(), 500);
      };

      const handleOngoingChatsTerminated = (data) => {
        console.log('Ongoing chats terminated:', data);
        // Clear current chat state immediately
        // This will be handled by useChat's session change logic
      };

      socket.on('session_change_success', handleSessionChangeSuccess);
      socket.on('ongoing_chats_terminated', handleOngoingChatsTerminated);

      return () => {
        socket.off('session_change_success', handleSessionChangeSuccess);
        socket.off('ongoing_chats_terminated', handleOngoingChatsTerminated);
      };
    }
  }, [socketRef?.current, requestChatState]);

  // Sync session chat ID changes
  useEffect(() => {
    if (sessionChatId && sessionChatId !== chatId) {
      // Session manager has updated chat ID, request fresh state
      requestChatState();
    }
  }, [sessionChatId, chatId, requestChatState]);

  // Handle session transition
  const handleSessionTransition = useCallback(async () => {
    try {
      const result = await transitionToNextSession();
      
      if (result.error) {
        console.error('Session transition error');
      } else if (result.success) {
        // If using HTTP fallback, request fresh chat state
        if (result.method === 'http') {
          setTimeout(() => requestChatState(), 500);
        }
        // SocketIO method will be handled by the event listeners above
      }
    } catch (error) {
      console.error("Session transition error:", error);
    }
  }, [transitionToNextSession, requestChatState]);

  // Handle message sending with validation
  const handleSendMessage = useCallback((message) => {
    if (!isConnected) {
      console.error('No connection to server');
      return;
    }
    
    if (!message?.trim()) {
      return;
    }
    
    clearError?.();
    sendMessage(message);
  }, [isConnected, sendMessage, clearError]);

// Handle topic selection from navigator
const handleTopicChange = useCallback((topic) => {
  // Only handle topic changes for exercise and test sessions
  if (currentSession > 1) {
    setSelectedTopic(topic);
    
    // Don't auto-fill for "no topic" selection
    if (topic && topic.id > 0) {
      const suggestion = `Je recherche des informations sur ${topic.name}`;
      setUserInput(suggestion);
    } else if (topic && topic.id === 0) {
      // Clear input for free search
      setUserInput('');
    }
  }
}, [currentSession, setUserInput]);

  // Handle logout with cleanup
  const handleLogout = useCallback(async () => {
    try {
      await saveTimerToServer();
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login'); // Force navigation even on error
    }
  }, [saveTimerToServer, logout, navigate]);

  // Enhanced chat actions with error handling
  const handleEnhancedRestart = useCallback(async () => {
    try {
      await restartConversation();
      clearError?.();
    } catch (error) {
      console.error('Failed to restart conversation:', error);
    }
  }, [restartConversation, clearError]);

  const handleEnhancedAbandon = useCallback(async () => {
    try {
      await abandonConversation();
      clearError?.();
    } catch (error) {
      console.error('Failed to abandon conversation:', error);
    }
  }, [abandonConversation, clearError]);

  // Handle result requests
  const handleRequestResults = useCallback((queryData) => {
    setUiState(prev => ({ ...prev, isProcessingResult: true }));
    
    const success = requestResults(queryData);
    
    if (!success) {
      setUiState(prev => ({ ...prev, isProcessingResult: false }));
      console.error('Failed to request results');
    }
  }, [requestResults]);

  const closeResultModal = useCallback(() => {
    setUiState(prev => ({
      ...prev,
      showResultModal: false,
      resultData: null,
      isProcessingResult: false
    }));
  }, []);

  // Stop processing handler
  const handleStopProcessing = useCallback(() => {
    if (socketRef?.current?.connected && chatId) {
      socketRef.current.emit('stop_processing', { chat_id: chatId });
    }
  }, [socketRef, chatId]);

  return (
    <div className="chat-page">
      <div className="chat-layout">
        
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="user-info">
              <Avatar 
                src={`https://api.dicebear.com/7.x/micah/svg?seed=${currentUser?.username || 'default'}`} 
                name={currentUser?.username} 
                status={isConnected ? "available" : "away"} 
              />
              <span>{currentUser?.username}</span>
              <div className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
            </div>
          </div>
          
          <SessionSelector 
            currentSession={currentSession}
            formattedTime={formattedTime}
            currentTopic={currentTopic}
            detectedIntent={detectedIntent}
            onTopicChange={handleTopicChange}
          />
          
          <div className="sidebar-footer">
            <SessionNavigation 
              currentSession={currentSession}
              isTransitioning={isTransitioning}
              isConnected={isConnected}
              onNextSession={handleSessionTransition}
              onRestartChat={handleEnhancedRestart}
              onAbandonChat={handleEnhancedAbandon}
            />
            
            {/* Stop processing button when loading */}
            {(isLoading || isStreaming) && (
              <button 
                onClick={handleStopProcessing}
                className="stop-processing-btn"
                title="Arrêter le traitement en cours"
              >
                ⏹️ Arrêter
              </button>
            )}
            
            <button 
              onClick={handleLogout} 
              className="logout-btn"
              disabled={isTransitioning}
            >
              Déconnexion
            </button>
          </div>
        </div>
        
        {/* Main Chat Area */}
        <div className="chat-container">
          <MainContainer>
            <ChatArea 
              currentSession={currentSession}
              formattedTime={formattedTime}
              messages={messages}
              userInput={userInput}
              setUserInput={setUserInput}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              isConnected={isConnected}
              currentStreamingMessage={currentStreamingMessage}
              isStreaming={isStreaming}
              messageListRef={messageListRef}
              selectedTopic={selectedTopic}
              detectedIntent={detectedIntent}
              onRequestResults={handleRequestResults}
            />
          </MainContainer>
        </div>
        
        {/* Info Panel */}
        <div className="info-panel">
          <ThoughtProcess 
            thoughtProcess={thoughtProcess}
            isConnected={isConnected}
            socketError={socketError}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Result Modal */}
      <ResultModal
        isOpen={uiState.showResultModal}
        onClose={closeResultModal}
        resultData={uiState.resultData}
        isLoading={uiState.isProcessingResult}
      />

      {/* Global Error Toast */}
      {socketError && (
        <div className="error-toast">
          <div className="error-content">
            <strong>⚠️ Erreur:</strong> {socketError}
            <button onClick={clearError} className="error-close">×</button>
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      {!isConnected && (
        <div className="connection-status-indicator">
          🔴 Connexion interrompue - Reconnexion en cours...
        </div>
      )}

      {/* Session Transition Indicator */}
      {isTransitioning && (
        <div className="session-transition-indicator">
          🔄 Changement de session en cours...
        </div>
      )}

      {/* Chat ID Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <small>
            Session: {currentSession} | 
            Chat ID: {chatId || 'none'} | 
            Messages: {messages.length} |
            Socket: {isConnected ? '🟢' : '🔴'}
          </small>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;