import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Joyride, { STATUS } from 'react-joyride';
import { 
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  ConversationHeader,
  Avatar,
  TypingIndicator,
  MessageSeparator
} from '@chatscope/chat-ui-kit-react';

import { useAuth } from '../../context/AuthContext';
import SessionSelector from './SessionSelector';
import ThoughtProcess from './ThoughtProcess';
import AnnotationForm from './AnnotationForm';
import './ChatInterface.css';

const ChatInterface = () => {
  const { currentUser, logout } = useAuth();
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstInput, setIsFirstInput] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [thoughtProcess, setThoughtProcess] = useState([]);
  const [timingData, setTimingData] = useState({});
  const [needsAnnotation, setNeedsAnnotation] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSteps, setTutorialSteps] = useState([]);

  const messageListRef = useRef(null);
  const navigate = useNavigate();

  // Load initial session data and chat history
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const sessionResponse = await axios.get('/api/dev/session-data');
        setSessionData(sessionResponse.data);
        
        // Load tutorial texts if it's first time
        if (sessionResponse.data.sessionId === 1 && isFirstInput) {
          const tutorialResponse = await axios.get('/api/dev/tutorial-texts');
          // Setup tutorial steps based on tutorial texts
          const steps = [
            {
              target: '.chat-container',
              content: tutorialResponse.data.welcome,
              placement: 'center',
            },
            {
              target: '.message-input',
              content: tutorialResponse.data.input,
              placement: 'top',
            },
            // Add more steps as needed
          ];
          setTutorialSteps(steps);
          setShowTutorial(true);
        }
        
        // Load chat history
        const historyResponse = await axios.get('/api/dev/chat-history');
        if (historyResponse.data && historyResponse.data.length > 0) {
          setChatHistory(historyResponse.data);
          setIsFirstInput(false);
        }
      } catch (error) {
        console.error('Failed to load session data:', error);
      }
    };
    
    loadSessionData();
  }, [isFirstInput]);

  const handleTutorialCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setShowTutorial(false);
    }
  };

  const handleSubmit = async (message) => {
    if (!message.trim() || isLoading) return;
    
    setUserInput('');
    setIsLoading(true);
    setThoughtProcess([]);
    setTimingData({});
    setNeedsAnnotation(false);
    
    // Add user message to chat
    const newUserMessage = {
      sender: 'user',
      message,
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      // Create EventSource for streaming response
      const response = await axios.post('/api/dev/input', {
        userInput: message,
        firstInput: isFirstInput
      }, {
        responseType: 'text'
      });
      
      const lines = response.data.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          
          switch (data.type) {
            case 'info':
              setThoughtProcess(data.content);
              break;
              
            case 'time':
              setTimingData(data.content);
              break;
              
            case 'error':
              console.error('Error from server:', data.content);
              // Add error message to chat
              setChatHistory(prev => [
                ...prev, 
                {
                  sender: 'system',
                  message: `Error: ${data.content}`,
                  timestamp: new Date().toISOString()
                }
              ]);
              break;
              
            case 'response':
              const botResponse = {
                sender: 'bot',
                message: data.content.message,
                metadata: data.content.metadata,
                timestamp: new Date().toISOString()
              };
              
              setChatHistory(prev => [...prev, botResponse]);
              setCurrentResponse(botResponse);
              
              if (data.content.needsAnnotation) {
                setNeedsAnnotation(true);
              }
              break;
          }
        } catch (err) {
          console.error('Failed to parse server response:', err, line);
        }
      }
      
      setIsFirstInput(false);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setChatHistory(prev => [
        ...prev, 
        {
          sender: 'system',
          message: 'Failed to send message. Please try again.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnnotationSubmit = async (annotationData) => {
    try {
      const response = await axios.post('/api/dev/user-annotation', annotationData);
      
      setNeedsAnnotation(false);
      
      // If the conversation was ended, clear the chat
      if (annotationData.convLabel) {
        setChatHistory([]);
        setIsFirstInput(true);
      }
      
    } catch (error) {
      console.error('Failed to submit annotation:', error);
    }
  };

  const handleSessionChange = async (sessionId, isFreeTest) => {
    try {
      await axios.post('/api/dev/change-session', { 
        sessionId, 
        isFreeTest 
      });
      
      // Reset chat state
      setChatHistory([]);
      setIsFirstInput(true);
      setThoughtProcess([]);
      setTimingData({});
      setNeedsAnnotation(false);
      
      // Update session data
      const sessionResponse = await axios.get('/api/dev/session-data');
      setSessionData(sessionResponse.data);
      
    } catch (error) {
      console.error('Failed to change session:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleEraseChat = async () => {
    try {
      await axios.post('/api/dev/erase-chat');
      setChatHistory([]);
      setIsFirstInput(true);
      setThoughtProcess([]);
      setTimingData({});
      setNeedsAnnotation(false);
    } catch (error) {
      console.error('Failed to erase chat:', error);
    }
  };

  return (
    <div className="chat-page">
      {/* Tutorial */}
      {showTutorial && (
        <Joyride
          steps={tutorialSteps}
          run={showTutorial}
          continuous
          showProgress
          showSkipButton
          callback={handleTutorialCallback}
          styles={{
            options: {
              zIndex: 10000,
            },
          }}
        />
      )}

      {/* Main Chat Interface */}
      <div className="chat-layout">
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="user-info">
              <Avatar 
                src={`https://api.dicebear.com/7.x/micah/svg?seed=${sessionData?.avatarSeed || 'default'}`} 
                name={currentUser?.username} 
                status="available" 
              />
              <span>{currentUser?.username}</span>
            </div>
          </div>
          
          <SessionSelector 
            currentSessionId={sessionData?.sessionId}
            isFreeTest={sessionData?.freeTest}
            onSessionChange={handleSessionChange}
          />
          
          <div className="sidebar-footer">
            <button onClick={handleEraseChat}>New Chat</button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
        
        <div className="chat-container">
          <MainContainer>
            <ChatContainer>
              <ConversationHeader>
                <ConversationHeader.Content>
                  BNF Chat {sessionData?.chatMode && `- ${sessionData.chatMode} mode`}
                </ConversationHeader.Content>
                <ConversationHeader.Actions>
                  {sessionData?.devMode && <span className="dev-badge">DEV MODE</span>}
                </ConversationHeader.Actions>
              </ConversationHeader>
              
              <MessageList ref={messageListRef}>
                {chatHistory.length === 0 && (
                  <div className="empty-chat">
                    <p>Start a new conversation by typing a message below.</p>
                  </div>
                )}
                
                {chatHistory.map((msg, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && msg.sender === 'user' && chatHistory[index-1].sender === 'bot' && (
                      <MessageSeparator>New Question</MessageSeparator>
                    )}
                    <Message
                      model={{
                        message: msg.message,
                        sentTime: msg.timestamp,
                        sender: msg.sender,
                        direction: msg.sender === 'user' ? 'outgoing' : 'incoming',
                        position: 'normal'
                      }}
                    >
                      {msg.sender !== 'user' && (
                        <Avatar 
                          src={msg.sender === 'bot' ? '/logo.png' : null} 
                          name={msg.sender === 'bot' ? 'BNF' : 'System'} 
                        />
                      )}
                      <Message.CustomContent>
                        <div dangerouslySetInnerHTML={{ __html: msg.message }} />
                        {msg.metadata && (
                          <div className="message-metadata">
                            <h4>Extracted Metadata:</h4>
                            <div dangerouslySetInnerHTML={{ __html: msg.metadata }} />
                          </div>
                        )}
                      </Message.CustomContent>
                    </Message>
                  </React.Fragment>
                ))}
                
                {isLoading && (
                  <TypingIndicator content="BNF is processing your request..." />
                )}
              </MessageList>
              
              {!needsAnnotation ? (
                <MessageInput
                  placeholder="Type your message here..."
                  value={userInput}
                  onChange={val => setUserInput(val)}
                  onSend={handleSubmit}
                  disabled={isLoading || needsAnnotation}
                  attachButton={false}
                />
              ) : (
                <AnnotationForm
                  onSubmit={handleAnnotationSubmit}
                  response={currentResponse}
                />
              )}
            </ChatContainer>
          </MainContainer>
        </div>
        
        <div className="info-panel">
          <ThoughtProcess 
            process={thoughtProcess} 
            timing={timingData} 
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;