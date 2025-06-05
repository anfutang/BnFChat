import React from 'react';

const GallicaExperienceStep = ({ profileData, handleChange }) => {
  const frequenceOptions = [
    { value: 'un_mois', label: 'un mois ou moins' },
    { value: 'un_an', label: 'un an environ' },
    { value: 'deux_ans', label: 'deux ans environ' },
    { value: 'plus_deux_ans', label: 'deux ans ou plus' }
  ];

  // Fonction pour afficher conditionnellement la question de fréquence
  const renderUsageDetailQuestion = () => {
    if (profileData.utilise_gallica) {
      return (
        <>
          <div className="question-title">
            Q7. Utilisez-vous Gallica :
          </div>
          <div className="option-container">
            <select
              className="select-field"
              value={profileData.usage_gallica}
              onChange={(e) => handleChange('usage_gallica', e.target.value)}
            >
              <option value="">Sélectionnez votre fréquence d'utilisation</option>
              <option value="jamais">Jamais</option>
              <option value="rarement">Rarement</option>
              <option value="occasionnellement">Occasionnellement</option>
              <option value="regulierement">Régulièrement</option>
              <option value="quotidiennement">Quotidiennement</option>
            </select>
          </div>

          <div className="question-title">
            Q8. Depuis combien de temps utilisez-vous Gallica ?
          </div>
          <div className="option-container">
            <select
              className="select-field"
              value={profileData.frequence_gallica}
              onChange={(e) => handleChange('frequence_gallica', e.target.value)}
            >
              <option value="">Sélectionnez une durée</option>
              {frequenceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="question-title">
        Q6. Avez-vous déjà utilisé Gallica, la bibliothèque numérique de la BnF ?
      </div>
      <div className="option-container">
        <div 
          className={`radio-option ${profileData.utilise_gallica ? 'selected' : ''}`}
          onClick={() => handleChange('utilise_gallica', true)}
        >
          <input
            type="radio"
            checked={profileData.utilise_gallica === true}
            onChange={() => {}}
          />
          Oui
        </div>
        <div 
          className={`radio-option ${profileData.utilise_gallica === false ? 'selected' : ''}`}
          onClick={() => handleChange('utilise_gallica', false)}
        >
          <input
            type="radio"
            checked={profileData.utilise_gallica === false}
            onChange={() => {}}
          />
          Non
        </div>
      </div>

      {renderUsageDetailQuestion()}
    </div>
  );
};

export default GallicaExperienceStep;