import React from 'react';

import "./SessionSelector.css"

const SessionSelector = ({ 
  sessionData, 
  topics, 
  selectedTopic, 
  onSessionChange, 
  onTopicSelect 
}) => {

  const getSessionName = (sessionId) => {
    switch (sessionId) {
      case 1: return "Tutoriel";
      case 2: return "Exercise";
      case 3: return "Test Officiel";
      default: return "Unknown";
    }
  };

  return (
    <div className="session-selector">
      <div className="session-info">
        <h3>Progression</h3>
        
        {/* Session Navigation */}
        {[1, 2, 3].map(sessionId => (
          <div
            key={sessionId}
            className={`session-badge ${sessionData?.sessionId === sessionId ? 'active' : 'disabled'}`}
          >
            {sessionData?.sessionId > sessionId ? '☑️' : ''} {getSessionName(sessionId)}
          </div>
        ))}
      </div>
      
      <br></br>
      <br></br>
      
      <h3>Liste de Sujets</h3>
      {/* Topic Selection for Exercise/Test Sessions */}
      {sessionData?.sessionId > 1 && (
        <div className="topic-selector">
          <div className="topic-list">
            {topics.map(topic => (
              <button
                key={topic.id}
                className={`topic-btn ${selectedTopic?.id === topic.id ? 'active' : ''}`}
                onClick={() => onTopicSelect(topic)}
              >
                <div className="topic-name">{topic.name}</div>
                <div className="topic-description">{topic.description}</div>
                <div className="topic-category">{topic.category}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionSelector;