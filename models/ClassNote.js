const mongoose = require('mongoose');

const classNoteSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: String, required: true },
    title: { type: String, required: true },
    file: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClassNote', classNoteSchema);
