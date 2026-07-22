const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    amount: { type: Number, required: true },
    paymentCategory: {
      type: String,
      enum: ['tuition', 'exam', 'adjustment'],
      default: 'tuition',
    },
    receiptNo: { type: String, unique: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

feePaymentSchema.index({ studentId: 1, paymentCategory: 1, date: -1 });

module.exports = mongoose.model('FeePayment', feePaymentSchema);
