const { io } = require("socket.io-client");

const SERVER_URL = "http://localhost:5001";  // 👈 替换成你的 Flask SocketIO 地址
const NUM_CLIENTS = 15;  // 👈 并发客户端数量

const chat_history = [
  "victor hugo#quel aspect?#biographie; cherche",
  "voltaire#ecrivain voltaire?#oui ; cherche",
  "le temps#un titre ou un sujet ?#un sujet#quel sujet ?#concept phisique ; cherche",
  "le temps#le periodique ?#oui ; cherche",
  "encyclopedia#quel aspect ? #en general ; cherche",
  "la bible#quel version?#bible protestante ; cherche",
  "louis XVI#le roi ? #oui ; cherche",
  "mozart#quel mozart cherchez-vous?#mozer le musicien ; cherche",
  "zola#quel zola ? #emile zola ; cherche",
  "moliere#cherchez-vous ses oeuvres ? #non, sa biographie ; cherche",
  "gravure # quel genre de gravure?#gravure naturel ; cherche",
  "architecture#du quel pays?#en europe ; cherche",
  "mode#quel aspect de la mode?#vetements ; cherche",
  "le mode illustre#comme un titre ou un sujet?#titre ; cherche",
  "tango#danse ou musique?#les deux ; cherche"
]

function createClient(id) {
  const socket = io(SERVER_URL, {
    transports: ["websocket"],  
  });

  console.log('✅');

  socket.on("connect", () => {
    socket.emit('demo_join', { room: `user_${id}`, id: id });
    // console.log(`Client ${id} connected`);
  });

  socket.on("disconnect", () => {
    console.log(`Client ${id} disconnected`);
  });

  socket.on("connect_error", (err) => {
    console.error(`Client ${id} connection error:`, err.message);
  });

  socket.on("demo_room_joined", (data) => {
    console.log("✅ Socket connected:", data.msg);

    socket.emit("demo_send_message", {
      user_id: `${data.id}`,
      chat_id: `${data.id}`,
      message: chat_history[data.id-100],
    });
  });
  
  socket.on('demo_response', (data) => {
    console.log(`🔵${data.id} ${data.response}`);
  });

  socket.on('demo_search_result', (data) => {
    console.log(data.response)
  });

  socket.on('demo_error', (data) => {
    console.log(`🔴${data.id} ${data.error_message}`);
  });
}

for (let i = 100; i < NUM_CLIENTS+100; i++) {
  createClient(i);  
}