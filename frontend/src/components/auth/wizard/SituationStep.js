import React from 'react';

const SituationStep = ({ profileData, handleChange }) => {
  const situations = [
    { value: 'exercant', label: 'exerçant une activité professionnelle (actifs, apprentis, stagiaire)' },
    { value: 'recherche_emploi', label: 'à la recherche d\'un emploi' },
    { value: 'retraite', label: 'à la retraite ou en pré-retraite' },
    { value: 'etudiant', label: 'lycéen ou étudiant' },
    { value: 'foyer', label: 'homme ou femme au foyer' },
    { value: 'autre', label: 'dans une autre situation' }
  ];

  return (
    <div>
      <div className="question-title">
        Q3. Actuellement, quelle est votre situation?
      </div>
      <div className="option-container">
        {situations.map((situation) => (
          <div 
            key={situation.value}
            className={`radio-option ${profileData.situation === situation.value ? 'selected' : ''}`}
            onClick={() => handleChange('situation', situation.value)}
          >
            <input
              type="radio"
              checked={profileData.situation === situation.value}
              onChange={() => {}}
            />
            {situation.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SituationStep;