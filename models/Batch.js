const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    batchName: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    shift: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    assignedTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
  },
  { timestamps: true }
);

batchSchema.index({ courseId: 1, batchName: 1 });

module.exports = mongoose.model('Batch', batchSchema);
