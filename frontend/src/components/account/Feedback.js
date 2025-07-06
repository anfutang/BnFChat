// UserFeedback.js
import { useState, useEffect } from "react";

const UserFeedback = ({ currentUser }) => {
  const isAdmin = currentUser.permissionLevel > 1;
  const [feedbacks, setFeedbacks] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      const result = await fetch(
        isAdmin ? `/api/feedbacks?page=${page}` : `/api/users/${currentUser.id}/feedbacks`
      );
      const data = await result.json();
      setFeedbacks(data);
    };
    fetchFeedbacks();
  }, [page, isAdmin, currentUser]);

  return (
    <div>
      {isAdmin && (
        <div>
          <button onClick={() => setPage(Math.max(1, page - 1))}>{"<"}</button>
          <span style={{ margin: "0 10px" }}>Page {page}</span>
          <button onClick={() => setPage(page + 1)}>{">"}</button>
        </div>
      )}
      <ul>
        {feedbacks.map((fb, idx) => (
          <li key={idx} style={{ borderBottom: "1px solid #ccc", marginBottom: "10px" }}>
            <p><strong>From:</strong> {fb.username}</p>
            <p>{fb.comment}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserFeedback;
