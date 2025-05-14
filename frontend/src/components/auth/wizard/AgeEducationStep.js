import React from 'react';

const AgeEducationStep = ({ profileData, handleChange }) => {
  return (
    <div>
      <div className="question-title">
        Q1. Quel âge avez-vous?
      </div>
      <div className="option-container">
        <input
          type="number"
          className="input-field"
          value={profileData.age}
          onChange={(e) => handleChange('age', e.target.value)}
          min="13"
          max="120"
        />
      </div>

      <div className="question-title">
        Q2. Quel est votre diplôme le plus élevé ?
      </div>
      <div className="option-container">
        <select
          className="select-field"
          value={profileData.diplome}
          onChange={(e) => handleChange('diplome', e.target.value)}
        >
          <option value="">Sélectionnez votre niveau d'éducation</option>
          <option value="brevet">brevet des collèges</option>
          <option value="bac">baccalauréat</option>
          <option value="licence">licence</option>
          <option value="master">master</option>
          <option value="doctorat">doctorat</option>
          <option value="autre">autre</option>
        </select>
      </div>
    </div>
  );
};

export default AgeEducationStep;