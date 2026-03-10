const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const PORT = 3000

app.use(express.static('public'))

let waitingUser = null
let roomCounter = 1
const userRoomMap = new Map()

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('find-stranger', () => {
    if (userRoomMap.has(socket.id)) {
      return
    }

    if (waitingUser === socket.id) {
      return
    }

    if (waitingUser === null) {
      waitingUser = socket.id
      socket.emit('system-message', 'Waiting for a stranger...')
      return
    }

    const otherSocket = io.sockets.sockets.get(waitingUser)

    if (!otherSocket) {
      waitingUser = socket.id
      socket.emit('system-message', 'Waiting for a stranger...')
      return
    }

    const roomName = `room-${roomCounter++}`

    socket.join(roomName)
    otherSocket.join(roomName)

    userRoomMap.set(socket.id, roomName)
    userRoomMap.set(otherSocket.id, roomName)

    waitingUser = null

    io.to(roomName).emit('matched')
    io.to(roomName).emit('system-message', 'A stranger has connected.')
  })

  socket.on('chat-message', (messageData) => {
    const roomName = userRoomMap.get(socket.id)
    if (!roomName) return

    io.to(roomName).emit('chat-message', {
      senderId: socket.id,
      text: messageData.text || null,
      emoji: messageData.emoji || null
    })
  })

  socket.on('leave-chat', () => {
    handleLeave(socket)
  })

  socket.on('disconnect', () => {
    handleLeave(socket)
    console.log('User disconnected:', socket.id)
  })

  function handleLeave(socket) {
    if (waitingUser === socket.id) {
      waitingUser = null
    }

    const roomName = userRoomMap.get(socket.id)
    if (!roomName) return

    socket.emit('system-message', 'You left the chat.')
    socket.to(roomName).emit('system-message', 'A stranger has disconnected.')

    const socketsInRoom = io.sockets.adapter.rooms.get(roomName)

    if (socketsInRoom) {
      for (const socketId of socketsInRoom) {
        const roomSocket = io.sockets.sockets.get(socketId)
        if (roomSocket) {
          roomSocket.leave(roomName)
        }
        userRoomMap.delete(socketId)
      }
    }
  }
})

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})