const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const Game = require('./Game');

const app = express();
app.use(cors());

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const rooms = {};

function getPublicRooms() {
  return Object.values(rooms).map(r => ({
    id: r.id,
    name: r.name,
    hasPassword: !!r.password,
    playersCount: r.players.length,
    spectatorsCount: r.spectators.length,
    status: r.status,
    gameType: r.gameType
  }));
}
// Export for Game.js to use when updating lobbies
module.exports.getPublicRooms = getPublicRooms;

function sanitizeRoom(room) {
  return {
    id: room.id, name: room.name, hasPassword: !!room.password,
    host: room.host, players: room.players, spectators: room.spectators,
    status: room.status, gameType: room.gameType
  };
}

function sendSystemMessage(roomId, text, ioInstance) {
  const room = rooms[roomId];
  if (!room) return;
  const msg = { system: true, message: text, timestamp: Date.now() };
  if (!room.chatHistory) room.chatHistory = [];
  room.chatHistory.push(msg);
  if (room.chatHistory.length > 200) room.chatHistory.shift();
  ioInstance.to(roomId).emit('chat_message', msg);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.emit('rooms_list', getPublicRooms());

  socket.on('create_room', ({ name, password, playerName, gameType }, callback) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    const hostName = playerName || 'Player 1';
    rooms[roomId] = {
      id: roomId,
      name: name || `Room ${roomId}`,
      password: password || '',
      host: socket.id,
      gameType: gameType || 'black_and_white',
      players: [{ id: socket.id, name: hostName, ready: false }],
      spectators: [],
      status: 'waiting',
      gameInstance: null,
      chatHistory: [],
      spectatorHistory: []
    };
    
    socket.join(roomId);
    io.emit('rooms_list', getPublicRooms());
    callback({ success: true, roomId, room: sanitizeRoom(rooms[roomId]) });
  });

  socket.on('join_room', ({ roomId, password, playerName, role }, callback) => {
    const room = rooms[roomId];
    if (!room) return callback({ success: false, message: 'Room not found' });
    if (room.password && room.password !== password) return callback({ success: false, message: 'Invalid password' });
    if (room.status !== 'waiting' && role === 'player') return callback({ success: false, message: 'Game already started' });
    if (role === 'player' && room.players.length >= 2) return callback({ success: false, message: 'Room is full (2 players max)' });

    const user = { id: socket.id, name: playerName || (role === 'player' ? 'Player 2' : 'Spectator'), ready: false };
    
    if (role === 'player') room.players.push(user);
    else { room.spectators.push(user); socket.join(`${roomId}_spectators`); }

    socket.join(roomId);
    sendSystemMessage(roomId, `${user.name} joined as ${role}`, io);
    
    io.to(roomId).emit('room_updated', sanitizeRoom(room));
    io.emit('rooms_list', getPublicRooms());
    
    // Explicitly send histories back natively!
    socket.emit('chat_history', { type: 'general', messages: room.chatHistory });
    if (role !== 'player') socket.emit('chat_history', { type: 'spectator', messages: room.spectatorHistory });
    
    // If joining mid-game, explicitly send the game state to the joiner immediately
    if ((room.status === 'playing' || room.status === 'finished') && room.gameInstance) {
       socket.emit('game_state_update', room.gameInstance.getMaskedState(role === 'player' ? socket.id : 'spectator'));
    }

    callback({ success: true, room: sanitizeRoom(room) });
  });

  socket.on('send_chat', ({ roomId, message, type }, callback) => {
    const room = rooms[roomId];
    if (!room) return;
    
    const isPlayer = room.players.some(p => p.id === socket.id);
    let senderName = 'Unknown';
    if (isPlayer) senderName = room.players.find(p => p.id === socket.id).name;
    else {
      const spec = room.spectators.find(s => s.id === socket.id);
      if (spec) senderName = spec.name;
    }

    if (type === 'spectator') {
      if (isPlayer) return;
      const msgObj = { sender: senderName, message, timestamp: Date.now() };
      room.spectatorHistory.push(msgObj);
      if (room.spectatorHistory.length > 200) room.spectatorHistory.shift();
      io.to(`${roomId}_spectators`).emit('spectator_chat', msgObj);
    } else {
      const msgObj = { sender: senderName, message, isPlayer, timestamp: Date.now() };
      room.chatHistory.push(msgObj);
      if (room.chatHistory.length > 200) room.chatHistory.shift();
      io.to(roomId).emit('chat_message', msgObj);
    }
  });

  socket.on('start_game', (data, callback) => {
    let roomId = data;
    let options = {};
    if (typeof data === 'object') {
       roomId = data.roomId;
       options = data.options || {};
    }
    const room = rooms[roomId];
    if (!room) return;
    if (room.host !== socket.id) return callback({ success: false, message: 'Only host can start the game' });
    if (room.players.length < 2) return callback({ success: false, message: 'Need 2 players to start' });
    if (!room.players.every(p => p.ready)) return callback({ success: false, message: 'Not all players are ready' });
    
    room.status = 'playing';
    
    // Abstract Factory execution
    const BlackAndWhite = require('./games/BlackAndWhite');
    const BlackHole = require('./games/BlackHole');
    const ArmsLength = require('./games/ArmsLength');
    if (room.gameType === 'black_and_white') {
      room.gameInstance = new BlackAndWhite(room, io, options);
    } else if (room.gameType === 'black_hole') {
      room.gameInstance = new BlackHole(room, io, options);
    } else if (room.gameType === 'arms_length') {
      room.gameInstance = new ArmsLength(room, io, options);
    } else {
      room.gameInstance = new Game(room, io, options);
    }
    
    sendSystemMessage(roomId, `The game is starting!`, io);
    io.to(roomId).emit('game_started');
    io.to(roomId).emit('room_updated', sanitizeRoom(room));
    io.emit('rooms_list', getPublicRooms());
    
    room.gameInstance.broadcastState();
    if(callback) callback({ success: true });
  });

  socket.on('game_move', ({ roomId, moveData }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing' || !room.gameInstance) return;
    try {
      room.gameInstance.handleMove(socket.id, moveData);
    } catch (e) {
      console.log('Move error:', e.message);
    }
  });

  const handleUserLeave = (socketId, room, roomId) => {
    const isHost = room.host === socketId;
    const isPlayer = room.players.some(p => p.id === socketId);
    if (!isPlayer && !room.spectators.some(s => s.id === socketId)) return false;

    const user = room.players.find(p => p.id === socketId) || room.spectators.find(s => s.id === socketId);

    // If host leaves, entire room is destroyed
    if (isHost) {
       sendSystemMessage(roomId, `Host ${user.name} left. Room disbanded.`, io);
       io.to(roomId).emit('room_disbanded');
       if (room.gameInstance && room.status === 'playing') room.gameInstance.destroy();
       delete rooms[roomId];
       io.emit('rooms_list', getPublicRooms());
       return true;
    }
    
    // Normal participant leaves
    room.players = room.players.filter(p => p.id !== socketId);
    room.spectators = room.spectators.filter(s => s.id !== socketId);
    sendSystemMessage(roomId, `${user.name} left the room`, io);

    // Auto-forfeit
    if (isPlayer && room.status === 'playing' && room.gameInstance) {
       const opp = room.players[0]; // remaining player
       room.gameInstance.endGame(opp ? opp.id : 'draw', `${user.name} disconnected and forfeited.`);
    }

    if (rooms[roomId]) io.to(roomId).emit('room_updated', sanitizeRoom(rooms[roomId]));
    io.emit('rooms_list', getPublicRooms());
    return true;
  };

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const roomId in rooms) {
       handleUserLeave(socket.id, rooms[roomId], roomId);
    }
  });

  socket.on('leave_room', ({ roomId }) => {
    const room = rooms[roomId];
    if (room) {
      handleUserLeave(socket.id, room, roomId);
      socket.leave(roomId);
      socket.leave(`${roomId}_spectators`);
    }
  });

  socket.on('change_game_type', ({ roomId, type }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'waiting' || room.host !== socket.id) return;
    room.gameType = type;
    sendSystemMessage(roomId, `Host changed game to ${type === 'black_hole' ? 'Black Hole' : type === 'arms_length' ? "Arm's Length" : 'Black and White'}`, io);
    io.to(roomId).emit('room_updated', sanitizeRoom(room));
    io.emit('rooms_list', getPublicRooms());
  });

  socket.on('switch_role', ({ roomId, role }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'waiting') return;
    
    const isPlayer = room.players.some(p => p.id === socket.id);
    const user = isPlayer ? room.players.find(p => p.id === socket.id) : room.spectators.find(s => s.id === socket.id);
    if (!user) return;
    
    if (role === 'player') {
       if (isPlayer || room.players.length >= 2) return;
       room.spectators = room.spectators.filter(s => s.id !== socket.id);
       user.ready = false;
       room.players.push(user);
       socket.leave(`${roomId}_spectators`);
       sendSystemMessage(roomId, `${user.name} became a Player`, io);
    } else if (role === 'spectator') {
       if (!isPlayer) return;
       room.players = room.players.filter(p => p.id !== socket.id);
       room.spectators.push(user);
       socket.join(`${roomId}_spectators`);
       sendSystemMessage(roomId, `${user.name} became a Spectator`, io);
    }

    io.to(roomId).emit('room_updated', sanitizeRoom(room));
    io.emit('rooms_list', getPublicRooms());
  });

  socket.on('change_host', ({ roomId, newHostId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'waiting' || room.host !== socket.id) return;

    const newHost = [...room.players, ...room.spectators].find(p => p.id === newHostId);
    if (!newHost) return;

    room.host = newHostId;
    sendSystemMessage(roomId, `${newHost.name} is now the Host`, io);
    io.to(roomId).emit('room_updated', sanitizeRoom(room));
    io.emit('rooms_list', getPublicRooms());
  });

  socket.on('toggle_ready', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'waiting') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    player.ready = !player.ready;
    io.to(roomId).emit('room_updated', sanitizeRoom(room));
    io.emit('rooms_list', getPublicRooms());
  });

  socket.on('return_to_lobby', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'finished' || room.host !== socket.id) return;
    
    room.status = 'waiting';
    room.gameInstance = null;
    room.players.forEach(p => p.ready = false);
    
    io.to(roomId).emit('room_updated', sanitizeRoom(room));
    io.emit('rooms_list', getPublicRooms());
  });

  socket.on('resign', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing' || !room.gameInstance) return;
    const isPlayer = room.players.some(p => p.id === socket.id);
    if (!isPlayer) return;
    
    const op = room.players.find(p => p.id !== socket.id);
    const winnerId = op ? op.id : 'draw';
    const loser = room.players.find(p => p.id === socket.id);
    
    room.gameInstance.endGame(winnerId, `${loser.name} explicitly resigned.`);
  });
});

app.get(/^.*$/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
});
