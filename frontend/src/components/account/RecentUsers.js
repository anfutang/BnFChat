// RecentUsers.js
import React, { useState, useEffect } from 'react';
import { FaUser, FaUserShield, FaSyncAlt, FaCircle } from 'react-icons/fa';

const RecentUsers = ({ currentUser }) => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [users, setUsers] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusMessageColor, setStatusMessageColor] = useState('white');
  const [lastUpdateTimeStamp, setLastUpdateTimeStamp] = useState(new Date().toLocaleTimeString());

  const fetchUserData = () => {
    fetch(`/api/account/recent-users?threshold=${currentUser.permissionLevel}`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur de HTTP');
        return res.json();
      })
      .then(data => {
        setOnlineCount(data.nb_online_users);
        setUsers(data.users);
        setStatusMessageColor('greenyellow');
        setLastUpdateTimeStamp(new Date().toLocaleTimeString());
        setStatusMessage(`Mise à jour réussie : ${lastUpdateTimeStamp}`);
        // setTimeout(() => setStatusMessage(''), 3000); 
      })
      .catch(err => {
        console.error(err);
        setStatusMessageColor('red');
        setStatusMessage(`Échec du rafraîchissement. Dernière mise à jour : ${lastUpdateTimeStamp}`);
        // setTimeout(() => setStatusMessage(''), 3000);
      });
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  function parseAsLocalDate(datetimeString) {
    const [datePart, timePart] = datetimeString.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
  
    return new Date(year, month - 1, day, hour, minute, second); // 注意：月份从0开始
  }
  

  return (
    <div className="content-area" style={{ width:"100%" }}>
      <div className="activity-header">
        <p>Actuellement {onlineCount} utilisateurs en ligne (active pendant les dernières 10 minutes)</p>
        <button className="activity-refresh-button" onClick={fetchUserData}>
          <FaSyncAlt color="black" />
        </button>
      </div>

      <div className="activity-refresh-message" style={{ color: statusMessageColor }}>
        {statusMessage || '\u00A0'}
      </div>

      <p style={{ fontWeight:"500" }}>Utilisateurs récemment actifs</p>

      <div className="recent-user-container">
        {users.map((user, idx) => (
          <div key={idx} className="recent-user">
            <p><strong>{user.username}</strong>
            {user.permission_level > 1 ? (<FaUserShield color="white" />): (<FaUser color="white" />)}</p>
            <p style={{ margin:"0;1rem" }}>{user && (<FaCircle color={user.online ? 'green' : 'crimson'} />)}</p>
            <span style={{ color: '#ccc', fontSize: '0.9em' }}>
              Dernière connexion : {user.last_connection_at}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentUsers;
