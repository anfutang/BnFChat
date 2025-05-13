import React from 'react';

const ContactPreferencesStep = ({ profileData, handleChange }) => {
  return (
    <div>
      <div className="question-title">
        Q9. Accepteriez-vous d'être contacté.e à nouveau dans le cadre de cette enquête?
      </div>
      <div className="option-container">
        <div 
          className={`radio-option ${profileData.contact_autorise ? 'selected' : ''}`}
          onClick={() => handleChange('contact_autorise', true)}
        >
          <input
            type="radio"
            checked={profileData.contact_autorise === true}
            onChange={() => {}}
          />
          Oui
        </div>
        <div 
          className={`radio-option ${profileData.contact_autorise === false ? 'selected' : ''}`}
          onClick={() => handleChange('contact_autorise', false)}
        >
          <input
            type="radio"
            checked={profileData.contact_autorise === false}
            onChange={() => {}}
          />
          Non
        </div>
      </div>
    </div>
  );
};

export default ContactPreferencesStep;