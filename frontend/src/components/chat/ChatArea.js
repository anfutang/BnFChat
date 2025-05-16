import React from 'react';
import { ChatContainer, ConversationHeader, MessageList, MessageInput } from '@chatscope/chat-ui-kit-react';
import SessionHeader from './SessionHeader';
import ChatMessages from './ChatMessages';
import AnnotationForm from './AnnotationForm';

// Ce composant est une version simplifiée qui assure que l'entrée est toujours visible
const ChatArea = ({
  // Props pour le header
  currentSession,
  sessionTimer,
  sessionData,
  
  // Props pour les messages
  messageListRef,
  chatHistory,
  isLoading,
  showSessionMessage,
  sessionEndAlert,
  showGuides,
  tutorialMode,
  tutorialStep,
  onSelectGuide,
  onNextTutorialStep,
  onCompleteTutorial,
  
  // Props pour l'entrée
  needsAnnotation,
  userInput,
  setUserInput,
  onSend,
  onAnnotationSubmit,
  currentResponse
}) => {
  return (
    <ChatContainer className="chat-container-component">
      <SessionHeader 
        currentSession={currentSession}
        sessionTimer={sessionTimer}
        sessionData={sessionData}
      />
      
      <ChatMessages 
        messageListRef={messageListRef}
        chatHistory={chatHistory}
        isLoading={isLoading}
        showSessionMessage={showSessionMessage}
        currentSession={currentSession}
        sessionEndAlert={sessionEndAlert}
        showGuides={showGuides}
        tutorialMode={tutorialMode}
        tutorialStep={tutorialStep}
        onSelectGuide={onSelectGuide}
        onNextTutorialStep={onNextTutorialStep}
        onCompleteTutorial={onCompleteTutorial}
      />
      
      {/* Garantir que l'entrée est toujours visible, même en mode tutoriel */}
      {!needsAnnotation ? (
        <MessageInput
          placeholder="Tapez votre message ici..."
          value={userInput}
          onChange={val => setUserInput(val)}
          onSend={onSend}
          disabled={isLoading || tutorialMode}
          attachButton={false}
          className="message-input-fixed"
        />
      ) : (
        <AnnotationForm
          onSubmit={onAnnotationSubmit}
          response={currentResponse}
        />
      )}
    </ChatContainer>
  );
};

export default ChatArea;