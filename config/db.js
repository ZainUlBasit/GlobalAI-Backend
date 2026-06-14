require('dotenv').config();
const mongoose = require('mongoose');

let connectionPromise = null;

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (connectionPromise) {
    return connectionPromise;
  }
  try {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI);
    await connectionPromise;
    console.log('MongoDB connected');

    const User = require('../models/User');
    const Attendance = require('../models/Attendance');
    const [userMigration, attendanceMigration] = await Promise.all([
      User.updateMany({ role: 'accountant' }, { $set: { role: 'admin' } }),
      Attendance.updateMany({ role: 'accountant' }, { $set: { role: 'admin' } }),
    ]);
    if (userMigration.modifiedCount > 0) {
      console.log(`Migrated ${userMigration.modifiedCount} accountant user(s) to admin`);
    }
    if (attendanceMigration.modifiedCount > 0) {
      console.log(`Migrated ${attendanceMigration.modifiedCount} accountant attendance record(s) to admin`);
    }

    return mongoose.connection;
  } catch (err) {
    connectionPromise = null;
    throw err;
  }
};

module.exports = connectDB;
