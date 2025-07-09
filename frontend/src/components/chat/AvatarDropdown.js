import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useNavigate } from 'react-router-dom';

import { Avatar } from '@chatscope/chat-ui-kit-react';
import { CiPower } from "react-icons/ci";
import { VscAccount, VscInfo } from "react-icons/vsc";
import { GoPlay, GoCheckCircle ,GoCopilot } from "react-icons/go";

import './AvatarDropdown.css';


const AvatarDropdown = ({ currentUser, isConnected, setTutorialDone, handleLogout, setShowAboutInfoModal }) => {
  const navigate = useNavigate();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <div id="avatar-button" className="avatar-button">
          <Avatar 
            src={`https://api.dicebear.com/7.x/micah/svg?seed=${currentUser?.avatarSeed || 'default'}`} 
            name={currentUser?.username} 
            status={isConnected ? 'available' : 'away'}
          />
        </div>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-content" sideOffset={8}>
          <DropdownMenu.Label className="dropdown-label">
            {currentUser?.permissionLevel > 1 ? <GoCopilot size={20}/> : <GoCheckCircle size={20}/>}&nbsp;{currentUser?.username}
          </DropdownMenu.Label>

          <DropdownMenu.Separator className="dropdown-separator" />
          <DropdownMenu.Item className="dropdown-item" onClick={() => navigate('/account')}>
            <VscAccount size={20}/>&nbsp;Mon espace
          </DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item" onClick={() => setTutorialDone(false)}>
            <GoPlay size={20}/>&nbsp;Tutoriel
          </DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item" onClick={() => {setShowAboutInfoModal(true);}}>
            <VscInfo size={20}/>&nbsp;À propos
          </DropdownMenu.Item>
          
          <DropdownMenu.Separator className="dropdown-separator" />
          <DropdownMenu.Item className="dropdown-item" onClick={handleLogout}>
            <CiPower size={20}/>&nbsp;Se déconnecter
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default AvatarDropdown;
