import React, { useState, useEffect, useCallback } from 'react';
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
  
  // Session management
  const {
    currentSession,
    formattedTime,
    currentChatId: sessionChatId, // Rename to avoid conflicts
    isTransitioning,
    transitionToNextSession,
    saveTimerToServer
  } = useSessionManager();
  
  // Unified chat management with SocketIO support
  const {
    // Chat state
    chatId,
    messages,
    userInput,
    setUserInput,
    isFirstMessage,
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
    
    // Actions
    sendMessage,
    abandonConversation,
    restartConversation,
    requestResults,
    requestChatState,
    clearError
  } = useChat(currentSession);

  // UI state for result modal
  const [uiState, setUiState] = useState({
    showResultModal: false,
    resultData: null,
    isProcessingResult: false
  });

  // UI state
  const [selectedTopic, setSelectedTopic] = useState(null);

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
        // Request fresh chat state after transition
        setTimeout(() => requestChatState(), 500);
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
      
      // Auto-fill message input with topic suggestion
      if (topic) {
        const suggestion = `Je recherche des informations sur ${topic.name}`;
        setUserInput(suggestion);
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

  // Listen for result data from unified chat hook
  useEffect(() => {
    // This would be handled through the socket events in useChat
    // We can add a callback prop to useChat if needed for result handling
  }, []);

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

      {/* Chat ID Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <small>
            Session: {currentSession} | 
            Chat ID: {chatId || 'none'} | 
            Messages: {messages.length}
          </small>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;