const User = require('../models/User');
const Student = require('../models/Student');
const Course = require('../models/Course');
const FeePayment = require('../models/FeePayment');
const { writeAuditLog } = require('../utils/auditLog');

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

const generateStudentCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `GAI-${year}-`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const used = await Student.countDocuments({ studentCode: { $regex: `^${prefix}` } });
    const candidate = `${prefix}${String(used + 1 + attempt).padStart(4, '0')}`;
    const exists = await Student.exists({ studentCode: candidate });
    if (!exists) return candidate;
  }
  return `${prefix}${Date.now().toString().slice(-6)}`;
};

const sumStudentPayments = async (studentId) => {
  const payments = await FeePayment.find({ studentId }).lean();
  const tuitionPaid = payments
    .filter((p) => p.paymentCategory !== 'exam')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const examPaid = payments
    .filter((p) => p.paymentCategory === 'exam')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  return { payments, tuitionPaid, examPaid, totalPaid: tuitionPaid + examPaid };
};

const buildUserFilter = (req) => {
  const accountStatus = req.query.accountStatus || 'active';
  const filter = { role: 'student' };

  if (accountStatus === 'inactive') {
    filter.status = 'inactive';
  } else if (accountStatus === 'all') {
    // no status filter
  } else {
    filter.$or = [{ status: 'active' }, { status: { $exists: false } }, { status: null }];
  }
  return filter;
};

