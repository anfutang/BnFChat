import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Joyride, { STATUS } from 'react-joyride';
import { 
  MainContainer,
  Avatar
} from '@chatscope/chat-ui-kit-react';

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
  
  // Session data
  const [sessionData, setSessionData] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSteps, setTutorialSteps] = useState([]);
  const [isTransitioningSession, setIsTransitioningSession] = useState(false);
  
  // Use session manager hook
  const {
    currentSession,
    sessionTimer,
    showSessionMessage,
    setShowSessionMessage,
    sessionEndAlert,
    tutorialMode,
    tutorialStep,
    showGuides,
    currentChatId, // Get current chat ID from session manager
    handleNextSession,
    handleNextTutorialStep,
    handleRestartTutorial,
    handleExitTutorial,
    handleCompleteTutorial,
    handleConfirmTutorial,
    cleanupSessionTimer
  } = useSessionManager();
  
  // Use chat manager hook with session context
  const {
    chatHistory,
    setChatHistory,
    userInput,
    setUserInput,
    isLoading,
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
    loadChatHistory,
    handleSubmit,
    handleAnnotationSubmit,
    handleRestartChat,
    handleAbandonChat,
    handleCloseResultModal,
    setShowResultModal,
    setResultModalData,
    setProcessingResult
  } = useChatManager(setShowSessionMessage, currentSession, currentChatId);

  const memoizedCloseHandler = useCallback(() => {
    handleCloseResultModal();
  }, [handleCloseResultModal]);
  
  // Load session data and chat history
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const sessionResponse = await axios.get('/api/dev/session-data');
        setSessionData(sessionResponse.data);
        
        // Load chat history if not in tutorial mode
        if (sessionResponse.data.sessionId !== 1) {
          await loadChatHistory(sessionResponse.data.sessionId);
        } else {
          // Clear chat history if in tutorial mode
          setChatHistory([]);
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Effect to handle session changes
  useEffect(() => {
    if (currentSession && sessionData && sessionData.sessionId !== currentSession && !isTransitioningSession) {
      // Update session data in state
      setSessionData(prev => ({
        ...prev,
        sessionId: currentSession
      }));
      
      // Load the chat history for this session
      loadChatHistory(currentSession);
    }
  }, [currentSession, sessionData]);
  
  // Clean up resources on close
  useEffect(() => {
    return () => {
      cleanupSessionTimer();
    };
  }, []);

  // Handle Joyride tutorial callback
  const handleTutorialCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setShowTutorial(false);
    }
  };
  
  // Handle message submission
  const handleSendMessage = (message) => {
    handleSubmit(message, currentSession);
  };
  
  // Handle guide selection
  const handleSelectGuide = (sampleQuery) => {
    setUserInput(sampleQuery);
    // Focus on message input
    setTimeout(() => {
      const inputElement = document.querySelector('.cs-message-input__content-editor');
      if (inputElement) {
        inputElement.focus();
      }
    }, 100);
  };
  
  // Handle session transition
  const handleSessionTransition = async () => {
    setIsTransitioningSession(true);
    
    try {
      const result = await handleNextSession();
      
      if (result.resetChat) {
        // Clear chat history completely before moving to next session
        setChatHistory([]);
        setIsFirstInput(true);
        
        // If a new chat ID was returned, load that chat after a small delay
        if (result.chatId) {
          setTimeout(() => {
            loadChatHistory(currentSession + 1);
            setIsTransitioningSession(false);
          }, 500);
        } else {
          setIsTransitioningSession(false);
        }
      } else {
        setIsTransitioningSession(false);
      }
    } catch (error) {
      console.error("Error during session transition:", error);
      setIsTransitioningSession(false);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      cleanupSessionTimer();
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <div className="chat-page">
      {/* Tutorial */}
      {showTutorial && !tutorialMode && (
        <Joyride
          steps={tutorialSteps}
          run={showTutorial}
          continuous
          showProgress
          showSkipButton
          callback={handleTutorialCallback}
          styles={{
            options: {
              zIndex: 10000,
            },
          }}
        />
      )}

      {/* Main interface */}
      <div className="chat-layout">
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="user-info">
              <Avatar 
                src={`https://api.dicebear.com/7.x/micah/svg?seed=${sessionData?.avatarSeed || 'default'}`} 
                name={currentUser?.username} 
                status="available" 
              />
              <span>{currentUser?.username}</span>
            </div>
          </div>
          
          <SessionSelector 
            currentSession={currentSession}
            totalTime={sessionTimer}
          />
          
          <div className="sidebar-footer">
            <SessionNavigation 
              currentSession={currentSession}
              onNextSession={handleSessionTransition}
              onRestartChat={handleRestartChat}
              onAbandonChat={handleAbandonChat}
              tutorialMode={tutorialMode && currentSession === 1}
              onRestartTutorial={handleRestartTutorial}
              onConfirmTutorial={handleConfirmTutorial}
              onExitTutorial={handleExitTutorial}
              isTransitioning={isTransitioningSession}
            />
            <button onClick={handleLogout} className="logout-btn">Log out</button>
          </div>
        </div>
        
        <div className="chat-container">
          <MainContainer>
            <ChatArea 
              // Header props
              currentSession={currentSession}
              sessionTimer={sessionTimer}
              sessionData={sessionData}
              intentData={intentData}
              
              // Message props
              messageListRef={messageListRef}
              chatHistory={chatHistory}
              isLoading={isLoading || isTransitioningSession}
              showSessionMessage={showSessionMessage}
              sessionEndAlert={sessionEndAlert}
              showGuides={showGuides}
              tutorialMode={tutorialMode}
              tutorialStep={tutorialStep}
              onSelectGuide={handleSelectGuide}
              onNextTutorialStep={handleNextTutorialStep}
              onCompleteTutorial={handleCompleteTutorial}
              
              // Input props
              needsAnnotation={needsAnnotation}
              userInput={userInput}
              setUserInput={setUserInput}
              onSend={handleSendMessage}
              onAnnotationSubmit={handleAnnotationSubmit}
              currentResponse={currentResponse}

              // Process props
              thoughtProcess={thoughtProcess}
            />
          </MainContainer>
        </div>
        
        <div className="info-panel">
          <ThoughtProcess 
            process={thoughtProcess} 
            timing={timingData} 
          />
        </div>
      </div>

      {/* Result Modal */}
      <ResultModal
        isOpen={showResultModal}
        onClose={memoizedCloseHandler}
        resultData={resultModalData}
        isLoading={processingResult}
      />
    </div>
  );
};

export default ChatInterface;