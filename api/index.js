require('dotenv').config();
const app = require('../app');
const connectDB = require('../config/db');

let initialized = false;

module.exports = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
      return res.status(500).json({ success: false, message: 'JWT_SECRET is missing on server' });
    }

    if (!initialized) {
      await connectDB();
      initialized = true;
    }

    return app(req, res);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server initialization failed',
    });
  }
};