exports.list = async (req, res, next) => {
  try {
    const exportAll = req.query.all === 'true' || req.query.exportAll === 'true';
    const page = exportAll ? 1 : (parseInt(req.query.page) || 1);
    const limit = exportAll ? 10000 : (parseInt(req.query.limit) || 10);
    const search = (req.query.search || '').trim();
    const nameQuery = (req.query.name || '').trim();
    const fatherQuery = (req.query.fatherName || '').trim();
    const courseId = req.query.courseId;
    const batch = (req.query.batch || '').trim();
    const academicStatus = req.query.academicStatus;
    const skip = (page - 1) * limit;

    let profileFilter = {};
    if (courseId) profileFilter.courseId = courseId;
    if (batch) profileFilter.batch = batch;
    if (academicStatus) profileFilter.academicStatus = academicStatus;

    let userIdsFromProfile = null;
    if (Object.keys(profileFilter).length > 0) {
      const profiles = await Student.find(profileFilter).select('userId').lean();
      userIdsFromProfile = profiles.map((p) => p.userId);
      if (userIdsFromProfile.length === 0) {
        return res.json({ success: true, data: [], total: 0, page, pages: 0 });
      }
    }

    const filter = buildUserFilter(req);
    if (userIdsFromProfile) filter._id = { $in: userIdsFromProfile };

    if (search) {
      const regex = new RegExp(search, 'i');
      const fatherMatches = await Student.find({ fatherName: regex }).select('userId').lean();
      const fatherUserIds = fatherMatches.map((s) => s.userId);
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: regex },
          { email: regex },
          ...(fatherUserIds.length ? [{ _id: { $in: fatherUserIds } }] : []),
        ],
      });
    }

    if (nameQuery) {
      const regex = new RegExp(nameQuery, 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: [{ name: regex }, { email: regex }] });
    }

    if (fatherQuery) {
      const regex = new RegExp(fatherQuery, 'i');
      const fatherMatches = await Student.find({ fatherName: regex }).select('userId').lean();
      const fatherUserIds = fatherMatches.map((s) => s.userId);
      if (fatherUserIds.length === 0) {
        return res.json({ success: true, data: [], total: 0, page, pages: 0 });
      }
      filter.$and = filter.$and || [];
      filter.$and.push({ _id: { $in: fatherUserIds } });
    }

    const [students, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    const studentIds = students.map((s) => s._id);
    const studentProfiles = await Student.find({ userId: { $in: studentIds } }).populate('courseId');
    await Promise.all(studentProfiles.map(async (profile) => {
      if (!profile.studentCode) {
        profile.studentCode = await generateStudentCode();
        await profile.save();
      }
    }));
    const map = {};
    studentProfiles.forEach((p) => { map[p.userId.toString()] = p.toObject(); });
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
    const {
      name,
      email,
      password,
      courseId,
      batch,
      section,
      shift,
      studyYear,
      fatherName,
      contact,
      discount,
      examFee,
    } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (normalizedEmail) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(400).json({ success: false, message: 'Course not found' });
    }
    const courseFee = Number(course.fee ?? 0);
    const examFeeAmount = examFee !== undefined ? Math.max(Number(examFee) || 0, 0) : Number(course.examFee || 0);
    const discountAmount = Math.max(0, Math.min(Number(discount) || 0, courseFee));
    const netFee = Math.max(0, courseFee - discountAmount);
    const defaultCycleFee = getDefaultCycleFee(course);
    const userPayload = {
      name,
      password: password || 'student123',
      role: 'student',
      contact: contact || '',
      status: 'active',
    };
    if (normalizedEmail) userPayload.email = normalizedEmail;
    const user = await User.create(userPayload);
    const totalYears = parseDurationYears(course?.duration);
    const initialStudyYear = Math.min(
      Math.max(Number(studyYear) > 0 ? Number(studyYear) : 1, 1),
      totalYears
    );
    const student = await Student.create({
      userId: user._id,
      studentCode: await generateStudentCode(),
      fatherName: fatherName || '',
      courseId,
      studyYear: initialStudyYear,
      firstYearFee: defaultCycleFee,
      currentTermFee: defaultCycleFee,
      courseFeeAtEnrollment: courseFee,
      discount: discountAmount,
      examFeeDue: examFeeAmount,
      examFeePaid: 0,
      batch,
      section: section || '',
      shift: shift || 'morning',
      dueAmount: netFee,
      academicStatus: 'active',
      createdBy: req.user?.id || null,
    });
    await writeAuditLog({
      entityType: 'Student',
      entityId: user._id,
      action: 'create',
      summary: `Student admitted: ${name}`,
      metadata: { userId: user._id, studentId: student._id, courseId, examFeeDue: examFeeAmount, dueAmount: netFee },
      createdBy: req.user?.id,
    });
    const created = await User.findById(user._id).select('-password');
    const populatedStudent = await Student.findById(student._id).populate('courseId');
    res.status(201).json({ success: true, data: { user: created, student: populatedStudent } });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const {
      name,
      contact,
      address,
      courseId,
      batch,
      section,
      shift,
      dueAmount,
      studyYear,
      fatherName,
      examFeeDue,
      discount,
    } = req.body;
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
      if (fatherName !== undefined) student.fatherName = fatherName;
      if (discount !== undefined) student.discount = Math.max(0, Number(discount) || 0);
      if (examFeeDue !== undefined) student.examFeeDue = Math.max(0, Number(examFeeDue) || 0);
      if (courseId && String(student.courseId) !== String(courseId)) {
        return res.status(400).json({
          success: false,
          message: 'Use course transfer to change course with fee adjustment',
        });
      }
      if (batch) student.batch = batch;
      if (section !== undefined) student.section = section;
      if (shift) student.shift = shift;
      if (dueAmount !== undefined) student.dueAmount = Math.max(0, Number(dueAmount) || 0);
      if (studyYear !== undefined && Number(studyYear) > 0) student.studyYear = Number(studyYear);
      const courseRef = await Course.findById(student.courseId).select('duration').lean();
      const totalYears = parseDurationYears(courseRef?.duration);
      student.studyYear = Math.min(Math.max(Number(student.studyYear || 1), 1), totalYears);
      await student.save();
    }
    await writeAuditLog({
      entityType: 'Student',
      entityId: userId,
      action: 'update',
      summary: `Student updated: ${user.name}`,
      metadata: { userId, changes: req.body },
      createdBy: req.user?.id,
    });
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
    const student = await Student.findOne({ userId: user._id });
    if (student) {
      student.academicStatus = 'withdrawn';
      await student.save();
    }
    await writeAuditLog({
      entityType: 'Student',
      entityId: user._id,
      action: 'deactivate',
      summary: `Student deactivated: ${user.name}`,
      metadata: { userId: user._id },
      createdBy: req.user?.id,
    });
    res.json({ success: true, message: 'Student deactivated' });
  } catch (err) {
    next(err);
  }
};

exports.setStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or inactive' });
    }
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    user.status = status;
    await user.save();
    const student = await Student.findOne({ userId: user._id });
    if (student && status === 'active' && student.academicStatus === 'withdrawn') {
      student.academicStatus = 'active';
      await student.save();
    }
    await writeAuditLog({
      entityType: 'Student',
      entityId: user._id,
      action: status === 'active' ? 'activate' : 'deactivate',
      summary: `Student account ${status}: ${user.name}`,
      metadata: { userId: user._id, status },
      createdBy: req.user?.id,
    });
    res.json({ success: true, message: `Student ${status}`, data: { user, student } });
  } catch (err) {
    next(err);
  }
};

