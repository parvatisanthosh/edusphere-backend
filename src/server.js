require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const setupChatSocket = require('./socket/chat.socket');

// Import routers
const authRouter = require('./routes/auth.routes');
const studentsRouter = require('./routes/students.routes');
const instituteRouter = require('./routes/institute.routes');
const facultyRouter = require('./routes/faculty.routes');
const userRoutes = require('./routes/users.routes');
const internshipRoutes = require('./routes/internships.routes');
const applicationRoutes = require('./routes/applications.routes');
const roadmapsRouter = require('./routes/roadmaps.routes');
const internshipMgmtRouter = require('./routes/internship-management.routes');
const mentorRouter = require('./routes/mentor.routes');
const chatRouter = require('./routes/chat.routes');

const app = express();

// ============================================
// CREATE HTTP SERVER & SOCKET.IO
// ============================================
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for now
    methods: ["GET", "POST"]
  }
});

// Setup WebSocket chat
setupChatSocket(io);

// Make io accessible in routes
app.set('io', io);

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
// ❌ REMOVED: app.use(authenticationMiddleware); 
// This was causing the error - routes handle auth individually

// ============================================
// ROUTES
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    message: 'Internship Platform API with WebSocket',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/auth',
      students: '/students',
      internships: '/internships',
      applications: '/applications',
      roadmaps: '/roadmaps',
      internshipManagement: '/internship-management',
      mentor: '/mentor',
      chat: '/chat'
    },
    websocket: `ws://localhost:${process.env.PORT || 8000}`
  });
});

app.use('/auth', authRouter);
app.use('/students', studentsRouter);
app.use('/institutes', instituteRouter);
app.use('/faculty', facultyRouter);
app.use('/internships', internshipRoutes);
app.use('/users', userRoutes);
app.use('/applications', applicationRoutes);
app.use('/roadmaps', roadmapsRouter);
app.use('/internship-management', internshipMgmtRouter);
app.use('/mentor', mentorRouter);
app.use('/chat', chatRouter);

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ WebSocket server ready`);
  console.log(`📡 REST API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});