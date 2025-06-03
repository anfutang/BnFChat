import React from 'react';
import { FaPlay, FaPause } from 'react-icons/fa'; 

import "./SessionSelector.css"

const SessionSelector = ({ 
  sessionData, 
  topics, 
  selectedTopic, 
  onSessionChange, 
  onTopicSelect,
  formattedTime,
  isTimerRunning,
  startTimer,
  pauseTimer,
  resetTimer
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
      
      <h3>Temps restant</h3>
      <div className="timer-container">
        <div className="timer">{formattedTime}</div>
        {isTimerRunning ? (
          <button className="timer-controller-btn" onClick={pauseTimer} disabled={sessionData.sessionId === 1 || sessionData.sessionId >= 4}><FaPause style={{ verticalAlign: 'middle' }}/></button>
        ) : (
          <button className="timer-controller-btn" onClick={startTimer} disabled={sessionData.sessionId === 1 || sessionData.sessionId >= 4}><FaPlay style={{ verticalAlign: 'middle' }}/></button>
        )}
      </div>
      
      <br></br>
      
      <h3>Liste de Sujets</h3>
      {/* Topic Selection for Exercise/Test Sessions */}
      {sessionData?.sessionId < 4 && (
        <div className="topic-list">
          {topics.map(topic => (
            <button
              key={topic.id}
              className={`topic-btn ${selectedTopic?.id === topic.id ? 'selected' : 'unselected'}`}
              onClick={() => onTopicSelect(topic)}
            >
              <div className="topic-name"><strong>{topic.name} {selectedTopic?.id === topic.id ? '✔️' : ''}</strong></div>
              <div className="topic-category" style={{ fontStyle: 'italic' }}>{topic.category}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionSelector;