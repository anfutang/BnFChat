import React from 'react';
import './ChatInterface.css';

const SessionSelector = ({ currentSession, totalTime }) => {
  // Les sessions en séquence
  const sessions = [
    { id: 1, name: 'Tutoriel', description: 'Comment utiliser l\'outil' },
    { id: 2, name: 'Session libre', description: '5 minutes d\'essai libre' },
    { id: 3, name: 'Session test', description: 'Session guidée (35 minutes)' }
  ];

  const currentSessionInfo = sessions.find(s => s.id === currentSession) || sessions[0];
  
  return (
    <div className="session-selector">
      <h3>Progression</h3>
      
      <div className="session-progress">
        {sessions.map(session => (
          <div 
            key={session.id}
            className={`session-step ${currentSession === session.id ? 'active' : ''} 
                         ${currentSession > session.id ? 'completed' : ''}`}
          >
            <div className="step-number">{session.id}</div>
            <div className="step-info">
              <div className="session-name">{session.name}</div>
              {currentSession === session.id && (
                <div className="session-description">{session.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {currentSession === 2 && totalTime && (
        <div className="session-timer">
          <div className="timer-label">Temps restant:</div>
          <div className="timer-value">{totalTime}</div>
        </div>
      )}
    </div>
  );
};

export default SessionSelector;