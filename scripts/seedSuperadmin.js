require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require(path.join(__dirname, '../models/User'));
    const existing = await User.findOne({ email: 'superadmin@globalai.edu' });
    if (existing) {
      console.log('Superadmin already exists');
      process.exit(0);
      return;
    }
    await User.create({
      name: 'Super Admin',
      email: 'superadmin@globalai.edu',
      password: 'super123',
      role: 'superadmin',
      status: 'active',
    });
    console.log('Superadmin created: superadmin@globalai.edu / super123');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
