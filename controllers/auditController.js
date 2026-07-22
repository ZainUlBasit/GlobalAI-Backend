const AuditLog = require('../models/AuditLog');
const { writeAuditLog } = require('../utils/auditLog');

exports.list = async (req, res, next) => {
  try {
    const { entityType, entityId, limit = 50 } = req.query;
    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    const logs = await AuditLog.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200))
      .lean();
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

exports.getStudentLogs = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const logs = await AuditLog.find({
      $or: [
        { entityType: 'Student', entityId: userId },
        { 'metadata.userId': userId },
        { 'metadata.studentUserId': userId },
      ],
    })
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

module.exports.writeAuditLog = writeAuditLog;
