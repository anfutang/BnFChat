import React from 'react';
import { Avatar } from '@chatscope/chat-ui-kit-react';

const AvatarSelectionStep = ({ profileData, handleChange }) => {
  // Liste des avatars disponibles
  const predefinedSeeds = [
    1, 2, 105, 107, 862, 59, 
    102, 10332, 85, 235, 871, 577, 
    351, 904, 903, 975, 110, 863, 
  ];
  
  const avatars = predefinedSeeds.map(seed => ({ seed }));

  return (
    <div>
      <div className="question-title">
        Choisissez un avatar
      </div>
      <div className="avatar-grid">
        {avatars.map((avatar) => (
          <div
            key={avatar.seed}
            className={`avatar-btn ${profileData.avatar_seed === avatar.seed ? 'selected' : ''}`}
            onClick={() => handleChange('avatar_seed', avatar.seed)}
          >
            <Avatar 
              src={`https://api.dicebear.com/7.x/micah/svg?seed=${avatar.seed}`} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvatarSelectionStep;