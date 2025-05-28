// src/components/chat/ChatInterface.js - With Result Modal Integration
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useChat from '../../hooks/useChat';

import SessionSelector from './SessionSelector';
import ChatArea from './ChatArea';
import ResultModal from '../feedback/ResultModal';

import "./ChatInterface.css"

const ChatInterface = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [userInput, setUserInput] = useState('');
  
  // ADD RESULT MODAL STATE
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [isResultLoading, setIsResultLoading] = useState(false);
  
  const {
    currentChatId,
    messages,
    isConnected,
    isStreaming,
    error,
    assistantStatus,
    sessionData,
    topics,
    selectedTopic,
    sendMessage,
    getChatState,
    changeSession,
    selectTopic,
    clearError,
    // ADD RESULT EVENT HANDLERS
    onResultsTriggered,
    onResultsData,
    onResultsError,
    socketRef
  } = useChat();

  // ADD RESULT EVENT HANDLERS
  React.useEffect(() => {
    if (onResultsTriggered) {
      onResultsTriggered(() => {
        console.log("⭐ Results triggered - opening modal");
        setIsResultLoading(true);
        setIsResultModalOpen(true);
        setResultData(null);
      });
    }
  }, [onResultsTriggered]);

  React.useEffect(() => {
    if (onResultsData) {
      onResultsData((data) => {
        console.log("⭐ Results data received:", data);
        setResultData(data);
        setIsResultLoading(false);
      });
    }
  }, [onResultsData]);

  React.useEffect(() => {
    if (onResultsError) {
      onResultsError((error) => {
        console.log("⭐ Results error:", error);
        setIsResultLoading(false);
        // Keep modal open but show error state
      });
    }
  }, [onResultsError]);

  const handleSendMessage = useCallback((message) => {
    if (!message?.trim()) return;
    
    sendMessage(message);
    setUserInput('');
  }, [sendMessage]);

  const handleSessionChange = useCallback((newSessionId) => {
    changeSession(newSessionId);
  }, [changeSession]);

  const handleTopicSelect = useCallback((topic) => {
    selectTopic(topic.id);
  }, [selectTopic]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  }, [logout, navigate]);

  // ADD RESULT MODAL CLOSE HANDLER
  const handleCloseResultModal = useCallback(() => {
    setIsResultModalOpen(false);
    setResultData(null);
    setIsResultLoading(false);
  }, []);

  // Show loading while waiting for session data
  if (!sessionData) {
    return <div className="loading">Loading session...</div>;
  }

  return (
    <div className="chat-interface">
      <div className="chat-layout">
        
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="user-info">
              <div className="avatar">
                {currentUser?.username?.charAt(0).toUpperCase()}
              </div>
              <span>{currentUser?.username}</span>
              <div className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            </div>
          </div>
          
          <SessionSelector 
            sessionData={sessionData}
            topics={topics}
            selectedTopic={selectedTopic}
            onSessionChange={handleSessionChange}
            onTopicSelect={handleTopicSelect}
          />
          
          <div className="sidebar-footer">
            <button 
              onClick={handleLogout} 
              className="logout-btn"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Main Chat Area */}
        <div className="chat-container">
          <ChatArea 
            sessionData={sessionData}
            selectedTopic={selectedTopic}
            messages={messages}
            assistantStatus={assistantStatus}
            userInput={userInput}
            setUserInput={setUserInput}
            onSendMessage={handleSendMessage}
            isConnected={isConnected}
            isStreaming={isStreaming}
            currentChatId={currentChatId}
          />
        </div>
      </div>

      {/* ADD RESULT MODAL */}
      <ResultModal
        isOpen={isResultModalOpen}
        onClose={handleCloseResultModal}
        resultData={resultData}
        isLoading={isResultLoading}
        socketRef={socketRef}
      />

      {/* Error Display */}
      {error && (
        <div className="error-toast">
          <div className="error-content">
            <strong>Error:</strong> {error}
            <button onClick={clearError} className="error-close">×</button>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <div className="connection-status">
          🔴 Disconnected - Reconnecting...
        </div>
      )}
    </div>
  );
};

export default ChatInterface;