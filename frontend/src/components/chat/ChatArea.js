import React, { useEffect } from 'react';
import { 
  ChatContainer, 
  ConversationHeader,
  MessageList,
  Message,
  MessageInput as ChatScopeMessageInput,
  TypingIndicator,
  MessageSeparator
} from '@chatscope/chat-ui-kit-react';
import SessionHeader from './SessionHeader';
import AnnotationForm from './AnnotationForm';
// import './ChatArea.css'; 

const ChatArea = ({
  // Props for header
  currentSession,
  sessionTimer,
  sessionData,
  intentData,
  
  // Props for messages
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
  
  // Props for input
  needsAnnotation,
  userInput,
  setUserInput,
  onSend,
  onAnnotationSubmit,
  currentResponse,
  
  // Added prop for thought process
  thoughtProcess
}) => {
  // Debug logging
  useEffect(() => {
    console.log("ChatArea mounting/updating with:", {
      chatHistoryLength: chatHistory?.length || 0,
      isLoading,
      needsAnnotation,
      showSessionMessage
    });
  }, [chatHistory, isLoading, needsAnnotation, showSessionMessage]);

  // Handle send button click or Enter key
  const handleSend = () => {
    console.log("Sending message:", userInput);
    if (userInput && userInput.trim() && !isLoading) {
      onSend(userInput);
    }
  };
  
  // Process the chat history to match @chatscope format
  const processedMessages = chatHistory?.map(msg => ({
    message: msg.message || "",
    sentTime: msg.timestamp || new Date().toISOString(),
    sender: msg.sender || "system",
    direction: msg.sender === 'user' ? 'outgoing' : 'incoming',
    position: 'normal',
    metadata: msg.metadata
  })) || [];
  
  // Get the last thought process message for the loading indicator
  const lastThoughtProcessMessage = 
    thoughtProcess && thoughtProcess.length > 0 
      ? thoughtProcess[thoughtProcess.length - 1] 
      : "BNF traite votre demande...";
  
  return (
    <ChatContainer className="chat-container-component">
      <ConversationHeader>
        <ConversationHeader.Content>
          <SessionHeader 
            currentSession={currentSession}
            sessionTimer={sessionTimer}
            sessionData={sessionData}
            intentData={intentData}
          />
        </ConversationHeader.Content>
      </ConversationHeader>
      
      <MessageList 
        ref={messageListRef}
        className="message-list"
      >
        {/* Show session intro message if necessary */}
        {showSessionMessage && (
          <Message model={{
            message: "Session démarrée. Vous pouvez poser vos questions.",
            sentTime: new Date().toISOString(),
            sender: "system",
            direction: "incoming",
            position: "normal"
          }} />
        )}
        
        {/* Show guides if necessary */}
        {showGuides && currentSession === '3' && (
          <Message model={{
            message: "Utilisez les guides disponibles pour votre recherche.",
            sentTime: new Date().toISOString(),
            sender: "system",
            direction: "incoming",
            position: "normal"
          }} />
        )}
        
        {/* Empty chat message */}
        {(!chatHistory || chatHistory.length === 0) && !showSessionMessage && !sessionEndAlert && (
          <Message model={{
            message: "Commencez une nouvelle conversation en tapant un message ci-dessous.",
            sentTime: new Date().toISOString(),
            sender: "system",
            direction: "incoming",
            position: "normal"
          }} />
        )}
        
        {/* Render actual chat messages */}
        {processedMessages.map((msgModel, index) => (
          <Message key={index} model={msgModel} />
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <TypingIndicator content={lastThoughtProcessMessage} />
        )}
      </MessageList>
      
      {!needsAnnotation ? (
        <ChatScopeMessageInput
          placeholder="Tapez votre message ici..."
          value={userInput || ''}
          onChange={val => {
            setUserInput(val);
          }}
          onSend={handleSend}
          disabled={isLoading || tutorialMode}
          attachButton={false}
          sendButton={true}
          className="message-input-fixed"
        />
      ) : (
        <div className="annotation-form-container">
          <AnnotationForm
            onSubmit={onAnnotationSubmit}
            response={currentResponse}
          />
        </div>
      )}
    </ChatContainer>
  );
};

export default ChatArea;