import React, { useState } from 'react';
import { FaAngleLeft, FaAngleRight} from "react-icons/fa";
import entityDict from './entityDict';
import "./modal.css";

const EntityListModal = ({setShowEntityListModal}) => {
    const [entityListModalPageNumber, setEntityListModalPageNumber] = useState(1);
    const orderedCategory = {
        1: ["Personne"],
        2: ["Œuvre", "Thème"],
        3: ["Périodique", "Lieu", "Événement",]
      };

    return (
        <div className="info-modal-overlay" onClick={() => setShowEntityListModal(false)}>
            <div className="info-modal" onClick={(e) => e.stopPropagation()}>
                <div className="info-modal-header"><strong>Liste de sujets</strong></div>
                <div className="info-modal-content">
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
                <div className="info-modal-btn-container">
                    <button className="info-modal-page-btn" onClick={() => {setEntityListModalPageNumber(prev => prev - 1);}} disabled={entityListModalPageNumber === 1}>
                    <FaAngleLeft size={20} />
                    </button>
                    <p>{entityListModalPageNumber} / 3</p>
                    <button className="info-modal-page-btn" onClick={() => {setEntityListModalPageNumber(prev => prev + 1);}} disabled={entityListModalPageNumber === 3}>
                    <FaAngleRight size={20} />
                    </button>
                </div>
                <div className="info-modal-btn-container" style={{ "margin-bottom":"1rem" }}>
                    <button className="info-modal-close-btn" onClick={() => setShowEntityListModal(false)}>OK</button>
                </div>
            </div>
        </div>
    )};

export default EntityListModal;