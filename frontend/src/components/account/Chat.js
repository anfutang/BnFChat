// UserChat.js (两步式逻辑：先选用户，再分页查看对话)
import { useState, useEffect } from "react";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";
import { MdThumbUp, MdThumbDown } from 'react-icons/md'

import "../chat/ChatArea.css"
import '../feedback/ResultModal.css';

import { ChartColumn } from "lucide-react";

const UserChat = ({ currentUser }) => {
  const usersPerPage = 20;

  const [userList, setUserList] = useState(Array(usersPerPage).fill(null));
  const [userPage, setUserPage] = useState(1);
  const [totalUserPages, setTotalUserPages] = useState(1);

  const [selectedUser, setSelectedUser] = useState(null);

  const [userChatList, setUserChatList] = useState([]);
  const [chatPage, setChatPage] = useState(1);
  const [totalChatPages, setTotalChatPages] = useState(1);

  const [selectedChat, setSelectedChat] = useState(null);

  const isAdmin = currentUser.permissionLevel > 1;

  const baseGallicaURL = "https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&version=1.2&startRecord=1&maximumRecords=15&page=1&collapsing=true&exactSearch=false&query={sru_query}"
  const singleResultGallicaURL = "https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&version=1.2&query={sru_query}"

  const parseNumRecords = (message) => {
    if (message.startsWith("🟢")) {
      const match = message.match(/🟢 (\d+) résultats/);
      return match ? parseInt(match[1], 10) : 0;
    } else {
      return -1;
    }
  };

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

  // useEffect(() => {
  //   if (isAdmin) {
  //     fetch(`/api/account/user-list?page=${userPage}&threshold=${currentUser.permissionLevel}`)
  //       .then((res) => res.json())
  //       .then((data) => {
  //         const fetchedUsers = data.user;
  //         setUserList([...fetchedUsers, ...Array(usersPerPage - fetchedUsers.length).fill(null)]);
  //         setTotalUserPages(data.total_pages);
  //         // console.log("chat",data.user);
  //       });
  //   } else {
  //     setUserList([currentUser]);
  //   }
  // }, [userPage, isAdmin, currentUser]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSelectedChat(null);
    setChatPage(1);
    fetch(`/api/account/user-chats?user_id=${user.id}&page=1`)
      .then((res) => res.json())
      .then((data) => {
        setUserChatList(data.chats);
        setTotalChatPages(data.total_pages);
        if (data.total_pages === 0) setChatPage(0);
      });
  };

  useEffect(() => {
    if (!selectedUser?.id) return; // 避免 selectedUser 未定义时触发
  
    fetch(`/api/account/user-chats?user_id=${selectedUser.id}&page=${chatPage}`)
      .then((res) => res.json())
      .then((data) => setUserChatList(data.chats));
  }, [chatPage, selectedUser?.id]);

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
              <button className="page-control-btn" onClick={() => setChatPage(Math.max(1, chatPage - 1))} disabled={chatPage === 1}><FaAngleLeft /></button>
              <p className="page-label">{chatPage} / {totalChatPages}</p>
              <button className="page-control-btn" onClick={() => setChatPage(chatPage + 1)} disabled={chatPage === totalChatPages}><FaAngleRight /></button>
            </div>

            <div className="chat-selection-btn-container">
              {userChatList.map((chat) => (
                <button
                  key={chat.chat_id}
                  className={`chat-selection-btn ${selectedChat?.chat_id === chat.chat_id ? "selected" : ""}`}
                  onClick={() => setSelectedChat(chat)}
                >
                  {chat.chat_id}
                </button>
              ))}
            </div>
          </>
        )}

        {selectedChat && (<div className="chat-info-panel">
          <p>Cree le : {selectedChat.created_at}</p>
          <p>Mise a jour le : {selectedChat.updated_at}</p>
          <p>Statut: {selectedChat.status}</p>
          {selectedChat.user_intent && (<p>Intention : {selectedChat.user_intent}</p>)}
          {selectedChat.feedback && <p>Feedback : {selectedChat.feedback === "like" ? <MdThumbUp /> : <MdThumbDown /> }</p>}
        </div>)}

        {selectedChat && (() => {
          const processedMessages = [];
          let lastSRUContent = "";

          selectedChat.chat_history.forEach((msg) => {
            if (msg.role === "sru") {
              lastSRUContent = msg.content;
            }

            processedMessages.push({
              ...msg,
              sruContent: lastSRUContent,
            });
          });

          return (
            <div className="message-area" style={{ margin:"10px", padding:"5px" }}>
              {processedMessages.map((msg, index) => {
                if (msg.role === "gallica") {
                  return (
                    <div key={index} className="sru-btn-container">
                      <p className="sru-validness-msg">{msg.content}</p>
                      <button
                        className="sru-btn"
                        onClick={() =>
                          window.open(
                            parseNumRecords(msg.content) > 15
                              ? baseGallicaURL.replace("{sru_query}", encodeURIComponent(msg.sruContent))
                              : singleResultGallicaURL.replace("{sru_query}", encodeURIComponent(msg.sruContent)),
                            "_blank"
                          )
                        }
                      >
                        Gallica
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={index} className={`message ${msg.role}`}>
                    {msg.content}
                  </div>
                );
              })}

              {selectedChat && selectedChat.result && Object.keys(selectedChat.result).some(key => key !== "chatId") && (
                <div className="result-container">
                  <p className="result-headline">Conversation terminée. Voici les sujets les plus proches de votre intention :</p>
                  <div className="facet-container">
                    {selectedChat.result.facet.map((facet,index) => {
                      const sru = selectedChat.result.sru[index];
                      const numRecord = selectedChat.result.num_records[index];
                      const facetURL = numRecord > 15
                                        ? baseGallicaURL.replace("{sru_query}", encodeURIComponent(sru))
                                        : singleResultGallicaURL.replace("{sru_query}", encodeURIComponent(sru));
                      return (<button 
                        key={facet}
                        className="facet-btn"
                        onClick={() => window.open(facetURL,'_blank')}
                      >
                        {facet}
                      </button>);
                    })}
                  </div>
              </div>)}
            </div>
          );
        })()}

        
      </div>
    </div>
  );
};

export default UserChat;

