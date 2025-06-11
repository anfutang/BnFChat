import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { MessageList, Message, Avatar } from '@chatscope/chat-ui-kit-react';

import "./AdminDashboard.css"

const AdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [userChats, setUserChats] = useState([]);
  const [userFeedbacks, setUserFeedbacks] = useState([]);
  const [resetStatus, setResetStatus] = useState('click on a user id to reset.');
  const [adminFunc, setAdminFunc] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null); 
  const [selectedFeedbackUser, setSelectedFeedbackUser] = useState(null);

  const processedMessages = (messages) => {
    return messages.map((msg, index) => ({
      message: msg,
      sentTime: new Date().toLocaleTimeString(),  
      sender: index % 2 === 0 ? 'user' : 'assistant',
      direction: index % 2 === 0 ? 'outgoing' : 'incoming',
      position: 'normal'
    }));
  };

  function formatChatLevelAnswers(data) {
    if (!data) {return '';}

    const result = [];
  
    // 1. 处理 selectedOptions
    const options = data.selectedOptions || {};
    for (const key in options) {
      const value = options[key];
      if (key.startsWith("chat-level-q") && Array.isArray(value) && value.length > 0) {
        const shortKey = key.replace("chat-level-", ""); // q1, q2...
        result.push(`• ${shortKey}: ${value.join(", ")}`);
      }
    }
  
    // 2. 处理 explanations
    const explanations = data.explanations || {};
    for (const key in explanations) {
        const shortKey = key.replace("chat-level-", ""); // q4
        const explanationEntry = explanations[key];
        if (explanationEntry && typeof explanationEntry === "object") {
        for (const subKey in explanationEntry) {
            const value = explanationEntry[subKey];
            if (value) {
            result.push(`• explanation-${shortKey}-${subKey}: ${value}`);
            }
        }
        }
    }
  
    // 3. 处理 textAnswers
    const texts = data.textAnswers || {};
    for (const key in texts) {
      const value = texts[key];
      if (value) {
        result.push(`text-${key}: ${value}`);
      }
    }
  
    return result.join("\n\n");
  }

  useEffect(() => {
    fetchUserChats();
    fetchUserFeedback();
  }, []);

  const handleAdminFuncSelect = (value) => {
    setAdminFunc(value);
  }

  const fetchUserChats = async () => {
    const res = await axios.get('/api/admin/user-chats');
    setUserChats(res.data); // [{ user_id, chats: [{ chat_id, content }] }]
  };

  const fetchUserFeedback = async () => {
    const res = await axios.get('/api/admin/user-feedback');
    setUserFeedbacks(res.data); // [{ user_id, rating, comment }]
  };

  const handleResetUser = async (userId) => {
    const res = await axios.post('/api/admin/reset-user', { user_id: userId });
    setResetStatus(`User ${userId} reset successfully`);
    fetchUserChats(); // optional: refresh
  };

  return (
    <div className="admin-dashboard">
      <div className="user-info-container">
        <Avatar 
            src={`https://api.dicebear.com/7.x/micah/svg?seed=${currentUser?.avatarSeed || 'default'}`} 
            name={currentUser?.username} 
            status='available'
        />
        <span style={{ fontStyle: 'bold', textAlign: 'left', color: "white" }}>{currentUser?.username} <br></br><span style={{ fontStyle: 'italic' }}>You are admin.</span></span>
        <button className='switch-btn' onClick={() => {navigate('/chat');}}>chat</button>
      </div>
      <div className="control-btn-container">
        <button className={`control-btn ${adminFunc === "chat-history" ? 'selected' : ''}`} onClick={() => {handleAdminFuncSelect('chat-history');}}>Chat History</button>
        <button className={`control-btn ${adminFunc === "user-feedback" ? 'selected' : ''}`} onClick={() => {handleAdminFuncSelect('user-feedback');}}>User Feedback</button>
        <button className={`control-btn ${adminFunc === "reset-users" ? 'selected' : ''}`} onClick={() => {handleAdminFuncSelect('reset-users');}}>Manage User Status </button>
      </div>
      
        {adminFunc === "chat-history" && (<div className="admin-info-area">
            <div className="chat-admin-container">
                <div className="chat-table-container">
                    <table className="chat-table">
                        <thead>
                        <tr>
                            <th>username</th>
                            <th>chat id</th>
                        </tr>
                        </thead>
                        <tbody>
                        {userChats.map(user => (
                            <tr key={user.user_id}>
                            <td>
                                <button
                                className="user-btn"
                                onClick={() => setSelectedUser(user)}
                                >
                                {user.username}
                                {user.user_id === selectedUser?.user_id ? ' ✔' : ''}
                                </button>
                            </td>
                            <td>
                                {user.user_id === selectedUser?.user_id &&
                                selectedUser.chats.map(chat => (
                                    <div key={chat.chat_id}>
                                    <button
                                        className="user-btn"
                                        onClick={() => setSelectedChat(chat)}
                                    >
                                        {chat.chat_id}
                                    </button>
                                    </div>
                                ))}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="chat-preview-panel">
                    {selectedUser && selectedChat ? (
                    <div style={{ height:"100%", width:"100%" }}>
                        <p>{formatChatLevelAnswers(selectedChat.feedback)}</p>
                        {selectedChat.user_intent && (<p>✔ user_intent: {selectedChat.user_intent}</p>)}
                        {selectedChat.sru_query && (<p>✔ sru: {selectedChat.sru_query}</p>)}
                        
                        {/* <h3>🧑 {selectedUser.username} 💬Chat - {selectedChat.chat_id}</h3> */}
                        <MessageList className="selected-user-chat-history-area">
                            {/* Chat messages */}
                            {processedMessages(selectedChat.chat_history).map((msgModel, index) => (
                                <Message 
                                    key={index} 
                                    model={msgModel}
                                    style={{
                                        textAlign: msgModel.direction === "incoming" ? "left" : "right",
                                        marginBottom: "20px"
                                    }}
                                ></Message>
                            ))}
                        </MessageList>
                    </div>
                    ) : (
                    <p>Select (username, chat id).</p>
                    )}
                </div>
            </div>
        </div>)}
        
        {adminFunc === "user-feedback" && (<div className="admin-info-area">
            <div className="chat-admin-container">
                <div className="chat-table-container">
                    <table className="chat-table">
                        <thead>
                        <tr>
                            <th>username</th>
                        </tr>
                        </thead>
                        <tbody>
                        {userChats.map(user => (
                            <tr key={user.user_id}>
                            <td>
                                <button
                                className="user-btn"
                                onClick={() => setSelectedFeedbackUser(user)}
                                >
                                {user.username}
                                {user.user_id === selectedFeedbackUser?.user_id ? ' ✔' : ''}
                                </button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="chat-preview-panel">
                {selectedFeedbackUser ? (
                    userFeedbacks.map(feedback =>
                    feedback.user_id === selectedFeedbackUser.user_id && (
                        <div key={feedback.user_id} style={{ height: "100%", width: "100%" }}>
                            <pre>{formatChatLevelAnswers(feedback.feedback)}</pre>
                        </div>
                    )
                    )
                ) : (
                    <p>Select a user.</p>
                )}
                </div>
            </div>
        </div>)}

        {adminFunc === "reset-users" && (<div className="admin-info-area">
            <p className="reset-status">{resetStatus}</p>
            <div className="reset-btn-area">
                {userChats.map(user => (
                    <button
                        className='reset-user-btn'
                        key={user.user_id}
                        onClick={() => handleResetUser(user.user_id)}
                        style={{ padding: '8px 12px' }}
                    >
                    Reset {user.username}
                    </button>
                ))}
            </div>
        </div>)}
    </div>
);
};

export default AdminDashboard;