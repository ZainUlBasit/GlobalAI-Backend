const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiverRole: { type: String },
    type: { type: String, enum: ['sms', 'whatsapp', 'inapp'], default: 'inapp' },
    read: { type: Boolean, default: false },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

notificationSchema.index({ receiverId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
