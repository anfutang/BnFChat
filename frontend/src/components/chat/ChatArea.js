// src/components/chat/ChatArea.js
import React, { useEffect, useRef, useState } from 'react';
import { VscArrowCircleDown, VscComment, VscSearch, VscArrowSmallRight } from "react-icons/vsc";
import { FaPaperPlane, FaEraser } from "react-icons/fa";
import TypingIndicator from './TypingIndicator';
import "./ChatArea.css";
import ResultModal from "../feedback/ResultModal";
import EntityListModal from "../tutorial/entityListModal";
import AboutInfoModal from '../tutorial/aboutInfoModal';
import QAModal from '../tutorial/qaModal';
import FeedbackModal from '../tutorial/feedbackModal';

const ChatArea = ({
  userData,
  messages,
  assistantStatus,
  detectedUserIntent,
  userInput,
  setUserInput,
  onSendMessage,
  isConnected,
  isStreaming,
  explicitUserInputDisabled,
  setExplicitUserInputDisabled,
  currentChatId,
  handleNewChat,
  resultData,
  setResultData,
  isResultLoading,
  setIsResultLoading,
  isResultLoaded,
  setIsResultLoaded,
  feedbackSubmitted,
  setFeedbackSubmitted,
  socketRef,
  showAboutInfoModal,
  setShowAboutInfoModal,
  showQAModal,
  setShowQAModal,
  showFeedbackModal,
  setShowFeedbackModal
}) => {
  const messageEndRef = useRef(null);

  const [showEntityListModal, setShowEntityListModal] = useState(false); 

  const baseGallicaURL = "https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&version=1.2&startRecord=1&maximumRecords=15&page=1&collapsing=true&exactSearch=false&query={sru_query}"

  const singleResultGallicaURL = "https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&version=1.2&query={sru_query}"

  // sru message: number of bibliographic records that correspond to the current SRU
  const [sruValidnessMessage, setSruValidnessMessage] = useState(null);
  
  // useEffect(() => {
  //   if (sruNumRecords === -1 ) {
  //     setSruValidnessMessage("🟡 Validation bloquée pour l'instant, mais vous pouvez cliquer pour voir sur Gallica.");
  //   } else if (sruNumRecords === 0) {
  //     setSruValidnessMessage("🔴 Nul documents trouvé pour le SRU généré. Veuillez indiquer comment améliorer.");
  //   } else if (sruNumRecords > 0) {
  //     setSruValidnessMessage(`🟢 ${sruNumRecords} résultats correspondants pour ce SRU.`);
  //   } else {
  //     setSruValidnessMessage(null);
  //   }
  // }, [sruNumRecords]);

  const parseNumRecords = (message) => {
    if (message.startsWith("🟢")) {
      const match = message.match(/🟢 (\d+) résultats/);
      return match ? parseInt(match[1], 10) : 0;
    } else {
      return -1;
    }
  };

  // automatically scroll down
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (userInput?.trim() && isConnected && !isStreaming) {
      setResultData({});
      setIsResultLoaded(false);
      setIsResultLoading(false);
      onSendMessage(userInput);
    }
  };

  const getPlaceholder = () => {
    if (!isConnected) return "Connexion...";
    if (isStreaming) return "Traitement en cours...";
    if (userData?.mode === "search") {
      if (messages.length === 0) {
        return "Décrivez votre intention de recherche aussi précisément que possible.";
      } else {
        return "Répondez pour indiquer au modèle comment améliorer le SRU.";
      }
      
    } else if (userData?.mode === "chat") {
      if (messages.length === 0) {
        return "Décrivez ce que vous souhaitez explorer, par exemple 'Victor Hugo' ou 'Art nouveau'.";
      } else {
        return "Répondre comme vous voulez. Tapez 'cherche' pour lancer la recherche.";
      }
    }

    return "Zone de saisie : veuillez entrer votre texte ici.";
  };

  const processedMessages = [];
  let lastSRUContent = "";

  messages.forEach((msg) => {
    if (msg.role === "sru") {
      lastSRUContent = msg.content;
    }

    processedMessages.push({
      ...msg,
      sruContent: lastSRUContent, 
    });
  });

  return (
    <div className="user-area" id="user-area">
      {/* <div className="chat-sidebar">
        <div className="chat-sidebar-btn-container">
          <button className="new-chat-btn" onClick={() => {handleNewChat("end:user_new_chat");}} disabled={isStreaming || messages.length === 0}>Nouvelle Conversation</button>
        </div>
      </div> */}

      <div className="chat-area" id="chat-area">
        {detectedUserIntent ? (
          <div className="chat-header">
            <div className='intent-line'><VscArrowCircleDown size={20}/>&nbsp;<strong>Intention détectée</strong>&nbsp;<VscArrowCircleDown size={20}/></div>
            <div className="intent-line">{detectedUserIntent}</div>
          </div>
        ) : (
          <div className="chat-header">&nbsp;</div>
        )}

        {messages.length !== 0 ? (<div className="message-area" id="message-area">
          {processedMessages.map((msg, index) => {
            if (msg.role === "gallica") {
              return userData.mode === "search" ? (
                <div key={index} className="sru-btn-container">
                  <p className="sru-validness-msg">{msg.content}</p>
                  <button
                    className="sru-btn"
                    onClick={() =>
                      window.open(
                        parseNumRecords(msg.content) > 15
                          ? baseGallicaURL.replace("{sru_query}", encodeURIComponent(msg.sruContent))
                          : singleResultGallicaURL.replace("{sru_query}", encodeURIComponent(msg.sruContent)),
                        "_blank"
                      )
                    }
                  >
                    <VscArrowSmallRight size={20} />
                    Gallica
                  </button>
                </div>
              ) : null;
            }

            return (
              <div key={index} className={`message ${msg.role}`}>
                {msg.content}
              </div>
            );
          })}
          {isStreaming && (
            <div className="typing-indicator">
              <TypingIndicator /><span className="typing-status">{assistantStatus}</span>
            </div>
          )}
          {isResultLoaded && (
            <ResultModal 
              resultData={resultData}
              feedbackSubmitted={feedbackSubmitted}
              setFeedbackSubmitted={setFeedbackSubmitted}
              setExplicitUserInputDisabled={setExplicitUserInputDisabled}
              socketRef={socketRef}
            />
          )}
          <div ref={messageEndRef} />
        </div>) : (
          <div className="mode-description-container">
            <div className="mode-logo">{userData.mode === "search" ? <VscSearch size={50}/> : <VscComment size={50}/>}</div>
            {userData.mode === "search" ? <p className="mode-description">
                      <p className="mode-name">&nbsp;<strong>Mode Recherche</strong></p> 
                      • Décrivez ce que vous souhaitez découvrir. <br />
                      • Génération automatique du SRU, ajustable par dialogue.
              </p> : <p className="mode-description">
                <p className="mode-name">
                  &nbsp;<strong>Mode Exploration <span style={{ fontSize:"1rem" }}><sup>Beta</sup></span>
                </strong></p> 
                <p className="mode-text">• Saissez un sujet dans <a href="#" onClick={(e) => { e.preventDefault(); setShowEntityListModal(true);}}>
                  <strong>cette liste</strong></a> pour commencer.</p>
                • Dialoguez avec le système pour explorer les documents dans la BnF. <br></br>
                • Pour une recherche précise, veuillez utiliser le mode Recherche.
              </p>}
          </div>
        )}

        <div className="message-input-container">
          <input
            className="message-input"
            id="message-input"
            placeholder={getPlaceholder()}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSend(); 
              }
            }}
            disabled={(!isConnected || isStreaming || isResultLoading || (userData.mode === "chat" && isResultLoaded) || explicitUserInputDisabled)}
          />
          <button onClick={handleSend} className="send-btn" disabled={(!userInput?.trim() || !isConnected || isStreaming || isResultLoading || (userData.mode === "chat" && isResultLoaded) || explicitUserInputDisabled)}>
            <FaPaperPlane size={20} color="black" />
          </button>
          <button className="new-chat-btn" onClick={() => {handleNewChat("end:user_new_chat");}} disabled={isStreaming || messages.length === 0}>
            <FaEraser size={20} color="black" />
          </button>
        </div>
      </div>

      {showEntityListModal && (
        <EntityListModal setShowEntityListModal={setShowEntityListModal}/>
      )}

      {showAboutInfoModal && (
        <AboutInfoModal setShowAboutInfoModal={setShowAboutInfoModal} />
      )}

      {showQAModal && (
        <QAModal setShowQAModal={setShowQAModal} />
      )}

      {showFeedbackModal && (
        <FeedbackModal 
          userData={userData}
          setShowFeedbackModal={setShowFeedbackModal}
          socketRef={socketRef}
        />
      )}
    </div>
  );
};

export default ChatArea;
