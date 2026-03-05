const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    code: { type: String, default: '' },
  },
  { timestamps: true }
);

subjectSchema.index({ courseId: 1, name: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
