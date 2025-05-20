// Updated ResultModal component with forced re-render mechanism

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaStar, FaRegStar, FaTimes } from 'react-icons/fa';
import './ResultModal.css';

const ResultModal = ({ isOpen, onClose, resultData, isLoading }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [renderKey, setRenderKey] = useState(0); // Added render key for forcing updates
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
      setRating(0);
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
  
  // If modal is closed, don't render anything
  if (!isOpen) return null;

  const handleSubmitFeedback = async () => {
    try {
      await axios.post('/api/dev/result-feedback', {
        rating,
        comment,
        resultId: resultData?.id
      });
      setFeedbackSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const renderStars = () => {
    return Array(5).fill(0).map((_, i) => (
      <span 
        key={i} 
        onClick={() => setRating(i + 1)}
        className="star-icon"
      >
        {i < rating ? <FaStar className="filled" /> : <FaRegStar />}
      </span>
    ));
  };

  return (
    <div className="result-modal-overlay" key={renderKey}>
      <div className="result-modal">
        <div className="result-modal-header">
          <h2>Résultats de recherche</h2>
          <button className="close-button" onClick={onClose}>
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
                <div className="result-data">
                  <h3>Requête SRU générée:</h3>
                  <div className="sru-query-box">
                    {resultData.sruQuery}
                  </div>
                  
                  <h3>Résultats:</h3>
                  <div className="results-list">
                    {resultData.items && resultData.items.map((item, index) => (
                      <div className="result-item" key={index}>
                        <h4>{item.title}</h4>
                        <p className="result-author">{item.author}</p>
                        <p className="result-date">{item.date}</p>
                        <p className="result-description">{item.description}</p>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="result-link">
                            Voir dans Gallica
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {resultData.items && resultData.items.length === 0 && (
                    <div className="no-results">
                      <p>Aucun résultat trouvé pour votre recherche.</p>
                    </div>
                  )}
                </div>
              )}
              
              {!feedbackSubmitted ? (
                <div className="feedback-section">
                  <h3>Évaluez ces résultats</h3>
                  <div className="stars-container">
                    {renderStars()}
                  </div>
                  <textarea
                    placeholder="Commentaires additionnels (optionnel)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <button 
                    className="submit-feedback"
                    onClick={handleSubmitFeedback}
                    disabled={rating === 0}
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