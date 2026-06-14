const Certificate = require('../models/Certificate');
const Student = require('../models/Student');
const User = require('../models/User');

const generateCertificateNo = async () => {
  const year = new Date().getFullYear();
  const prefix = `CERT-${year}-`;
  const count = await Certificate.countDocuments({ certificateNo: { $regex: `^${prefix}` } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

exports.list = async (req, res, next) => {
  try {
    const { courseId, batch, search, limit = 200 } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { studentName: new RegExp(search, 'i') },
        { fatherName: new RegExp(search, 'i') },
        { certificateNo: new RegExp(search, 'i') },
        { courseName: new RegExp(search, 'i') },
      ];
    }
    if (batch) filter.batch = batch;
    if (courseId) {
      const students = await Student.find({ courseId }).select('_id').lean();
      filter.studentId = { $in: students.map((s) => s._id) };
    }
    const list = await Certificate.find(filter)
      .populate('issuedBy', 'name')
      .sort({ issueDate: -1 })
      .limit(Number(limit) || 200)
      .lean();
    res.json({ success: true, data: list, total: list.length });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { studentUserId } = req.body;
    if (!studentUserId) {
      return res.status(400).json({ success: false, message: 'Student is required' });
    }
    const user = await User.findById(studentUserId).select('name role').lean();
    if (!user || user.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const student = await Student.findOne({ userId: studentUserId }).populate('courseId').lean();
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }
    const certificateNo = await generateCertificateNo();
    const doc = await Certificate.create({
      studentId: student._id,
      userId: studentUserId,
      studentName: user.name,
      fatherName: student.fatherName || '',
      courseName: student.courseId?.name || '',
      batch: student.batch || '',
      certificateNo,
      issuedBy: req.user.id,
    });
    const populated = await Certificate.findById(doc._id).populate('issuedBy', 'name').lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};
