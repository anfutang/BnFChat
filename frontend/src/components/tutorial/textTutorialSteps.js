// TutorialSteps.jsx
import React from 'react';
import { Message, MessageSeparator } from '@chatscope/chat-ui-kit-react';
import "./tutorial.css"

const TextTutorial = ({ currentStep, onNextStep, onComplete }) => {
  const tutorialSteps = [
    {
      id: 1,
      title: "Bienvenue",
      content: "<em>Bienvenue dans ce test !</em><br><br>1️⃣ <strong>L’objectif de ce test est d’évaluer si l’outil que nous avons développé — BnFChat, que vous voyez devant vous — peut vous aider à effectuer des recherches plus précises sur Gallica.</strong><br><br> Vous avez probablement déjà rencontré des difficultés en utilisant un moteur de recherche. Par exemple, si vous tapez :<br><br>« critique Hugo »<br><br>Les résultats peuvent s’avérer insatisfaisants, car ils incluent parfois des textes correspondant simplement à « critique ».<br><br>La recherche avancée de Gallica offre un moyen plus précis de rechercher : elle permet de faire correspondre des mots-clés à des champs spécifiques de métadonnées dans les documents de la bibliothèque, en utilisant en réalité une requête SRU comme celle-ci :<br><br>« dc.subject adj victor hugo and dc.title all critique »<br><br>➡️ Cependant, très peu de personnes utilisent cette fonctionnalité, car elle est effectivement trop complexe à manier.<br><br>De plus, modifier constamment sa requête pour l’ajuster, puis chercher le bon document parmi les résultats peut être une tâche fastidieuse. Souvent, si possible, nous préférerions simplement lancer une requête vague pour effectuer la recherche.",
    },
    {
      id: 2,
      title: "But de BnFChat",
      content: "2️⃣ <strong>Le but du développement de BnFChat est justement de vous permettre de rechercher en langage naturel.</strong><br><br>Grâce au dialogue, notre système peut mieux comprendre votre intention, la transformer en requête SRU à envoyer à Gallica, puis vous renvoyer les résultats obtenus.<br><br>En résumé, cette nouvelle version de BnFChat permet les fonctionnalités suivantes : <br><br>🚩 Détecter votre intention en temps réel et vous la présenter.<br><br>🚩 Vous poser des questions de clarification en s’appuyant sur les informations bibliographiques disponibles dans la BnF.<br><br>🚩 Vous permettre à tout moment de lancer une recherche ou de mettre fin à la conversation en langage naturel.<br><br>🚩 Évaluer en temps réel s’il est possible de continuer à clarifier votre intention (et interrompre automatiquement la conversation dans le cas contraire).<br><br>🚩 Une fois la recherche lancée, transformer votre intention en une requête SRU et vous présenter les résultats.<br><br>Par exemple, si vous estimez que la conversation en cours ne vous aide pas, vous pouvez dire <strong>« abandonne »</strong>.<br><br>si vous souhaitez lancer immédiatement une recherche basée sur l’intention détectée par le système, vous pouvez dire <strong>« cherche »</strong> ; vous pouvez aussi ajouter cette instruction après n’importe quelle réponse en langage naturel, comme : <strong>« ... et cherche »</strong> ; <strong>« ... et arrête là »</strong> ; <strong>« ... et c’est tout »</strong>.",
    },
    {
      id: 3,
      title: "Le déroulement du test",
      content: "3️⃣ Le test se déroulera en trois parties :<br><br>🚩 La première partie est le tutoriel, que vous êtes en train de suivre.<br><br>🚩 À la fin du tutoriel, vous aurez 5 minutes d'exercice pour vous familiariser avec l’interface.<br><br>🚩 Après l’exercice commencera le test officiel, qui durera 35 minutes.<br><br>L’exercice comme le test officiel peuvent être terminé à tout moment.<br><br>À la fin de chaque session de dialogue, nous vous inviterons à évaluer la conversation et les résultats de recherche (principalement sous forme de questions quantitatives). Merci de répondre avec sérieux et sincérité. Une évaluation globale du test (principalement qualitative) vous sera proposée à la fin : nous vous serions reconnaissants de bien vouloir la compléter avec attention.<br><br>Enfin, si vous avez choisi de participer à l’entretien, vous serez le·la bienvenu·e pour partager librement vos impressions et ressentis sur cette expérience de test !",
    },
    {
      id: 4,
      title: "Contenu et consignes du test",
      content: "4️⃣ Nous allons vous proposer une série de sujets. Vous pouvez choisir librement celui qui vous intéresse et effectuer une recherche autour de ce sujet — mais vous <strong>NE POUVEZ PAS tester de sujets qui ne figurent pas dans la liste</strong>. <br><br>Prenons <strong>Victor Hugo</strong> comme exemple — vous choisissez de cliquer sur « Victor Hugo » dans la liste à gauche. <br><br>💡 Imaginez que vous devez utiliser Gallica pour trouver un document en lien avec Victor Hugo.<br><br>💡 À ce stade, vous avez probablement une intention de recherche en tête. Par exemple : <strong>« biographie de Victor Hugo »</strong>.<br><br>💡 Veuillez maintenant saisir une requête comme si vous utilisiez Gallica, pour commencer la conversation (par exemple : « biographie victor hugo », ou « biographie hugo », ou simplement « victor hugo », selon vos habitudes). Vous pouvez toujours commencer par une requête ambiguë (par exemple, « hugo »): le système tentera alors de désambigüiser et de détecter votre intention au fil de la conversation.<br><br>Le système dialoguera ensuite avec vous pour approfondir votre intention, et vous pourrez lancer la recherche quand vous le jugerez opportun. Pour l’intention « biographie de Victor Hugo », une fois que le système a bien identifié votre objectif, vous pouvez saisir « cherche » pour lancer la recherche. <strong>Il y a deux cas possibles :</strong> <br><br>⚫ <u>Répondre à la question du système et lancer la recherche tout de suite : </u><br> Vous : victor hugo <br>Système : Cherchez-vous les œuvres de Victor Hugo ou sa biographie ?<br>Vous : sa biographie ; cherche<br><br>⚫ <u>Ignorer la question et lancer la recherche (dans ce cas, le système utilisera la dernière intention détectée) :</u><br><br>Vous : biographie victor hugo<br>Système : Quelle période de la vie de Victor Hugo vous intéresse ?<br>Vous : cherche<br><br>À la fin, deux résultats vous seront présentés :<br><br>🚩 celui obtenu avec BnFChat (<strong><em>avec conversation</em></strong>).<br><br>🚩celui obtenu via une recherche simple sur Gallica, à partir de votre requête initiale (<strong><em>sans conversation</em></strong>).<br><br>Vous devrez ensuite comparer ces deux résultats, et évaluer à la fois le résultat fourni par BnFChat et la qualité de la conversation.<br><br>⚠️ <strong>ATTENTION</strong> : L’objectif du test est d’évaluer avec précision l’efficacité de cette version de BnFChat. Merci de suivre les consignes avec sérieux et honnêteté.",
    },
    {
      id: 5,
      title: "Ce n'est pas un jeu !",
      content: "Nous comprenons que vous pourriez, par manque de familiarité, adopter certains comportements non conformes aux consignes. Cependant, nous tenons à rappeler que vos évaluations auront un impact direct sur notre jugement de l’efficacité de l'application, et donc sur les améliorations futures que nous pourrons y apporter.<br><br>Voici <strong>quelques comportements interdits</strong> que nous vous demandons d’éviter intentionnellement :<br><br>✖️ Chercher volontairement à tester les limites du système, par exemple en poursuivant systématiquement la conversation sans fin, ou en donnant des réponses délibérément hors sujet ou trompeuses vis-à-vis de la recherche. <br><br>✖️ Continuer la conversation alors que le système a déjà correctement identifié votre intention, au lieu de lancer immédiatement la recherche. Ce comportement pourrait nous amener à sous-estimer l’efficacité du système (une conversation réussie qui n’est pas suivie de recherche ne nous permet pas d’en juger pleinement la performance).<br><br>✖️ Proposer des requêtes trop complexes, sur des sujets pour lesquels aucune ressource n’existe dans la BnF ou que Gallica ne permet pas de traiter. Si vous pensez qu’une requête correspondant à votre intention ne pourrait pas être trouvé sur Gallica, merci de ne pas essayer ce type de requête. Bien que notre système dialogue en langage naturel, il s’appuie en fin de compte sur des requêtes SRU, et reste donc limité par les capacités de recherche avancée de Gallica.<br><br>Nous comprenons votre curiosité et votre envie d’explorer les limites du système — mais nous vous demandons de ne pas adopter ce type de comportement pendant le test. L'application restera accessible en ligne, et vous pourrez y revenir librement par la suite pour vos propres expérimentations !<br><br>"
    }
  ];

  const step = tutorialSteps.find(step => step.id === currentStep) || tutorialSteps[0];

  return (
    <div className="text-tutorial-container">
      <div className="text-tutorial-header">{step.title}</div>
      <div className="text-tutorial-content">
        <div dangerouslySetInnerHTML={{ __html: step.content }} />
      </div>
      <div className="text-tutorial-progress">{currentStep} / {tutorialSteps.length}</div>

      <div className="text-tutorial-controls">
        {currentStep < tutorialSteps.length ? (
          <button className="text-tutorial-next-btn" onClick={onNextStep}>Suivant</button>
        ) : (
          <button className="text-tutorial-next-btn" onClick={onComplete}>Terminer</button>
        )}
        {/* <div className="tutorial-progress">Tutoriel - Étape {currentStep} sur {tutorialSteps.length}</div> */}
      </div>

      
    </div>

  );
};

export default TextTutorial;
