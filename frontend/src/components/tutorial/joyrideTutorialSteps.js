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
            <p>Bienvenue ! Ceci est un tutoriel interactif, laissez-moi vous montrer comment l’utiliser !</p>
        </div>
      ),
      placement: "center",
      locale: { next: 'Suivant' }
    },
    {
      target: '#sidebar',
      content: "Ici, vous pouvez voir les informations de votre session.",
      placement:"right",
    },
    {
      target: '#session-progression',
      content: "Vous pouvez suivre votre progression. Vous êtes actuellement dans le [Tutoriel].",
      placement:"right",
    },
    {
      target: '#timer',
      content: "Pendant l’exercice et le test officiel, un minuteur sera activé. Vous serez averti lorsque le temps est presque écoulé. La session sera automatiquement fermée lorsque le temps sera écoulé. Vous avez le droit d’arrêter le minuteur si vous devez partir ou poser une question.",
      placement:"right",
    },
    {
      target: '#topic-list',
      content: "Voici la liste des sujets. Choisissez dans la liste et cliquez sur ce que vous voulez. Vous n’êtes pas obligé de traiter tous les sujets.",
      placement:"right",
    },
    {
      target: '#sidebar-button-area',
      content: "Voici plusieurs boutons que vous pouvez utiliser.",
      placement:"right",
    },
    {
      target: "#restart-btn",
      content: "Si vous souhaitez simplement redémarrer une conversation (par exemple si vous avez mal répondu), vous pouvez utiliser ce bouton pour effacer rapidement la conversation en cours.",
      placement:"right",
    },
    {
      target: "#next-session-btn",
      content: "Pas besoin d’attendre la fin du compte à rebours, vous pouvez passer au test officiel ou terminer le test quand vous le souhaitez.",
      placement:"right",
    },
    {
      target: "#logout-btn",
      content: "Ne cliquez pas ici. Ce bouton est réservé aux organisateurs. En cas de plantage de l’application, nous pourrions devoir vous déconnecter pour effectuer un débogage.",
      placement:"right",
    },
    {
      target: "#chat-area",
      content: "Voici la zone de discussion, où vous interagissez avec notre système.",
      placement:"left-start",
    },
    {
      target: "#conv-info-area",
      content: "Le sujet actuel et l’intention détectée de l’utilisateur seront affichés ici.",
      placement:"bottom",
    },
    {
      target: "#message-area",
      content: "La conversation sera affichée ici.",
      placement: "bottom",   
    },
    {
      target: "#message-input",
      content: "Utilisez ce champ de saisie pour communiquer avec notre système.",
      placement: "top"
    },
    {
      target: "#chat-area",
      content: (
        <div style={{ width: '100%' }}>
            <Avatar 
                src={`https://api.dicebear.com/7.x/thumbs/svg?seed=30`} 
            />
            <p>OK ! Il est maintenant temps de vous tester ! Commençons par un exercice. Cliquez sur « Continuer » pour passer à l’exercice.</p>
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
  