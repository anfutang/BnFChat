// src/components/chat/ChatArea.js
import React, { useEffect, useRef, useState } from 'react';
import { VscArrowCircleDown, VscComment, VscSearch, VscArrowSmallRight } from "react-icons/vsc";
import { FaPaperPlane, FaAngleLeft, FaAngleRight } from "react-icons/fa";
import TypingIndicator from './TypingIndicator';
import "./ChatArea.css";
import ResultModal from "../feedback/ResultModal";
import entityDict from './entityDict';

const ChatArea = ({
  userData,
  messages,
  assistantStatus,
  detectedUserIntent,
  generatedSRU,
  sruValidnessMessage,
  userInput,
  setUserInput,
  onSendMessage,
  isConnected,
  isStreaming,
  explicitUserInputDisabled,
  currentChatId,
  handleNewChat,
  resultData,
  isResultLoading,
  isResultLoaded,
  socketRef
}) => {
  const messageEndRef = useRef(null);

  const [showEntityListModal, setShowEntityListModal] = useState(false); 
  const [entityListModalPageNumber, setEntityListModalPageNumber] = useState(1);

  const orderedCategory = {
    1: ["Personne"],
    2: ["Œuvre", "Thème"],
    3: ["Périodique", "Lieu", "Événement",]
  };

  const baseGallicaURL = "https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&version=1.2&startRecord=1&maximumRecords=15&page=1&collapsing=true&exactSearch=false&query={sru_query}"

  // automatically scroll down
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (userInput?.trim() && isConnected && !isStreaming) {
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

  return (
    <div className="user-area" id="user-area">
      <div className="chat-sidebar">
        <div className="chat-sidebar-btn-container">
          <button className="new-chat-btn" onClick={() => {handleNewChat("end:user_new_chat");}} disabled={isStreaming || messages.length === 0}>Nouvelle Conversation</button>
        </div>
        <div className="chat-history-container">

        </div>
      </div>

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
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.role}`}
            >
              {msg.content}
              {/* <div className="message-time">
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
              </div> */}
            </div>
          ))}
          {isStreaming && (
            <div className="typing-indicator">
              <TypingIndicator /><span className="typing-status">{assistantStatus}</span>
            </div>
          )}
          {/* {generatedSRU && userData.mode === "search" && (
            <div className="sru"> 
              {generatedSRU}
            </div>
          )} */}
          {sruValidnessMessage && userData.mode === "search" && (
            <div className="sru-btn-container">
              <p className="sru-validness-msg">{sruValidnessMessage}</p>
              {!sruValidnessMessage?.startsWith("🔴") && (<button className="sru-btn" onClick={() => window.open(baseGallicaURL.replace("{sru_query}", encodeURIComponent(generatedSRU)), "_blank")}>
                <VscArrowSmallRight size={20} />Gallica
              </button>)}
            </div>
          )}
          {isResultLoaded && (
            <ResultModal 
              resultData={resultData}
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
                  &nbsp;<strong>Mode Conversation <span style={{ fontSize:"1rem" }}><sup>Beta</sup></span>
                </strong></p> 
                <p className="mode-text">• Saissez un sujet dans <a href="#" onClick={(e) => { e.preventDefault(); setShowEntityListModal(true); }}>
                  <strong>cette liste</strong></a> pour commencer.</p>
                • Dialoguez avec le système pour explorer les documents dans la BnF. <br></br>
                • Pour une recherche précise, veuillez utilisez le mode Recherche.
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
            disabled={(!isConnected || isStreaming || isResultLoading || isResultLoaded || explicitUserInputDisabled)}
          />
          <button onClick={handleSend} className="send-button" disabled={(!userInput?.trim() || !isConnected || isStreaming || isResultLoading || isResultLoaded || explicitUserInputDisabled)}>
            <FaPaperPlane size={20} color="black" />
          </button>
        </div>
      </div>

      {showEntityListModal && (
        <div className="entity-modal-overlay" onClick={() => setShowEntityListModal(false)}>
          <div className="entity-modal" onClick={(e) => e.stopPropagation()}>
            <div className="entity-modal-header"><strong>Liste de sujets</strong></div>
            <div className="entity-modal-content">
              <div className="scroll-area">
              {(orderedCategory[entityListModalPageNumber] || []).map((category) => (
                entityDict[category] && (
                  <div key={category}>
                    <p className="entity-category">{category}</p>
                    <div className="entity-list">
                      {entityDict[category].map((entity, index) => (
                        <p key={index}>{entity}</p>
                      ))}
                    </div>
                  </div>
                )
              ))}
              </div>
            </div>
            <div className="entity-modal-btn-container">
              <button className="entity-modal-page-btn" onClick={() => {setEntityListModalPageNumber(prev => prev - 1);;}} disabled={entityListModalPageNumber === 1}>
                <FaAngleLeft size={20} />
              </button>
              <p>{entityListModalPageNumber} / 3</p>
              <button className="entity-modal-page-btn" onClick={() => {setEntityListModalPageNumber(prev => prev + 1);;}} disabled={entityListModalPageNumber === 3}>
                <FaAngleRight size={20} />
              </button>
            </div>
            <div className="entity-modal-btn-container" style={{ top:"95%" }}>
              <button className="entity-modal-close-btn" onClick={() => setShowEntityListModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;
