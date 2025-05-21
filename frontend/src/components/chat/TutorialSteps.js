import React from 'react';
import { Message, MessageSeparator } from '@chatscope/chat-ui-kit-react';
// import './TutorialSteps.css';

const TutorialSteps = ({ currentStep, onNextStep, onComplete }) => {
  // Définition des étapes du tutoriel
  const tutorialSteps = [
    {
      id: 1,
      content: "Bienvenue dans le tutoriel de BNF Chat. Cet outil vous permet de rechercher des références bibliographiques dans les collections de la Bibliothèque nationale de France.",
      action: "Cliquez sur 'Suivant' pour continuer."
    },
    {
      id: 2,
      content: "Pour commencer une recherche, vous pouvez poser une question comme :<br/><em>\"Pouvez-vous me recommander des ouvrages sur l'histoire de Paris au 19ème siècle ?\"</em>",
      action: "Dans un cas réel, vous taperiez votre requête dans la zone de saisie en bas. Pour ce tutoriel, cliquez simplement sur 'Suivant'."
    },
    {
      id: 3,
      content: "Voici un exemple de réponse que vous pourriez obtenir :<br/><br/><strong>Ouvrages recommandés sur l'histoire de Paris au 19ème siècle :</strong><br/><ul><li>\"Paris au XIXe siècle\" par Jean-Claude Martin (2019), BNF cote: 8-Z-32654</li><li>\"La transformation de Paris sous le Second Empire\" par Marie Dupont (2015), BNF cote: 4-LK7-6082</li><li>\"Les grands boulevards parisiens (1850-1900)\" par Pierre Lambert (2010), BNF cote: FOL-LK7-5091</li></ul>",
      action: "La réponse inclut généralement les titres, auteurs, années de publication et cotes BNF. Cliquez sur 'Suivant'."
    },
    {
      id: 4,
      content: "Vous pouvez préciser votre recherche en posant des questions plus spécifiques comme :<br/><em>\"Je cherche des documents sur les travaux du Baron Haussmann\"</em><br/><em>\"Avez-vous des thèses récentes sur l'urbanisme parisien au 19ème siècle ?\"</em>",
      action: "Le système vous aide à affiner vos recherches. Cliquez sur 'Suivant'."
    },
    {
      id: 5,
      content: "Pendant votre session, vous pouvez utiliser ces boutons :<br/><br/><strong>Recommencer</strong> : Pour effacer la conversation actuelle et démarrer une nouvelle recherche.<br/><strong>Confirmer</strong> : Pour indiquer que la réponse vous a été utile.",
      action: "Cliquez sur 'Terminer le tutoriel' pour passer à la session exercice."
    }
  ];

  // Trouver l'étape courante
  const step = tutorialSteps.find(step => step.id === currentStep) || tutorialSteps[0];

  // Rendu de l'étape actuelle
  return (
    <div className="tutorial-container">
      <MessageSeparator>Tutoriel - Étape {currentStep} sur {tutorialSteps.length}</MessageSeparator>
      
      <Message
        model={{
          message: step.content,
          sentTime: new Date().toISOString(),
          sender: 'system',
          direction: 'incoming',
          position: 'single'
        }}
      >
        <Message.CustomContent>
          <div dangerouslySetInnerHTML={{ __html: step.content }} />
        </Message.CustomContent>
      </Message>
      
      <div className="tutorial-action">
        <span>{step.action}</span>
      </div>
      
      <div className="tutorial-controls">
        {currentStep < tutorialSteps.length ? (
          <button 
            className="tutorial-next-btn" 
            onClick={onNextStep}
          >
            Suivant
          </button>
        ) : (
          <button 
            className="tutorial-complete-btn" 
            onClick={onComplete}
          >
            Terminer le tutoriel
          </button>
        )}
      </div>
    </div>
  );
};

export default TutorialSteps;