exports.struckOff = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const student = await Student.findOne({ userId: user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    student.academicStatus = 'struck_off';
    student.struckOffAt = new Date();
    student.struckOffReason = reason || '';
    await student.save();
    user.status = 'inactive';
    await user.save();
    await writeAuditLog({
      entityType: 'Student',
      entityId: user._id,
      action: 'struck_off',
      summary: `Student struck off: ${user.name}`,
      metadata: { userId: user._id, reason: reason || '' },
      createdBy: req.user?.id,
    });
    res.json({ success: true, message: 'Student struck off', data: { user, student } });
  } catch (err) {
    next(err);
  }
};

exports.transferCourse = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { courseId, batch, section, shift, discount, studyYear } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'New courseId is required' });
    }
    const student = await Student.findOne({ userId }).populate('courseId');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    const newCourse = await Course.findById(courseId);
    if (!newCourse) {
      return res.status(404).json({ success: false, message: 'New course not found' });
    }
    const oldCourseName = student.courseId?.name || 'Previous course';
    const { totalPaid } = await sumStudentPayments(student._id);
    const totalCredit = totalPaid + Number(student.feeCredit || 0);

    const courseFee = Number(newCourse.fee || 0);
    const examFeeAmount = Number(newCourse.examFee || 0);
    const discountAmount = discount !== undefined
      ? Math.max(0, Math.min(Number(discount) || 0, courseFee))
      : 0;
    const netTuition = Math.max(0, courseFee - discountAmount);

    let creditLeft = totalCredit;
    const tuitionDue = Math.max(0, netTuition - creditLeft);
    creditLeft = Math.max(0, creditLeft - netTuition);
    const examDue = Math.max(0, examFeeAmount - creditLeft);
    const examPaid = Math.max(0, examFeeAmount - examDue);

    const defaultCycleFee = getDefaultCycleFee(newCourse);
    const totalYears = parseDurationYears(newCourse.duration);
    const nextStudyYear = studyYear !== undefined
      ? Math.min(Math.max(Number(studyYear) || 1, 1), totalYears)
      : 1;

    student.previousCourseId = student.courseId?._id || student.courseId;
    student.courseId = newCourse._id;
    student.batch = batch || student.batch;
    student.section = section !== undefined ? section : student.section;
    student.shift = shift || student.shift;
    student.studyYear = nextStudyYear;
    student.courseFeeAtEnrollment = courseFee;
    student.discount = discountAmount;
    student.firstYearFee = defaultCycleFee;
    student.currentTermFee = defaultCycleFee;
    student.dueAmount = tuitionDue;
    student.examFeeDue = examFeeAmount;
    student.examFeePaid = examPaid;
    student.feeCredit = 0;
    student.academicStatus = 'transferred';
    await student.save();

    const user = await User.findById(userId);
    if (user) {
      user.status = 'active';
      await user.save();
    }

    await writeAuditLog({
      entityType: 'Student',
      entityId: userId,
      action: 'transfer_course',
      summary: `Course transfer: ${oldCourseName} → ${newCourse.name}`,
      metadata: {
        userId,
        previousCourseId: student.previousCourseId,
        newCourseId: courseId,
        creditApplied: totalCredit,
        newDueAmount: tuitionDue,
        newExamFeeDue: examFeeAmount,
        newExamFeePaid: examPaid,
      },
      createdBy: req.user?.id,
    });

    const updated = await Student.findById(student._id).populate('courseId');
    res.json({
      success: true,
      message: `Transferred to ${newCourse.name}. Previous payments (${totalCredit}) adjusted.`,
      data: updated,
    });
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
    if (student && !student.studentCode) {
      student.studentCode = await generateStudentCode();
      await student.save();
    }
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
    if (student.academicStatus === 'struck_off') {
      return res.status(400).json({ success: false, message: 'Cannot promote a struck-off student' });
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
    student.academicStatus = 'active';
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

    await writeAuditLog({
      entityType: 'Student',
      entityId: userId,
      action: 'promote',
      summary: `Promoted to year ${student.studyYear}`,
      metadata: { userId, studyYear: student.studyYear, nextTermFee: req.body?.nextTermFee },
      createdBy: req.user?.id,
    });

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
