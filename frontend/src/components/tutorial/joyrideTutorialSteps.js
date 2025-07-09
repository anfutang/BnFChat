// tutorialSteps.js
import { Avatar } from '@chatscope/chat-ui-kit-react';

const joyrideTutorialSteps = [
    {
      target: 'body',
      content: (
        <div style={{ width: '100%' }}>
            <Avatar 
                src={`https://api.dicebear.com/7.x/thumbs/svg?seed=121`} 
            />
            <p>Bienvenue ! Ceci est un tutoriel interactif, laissez-moi vous présenter notre interface!</p>
        </div>
      ),
      placement: "center",
      locale: { next: 'Suivant' }
    },
    {
      target: "#message-area",
      content: "Ici s’affichera votre conversation.",
      placement: "bottom",   
    },
    {
      target: "#message-input",
      content: "Utilisez ce champ de saisie pour communiquer avec notre système.",
      placement: "top"
    },
    {
      target: "#send-button",
      content: "Utilisez ce bouton pour envoyer votre message — équivalent à la touche Entrée.",
      placement: "top"
    },
    {
      target: "#erase-button",
      content: "Utilisez ce bouton pour effacer la zone de dialogue et commencer une nouvelle conversation — ne vous inquiétez pas, vos échanges précédents ne seront pas perdus.",
      placement: "top"
    },
    {
      target: "#mode-trigger",
      content: (<p>Choisissez ici le mode souhaité :<br></br> Recherche / Exploration"<br></br>Votre dernier choix sera mémorisé.</p>),
      placement: "bottom"
    },
    {
      target: "#faq-trigger",
      content: "Cliquez ici pour afficher la FAQ : vous y trouverez peut-être des réponses à vos questions sur l’application",
      placement: "bottom"
    },
    {
      target: "#feedback-trigger",
      content: "Cliquez ici pour envoyer vos retours — toute remarque, problème constaté ou suggestion est la bienvenue",
      placement: "bottom"
    },
    {
      target: "#avatar-button",
      content: (<p>Cliquez sur l’avatar pour faire apparaître le menu déroulant : l’accès à <u><em><strong>Mon espace</strong></em></u> se trouve ici</p>),
      placement: "bottom"
    },
    {
      target: "#chat-area",
      content: (
        <div style={{ width: '100%' }}>
            <Avatar 
                src={`https://api.dicebear.com/7.x/thumbs/svg?seed=30`} 
            />
            <p>Ok ! C’est à vous de jouer maintenant ! <br></br>Bonne utilisation !</p>
        </div>
      ),
      placement: "center",
    },
    // {
    //   target: "#chat-area",
    //   content: (
    //     <div style={{ width: '100%' }}>
    //         <Avatar 
    //             src={`https://api.dicebear.com/7.x/thumbs/svg?seed=50`} 
    //         />
    //         <p>Let me show you a demo conversation !</p>
    //     </div>
    //   ),
    //   placement: "center",
    //   action: "topic",
    //   message: "Victor Hugo"
    // },
    // {
    //   target:"#conv-info-area",
    //   content: "suppose that the current topic 'Victor Hugo',",
    //   placement: "bottom"
    // },
    // {
    //   target: "#chat-area",
    //   content: (
    //     <div style={{ width: '100%' }}>
    //         <Avatar 
    //             src={`https://api.dicebear.com/7.x/thumbs/svg?seed=27`} 
    //         />
    //         <p>Je concois une intention: biographie de victor hugo; qui est tout à fait possible d'être traité par Gallica.</p>
    //     </div>
    //   ),
    //   placement: "center",
    // },
    // {
    //   target: "#message-input",
    //   content: "J'entre une requete ici.",
    //   placement: "top",
    //   action: "input",
    //   message: "hugp",
    // },
    // {
    //   target: "#message-area",
    //   content: "oops! j'ai fait un typo.",
    //   placement: "top"
    // },
    // {
    //   target: "#restart-btn",
    //   content: "J'utilise ce button pour effacer la conversation.",
    //   placement: "right",
    //   action: "erase",
    // },
    // {
    //   target: "#chat-area",
    //   content: "ok, suppose now that we have a conversation that is not quite helpful.",
    //   placement: "center",
    // }
  ];
  
  export default joyrideTutorialSteps;
  