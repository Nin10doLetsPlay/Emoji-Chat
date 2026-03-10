const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.static('public'));

let waitingUser = null;
let roomCounter = 1;

const userRoomMap = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('find-stranger', () => {
    // if the user was already waiting, don't duplicate them
    if (waitingUser === socket.id) {
      return;
    }

    // if no one is waiting, store this user
    if (waitingUser === null) {
      waitingUser = socket.id;
      socket.emit('system-message', 'Waiting for a stranger...');
      return;
    }

    // if the waiting user disconnected somehow
    const otherSocket = io.sockets.sockets.get(waitingUser);
    if (!otherSocket) {
      waitingUser = socket.id;
      socket.emit('system-message', 'Waiting for a stranger...');
      return;
    }

    // create a room for the pair
    const roomName = `room-${roomCounter++}`;

    socket.join(roomName);
    otherSocket.join(roomName);

    userRoomMap.set(socket.id, roomName);
    userRoomMap.set(otherSocket.id, roomName);

    io.to(roomName).emit('matched');
    io.to(roomName).emit('system-message', 'A stranger has connected.');

    waitingUser = null;
  });

  socket.on('chat-message', (message) => {
    const roomName = userRoomMap.get(socket.id);
    if (!roomName) return;

    io.to(roomName).emit('chat-message', message);
  });

  socket.on('leave-chat', () => {
    handleLeave(socket);
  });

  socket.on('disconnect', () => {
    handleLeave(socket);
    console.log('User disconnected:', socket.id);
  });

  function handleLeave(socket) {
    // remove from waiting queue if needed
    if (waitingUser === socket.id) {
      waitingUser = null;
    }

    const roomName = userRoomMap.get(socket.id);
    if (!roomName) return;

    socket.to(roomName).emit('system-message', 'A stranger has disconnected.');

    userRoomMap.delete(socket.id);
    socket.leave(roomName);

    // remove anyone else still tracked in this room if they leave later naturally
    for (const [userId, room] of userRoomMap.entries()) {
      if (room === roomName && userId === socket.id) {
        userRoomMap.delete(userId);
      }
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});