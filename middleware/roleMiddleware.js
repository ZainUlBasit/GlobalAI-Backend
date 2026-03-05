const protect = require('./auth');

const ROLES = ['superadmin', 'admin', 'accountant', 'teacher', 'student'];

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
};

const isSuperAdmin = authorize('superadmin');
const isAdmin = authorize('superadmin', 'admin');
const isAccountant = authorize('superadmin', 'admin', 'accountant');
const isTeacher = authorize('superadmin', 'admin', 'teacher');
const isStudent = authorize('student');

module.exports = {
  protect,
  authorize,
  isSuperAdmin,
  isAdmin,
  isAccountant,
  isTeacher,
  isStudent,
  ROLES,
};
