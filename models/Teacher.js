const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    salary: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Teacher', teacherSchema);
