const mongoose = require('mongoose');

const timetableSlotSchema = new mongoose.Schema(
  {
    day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], required: true },
    timeSlot: { type: String, required: true },
    startTime: { type: String },
    endTime: { type: String },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    roomNumber: { type: String, default: '' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

timetableSlotSchema.index({ day: 1, timeSlot: 1, batchId: 1 });

module.exports = mongoose.model('TimetableSlot', timetableSlotSchema);
