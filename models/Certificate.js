const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    fatherName: { type: String, default: '' },
    courseName: { type: String, default: '' },
    batch: { type: String, default: '' },
    certificateNo: { type: String, required: true, unique: true },
    issueDate: { type: Date, default: Date.now },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

certificateSchema.index({ issueDate: -1 });
certificateSchema.index({ studentId: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);
