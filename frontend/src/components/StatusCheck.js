// src/components/StatusCheck.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  MainContainer, 
  ChatContainer, 
  MessageList, 
  Message, 
  MessageInput 
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';

const StatusCheck = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([
    {
      message: "Hello! I'll check the connection to the backend...",
      sentTime: new Date().toISOString(), // Convert to string
      sender: "System",
      direction: "incoming"
    }
  ]);

  useEffect(() => {
    // Fetch status from the backend
    const checkStatus = async () => {
      try {
        setLoading(true);
        // Use direct URL to Flask backend
        const response = await axios.get('/api/chatbot/status');
        setStatus(response.data);
        
        // Add success message with string date
        setMessages(prevMessages => [
          ...prevMessages,
          {
            message: `✅ Connected to backend! Response: ${JSON.stringify(response.data)}`,
            sentTime: new Date().toISOString(), // Convert to string
            sender: "System",
            direction: "incoming"
          }
        ]);

      } catch (err) {
        console.error('Error checking status:', err);
        setError(err.message || 'Failed to connect to backend');
        
        // Add error message with string date
        setMessages(prevMessages => [
          ...prevMessages,
          {
            message: `❌ Error connecting to backend: ${err.message || 'Unknown error'}`,
            sentTime: new Date().toISOString(), // Convert to string
            sender: "System",
            direction: "incoming"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  const handleSendMessage = (message) => {
    // Add user message with string date
    setMessages(prevMessages => [
      ...prevMessages,
      {
        message,
        sentTime: new Date().toISOString(), // Convert to string
        sender: "User",
        direction: "outgoing"
      }
    ]);

    // Add immediate response with string date
    setMessages(prevMessages => [
      ...prevMessages,
      {
        message: `You sent: "${message}" - This is just a test interface, but it shows the chat UI is working!`,
        sentTime: new Date().toISOString(), // Convert to string
        sender: "System",
        direction: "incoming"
      }
    ]);
  };

  return (
    <div className="status-check">
      <h2>Backend Connection Test</h2>
      
      <div style={{ position: "relative", height: "500px", width: "100%" }}>
        <MainContainer>
          <ChatContainer>
            <MessageList>
              {messages.map((msg, index) => (
                <Message key={index} model={msg} />
              ))}
            </MessageList>
            <MessageInput 
              placeholder="Type a test message here..." 
              onSend={handleSendMessage}
            />
          </ChatContainer>
        </MainContainer>
      </div>
      
      <div className="status-details">
        <h3>Connection Details:</h3>
        {loading ? (
          <p>Checking connection to backend...</p>
        ) : error ? (
          <div className="error">
            <p><strong>Error:</strong> {error}</p>
            <p>Make sure your backend is running and the route is configured correctly.</p>
          </div>
        ) : (
          <div className="success">
            <p><strong>Status:</strong> {status?.status}</p>
            <p><strong>Version:</strong> {status?.version}</p>
            <p><strong>Message:</strong> {status?.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusCheck;