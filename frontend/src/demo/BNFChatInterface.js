import React, { useState } from 'react';
import { 
  MainContainer, 
  ChatContainer, 
  MessageList, 
  Message, 
  MessageInput, 
  TypingIndicator, 
  ConversationHeader
} from '@chatscope/chat-ui-kit-react';

const BNFChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      message: "Bonjour, comment puis-je vous aider avec vos recherches à la BNF aujourd'hui?",
      sender: "BNF",
      direction: "incoming",
      position: "normal"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionType, setSessionType] = useState('free'); // 'free' or 'guided'
  const [error, setError] = useState(null);

  const handleSendMessage = async (messageText) => {
    if (messageText.trim().length === 0) return;
    
    // Add user message
    const userMessage = {
      message: messageText,
      sender: "user",
      direction: "outgoing",
      position: "normal"
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsTyping(true);
    setError(null); // Clear any previous error
    
    try {
      // Make a POST request with the appropriate headers
      const response = await fetch('/api/demo/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          message: messageText,
          sessionType: sessionType
        })
      });
      
      // Check if the response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get a reader from the response body
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // Add empty assistant message that will be updated with streamed content
      setMessages(prevMessages => [
        ...prevMessages, 
        {
          message: "", 
          sender: "BNF",
          direction: "incoming",
          position: "normal"
        }
      ]);
      
      let buffer = "";
      
      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setIsTyping(false);
          break;
        }
        
        // Decode the chunk and add it to the buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ""; // Keep the last incomplete chunk in the buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.chunk) {
                // Update the last message by appending the new chunk
                setMessages(prevMessages => {
                  const updatedMessages = [...prevMessages];
                  const lastIndex = updatedMessages.length - 1;
                  
                  updatedMessages[lastIndex] = {
                    ...updatedMessages[lastIndex],
                    message: updatedMessages[lastIndex].message + data.chunk
                  };
                  
                  return updatedMessages;
                });
              }
              
              if (data.error) {
                setError(data.error);
                setIsTyping(false);
              }
              
              if (data.done) {
                setIsTyping(false);
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(`Error: ${error.message || 'Unknown error'}`);
      
      // Add an error message
      setMessages(prevMessages => [
        ...prevMessages,
        {
          message: "Désolé, une erreur s'est produite. Veuillez réessayer.",
          sender: "BNF",
          direction: "incoming",
          position: "normal"
        }
      ]);
      
      setIsTyping(false);
    }
  };

  const handleToggleSessionType = () => {
    const newType = sessionType === 'free' ? 'guided' : 'free';
    setSessionType(newType);
  };

  return (
    <div className="bnf-chat-container" style={{ height: '80vh', maxWidth: '800px', margin: '0 auto' }}>
      <MainContainer>
        <ChatContainer>
          <ConversationHeader>
            <ConversationHeader.Content>
              <div className="conversation-header">
                <h2>BNF Assistant de Références</h2>
                <div className="session-info">
                  <span>
                    Session {sessionType === 'free' ? 'libre' : 'guidée'} 
                    <button 
                      onClick={handleToggleSessionType}
                      style={{ 
                        marginLeft: '10px', 
                        background: 'none', 
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        padding: '2px 5px',
                        cursor: 'pointer' 
                      }}
                    >
                      Changer
                    </button>
                  </span>
                </div>
              </div>
            </ConversationHeader.Content>
          </ConversationHeader>
          <MessageList
            typingIndicator={isTyping ? <TypingIndicator content="L'assistant BNF est en train d'écrire" /> : null}
          >
            {messages.map((message, i) => (
              <Message key={i} model={message} />
            ))}
            {error && (
              <div style={{ color: 'red', padding: '10px', textAlign: 'center' }}>
                {error}
              </div>
            )}
          </MessageList>
          <MessageInput 
            placeholder="Posez votre question sur les références BNF..." 
            onSend={handleSendMessage} 
            attachButton={false}
          />
        </ChatContainer>
      </MainContainer>
    </div>
  );
};

export default BNFChatInterface;