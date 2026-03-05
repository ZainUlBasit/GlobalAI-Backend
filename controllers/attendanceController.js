const Attendance = require('../models/Attendance');
const ClassAttendance = require('../models/ClassAttendance');

exports.list = async (req, res, next) => {
  try {
    const { role, date, startDate, endDate } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (date) filter.date = new Date(date);
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const list = await Attendance.find(filter)
      .populate('userId', 'name email')
      .sort({ date: -1, checkIn: -1 })
      .limit(500)
      .lean();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

exports.checkIn = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const roleMap = { superadmin: 'admin', admin: 'admin', accountant: 'accountant', teacher: 'teacher', student: 'student' };
    const role = roleMap[req.user.role] || 'admin';
    let record = await Attendance.findOne({ userId: req.user.id, date: today });
    if (record) {
      return res.status(400).json({ success: false, message: 'Already checked in today' });
    }
    record = await Attendance.create({
      userId: req.user.id,
      role,
      checkIn: new Date(),
      checkInImage: req.file?.path?.replace(/\\/g, '/') || '',
      date: today,
    });
    const populated = await Attendance.findById(record._id).populate('userId', 'name email');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.checkOut = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await Attendance.findOne({ userId: req.user.id, date: today });
    if (!record) {
      return res.status(400).json({ success: false, message: 'No check-in found for today' });
    }
    if (record.checkOut) {
      return res.status(400).json({ success: false, message: 'Already checked out' });
    }
    record.checkOut = new Date();
    record.checkOutImage = req.file?.path?.replace(/\\/g, '/') || record.checkOutImage || '';
    await record.save();
    const populated = await Attendance.findById(record._id).populate('userId', 'name email');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.getClassAttendance = async (req, res, next) => {
  try {
    const { classId, date } = req.query;
    const filter = { teacherId: req.user.id };
    if (classId) filter.classId = classId;
    if (date) filter.date = new Date(date);
    const list = await ClassAttendance.find(filter)
      .populate('studentId', 'name email')
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

exports.markClassAttendance = async (req, res, next) => {
  try {
    const { classId, studentId, status, date } = req.body;
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    let record = await ClassAttendance.findOne({
      teacherId: req.user.id,
      classId,
      studentId,
      date: d,
    });
    if (record) {
      record.status = status;
      await record.save();
    } else {
      record = await ClassAttendance.create({
        teacherId: req.user.id,
        classId,
        studentId,
        status: status || 'present',
        date: d,
      });
    }
    const populated = await ClassAttendance.findById(record._id).populate('studentId', 'name email');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.bulkMarkClassAttendance = async (req, res, next) => {
  try {
    const { classId, entries, date } = req.body;
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const results = [];
    for (const { studentId, status } of entries) {
      let record = await ClassAttendance.findOne({
        teacherId: req.user.id,
        classId,
        studentId,
        date: d,
      });
      if (record) {
        record.status = status;
        await record.save();
      } else {
        record = await ClassAttendance.create({
          teacherId: req.user.id,
          classId,
          studentId,
          status: status || 'present',
          date: d,
        });
      }
      results.push(record);
    }
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};

exports.getMyAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { userId: req.user.id };
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const list = await Attendance.find(filter).sort({ date: -1 }).limit(100).lean();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};
