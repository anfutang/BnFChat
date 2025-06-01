import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './FeedbackForm.css';

const FeedbackForm = ({ isOpen }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [renderKey, setRenderKey] = useState(0);
  const prevOpenRef = useRef(isOpen);

  useEffect(() => {
      if (isOpen !== prevOpenRef.current) {
        console.log("⭐ Feedback form open state changed:", { previousState: prevOpenRef.current, currentState: isOpen });
        setRenderKey(prev => prev + 1);
        prevOpenRef.current = isOpen;
      }
    }, [isOpen]);
  
  const [formData, setFormData] = useState({
    overall_satisfaction: 3,
    ease_of_use: 3,
    usefulness: 3,
    would_use_again: 'maybe',
    improvement_suggestions: '',
    general_comments: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      await axios.post('/api/dev/submit-feedback', formData);
      setSuccess(true);
      
      // Rediriger après un court délai
      setTimeout(() => {
        navigate('/chat');
      }, 3000);
      
    } catch (error) {
      console.error('Échec de soumission du feedback:', error);
      setError('Une erreur est survenue lors de la soumission du feedback. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    navigate('/chat');
  };

  if (!isOpen) return null;
  
  return (
    <div className="feedback-page-overlay">
      <div className="feedback-page">
        <div className="feedback-container">
          <div className="feedback-header">
            <h1>Évaluation de l'expérience BNF Chat</h1>
            <p>Merci de prendre quelques instants pour évaluer votre expérience avec notre outil de recherche.</p>
          </div>
          
          {success ? (
            <div className="success-message">
              <h2>Merci pour votre feedback !</h2>
              <p>Vos commentaires nous aideront à améliorer le système.</p>
              <p>Vous allez être redirigé vers la page d'accueil...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="feedback-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-section">
                <h3>Évaluation globale</h3>
                
                <div className="rating-item">
                  <label>Satisfaction générale</label>
                  <div className="rating-scale">
                    <span>Pas satisfait</span>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label key={value} className="rating-option">
                        <input
                          type="radio"
                          name="overall_satisfaction"
                          value={value}
                          checked={parseInt(formData.overall_satisfaction) === value}
                          onChange={handleChange}
                        />
                        <span>{value}</span>
                      </label>
                    ))}
                    <span>Très satisfait</span>
                  </div>
                </div>
                
                <div className="rating-item">
                  <label>Facilité d'utilisation</label>
                  <div className="rating-scale">
                    <span>Difficile</span>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label key={value} className="rating-option">
                        <input
                          type="radio"
                          name="ease_of_use"
                          value={value}
                          checked={parseInt(formData.ease_of_use) === value}
                          onChange={handleChange}
                        />
                        <span>{value}</span>
                      </label>
                    ))}
                    <span>Très facile</span>
                  </div>
                </div>
                
                <div className="rating-item">
                  <label>Utilité pour la recherche bibliographique</label>
                  <div className="rating-scale">
                    <span>Pas utile</span>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label key={value} className="rating-option">
                        <input
                          type="radio"
                          name="usefulness"
                          value={value}
                          checked={parseInt(formData.usefulness) === value}
                          onChange={handleChange}
                        />
                        <span>{value}</span>
                      </label>
                    ))}
                    <span>Très utile</span>
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Utilisation future</h3>
                
                <div className="radio-group">
                  <label>Utiliseriez-vous à nouveau cet outil pour vos recherches?</label>
                  <div className="radio-options">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="would_use_again"
                        value="yes"
                        checked={formData.would_use_again === 'yes'}
                        onChange={handleChange}
                      />
                      <span>Oui, certainement</span>
                    </label>
                    
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="would_use_again"
                        value="maybe"
                        checked={formData.would_use_again === 'maybe'}
                        onChange={handleChange}
                      />
                      <span>Peut-être</span>
                    </label>
                    
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="would_use_again"
                        value="no"
                        checked={formData.would_use_again === 'no'}
                        onChange={handleChange}
                      />
                      <span>Non</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Commentaires</h3>
                
                <div className="textarea-group">
                  <label htmlFor="improvement_suggestions">
                    Suggestions d'amélioration (Optionnel)
                  </label>
                  <textarea
                    id="improvement_suggestions"
                    name="improvement_suggestions"
                    value={formData.improvement_suggestions}
                    onChange={handleChange}
                    placeholder="Avez-vous des suggestions pour améliorer cet outil?"
                    rows={4}
                  />
                </div>
                
                <div className="textarea-group">
                  <label htmlFor="general_comments">
                    Commentaires généraux (Optionnel)
                  </label>
                  <textarea
                    id="general_comments"
                    name="general_comments"
                    value={formData.general_comments}
                    onChange={handleChange}
                    placeholder="Souhaitez-vous partager d'autres commentaires sur votre expérience?"
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Soumettre le feedback'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm;