const User = require('../models/User');
const Student = require('../models/Student');
const Course = require('../models/Course');
const bcrypt = require('bcryptjs');

const parseDurationYears = (duration) => {
  if (!duration || typeof duration !== 'string') return 1;
  const yearsMatch = duration.toLowerCase().match(/(\d+)\s*year/);
  if (yearsMatch) return Math.max(parseInt(yearsMatch[1], 10) || 1, 1);
  const numberMatch = duration.match(/(\d+)/);
  if (numberMatch) return Math.max(parseInt(numberMatch[1], 10) || 1, 1);
  return 1;
};

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;
    const filter = {
      role: 'student',
      $or: [{ status: 'active' }, { status: { $exists: false } }, { status: null }],
    };
    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
        ],
      });
    }
    const [students, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    const studentIds = students.map((s) => s._id);
    const studentProfiles = await Student.find({ userId: { $in: studentIds } })
      .populate('courseId')
      .lean();
    const map = {};
    studentProfiles.forEach((p) => { map[p.userId.toString()] = p; });
    const list = students.map((u) => ({
      ...u.toObject(),
      studentProfile: map[u._id.toString()] || null,
    }));
    res.json({ success: true, data: list, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, email, password, courseId, batch, section, shift, studyYear } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    const course = await Course.findById(courseId);
    const courseFee = course ? (course.fee ?? 0) : 0;
    const user = await User.create({
      name,
      email,
      password: password || 'student123',
      role: 'student',
      status: 'active',
    });
    await Student.create({
      userId: user._id,
      courseId,
      studyYear: Number(studyYear) > 0 ? Number(studyYear) : 1,
      batch,
      section: section || '',
      shift: shift || 'morning',
      dueAmount: courseFee,
    });
    const created = await User.findById(user._id).select('-password');
    const student = await Student.findOne({ userId: user._id }).populate('courseId');
    res.status(201).json({ success: true, data: { user: created, student } });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, contact, address, courseId, batch, section, shift, dueAmount, studyYear } = req.body;
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (name) user.name = name;
    if (contact !== undefined) user.contact = contact;
    if (address !== undefined) user.address = address;
    await user.save();

    const student = await Student.findOne({ userId });
    if (student) {
      if (courseId) student.courseId = courseId;
      if (batch) student.batch = batch;
      if (section !== undefined) student.section = section;
      if (shift) student.shift = shift;
      if (dueAmount !== undefined) student.dueAmount = dueAmount;
      if (studyYear !== undefined && Number(studyYear) > 0) student.studyYear = Number(studyYear);
      await student.save();
    }
    const updated = await User.findById(userId).select('-password');
    const updatedStudent = await Student.findOne({ userId }).populate('courseId');
    res.json({ success: true, data: { user: updated, student: updatedStudent } });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    user.status = 'inactive';
    await user.save();
    await Student.deleteOne({ userId: user._id });
    res.json({ success: true, message: 'Student removed' });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || user.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const student = await Student.findOne({ userId: user._id }).populate('courseId');
    res.json({ success: true, data: { user, student } });
  } catch (err) {
    next(err);
  }
};

exports.promote = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const student = await Student.findOne({ userId }).populate('courseId');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const totalYears = parseDurationYears(student.courseId?.duration);
    const currentYear = Number(student.studyYear || 1);
    if (currentYear >= totalYears) {
      return res.status(400).json({
        success: false,
        message: `Student is already in final year (${totalYears})`,
      });
    }

    student.studyYear = currentYear + 1;
    if (req.body && typeof req.body.batch === 'string' && req.body.batch.trim()) {
      student.batch = req.body.batch.trim();
    }
    await student.save();

    const updated = await Student.findById(student._id).populate('courseId');
    res.json({
      success: true,
      message: `Promoted to year ${updated.studyYear}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};
