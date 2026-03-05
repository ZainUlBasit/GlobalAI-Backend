const mongoose = require('mongoose');

const classAttendanceSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: String, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['present', 'absent'], default: 'absent' },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

classAttendanceSchema.index({ teacherId: 1, classId: 1, studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ClassAttendance', classAttendanceSchema);
