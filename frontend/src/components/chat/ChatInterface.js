// src/components/chat/ChatInterface.js - With Result Modal Integration
import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { FaFeather } from 'react-icons/fa';
import { VscQuestion } from "react-icons/vsc";

import { useAuth } from '../../context/AuthContext';
import useChat from '../../hooks/useChat';

import AvatarDropdown from "./AvatarDropdown";
import ModeSelector from './ModeSelector';
import ChatArea from './ChatArea';

import ResultModal from '../feedback/ResultModal';
import FeedbackForm from '../feedback/FeedbackForm';
import MessageModal from "../feedback/MessageModal"; 

import FullTutorial from '../tutorial/fullTutorial';

import "./ChatInterface.css"

const ChatInterface = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // ADD USER INPUT STATE
  const [userInput, setUserInput] = useState('');
  
  // ADD MESSAGE MODAL STATE
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalType, setMessageModalType] = useState('');
  const [messageModalTitle, setMessageModalTitle] = useState('');
  const [messageModalContent, setMessageModalContent] = useState('');
  const [messageModalConfirmButtonText, setMessageModalConfirmButtonText] = useState('');
  const [messageModalCloseButtonText, setMessageModalCloseButtonText] = useState('');
  const [onConfirmMessageModalFunc, setOnConfirmMessageModalFunc] = useState(() => () => {});
  const setMessageModalRef = useRef((...args) => {
    console.warn("setMessageModal called too early", ...args);
  });
  const setMessageModal = (...args) => setMessageModalRef.current(...args);

  // OTHER INFORMATION MODAL
  const [showAboutInfoModal, setShowAboutInfoModal] = useState(false);
  const [showQAModal, setShowQAModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // ADD RESULT MODAL STATE
  const [resultData, setResultData] = useState(null);
  const [isResultLoading, setIsResultLoading] = useState(false);
  const [isResultLoaded, setIsResultLoaded] = useState(false);

  // ADD TUTORIAL STATE
  const [tutorialDone, setTutorialDone] = useState(true);
  const [backgroundBlur, setBackgroundBlur] = useState(false);
  
  const {
    currentChatId,
    messages,
    isConnected,
    isStreaming,
    setIsStreaming,
    explicitUserInputDisabled,
    setExplicitUserInputDisabled,
    error,
    // STATUS
    assistantStatus,
    detectedUserIntent,
    setDetectedUserIntent,
    setAssistantStatus,
    userData,
    setUserData,
    feedbackSubmitted,
    setFeedbackSubmitted,
    // ACTIONS
    sendMessage,
    getChatState,
    clearError,
    setCurrentChatId,
    setMessages,
    startNewChat,
    changeMode,
    // ADD RESULT EVENT HANDLERS
    onResultsTriggered,
    onResultsData,
    onResultsError,
    socketRef
  } = useChat({
    setMessageModal
  });

  // Chat related
  const handleSendMessage = useCallback((message) => {
    if (!message?.trim()) return;
    
    sendMessage(message);
    setUserInput('');
    
  }, [sendMessage,userData]);

  const handleNewChat = useCallback((end_chat_reason) => {
    setCurrentChatId(null);
    setMessages([]);
    setDetectedUserIntent('');
    setAssistantStatus();
    setIsStreaming(false);
    setResultData({});
    setIsResultLoaded(false);
    setIsResultLoading(false);
    startNewChat(end_chat_reason);
  }, [userData.mode, startNewChat]);

  // Mode change
  const handleModeChange = useCallback((mode) => {
    if (messages.length !== 0) {handleNewChat("end:user_mode_change");}
    handleNewChat("end:user_mode_change");
    changeMode(mode);
  }, [changeMode, handleNewChat]);

  useLayoutEffect(() => {
    setMessageModalRef.current = (type, title, content, closeButtonText, confirmButtonText = '', onConfirmFunc = () => {}) => {

      setMessageModalType(type);
      setMessageModalTitle(title);
      setMessageModalContent(content);
      setMessageModalConfirmButtonText(confirmButtonText);
      setMessageModalCloseButtonText(closeButtonText);
      setOnConfirmMessageModalFunc(() => onConfirmFunc);
      setShowMessageModal(true);
    };
  });

  // ADD RESULT EVENT HANDLERS
  useEffect(() => {
    if (onResultsTriggered) {
      onResultsTriggered(() => {
        console.log("⭐ Results triggered - opening modal");
        setIsResultLoading(true);
        // setIsResultModalOpen(true);
        setResultData(null);
      });
    }
  }, [onResultsTriggered]);

  useEffect(() => {
    if (onResultsData) {
        onResultsData((data) => {
        setResultData(data);
        setIsResultLoading(false);
        setIsResultLoaded(true);
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

  // const handleCloseResultModal = useCallback(() => {
  //   setResultData(null);
  //   setIsResultLoading(false);
  // }, []);

  // // Show loading while waiting for session data
  // if (!sessionData) {
  //   return <div className="loading">Chargement...</div>;
  // }

  return (
    <div className="chat-page">
      <div className="chat-layout">       
        <div className="info-bar" id="info-bar">
            <img src="/logo_bnfchat_black.png" className='logo-bnfchat' style={{ height:"6vh" }}/>
            <div className="app-btn-container">
              <ModeSelector userData={userData} handleModeChange={handleModeChange}/>
              <button id="faq-trigger" className="app-btn" onClick={() => setShowQAModal(true)}><VscQuestion size={30} color="white"/></button>
              <button id="feedback-trigger" className="app-btn" onClick={() => setShowFeedbackModal(true)}><FaFeather size={23} color="white"/></button>
              <AvatarDropdown 
                currentUser={currentUser} 
                isConnected={isConnected} 
                handleLogout={handleLogout} 
                setTutorialDone={setTutorialDone}
                setShowAboutInfoModal={setShowAboutInfoModal} 
              />
            </div>
        </div>
        
        <div className="chat-container">
          <ChatArea 
            userData={userData}
            messages={messages}
            assistantStatus={assistantStatus}
            detectedUserIntent={detectedUserIntent}
            userInput={userInput}
            setUserInput={setUserInput}
            onSendMessage={handleSendMessage}
            isConnected={isConnected}
            isStreaming={isStreaming}
            explicitUserInputDisabled={explicitUserInputDisabled}
            setExplicitUserInputDisabled={setExplicitUserInputDisabled}
            currentChatId={currentChatId}
            handleNewChat={handleNewChat}
            resultData={resultData}
            setResultData={setResultData}
            isResultLoading={isResultLoading}
            setIsResultLoading={setIsResultLoading}
            isResultLoaded={isResultLoaded}
            setIsResultLoaded={setIsResultLoaded}
            feedbackSubmitted={feedbackSubmitted}
            setFeedbackSubmitted={setFeedbackSubmitted}
            socketRef={socketRef}
            showAboutInfoModal={showAboutInfoModal}
            setShowAboutInfoModal={setShowAboutInfoModal}
            showQAModal={showQAModal}
            setShowQAModal={setShowQAModal}
            showFeedbackModal={showFeedbackModal}
            setShowFeedbackModal={setShowFeedbackModal}
          />
        </div>
      </div>

      {/* ADD RESULT MODAL */}
      {/* <ResultModal
        isOpen={isResultModalOpen}
        onClose={handleCloseResultModal}
        resultData={resultData}
        isLoading={isResultLoading}
        socketRef={socketRef}
      /> */}

      {/* <FeedbackForm 
        isOpen={sessionData.sessionId===4}
        sessionData={sessionData}
        socketRef={socketRef}
      /> */}

      {/* Message Display */}
      {showMessageModal && <MessageModal
        type={messageModalType}
        title={messageModalTitle}
        content={messageModalContent}
        confirmButtonText={messageModalConfirmButtonText}
        closeButtonText={messageModalCloseButtonText}
        onConfirmFunc={onConfirmMessageModalFunc}
        setShowMessageModal={setShowMessageModal}
      />}

      {/* Tutorial display */}
      {!tutorialDone && (
        <div className="tutorial-overlay" style={ (backgroundBlur ? { backdropFilter: "blur(3px)" } : {})}>
          <FullTutorial 
            onTutorialComplete={() => {setTutorialDone(true); document.querySelector('#next-session-btn')?.click();}}
            setBackgroundBlur={setBackgroundBlur} 
            setUserInput={setUserInput}
            setMessages={setMessages}
            setDetectedUserIntent={setDetectedUserIntent}
          />
        </div>
      )}

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