// UserFeedback.js
import { useState, useEffect } from "react";

import { FaAngleLeft, FaAngleRight } from "react-icons/fa";

const UserFeedback = ({ currentUser }) => {
  const usersPerPage = 20;

  const [userList, setUserList] = useState(Array(usersPerPage).fill(null));
  const [userPage, setUserPage] = useState(1);
  const [totalUserPages, setTotalUserPages] = useState(1);

  const [selectedUser, setSelectedUser] = useState(null);

  const [userFeedbackList, setUserFeedbackList] = useState([]);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [totalFeedbackPages, setTotalFeedbackPages] = useState(1);

  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const isAdmin = currentUser.permissionLevel > 1;

  const fetchUsers = () => {
    fetch(`/api/account/user-list?page=${userPage}&threshold=${currentUser.permissionLevel}&table=feedback`)
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

  const fetchUser = () => {
    fetch(`/api/account/fetch-user?userId=${currentUser.userId}`)
      .then(response => response.json())
      .then(data => {
        handleSelectUser(data);
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
  }, [userPage, isAdmin, currentUser]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSelectedFeedback(null);
    setFeedbackPage(1);
    fetch(`/api/account/user-feedbacks?user_id=${user.id}&page=1`)
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setUserFeedbackList(data.feedbacks);
        setTotalFeedbackPages(data.total_pages);
        if (data.total_pages === 0) setFeedbackPage(0);
      });
  };

  useEffect(() => {
    if (!selectedUser?.id) return; // 避免 selectedUser 未定义时触发
  
    fetch(`/api/account/user-feedbacks?user_id=${selectedUser.id}&page=${feedbackPage}`)
      .then((res) => res.json())
      .then((data) => setUserFeedbackList(data.feedbacks));
  }, [feedbackPage, selectedUser?.id]);

  return (
    <div className="content-container">
      {/* User list*/}
      {isAdmin && (<div className="table-container">
        <table className="column-table">
          <thead>
            <tr>
              <th>Nom utilisateur</th>
            </tr>
          </thead>
          <tbody>
            {userList.map((user, index) => (
              <tr key={user?.id || index}>
              <td>
                {user ? (<button
                  className="user-btn"
                  onClick={() => handleSelectUser(user)}
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
          <button className="page-control-btn" onClick={() => setUserPage(Math.max(1, userPage - 1))} disabled={userPage === 1}><FaAngleLeft /></button>
          <p className="page-label">{userPage} / {totalUserPages}</p>
          <button className="page-control-btn" onClick={() => setUserPage(userPage + 1)} disabled={userPage === totalUserPages}><FaAngleRight /></button>
        </div>
      </div>)}

      {/* Chat list */}
      <div className="content-area" style={{ width:isAdmin ? "80%" : "100%" }}>
        {selectedUser && (
          <>
            <div className="page-control-btn-container">
              <button className="page-control-btn" onClick={() => setFeedbackPage(Math.max(1, feedbackPage - 1))} disabled={feedbackPage === 1}><FaAngleLeft /></button>
              <p className="page-label">{feedbackPage} / {totalFeedbackPages}</p>
              <button className="page-control-btn" onClick={() => setFeedbackPage(feedbackPage + 1)} disabled={feedbackPage === totalFeedbackPages}><FaAngleRight /></button>
            </div>

            <div className="chat-selection-btn-container">
              {userFeedbackList.map((feedback) => (
                <button
                  key={feedback.feedback_id}
                  className={`chat-selection-btn ${selectedFeedback?.feedback_id === feedback.feedback_id ? "selected" : ""}`}
                  onClick={() => setSelectedFeedback(feedback)}
                >
                  {feedback.feedback_id}
                </button>
              ))}
            </div>
          </>
        )}

        {selectedFeedback && (<>
        <div className="chat-info-panel">
          <p>Cree le : {selectedFeedback.created_at}</p>
        </div>
        <div className="feedback-area">
          {selectedFeedback.content}
        </div>
        </>)}
      </div>
    </div>
  );
};

export default UserFeedback;