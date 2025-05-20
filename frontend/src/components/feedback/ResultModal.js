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
                  <h4>Q1. Quel résultat préférez-vous (avec / sans conversation) ?</h4>
                  <div className="stars-container">
                    {renderStars()}
                  </div>

                  <h4>Q2. Évaluez la qualité du résultat avec conversation.</h4>
                  <div className="stars-container">
                    {renderStars()}
                  </div>

                  <h4>Q3. Évaluez la qualité globale de la conversation.</h4>
                  <div className="stars-container">
                    {renderStars()}
                  </div>

                  <h4>Q4. (optionnel) Si vous connaissez le format SRU, comment formuleriez-vous une requête SRU pour votre intention de recherche ?</h4>
                  <textarea
                    placeholder="Requête SRU que vous souhaiteriez utiliser"
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