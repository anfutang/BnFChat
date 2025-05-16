import React from 'react';
import { ConversationHeader } from '@chatscope/chat-ui-kit-react';

const SessionHeader = ({ currentSession, sessionTimer, sessionData }) => {
  return (
    <ConversationHeader>
      <ConversationHeader.Content>
        {currentSession === 3 ? (
          <div className="test-session-title">Recherche documentaire BNF</div>
        ) : (
          <div>
            BNF Chat {currentSession === 1 ? '- Tutoriel' : currentSession === 2 ? '- Session libre' : ''}
          </div>
        )}
      </ConversationHeader.Content>
      <ConversationHeader.Actions>
        {sessionData?.devMode && <span className="dev-badge">DEV MODE</span>}
        {(currentSession === 2 || currentSession === 3) && sessionTimer && (
          <span className="session-timer-badge">{sessionTimer}</span>
        )}
      </ConversationHeader.Actions>
    </ConversationHeader>
  );
};

export default SessionHeader;