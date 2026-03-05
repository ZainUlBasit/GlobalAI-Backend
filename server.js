require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./utils/errorHandler');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  console.error('ERROR: JWT_SECRET is required. Add it to server/.env (copy server/.env.example to server/.env)');
  process.exit(1);
}

connectDB();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.UPLOAD_PATH) {
  app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_PATH)));
} else {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/superadmin', require('./routes/superadminRoutes'));
app.use('/api/v1/students', require('./routes/studentRoutes'));
app.use('/api/v1/employees', require('./routes/employeeRoutes'));
app.use('/api/v1/teachers', require('./routes/teacherRoutes'));
app.use('/api/v1/courses', require('./routes/courseRoutes'));
app.use('/api/v1/attendance', require('./routes/attendanceRoutes'));
app.use('/api/v1/accounts', require('./routes/accountsRoutes'));
app.use('/api/v1/notifications', require('./routes/notificationRoutes'));
app.use('/api/v1/classes', require('./routes/classRoutes'));
app.use('/api/v1/batches', require('./routes/batchRoutes'));
app.use('/api/v1/timetable', require('./routes/timetableRoutes'));
app.use('/api/v1/subjects', require('./routes/subjectRoutes'));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

function tryListen(port) {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      server.close();
      const nextPort = port + 1;
      console.warn(`Port ${port} in use, trying ${nextPort}...`);
      tryListen(nextPort);
    } else {
      throw err;
    }
  });
}
tryListen(PORT);
