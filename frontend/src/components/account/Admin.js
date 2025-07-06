// UserAdminPanel.js
import { useState, useEffect } from "react";

const AdminPanel = ({ currentUser }) => {
  const [requests, setRequests] = useState([]);
  const [statusList, setStatusList] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [statusRes, requestRes] = await Promise.all([
        fetch("/api/users/status"),
        fetch("/api/users/requests"),
      ]);
      const statusData = await statusRes.json();
      const requestData = await requestRes.json();
      setStatusList(statusData);
      setRequests(requestData);
    };
    fetchData();
  }, []);

  const handleApprove = (requestId) => {
    console.log(`Approve request ${requestId}`);
  };

  return (
    <div>
      <h3>用户状态</h3>
      <ul>
        {statusList.map((u) => (
          <li key={u.id}>{u.username}: {u.status}</li>
        ))}
      </ul>
      <h3>处理用户请求</h3>
      <ul>
        {requests.map((req) => (
          <li key={req.id}>
            <p>{req.username} 请求: {req.type}</p>
            <button onClick={() => handleApprove(req.id)}>处理</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminPanel;
