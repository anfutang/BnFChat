import React, { useState } from 'react';
import { VscGithub } from 'react-icons/vsc';
import { FaEnvelope } from 'react-icons/fa';
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import { MdHome } from 'react-icons/md';

// 示例问答数据
const qaData = [
  {
    question: "[Q1] BnFChat qu'est-ce que c'est ?",
    answers: [
      "🔎 <u><strong>BnFChat est un système de recherche conversationnelle.</strong></u><br><br>Simplement dit, BnFChat intègre les données de la BnF dans son interface afin de vous aider à explorer et rechercher plus facilement et plus précisément les notices bibliographiques de la BnF. Cependant, veuillez noter que BnFChat <u><strong>N’EST PAS un chatbot de questions-réponses universel.</strong></u> Notre système est toujours conçu pour vous assister dans vos recherches, et ne répondra pas à d’autres types de questions.<br><br>Voici quelques exemples de ce que vous pouvez – et ne pouvez pas – demander à notre système :<ul><li><strong>Quel est le nombre total de livres à la BnF ?</strong><br>✘ <span style='color:red'><em>Ne peut pas répondre : hors du cadre de la recherche de documents</em></span><br>&nbsp;</li><li><strong>Analyse des personnages dans Les Misérables</strong><br>✘ <span style='color:red'><em>Ne peut pas répondre : question de type connaissance sur le contenu des œuvres</em></span><br>&nbsp;</li><li><strong>Je voudrais en savoir plus sur l’Art nouveau.</strong><br>✔ <span style='color:green'><em>Peut répondre :  mais il est préférable de commencer la conversation avec “l'art nouveau” (mode Exploration)</em></span><br>&nbsp;</li><li><strong>Recommandations de livres de Jules Verne</strong><br>✔ <span style='color:green'><em>Peut répondre : vous pouvez essayer le mode “Recherche” ou “Exploration”.</em></span><br>&nbsp;</li><li><strong>Je veux consulter des cartes de l’Aquitaine publiées au 19ᵉ siècle</strong><br>✔ <span style='color:green'><em>Peut répondre : intention de recherche précise, mode Recherche recommandé</em></span><br>&nbsp;</li><li><strong>Affiches d’Air France au 20ᵉ siècle</strong> <br>✔ <span style='color:green'><em>Peut répondre : intention de recherche précise, mode Recherche recommandé</em></span></li></ul><br>❓Pour le choix entre les deux modes, voir Q3."
    ]
  },
  {
    question: "[Q2] Quel est le lien entre BnFChat et Gallica ?",
    answers: [
      "🛠️ <u><strong>BnFChat peut être considéré comme un outil complémentaire de recherche pour Gallica.</strong></u><br><br>Notre système fait appel à l’API de Gallica lorsque c’est nécessaire, et s’appuie également sur une base de données construite à partir de métadonnées bibliographiques collectées via Gallica. Tous les résultats de recherche sont présentés sous forme de boutons : en les cliquant, vous serez redirigé vers Gallica pour consulter les documents. Voici un schéma simple de la relation entre BnFChat et Gallica :<br><br>Utilisateur ⇄ BnFChat ⇄ Gallica",
      "❓ <u><strong>En quoi BnFChat est-il meilleur que Gallica ? Quelle est la différence avec une recherche directe sur Gallica ?</strong></u><br><br><u>Simplement dit, nous utilisons le protocole SRU pour optimiser la recherche.</u><br><br>Un exemple de recherche :<br><br><em><strong>critiques sur Madame Bovary</strong></em><br><br>Si vous recherchez directement 'critique Madame Bovary' sur Gallica, les résultats retournés peuvent simplement contenir le mot critique ou Madame Bovary, sans forcément établir de lien précis entre les deux, ce qui limite la pertinence.<br><br>Une requête SRU plus appropriée pourrait être :<br><br><span style='font-family: monospace'><strong>dc.subject all 'madame bovary' and dc.title all 'critique'</strong></span><br><br>Il s’agit d’une requête visant à trouver les notices où “madame bovary” figure dans le champ sujet, et “critique” dans le champ titre. Une telle recherche offre une précision nettement supérieure.<br><br>Gallica propose déjà un outil pour la génération de requêtes SRU à travers le formulaire de <a href='https://gallica.bnf.fr/services/engine/search/advancedSearch/' target='_blank' rel='noopener noreferrer' style='color:royalblue'>🔗 Recherche avancée</a>, mais cette méthode peut être assez laborieuse.<br><br>⚡ BnFChat présente deux avantages majeurs : <ul><li>Plus facile à utiliser : comprendre votre intention via le dialogue, puis générer automatiquement une requête SRU (mode Recherche) — ou bien retrouver une requête pré-calculée (mode Exploration) — adaptée à vos besoins.</li><li>Possibilité de générer des requêtes SRU impossibles à formuler via la Recherche Avancée de Gallica</li></ul>"
    ]
  },
  {
    question: "[Q3] Quel mode devrais-je choisir ?",
    answers: [
      "<u><strong>Le choix dépend principalement de votre familiarité avec Gallica et le protocole SRU.</strong></u><br><br><ul><li>🔎 Choisissez le mode Recherche si vous :<ul><li>êtes un·e Gallicanaute</li><li>avez des connaissances en SRU</li><li>avez une expérience avec des langages similaires au SQL</li><li>connaissez bien les collections de la BnF</li><li>avez une intention de recherche très précise</li></ul></li><li>💬 Choisissez le mode Exploration si vous :<ul><li>êtes novice dans l’utilisation de Gallica</li><li>ne connaissez pas bien les collections de la BnF</li><li>n’avez pas une intention de recherche très claire</li><li>souhaitez simplement parcourir ou découvrir</li></ul></li></ul>",
      "🔎 <u><strong>Le mode Recherche met l’accent sur la génération et l’optimisation des requêtes SRU.</strong></u><br><br>Vous devez décrire votre intention aussi précisément que possible. L’objectif du dialogue est de générer une requête SRU exacte.<br><br>En effet, pour une même intention, il existe plusieurs manières de formuler une requête SRU (selon les données disponibles, le niveau de précision ou la forme des termes utilisés). Notre système peut donc ne pas réussir la conversion du premier coup. Vous pouvez alors guider le système dans le dialogue (par exemple en supprimant un critère ou en remplaçant un mot).<br><br>Ce mode se limite à la génération de requêtes SRU. Ainsi, dans l’idéal, vous devez avoir une idée (ou une hypothèse) de l’existence de l’œuvre que vous recherchez dans les collections de la BnF.<br><br>Une situation possible : le système indique qu’aucune notice n’a été trouvée, non pas à cause d’une erreur de conversion SRU, mais simplement parce que le document que vous cherchez n’existe pas dans la base.",
      "💬 <u><strong>Le mode Exploration a pour objectif de vous guider dans la découverte des ressources bibliographiques de la BnF.</strong></u><br><br>Il est donc recommandé de commencer par une requête vague (par exemple un auteur ou un thème).<br><br>À chaque tour de dialogue, le système détecte et affiche l’intention que vous exprimez, et vous propose des questions de clarification. Vous pouvez poursuivre la conversation jusqu’à ce que le système l’interrompe, ou bien l’interrompre vous-même lorsque l’intention détectée vous semble correcte, afin de lancer la recherche. Une fois la recherche lancée, le système explorera une base de données pré-calculée à la recherche de thèmes proches de votre intention. Vous pourrez alors cliquer sur les thèmes qui vous intéressent pour être redirigé·e vers Gallica.<br><br>❗ Comme ce mode repose sur une base pré-calculée, la version actuelle ne prend en charge que certains types de thèmes (auteurs, événements, sujets, etc.).<br><br>La liste des thèmes actuellement disponibles est consultable sur la page du mode Exploration.<br><br>⚠️ Attention : contrairement au mode Recherche, le mode Exploration permet au système de :<ul><li>détecter si votre intention est hors du périmètre de la base de données, et interrompre automatiquement la conversation le cas échéant ;</li><li>lancer automatiquement la recherche si votre intention devient trop complexe pour être clarifiée davantage ；</li><li>lancer une recherche dès que vous entrez une commande explicite.</li></ul>Vous disposez de deux façons d’indiquer que vous souhaitez lancer la recherche :<ul><li>Répondre à la dernière question du système tout en incluant le mot-clé `<u>cherche</u>` dans votre réponse（votre réponse + `<u>cherche</u>`） ；</li><li>Donner directement une instruction de recherche, avec le mot-clé `<u>cherche</u>` seul — auquel cas le système effectuera la recherche en se basant sur la dernière intention détectée.</li></ul>"
    ]
  },
  {
    question: "[Q4] Consultation de l’historique",
    answers: [
      "<u><strong>Vous pouvez consulter vos conversations passées à tout moment dans `Mon espace`.</strong></u><br><br>Toutes vos anciennes discussions y sont conservées. Pour les retrouver, cliquez sur l’avatar ➡️ sélectionnez <u>Mon espace</u> dans le menu ➡️ l’onglet <u>Conversations</u>.<br><br>Vous pourrez y consulter l’historique de vos échanges et accéder aux résultats Gallica via les boutons intégrés, comme sur la page de conversation. <br><br>Si vous avez des suggestions ou d’autres retours à nous faire, cliquez simplement sur l’icône de plume. Vous pouvez également retrouver tous vos retours dans <u>Mon espace</u> ➡️ l’onglet <u>Avis</u>."
    ]
  },
  {
    question: "[Q5] Problèmes d'utilisation de l'application",
    answers: [
      "<u><strong>Nous vous recommandons de suivre les conseils suivants pour une expérience optimale :</strong></u><br><br>1️⃣ Utilisez l’application sur un ordinateur avec Chrome (format 16:9 recommandé).<br><br>2️⃣ Actualisez la page uniquement en cas d’erreur de fonctionnement.<br><br>3️⃣ Évitez de vous connecter avec plusieurs comptes en même temps ou d’ouvrir plusieurs onglets avec le même compte.<br><br>🔑 Si vous avez oublié votre mot de passe, vous pouvez en demander la réinitialisation sur la page de connexion. Un administrateur traitera votre demande.<br><br>📧 Pour tout autre problème lié au programme (pages qui ralentissent, bugs récurrents), contactez-nous :<br><ul><li>Jean-Philippe Moreux (jean-philippe.moreux@bnf.fr)</li><li>Anfu Tang (tfrancis821@gmail.com)</li></ul>"
    ]
  },
  {
    question: "[Q6] Je voudrais savoir plus sur l'application",
    answers: [
      "Si notre projet vous intéresse ou si vous souhaitez en savoir plus sur la manière dont nous construisons notre système de recherche conversationnelle, vous pouvez consulter notre page GitHub pour plus d’informations :<br><br><a href='https://github.com/anfutang/BnFChat' target='_blank' rel='noopener noreferrer' style='color:royalblue'>🔗 GitHub</a><br><br>📧 Ou contactez-nous si vous souhaitez plus de détails. :<br><ul><li>Jean-Philippe Moreux (jean-philippe.moreux@bnf.fr)</li><li>Anfu Tang (tfrancis821@gmail.com)</li></ul>"
    ]
  }
];

const QAModal = ({ setShowQAModal }) => {
  const [selectedIndex, setSelectedIndex] = useState(null); // 当前选中的问题索引
  const [page, setPage] = useState(0); // 当前回答页码

  const handleQuestionClick = (index) => {
    setSelectedIndex(index);
    setPage(0);
  };

  const goBackToMenu = () => {
    setSelectedIndex(null);
    setPage(0);
  };

  const currentQA = qaData[selectedIndex];

  return (
    <div className="info-modal-overlay" onClick={() => setShowQAModal(false)}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()} style={{ height: "68%", width: "45%", padding: "1%" }}>
        <div className="about-info-modal-content" style={{ height: "100%", display: 'flex', flexDirection: 'column' }}>
          <div className="about-info-item" style={{ margin:0 }}>
            <img src="/logo_bnfchat_white.png" className='logo-bnfchat' style={{ height: "10vh" }} />
          </div>

          {selectedIndex === null ? (
            <>
              <div className="qa-info-item">FAQ</div>
              <p style={{ fontStyle:"italic", fontSize:"1.2rem" }}>Choisissez les questions qui vous intéressent</p>
              <div className="main-question-container">
                {qaData.map((item, index) => (
                  <button key={index} onClick={() => handleQuestionClick(index)}>
                    {item.question}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="subquestion">
                <strong>{currentQA.question}</strong> 
              </div>
              <div className="answer-area">
                <div dangerouslySetInnerHTML={{ __html: currentQA.answers[page] }} />
              </div>
              <div className="answer-page-controller">
                {currentQA.answers.length !== 1 && (<button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}><FaArrowLeft size={15}/></button>)}
                <button onClick={goBackToMenu}><MdHome size={20}/></button>
                {currentQA.answers.length !== 1 && (<button onClick={() => setPage((p) => Math.min(p + 1, currentQA.answers.length - 1))} disabled={page === currentQA.answers.length - 1}><FaArrowRight size={15}/></button>)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QAModal;