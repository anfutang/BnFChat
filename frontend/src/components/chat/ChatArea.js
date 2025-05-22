import React, { useEffect } from 'react';
import { 
  ChatContainer, 
  ConversationHeader,
  MessageList,
  Message,
  MessageInput as ChatScopeMessageInput,
  TypingIndicator,
  MessageSeparator,
  Avatar
} from '@chatscope/chat-ui-kit-react';
import SessionHeader from './SessionHeader';

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
  
  // SocketIO props
  thoughtProcess,
  isConnected,
  socketError,
  currentStreamingMessage,
  onReportError
}) => {
  // Debug logging
  useEffect(() => {
    console.log("ChatArea updating with:", {
      chatHistoryLength: chatHistory?.length || 0,
      isLoading,
      needsAnnotation,
      showSessionMessage,
      isConnected,
      hasStreamingMessage: !!currentStreamingMessage
    });
  }, [chatHistory, isLoading, needsAnnotation, showSessionMessage, isConnected, currentStreamingMessage]);

  // Handle send button click or Enter key
  const handleSend = (message) => {
    console.log("Sending message:", message);
    if (message && message.trim() && !isLoading && isConnected) {
      onSend(message);
    } else if (!isConnected) {
      onReportError?.('connection_error', 'Pas de connexion au serveur');
    }
  };
  
  // Process the chat history to match @chatscope format
  const processedMessages = chatHistory?.map((msg, index) => ({
    message: msg.message || "",
    sentTime: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
    sender: msg.sender || "system",
    direction: msg.sender === 'user' ? 'outgoing' : 'incoming',
    position: 'normal',
    metadata: msg.metadata,
    isSystemMessage: msg.isSystemMessage || false
  })) || [];

  // Add current streaming message if it exists
  if (currentStreamingMessage && isLoading) {
    processedMessages.push({
      message: currentStreamingMessage,
      sentTime: new Date().toLocaleTimeString(),
      sender: "bot",
      direction: "incoming",
      position: "normal",
      isStreaming: true
    });
  }
  
  // Get the last thought process message for the loading indicator
  const lastThoughtProcessMessage = 
    thoughtProcess && thoughtProcess.length > 0 
      ? thoughtProcess[thoughtProcess.length - 1].status
      : "BNF traite votre demande...";

  // Connection status indicator
  const getConnectionStatus = () => {
    if (!isConnected) {
      return {
        status: 'disconnected',
        message: '🔴 Connexion interrompue',
        color: '#dc3545'
      };
    }
    if (socketError) {
      return {
        status: 'error',
        message: `⚠️ ${socketError}`,
        color: '#ffc107'
      };
    }
    return {
      status: 'connected',
      message: '🟢 Connecté',
      color: '#28a745'
    };
  };

  const connectionStatus = getConnectionStatus();
  
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
          
          {/* Connection status indicator */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            color: 'white',
            backgroundColor: connectionStatus.color,
            zIndex: 1000
          }}>
            {connectionStatus.message}
          </div>
        </ConversationHeader.Content>
      </ConversationHeader>
      
      <MessageList 
        ref={messageListRef}
        className="message-list"
        autoScrollToBottom={true}
        autoScrollToBottomOnMount={true}
      >
        {/* Show session intro message if necessary */}
        {showSessionMessage && (
          <Message model={{
            message: "Session démarrée. Vous pouvez poser vos questions sur les collections de la BNF.",
            sentTime: new Date().toLocaleTimeString(),
            sender: "system",
            direction: "incoming",
            position: "normal"
          }}>
            <Avatar
              src="https://ui-avatars.com/api/?name=BNF&background=007bff&color=fff"
              name="Système BNF"
            />
          </Message>
        )}
        
        {/* Show guides if necessary */}
        {showGuides && currentSession === 3 && (
          <Message model={{
            message: "💡 Conseil : Utilisez des termes spécifiques pour une recherche plus précise dans nos collections (ex: 'manuscrits médiévaux', 'cartes anciennes de Paris', etc.)",
            sentTime: new Date().toLocaleTimeString(),
            sender: "system",
            direction: "incoming",
            position: "normal"
          }}>
            <Avatar
              src="https://ui-avatars.com/api/?name=Guide&background=17a2b8&color=fff"
              name="Guide BNF"
            />
          </Message>
        )}
        
        {/* Session end alert */}
        {sessionEndAlert && (
          <Message model={{
            message: "⏰ Votre session se termine bientôt. Vous allez être redirigé vers la session suivante.",
            sentTime: new Date().toLocaleTimeString(),
            sender: "system",
            direction: "incoming",
            position: "normal"
          }}>
            <Avatar
              src="https://ui-avatars.com/api/?name=Time&background=ffc107&color=000"
              name="Minuteur"
            />
          </Message>
        )}
        
        {/* Empty chat message */}
        {(!chatHistory || chatHistory.length === 0) && !showSessionMessage && !sessionEndAlert && !currentStreamingMessage && (
          <Message model={{
            message: "Bonjour ! Je suis votre assistant de recherche BNF. Commencez une nouvelle conversation en tapant un message ci-dessous.",
            sentTime: new Date().toLocaleTimeString(),
            sender: "system",
            direction: "incoming",
            position: "normal"
          }}>
            <Avatar
              src="https://ui-avatars.com/api/?name=BNF&background=007bff&color=fff"
              name="Assistant BNF"
            />
          </Message>
        )}
        
        {/* Render actual chat messages */}
        {processedMessages.map((msgModel, index) => (
          <Message 
            key={index} 
            model={msgModel}
            className={msgModel.isSystemMessage ? 'system-message' : ''}
          >
            <Avatar
              src={msgModel.direction === "incoming" 
                ? (msgModel.isSystemMessage 
                  ? "https://ui-avatars.com/api/?name=System&background=6c757d&color=fff"
                  : "https://ui-avatars.com/api/?name=BNF&background=007bff&color=fff")
                : "https://ui-avatars.com/api/?name=User&background=28a745&color=fff"
              }
              name={msgModel.sender}
            />
            {msgModel.isStreaming && (
              <div className="streaming-indicator">
                <small>En cours de rédaction...</small>
              </div>
            )}
          </Message>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <TypingIndicator 
            content={lastThoughtProcessMessage}
            avatar={
              <Avatar
                src="https://ui-avatars.com/api/?name=BNF&background=007bff&color=fff"
                name="BNF Assistant"
              />
            }
          />
        )}
      </MessageList>
      
      {/* Message Input */}
      <ChatScopeMessageInput 
        placeholder={
          !isConnected 
            ? "Connexion en cours..." 
            : isLoading 
              ? "BNF traite votre demande..." 
              : "Tapez votre question sur les collections BNF..."
        }
        value={userInput}
        onChange={setUserInput}
        onSend={handleSend}
        disabled={isLoading || !isConnected}
        attachButton={false}
        autoFocus={isConnected && !isLoading}
      />
      
      {/* Thought process panel (if thought process exists) */}
      {thoughtProcess && thoughtProcess.length > 0 && (
        <div className="thought-process-panel" style={{
          position: 'fixed',
          bottom: '80px',
          left: '20px',
          right: '20px',
          maxWidth: '400px',
          padding: '10px 15px',
          borderRadius: '10px',
          fontSize: '14px',
          color: '#333',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          <strong>Étape actuelle:</strong> {lastThoughtProcessMessage}
          <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
            {thoughtProcess.length} étapes de traitement en cours
          </div>
        </div>
      )}
    </ChatContainer>
  );
};

export default ChatArea;