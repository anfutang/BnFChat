// components/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';

const Chat = () => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // Single source of truth - simplified state
  const {
    currentChatId,
    messages,
    isConnected,
    isStreaming,
    sendMessage,
    getChatState,
    changeSession,
    updateTopic,
    clearChatState
  } = useChat();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get chat state on mount
  useEffect(() => {
    if (isConnected) {
      getChatState();
    }
  }, [isConnected, getChatState]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isStreaming) return;
    
    // Send message - will create chat lazily if needed
    sendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleTopicChange = (topicId, topicType) => {
    // Update topic - will terminate ongoing chats and clear UI
    updateTopic(topicId, topicType);
  };

  const handleSessionChange = (sessionId) => {
    // Change session - will terminate ongoing chats and clear UI  
    changeSession(sessionId);
  };

  return (
    <div className="chat-container">
      {/* Header with session/topic controls */}
      <div className="chat-header">
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        
        <div className="chat-info">
          {currentChatId ? (
            <span className="chat-id">Chat: {currentChatId.slice(-8)}</span>
          ) : (
            <span className="no-chat">No active chat</span>
          )}
        </div>
      </div>

      {/* Topic Selection */}
      <div className="topic-selection">
        <select 
          onChange={(e) => handleTopicChange(e.target.value, 'exercise')}
          disabled={isStreaming}
        >
          <option value="">Select Exercise Topic</option>
          <option value="topic1">Grammar Basics</option>
          <option value="topic2">Advanced Grammar</option>
          <option value="topic3">Vocabulary</option>
        </select>
        
        <select 
          onChange={(e) => handleTopicChange(e.target.value, 'test')}
          disabled={isStreaming}
        >
          <option value="">Select Test Topic</option>
          <option value="test1">Level A1</option>
          <option value="test2">Level A2</option>
          <option value="test3">Level B1</option>
        </select>
      </div>

      {/* Session Selection */}
      <div className="session-selection">
        <button 
          onClick={() => handleSessionChange('exercise_1')}
          disabled={isStreaming}
          className="session-btn"
        >
          Exercise Session
        </button>
        <button 
          onClick={() => handleSessionChange('test_1')}
          disabled={isStreaming}
          className="session-btn"
        >
          Test Session
        </button>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Select a topic and start a conversation!</p>
            <p>Chat will be created when you send your first message.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.role}`}
            >
              <div className="message-content">
                {message.content}
                {message.isStreaming && (
                  <span className="streaming-indicator">...</span>
                )}
              </div>
              <div className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="message-input-form">
        <div className="input-container">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              !isConnected ? "Connecting..." :
              isStreaming ? "AI is responding..." :
              "Type your message..."
            }
            disabled={!isConnected || isStreaming}
            className="message-input"
          />
          <button 
            type="submit" 
            disabled={!isConnected || isStreaming || !inputMessage.trim()}
            className="send-button"
          >
            {isStreaming ? "..." : "Send"}
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="quick-actions">
          <button
            type="button"
            onClick={() => sendMessage("abandon")}
            disabled={!isConnected || isStreaming || !currentChatId}
            className="quick-action-btn abandon"
          >
            Abandon
          </button>
          <button
            type="button"
            onClick={() => sendMessage("recommencer")}
            disabled={!isConnected || isStreaming || !currentChatId}
            className="quick-action-btn restart"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={() => sendMessage("resultat")}
            disabled={!isConnected || isStreaming || !currentChatId}
            className="quick-action-btn results"
          >
            Results
          </button>
        </div>
      </form>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <details>
            <summary>Debug Info</summary>
            <pre>
              {JSON.stringify({
                currentChatId,
                messageCount: messages.length,
                isConnected,
                isStreaming
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default Chat;