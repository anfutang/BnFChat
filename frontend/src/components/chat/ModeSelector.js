import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { VscChevronDown, VscComment, VscSearch } from "react-icons/vsc";

import './ModeSelector.css';
import { useState } from 'react';

const MODES = {
  search: {
    label: 'Recherche',
    description: 'Pour les Gallicanautes',
    icon: <VscSearch size={20} />
  },
  chat: {
    label: 'Exploration',
    description: 'Pour les curieux',
    icon: <VscComment size={20} />
  }
};

const ModeSelector = ({ userData, handleModeChange }) => {
  const currentMode = userData.mode;
  
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="mode-trigger">
          <VscChevronDown size={20} color="white"/>&nbsp;
          {MODES[currentMode]?.label}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-content" sideOffset={8}>
          {Object.entries(MODES).map(([key, { label, description, icon }]) => (
            <DropdownMenu.Item
              key={key}
              className={`dropdown-item ${key === currentMode ? 'disabled' : ''}`}
              disabled={key === currentMode}
              onClick={() => handleModeChange(key)}
            >
              <div className="item-icon">{icon}</div>
              <div className="item-text">
                <div className="item-label">{label}</div>
                <div className="item-description">{description}</div>
              </div>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default ModeSelector;
