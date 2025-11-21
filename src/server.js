require('dotenv').config();
const express = require('express');
const { authenticationMiddleware } = require('./middleware/auth');

// const userRouter = require('./routes/user');
// const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth.routes');
const studentsRouter = require('./routes/students.routes');
const instituteRouter = require('./routes/institute.routes');
const facultyRouter = require('./routes/faculty.routes');

const app = express();

const PORT = process.env.PORT || 8000;
app.use(express.json());

// app.use(authenticationMiddleware);

  




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


const userRoutes = require('./routes/users');

const internshipRoutes = require('./routes/internships');
const applicationRoutes = require('./routes/applications');
//to avoid merge conflicts i have imported ur stuff...

//worked on these routes properly working 
app.use('/auth', authRouter  );
app.use('/students', studentsRouter );
app.use('/institutes', instituteRouter);
app.use('/faculty', facultyRouter);

//your routes i havent worked on this
app.use('/internships', internshipRoutes);
app.use('/users', userRoutes);
app.use('/applications', applicationRoutes);


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
