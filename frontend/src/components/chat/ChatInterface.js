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
import useChatManager from '../../hooks/useChatManager';

const ChatInterface = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Session management
  const {
    currentSession,
    formattedTime,
    currentChatId,
    isTransitioning,
    transitionToNextSession,
    saveTimerToServer
  } = useSessionManager();
  
  // Chat management with SocketIO support
  const {
    messages,
    userInput,
    setUserInput,
    isFirstMessage,
    currentTopic,
    detectedIntent,
    showResultModal,
    resultData,
    isProcessingResult,
    isConnected,
    isLoading,
    thoughtProcess,
    socketError,
    currentStreamingMessage,
    messageListRef,
    sendMessage,
    handleRestart,
    handleAbandon,
    handleRequestResults,
    closeResultModal,
    reportError,
    clearError
  } = useChatManager(currentSession, currentChatId);

  // UI state
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Handle session transition
  const handleSessionTransition = useCallback(async () => {
    try {
      const result = await transitionToNextSession();
      
      if (result.error) {
        reportError?.('session_transition_error', 'Failed to transition between sessions');
      }
    } catch (error) {
      console.error("Session transition error:", error);
      reportError?.('session_transition_error', 'Failed to transition between sessions');
    }
  }, [transitionToNextSession, reportError]);

  // Handle message sending with validation
  const handleSendMessage = useCallback((message) => {
    if (!isConnected) {
      reportError?.('connection_error', 'No connection to server');
      return;
    }
    
    if (!message?.trim()) {
      return;
    }
    
    clearError?.();
    sendMessage(message);
  }, [isConnected, sendMessage, reportError, clearError]);

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
      await handleRestart();
      clearError?.();
    } catch (error) {
      reportError?.('restart_error', 'Failed to restart conversation');
    }
  }, [handleRestart, clearError, reportError]);

  const handleEnhancedAbandon = useCallback(async () => {
    try {
      await handleAbandon();
      clearError?.();
    } catch (error) {
      reportError?.('abandon_error', 'Failed to abandon conversation');
    }
  }, [handleAbandon, clearError, reportError]);

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
        isOpen={showResultModal}
        onClose={closeResultModal}
        resultData={resultData}
        isLoading={isProcessingResult}
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
    </div>
  );
};

export default ChatInterface;