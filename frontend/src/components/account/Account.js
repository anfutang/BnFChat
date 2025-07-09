import React, { useEffect, useState } from 'react';
import axios from 'axios';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import { Avatar } from '@chatscope/chat-ui-kit-react';

import { FaAddressCard, FaPencilAlt, FaUserLock } from "react-icons/fa";
import { FaUserAstronaut, FaRegCommentDots, FaFeather } from "react-icons/fa6";
import { FiArrowUpLeft } from "react-icons/fi";
import { VscSnake } from "react-icons/vsc";

import "./Account.css"
import UserProfile from "./Profile";
import UserAvatar from "./Avatar";
import UserChat from "./Chat";
import UserFeedback from "./Feedback";
import AdminPanel from "./Admin";
import RecentUsers from './RecentUsers';

const AccountPanel = () => {
  const { currentUser, setCurrentUser } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState(1);

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return <UserProfile key={activeSection} currentUser={currentUser} />;
      case "avatar":
        return <UserAvatar key={activeSection} currentUser={currentUser} setCurrentUser={setCurrentUser} />;
      case "chat-history":
        return <UserChat key={activeSection} currentUser={currentUser} />;
      case "feedback":
        return <UserFeedback key={activeSection} currentUser={currentUser} />;
      case "admin-panel":
        return currentUser.permissionLevel > 1 ? (
          <AdminPanel 
            key={activeSection} 
            currentUser={currentUser} 
          />
        ) : null;
      case "activity":
        return currentUser.permissionLevel > 1 ? (
          <RecentUsers key={activeSection} currentUser={currentUser}/>
        ) : null;
      default:
        return null;
    }
  };

return (
    <div className="account-dashboard">
      <div className="account-info-container">
        <img src="/logo_bnfchat_black.png" className='logo-bnfchat' style={{ height:"6vh" }}/>
        <p style={{ color:"white", fontWeight:"500", fontSize:"1.2rem"}}>Mon Espace</p>
        <Avatar 
            src={`https://api.dicebear.com/7.x/micah/svg?seed=${currentUser?.avatarSeed || 'default'}`} 
            name={currentUser?.username} 
            status='available'
        />
        <span style={{ fontStyle: 'bold', textAlign: 'left', color: "white" }}>Bienvenu.e, {currentUser?.username} <br></br>{currentUser.permissionLevel > 1 && (<span style={{ fontStyle: 'italic' }}>Vous êtes administrateur·trice</span>)}</span>
        <button className='switch-btn' onClick={() => {navigate('/chat');}}><FiArrowUpLeft size={20} />Retour</button>
      </div>
      <div className="account-sidebar">
        <button className={`control-btn ${activeSection === "profile" ? 'selected' : ''}`} onClick={() => setActiveSection("profile")}><FaAddressCard size={25}/>&nbsp;Profil</button>
        <button className={`control-btn ${activeSection === "avatar" ? 'selected' : ''}`} onClick={() => setActiveSection("avatar")}><FaUserAstronaut size={23}/>&nbsp;Avatar</button>
        <button className={`control-btn ${activeSection === "chat-history" ? 'selected' : ''}`} onClick={() => setActiveSection("chat-history")}><FaRegCommentDots size={23}/>&nbsp;Conversations</button>
        <button className={`control-btn ${activeSection === "feedback" ? 'selected' : ''}`} onClick={() => setActiveSection("feedback")}><FaFeather size={20}/>&nbsp;Avis</button>
        {currentUser.permissionLevel > 1 && (
          <button className={`control-btn ${activeSection === "admin-panel" ? 'selected' : ''}`} onClick={() => setActiveSection("admin-panel")}><FaUserLock size={25}/>&nbsp;Gestion</button>
        )}
        {currentUser.permissionLevel > 1 && (
          <button className={`control-btn ${activeSection === "activity" ? 'selected' : ''}`} onClick={() => setActiveSection("activity")}><FaUserLock size={25}/>&nbsp;Activité</button>
        )}
      </div>
      <div className="account-display-area" style={{ flex: 1 }}>{renderContent()}</div>
    </div>
  );
};

export default AccountPanel;