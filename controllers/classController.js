const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const ClassNote = require('../models/ClassNote');
const Mark = require('../models/Mark');
const Student = require('../models/Student');
const User = require('../models/User');

exports.listAssignments = async (req, res, next) => {
  try {
    const filter = req.user.role === 'teacher' ? { teacherId: req.user.id } : {};
    const list = await Assignment.find(filter).populate('teacherId', 'name').sort({ dueDate: -1 }).lean();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

exports.createAssignment = async (req, res, next) => {
  try {
    const { classId, title, dueDate } = req.body;
    const file = req.file?.path?.replace(/\\/g, '/') || '';
    const assignment = await Assignment.create({
      teacherId: req.user.id,
      classId,
      title,
      file,
      dueDate,
    });
    const populated = await Assignment.findById(assignment._id).populate('teacherId', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.getStudentsByClass = async (req, res, next) => {
  try {
    const { classId, courseId, batch, section } = req.query;
    const filter = {};
    if (classId) {
      const parts = classId.split('-');
      if (parts[0]) filter.courseId = parts[0];
      if (parts[1]) filter.batch = parts[1];
      if (parts[2]) filter.section = parts[2];
    } else {
      if (courseId) filter.courseId = courseId;
      if (batch) filter.batch = batch;
      if (section) filter.section = section;
    }
    const students = await Student.find(filter).populate('userId', 'name email contact').populate('courseId', 'name').lean();
    res.json({ success: true, data: students });
  } catch (err) {
    next(err);
  }
};

exports.uploadClassNote = async (req, res, next) => {
  try {
    const { classId, title } = req.body;
    const file = req.file?.path?.replace(/\\/g, '/') || '';
    const note = await ClassNote.create({
      teacherId: req.user.id,
      classId,
      title,
      file,
    });
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
};

exports.getClassNotes = async (req, res, next) => {
  try {
    const { classId } = req.query;
    const filter = req.user.role === 'teacher' ? { teacherId: req.user.id } : {};
    if (classId) filter.classId = classId;
    const list = await ClassNote.find(filter).populate('teacherId', 'name').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

exports.addMarks = async (req, res, next) => {
  try {
    const { studentId, courseId, subject, marks, maxMarks, term } = req.body;
    const mark = await Mark.create({
      studentId,
      teacherId: req.user.id,
      courseId,
      subject,
      marks,
      maxMarks: maxMarks || 100,
      term: term || '',
    });
    const populated = await Mark.findById(mark._id)
      .populate('studentId', 'name email')
      .populate('courseId', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.getStudentPerformance = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.query;
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (courseId) filter.courseId = courseId;
    if (req.user.role === 'teacher') filter.teacherId = req.user.id;
    const list = await Mark.find(filter)
      .populate('studentId', 'name email')
      .populate('courseId', 'name')
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

exports.getTeacherDashboard = async (req, res, next) => {
  try {
    const Teacher = require('../models/Teacher');
    const teacher = await Teacher.findOne({ userId: req.user.id }).populate('assignedCourses');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ClassAttendance = require('../models/ClassAttendance');
    const todayAttendance = await ClassAttendance.countDocuments({
      teacherId: req.user.id,
      date: today,
      status: 'present',
    });
    const assignments = await Assignment.find({ teacherId: req.user.id }).countDocuments();
    res.json({
      success: true,
      data: {
        assignedCourses: teacher?.assignedCourses || [],
        todayClasses: todayAttendance,
        assignmentsCount: assignments,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.submitAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.body;
    const file = req.file?.path?.replace(/\\/g, '/') || '';
    const existing = await AssignmentSubmission.findOne({
      assignmentId,
      studentId: req.user.id,
    });
    if (existing) {
      existing.file = file;
      await existing.save();
      return res.json({ success: true, data: existing });
    }
    const sub = await AssignmentSubmission.create({
      assignmentId,
      studentId: req.user.id,
      file,
    });
    res.status(201).json({ success: true, data: sub });
  } catch (err) {
    next(err);
  }
};

exports.getMyAssignments = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.json({ success: true, data: [] });
    const classId = `${student.courseId}-${student.batch}-${student.section}`;
    const list = await Assignment.find({ classId }).populate('teacherId', 'name').sort({ dueDate: -1 }).lean();
    const submissions = await AssignmentSubmission.find({ studentId: req.user.id }).lean();
    const subMap = {};
    submissions.forEach((s) => { subMap[s.assignmentId.toString()] = s; });
    const withSub = list.map((a) => ({ ...a, submission: subMap[a._id.toString()] || null }));
    res.json({ success: true, data: withSub });
  } catch (err) {
    next(err);
  }
};

exports.getMyCourses = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id }).populate('courseId');
    if (!student) return res.json({ success: true, data: [] });
    res.json({ success: true, data: student ? [student] : [] });
  } catch (err) {
    next(err);
  }
};

exports.getNotesForCourse = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.json({ success: true, data: [] });
    const classId = `${student.courseId}-${student.batch}-${student.section}`;
    const list = await ClassNote.find({ classId }).populate('teacherId', 'name').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

exports.getStudentDashboard = async (req, res, next) => {
  try {
    const Attendance = require('../models/Attendance');
    const student = await Student.findOne({ userId: req.user.id }).populate('courseId');
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    const attCount = await Attendance.countDocuments({
      userId: req.user.id,
      date: { $gte: start },
      checkIn: { $exists: true, $ne: null },
    });
    const totalDays = 30;
    const attendancePercent = totalDays ? Math.round((attCount / totalDays) * 100) : 0;
    const notifications = await require('../models/Notification').countDocuments({
      $or: [{ receiverId: req.user.id }, { receiverRole: 'student' }],
      read: false,
    });
    res.json({
      success: true,
      data: {
        attendancePercent,
        dueAmount: student?.dueAmount ?? 0,
        unreadNotifications: notifications,
        student,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyDues = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id }).populate('courseId');
    if (!student) return res.json({ success: true, data: { dueAmount: 0, payments: [] } });
    const payments = await require('../models/FeePayment').find({ studentId: student._id })
      .populate('paidBy', 'name')
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, data: { dueAmount: student.dueAmount, payments } });
  } catch (err) {
    next(err);
  }
};
