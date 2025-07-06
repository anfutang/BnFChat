import React, { useState, useEffect } from 'react';

import { FaArrowUp } from "react-icons/fa6";

const FeedbackModal = ({ userData, setShowFeedbackModal, socketRef }) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const defaultMessage = "Exprimez-vous librement ici…";
  const [message, setMessage] = useState(defaultMessage);

  const handleSubmitUserFeedback = async () => {
    if (!feedbackText.trim()) return;

    if (socketRef?.current) {
      console.log("⭐ Submitting user feedback...");
      setIsSending(true);
      setMessage("En cours de sauvegarde...");

      socketRef.current.emit('submit_user_feedback', {
        userId: userData?.userId,
        feedback: feedbackText,
      });

      setShowThankYou(true);
      setMessage("Merci pour votre retour ! Votre avis nous intéresse.");
    } else {
      console.error('Socket not available');
      alert('Connection error. Please try again.');
    }
  };

  useEffect(() => {
    if (showThankYou) {
      const timer = setTimeout(() => {
        setShowThankYou(false);
        setFeedbackText('');
        setMessage(defaultMessage);
        setIsSending(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showThankYou]);

  // ⌨️ 监听 Enter 键（不含 Shift）提交
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && feedbackText.trim()) {
        handleSubmitUserFeedback();
      }
    }
  };

  return (
    <div className="info-modal-overlay" onClick={() => setShowFeedbackModal(false)}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()} style={{ height: "60%", width: "45%", padding: "1%" }}>
        <div className="about-info-modal-content" style={{ height: "100%", display: 'flex', flexDirection: 'column' }}>
          
          <span className="feedback-headline">Donner votre avis</span>

          <span className="feedback-message" style={{ color: showThankYou ? "green" : "black" }}>{message}</span>

          <div className="feedback-container">
            <textarea
              className="feedback-textarea"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Partagez votre expérience, vos suggestions ou tout autre retour concernant notre application…"
              onKeyDown={handleKeyDown}
              style={{ flexGrow: 1, padding: '0.5rem', fontSize: '1rem', resize: 'none' }}
              disabled={isSending}
            />

            <button
              onClick={handleSubmitUserFeedback}
              className="feedback-submit-btn"
              disabled={isSending || !feedbackText.trim()}
              style={{
                cursor: isSending ? 'not-allowed' : 'pointer'
              }}
            >
              <FaArrowUp size={20}/>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
