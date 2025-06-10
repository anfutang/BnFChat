const { io } = require("socket.io-client");

const SERVER_URL = "http://localhost:5001";  // 👈 替换成你的 Flask SocketIO 地址
const NUM_CLIENTS = 15;  // 👈 并发客户端数量

const chat_history = [
  "victor hugo#quel aspect?#biographie",
  "voltaire#ecrivain voltaire?#oui",
  "le temps#un titre ou un sujet ?#un sujet#quel sujet ?#concept phisique",
  "le temps#le periodique ?#oui",
  "encyclopedia#quel aspect ? #en general",
  "la bible#quel version?#bible protestante",
  "louis XVI#le roi ? #oui",
  "mozart#quel mozart cherchez-vous?#mozer le musicien",
  "zola#quel zola ? #emile zola",
  "moliere#cherchez-vous ses oeuvres ? #non, sa biographie",
  "gravure # quel genre de gravure?#gravure naturel",
  "architecture#du quel pays?#en europe",
  "mode#quel aspect de la mode?#vetements",
  "le mode illustre#comme un titre ou un sujet?#titre",
  "tango#danse ou musique?#les deux"
]

function createClient(id) {
  const socket = io(SERVER_URL, {
    transports: ["websocket"],  
  });

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
      user_id: `${id}`,
      chat_id: `${id}`,
      message: chat_history[id-100],
    });
  });

  socket.on("demo_response", (data) => {
    console.log(`🔵${data.id} ${data.response}`);
  });
}

for (let i = 100; i < NUM_CLIENTS+100; i++) {
  createClient(i);  
}