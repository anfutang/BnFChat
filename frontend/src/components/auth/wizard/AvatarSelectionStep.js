import React from 'react';

const AvatarSelectionStep = ({ profileData, handleChange }) => {
  // Liste des avatars disponibles
  const avatars = Array.from({ length: 36 }, (_, i) => ({
    id: i + 1,
    // Utilisation des couleurs du design montré dans les images
    color: ['#2a9d8f', '#e76f51', '#264653', '#f4f1de'][i % 4]
  }));

  return (
    <div>
      <div className="question-title">
        Choisissez un avatar
      </div>
      <div className="avatar-grid">
        {avatars.map((avatar) => (
          <div
            key={avatar.id}
            className={`avatar-item ${profileData.avatar_id === avatar.id ? 'selected' : ''}`}
            onClick={() => handleChange('avatar_id', avatar.id)}
            style={{ backgroundColor: avatar.color }}
          >
            <span role="img" aria-label="avatar">
              {/* Affichage d'une émoticône souriante simple, à remplacer par vos vrais avatars */}
              😊
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvatarSelectionStep;