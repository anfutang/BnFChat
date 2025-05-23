import React from 'react';

const SessionNavigation = ({ 
  currentSession, 
  isTransitioning,
  isConnected,
  onNextSession, 
  onRestartChat, 
  onAbandonChat
}) => {
  
  const getNextSessionLabel = () => {
    switch (currentSession) {
      case 1:
        return 'Commencer l\'exercice';
      case 2:
        return 'Passer au test';
      case 3:
        return 'Terminer et évaluer';
      default:
        return 'Continuer';
    }
  };

  const canUseActions = isConnected && !isTransitioning;

  return (
    <div className="session-navigation">
      {/* Chat Actions - Only for sessions 2 and 3 */}
      {currentSession > 1 && (
        <div className="chat-actions">
          {/* <button 
            onClick={onRestartChat} 
            className="action-btn restart-btn"
            disabled={!canUseActions}
            title={!isConnected ? 'Connexion requise' : 'Recommencer la conversation'}
          >
            🔄 Recommencer
          </button>
          
          <button 
            onClick={onAbandonChat} 
            className="action-btn abandon-btn"
            disabled={!canUseActions}
            title={!isConnected ? 'Connexion requise' : 'Abandonner et créer une nouvelle conversation'}
          >
            ⏭️ Abandonner
          </button> */}
        </div>
      )}
      
      {/* Session Transition */}
      <div className="session-transition">
        <button 
          onClick={onNextSession} 
          className={`next-session-btn ${currentSession === 3 ? 'finish-btn' : ''}`}
          disabled={isTransitioning}
        >
          {isTransitioning ? (
            <>
              <span className="spinner">⏳</span> 
              Transition en cours...
            </>
          ) : (
            <>
              {currentSession < 3 ? '▶️' : '✅'} {getNextSessionLabel()}
            </>
          )}
        </button>
        
        {currentSession === 1 && (
          <div className="tutorial-hint">
            <small>Terminez le tutoriel pour continuer</small>
          </div>
        )}
        
        {currentSession === 2 && (
          <div className="exercise-hint">
            <small>5 minutes pour vous familiariser</small>
          </div>
        )}
        
        {currentSession === 3 && (
          <div className="test-hint">
            <small>Session d'évaluation finale</small>
          </div>
        )}
      </div>

      {/* Connection Status Warning */}
      {!isConnected && currentSession > 1 && (
        <div className="connection-warning">
          ⚠️ Connexion interrompue - Actions limitées
        </div>
      )}
    </div>
  );
};

export default SessionNavigation;