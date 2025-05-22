import React, { useState } from 'react';
import './ChatInterface.css';
import './TopicNavigator.css'; // Import the CSS file

const TopicNavigator = () => {
  // Hardcoded list of French literature topics/authors
  const topics = [
    { id: 1, name: 'Voltaire', period: '' },
    { id: 2, name: 'Napoléon III', period: '' },
    { id: 3, name: 'Watteau', period: '' },
    { id: 4, name: 'Foucault', period: '' },
    { id: 5, name: 'Mozart', period: '' },
    { id: 6, name: 'Chopin, Frédéric', period: '' },
    { id: 7, name: 'Dupré', period: '' },
    { id: 8, name: 'Victor Hugo', period: '' },
    { id: 9, name: 'Rembrandt', period: '' },
    { id: 10, name: 'Marguerite Duras', period: '1914-1996' }
  ];

  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  
  const goToPrevious = () => {
    setCurrentTopicIndex(prev => 
      prev === 0 ? topics.length - 1 : prev - 1
    );
  };
  
  const goToNext = () => {
    setCurrentTopicIndex(prev => 
      prev === topics.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="topic-navigator">
      <h3>Sujets</h3>
      
      <div className="topics-container">
        {currentTopicIndex !== 0 && (<button 
          onClick={goToPrevious}
          className="nav-button prev"
          aria-label="Sujet précédent"
        >
          ←
        </button>)}
        
        <div className="topic-info">
          <h4>{topics[currentTopicIndex].name}</h4>
          <p>{topics[currentTopicIndex].period}</p>
        </div>
        
        {currentTopicIndex !== topics.length - 1 && (<button 
          onClick={goToNext}
          className="nav-button next"
          aria-label="Sujet suivant"
        >
          →
        </button>)}
      </div>
    </div>
  );
};

const SessionSelector = ({ currentSession, totalTime }) => {
  // Les sessions en séquence
  const sessions = [
    { id: 1, name: 'Tutoriel', description: 'Comment utiliser l\'outil' },
    { id: 2, name: 'Session exercice', description: '5 minutes d\'exercice' },
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
      
      <TopicNavigator />
    </div>
  );
};

export default SessionSelector;