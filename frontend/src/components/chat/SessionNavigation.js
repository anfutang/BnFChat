import React from 'react';
// import './ChatInterface.css';

const SessionNavigation = ({ 
  currentSession, 
  onNextSession, 
  onRestartChat, 
  onAbandonChat, 
  onConfirmChat,
  tutorialMode = false, 
  onRestartTutorial,
  onConfirmTutorial,
  probableReference,
  onViewReference
}) => {
  return (
    <div className="session-navigation">
      {/* Actions sur la conversation courante */}
      <div className="session-actions">

            <button onClick={onRestartChat} className="restart-btn">
              Recommencer
            </button>

      </div>
      
      {/* Navigation entre sessions */}
      <div className="next-session-container">
        {currentSession === 1 && (
          <button onClick={onNextSession} className="next-session-btn">
            Passer à la session exercice
          </button>
        )}
        
        {currentSession === 2 && (
          <button onClick={onNextSession} className="next-session-btn">
            Passer à la session test
          </button>
        )}
        
        {currentSession === 3 && (
          <button onClick={onNextSession} className="next-session-btn">
            Terminer et évaluer
          </button>
        )}
      </div>
    </div>
  );
};

export default SessionNavigation;