const Transaction = require('../models/Transaction');
const Salary = require('../models/Salary');
const User = require('../models/User');
const Student = require('../models/Student');
const FeePayment = require('../models/FeePayment');

exports.getIncome = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { type: { $in: ['income', 'fee'] } };
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const list = await Transaction.find(filter).populate('addedBy', 'name').sort({ date: -1 }).limit(500).lean();
    const total = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]);
    res.json({ success: true, data: list, total: total[0]?.sum || 0 });
  } catch (err) {
    next(err);
  }
};

exports.getExpenses = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { type: 'expense' };
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const list = await Transaction.find(filter).populate('addedBy', 'name').sort({ date: -1 }).limit(500).lean();
    const total = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]);
    res.json({ success: true, data: list, total: total[0]?.sum || 0 });
  } catch (err) {
    next(err);
  }
};

exports.addIncome = async (req, res, next) => {
  try {
    const { amount, description } = req.body;
    const tx = await Transaction.create({
      type: 'income',
      amount,
      description: description || '',
      addedBy: req.user.id,
    });
    res.status(201).json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
};

exports.addExpense = async (req, res, next) => {
  try {
    const { amount, description } = req.body;
    const billImage = req.file?.path?.replace(/\\/g, '/') || '';
    const tx = await Transaction.create({
      type: 'expense',
      amount,
      description: description || '',
      billImage,
      addedBy: req.user.id,
    });
    res.status(201).json({ success: true, data: tx });
  } catch (err) {
    next(err);
  }
};

exports.recordSalary = async (req, res, next) => {
  try {
    const { amount, description, referenceId } = req.body;
    if (!referenceId) {
      return res.status(400).json({ success: false, message: 'Employee is required.' });
    }
    const user = await User.findById(referenceId).select('name role').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    const employeeType = user.role;
    const employeeName = user.name || 'Unknown';
    const salaryDoc = await Salary.create({
      amount,
      description: description || 'Salary payment',
      referenceId,
      employeeType,
      employeeName,
      addedBy: req.user.id,
    });
    await Transaction.create({
      type: 'salary',
      amount,
      description: description || `Salary - ${employeeName} (${employeeType})`,
      referenceId,
      refModel: 'User',
      addedBy: req.user.id,
    });
    res.status(201).json({ success: true, data: salaryDoc });
  } catch (err) {
    next(err);
  }
};

exports.getSalaries = async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    const filter = {};
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const list = await Salary.find(filter)
      .populate('addedBy', 'name')
      .sort({ date: -1 })
      .limit(Number(limit) || 100)
      .lean();
    const total = await Salary.aggregate([
      { $match: filter },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]);
    res.json({ success: true, data: list, total: total[0]?.sum || 0 });
  } catch (err) {
    next(err);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const data = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const list = await Transaction.find(filter).populate('addedBy', 'name').sort({ date: -1 }).limit(200).lean();
    res.json({ success: true, data: { summary: data, list } });
  } catch (err) {
    next(err);
  }
};

exports.getStudentFee = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.params.studentId }).populate('courseId');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const payments = await FeePayment.find({ studentId: student._id }).sort({ date: -1 }).lean();
    const courseFee = student.courseId?.fee ?? 0;
    const firstYearFee = Number(student.firstYearFee ?? courseFee ?? 0);
    const currentFee = Number(student.currentTermFee ?? firstYearFee ?? courseFee ?? 0);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    res.json({
      success: true,
      data: {
        student,
        payments,
        dueAmount: student.dueAmount,
        courseFee,
        firstYearFee,
        currentFee,
        totalPaid,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.addFeePayment = async (req, res, next) => {
  try {
    const { studentId, amount } = req.body;
    const student = await Student.findOne({ userId: studentId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const receiptNo = 'RCP-' + Date.now();
    const payment = await FeePayment.create({
      studentId: student._id,
      amount,
      receiptNo,
      paidBy: req.user.id,
    });
    student.dueAmount = Math.max(0, (student.dueAmount || 0) - amount);
    await student.save();
    await Transaction.create({
      type: 'fee',
      amount,
      description: `Fee payment - ${receiptNo}`,
      referenceId: payment._id,
      refModel: 'FeePayment',
      addedBy: req.user.id,
    });
    const populated = await FeePayment.findById(payment._id).populate('studentId').populate('paidBy', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.updateDue = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.params.studentId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    student.dueAmount = req.body.dueAmount ?? student.dueAmount;
    await student.save();
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
};

exports.getTodaySummary = async (req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const income = await Transaction.aggregate([
      { $match: { type: { $in: ['income', 'fee'] }, date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const expense = await Transaction.aggregate([
      { $match: { type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const salary = await Transaction.aggregate([
      { $match: { type: 'salary', date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    const monthIncome = await Transaction.aggregate([
      { $match: { type: { $in: ['income', 'fee'] }, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthExpense = await Transaction.aggregate([
      { $match: { type: 'expense', date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const monthSalary = await Transaction.aggregate([
      { $match: { type: 'salary', date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    res.json({
      success: true,
      data: {
        todayIncome: income[0]?.total || 0,
        todayExpense: expense[0]?.total || 0,
        todaySalary: salary[0]?.total || 0,
        monthlyProfit: (monthIncome[0]?.total || 0) - (monthExpense[0]?.total || 0) - (monthSalary[0]?.total || 0),
      },
    });
  } catch (err) {
    next(err);
  }
};
