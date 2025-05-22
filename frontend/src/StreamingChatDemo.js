import React, { useState, useEffect, useRef } from 'react';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
  Avatar
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import io from 'socket.io-client';

const StreamingChatDemo = () => {
  const [messages, setMessages] = useState([
    {
      message: "Hello! I'm your AI assistant. Ask me anything!",
      sentTime: "just now",
      sender: "AI Assistant",
      direction: "incoming",
      position: "single"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const socketRef = useRef(null);
  const currentMessageRef = useRef('');
  const sessionIdRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    socketRef.current = io('http://127.0.0.1:5001/', {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      sessionIdRef.current = socket.id;
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socket.on('connected', (data) => {
      console.log('Server confirmation:', data);
    });

    // Message events
    socket.on('message_received', (data) => {
      console.log('Message received by server:', data);
    });

    socket.on('stream_start', (data) => {
      console.log('Stream starting:', data);
      currentMessageRef.current = '';
      setIsTyping(true);
      setWorkflowStatus({ step: 'starting', status: 'Initializing workflow...' });
      
      // Add initial AI message
      setMessages(prev => [...prev, {
        message: '',
        sentTime: new Date().toLocaleTimeString(),
        sender: "AI Assistant",
        direction: "incoming",
        position: "single"
      }]);
    });

    // New workflow progress handler
    socket.on('workflow_progress', (data) => {
      console.log('Workflow progress:', data);
      setWorkflowStatus({
        step: data.step,
        status: data.status,
        result: data.result
      });
      
      // Optionally show progress in the message
      if (data.result) {
        const progressMessage = `🔄 ${data.step.replace('_', ' ').toUpperCase()}: ${data.status}\n`;
        currentMessageRef.current += progressMessage;
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              message: currentMessageRef.current
            };
          }
          return newMessages;
        });
      }
    });

    socket.on('stream_chunk', (data) => {
      currentMessageRef.current += data.content;
      
      // Update the last message (AI response)
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            message: currentMessageRef.current
          };
        }
        return newMessages;
      });
    });

    socket.on('stream_end', (data) => {
      console.log('Stream ended:', data);
      setIsTyping(false);
      setWorkflowStatus(null);
    });

    socket.on('stream_error', (data) => {
      console.error('Stream error:', data);
      setIsTyping(false);
      
      // Add error message
      setMessages(prev => [...prev, {
        message: "Sorry, I encountered an error. Please try again.",
        sentTime: new Date().toLocaleTimeString(),
        sender: "AI Assistant",
        direction: "incoming",
        position: "single"
      }]);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSend = (message) => {
    if (!isConnected || !socketRef.current) {
      console.error('Not connected to server');
      return;
    }

    // Add user message
    const userMessage = {
      message: message,
      sentTime: new Date().toLocaleTimeString(),
      sender: "User",
      direction: "outgoing",
      position: "single"
    };

    setMessages(prev => [...prev, userMessage]);

    // Send message via WebSocket
    socketRef.current.emit('send_message', {
      message: message,
      session_id: sessionIdRef.current
    });
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MainContainer>
        <ChatContainer>
          <MessageList 
            scrollBehavior="smooth"
            typingIndicator={isTyping ? (
              <TypingIndicator 
                content={workflowStatus ? 
                  `AI Assistant: ${workflowStatus.status}` : 
                  "AI Assistant is thinking..."
                } 
              />
            ) : null}
          >
            {messages.map((message, i) => (
              <Message
                key={i}
                model={message}
              >
                <Avatar
                  src={message.direction === "incoming" 
                    ? "https://ui-avatars.com/api/?name=AI&background=007bff&color=fff" 
                    : "https://ui-avatars.com/api/?name=User&background=28a745&color=fff"
                  }
                  name={message.sender}
                />
              </Message>
            ))}
          </MessageList>
          <MessageInput 
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            onSend={handleSend}
            disabled={isTyping || !isConnected}
            attachButton={false}
          />
        </ChatContainer>
      </MainContainer>
      
      {/* Workflow status indicator */}
      {workflowStatus && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '20px',
          right: '20px',
          padding: '10px 15px',
          borderRadius: '10px',
          fontSize: '14px',
          color: '#333',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          <strong>Step:</strong> {workflowStatus.step.replace('_', ' ').toUpperCase()}<br/>
          <strong>Status:</strong> {workflowStatus.status}
        </div>
      )}
      
      {/* Connection status indicator */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '5px 10px',
        borderRadius: '15px',
        fontSize: '12px',
        color: 'white',
        backgroundColor: isConnected ? '#28a745' : '#dc3545'
      }}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
    </div>
  );
};

export default StreamingChatDemo;