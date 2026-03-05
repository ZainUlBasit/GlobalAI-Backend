const User = require('../models/User');
const Student = require('../models/Student');
const Course = require('../models/Course');
const bcrypt = require('bcryptjs');

const parseDurationYears = (duration) => {
  if (!duration || typeof duration !== 'string') return 1;
  const text = duration.toLowerCase();
  const yearsMatch = text.match(/(\d+)\s*year/);
  if (yearsMatch) return Math.max(parseInt(yearsMatch[1], 10) || 1, 1);

  const semestersMatch = text.match(/(\d+)\s*semester/);
  if (semestersMatch) {
    const semesters = Math.max(parseInt(semestersMatch[1], 10) || 1, 1);
    return Math.max(Math.ceil(semesters / 2), 1);
  }

  const monthsMatch = text.match(/(\d+)\s*month/);
  if (monthsMatch) {
    const months = Math.max(parseInt(monthsMatch[1], 10) || 1, 1);
    return Math.max(Math.ceil(months / 12), 1);
  }

  const numberMatch = text.match(/(\d+)/);
  if (numberMatch) return Math.max(parseInt(numberMatch[1], 10) || 1, 1);
  return 1;
};

const parseDurationMonths = (duration) => {
  if (!duration || typeof duration !== 'string') return 12;
  const text = duration.toLowerCase();
  const yearsMatch = text.match(/(\d+)\s*year/);
  if (yearsMatch) return Math.max((parseInt(yearsMatch[1], 10) || 1) * 12, 1);
  const semestersMatch = text.match(/(\d+)\s*semester/);
  if (semestersMatch) {
    const semesters = Math.max(parseInt(semestersMatch[1], 10) || 1, 1);
    const monthsEach = Math.max(parseInt((text.match(/(\d+)\s*month[s]?\s*each/) || [])[1] || '6', 10) || 6, 1);
    return semesters * monthsEach;
  }
  const monthsMatch = text.match(/(\d+)\s*month/);
  if (monthsMatch) return Math.max(parseInt(monthsMatch[1], 10) || 1, 1);
  return 12;
};

const getDefaultCycleFee = (course) => {
  const totalFee = Number(course?.fee || 0);
  const basis = course?.feeCollectionBasis || 'semester';
  const durationMonths = parseDurationMonths(course?.duration);
  const cycles = basis === 'monthly' ? durationMonths : Math.max(Math.ceil(durationMonths / 6), 1);
  return cycles > 0 ? Number((totalFee / cycles).toFixed(2)) : totalFee;
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
    const defaultCycleFee = getDefaultCycleFee(course);
    const user = await User.create({
      name,
      email,
      password: password || 'student123',
      role: 'student',
      status: 'active',
    });
    const totalYears = parseDurationYears(course?.duration);
    const initialStudyYear = Math.min(
      Math.max(Number(studyYear) > 0 ? Number(studyYear) : 1, 1),
      totalYears
    );
    await Student.create({
      userId: user._id,
      courseId,
      studyYear: initialStudyYear,
      firstYearFee: defaultCycleFee,
      currentTermFee: defaultCycleFee,
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
      if (courseId) {
        const courseChanged = String(student.courseId) !== String(courseId);
        student.courseId = courseId;
        if (courseChanged && studyYear === undefined) {
          // When course changes, restart progression unless explicitly provided.
          student.studyYear = 1;
          const newCourse = await Course.findById(courseId).select('fee duration feeCollectionBasis').lean();
          const baseCycleFee = getDefaultCycleFee(newCourse);
          student.firstYearFee = baseCycleFee;
          student.currentTermFee = baseCycleFee;
        }
      }
      if (batch) student.batch = batch;
      if (section !== undefined) student.section = section;
      if (shift) student.shift = shift;
      if (dueAmount !== undefined) student.dueAmount = dueAmount;
      if (studyYear !== undefined && Number(studyYear) > 0) student.studyYear = Number(studyYear);
      const courseRef = await Course.findById(student.courseId).select('duration').lean();
      const totalYears = parseDurationYears(courseRef?.duration);
      student.studyYear = Math.min(Math.max(Number(student.studyYear || 1), 1), totalYears);
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
    if (req.body && req.body.nextTermFee !== undefined) {
      const nextTermFee = Number(req.body.nextTermFee);
      if (!Number.isFinite(nextTermFee) || nextTermFee < 0) {
        return res.status(400).json({
          success: false,
          message: 'nextTermFee must be a valid non-negative number',
        });
      }
      student.currentTermFee = nextTermFee;
      student.dueAmount = Number(student.dueAmount || 0) + nextTermFee;
    }
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
