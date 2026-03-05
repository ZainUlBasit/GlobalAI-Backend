const Batch = require('../models/Batch');
const Course = require('../models/Course');
const User = require('../models/User');

exports.list = async (req, res, next) => {
  try {
    const { courseId, shift, status } = req.query;
    const filter = {};
    if (courseId) filter.courseId = courseId;
    if (shift) filter.shift = shift;
    if (status && ['active', 'closed'].includes(status)) filter.status = status;
    const batches = await Batch.find(filter)
      .populate('courseId', 'name duration')
      .populate('assignedTeacher', 'name email')
      .populate('subjects', 'name code')
      .sort({ startDate: -1 })
      .lean();
    res.json({ success: true, data: batches });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { batchName, courseId, shift, startDate, endDate, assignedTeacher, subjects } = req.body;
    const batch = await Batch.create({
      batchName: batchName || 'New Batch',
      courseId,
      shift: shift || 'morning',
      startDate,
      endDate,
      assignedTeacher: assignedTeacher || undefined,
      subjects: Array.isArray(subjects) ? subjects : [],
      status: 'active',
    });
    const populated = await Batch.findById(batch._id)
      .populate('courseId', 'name duration')
      .populate('assignedTeacher', 'name email')
      .populate('subjects', 'name code');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const update = { ...req.body };
    if (Array.isArray(update.subjects)) {
      // keep subjects as is
    } else {
      delete update.subjects;
    }
    if (update.status && !['active', 'closed'].includes(update.status)) delete update.status;
    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    )
      .populate('courseId', 'name duration')
      .populate('assignedTeacher', 'name email')
      .populate('subjects', 'name code');
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, message: 'Batch deleted' });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('courseId', 'name duration')
      .populate('assignedTeacher', 'name email')
      .populate('subjects', 'name code');
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
};
