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
    return mongoose.connection;
  } catch (err) {
    connectionPromise = null;
    throw err;
  }
};

module.exports = connectDB;
