import React, { useState } from 'react';
import { FaEnvelope } from "react-icons/fa";
import { VscGithubInverted } from "react-icons/vsc"
import "./modal.css";

const AboutInfoModal = ({setShowAboutInfoModal}) => {
    return (
        <div className="info-modal-overlay" onClick={() => setShowAboutInfoModal(false)}>
            <div className="info-modal" onClick={(e) => e.stopPropagation()} style={{ height:"35%", width:"35%", "padding":"1%", justifyContent:"space-between", alignItems:"space-between" }}>
                <div className="about-info-modal-content" style={{ height:"90%", top:"1rem"}}>
                    <div className="about-info-item">
                        <img src="/logo_bnfchat_rectangle.png" className='logo-bnfchat' style={{ height:"6vh" }}/>
                    </div>
                    <p className="about-info-item" style={{ fontFamily:"monospace", "fontSize":"0.9rem" }}>Version 3.0 (30.06.25)</p> 
                    <p className="about-info-item">Cette application est le fruit d’un projet collaboratif BnF-SCAI (2024–2025).</p>
                    <div className="about-info-item">
                        <img src="/logo_scai.png" className='logo-scai' style={{ height:"7vh" }}/>
                        <img src="/logo_bnf.png" className='logo-bnf' style={{ height:"7vh" }}/>
                    </div>
                    <div className="about-info-item">
                        <a href="https://github.com/anfutang/BnFChat" target="_blank" rel="noopener noreferrer">
                            <VscGithubInverted size={30} color="black"/>
                        </a>
                        <a href="mailto:jean-philippe.moreux@bnf.fr">
                            <FaEnvelope size={30} color="black" />
                        </a>
                    </div>
                </div>
                {/* <div className="info-modal-btn-container" style={{ "margin-top":"1%"}}>
                    <button className="info-modal-close-btn" onClick={() => setShowAboutInfoModal(false)}>Fermer</button>
                </div> */}
            </div>
        </div>
)};

export default AboutInfoModal;
