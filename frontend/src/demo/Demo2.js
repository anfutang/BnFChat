import React, { useState, useEffect, useRef } from 'react';
import { 
  MainContainer, 
  ChatContainer, 
  MessageList, 
  Message, 
  MessageInput, 
  TypingIndicator,
  ConversationHeader,
  Avatar
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';

const Demo2 = () => {
  const [messages, setMessages] = useState([]);
  const [timingInfo, setTimingInfo] = useState({});
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isFirstInput, setIsFirstInput] = useState(true);
  const [typingIndicatorText, setTypingIndicatorText] = useState("Traitement en cours...");
  const eventSourceRef = useRef(null);
  
  // Add a system message at the beginning
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        message: "Bienvenue! Entrez votre requête de recherche pour commencer.",
        sender: 'system',
        sentTime: new Date().toISOString(),
        direction: 'outgoing'
      }
    ]);
  }, []);

  const processStream = (query) => {
    try {
      // Clear previous processing messages but keep conversation history
      setMessages(prev => prev.filter(m => !m.id.startsWith('processing-')));
      setIsStreaming(true);
      
      // Reset typing indicator to default
      setTypingIndicatorText("Traitement en cours...");
      
      // Add user message to chat
      const userMessageId = `user-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: userMessageId,
          message: query,
          sender: 'user',
          sentTime: new Date().toISOString(),
          direction: 'outgoing'
        }
      ]);
      
      // Close any existing EventSource connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Create the EventSource with query parameters
      console.log(`Creating EventSource connection to /api/demo2/stream?query=${encodeURIComponent(query)}&first=${isFirstInput}`);
      const eventSource = new EventSource(`/api/demo2/stream?query=${encodeURIComponent(query)}&first=${isFirstInput}`);
      eventSourceRef.current = eventSource;
      
      // Handle different message types
      eventSource.onmessage = (event) => {
        console.log("Received SSE message:", event.data);
        
        try {
          // Parse the JSON data from the message
          const data = JSON.parse(event.data);
          
          // Handle different message types
          switch (data.type) {
            case 'connection':
              // Connection established, no need to display
              console.log('Connection established');
              break;
              
            case 'info':
              // Display info message
              setMessages(prev => [
                ...prev,
                {
                  id: `processing-info-${Date.now()}`,
                  message: data.content,
                  sender: 'processing',
                  sentTime: new Date().toISOString(),
                  direction: 'incoming',
                  type: 'info'
                }
              ]);
              break;
              
            case 'time':
              // Update timing info
              setTimingInfo(data.content);
              break;
              
            case 'typing':
              // Update the typing indicator text if provided
              if (data.content) {
                setTypingIndicatorText(data.content);
              }
              break;
              
            case 'response':
              // Display the response
              setMessages(prev => [
                ...prev,
                {
                  id: `processing-response-${Date.now()}`,
                  message: data.content,
                  sender: 'system',
                  sentTime: new Date().toISOString(),
                  direction: 'incoming',
                  type: 'response',
                  isHtml: true
                }
              ]);
              // Close the connection after receiving the final response
              stopStreaming();
              break;
              
            case 'error':
              // Display error message
              setMessages(prev => [
                ...prev,
                {
                  id: `processing-error-${Date.now()}`,
                  message: data.content,
                  sender: 'system',
                  sentTime: new Date().toISOString(),
                  direction: 'incoming',
                  type: 'error'
                }
              ]);
              // Close the connection after receiving an error
              stopStreaming();
              break;
              
            default:
              console.warn('Unknown message type:', data.type);
          }
        } catch (e) {
          console.error('Error processing message:', e, 'Data:', event.data);
          // Display error to user
          setMessages(prev => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              message: `Erreur de traitement: ${e.message}`,
              sender: 'system',
              sentTime: new Date().toISOString(),
              direction: 'incoming',
              type: 'error'
            }
          ]);
          stopStreaming();
        }
      };
      
      // Handle connection established
      eventSource.onopen = () => {
        console.log("SSE connection opened successfully");
      };
      
      // Handle errors
      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        setMessages(prev => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            message: "Erreur de connexion au serveur. Veuillez réessayer.",
            sender: 'system',
            sentTime: new Date().toISOString(),
            direction: 'incoming',
            type: 'error'
          }
        ]);
        stopStreaming();
      };
      
      // Mark this as not being the first input anymore
      if (isFirstInput) {
        setIsFirstInput(false);
      }
      
    } catch (error) {
      console.error('Error in processStream:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          message: `Une erreur est survenue: ${error.message}`,
          sender: 'system',
          sentTime: new Date().toISOString(),
          direction: 'incoming',
          type: 'error'
        }
      ]);
      setIsStreaming(false);
    }
  };
  
  const stopStreaming = () => {
    if (eventSourceRef.current) {
      console.log("Closing SSE connection");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
    }
  };
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
  
  // Handle form submission
  const handleSend = (userInput) => {
    if (!userInput.trim() || isStreaming) return;
    
    setInputValue('');
    processStream(userInput);
  };
  
  // Helper function to render messages with different styles based on type
  const renderMessage = (msg) => {
    // Determine styling based on message type
    let customStyle = {};
    let customContent = null;
    
    if (msg.type === 'info') {
      customStyle = { 
        backgroundColor: '#f0f8ff', 
        fontSize: '0.9em',
        fontFamily: 'monospace'
      };
    } else if (msg.type === 'error') {
      customStyle = { 
        backgroundColor: '#fff0f0', 
        color: '#d32f2f' 
      };
    }
    
    // For HTML content
    if (msg.isHtml) {
      customContent = (
        <div 
          dangerouslySetInnerHTML={{ __html: msg.message }} 
          style={{ width: '100%' }}
        />
      );
    }
    
    return (
      <Message
        key={msg.id}
        model={{
          message: msg.isHtml ? '' : msg.message,
          sentTime: msg.sentTime,
          sender: msg.sender,
          direction: msg.direction,
          position: "single"
        }}
        style={customStyle}
      >
        {renderAvatar(msg.sender)}
        {customContent}
      </Message>
    );
  };
  
  // Helper function to render avatar based on sender using CSS-based avatars instead of images
  const renderAvatar = (sender) => {
    let initials = '';
    let bgColor = '';
    
    if (sender === 'system') {
      initials = 'S';
      bgColor = '#4a6dff';
    } else if (sender === 'processing') {
      initials = 'P';
      bgColor = '#6c757d';
    } else if (sender === 'user') {
      initials = 'U';
      bgColor = '#28a745';
    } else {
      return null;
    }
    
    return (
      <Avatar style={{ 
        backgroundColor: bgColor, 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {initials}
      </Avatar>
    );
  };
  
  return (
    <div style={{ position: "relative", height: "600px", width: "100%" }}>
      <MainContainer>
        <ChatContainer>
          <ConversationHeader>
            <ConversationHeader.Content>
              <div className="conversation-header">
                <span>Gallica Search Assistant</span>
                {isStreaming && (
                  <div className="timing-info" style={{ 
                    fontSize: '0.8em', 
                    color: '#666',
                    marginLeft: '10px' 
                  }}>
                    {Object.entries(timingInfo).map(([key, value]) => (
                      <span key={key} style={{ marginRight: '10px' }}>
                        {key.replace(/_/g, ' ')}: {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </ConversationHeader.Content>
          </ConversationHeader>
          
          <MessageList
            typingIndicator={isStreaming ? <TypingIndicator content={typingIndicatorText} /> : null}
          >
            {messages.map(renderMessage)}
          </MessageList>
          
          <MessageInput
            placeholder="Entrez votre recherche..."
            value={inputValue}
            onChange={val => setInputValue(val)}
            onSend={handleSend}
            disabled={isStreaming}
            attachButton={false}
            autoFocus
          />
        </ChatContainer>
      </MainContainer>
    </div>
  );
};

export default Demo2;