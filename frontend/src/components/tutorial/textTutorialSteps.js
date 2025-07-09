// TutorialSteps.jsx
import React from 'react';
import { Message, MessageSeparator } from '@chatscope/chat-ui-kit-react';
import "./tutorial.css"

const TextTutorial = ({ currentStep, onNextStep, onComplete }) => {
  const tutorialSteps = [
    {
      id: 1,
      title: "Tutoriel",
      content: "<u><strong>Ce tutoriel a pour but de vous guider rapidement dans la découverte de cette interface.</strong></u>Il présente les différentes zones et la fonction des principaux boutons, mais n’est en aucun cas obligatoire.<br><br>L’interface est simple : vous pouvez parfaitement choisir d’ignorer le tutoriel et explorer par vous-même.<br><br>À noter que ce tutoriel ne fournit aucune information sur le fonctionnement du système de dialogue.Si vous avez des questions concernant la qualité des réponses, le choix du mode ou la manière d’interagir avec le système, cliquez sur l’icône ❓ en haut à droite pour consulter la FAQ.",
    },
  ];

  const step = tutorialSteps.find(step => step.id === currentStep) || tutorialSteps[0];

  return (
    <div className="text-tutorial-container">
      <div className="text-tutorial-header">{step.title}</div>
      <div className="text-tutorial-content">
        <div dangerouslySetInnerHTML={{ __html: step.content }} />
      </div>
      {/* <div className="text-tutorial-progress">{currentStep} / {tutorialSteps.length}</div> */}

      <div className="text-tutorial-controls">
        {currentStep < tutorialSteps.length ? (
          <button className="text-tutorial-next-btn" onClick={onNextStep}>Suivant</button>
        ) : (
          <button className="text-tutorial-next-btn" onClick={onComplete}>J'ai compris</button>
        )}
        {/* <div className="tutorial-progress">Tutoriel - Étape {currentStep} sur {tutorialSteps.length}</div> */}
      </div>

      
    </div>

  );
};

export default TextTutorial;
