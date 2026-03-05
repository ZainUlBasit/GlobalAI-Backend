const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['income', 'expense', 'salary', 'fee'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: '' },
    referenceId: { type: mongoose.Schema.Types.ObjectId, refPath: 'refModel' },
    refModel: { type: String, enum: ['User', 'Student', 'FeePayment', null] },
    date: { type: Date, default: Date.now },
    billImage: { type: String, default: '' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

transactionSchema.index({ type: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
