// src/components/chat/ChatInterface.js - With Result Modal Integration
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Avatar } from '@chatscope/chat-ui-kit-react';

import { useAuth } from '../../context/AuthContext';
import useChat from '../../hooks/useChat';

import SessionSelector from './SessionSelector';
import ChatArea from './ChatArea';
import ResultModal from '../feedback/ResultModal';
import FeedbackForm from '../feedback/FeedbackForm';

import "./ChatInterface.css"

const ChatInterface = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [userInput, setUserInput] = useState('');
  
  // ADD RESULT MODAL STATE
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [isResultLoading, setIsResultLoading] = useState(false);

  // add feedback form state
  const [isFeedbackFormOpen, setIsFeedbackFormOpen] = useState(false);
  
  const {
    currentChatId,
    messages,
    isConnected,
    isStreaming,
    error,
    assistantStatus,
    detectedUserIntent,
    setDetectedUserIntent,
    sessionData,
    topics,
    selectedTopic,
    sendMessage,
    getChatState,
    changeSession,
    selectTopic,
    clearError,
    setCurrentChatId,
    setMessages,
    eraseChat,
    // ADD RESULT EVENT HANDLERS
    onResultsTriggered,
    onResultsData,
    onResultsError,
    socketRef
  } = useChat();

  // ADD RESULT EVENT HANDLERS
  useEffect(() => {
    if (onResultsTriggered) {
      onResultsTriggered(() => {
        console.log("⭐ Results triggered - opening modal");
        setIsResultLoading(true);
        setIsResultModalOpen(true);
        setResultData(null);
      });
    }
  }, [onResultsTriggered]);

  useEffect(() => {
    if (onResultsData) {
      onResultsData((data) => {
        console.log("⭐ Results data received:", data);
        setResultData(data);
        setIsResultLoading(false);
      });
    }
  }, [onResultsData]);

  useEffect(() => {
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

  const handleEraseConv = useCallback(() => {
    setCurrentChatId(null);
    setMessages([]);
    setDetectedUserIntent('');
    eraseChat();
  }, []);

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

  // session id to session name
  const getSessionStatus = () => {
    switch (sessionData?.sessionId) {
      case 1: return "[Tutoriel] en cours..";
      case 2: return "[Exercise] en cours..";
      case 3: return "[Test Officiel] en cours..";
      case 4: return "Test Terminé."
      default: return "BnFChat";
    }
  };

  // Show loading while waiting for session data
  if (!sessionData) {
    return <div className="loading">Loading session...</div>;
  }

  return (
    <div className="chat-page">
      <div className="chat-layout">
        
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
          <div className="user-info">
              <Avatar 
                src={`https://api.dicebear.com/7.x/micah/svg?seed=${sessionData?.avatarSeed || 'default'}`} 
                name={currentUser?.username} 
                status={isConnected ? 'available' : 'away'}
              />
              <span style={{ fontStyle: 'bold' }}>{currentUser?.username} <br></br><span style={{ fontStyle: 'italic' }}>{getSessionStatus()}</span></span>
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
              onClick={handleEraseConv} 
              className="restart-btn"
            >
              <strong>Effacer</strong>
          </button>
          <button 
              onClick={handleSessionChange} 
              className="next-session-btn"
            >
              <strong>Session Prochaine</strong>
            </button>
            <button 
              onClick={handleLogout} 
              className="logout-btn"
            >
              <strong>Se Déconncter</strong>
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
            detectedUserIntent={detectedUserIntent}
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

      <FeedbackForm 
        isOpen={sessionData.sessionId===4}
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