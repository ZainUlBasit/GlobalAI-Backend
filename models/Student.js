const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    studyYear: { type: Number, default: 1, min: 1 },
    batch: { type: String, required: true },
    section: { type: String, default: '' },
    shift: { type: String, enum: ['morning', 'evening'], default: 'morning' },
    dueAmount: { type: Number, default: 0 },
    enrollmentDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

studentSchema.index({ userId: 1 });
studentSchema.index({ courseId: 1, batch: 1, section: 1 });

module.exports = mongoose.model('Student', studentSchema);
