const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['student', 'teacher', 'admin', 'accountant'], required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    checkInImage: { type: String, default: '' },
    checkOutImage: { type: String, default: '' },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
