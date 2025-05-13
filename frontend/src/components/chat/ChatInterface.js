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
import TutorialSteps from './TutorialSteps';
import GuidedSearch from './GuidedSearch';
import './ChatInterface.css';
import ReferenceEvaluationModal from './ReferenceEvaluationModal';
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
  const [tutorialMode, setTutorialMode] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(1);

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
      
      // Si on est dans la session tutoriel, activer le mode tutoriel
      if (sessionResponse.data.sessionId === 1) {
        setTutorialMode(true);
        setTutorialStep(1);
        // Ne pas montrer le tutoriel Joyride
        setShowTutorial(false);
      } else {
        setTutorialMode(false);
      }
      
      // Load chat history si on n'est pas en mode tutoriel
      if (sessionResponse.data.sessionId > 1) {
        const historyResponse = await axios.get('/api/dev/chat-history');
        if (historyResponse.data && historyResponse.data.length > 0) {
          setChatHistory(historyResponse.data);
          setIsFirstInput(false);
          setShowSessionMessage(false);
        }
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  };
  
  loadSessionData();
}, []);


// Nouveaux états pour la gestion des références
const [probableReference, setProbableReference] = useState(null);
const [showReferenceModal, setShowReferenceModal] = useState(false);

// Effet pour détecter la référence probable dans les réponses
useEffect(() => {
  // Si on est en session test et qu'on a des messages
  if (currentSession === 3 && chatHistory.length > 0) {
    // Chercher le dernier message du bot
    const lastBotMessage = [...chatHistory].reverse().find(msg => msg.sender === 'bot');
    
    if (lastBotMessage && lastBotMessage.metadata) {
      try {
        // Essayer d'extraire des métadonnées de référence
        // Ceci dépendra de votre format exact de métadonnées 
        // Voici une implémentation d'exemple :
        
        // Si les métadonnées contiennent une référence structurée
        if (lastBotMessage.metadata.reference) {
          setProbableReference(lastBotMessage.metadata.reference);
        }
        // Sinon, essayer de construire une référence à partir des métadonnées textuelles
        else {
          // Exemple simple - dans un cas réel, vous devriez parser correctement vos métadonnées
          const metadataText = lastBotMessage.metadata;
          
          // Exemple très simplifié - à adapter selon votre format de métadonnées
          const titleMatch = metadataText.match(/titre: ([^,]+)/i);
          const authorMatch = metadataText.match(/auteur: ([^,]+)/i);
          const yearMatch = metadataText.match(/année: ([^,]+)/i);
          const coteMatch = metadataText.match(/cote: ([^,]+)/i);
          
          if (titleMatch || authorMatch) {
            setProbableReference({
              id: Date.now().toString(),
              title: titleMatch ? titleMatch[1].trim() : "Titre inconnu",
              author: authorMatch ? authorMatch[1].trim() : "Auteur inconnu",
              year: yearMatch ? yearMatch[1].trim() : null,
              cote: coteMatch ? coteMatch[1].trim() : null,
              type: "Ouvrage"
            });
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'analyse des métadonnées de référence:", error);
      }
    }
  }
}, [chatHistory, currentSession]);

// Fonction pour ouvrir le modal d'évaluation de référence
const handleViewReference = () => {
  if (probableReference) {
    setShowReferenceModal(true);
  }
};

// Fonction pour fermer le modal
const handleCloseReferenceModal = () => {
  setShowReferenceModal(false);
};
const handleExitTutorial = () => {
  setTutorialMode(false);
};
// Fonction pour soumettre l'évaluation d'une référence
const handleSubmitReferenceEvaluation = async (evaluationData) => {
  try {
    await axios.post('/api/dev/evaluate-reference', evaluationData);
    
    // Afficher un message de confirmation
    setChatHistory(prev => [
      ...prev,
      {
        sender: 'system',
        message: `Évaluation enregistrée (${evaluationData.rating}/5 étoiles). Merci pour votre feedback !`,
        timestamp: new Date().toISOString()
      }
    ]);
    
  } catch (error) {
    console.error('Échec de l\'enregistrement de l\'évaluation:', error);
  }
};

// Mise à jour de la fonction handleConfirmChat


const handleNextTutorialStep = () => {
  setTutorialStep(prevStep => prevStep + 1);
};

const handleCompleteTutorial = () => {
  // Désactiver le mode tutoriel
  setTutorialMode(false);
  
  // Enregistrer que le tutoriel est terminé
  axios.post('/api/dev/complete-tutorial')
    .then(() => {
      // Préparer le passage à la session libre
      handleNextSession();
    })
    .catch(error => {
      console.error('Failed to complete tutorial:', error);
    });
};

// Fonction pour gérer le redémarrage du tutoriel
const handleRestartTutorial = () => {
  setTutorialStep(1);
};

// Fonction pour confirmer le tutoriel
const handleConfirmTutorial = () => {
  setChatHistory(prev => [
    ...prev,
    {
      sender: 'system',
      message: 'Tutoriel confirmé. Vous pouvez maintenant passer à la session libre.',
      timestamp: new Date().toISOString()
    }
  ]);
};
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
// Effet pour démarrer le minuteur pour la session appropriée
useEffect(() => {
  if (currentSession === 2) {
    return startSessionTimer(5 * 60); // 5 minutes pour la session libre
  } else if (currentSession === 3) {
    return startSessionTimer(35 * 60); // 35 minutes pour la session test
  }
}, [currentSession]);


const [showGuides, setShowGuides] = useState(false);

// Fonction pour gérer la sélection d'un guide
const handleSelectGuide = (sampleQuery) => {
  setUserInput(sampleQuery);
  // Focus sur l'entrée de message
  setTimeout(() => {
    const inputElement = document.querySelector('.cs-message-input__content-editor');
    if (inputElement) {
      inputElement.focus();
    }
  }, 100);
};

useEffect(() => {
  if (currentSession === 3 && showSessionMessage) {
    setShowGuides(true);
  } else {
    setShowGuides(false);
  }
}, [currentSession, showSessionMessage]);


// Fonction de formatage du temps mise à jour
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Démarrer le minuteur (version généralisée)
const startSessionTimer = (totalSeconds) => {
  // Nettoyer tout minuteur existant
  if (timerIntervalRef.current) {
    clearInterval(timerIntervalRef.current);
  }
  
  let timeLeft = totalSeconds;
  
  setSessionTimer(formatTime(timeLeft));
  
  timerIntervalRef.current = setInterval(() => {
    timeLeft -= 1;
    setSessionTimer(formatTime(timeLeft));
    
    if (timeLeft <= 0) {
      clearInterval(timerIntervalRef.current);
      
      // Alerte de fin selon la session
      if (currentSession === 2) {
        setSessionEndAlert(true);
      } else if (currentSession === 3) {
        // Peut-être une alerte différente pour la fin de session test
        setChatHistory(prev => [
          ...prev,
          {
            sender: 'system',
            message: 'Votre temps de session test est écoulé. Veuillez confirmer et terminer la session.',
            timestamp: new Date().toISOString()
          }
        ]);
      }
    }
  }, 1000);
  
  return () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };
};

  const handleTutorialCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setShowTutorial(false);
    }
  };

  const handleSubmit = async (message) => {
    if (!message.trim() || isLoading) return;
    
    // Masquer les guides et le message d'introduction
    if (showGuides) setShowGuides(false);
    if (showSessionMessage) setShowSessionMessage(false);
  
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

    setProbableReference({
      id: "ref-001-test",
      title: "Les Misérables",
      author: "Victor Hugo",
      year: "1862",
      publisher: "A. Lacroix, Verboeckhoven & Cie",
      cote: "FOL-Y2-222",
      type: "Roman",
      description: "L'œuvre majeure de Victor Hugo racontant l'histoire de Jean Valjean, un ancien forçat qui tente de se racheter."
    }); 
  
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
        // Désactiver le mode tutoriel si on quitte la session 1
        if (currentSession === 1) {
          setTutorialMode(false);
        }
        
        // Nettoyage du minuteur pour les sessions avec chronomètre
        if ((currentSession === 2 || currentSession === 3) && timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          setSessionTimer(null);
        }
        
        // Appel API pour changer de session
        await axios.post('/api/dev/change-session', { 
          sessionId: currentSession + 1, 
          isFreeTest: currentSession === 1 // Session libre = session 2
        });
        
        // Réinitialisation complète de l'état pour la nouvelle session
        setChatHistory([]);
        setIsFirstInput(true);
        setThoughtProcess([]);
        setTimingData({});
        setNeedsAnnotation(false);
        
        // Mise à jour de la session
        setCurrentSession(prevSession => prevSession + 1);
        setShowSessionMessage(true);
        setShowGuides(currentSession + 1 === 3); // Afficher les guides si on passe à la session test
        
      } catch (error) {
        console.error('Échec du changement de session:', error);
      }
    } else {
      // Rediriger vers la page de feedback
      navigate('/feedback');
    }
  };
// Fonction pour recommencer la conversation actuelle
const handleRestartChat = async () => {
  try {
    await axios.post('/api/dev/restart-chat');
    
    // Réinitialisation de l'état de la conversation uniquement
    setChatHistory([]);
    setIsFirstInput(true);
    setThoughtProcess([]);
    setTimingData({});
    setNeedsAnnotation(false);
    
    // Afficher le message de démarrage de conversation
    setShowSessionMessage(false); // On ne montre pas le message de session puisqu'on reste dans la même session
    
    // Ajouter un message système indiquant le redémarrage
    setChatHistory([{
      sender: 'system',
      message: 'Nouvelle conversation démarrée.',
      timestamp: new Date().toISOString()
    }]);
  } catch (error) {
    console.error('Échec du redémarrage de la conversation:', error);
  }
};

// Fonction pour abandonner la conversation actuelle
const handleAbandonChat = async () => {
  if (chatHistory.length <= 1) {
    // S'il n'y a pas encore de vraie conversation, simplement réinitialiser
    handleRestartChat();
    return;
  }
  
  try {
    await axios.post('/api/dev/abandon-chat');
    
    // Ajouter un message système
    setChatHistory(prev => [
      ...prev,
      {
        sender: 'system',
        message: 'Conversation abandonnée. Vous pouvez démarrer une nouvelle conversation.',
        timestamp: new Date().toISOString()
      }
    ]);
    
    // Désactiver l'entrée pour forcer l'utilisateur à redémarrer
    setIsLoading(true); // Empêche l'envoi de nouveaux messages
    
    // Délai avant de proposer de redémarrer
    setTimeout(() => {
      setIsLoading(false);
      setIsFirstInput(true); // Prêt pour une nouvelle conversation
    }, 2000);
    
  } catch (error) {
    console.error('Échec de l\'abandon de la conversation:', error);
  }
};

