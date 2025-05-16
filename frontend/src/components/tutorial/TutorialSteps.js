import React from 'react';

const TutorialSteps = ({ currentStep, onNextStep, onComplete }) => {
  const tutorialContent = [
    {
      title: "Bienvenue à BNF Chat",
      content: "Ce tutoriel vous expliquera comment utiliser cet outil de recherche bibliographique."
    },
    {
      title: "Poser des questions",
      content: "Posez vos questions concernant la littérature, l'histoire, ou demandez des recommandations de lectures."
    },
    {
      title: "Évaluer les références",
      content: "Après avoir reçu une réponse, vous pourrez évaluer la pertinence des références fournies."
    },
    {
      title: "Navigation entre sessions",
      content: "À la fin du tutoriel, vous passerez à une session libre de 5 minutes, puis à la session guidée de 35 minutes."
    }
  ];

  const currentContent = tutorialContent[currentStep - 1] || tutorialContent[0];
  const isLastStep = currentStep >= tutorialContent.length;

  return (
    <div className="tutorial-container">
      <div className="tutorial-step">
        <h3>{currentContent.title}</h3>
        <div className="tutorial-content">
          {currentContent.content}
        </div>
        <div className="tutorial-actions">
          {!isLastStep ? (
            <button className="tutorial-next-btn" onClick={onNextStep}>
              Suivant
            </button>
          ) : (
            <button className="tutorial-complete-btn" onClick={onComplete}>
              Terminer le tutoriel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorialSteps;