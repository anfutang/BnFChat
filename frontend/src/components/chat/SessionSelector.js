import React, { useState } from 'react';
import './ChatInterface.css';
import './TopicNavigator.css'; // Import the CSS file

const SessionSelector = ({ currentSession, totalTime }) => {
  // Les sessions en séquence
  const sessions = [
    { id: 1, name: 'Tutoriel', description: 'Comment utiliser l\'outil' },
    { id: 2, name: 'Session exercice', description: '5 minutes d\'exercice' },
    { id: 3, name: 'Session test', description: 'Session guidée (35 minutes)' }
  ];

  const currentSessionInfo = sessions.find(s => s.id === currentSession) || sessions[0];
  
  const TopicNavigator = () => {
    // Hardcoded list of French literature topics/authors
    const topics = [
      { id: 1, name: 'Victor Hugo', period: '1802-1885' },
      { id: 2, name: 'Gustave Flaubert', period: '1821-1880' },
      { id: 3, name: 'Émile Zola', period: '1840-1902' },
      { id: 4, name: 'Marcel Proust', period: '1871-1922' },
      { id: 5, name: 'Albert Camus', period: '1913-1960' },
      { id: 6, name: 'Simone de Beauvoir', period: '1908-1986' },
      { id: 7, name: 'Charles Baudelaire', period: '1821-1867' },
      { id: 8, name: 'Jean-Paul Sartre', period: '1905-1980' },
      { id: 9, name: 'Honoré de Balzac', period: '1799-1850' },
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
          <button 
            onClick={goToPrevious}
            className="nav-button prev"
            aria-label="Sujet précédent"
          >
            ←
          </button>
          
          <div className="topic-info">
            <h4>{topics[currentTopicIndex].name}</h4>
            <p>{topics[currentTopicIndex].period}</p>
          </div>
          
          <button 
            onClick={goToNext}
            className="nav-button next"
            aria-label="Sujet suivant"
          >
            →
          </button>
        </div>
      </div>
    );
  };
  
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