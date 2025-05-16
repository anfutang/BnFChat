import React from 'react';
import { MessageInput } from '@chatscope/chat-ui-kit-react';
import AnnotationForm from './AnnotationForm';

const InputArea = ({
  needsAnnotation,
  userInput,
  setUserInput,
  isLoading,
  sessionEndAlert,
  onSend,
  onAnnotationSubmit,
  currentResponse
}) => {
  return (
    <>
      {!needsAnnotation ? (
        <MessageInput
          placeholder="Tapez votre message ici..."
          value={userInput}
          onChange={val => setUserInput(val)}
          onSend={onSend}
          disabled={isLoading || needsAnnotation || sessionEndAlert}
          attachButton={false}
        />
      ) : (
        <AnnotationForm
          onSubmit={onAnnotationSubmit}
          response={currentResponse}
        />
      )}
    </>
  );
};

export default InputArea;