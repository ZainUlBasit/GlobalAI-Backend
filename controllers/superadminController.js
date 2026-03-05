const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Transaction = require('../models/Transaction');
const Attendance = require('../models/Attendance');

exports.getStats = async (req, res, next) => {
  try {
    const studentCount = await User.countDocuments({ role: 'student', status: 'active' });
    const employeeCount = await User.countDocuments({ role: { $in: ['admin', 'accountant'] }, status: 'active' });
    const teacherCount = await User.countDocuments({ role: 'teacher', status: 'active' });

    const incomeAgg = await Transaction.aggregate([
      { $match: { type: { $in: ['income', 'fee'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const expenseAgg = await Transaction.aggregate([
      { $match: { type: { $in: ['expense', 'salary'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalIncome = incomeAgg[0]?.total || 0;
    const totalExpense = expenseAgg[0]?.total || 0;

    const studentsWithDue = await Student.aggregate([
      { $match: { dueAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$dueAmount' } } },
    ]);
    const pendingDues = studentsWithDue[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalStudents: studentCount,
        totalEmployees: employeeCount,
        totalTeachers: teacherCount,
        totalIncome,
        totalExpense,
        pendingDues,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getDuesList = async (req, res, next) => {
  try {
    const students = await Student.find({
      $expr: { $gt: [ { $ifNull: [ { $toDouble: '$dueAmount' }, 0 ] }, 0 ] },
    })
      .populate('userId', 'name email')
      .populate('courseId', 'name')
      .sort({ dueAmount: -1 })
      .lean();
    const totalPending = students.reduce((sum, s) => sum + (Number(s.dueAmount) || 0), 0);
    const list = students.map((s) => ({
      _id: s._id,
      userId: s.userId?._id,
      name: s.userId?.name ?? '—',
      email: s.userId?.email ?? '—',
      courseName: s.courseId?.name ?? '—',
      dueAmount: Number(s.dueAmount) || 0,
    }));
    res.json({ success: true, data: list, totalPending });
  } catch (err) {
    next(err);
  }
};