// Fonction pour confirmer la conversation actuelle comme satisfaisante
const handleConfirmChat = async () => {
  if (chatHistory.length <= 1) {
    // Aucune conversation à confirmer
    alert('Aucune conversation à confirmer. Posez d\'abord une question.');
    return;
  }
  
  // Si on est en session test et qu'une référence probable a été identifiée
  if (currentSession === 3 && probableReference) {
    // Ouvrir directement le modal d'évaluation
    setShowReferenceModal(true);
    return;
  }
  
  try {
    await axios.post('/api/dev/confirm-chat');
    
    // Ajouter un message de confirmation
    setChatHistory(prev => [
      ...prev,
      {
        sender: 'system',
        message: 'Conversation confirmée. Cette conversation sera enregistrée comme référence positive.',
        timestamp: new Date().toISOString()
      }
    ]);
    
  } catch (error) {
    console.error('Échec de la confirmation de la conversation:', error);
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
      {showTutorial && !tutorialMode && (
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
  onRestartChat={handleRestartChat}
  onAbandonChat={handleAbandonChat}
  onConfirmChat={handleConfirmChat}
  tutorialMode={tutorialMode && currentSession === 1}
  onRestartTutorial={handleRestartTutorial}
  onConfirmTutorial={handleConfirmTutorial}
  onExitTutorial={handleExitTutorial}
  probableReference={probableReference}
  onViewReference={handleViewReference}
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
  {/* Tutorial mode */}
  {tutorialMode ? (
    <TutorialSteps 
      currentStep={tutorialStep}
      onNextStep={handleNextTutorialStep}
      onComplete={handleCompleteTutorial}
    />
  ) : (
    <>
      {/* Messages d'intro de session */}
      {showSessionMessage && (
        <div className="session-intro-message">
          {currentSession === 1 && (
            <Message
              model={{
                message: "Bienvenue dans le tutoriel de BNF Chat. Nous allons vous apprendre à utiliser cet outil de recherche bibliographique.<br/><br/><strong>Exemple de démarrage :</strong><br/>Essayez de poser une question comme :<br/><em>\"Pouvez-vous me recommander des ouvrages sur l'histoire de Paris au 19ème siècle ?\"</em><br/><br/>Vous pouvez également demander des informations sur des auteurs spécifiques ou des périodes historiques. Quand vous êtes prêt à passer à l'étape suivante, cliquez sur le bouton 'Passer à la session libre' en bas à gauche.",
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
                message: "Vous êtes maintenant dans la session libre. Vous disposez de 5 minutes pour tester librement le chat. Posez n'importe quelle question sur les ressources bibliographiques de la BNF. Après ce délai, vous serez automatiquement redirigé vers la session test.",
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
                message: "Vous êtes maintenant dans la session test. Vous disposez de 35 minutes pour effectuer les recherches guidées ci-dessous. Lorsque vous avez terminé, cliquez sur 'Confirmer' pour valider votre session, puis 'Terminer et évaluer' pour passer au questionnaire final.",
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

      {/* Guides de recherche pour la session test */}
      {showGuides && currentSession === 3 && (
        <GuidedSearch onSelectGuide={handleSelectGuide} />
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
    </>
  )}
</MessageList>
// À ajouter à la fin du rendu, juste avant la fermeture de la div className="chat-page"
{showReferenceModal && probableReference && (
  <ReferenceEvaluationModal
    isOpen={showReferenceModal}
    onClose={handleCloseReferenceModal}
    reference={probableReference}
    onSubmit={handleSubmitReferenceEvaluation}
  />
)}
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