const AuditLog = require('../models/AuditLog');

async function writeAuditLog({ entityType, entityId, action, summary, metadata, createdBy }) {
  try {
    await AuditLog.create({
      entityType,
      entityId,
      action,
      summary: summary || '',
      metadata: metadata || {},
      createdBy: createdBy || null,
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { writeAuditLog };
