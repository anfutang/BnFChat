import { useState, useEffect } from "react";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";
import { FaUser } from "react-icons/fa6";

const UserProfile = ({ currentUser }) => {
  const usersPerPage = 20;

  const [users, setUsers] = useState(Array(usersPerPage).fill(null));
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = currentUser.permissionLevel > 1;

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await fetch(`/api/account/user-profile?page=${page}&threshold=${currentUser.permissionLevel}`);
      const data = await result.json();
      const fetchedUsers = data.profile;
      setUsers([...fetchedUsers, ...Array(usersPerPage - fetchedUsers.length).fill(null)]);
      setTotalPages(data.total_pages);

      // console.log("profile",data.profile);
    };
    if (isAdmin) fetchUsers();
    else {
      setUsers([currentUser]);
      setSelectedUser(currentUser);
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
              <th>username</th>
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
            <p><strong>Âge :</strong>&nbsp;{selectedUser.profile?.age}</p>
            <p><strong>Éducation :</strong>&nbsp;{selectedUser.profile?.diplome}</p>
            <p><strong>Statut professionnel :</strong>&nbsp;{selectedUser.profile?.situation}</p>
            <p><strong>Recherche académique :</strong>&nbsp;{selectedUser.profile?.recherche_academique ? "✔" : "✖"}</p>
            <p><strong>Recherche amateur :</strong>&nbsp;{selectedUser.profile?.recherche_amateur ? "✔" : "✖"}</p>
            <p><strong>Utilisation de Gallica :</strong>&nbsp;{selectedUser.profile?.utilise_gallica ? "✔" : "✖"}</p>
            <p><strong>Objectif d'utilisation de Gallica :</strong>&nbsp;{selectedUser.profile?.usage_gallica}</p>
            <p><strong>Fréquence d'utilisation de Gallica :</strong>&nbsp;{selectedUser.profile?.frequence_gallica}</p>
            <p><strong>Accord pour un contact futur :</strong>&nbsp;{selectedUser.profile?.contact_autorise ? "✔" : "✖"}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;