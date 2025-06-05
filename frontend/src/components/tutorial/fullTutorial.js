// FullTutorial.jsx
import React, { useState } from 'react';
import TextTutorial from './textTutorialSteps';
import TutorialWithJoyride from './tutorialWithJoyride';

const FullTutorial = ({ onTutorialComplete, setBackgroundBlur, setUserInput, setMessages, setSelectedTopic, setDetectedUserIntent }) => {
  const [phase, setPhase] = useState('text');
  const [textStep, setTextStep] = useState(1);

  const handleTextNext = () => setTextStep(prev => prev + 1);
  const handleTextComplete = () => {setBackgroundBlur(false); setPhase('joyride');};
  const handleJoyrideComplete = () => onTutorialComplete();

  return (
    <>
      {phase === 'text' && (
        <TextTutorial
          currentStep={textStep}
          onNextStep={handleTextNext}
          onComplete={handleTextComplete}
        />
      )}

      {phase === 'joyride' && (
        <TutorialWithJoyride 
          onComplete={handleJoyrideComplete} 
          setUserInput={setUserInput}
          setMessages={setMessages}
          setSelectedTopic={setSelectedTopic}
          setDetectedUserIntent={setDetectedUserIntent}
        />
      )}
    </>
  );
};

export default FullTutorial;
