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

import "./ChatArea.css"

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
    if (!isConnected) return "Connecting...";
    if (isStreaming) return "Processing your request...";
    
    // Check if topic is required but not selected
    if (sessionData?.sessionId > 1 && !selectedTopic) {
      return "Please select a topic first...";
    }
    
    switch (sessionData?.sessionId) {
      case 1: return "Ask a question to start the tutorial...";
      case 2: return "Try a search query (exercise session)...";
      case 3: return "Search the BNF collections...";
      default: return "Type your message...";
    }
  };

  return (
    <div className="chat-area">
      <ConversationHeader>
        <ConversationHeader.Content>
          <div className="header-content">
            <div className="topic-info">
              <strong>SUJET</strong> - {selectedTopic && (selectedTopic.name)}
            </div>
            <div className="topic-info">
              <strong>Intention détectée</strong>:{detectedUserIntent}
            </div>
          </div>
        </ConversationHeader.Content>
        
        {/* <ConversationHeader.Actions>
          <div className="status-indicator">
            {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
          </div>
        </ConversationHeader.Actions> */}
      </ConversationHeader>
      
      <MessageList className="message-list">
        {/* Chat messages */}
        {processedMessages.map((msgModel, index) => (
          <Message 
            key={index} 
            model={msgModel}
          ></Message>
        ))}
        
        {/* Typing indicator */}
        {isStreaming && (
          <TypingIndicator 
            content={assistantStatus}
            avatar={
              <Avatar
                src="https://ui-avatars.com/api/?name=BNF&background=000&color=fff"
                name="BNF Assistant"
              />
            }
          />
        )}
      </MessageList>
      
      <MessageInput 
        className="message-input"
        placeholder={getPlaceholder()}
        value={userInput}
        onChange={setUserInput}
        onSend={handleSend}
        disabled={!isConnected || isStreaming || (sessionData?.sessionId > 1 && !selectedTopic)}
        attachButton={false}
      />
    </div>
  );
};

export default ChatArea;