// UserAvatar.js
import { useState, useEffect } from "react";

const UserAvatar = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);

  const isAdmin = currentUser.permissionLevel > 1;

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await fetch(`/api/users?page=${page}`);
      const data = await result.json();
      setUsers(data);
    };
    if (isAdmin) fetchUsers();
    else setUsers([currentUser]);
  }, [page, isAdmin, currentUser]);

  const handleAvatarChange = (userId, file) => {
    console.log(`Change avatar for user ${userId} with file`, file);
  };

  const handlePrev = () => setPage(Math.max(1, page - 1));
  const handleNext = () => setPage(page + 1);

  return (
    <div style={{ display: "flex" }}>
      <div style={{ width: "30%" }}>
        {isAdmin && (
          <div>
            <button onClick={handlePrev}>{"<"}</button>
            <span style={{ margin: "0 10px" }}>Page {page}</span>
            <button onClick={handleNext}>{">"}</button>
          </div>
        )}
        <ul>
          {users.map((u) => (
            <li key={u.id}>{u.username}</li>
          ))}
        </ul>
      </div>
      <div style={{ width: "70%" }}>
        {users.map((u) => (
          <div key={u.id} style={{ marginBottom: "15px" }}>
            <img src={u.avatar} alt="avatar" width="80" height="80" />
            <input
              type="file"
              onChange={(e) => handleAvatarChange(u.id, e.target.files[0])}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserAvatar;
