const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    description: { type: String, default: '' },
    referenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeType: { type: String, required: true }, // admin | accountant | teacher
    employeeName: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

salarySchema.index({ date: -1 });
salarySchema.index({ referenceId: 1, date: -1 });

module.exports = mongoose.model('Salary', salarySchema);
