// src/components/chat/ChatInterface.js - With Result Modal Integration
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { Avatar } from '@chatscope/chat-ui-kit-react';

import { useAuth } from '../../context/AuthContext';
import useChat from '../../hooks/useChat';
import useTimer from '../../hooks/useTimer';

import SessionSelector from './SessionSelector';
import ChatArea from './ChatArea';

import ResultModal from '../feedback/ResultModal';
import FeedbackForm from '../feedback/FeedbackForm';
import MessageModal from "../feedback/MessageModal"; 

import "./ChatInterface.css"

const ChatInterface = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [userInput, setUserInput] = useState('');
  
  // ADD MESSAGE MODAL STATE
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalType, setMessageModalType] = useState('');
  const [messageModalTitle, setMessageModalTitle] = useState('');
  const [messageModalContent, setMessageModalContent] = useState('');
  const [messageModalConfirmButtonText, setMessageModalConfirmButtonText] = useState('');
  const [messageModalCloseButtonText, setMessageModalCloseButtonText] = useState('');
  const [onConfirmMessageModalFunc, setOnConfirmMessageModalFunc] = useState(() => () => {});
  const setMessageModalRef = useRef(() => {});

  // ADD RESULT MODAL STATE
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [isResultLoading, setIsResultLoading] = useState(false);

  // ADD FEEDBACK FORM STATE
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
    // ACTIONS
    sendMessage,
    getChatState,
    getSessionData,
    changeSession,
    selectTopic,
    clearError,
    setCurrentChatId,
    setMessages,
    eraseChat,
    updateTimer,
    // ADD RESULT EVENT HANDLERS
    onResultsTriggered,
    onResultsData,
    onResultsError,
    socketRef
  } = useChat();

  // Chat related
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

  // Session related
  const handleSessionChange = useCallback((newSessionId) => {
    changeSession(newSessionId);
  }, [changeSession]);

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

  const getNextSessionInfo = (sessionId) => {
    if (sessionId === 1) {
      return "Vous allez être dirigé vers : Exercise. Pourriez-vous confirmer ?";
    } else if (sessionId === 2) {
      return "Vous allez être dirigé vers : Test Officiel. Pourriez-vous confirmer ?";
    } else if (sessionId === 3) {
      return "Voulez-vous terminer le test ?";
    }
  };

  // timer
  const {
    formattedTime,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer
  } = useTimer({
    sessionData,
    getSessionData,
    updateTimer,
    handleSessionChange,
    setMessageModal: (...args) => setMessageModalRef.current(...args),
    setShowMessageModal
  });

  useEffect(() => {
    setMessageModalRef.current = (type, title, content, closeButtonText, confirmButtonText = '', onConfirmFunc = () => {}) => {
      // pause timer automatically when a modal popped-up
      if (isTimerRunning) {
        pauseTimer();
      }
  
      setMessageModalType(type);
      setMessageModalTitle(title);
      setMessageModalContent(content);
      setMessageModalConfirmButtonText(confirmButtonText);
      setMessageModalCloseButtonText(closeButtonText);
      setOnConfirmMessageModalFunc(() => onConfirmFunc);
      setShowMessageModal(true);
    };
  }, [isTimerRunning, pauseTimer]);

  
  // Topic related
  const handleTopicSelect = useCallback((topic) => {
    selectTopic(topic.id);
    setMessageModalRef.current('info','Changement du sujet',`Votre sujet actuel: ${topic.name}`,'OK');
  }, [selectTopic]);

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

  // logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  }, [logout, navigate]);

  const handleCloseResultModal = useCallback(() => {
    setIsResultModalOpen(false);
    setResultData(null);
    setIsResultLoading(false);
  }, []);

  // Show loading while waiting for session data
  if (!sessionData) {
    return <div className="loading">Chargement...</div>;
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
            formattedTime={formattedTime}
            isTimerRunning={isTimerRunning}
            startTimer={startTimer}
            pauseTimer={pauseTimer}
            resetTimer={resetTimer}
          />
          
          <div className="sidebar-footer">
          <button 
              onClick={handleEraseConv} 
              className="restart-btn"
            >
              <strong>Effacer</strong>
          </button>
          <button 
              onClick={() => setMessageModalRef.current('warning','Changement de session',getNextSessionInfo(sessionData.sessionId),'non','oui', handleSessionChange)} 
              // onClick={handleSessionChange}
              className="next-session-btn"
              disabled={sessionData.sessionId>=4}
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
            isTimerRunning={isTimerRunning}
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
        sessionData={sessionData}
        socketRef={socketRef}
      />

      {/* Message Display */}
      {showMessageModal && <MessageModal
        type={messageModalType}
        title={messageModalTitle}
        content={messageModalContent}
        confirmButtonText={messageModalConfirmButtonText}
        closeButtonText={messageModalCloseButtonText}
        onConfirmFunc={onConfirmMessageModalFunc}
        setShowMessageModal={setShowMessageModal}
        isTimerRunning={isTimerRunning}
        startTimer={startTimer}
        pauseTimer={pauseTimer}
      />}

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