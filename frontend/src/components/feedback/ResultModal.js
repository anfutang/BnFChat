import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaStar, FaRegStar, FaTimes } from 'react-icons/fa';
import './ResultModal.css';
import MultiTypeForm from './MultiTypeForm';

const ResultModal = ({ isOpen, onClose, resultData, isLoading, socketRef }) => {
  // State for storing feedback
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const prevOpenRef = useRef(isOpen);

  // intermediate question definitions
  const questions = [
    {
      id: 'chat-level-q1',
      text: 'Quel résultat préférez-vous ?',
      type: 'single',
      required: true,
      options: ['Avec conversation', 'Sans conversation', 'Aussi bien', 'Aussi mal'],
    },
    {
      id: 'chat-level-q2',
      text: 'Évaluez la qualité des résultats de recherche AVEC conversation.',
      type: 'single',
      required: true,
      options: ['Mauvais', 'Moyen', 'Très bien'],
    },
    {
      id: 'chat-level-q3',
      text: 'Les résultats de recherche (AVEC conversation) vous ont - ils parues :',
      type: 'single',
      required: true,
      options: ['Aucun résultat', 'Non pertinents', 'Partiellement pertinents', 'Tous Pertinents'],
    },
    {
      id: 'chat-level-q4',
      text: 'La catégorisation des propositions et les questions formulées par l’outil aident-elle à progresser dans la désambiguïsation de votre requête ? Merci de justifier votre choix (optionnel).',
      type: 'single+explanation',
      required: true,
      options: ['satisfaction', 'non satisfaction'],
      explanationRequired: false,
    },
    {
      id: 'chat-level-q5',
      text: 'Quelles mots utiliseriez-vous caractériser vos interactions avec l’outils ? (choix multiples ; tous les champs sont possibles)',
      type: 'multiple',
      required: true,
      options: ['Naturelles', 'Utiles', 'Informatives', 'Cohérentes', 'Engageantes', 'Surprenantes', 'Hors sujet', 'Fausses', 'Répétitives', 'Confuses', 'Trop générales']
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
    if (isOpen && resultData && !resultData.feedbackSaved) {
      console.log("⭐ Resetting feedback state with new data");
      // setPreferenceType('');
      // setQualityRating(0);
      // setConversationRating(0);
      // setComment('');
      setFeedbackSubmitted(false);
    }
  }, [isOpen, resultData]);

  useEffect(() => {
    console.log("⭐ ResultModal state changed:", { 
      isOpen, 
      isLoading, 
      hasResultData: !!resultData,
      renderKey,
      feedbackSubmitted
    });
  }, [isOpen, isLoading, resultData, renderKey, feedbackSubmitted]);

  // If modal is closed, don't render anything
  if (!isOpen) return null;

  const handleSubmitConvFeedback = async () => {
    if (!isMandatoryFilled) {
      alert("Veuillez remplir tous les champs obligatoires avant de soumettre.");
      return;
    }

    // Use the passed socketRef instead of window.socket
    if (socketRef?.current) {
      console.log("⭐ Submitting feedback...");
      console.log(formData);

      socketRef.current.emit('submit_conv_feedback', {
        formData: formData,
        resultId: resultData?.id,
        chatId: resultData?.chatId
      });
      
      // Immediately show submitted state
      setFeedbackSubmitted(true);
      
      // Close modal after a delay
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } else {
      console.error('Socket not available');
      alert('Connection error. Please try again.');
    }
  };

  // Only allow closing if loading or no result data yet
  const handleCloseModal = () => {
    if (isLoading || !resultData) {
      onClose();
    }
    // Don't allow closing if we have results - user must submit feedback
  };

  // avoid displaying too long texts
  const truncateText = (text, maxLength = 200) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };
  

  return (
    <div className="result-modal-overlay">
      <div className="result-modal">
        <div className="result-modal-header">
          <h2>Résultats de recherche</h2>
          {/* Only show close button during loading or if no results yet */}
          {/* isLoading || !resultData */}
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
                    <h3>♠️ Avec Conversation</h3>
                    <h4>Requête SRU générée</h4>
                    <div className="sru-query-box">
                      {resultData.sruQuery}
                    </div>
                    
                    <h4>Résultats</h4>
                    <div className="results-list">
                      {resultData.wcResults && resultData.wcResults.map((item, index) => (
                        <div className="result-item" key={index}>
                          <h4>{item.title}</h4>
                          {item.creator && <p className="result-creator">creator: {truncateText(String(item.creator))}</p>}
                          {item.description && <p className="result-description">description: {truncateText(String(item.description))}</p>}
                          {item.subject && <p className="result-subject">subject: {truncateText(String(item.subject))}</p>}
                          {item.date && <p className="result-date">date: {truncateText(String(item.date))}</p>}
                          {item.type && <p className="result-type">type: {truncateText(String(item.type))}</p>}
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
                        <p>Aucun résultat. Pour la question Q3, veuillez cocher « Aucun résultat ».</p>
                        <p>Cela peut être dû à une mauvaise traduction en SRU ou à une traduction SRU trop stricte.</p>
                      </div>
                    )}
                  </div>

                  <div className="result-data">
                  <h3>♣️ Sans Conversation</h3>
                  <h4>Requête SRU utilisée</h4>
                  <div className="sru-query-box">
                    {resultData.originalQuery}
                  </div>

                  <h4>Résultats</h4>
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
                  <MultiTypeForm questions={questions} onChange={handleFormChange} />
                  <div className="feedback-footer">
                    <button
                      className="submit-feedback-btn" 
                      onClick={handleSubmitConvFeedback}
                      disabled={!isMandatoryFilled}
                    >
                      Soumettre
                    </button>
                  </div>
                </div>
              ) : (
                <div className="feedback-thank-you">
                  <p>Merci pour votre évaluation!</p>
                  <p className="feedback-closing-message">La fenêtre se fermera automatiquement...</p>
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