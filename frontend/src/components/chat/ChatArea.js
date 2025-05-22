import React from 'react';
import { 
  ChatContainer, 
  ConversationHeader,
  MessageList,
  Message,
  MessageInput as ChatScopeMessageInput,
  TypingIndicator,
  Avatar
} from '@chatscope/chat-ui-kit-react';

const ChatArea = ({
  // Session props
  currentSession,
  formattedTime,
  detectedIntent,
  
  // Message props
  messages,
  userInput,
  setUserInput,
  onSendMessage,
  messageListRef,
  
  // SocketIO props
  isLoading,
  isConnected,
  currentStreamingMessage,
  isStreaming,
  thoughtProcess,
  
  // UI props
  selectedTopic,
  
  // Actions
  onRequestResults
}) => {

  // Convert messages to @chatscope format
  const processedMessages = messages.map((msg, index) => ({
    message: msg.content,
    sentTime: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
    sender: msg.role === 'user' ? 'user' : 'assistant',
    direction: msg.role === 'user' ? 'outgoing' : 'incoming',
    position: 'normal',
    isSystemMessage: msg.isSystem || false,
    messageId: msg.id
  }));

  // Add streaming message if active
  if (currentStreamingMessage && isStreaming) {
    processedMessages.push({
      message: currentStreamingMessage,
      sentTime: new Date().toLocaleTimeString(),
      sender: "assistant",
      direction: "incoming",
      position: "normal",
      isStreaming: true,
      messageId: 'streaming'
    });
  }

  // Get current workflow status
  const getCurrentStatus = () => {
    if (thoughtProcess && thoughtProcess.length > 0) {
      const lastStep = thoughtProcess[thoughtProcess.length - 1];
      return lastStep.status || "Traitement en cours...";
    }
    return "Assistant BNF prêt";
  };

  // Handle message sending
  const handleSend = (message) => {
    if (message?.trim() && isConnected && !isLoading) {
      onSendMessage(message);
    }
  };

  // Session header content
  const getHeaderContent = () => {
    if (currentSession === 1) {
      return "Assistant de recherche BNF - Tutoriel";
    }
    
    if (currentSession === 2) {
      return "Assistant de recherche BNF - Session d'exercice";
    }
    
    if (currentSession === 3) {
      return "Assistant de recherche BNF - Session de test";
    }
    
    return "Assistant de recherche BNF";
  };

  // Connection status for header
  const getConnectionIndicator = () => {
    if (!isConnected) {
      return { icon: '🔴', text: 'Déconnecté', color: '#dc3545' };
    }
    if (isLoading || isStreaming) {
      return { icon: '🟡', text: 'En cours...', color: '#ffc107' };
    }
    return { icon: '🟢', text: 'Connecté', color: '#28a745' };
  };

  const connectionIndicator = getConnectionIndicator();

  return (
    <ChatContainer className="chat-container-component">
      
      {/* Header */}
      <ConversationHeader>
        <ConversationHeader.Content>
          <div className="chat-header-content">
            <div className="session-info">
              <h4>{getHeaderContent()}</h4>
              
              {/* Show current intent if available */}
              {detectedIntent && currentSession > 1 && (
                <div className="context-info">
                  <span className="intent-badge">🎯 {detectedIntent}</span>
                </div>
              )}
              
              {/* Show selected topic if available */}
              {selectedTopic && currentSession > 1 && (
                <div className="context-info">
                  <span className="topic-badge">📚 {selectedTopic.name}</span>
                </div>
              )}
            </div>
          </div>
        </ConversationHeader.Content>
        
        <ConversationHeader.Actions>
          {/* Timer for timed sessions */}
          {formattedTime && (currentSession === 2 || currentSession === 3) && (
            <div className="session-timer">
              ⏱️ {formattedTime}
            </div>
          )}
          
          {/* Connection indicator */}
          <div 
            className="connection-indicator"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              color: 'white',
              backgroundColor: connectionIndicator.color
            }}
          >
            <span>{connectionIndicator.icon}</span>
            <span>{connectionIndicator.text}</span>
          </div>
        </ConversationHeader.Actions>
      </ConversationHeader>
      
      {/* Message List */}
      <MessageList 
        ref={messageListRef}
        className="message-list"
        autoScrollToBottom={true}
        autoScrollToBottomOnMount={true}
      >
        
        {/* Welcome message for tutorial */}
        {currentSession === 1 && messages.length === 0 && (
          <Message model={{
            message: "👋 Bienvenue dans le tutoriel de l'assistant BNF ! Je vais vous aider à vous familiariser avec la recherche dans nos collections. N'hésitez pas à me poser des questions.",
            sentTime: new Date().toLocaleTimeString(),
            sender: "assistant",
            direction: "incoming",
            position: "normal"
          }}>
            <Avatar
              src="https://ui-avatars.com/api/?name=BNF&background=007bff&color=fff"
              name="Assistant BNF"
            />
          </Message>
        )}
        
        {/* Guide message for exercise session */}
        {currentSession === 2 && messages.length === 0 && (
          <Message model={{
            message: "🎯 Session d'exercice commencée ! Vous avez 5 minutes pour vous familiariser avec l'assistant. Essayez différents types de questions ou utilisez les sujets suggérés.",
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
        
        {/* Guide message for test session */}
        {currentSession === 3 && messages.length === 0 && (
          <Message model={{
            message: "💡 Session de test commencée ! Utilisez des termes spécifiques pour des recherches précises dans nos collections. Exemples : 'manuscrits médiévaux', 'cartes de Paris 19ème siècle', 'correspondance de Voltaire'.",
            sentTime: new Date().toLocaleTimeString(),
            sender: "system",
            direction: "incoming",
            position: "normal"
          }}>
            <Avatar
              src="https://ui-avatars.com/api/?name=Test&background=28a745&color=fff"
              name="Session Test"
            />
          </Message>
        )}
        
        {/* Render chat messages */}
        {processedMessages.map((msgModel, index) => (
          <Message 
            key={msgModel.messageId || index} 
            model={msgModel}
            className={msgModel.isSystemMessage ? 'system-message' : ''}
          >
            <Avatar
              src={
                msgModel.direction === "incoming" 
                  ? (msgModel.isSystemMessage 
                    ? "https://ui-avatars.com/api/?name=System&background=6c757d&color=fff"
                    : "https://ui-avatars.com/api/?name=BNF&background=007bff&color=fff")
                  : `https://api.dicebear.com/7.x/micah/svg?seed=${msgModel.sender || 'user'}`
              }
              name={msgModel.sender}
            />
            
            {/* Streaming indicator */}
            {msgModel.isStreaming && (
              <div className="streaming-indicator">
                <small>✍️ Rédaction en cours...</small>
              </div>
            )}
            
            {/* Result request button for assistant messages in test session */}
            {msgModel.direction === "incoming" && 
             !msgModel.isSystemMessage && 
             !msgModel.isStreaming && 
             currentSession === 3 && 
             msgModel.sender === 'assistant' && (
              <div className="message-actions">
                <button 
                  onClick={() => onRequestResults?.({ query: msgModel.message })}
                  className="result-request-btn"
                  title="Voir les résultats de recherche détaillés"
                >
                  📄 Voir les résultats
                </button>
              </div>
            )}
          </Message>
        ))}
        
        {/* Typing indicator */}
        {(isLoading || isStreaming) && (
          <TypingIndicator 
            content={getCurrentStatus()}
            avatar={
              <Avatar
                src="https://ui-avatars.com/api/?name=BNF&background=007bff&color=fff"
                name="Assistant BNF"
              />
            }
          />
        )}
      </MessageList>
      
      {/* Message Input */}
      <ChatScopeMessageInput 
        placeholder={
          !isConnected 
            ? "⏳ Connexion en cours..." 
            : isLoading || isStreaming
              ? "⌛ BNF traite votre demande..." 
              : currentSession === 1
                ? "💬 Posez une question pour commencer le tutoriel..."
                : currentSession === 2
                  ? "🎯 Essayez une recherche (session d'exercice)..."
                  : "🔍 Posez votre question sur les collections BNF..."
        }
        value={userInput}
        onChange={setUserInput}
        onSend={handleSend}
        disabled={isLoading || isStreaming || !isConnected}
        attachButton={false}
        autoFocus={isConnected && !isLoading && !isStreaming}
      />
      
      {/* Workflow status overlay for active processing */}
      {(isLoading || isStreaming) && thoughtProcess && thoughtProcess.length > 0 && (
        <div className="workflow-status-overlay">
          <div className="workflow-content">
            <div className="workflow-header">
              <span className="workflow-icon">⚙️</span>
              <span className="workflow-title">Traitement en cours</span>
            </div>
            <div className="workflow-step">
              {getCurrentStatus()}
            </div>
            <div className="workflow-progress">
              <div className="progress-info">
                {thoughtProcess.length} étapes complétées
              </div>
              {isStreaming && (
                <div className="streaming-info">
                  ✍️ Génération de la réponse...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ChatContainer>
  );
};

export default ChatArea;