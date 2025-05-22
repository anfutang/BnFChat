import React from 'react';

const ThoughtProcess = ({ 
  thoughtProcess, 
  isConnected, 
  socketError,
  isLoading 
}) => {
  
  const getStepIcon = (stepName) => {
    switch (stepName) {
      case 'input_processing':
        return '📝';
      case 'intent_analysis':
        return '🎯';
      case 'search_processing':
        return '🔍';
      case 'response_generation':
        return '💭';
      case 'streaming_response':
        return '📤';
      default:
        return '⚙️';
    }
  };

  const getStepLabel = (stepName) => {
    switch (stepName) {
      case 'input_processing':
        return 'Traitement de l\'entrée';
      case 'intent_analysis':
        return 'Analyse d\'intention';
      case 'search_processing':
        return 'Recherche dans les collections';
      case 'response_generation':
        return 'Génération de la réponse';
      case 'streaming_response':
        return 'Diffusion de la réponse';
      default:
        return stepName.replace(/_/g, ' ');
    }
  };

  return (
    <div className="thought-process-container">
      <div className="process-header">
        <h3>Processus de traitement</h3>
        
        <div className="connection-indicator">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span className="status-text">
            {isConnected ? 'Connecté' : 'Déconnecté'}
          </span>
        </div>
      </div>
      
      {/* Error Display */}
      {socketError && (
        <div className="process-error">
          <strong>⚠️ Erreur:</strong> {socketError}
        </div>
      )}
      
      {/* Thought Process Steps */}
      {thoughtProcess && thoughtProcess.length > 0 ? (
        <div className="process-steps">
          {thoughtProcess.map((step, index) => (
            <div 
              key={index} 
              className={`process-step ${index === thoughtProcess.length - 1 && isLoading ? 'active' : 'completed'}`}
            >
              <div className="step-header">
                <span className="step-icon">
                  {getStepIcon(step.step)}
                </span>
                <span className="step-title">
                  {getStepLabel(step.step)}
                </span>
                {step.timestamp && (
                  <span className="step-time">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <div className="step-content">
                <div className="step-status">{step.status}</div>
                {step.result && (
                  <div className="step-result">
                    <small>{step.result}</small>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Loading indicator for current step */}
          {isLoading && (
            <div className="process-step active loading">
              <div className="step-header">
                <span className="step-icon spinner">⚙️</span>
                <span className="step-title">Traitement en cours...</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="process-empty">
          {isConnected ? (
            <div className="empty-state">
              <p>🤖 L'assistant BNF est prêt</p>
              <small>Les étapes de traitement apparaîtront ici lors du traitement de vos questions.</small>
            </div>
          ) : (
            <div className="disconnected-state">
              <p>🔴 Connexion interrompue</p>
              <small>Reconnexion en cours...</small>
            </div>
          )}
        </div>
      )}
      
      {/* Processing Summary */}
      {thoughtProcess && thoughtProcess.length > 0 && !isLoading && (
        <div className="process-summary">
          <small>
            ✅ {thoughtProcess.length} étapes terminées
          </small>
        </div>
      )}
    </div>
  );
};

export default ThoughtProcess;