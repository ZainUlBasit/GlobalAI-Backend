const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    action: { type: String, required: true, trim: true },
    summary: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
