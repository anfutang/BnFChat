import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaStar, FaRegStar, FaTimes } from 'react-icons/fa';
import { VscThumbsdown, VscThumbsdownFilled, VscThumbsup, VscThumbsupFilled } from 'react-icons/vsc'; 
import './ResultModal.css';
import MultiTypeForm from './MultiTypeForm';

const ResultModal = ({ resultData, feedbackSubmitted, setFeedbackSubmitted, setExplicitUserInputDisabled, socketRef }) => {
  // State for storing feedback
  
  const [showThankYou, setShowThankYou] = useState(false);

  const baseGallicaURL = "https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&version=1.2&startRecord=1&maximumRecords=15&page=1&collapsing=true&exactSearch=false&query={sru_query}";
  const singleResultGallicaURL = "https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&version=1.2&query={sru_query}";

  useEffect(() => {
    // 2025.7.3: If feedback is already submitted, do not show the evaluation form again.
    if (resultData?.chatId && socketRef?.current) {
      console.log("📩 Checking if feedback submitted for", resultData.chatId);
      
      socketRef.current.emit("get_feedback_status", { chatId: resultData.chatId });
    }
  }, [resultData]);

  const handleSubmitConvFeedback = async (feedback) => {
    // Use the passed socketRef instead of window.socket
    if (socketRef?.current) {
      console.log("⭐ Submitting feedback...");

      socketRef.current.emit('submit_conv_feedback', {
        feedback: feedback,
        chatId: resultData?.chatId,
      });
      
      // Immediately show submitted state
      setFeedbackSubmitted(true);
      setShowThankYou(true);
    } else {
      console.error('Socket not available');
      alert('Connection error. Please try again.');
    }
  };

  useEffect(() => {
    if (showThankYou) {
      setExplicitUserInputDisabled(true); 
      const timer = setTimeout(() => {
        setShowThankYou(false);
        setExplicitUserInputDisabled(false); 
      }, 2000);
  
      return () => clearTimeout(timer); 
    }
  }, [showThankYou]);

  // avoid displaying too long texts
  const truncateText = (text, maxLength = 200) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };
  

  return (<div className="result-container">
      {resultData && Object.keys(resultData).some(key => key !== "chatId") && (
      <>
        <p className="result-headline">Conversation terminée. Voici les sujets les plus proches de votre intention :</p>
        <div className="facet-container">
          {resultData.facet.map((facet,index) => {
            const sru = resultData.sru[index];
            const numRecord = resultData.num_records[index];
            const facetURL = numRecord > 15
                              ? baseGallicaURL.replace("{sru_query}", encodeURIComponent(sru))
                              : singleResultGallicaURL.replace("{sru_query}", encodeURIComponent(sru));
            return (<button 
              key={facet}
              className="facet-btn"
              onClick={() => window.open(facetURL,'_blank')}
            >
              {facet}
            </button>);
          })}
        </div>
      </>)}
      {showThankYou ? (
        <p className="result-headline" style={{ fontStyle: "italic", color: "gold" }}>
          Merci pour votre retour ! En cours de sauvegarde...
        </p>
      ) : !feedbackSubmitted ? (
        <div className="feedback-area">
          <p className="result-headline">Est-ce que cette conversation vous semble utile ?</p>
          <div className="feedback-btn-container">
            <button
              key="eval-dislike"
              className="feedback-btn"
              onClick={() => handleSubmitConvFeedback("dislike")}
            >
              <VscThumbsdown size={20} color="white" />
            </button>
            <button
              key="eval-like"
              className="feedback-btn"
              onClick={() => handleSubmitConvFeedback("like")}
            >
              <VscThumbsup size={20} color="white" />
            </button>
          </div>
        </div>
      ) : null}
    </div>);
};

export default ResultModal;