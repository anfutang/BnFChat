import React from "react";
import { AlertTriangle, Info } from "lucide-react"; 
import { FaStar, FaRegStar, FaTimes } from 'react-icons/fa';
import './MessageModal.css';

const MessageModal = ({ setShowMessageModal, type, title, content, closeButtonText, confirmButtonText, onConfirmFunc, isTimerRunning, startTimer }) => {
    const needsConfirmation = confirmButtonText !== '';
  
    return (
        <div className="message-modal-overlay">
            <div className="message-modal">
                <div className="message-modal-header">
                    <h2>{type == "warning" ? <AlertTriangle style={{ verticalAlign: 'middle' }}/> : <Info style={{ verticalAlign: 'middle' }}/>}  {title}</h2>
                </div>
                <div className="message-modal-content">{content}</div>
                <div className="message-modal-footer">
                    {needsConfirmation && <button className="modal-confirm-btn" onClick={() => {
                        setShowMessageModal(false);
                        onConfirmFunc?.();
                      }}>{confirmButtonText}</button>}
                    {closeButtonText != '' && <button className="modal-close-btn" onClick={() => {
                        if (!isTimerRunning) {startTimer();}
                        setShowMessageModal(false);
                    }}>{closeButtonText}</button>}
                </div>
            </div>
        </div>
    );
};
  
export default MessageModal;