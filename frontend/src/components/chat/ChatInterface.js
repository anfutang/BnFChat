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

// Styles
// import './ChatInterface.css';




const ChatInterface = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Session data
  const [sessionData, setSessionData] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSteps, setTutorialSteps] = useState([]);
  
  // Use custom hooks
  const {
    currentSession,
    sessionTimer,
    showSessionMessage,
    setShowSessionMessage,
    sessionEndAlert,
    tutorialMode,
    tutorialStep,
    showGuides,
    handleNextSession,
    handleNextTutorialStep,
    handleRestartTutorial,
    handleExitTutorial,
    handleCompleteTutorial,
    handleConfirmTutorial,
    cleanupSessionTimer
  } = useSessionManager();
  
  const {
    chatHistory,
    userInput,
    setUserInput,
    isLoading,
    needsAnnotation,
    currentResponse,
    messageListRef,
    thoughtProcess,
    timingData,
    showResultModal,
    resultModalData,
    processingResult,
    loadChatHistory,
    handleSubmit,
    handleAnnotationSubmit,
    handleRestartChat,
    handleAbandonChat,
    handleConfirmChat,
    addSystemMessage,
    resetChat,
    handleCloseResultModal,
    setShowResultModal,
    setResultModalData,
    setProcessingResult
  } = useChatManager(setShowSessionMessage);

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
        if (sessionResponse.data.sessionId > 1) {
          await loadChatHistory();
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Clean up resources on close
  useEffect(() => {
    return () => {
      cleanupSessionTimer();
    };
  }, []);

  useEffect(() => {
    console.log("ChatInterface rendered with state:", {
      currentSession,
      sessionTimer,
      showSessionMessage,
      sessionEndAlert,
      tutorialMode,
      tutorialStep,
      showGuides,
      chatHistoryLength: chatHistory ? chatHistory.length : 0,
      userInput,
      isLoading,
      needsAnnotation,
    });
  }, [currentSession, sessionTimer, showSessionMessage, sessionEndAlert, tutorialMode, tutorialStep, showGuides, chatHistory, userInput, isLoading, needsAnnotation]);
  
  // Add this right before the return statement
  console.log("About to render ChatInterface components with:", {
    chatHistory,
    showSessionMessage,
    sessionData,
    currentSession
  });

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
  const testOpenResultModal = () => {
    console.log("Test button clicked - opening modal manually");
    setShowResultModal(true);
    setProcessingResult(true);
    
    // Créer des données factices pour le test
    setTimeout(() => {
      setResultModalData({
        id: "test-id",
        sruQuery: "Requête SRU de test",
        originalQuery: "Requête originale de test",
        items: [
          { title: "Résultat test 1", author: "Auteur test", date: "2024", description: "Description test" }
        ]
      });
      setProcessingResult(false);
    }, 1000);
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
              onNextSession={handleNextSession}
              onRestartChat={handleRestartChat}
              onAbandonChat={handleAbandonChat}
              tutorialMode={tutorialMode && currentSession === 1}
              onRestartTutorial={handleRestartTutorial}
              onConfirmTutorial={handleConfirmTutorial}
              onExitTutorial={handleExitTutorial}
            />
            <button onClick={handleLogout} className="logout-btn">Se déconnecter</button>
          </div>
        </div>
        
        <div className="chat-container">
          <MainContainer>
            <ChatArea 
              // Header props
              currentSession={currentSession}
              sessionTimer={sessionTimer}
              sessionData={sessionData}
              
              // Message props
              messageListRef={messageListRef}
              chatHistory={chatHistory}
              isLoading={isLoading}
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
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
    <button 
      onClick={testOpenResultModal} 
      style={{ padding: '10px', background: 'red', color: 'white', border: 'none', borderRadius: '5px' }}
    >
      TEST MODAL
    </button>
  </div>

      {/* Result Modal */}
      <ResultModal
  key={`result-modal-${showResultModal ? 'open' : 'closed'}-${Date.now()}`}
  isOpen={showResultModal}
  onClose={memoizedCloseHandler}
  resultData={resultModalData}
  isLoading={processingResult}
/>
    </div>
  );
};

export default ChatInterface;