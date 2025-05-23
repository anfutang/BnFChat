// src/components/chat/ChatInterface.js - Simplified with SocketIO-only
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useChat from '../../hooks/useChat';

import SessionSelector from './SessionSelector';
import ChatArea from './ChatArea';

import "./ChatInterface.css"

const ChatInterface = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [userInput, setUserInput] = useState('');
  
  const {
    currentChatId,
    messages,
    isConnected,
    isStreaming,
    error,
    sessionData,
    topics,
    selectedTopic,
    sendMessage,
    getChatState,
    changeSession,
    selectTopic,
    clearError
  } = useChat();

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
            userInput={userInput}
            setUserInput={setUserInput}
            onSendMessage={handleSendMessage}
            isConnected={isConnected}
            isStreaming={isStreaming}
            currentChatId={currentChatId}
          />
        </div>
      </div>

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