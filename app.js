require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const errorHandler = require('./utils/errorHandler');

const app = express();

const allowedOrigin = process.env.CLIENT_URL || process.env.CORS_ORIGIN || true;
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.UPLOAD_PATH) {
  app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_PATH)));
} else {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

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

module.exports = app;
