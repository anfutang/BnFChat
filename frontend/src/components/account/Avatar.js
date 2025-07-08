// UserAvatar.js
import React, { useState } from 'react';
import { Avatar } from '@chatscope/chat-ui-kit-react';

// const predefinedSeeds = Array.from({ length: 18 }, (_, i) => i + 960);

const predefinedSeeds = [
  1, 2, 105, 107, 862, 59, 
  102, 10332, 85, 235, 871, 577, 
  351, 904, 903, 975, 110,  863, 
];

const UserAvatar = ({ currentUser, setCurrentUser }) => {
  const [selectedSeed, setSelectedSeed] = useState(currentUser.avatarSeed);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateMessageColor, setUpdateMessageColor] = useState('white');

  const handleAvatarSelection = async (newSeed) => {
    if (newSeed === selectedSeed || isUpdating) return;

    setIsUpdating(true);
    setUpdateMessageColor("white");
    setUpdateMessage("Mise à jour en cours...");

    const params = new URLSearchParams({
      userId: currentUser.userId,
      avatarSeed: newSeed
    });

    fetch(`/api/account/change-avatar-seed?${params.toString()}`, {
      method: 'GET'
    })
      .then(response => {
        return response.json().then(result => ({
          ok: response.ok,
          result
        }));
      })
      .then(({ ok, result }) => {
        if (!ok || !result.success) {
          setUpdateMessageColor("red");
          setUpdateMessage("Échec de la mise à jour. Veuillez réessayer.");
        } else {
          setSelectedSeed(newSeed);
          setCurrentUser(prev => ({ ...prev, avatarSeed: newSeed }));
          setUpdateMessageColor("greenyellow");
          setUpdateMessage("Mise à jour réussie !");
          setTimeout(() => setUpdateMessage(''), 2000);
        }
      })
      .catch(error => {
        console.error('Failed to update avatar seed:', error);
        setUpdateMessageColor("red");
        setUpdateMessage("Échec de la mise à jour. Veuillez réessayer.");
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  return (
    <div className="content-area" style={{ width:"100%" }}>
      <div className="current-avatar">
        <p className="avatar-headline">Votre avatar actuel</p>
        <div className="avatar-icon">
          <img
            src={`https://api.dicebear.com/7.x/micah/svg?seed=${currentUser.avatarSeed}`}
            alt="Current Avatar"
          />
        </div>
      </div>

      <div className="avatar-grid-container">
        <p className="avatar-headline">Choisissez un nouvel avatar</p>
        <p className="avatar-update-message" style={{ color:updateMessageColor }}>
          {updateMessage || '\u00A0'}
        </p>
        <div className="avatar-grid">
          {predefinedSeeds.map((seed) => (
            <div
              key={seed}
              className={`avatar-item ${selectedSeed === seed ? 'selected' : ''}`}
              onClick={() => handleAvatarSelection(seed)}
              style={{
                backgroundColor: selectedSeed === seed ? '#ffe0b2' : 'antiquewhite',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                opacity: isUpdating ? 0.6 : 1,
              }}
            >
              <img
                src={`https://api.dicebear.com/7.x/micah/svg?seed=${seed}`}
                alt={`Avatar ${seed}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserAvatar;
