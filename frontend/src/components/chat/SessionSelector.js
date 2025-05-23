import React from 'react';

const SessionSelector = ({ 
  sessionData, 
  topics, 
  selectedTopic, 
  onSessionChange, 
  onTopicSelect 
}) => {

  const getSessionName = (sessionId) => {
    switch (sessionId) {
      case 1: return "Tutorial";
      case 2: return "Exercise";
      case 3: return "Test";
      default: return "Unknown";
    }
  };

  return (
    <div className="session-selector">
      <div className="session-info">
        <h3>Current Session</h3>
        <div className="session-badge">
          {getSessionName(sessionData?.sessionId)}
        </div>
        
        {/* Session Navigation */}
        <div className="session-nav">
          {[1, 2, 3].map(sessionId => (
            <button
              key={sessionId}
              className={`session-btn ${sessionData?.sessionId === sessionId ? 'active' : ''}`}
              onClick={() => onSessionChange(sessionId)}
            >
              {getSessionName(sessionId)}
            </button>
          ))}
        </div>
      </div>

      {/* Topic Selection for Exercise/Test Sessions */}
      {sessionData?.sessionId > 1 && (
        <div className="topic-selector">
          <h4>Select Topic</h4>
          
          {selectedTopic && (
            <div className="current-topic">
              <strong>Current:</strong> {selectedTopic.name}
            </div>
          )}
          
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