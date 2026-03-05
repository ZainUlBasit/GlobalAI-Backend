const Batch = require('../models/Batch');
const Course = require('../models/Course');
const User = require('../models/User');

const parseCourseDurationMonths = (duration) => {
  if (!duration || typeof duration !== 'string') return 12;
  const text = duration.toLowerCase();

  const yearMatch = text.match(/(\d+)\s*year/);
  if (yearMatch) return Math.max((parseInt(yearMatch[1], 10) || 1) * 12, 1);

  const monthMatch = text.match(/(\d+)\s*month/);
  const semesterMatch = text.match(/(\d+)\s*semester/);
  if (semesterMatch) {
    const semesters = Math.max(parseInt(semesterMatch[1], 10) || 1, 1);
    const monthsEachMatch = text.match(/(\d+)\s*month[s]?\s*each/);
    const monthsEach = Math.max(parseInt(monthsEachMatch?.[1] || '6', 10) || 6, 1);
    return semesters * monthsEach;
  }
  if (monthMatch) return Math.max(parseInt(monthMatch[1], 10) || 1, 1);

  const plainNumber = text.match(/(\d+)/);
  if (plainNumber) return Math.max((parseInt(plainNumber[1], 10) || 1) * 12, 1);
  return 12;
};

const calculateEndDateFromCourse = async ({ courseId, startDate }) => {
  const parsedStartDate = new Date(startDate);
  if (Number.isNaN(parsedStartDate.getTime())) return null;
  const course = await Course.findById(courseId).select('duration').lean();
  const months = parseCourseDurationMonths(course?.duration);
  const endDate = new Date(parsedStartDate);
  endDate.setMonth(endDate.getMonth() + months);
  return endDate;
};

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
    if (!startDate || !courseId) {
      return res.status(400).json({ success: false, message: 'courseId and startDate are required' });
    }
    const resolvedEndDate = endDate || (await calculateEndDateFromCourse({ courseId, startDate }));
    if (!resolvedEndDate) {
      return res.status(400).json({ success: false, message: 'Invalid startDate or course duration' });
    }
    const batch = await Batch.create({
      batchName: batchName || 'New Batch',
      courseId,
      shift: shift || 'morning',
      startDate,
      endDate: resolvedEndDate,
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
    const existing = await Batch.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Batch not found' });

    const update = { ...req.body };
    if (Array.isArray(update.subjects)) {
      // keep subjects as is
    } else {
      delete update.subjects;
    }
    if (update.status && !['active', 'closed'].includes(update.status)) delete update.status;

    const shouldRecalculateEndDate = !update.endDate && (update.startDate || update.courseId);
    if (shouldRecalculateEndDate) {
      const resolvedEndDate = await calculateEndDateFromCourse({
        courseId: update.courseId || existing.courseId,
        startDate: update.startDate || existing.startDate,
      });
      if (resolvedEndDate) update.endDate = resolvedEndDate;
    }

    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    )
      .populate('courseId', 'name duration')
      .populate('assignedTeacher', 'name email')
      .populate('subjects', 'name code');
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
