const mongoose = require('mongoose');

const instituteSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Global AI Institute', trim: true },
    tagline: { type: String, default: 'Smart Institute Management System', trim: true },
    address: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    receiptFooter: { type: String, default: 'Thank you for your payment.', trim: true },
    currency: { type: String, default: 'PKR', trim: true },
    accountsVerification: {
      income: {
        verifiedUntil: { type: Date, default: null },
        verifiedAt: { type: Date, default: null },
      },
      expense: {
        verifiedUntil: { type: Date, default: null },
        verifiedAt: { type: Date, default: null },
      },
      dues: {
        verifiedUntil: { type: Date, default: null },
        verifiedAt: { type: Date, default: null },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Institute', instituteSchema);
