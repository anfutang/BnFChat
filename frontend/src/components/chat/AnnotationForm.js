import React, { useState } from 'react';
import './ChatInterface.css';

const AnnotationForm = ({ onSubmit, response }) => {
  const [satisfaction, setSatisfaction] = useState(3);
  const [helpfulness, setHelpfulness] = useState(3);
  const [relevance, setRelevance] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [comments, setComments] = useState('');
  const [endConversation, setEndConversation] = useState(false);
  const [convLabel, setConvLabel] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const annotationData = {
      satisfaction,
      helpfulness,
      relevance,
      clarity,
      comments,
      selectedResponseIndex: 0, // Puisque nous sommes en mode réponse
      convLabel: endConversation ? convLabel : ''
    };
    
    onSubmit(annotationData);
  };

  return (
    <div className="annotation-form">
      <h3>Veuillez évaluer la réponse</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="rating-section">
          <div className="rating-item">
            <label>Satisfaction</label>
            <div className="rating-scale">
              <span>Pas satisfait</span>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="rating-option">
                  <input
                    type="radio"
                    name="satisfaction"
                    value={value}
                    checked={satisfaction === value}
                    onChange={() => setSatisfaction(value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
              <span>Très satisfait</span>
            </div>
          </div>
          
          <div className="rating-item">
            <label>Utilité</label>
            <div className="rating-scale">
              <span>Pas utile</span>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="rating-option">
                  <input
                    type="radio"
                    name="helpfulness"
                    value={value}
                    checked={helpfulness === value}
                    onChange={() => setHelpfulness(value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
              <span>Très utile</span>
            </div>
          </div>
          
          <div className="rating-item">
            <label>Pertinence</label>
            <div className="rating-scale">
              <span>Pas pertinent</span>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="rating-option">
                  <input
                    type="radio"
                    name="relevance"
                    value={value}
                    checked={relevance === value}
                    onChange={() => setRelevance(value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
              <span>Très pertinent</span>
            </div>
          </div>
          
          <div className="rating-item">
            <label>Clarté</label>
            <div className="rating-scale">
              <span>Pas clair</span>
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="rating-option">
                  <input
                    type="radio"
                    name="clarity"
                    value={value}
                    checked={clarity === value}
                    onChange={() => setClarity(value)}
                  />
                  <span>{value}</span>
                </label>
              ))}
              <span>Très clair</span>
            </div>
          </div>
        </div>
        
        <div className="comments-section">
          <label htmlFor="comments">Commentaires supplémentaires (Optionnel)</label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Avez-vous d'autres commentaires sur la réponse ?"
            rows={3}
          />
        </div>
        
        <div className="end-conversation-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={endConversation}
              onChange={(e) => setEndConversation(e.target.checked)}
            />
            Terminer la conversation
          </label>
          
          {endConversation && (
            <div className="conv-label-section">
              <label htmlFor="conv-label">Étiquette de conversation</label>
              <select
                id="conv-label"
                value={convLabel}
                onChange={(e) => setConvLabel(e.target.value)}
                required={endConversation}
              >
                <option value="">Sélectionnez une étiquette</option>
                <option value="success">Succès - J'ai trouvé ce que je cherchais</option>
                <option value="partial">Succès partiel - J'ai trouvé certaines informations</option>
                <option value="failure">Échec - Je n'ai pas trouvé ce que je cherchais</option>
                <option value="interrupted">Interrompu - J'ai dû terminer rapidement</option>
              </select>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-btn">
            Soumettre l'évaluation
          </button>
        </div>
      </form>
    </div>
  );
};

export default AnnotationForm;