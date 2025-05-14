// ReferenceEvaluationModal.js
import React, { useState } from 'react';
import './ReferenceEvaluationModal.css';

const ReferenceEvaluationModal = ({ isOpen, onClose, reference, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  
  if (!isOpen) return null;
  
  const handleSubmit = () => {
    onSubmit({ referenceId: reference.id, rating, feedback });
    onClose();
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>Évaluation de la référence</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="reference-details">
            <h4>Détails de la référence :</h4>
            <div className="reference-card">
              <div className="reference-title">{reference.title}</div>
              <div className="reference-author">{reference.author}</div>
              <div className="reference-metadata">
                {reference.year && <span>Année : {reference.year}</span>}
                {reference.publisher && <span>Éditeur : {reference.publisher}</span>}
                {reference.cote && <span>Cote BNF : {reference.cote}</span>}
                {reference.type && <span>Type : {reference.type}</span>}
              </div>
              {reference.description && (
                <div className="reference-description">{reference.description}</div>
              )}
            </div>
          </div>
          
          <div className="evaluation-section">
            <h4>Évaluez cette référence :</h4>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star}
                  className={`star ${rating >= star ? 'selected' : ''}`}
                  onClick={() => setRating(star)}
                >
                  ★
                </span>
              ))}
            </div>
            <div className="rating-labels">
              <span>Pas pertinent</span>
              <span>Très pertinent</span>
            </div>
          </div>
          
          <div className="feedback-section">
            <label htmlFor="feedback">Commentaires (facultatif) :</label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Partagez votre avis sur cette référence..."
              rows={3}
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Annuler</button>
          <button 
            className="submit-button" 
            onClick={handleSubmit}
            disabled={rating === 0}
          >
            Soumettre l'évaluation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferenceEvaluationModal;