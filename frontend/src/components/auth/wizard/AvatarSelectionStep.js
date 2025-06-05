import React from 'react';
import { Avatar } from '@chatscope/chat-ui-kit-react';

const AvatarSelectionStep = ({ profileData, handleChange }) => {
  // Liste des avatars disponibles
  const avatars = Array.from({ length: 18 }, (_, i) => ({
    seed: i + 1
  }));

  return (
    <div>
      <div className="question-title">
        Choisissez un avatar
      </div>
      <div className="avatar-grid">
        {avatars.map((avatar) => (
          <div
            key={avatar.seed}
            className={`avatar-item ${profileData.avatar_seed === avatar.seed ? 'selected' : ''}`}
            onClick={() => handleChange('avatar_seed', avatar.seed)}
            style={{ backgroundColor: "antiquewhite" }}
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