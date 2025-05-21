import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaStar, FaRegStar, FaTimes } from 'react-icons/fa';
import './ResultModal.css';

const ResultModal = ({ isOpen, onClose, resultData, isLoading }) => {
  // State for storing feedback
  const [preferenceType, setPreferenceType] = useState(''); // 'avec' or 'sans'
  const [qualityRating, setQualityRating] = useState(0); // for question 2
  const [conversationRating, setConversationRating] = useState(0); // for question 3
  const [comment, setComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const prevOpenRef = useRef(isOpen);
  
  // Force re-render when modal open state changes
  useEffect(() => {
    if (isOpen !== prevOpenRef.current) {
      console.log("⭐ Modal open state changed:", { previousState: prevOpenRef.current, currentState: isOpen });
      setRenderKey(prev => prev + 1);
      prevOpenRef.current = isOpen;
    }
  }, [isOpen]);

  // Reset feedback state when modal is opened with new data
  useEffect(() => {
    if (isOpen && resultData) {
      console.log("⭐ Resetting feedback state with new data");
      setPreferenceType('');
      setQualityRating(0);
      setConversationRating(0);
      setComment('');
      setFeedbackSubmitted(false);
    }
  }, [isOpen, resultData]);

  useEffect(() => {
    console.log("⭐ ResultModal state changed:", { 
      isOpen, 
      isLoading, 
      hasResultData: !!resultData,
      renderKey
    });
  }, [isOpen, isLoading, resultData, renderKey]);
  
  // Check if all mandatory fields are filled
  const isMandatoryFilled = preferenceType !== '' && qualityRating > 0 && conversationRating > 0;
  
  // If modal is closed, don't render anything
  if (!isOpen) return null;

  const handleSubmitFeedback = async () => {
    if (!isMandatoryFilled) {
      alert("Veuillez remplir tous les champs obligatoires avant de soumettre.");
      return;
    }
    
    try {
      await axios.post('/api/dev/result-feedback', {
        preferenceType,
        qualityRating,
        conversationRating,
        comment,
        resultId: resultData?.id
      });
      setFeedbackSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  // Simplified close handler - prioritize making modal work first
  const handleCloseModal = () => {
    if (feedbackSubmitted || !resultData || isLoading) {
      onClose();
    } else if (resultData && !isMandatoryFilled) {
      // Only block closing if we have results and mandatory fields aren't filled
      alert("Veuillez remplir tous les champs obligatoires avant de fermer.");
    } else {
      onClose();
    }
  };

  // Render star rating with labels
  const renderRatingStars = (currentValue, setValueFunction, ratingId) => {
    const ratingLabels = ["Très mauvais", "Mauvais", "Moyen", "Bon", "Parfait"];
    
    return (
      <div className="rating-container">
        <div className="stars-container">
          {Array(5).fill(0).map((_, i) => (
            <span 
              key={`${ratingId}-${i}`} 
              onClick={() => setValueFunction(i + 1)}
              className="star-icon"
            >
              {i < currentValue ? <FaStar className="filled" /> : <FaRegStar />}
            </span>
          ))}
        </div>
        <div className="rating-labels">
          {ratingLabels.map((label, i) => (
            <span 
              key={`label-${ratingId}-${i}`} 
              className={`rating-label ${currentValue === i + 1 ? 'selected' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="result-modal-overlay">
      <div className="result-modal">
        <div className="result-modal-header">
          <h2>Résultats de recherche</h2>
          <button className="close-button" onClick={handleCloseModal}>
            <FaTimes />
          </button>
        </div>
        
        <div className="result-modal-content">
          {isLoading ? (
            <div className="result-loading">
              <p>Traitement de votre recherche en cours...</p>
              <div className="loader"></div>
            </div>
          ) : (
            <>
              {resultData && (
                <div className="result-container">
                  <div className="result-data">
                    <h2>♠️ Avec Conversation</h2>
                    <h3>Requête SRU générée</h3>
                    <div className="sru-query-box">
                      {resultData.sruQuery}
                    </div>
                    
                    <h3>Résultats</h3>
                    <div className="results-list">
                      {resultData.wcResults && resultData.wcResults.map((item, index) => (
                        <div className="result-item" key={index}>
                          <h4>{item.title}</h4>
                          {item.creator && <p className="result-creator">creator: {String(item.creator)}</p>}
                          {item.description && <p className="result-description">description: {String(item.description)}</p>}
                          {item.subject && <p className="result-subject">subject: {String(item.subject)}</p>}
                          {item.date && <p className="result-date">date: {String(item.date)}</p>}
                          {item.type && <p className="result-type">type: {String(item.type)}</p>}
                          {item.link && (
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="result-link">
                              Voir dans Gallica
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {resultData.wcResults && resultData.wcResults.length === 0 && (
                      <div className="no-results">
                        <p>Aucun résultat. Mauvaise traduction SRU.</p>
                      </div>
                    )}
                  </div>

                  <div className="result-data">
                  <h2>♣️ Sans Conversation</h2>
                  <h3>Requête SRU utilisée</h3>
                  <div className="sru-query-box">
                    {resultData.originalQuery}
                  </div>

                  <h3>Résultats</h3>
                  <div className="results-list">
                    {resultData.wocResults && resultData.wocResults.map((item, index) => (
                      <div className="result-item" key={index}>
                        <h4>{item.title}</h4>
                        {item.creator && <p className="result-creator">creator: {String(item.creator)}</p>}
                        {item.description && <p className="result-description">description: {String(item.description)}</p>}
                        {item.subject && <p className="result-subject">subject: {String(item.subject)}</p>}
                        {item.date && <p className="result-date">date: {String(item.date)}</p>}
                        {item.type && <p className="result-type">type: {String(item.type)}</p>}
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="result-link">
                            Voir dans Gallica
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {resultData.wocResults && resultData.wocResults.length === 0 && (
                    <div className="no-results">
                      <p>Aucun résultat sans conversation.</p>
                    </div>
                  )}
                  </div>
                </div>
              )}
              
              {!feedbackSubmitted ? (
                <div className="feedback-section">
                  <h4>Q1. Quel résultat préférez-vous ? <span className="mandatory">*</span></h4>
                  <div className="preference-selector">
                    <div 
                      className={`preference-option ${preferenceType === 'avec' ? 'selected' : ''}`}
                      onClick={() => setPreferenceType('avec')}
                    >
                      Avec conversation
                    </div>
                    <div 
                      className={`preference-option ${preferenceType === 'sans' ? 'selected' : ''}`}
                      onClick={() => setPreferenceType('sans')}
                    >
                      Sans conversation
                    </div>
                  </div>

                  <h4>Q2. Évaluez la qualité du résultat avec conversation. <span className="mandatory">*</span></h4>
                  {renderRatingStars(qualityRating, setQualityRating, 'quality')}

                  <h4>Q3. Évaluez la qualité globale de la conversation. <span className="mandatory">*</span></h4>
                  {renderRatingStars(conversationRating, setConversationRating, 'conversation')}

                  <h4>Q4. (optionnel) Si vous connaissez le format SRU, comment formuleriez-vous une requête SRU pour votre intention de recherche ?</h4>
                  <textarea
                    placeholder="Requête SRU que vous souhaiteriez utiliser"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <button 
                    className={`submit-feedback ${!isMandatoryFilled ? 'disabled' : ''}`}
                    onClick={handleSubmitFeedback}
                    disabled={!isMandatoryFilled}
                  >
                    Soumettre l'évaluation
                  </button>
                </div>
              ) : (
                <div className="feedback-thank-you">
                  <p>Merci pour votre évaluation!</p>
                  <button className="close-after-feedback" onClick={onClose}>
                    Fermer
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultModal;