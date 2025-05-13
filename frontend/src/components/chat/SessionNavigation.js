import React from 'react';
import './ChatInterface.css';

const SessionNavigation = ({ currentSession, onNextSession, onRestartSession, onEndSession }) => {
  const renderButtons = () => {
    switch (currentSession) {
      case 1: // Tutoriel
        return (
          <>
            <button onClick={onRestartSession} className="restart-btn">
              Recommencer
            </button>
            <button onClick={onNextSession} className="next-btn">
              Commencer session libre
            </button>
          </>
        );
      case 2: // Session libre
        return (
          <>
            <button onClick={onRestartSession} className="restart-btn">
              Recommencer
            </button>
            <button onClick={onEndSession} className="abandon-btn">
              Abandonner
            </button>
            <button onClick={onNextSession} className="next-btn">
              Passer à la session test
            </button>
          </>
        );
      case 3: // Session test
        return (
          <>
            <button onClick={onRestartSession} className="restart-btn">
              Recommencer
            </button>
            <button onClick={onEndSession} className="abandon-btn">
              Abandonner
            </button>
            <button onClick={onNextSession} className="confirm-btn">
              Terminer et évaluer
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="session-navigation">
      {renderButtons()}
    </div>
  );
};

export default SessionNavigation;