import React from 'react';
import { ConversationHeader } from '@chatscope/chat-ui-kit-react';

const SessionHeader = ({ currentSession, sessionTimer, sessionData, intentData }) => {
  return (
    <ConversationHeader>
      <ConversationHeader.Content>
        {currentSession >= 2 ? (
          typeof intentData === 'string' && intentData.trim() !== '' && (
            <div className="test-session-title">
              💡 {intentData}
            </div>
          )
        ) : (
          <div>
            BNF Chat {currentSession === 1 ? '- Tutoriel' : currentSession === 2 ? '- Session exercice' : ''}
          </div>
        )}
      </ConversationHeader.Content>
      <ConversationHeader.Actions>
        {(currentSession === 2 || currentSession === 3) && sessionTimer && (
          <span className="session-timer-badge">{sessionTimer}</span>
        )}
      </ConversationHeader.Actions>
    </ConversationHeader>
  );
};

export default SessionHeader;