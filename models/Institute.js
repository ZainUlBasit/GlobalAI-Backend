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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Institute', instituteSchema);
