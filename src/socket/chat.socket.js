const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const setupChatSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      socket.userId = decoded.id;
      socket.userName = decoded.name;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userName})`);

    // ============================================
    // JOIN CHAT ROOM
    // ============================================
    socket.on('join-room', async (roomId) => {
      try {
        // Verify user is participant
        const participant = await prisma.chatParticipant.findFirst({
          where: {
            chatRoomId: roomId,
            userId: socket.userId
          }
        });

        if (!participant) {
          socket.emit('error', { message: 'Not authorized to join this room' });
          return;
        }

        // Join the Socket.io room
        socket.join(roomId);
        socket.currentRoom = roomId;

        // Update last seen
        await prisma.chatParticipant.update({
          where: { id: participant.id },
          data: { lastReadAt: new Date() }
        });

        // Notify others
        socket.to(roomId).emit('user-joined', {
          userId: socket.userId,
          userName: socket.userName,
          timestamp: new Date()
        });

        console.log(`User ${socket.userName} joined room ${roomId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ============================================
    // SEND MESSAGE
    // ============================================
    socket.on('send-message', async (data) => {
      const { roomId, message } = data;

      try {
        // Save message to database
        const newMessage = await prisma.chatMessage.create({
          data: {
            chatRoomId: roomId,
            senderId: socket.userId,
            message: message
          },
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
                email: true
              }
            }
          }
        });

        // Broadcast to all users in room (including sender)
        io.to(roomId).emit('new-message', {
          id: newMessage.id,
          message: newMessage.message,
          senderId: newMessage.senderId,
          senderName: newMessage.sender.displayName,
          timestamp: newMessage.createdAt,
          roomId: roomId
        });

        console.log(`Message sent in room ${roomId} by ${socket.userName}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ============================================
    // TYPING INDICATOR
    // ============================================
    socket.on('typing-start', (roomId) => {
      socket.to(roomId).emit('user-typing', {
        userId: socket.userId,
        userName: socket.userName,
        isTyping: true
      });
    });

    socket.on('typing-stop', (roomId) => {
      socket.to(roomId).emit('user-typing', {
        userId: socket.userId,
        userName: socket.userName,
        isTyping: false
      });
    });

    // ============================================
    // LEAVE ROOM
    // ============================================
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', {
        userId: socket.userId,
        userName: socket.userName,
        timestamp: new Date()
      });
      console.log(`User ${socket.userName} left room ${roomId}`);
    });

    // ============================================
    // DIRECT MESSAGE (1-on-1)
    // ============================================
    socket.on('send-dm', async (data) => {
      const { receiverId, message } = data;

      try {
        // Save to database
        const dm = await prisma.message.create({
          data: {
            senderId: socket.userId,
            receiverId: receiverId,
            body: message,
            subject: 'Direct Message'
          },
          include: {
            sender: {
              select: { id: true, displayName: true }
            }
          }
        });

        // Create unique room ID for 1-on-1 chat
        const roomId = [socket.userId, receiverId].sort().join('-');

        // Send to receiver (if they're online)
        io.to(roomId).emit('new-dm', {
          id: dm.id,
          message: dm.body,
          senderId: socket.userId,
          senderName: dm.sender.displayName,
          timestamp: dm.createdAt
        });

        // Confirm to sender
        socket.emit('dm-sent', {
          id: dm.id,
          receiverId: receiverId
        });
      } catch (error) {
        console.error('Error sending DM:', error);
        socket.emit('error', { message: 'Failed to send direct message' });
      }
    });

    // ============================================
    // ONLINE STATUS
    // ============================================
    socket.on('get-online-users', async (roomId) => {
      const socketsInRoom = await io.in(roomId).fetchSockets();
      const onlineUsers = socketsInRoom.map(s => ({
        userId: s.userId,
        userName: s.userName
      }));
      
      socket.emit('online-users', onlineUsers);
    });

    // ============================================
    // DISCONNECT
    // ============================================
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId} (${socket.userName})`);
      
      // Notify all rooms user was in
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('user-left', {
          userId: socket.userId,
          userName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    // ============================================
    // ERROR HANDLING
    // ============================================
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

module.exports = setupChatSocket;