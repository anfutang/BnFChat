// TutorialWithJoyride.jsx
import React, { useState } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import joyrideTutorialSteps from './joyrideTutorialSteps';

const TutorialWithJoyride = ({ onComplete, setUserInput, setMessages, setSelectedTopic, setDetectedUserIntent }) => {
  // const [stepIndex, setStepIndex] = useState(0);
  const [run, setRun] = useState(true);

  const handleJoyrideCallback = (data) => {
    const { step, type, status } = data;

    if (type === "step:after") {
      // 可以在这判断当前 step，并触发副作用
      setTimeout(() => {
        switch (step?.action) {
            case "topic":
                setSelectedTopic({"name":step.message});
                break;
            case "intent":
                setDetectedUserIntent('victor hugo');
                break;
            case "input":
                setUserInput(step.message);
                setMessages(prev => [...prev,{"content":step.message,"role":"user"}]);
                break;
            case "erase":
                setUserInput('');
                setMessages([]);
                break;
            default:
              break;
        }
      },200);
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      onComplete?.();
    }
  };

  return (
    <Joyride
      steps={joyrideTutorialSteps}
      run={run}
      continuous
      showSkipButton
      styles={{
        options: {
            overlayColor: 'rgba(0, 0, 0, 0.4)',   
            spotlightShadow: '0 0 0 10px rgba(255,255,255,0.9)', 
            spotlightPadding: 8,     
            zIndex: 10001 
        },
        buttonNext: {
            backgroundColor: "black",
            color: "white",
            fontSize: "0.8rem",
            fontFamily: "monospace",
            borderRadius: "6px",
        },
        buttonBack: {
            backgroundColor: "white",
            color: "black",
            border: "2px solid #ccc",
            fontSize: "0.8rem",
            fontFamily: "monospace",
            borderRadius: "6px",
        },
        buttonSkip: {
            backgroundColor: "antiquewhite",
            color: "black",
            fontSize: "0.8rem",
            fontFamily: "monospace",
            borderRadius: "6px",
        }
      }}
      locale={{skip:"Sauter tout", next:"Suivant", back:"Précédent", last:"Continuer"}}
      callback={handleJoyrideCallback}
      disableOverlayClose={true} 
    />
  );
};

export default TutorialWithJoyride;
