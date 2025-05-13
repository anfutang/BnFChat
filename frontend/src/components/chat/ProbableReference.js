// ProbableReference.js
import React from 'react';
import './ProbableReference.css';

const ProbableReference = ({ reference, onView }) => {
  if (!reference) return null;
  
  return (
    <div className="probable-reference">
      <div className="reference-header">
        <span className="reference-label">Référence probable :</span>
        <button className="view-reference-btn" onClick={onView}>
          Voir détails
        </button>
      </div>
      <div className="reference-content">
        <div className="reference-title">{reference.title}</div>
        <div className="reference-author">{reference.author}</div>
        <div className="reference-details">
          {reference.year && <span>{reference.year}</span>}
          {reference.cote && <span>Cote: {reference.cote}</span>}
        </div>
      </div>
    </div>
  );
};

export default ProbableReference;