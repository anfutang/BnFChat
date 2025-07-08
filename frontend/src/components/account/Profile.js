import { useState, useEffect } from "react";
import { FaAngleLeft, FaAngleRight, FaKey } from "react-icons/fa";
import { FaUser } from "react-icons/fa6";

const UserProfile = ({ currentUser }) => {
  const usersPerPage = 20;

  const [users, setUsers] = useState(Array(usersPerPage).fill(null));
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = currentUser.permissionLevel > 1;

  const fetchUsers = () => {
    fetch(`/api/account/user-profile?page=${page}&threshold=${currentUser.permissionLevel}`)
      .then(response => response.json())
      .then(data => {
        const fetchedUsers = data.profile;
        setUsers([...fetchedUsers, ...Array(usersPerPage - fetchedUsers.length).fill(null)]);
        setTotalPages(data.total_pages);
      })
      .catch(error => {
        console.error('Error fetching users:', error);
      });
  };

  const fetchUser = () => {
    fetch(`/api/account/fetch-user?userId=${currentUser.userId}`)
      .then(response => response.json())
      .then(data => {
        setSelectedUser(data);
      })
      .catch(error => {
        console.error('Error fetching the specified user:', error);
      });
  };

  useEffect(() => {
    
    if (isAdmin) fetchUsers();
    else {
      fetchUser();
    }
  }, [page, isAdmin, currentUser]);

  const handlePrev = () => setPage(Math.max(1, page - 1));
  const handleNext = () => setPage(page + 1);

  return (
    <div className="content-container">
      {isAdmin && (<div className="table-container">
        <table className="column-table">
          <thead>
            <tr>
              <th>Nom utilisateur</th>
            </tr>
          </thead>
          <tbody>
          {users.map((user, index) => (
              <tr key={user?.id || index}>
                <td>
                  {user ? (<button
                    className="user-btn"
                    onClick={() => setSelectedUser(user)}
                  >
                    {user.username}
                    {selectedUser?.id === user.id ? " ✔" : ""}
                  </button>) : <button className="user-btn" disabled={true}></button>
                  }       
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="page-control-btn-container">
          <button className="page-control-btn" onClick={handlePrev} disabled={page === 1}><FaAngleLeft /></button>
          <p className="page-label">{page} / {totalPages}</p>
          <button className="page-control-btn" onClick={handleNext} disabled={page === totalPages}><FaAngleRight /></button>
        </div>
      </div>)}

      <div className="content-area" style={{ width:isAdmin ? "80%" : "100%" }}>
        {selectedUser && (
          <div style={{ padding: "10px" }}>
            <h3 style={{  display:"flex", alignItems:"center", justifyContent:"center" }}><FaUser />&nbsp;{selectedUser.username}</h3>
            <p><strong>Cree le :</strong>&nbsp;{selectedUser.created_at}</p>
            {selectedUser.plaintext_password && (<p><strong><FaKey />&nbsp;Mot de Passe :</strong>&nbsp;{selectedUser.plaintext_password}</p>)}
            <p><strong>Âge :</strong>&nbsp;{selectedUser.profile?.age}</p>
            <p><strong>Éducation :</strong>&nbsp;{selectedUser.profile?.diplome}</p>
            <p><strong>Statut professionnel :</strong>&nbsp;{selectedUser.profile?.situation}</p>
            <p><strong>Recherche académique :</strong>&nbsp;{selectedUser.profile ? selectedUser.profile?.recherche_academique ? "✔" : "✖" : null}</p>
            <p><strong>Recherche amateur :</strong>&nbsp;{selectedUser.profile ? selectedUser.profile?.recherche_amateur ? "✔" : "✖" : null}</p>
            <p><strong>Utilisation de Gallica :</strong>&nbsp;{selectedUser.profile ? selectedUser.profile?.utilise_gallica ? "✔" : "✖" : null}</p>
            <p><strong>Objectif d'utilisation de Gallica :</strong>&nbsp;{selectedUser.profile?.usage_gallica}</p>
            <p><strong>Fréquence d'utilisation de Gallica :</strong>&nbsp;{selectedUser.profile?.frequence_gallica}</p>
            <p><strong>Accord pour un contact futur : </strong>&nbsp;{selectedUser.profile ? selectedUser.profile?.contact_autorise ? "✔" : "✖" : null}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;