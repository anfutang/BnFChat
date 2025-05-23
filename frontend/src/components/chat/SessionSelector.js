import React from 'react';
import TopicNavigator from './TopicNavigator';

const SessionSelector = ({ 
  currentSession, 
  formattedTime, 
  currentTopic, 
  detectedIntent,
  onTopicChange 
}) => {
  const sessions = [
    { 
      id: 1, 
      name: 'Tutoriel', 
      description: 'Découvrez comment utiliser l\'assistant BNF',
      icon: '📚'
    },
    { 
      id: 2, 
      name: 'Exercice', 
      description: 'Période d\'entraînement (5 minutes)',
      icon: '🎯'
    },
    { 
      id: 3, 
      name: 'Test', 
      description: 'Session d\'évaluation (35 minutes)',
      icon: '📝'
    }
  ];

  const currentSessionInfo = sessions.find(s => s.id === currentSession) || sessions[0];
  
  return (
    <div className="session-selector">
      <div className="session-header">
        <h3>Progression</h3>
        {formattedTime && (
          <div className="session-timer">
            ⏱️ {formattedTime}
          </div>
        )}
      </div>
      
      <div className="session-progress">
        {sessions.map(session => (
          <div 
            key={session.id}
            className={`session-step ${
              currentSession === session.id ? 'active' : 
              currentSession > session.id ? 'completed' : 'pending'
            }`}
          >
            <div className="step-indicator">
              <span className="step-icon">{session.icon}</span>
              <span className="step-number">{session.id}</span>
            </div>
            
            <div className="step-content">
              <div className="session-name">{session.name}</div>
              <div className="session-description">
                {session.description}
              </div>
              
              {currentSession === session.id && (
                <div className="session-status">
                  En cours...
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Intent and Topic Display */}
      {currentSession > 1 && (detectedIntent || currentTopic) && (
        <div className="session-context">
          <h4>Contexte de la session</h4>
          
          {detectedIntent && (
            <div className="detected-intent">
              <strong>Intention détectée:</strong>
              <span>{detectedIntent}</span>
            </div>
          )}
          
          {currentTopic && (
            <div className="current-topic">
              {/* <strong>Sujet sélectionné:</strong> */}
              <div className="topic-details">
                <span className="topic-name">{currentTopic.name}</span>
                {currentTopic.category && (
                  <span className="topic-category">({currentTopic.category})</span>
                )}
              </div>
              {/* {currentTopic.description && (
                <div className="topic-description">
                  <small>{currentTopic.description}</small>
                </div>
              )} */}
            </div>
          )}
        </div>
      )}
      
      {/* Topic Navigator - now properly connected */}
      <TopicNavigator 
        currentSession={currentSession}
        onTopicChange={onTopicChange}
      />
    </div>
  );
};

export default SessionSelector;