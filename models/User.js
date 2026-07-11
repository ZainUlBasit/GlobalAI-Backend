const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'teacher', 'student'],
      required: true,
      // superadmin: only via seed; admin/teacher/student: added by superadmin
    },
    contact: { type: String, default: '' },
    address: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
