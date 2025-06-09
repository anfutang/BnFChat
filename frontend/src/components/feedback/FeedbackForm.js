import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './FeedbackForm.css';
import MultiTypeForm from './MultiTypeForm';

const FeedbackForm = ({ isOpen, sessionData, socketRef }) => {
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
  
 const questions = [
     {
       id: 'chat-level-q1',
       text: 'Q1. Quel(s) mot(s)définit le mieux votre état d’esprit après cette session de test (3 mots max)',
       type: 'text',
       required: true,
     },
     {
       id: 'chat-level-q2',
       text: 'Q2. En l’état cet outil vous est-il-utile ? par exemple, il répond à votre besoin, résout votre difficulté…(choix multiples ; Merci de justifier votre réponse à chaque item.)',
       type: 'multiple+explanation',
       required: true,
       explanationRequired: true,
       options: ['Utilisable (simple d’utilisation en autonomie) ', 'Désirable (vous avez envie de l’utiliser, vous le manipuler avec plaisir)'],
     },
     {
       id: 'chat-level-q3',
       text: 'Q3. Le niveau de finesse des résultats vous semble-t-il adapté à (choix multiples)',
       type: 'multiple',
       required: true,
       options: ['un néo utilisateur', 'un « usager lambda »', 'pour orienter l’utilisateur dans la richesse de Gallica', 'pour une première utilisation de Gallica', 'pour montrer les grandes tendances de la collection Gallica'],
     },
     {
       id: 'chat-level-q4',
       text: 'Q4. Commentaire libre — N’hésitez pas à partager vos impressions, idées d’amélioration ou toute autre réflexion concernant votre expérience avec l’outil.',
       type: 'text',
       required: false,
     }
   ];
 
   // manage all responses states to intermediate questions
   const [formData, setFormData] = useState(null);
   // Check if all mandatory fields are filled
   const [isMandatoryFilled, setIsMandatoryFilled] = useState(false);
 
   const handleFormChange = (data, valid) => {
     setFormData(data);
     setIsMandatoryFilled(valid);
   };
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      socketRef.current.emit('submit_final_feedback', {
        formData: formData,
        userId: sessionData.userId
      });
      setSuccess(true);
      
      // Rediriger après un court délai
      // setTimeout(() => {
      //   navigate('/login');
      // }, 3000);
      
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
        <div className="feedback-header">
          <h1>Évaluation de l'expérience BNFChat</h1>
          <p style={{ fontStyle:'italic' }}>Merci de prendre quelques instants pour évaluer votre expérience avec notre outil de recherche.</p>
        </div>
        
        {success ? (
          <div className="success-message">
            <h2>🎉 Vous avez terminé le test !</h2>
            <br></br>
            <p>Merci pour votre participation.</p>
            <p>Vos commentaires nous aideront à améliorer l'application.</p>
            <br></br>
            <br></br>
            <p style={{ fontSize:"1.2rem", fontWeight:"600", fontStyle:"italic", color:"black"}}><u>Vous pouvez maintenant quitter. Pas besoin de fermer la page.</u></p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-section">
              <MultiTypeForm questions={questions} onChange={handleFormChange} />
            </div>

            <div className="form-footer">
              <button 
                type="submit" 
                className="form-submit-btn"
                disabled={!isMandatoryFilled}
              >
                {isSubmitting ? 'Envoi en cours...' : 'Soumettre'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackForm;