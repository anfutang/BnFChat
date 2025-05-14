import React from 'react';

const ResearchExperienceStep = ({ profileData, handleChange }) => {
  return (
    <div>
      <div className="question-title">
        Q4. Etes-vous actuellement engagé(e) dans une activité de recherche académique 
        (doctorat, post-doctorat, enseignement supérieur et recherche) ?
      </div>
      <div className="option-container">
        <div 
          className={`radio-option ${profileData.recherche_academique ? 'selected' : ''}`}
          onClick={() => handleChange('recherche_academique', true)}
        >
          <input
            type="radio"
            checked={profileData.recherche_academique === true}
            onChange={() => {}}
          />
          Oui
        </div>
        <div 
          className={`radio-option ${profileData.recherche_academique === false ? 'selected' : ''}`}
          onClick={() => handleChange('recherche_academique', false)}
        >
          <input
            type="radio"
            checked={profileData.recherche_academique === false}
            onChange={() => {}}
          />
          Non
        </div>
      </div>

      <div className="question-title">
        Q5. Etes-vous actuellement engagé(e) ou avez-vous pratiqué par le passé
        une activité de recherche en amateur (recherches généalogiques ou
        historiques, activité scientifique comme l'observation des étoiles,
        l'ornithologie ou la collecte de données sur la biodiversité...) ?
      </div>
      <div className="option-container">
        <div 
          className={`radio-option ${profileData.recherche_amateur ? 'selected' : ''}`}
          onClick={() => handleChange('recherche_amateur', true)}
        >
          <input
            type="radio"
            checked={profileData.recherche_amateur === true}
            onChange={() => {}}
          />
          Oui
        </div>
        <div 
          className={`radio-option ${profileData.recherche_amateur === false ? 'selected' : ''}`}
          onClick={() => handleChange('recherche_amateur', false)}
        >
          <input
            type="radio"
            checked={profileData.recherche_amateur === false}
            onChange={() => {}}
          />
          Non
        </div>
      </div>
    </div>
  );
};

export default ResearchExperienceStep;