require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  console.error('ERROR: JWT_SECRET is required. Add it to server/.env (copy server/.env.example to server/.env)');
  process.exit(1);
}

connectDB().catch((err) => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

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
