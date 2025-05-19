import React, { useEffect } from 'react';
import { MessageList, Message, MessageSeparator, TypingIndicator, Avatar } from '@chatscope/chat-ui-kit-react';
import GuidedSearch from './GuidedSearch';

const ChatMessages = ({ 
  messageListRef, 
  chatHistory, 
  isLoading, 
  showSessionMessage, 
  currentSession,
  sessionEndAlert,
  showGuides,
  tutorialMode,
  tutorialStep,
  onSelectGuide,
  onNextTutorialStep,
  onCompleteTutorial
}) => {
  // Debugging - log chat history for troubleshooting
  useEffect(() => {
    console.log("Current chat history:", chatHistory);
  }, [chatHistory]);

  // Importer le composant TutorialSteps en fonction de l'état tutorialMode
  const TutorialSteps = tutorialMode ? require('../tutorial/TutorialSteps').default : null;
  
  return (
    <MessageList ref={messageListRef}>
      {/* Mode tutoriel */}
      {tutorialMode ? (
        <TutorialSteps 
          currentStep={tutorialStep}
          onNextStep={onNextTutorialStep}
          onComplete={onCompleteTutorial}
        />
      ) : (
        <>
          {/* Messages d'intro de session */}
          {showSessionMessage && (
            <div className="session-intro-message">
              {currentSession === 1 && (
                <Message
                  model={{
                    message: "Bienvenue dans le tutoriel de BNF Chat",
                    sentTime: new Date().toISOString(),
                    sender: "system",
                    direction: "incoming",
                    position: "single"
                  }}
                >
                  <Avatar src="/logo.png" name="Système" />
                  <Message.CustomContent>
                    <div dangerouslySetInnerHTML={{ __html: "Bienvenue dans le tutoriel de BNF Chat. Nous allons vous apprendre à utiliser cet outil de recherche bibliographique.<br/><br/><strong>Exemple de démarrage :</strong><br/>Essayez de poser une question comme :<br/><em>\"Pouvez-vous me recommander des ouvrages sur l'histoire de Paris au 19ème siècle ?\"</em><br/><br/>Vous pouvez également demander des informations sur des auteurs spécifiques ou des périodes historiques. Quand vous êtes prêt à passer à l'étape suivante, cliquez sur le bouton 'Passer à la session libre' en bas à gauche." }} />
                  </Message.CustomContent>
                </Message>
              )}
              
              {currentSession === 2 && (
                <Message
                  model={{
                    message: "Vous êtes maintenant dans la session libre",
                    sentTime: new Date().toISOString(),
                    sender: "system",
                    direction: "incoming",
                    position: "single"
                  }}
                >
                  <Avatar src="/logo.png" name="Système" />
                  <Message.CustomContent>
                    <div dangerouslySetInnerHTML={{ __html: "Vous êtes maintenant dans la session libre. Vous disposez de 5 minutes pour tester librement le chat. Posez n'importe quelle question sur les ressources bibliographiques de la BNF. Après ce délai, vous serez automatiquement redirigé vers la session test." }} />
                  </Message.CustomContent>
                </Message>
              )}
              
              {currentSession === 3 && (
                <Message
                  model={{
                    message: "Vous êtes maintenant dans la session test",
                    sentTime: new Date().toISOString(),
                    sender: "system",
                    direction: "incoming",
                    position: "single"
                  }}
                >
                  <Avatar src="/logo.png" name="Système" />
                  <Message.CustomContent>
                    <div dangerouslySetInnerHTML={{ __html: "Vous êtes maintenant dans la session test. Vous disposez de 35 minutes pour effectuer les recherches guidées ci-dessous. Lorsque vous avez terminé, cliquez sur 'Confirmer' pour valider votre session, puis 'Terminer et évaluer' pour passer au questionnaire final." }} />
                  </Message.CustomContent>
                </Message>
              )}
              
              <MessageSeparator>Début de conversation</MessageSeparator>
            </div>
          )}

          {/* Guides de recherche pour la session test */}
          {showGuides && currentSession === 3 && (
            <GuidedSearch onSelectGuide={onSelectGuide} />
          )}

          {/* Alerte de fin de session libre */}
          {sessionEndAlert && (
            <div className="session-alert">
              <Message
                model={{
                  message: "Votre temps de session libre est écoulé",
                  sentTime: new Date().toISOString(),
                  sender: "system",
                  direction: "incoming",
                  position: "single"
                }}
              >
                <Avatar src="/logo.png" name="Système" />
                <Message.CustomContent>
                  <div dangerouslySetInnerHTML={{ __html: "Votre temps de session libre est écoulé. Vous allez être redirigé vers la session test..." }} />
                </Message.CustomContent>
              </Message>
            </div>
          )}

          {/* Contenu du chat vide */}
          {chatHistory.length === 0 && !showSessionMessage && !sessionEndAlert && (
            <div className="empty-chat">
              <p>Commencez une nouvelle conversation en tapant un message ci-dessous.</p>
            </div>
          )}
          
          {/* Messages du chat */}
          {chatHistory && chatHistory.length > 0 && chatHistory.map((msg, index) => (
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
          
          {/* Indicateur de chargement */}
          {isLoading && (
            <TypingIndicator content="BNF traite votre demande..." />
          )}
        </>
      )}
    </MessageList>
  );
};

export default ChatMessages;