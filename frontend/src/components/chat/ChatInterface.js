import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Joyride, { STATUS } from 'react-joyride';
import { 
  MainContainer,
  Avatar
} from '@chatscope/chat-ui-kit-react';

// Context
import { useAuth } from '../../context/AuthContext';

// Composants
import SessionSelector from './SessionSelector';
import SessionNavigation from './SessionNavigation';
import ThoughtProcess from './ThoughtProcess';
import ChatArea from './ChatArea';

// Hooks personnalisés
import useSessionManager from '../../hooks/useSessionManager';
import useChatManager from '../../hooks/useChatManager';
import useReferenceDetection from '../../hooks/useReferenceDetection';

// Styles
// import './ChatInterface.css';

const ChatInterface = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Données de session
  const [sessionData, setSessionData] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSteps, setTutorialSteps] = useState([]);
  
  // Utilisation des hooks personnalisés
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
    loadChatHistory,
    handleSubmit,
    handleAnnotationSubmit,
    handleRestartChat,
    handleAbandonChat,
    handleConfirmChat,
    addSystemMessage,
    resetChat
  } = useChatManager(setShowSessionMessage);
  
  const {
    probableReference,
    showReferenceModal,
    handleViewReference,
    handleCloseReferenceModal,
    handleSubmitReferenceEvaluation
  } = useReferenceDetection(chatHistory, currentSession);
  
  // Charger les données de session et l'historique du chat
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const sessionResponse = await axios.get('/api/dev/session-data');
        setSessionData(sessionResponse.data);
        
        // Charger l'historique du chat si on n'est pas en mode tutoriel
        if (sessionResponse.data.sessionId > 1) {
          await loadChatHistory();
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Nettoyer les ressources à la fermeture
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
  // Callback pour le tutorial Joyride
  const handleTutorialCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setShowTutorial(false);
    }
  };
  
  // Gérer la soumission d'un message
  const handleSendMessage = (message) => {
    handleSubmit(message, currentSession);
  };
  
  // Gérer la sélection d'un guide
  const handleSelectGuide = (sampleQuery) => {
    setUserInput(sampleQuery);
    // Focus sur l'entrée de message
    setTimeout(() => {
      const inputElement = document.querySelector('.cs-message-input__content-editor');
      if (inputElement) {
        inputElement.focus();
      }
    }, 100);
  };
  
  // Gérer la confirmation de chat avec possible référence
  const handleChatConfirmation = () => {
    // Si on est en session test et qu'une référence probable a été identifiée
    if (currentSession === 3 && probableReference) {
      // Ouvrir directement le modal d'évaluation
      handleViewReference();
      return;
    }
    
    // Sinon, confirmation normale
    handleConfirmChat();
  };
  
  // Gérer la déconnexion
  const handleLogout = async () => {
    try {
      cleanupSessionTimer();
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Échec de la déconnexion:', error);
    }
  };

  // Gérer la soumission de l'évaluation de référence
  const handleEvaluateReference = (evaluationData) => {
    handleSubmitReferenceEvaluation(evaluationData, addSystemMessage);
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

      {/* Interface principale */}
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
              onConfirmChat={handleChatConfirmation}
              tutorialMode={tutorialMode && currentSession === 1}
              onRestartTutorial={handleRestartTutorial}
              onConfirmTutorial={handleConfirmTutorial}
              onExitTutorial={handleExitTutorial}
              probableReference={probableReference}
              onViewReference={handleViewReference}
            />
            <button onClick={handleLogout} className="logout-btn">Se déconnecter</button>
          </div>
        </div>
        
        <div className="chat-container">
          <MainContainer>
            <ChatArea 
              // Props pour le header
              currentSession={currentSession}
              sessionTimer={sessionTimer}
              sessionData={sessionData}
              
              // Props pour les messages
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
              
              // Props pour l'entrée
              needsAnnotation={needsAnnotation}
              userInput={userInput}
              setUserInput={setUserInput}
              onSend={handleSendMessage}
              onAnnotationSubmit={handleAnnotationSubmit}
              currentResponse={currentResponse}
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
      
    </div>
  );
};

export default ChatInterface;