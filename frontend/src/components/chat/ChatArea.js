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

const ChatArea = ({
  sessionData,
  selectedTopic,
  messages,
  assistantStatus,
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
      case 1: return "BNF Assistant - Tutorial";
      case 2: return "BNF Assistant - Exercise Session";
      case 3: return "BNF Assistant - Test Session";
      default: return "BNF Assistant";
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
      <ChatContainer>
        <ConversationHeader>
          <ConversationHeader.Content>
            <div className="header-content">
              <h4>{getSessionTitle()}</h4>
              {selectedTopic && (
                <div className="topic-info">
                  Topic: {selectedTopic.name}
                </div>
              )}
            </div>
          </ConversationHeader.Content>
          
          <ConversationHeader.Actions>
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </ConversationHeader.Actions>
        </ConversationHeader>
        
        <MessageList>
          {/* Welcome message */}
          {/* {messages.length === 0 && (
            <Message
              model={{
                message: `Welcome to the BNF Assistant ${getSessionTitle()}! How can I help you today?`,
                sentTime: new Date().toLocaleTimeString(),
                sender: "assistant",
                direction: "incoming"
              }}
            >
              <Avatar
                src="https://ui-avatars.com/api/?name=BNF&background=007bff&color=fff"
                name="BNF Assistant"
              />
            </Message>
          )} */}
          
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
                  src="https://ui-avatars.com/api/?name=BNF&background=007bff&color=fff"
                  name="BNF Assistant"
                />
              }
            />
          )}
        </MessageList>
        
        <MessageInput 
          placeholder={getPlaceholder()}
          value={userInput}
          onChange={setUserInput}
          onSend={handleSend}
          disabled={!isConnected || isStreaming || (sessionData?.sessionId > 1 && !selectedTopic)}
          attachButton={false}
        />
      </ChatContainer>
    </div>
  );
};

export default ChatArea;