import React, { useState, useCallback } from 'react';

const TopicNavigator = ({ currentSession }) => {
  const topics = [
    { id: 1, name: 'Voltaire', category: 'Littérature', period: '1694-1778' },
    { id: 2, name: 'Napoléon III', category: 'Histoire', period: '1808-1873' },
    { id: 3, name: 'Watteau', category: 'Arts visuels', period: '1684-1721' },
    { id: 4, name: 'Michel Foucault', category: 'Philosophie', period: '1926-1984' },
    { id: 5, name: 'Mozart', category: 'Musique', period: '1756-1791' },
    { id: 6, name: 'Frédéric Chopin', category: 'Musique', period: '1810-1849' },
    { id: 7, name: 'Marcel Dupré', category: 'Musique', period: '1886-1971' },
    { id: 8, name: 'Victor Hugo', category: 'Littérature', period: '1802-1885' },
    { id: 9, name: 'Rembrandt', category: 'Arts visuels', period: '1606-1669' },
    { id: 10, name: 'Marguerite Duras', category: 'Littérature', period: '1914-1996' }
  ];

  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  
  const navigateToTopic = useCallback((direction) => {
    setCurrentTopicIndex(prev => {
      if (direction === 'next') {
        return prev === topics.length - 1 ? 0 : prev + 1;
      } else {
        return prev === 0 ? topics.length - 1 : prev - 1;
      }
    });
  }, [topics]);

  const currentTopic = topics[currentTopicIndex];
  
  // Only show topic navigator in exercise and test sessions
  if (currentSession < 2) {
    return null;
  }

  return (
    <div className="topic-navigator">
      <h3>Sujet suggéré</h3>
      
      <div className="topic-container">
        <button 
          onClick={() => navigateToTopic('prev')}
          className="nav-button prev"
          aria-label="Sujet précédent"
          disabled={topics.length <= 1}
        >
          ←
        </button>
        
        <div className="topic-info">
          <h4>{currentTopic.name}</h4>
          <div className="topic-details">
            <span className="topic-category">{currentTopic.category}</span>
            {currentTopic.period && (
              <span className="topic-period">({currentTopic.period})</span>
            )}
          </div>
          <div className="topic-counter">
            {currentTopicIndex + 1} / {topics.length}
          </div>
        </div>
        
        <button 
          onClick={() => navigateToTopic('next')}
          className="nav-button next"
          aria-label="Sujet suivant"
          disabled={topics.length <= 1}
        >
          →
        </button>
      </div>
      
      <div className="topic-hint">
        <small>💡 Utilisez ce sujet comme inspiration pour votre recherche</small>
      </div>
    </div>
  );
};

export default TopicNavigator;