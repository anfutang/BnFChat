// UserAdminPanel.js
import { useState, useEffect } from "react";

import { FaAngleLeft, FaAngleRight, FaLongArrowAltUp, FaLongArrowAltDown, FaUserShield } from "react-icons/fa";

const AdminPanel = ({ currentUser }) => {
  const usersPerPage = 20;

  const [userList, setUserList] = useState(Array(usersPerPage).fill(null));
  const [userPage, setUserPage] = useState(1);
  const [totalUserPages, setTotalUserPages] = useState(1);

  const [operationMessage, setOperationMessage] = useState('');
  const [operaionMessageColor, setOperationMessageColor] = useState('white');

  const [isAdmin, setIsAdmin] = useState(currentUser.permissionLevel > 1);

  const fetchUsers = () => {
    fetch(`/api/account/user-list?page=${userPage}&threshold=${currentUser.permissionLevel}`)
      .then(response => response.json())
      .then(data => {
        const fetchedUsers = data.user;
        setUserList([...fetchedUsers, ...Array(usersPerPage - fetchedUsers.length).fill(null)]);
        setTotalUserPages(data.total_pages);
      })
      .catch(error => {
        console.error('Error fetching user list:', error);
      });
  };

  useEffect(() => {
    setIsAdmin(currentUser.permissionLevel > 1);
  }, [currentUser])

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [userPage, isAdmin, currentUser]);

  const handlePromote = (user) => {
    fetch(`/api/account/promote-user?userId=${user.id}`)
      .then(response => {
        return response.json().then(result => ({
          ok: response.ok,
          result
        }));
      })
      .then(({ ok, result }) => {
        if (!ok || !result.success) {
          setOperationMessageColor("red");
          setOperationMessage(`Échec de la promotion pour ${user.username}. Veuillez réessayer.`);
        } else {
          setOperationMessageColor("greenyellow");
          setOperationMessage(`Utilisateur ${user.username} promu avec succès !`);
          fetchUsers(); 
          // setTimeout(() => setOperationMessage(''), 3000);
        }
      })
      .catch(error => {
        console.error('Failed to promote user:', error);
        setOperationMessageColor("red");
        setOperationMessage(`Échec de la promotion pour ${user.username}. Veuillez réessayer.`);
      });
  };
  
  const handleDegrade = (user) => {
    fetch(`/api/account/degrade-user?userId=${user.id}`)
      .then(response => {
        return response.json().then(result => ({
          ok: response.ok,
          result
        }));
      })
      .then(({ ok, result }) => {
        if (!ok || !result.success) {
          setOperationMessageColor("red");
          setOperationMessage(`Échec de la rétrogradation pour ${user.username}. Veuillez réessayer.`);
        } else {
          setOperationMessageColor("greenyellow");
          setOperationMessage(`Utilisateur ${user.username} rétrogradé avec succès !`);
          fetchUsers(); 
          // setTimeout(() => setOperationMessage(''), 3000);
        }
      })
      .catch(error => {
        console.error('Failed to promote user:', error);
        setOperationMessageColor("red");
        setOperationMessage(`Échec de la rétrogradation pour ${user.username}. Veuillez réessayer.`);
      });
  };
  
  const handleApproveReset = (user) => {
    fetch(`/api/account/approve-reset-password?userId=${user.id}`)
      .then(response => {
        return response.json().then(result => ({
          ok: response.ok,
          result
        }));
      })
      .then(({ ok, result }) => {
        if (!ok || !result.success) {
          setOperationMessageColor("red");
          setOperationMessage(`Échec de l'approbation pour ${user.username}. Veuillez réessayer.`);
        } else {
          setOperationMessageColor("greenyellow");
          setOperationMessage(`Réinitialisation du mot de passe approuvée pour ${user.username} !`);
          fetchUsers(); 
          // setTimeout(() => setOperationMessage(''), 3000);
        }
      })
      .catch(error => {
        console.error("Failed to approuve user's request to reset password:", error);
        setOperationMessageColor("red");
        setOperationMessage(`Échec de l'approbation pour ${user.username}. Veuillez réessayer.`);
      });
  };

  return (
    <div className="content-container" style={{ height:"100%", overflow:"hidden" }}>
      {/* User list*/}
      {isAdmin && (<div className="table-container" style={{ width:"100%", height:"auto" }}>
        <div className="page-control-btn-container" style={{ height:"5%" }}>
          <button className="page-control-btn" onClick={() => setUserPage(Math.max(1, userPage - 1))} disabled={userPage === 1}><FaAngleLeft /></button>
          <p className="page-label">{userPage} / {totalUserPages}</p>
          <button className="page-control-btn" onClick={() => setUserPage(userPage + 1)} disabled={userPage === totalUserPages}><FaAngleRight /></button>
        </div>
        <p className="admin-operation-message" style={{ color:operaionMessageColor }}>
          {operationMessage || '\u00A0'}
        </p>
        <table className="column-table" style={{ fontSize:"0.9rem", fontFamily:"monospace"}}>
          <thead>
            <tr>
              <th>Nom utilisateur</th>
              <th>Promouvoir</th>
              <th>Rétrograder</th>
              <th>Réinitialiser le mot de passe</th>
            </tr>
          </thead>
          <tbody>
            {userList.map((user, index) => (
              <tr key={user?.id || index}>
                {/* username; administrators marked by admin icons */}
                <td>
                {user ? (
                  <>
                    {user.username}
                    {user.permissionLevel > 1 && (
                      <FaUserShield size={18} color="black" style={{ marginLeft: '0.3rem' }}  />
                    )}
                  </>
                ) : (
                  <span style={{ color: '#aaa' }}>&nbsp;</span>
                )}
                </td>

                {/* Promote */}
                <td>
                  {user && (<button
                    className="admin-action-btn"
                    disabled={!user || user.id === currentUser.userId || user.permissionLevel >= 2}
                    onClick={() => user && handlePromote(user)}
                  >
                    <FaLongArrowAltUp />
                  </button>)}
                </td>

                {/* Degrade */}
                <td>
                  {user && (<button
                    className="admin-action-btn"
                    disabled={!user || user.id === currentUser.userId || user.permissionLevel <= 1}
                    onClick={() => user && handleDegrade(user)}
                  >
                    <FaLongArrowAltDown />
                  </button>)}
                </td>

                {/* Reset Password */}
                <td>
                  {user?.request_reset_password ? (
                    <button
                      className="admin-action-btn"
                      disabled={user.allowed_reset_password}
                      onClick={() => handleApproveReset(user)}
                    >
                      {user.allowed_reset_password ? "Approuvé" : "Approuver"}
                    </button>
                  ) : (
                    <span style={{ color: "#aaa" }}></span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>)}
    </div>
  );
};

export default AdminPanel;
