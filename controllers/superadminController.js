const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Transaction = require('../models/Transaction');
const Attendance = require('../models/Attendance');
const Institute = require('../models/Institute');

async function getOrCreateInstitute() {
  let doc = await Institute.findOne();
  if (!doc) {
    doc = await Institute.create({});
  }
  return doc;
}

exports.getStats = async (req, res, next) => {
  try {
    const studentCount = await User.countDocuments({ role: 'student', status: 'active' });
    const employeeCount = await User.countDocuments({ role: 'admin', status: 'active' });
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
    const balance = totalIncome - totalExpense;

    const studentsWithDue = await Student.aggregate([
      { $match: { dueAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$dueAmount' } } },
    ]);
    const pendingDues = studentsWithDue[0]?.total || 0;

    const duesByCourse = await Student.aggregate([
      { $match: { dueAmount: { $gt: 0 } } },
      {
        $group: {
          _id: '$courseId',
          totalDue: { $sum: '$dueAmount' },
          studentCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          courseId: '$_id',
          courseName: { $ifNull: ['$course.name', 'Unknown course'] },
          totalDue: 1,
          studentCount: 1,
        },
      },
      { $sort: { totalDue: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalStudents: studentCount,
        totalEmployees: employeeCount,
        totalTeachers: teacherCount,
        totalIncome,
        totalExpense,
        balance,
        pendingDues,
        duesByCourse,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAccountsVerification = async (req, res, next) => {
  try {
    const doc = await getOrCreateInstitute();
    res.json({ success: true, data: doc.accountsVerification || {} });
  } catch (err) {
    next(err);
  }
};

exports.setAccountsVerification = async (req, res, next) => {
  try {
    const { type, verifiedUntil } = req.body;
    const allowed = ['income', 'expense', 'dues'];
    if (!allowed.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid verification type' });
    }
    if (!verifiedUntil) {
      return res.status(400).json({ success: false, message: 'verifiedUntil date is required' });
    }
    const until = new Date(verifiedUntil);
    if (Number.isNaN(until.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }
    until.setHours(23, 59, 59, 999);

    const doc = await getOrCreateInstitute();
    if (!doc.accountsVerification) {
      doc.accountsVerification = { income: {}, expense: {}, dues: {} };
    }
    doc.accountsVerification[type] = {
      verifiedUntil: until,
      verifiedAt: new Date(),
    };
    doc.markModified('accountsVerification');
    await doc.save();

    res.json({ success: true, data: doc.accountsVerification });
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
