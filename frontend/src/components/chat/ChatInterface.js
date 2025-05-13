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
import SessionNavigation from './SessionNavigation';
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
  
  // Nouveaux états pour la gestion des sessions
  const [currentSession, setCurrentSession] = useState(1); // Commence par le tutoriel
  const [sessionTimer, setSessionTimer] = useState(null);
  const [showSessionMessage, setShowSessionMessage] = useState(true);
  const [sessionEndAlert, setSessionEndAlert] = useState(false);

  const messageListRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const navigate = useNavigate();

  // Load initial session data and chat history
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const sessionResponse = await axios.get('/api/dev/session-data');
        setSessionData(sessionResponse.data);
        
        // Définir la session actuelle basée sur les données du serveur
        setCurrentSession(sessionResponse.data.sessionId || 1);
        
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
          setShowSessionMessage(false);
        }
      } catch (error) {
        console.error('Failed to load session data:', error);
      }
    };
    
    loadSessionData();
  }, [isFirstInput]);

  // Effet pour démarrer le minuteur pour la session libre
  useEffect(() => {
    if (currentSession === 2) {
      return startSessionTimer();
    }
  }, [currentSession]);

  // Gérer la fin de la session libre
  useEffect(() => {
    if (sessionEndAlert) {
      const alertTimeout = setTimeout(() => {
        handleNextSession();
        setSessionEndAlert(false);
      }, 3000); // Après l'affichage de l'alerte
      
      return () => clearTimeout(alertTimeout);
    }
  }, [sessionEndAlert]);

  // Fonction de formatage du temps
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Démarrer le minuteur pour la session libre
  const startSessionTimer = () => {
    // Nettoyer tout minuteur existant
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    if (currentSession === 2) { // Seulement pour la session libre
      const fiveMinutes = 5 * 60;
      let timeLeft = fiveMinutes;
      
      setSessionTimer(formatTime(timeLeft));
      
      timerIntervalRef.current = setInterval(() => {
        timeLeft -= 1;
        setSessionTimer(formatTime(timeLeft));
        
        if (timeLeft <= 0) {
          clearInterval(timerIntervalRef.current);
          setSessionEndAlert(true);
        }
      }, 1000);
      
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  };

  const handleTutorialCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setShowTutorial(false);
    }
  };

  const handleSubmit = async (message) => {
    if (!message.trim() || isLoading) return;
    
    // Masquer le message d'introduction après la première entrée utilisateur
    if (showSessionMessage) {
      setShowSessionMessage(false);
    }
    
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
        firstInput: isFirstInput,
        sessionType: currentSession // Envoyer le type de session actuel
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
                  message: `Erreur: ${data.content}`,
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
          message: 'Échec de l\'envoi du message. Veuillez réessayer.',
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
        setShowSessionMessage(true);
      }
      
    } catch (error) {
      console.error('Failed to submit annotation:', error);
    }
  };

  const handleNextSession = async () => {
    if (currentSession < 3) {
      try {
        // Nettoyage du minuteur si on est en session libre
        if (currentSession === 2 && timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          setSessionTimer(null);
        }
        
        // Appel API pour changer de session
        await axios.post('/api/dev/change-session', { 
          sessionId: currentSession + 1, 
          isFreeTest: currentSession === 1 // Session libre = session 2
        });
        
        // Réinitialisation de l'état du chat
        setChatHistory([]);
        setIsFirstInput(true);
        setThoughtProcess([]);
        setTimingData({});
        setNeedsAnnotation(false);
        
        // Mise à jour de la session
        setCurrentSession(prevSession => prevSession + 1);
        setShowSessionMessage(true);
        
        // Démarrer le minuteur si on passe à la session libre
        if (currentSession === 1) {
          // On laisse l'effet useEffect s'en occuper
        }
        
      } catch (error) {
        console.error('Échec du changement de session:', error);
      }
    } else {
      // Rediriger vers la page de feedback
      navigate('/feedback');
    }
  };

  const handleRestartSession = async () => {
    try {
      await axios.post('/api/dev/erase-chat');
      
      // Réinitialisation de l'état du chat
      setChatHistory([]);
      setIsFirstInput(true);
      setThoughtProcess([]);
      setTimingData({});
      setNeedsAnnotation(false);
      
      // Redémarrer le minuteur si en session libre
      if (currentSession === 2) {
        startSessionTimer();
      }
      
      // Afficher le message d'introduction
      setShowSessionMessage(true);
    } catch (error) {
      console.error('Échec de la réinitialisation du chat:', error);
    }
  };

  const handleEndSession = async () => {
    try {
      // Nettoyage du minuteur si on est en session libre
      if (currentSession === 2 && timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        setSessionTimer(null);
      }
      
      // Enregistrer l'abandon
      await axios.post('/api/dev/end-session', { 
        sessionId: currentSession,
        status: 'abandoned'
      });
      
      // Rediriger vers la page de feedback
      navigate('/feedback');
    } catch (error) {
      console.error('Échec de l\'abandon de session:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // Nettoyage du minuteur
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Échec de la déconnexion:', error);
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
            currentSession={currentSession}
            totalTime={sessionTimer}
          />
          
          <div className="sidebar-footer">
            <SessionNavigation 
              currentSession={currentSession}
              onNextSession={handleNextSession}
              onRestartSession={handleRestartSession}
              onEndSession={handleEndSession}
            />
            <button onClick={handleLogout} className="logout-btn">Se déconnecter</button>
          </div>
        </div>
        
        <div className="chat-container">
          <MainContainer>
            <ChatContainer>
              <ConversationHeader>
                <ConversationHeader.Content>
                  {currentSession === 3 ? (
                    <div className="test-session-title">Recherche documentaire BNF</div>
                  ) : (
                    <div>BNF Chat {currentSession === 1 ? '- Tutoriel' : currentSession === 2 ? '- Session libre' : ''}</div>
                  )}
                </ConversationHeader.Content>
                <ConversationHeader.Actions>
                  {sessionData?.devMode && <span className="dev-badge">DEV MODE</span>}
                  {currentSession === 2 && sessionTimer && (
                    <span className="session-timer-badge">{sessionTimer}</span>
                  )}
                </ConversationHeader.Actions>
              </ConversationHeader>
              
              <MessageList ref={messageListRef}>
                {/* Messages d'intro de session */}
                {showSessionMessage && (
                  <div className="session-intro-message">
                    {currentSession === 1 && (
                      <Message
                        model={{
                          message: "Bienvenue dans le tutoriel de BNF Chat. Nous allons vous apprendre à utiliser cet outil de recherche bibliographique. Suivez les instructions et quand vous êtes prêt, cliquez sur 'Commencer session libre'.",
                          sentTime: new Date().toISOString(),
                          sender: 'system',
                          direction: 'incoming',
                          position: 'single'
                        }}
                      />
                    )}
                    
                    {currentSession === 2 && (
                      <Message
                        model={{
                          message: "Vous êtes maintenant dans la session libre. Vous disposez de 5 minutes pour tester librement le chat. Après ce délai, vous serez automatiquement redirigé vers la session test.",
                          sentTime: new Date().toISOString(),
                          sender: 'system',
                          direction: 'incoming',
                          position: 'single'
                        }}
                      />
                    )}
                    
                    {currentSession === 3 && (
                      <Message
                        model={{
                          message: "Vous êtes maintenant dans la session test. Veuillez suivre les instructions pour effectuer les recherches demandées. Quand vous aurez terminé, cliquez sur 'Terminer et évaluer'.",
                          sentTime: new Date().toISOString(),
                          sender: 'system',
                          direction: 'incoming',
                          position: 'single'
                        }}
                      />
                    )}
                    
                    <MessageSeparator>Début de conversation</MessageSeparator>
                  </div>
                )}

                {/* Alerte de fin de session libre */}
                {sessionEndAlert && (
                  <div className="session-alert">
                    <Message
                      model={{
                        message: "Votre temps de session libre est écoulé. Vous allez être redirigé vers la session test...",
                        sentTime: new Date().toISOString(),
                        sender: 'system',
                        direction: 'incoming',
                        position: 'single'
                      }}
                    />
                  </div>
                )}

                {/* Contenu du chat */}
                {chatHistory.length === 0 && !showSessionMessage && !sessionEndAlert && (
                  <div className="empty-chat">
                    <p>Commencez une nouvelle conversation en tapant un message ci-dessous.</p>
                  </div>
                )}
                
                {chatHistory.map((msg, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && msg.sender === 'user' && chatHistory[index-1].sender === 'bot' && (
                      <MessageSeparator>Nouvelle Question</MessageSeparator>
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
                          name={msg.sender === 'bot' ? 'BNF' : 'Système'} 
                        />
                      )}
                      <Message.CustomContent>
                        <div dangerouslySetInnerHTML={{ __html: msg.message }} />
                        {msg.metadata && (
                          <div className="message-metadata">
                            <h4>Métadonnées extraites:</h4>
                            <div dangerouslySetInnerHTML={{ __html: msg.metadata }} />
                          </div>
                        )}
                      </Message.CustomContent>
                    </Message>
                  </React.Fragment>
                ))}
                
                {isLoading && (
                  <TypingIndicator content="BNF traite votre demande..." />
                )}
              </MessageList>
              
              {!needsAnnotation ? (
                <MessageInput
                  placeholder="Tapez votre message ici..."
                  value={userInput}
                  onChange={val => setUserInput(val)}
                  onSend={handleSubmit}
                  disabled={isLoading || needsAnnotation || sessionEndAlert}
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