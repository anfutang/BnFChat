// src/components/chat/ChatArea.js
import React from 'react';
import { 
  ChatContainer, 
  MessageList,
  Message,
  MessageInput,
  ConversationHeader,
  Avatar,
  TypingIndicator
} from '@chatscope/chat-ui-kit-react';
// import { ThemeProvider, defaultTheme } from '@chatscope/chat-ui-kit-styles/';

// import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import "./ChatArea.css"

// const myCustomTheme = {
//   ...defaultTheme,
//   messageInput: {
//     ...defaultTheme.messageInput,
//     background: "#000000",       
//     textColor: "#ffffff",       
//     placeholderColor: "#888888", 
//     border: "1px solid #444",
//     borderRadius: "8px",
//   }
// };

const ChatArea = ({
  sessionData,
  selectedTopic,
  messages,
  assistantStatus,
  detectedUserIntent,
  userInput,
  setUserInput,
  onSendMessage,
  isConnected,
  isStreaming,
  isTimerRunning,
  currentChatId
}) => {

  // Convert messages to @chatscope format
  const processedMessages = messages.map((msg, index) => ({
    message: msg.content,
    sentTime: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '',
    sender: msg.role,
    direction: msg.role === 'user' ? 'outgoing' : 'incoming',
    position: 'normal'
  }));

  const handleSend = (message) => {
    if (message?.trim() && isConnected && !isStreaming) {
      onSendMessage(message);
    }
  };

  const getSessionTitle = () => {
    switch (sessionData?.sessionId) {
      case 1: return "Tutoriel";
      case 2: return "Exercise";
      case 3: return "Test Officiel";
      default: return "BnFChat";
    }
  };

  const getPlaceholder = () => {
    if (!isConnected) return "Connexion...";
    if (isStreaming) return "Traitement en cours...";
    if (!isTimerRunning) return "Le minuteur est en pause. Relancez-le pour continuer.";
    
    // Check if topic is required but not selected
    if (sessionData?.sessionId > 1 && !selectedTopic) {
      return "Veuillez d'abord sélectionner un sujet pour continuer.";
    }
    
    switch (sessionData?.sessionId) {
      case 1: return "Zone de saisie : veuillez entrer votre texte ici.";
      case 2: return "Commencez par un message pour vous échauffer !";
      case 3: return "Entrez votre message…";
      default: return "Entrez votre message…";
    }
  };

  return (
    <div className="chat-area" id="chat-area">
      <ConversationHeader>
        <ConversationHeader.Content>
          <div className="header-content" id="conv-info-area">
            <div className="topic-info">
              <strong>SUJET</strong> - {selectedTopic && (selectedTopic.name)}
            </div>
            <div className="topic-info">
              <strong>Intention détectée</strong> :{detectedUserIntent}
            </div>
          </div>
        </ConversationHeader.Content>
        
        {/* <ConversationHeader.Actions>
          <div className="status-indicator">
            {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
          </div>
        </ConversationHeader.Actions> */}
      </ConversationHeader>
      
      <MessageList className="message-list" id="message-area">
        {/* Chat messages */}
        {processedMessages.map((msgModel, index) => (
          <Message 
            key={index} 
            model={msgModel}
            style={{
              textAlign: msgModel.direction === "incoming" ? "left" : "right",
              marginBottom: "20px"
            }}
          ></Message>
        ))}
      </MessageList>

       {/* Typing indicator */}
       {isStreaming && (
          <TypingIndicator 
            content={assistantStatus}
            className="status-indicator"
            avatar={
              <Avatar
                src="https://ui-avatars.com/api/?name=BNF&background=000&color=fff"
                name="BNF Assistant"
              />
            }
          />
        )}
      
      <MessageInput 
        className="message-input"
        id="message-input"
        placeholder={getPlaceholder()}
        value={userInput}
        onChange={setUserInput}
        onSend={handleSend}
        disabled={sessionData.sessionId === 1 ? false : (!isConnected || isStreaming || (sessionData?.sessionId > 1 && !selectedTopic) || !isTimerRunning)}
        attachButton={false}
        style={{ textAlign:"left" }}
        textareaProps={{
          style: {
            backgroundColor: 'black',
          },
        }}
      />
    </div>
  );
};

export default ChatArea;