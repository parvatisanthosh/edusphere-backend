
//// second
// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Internship Platform API',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      students: '/api/students',
      internships: '/api/internships',
      applications: '/api/applications'
    }
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const internshipRoutes = require('./routes/internships');
const applicationRoutes = require('./routes/applications');



// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/applications', applicationRoutes);


// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Endpoints:`); 
  console.log(`   - POST /api/auth/register`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - GET  /api/students`);
  console.log(`   - POST /api/students`);
  console.log(`   - GET  /api/internships`);
  console.log(`   - POST /api/internships`);
  console.log(`   - GET  /api/applications`);
  console.log(`   - POST /api/applications`);

});