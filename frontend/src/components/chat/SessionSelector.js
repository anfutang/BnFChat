import React from 'react';
import './ChatInterface.css';

const SessionSelector = ({ currentSessionId, isFreeTest, onSessionChange }) => {
  // Define the available session types
  const sessionTypes = [
    { id: 1, name: 'Respond Mode', description: 'AI responds to your questions' },
    { id: 2, name: 'Select Mode', description: 'Choose from multiple AI responses' },
    { id: 3, name: 'Mixed Mode', description: 'Combination of respond and select modes' }
  ];

  const handleSessionClick = (sessionId) => {
    onSessionChange(sessionId, true);
  };

  return (
    <div className="session-selector">
      <h3>Session Type</h3>
      
      <div className="session-options">
        {sessionTypes.map(session => (
          <div 
            key={session.id}
            className={`session-option ${currentSessionId === session.id ? 'active' : ''}`}
            onClick={() => handleSessionClick(session.id)}
          >
            <div className="session-name">{session.name}</div>
            <div className="session-description">{session.description}</div>
          </div>
        ))}
      </div>
      
      <div className="free-test-toggle">
        <label className="toggle">
          <input 
            type="checkbox" 
            checked={isFreeTest} 
            onChange={(e) => onSessionChange(currentSessionId, e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
        <span>Free Test Mode</span>
      </div>
    </div>
  );
};

export default SessionSelector;