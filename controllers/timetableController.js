const TimetableSlot = require('../models/TimetableSlot');
const Batch = require('../models/Batch');

exports.list = async (req, res, next) => {
  try {
    const { courseId, batchId, shift } = req.query;
    const filter = {};
    if (courseId) filter.courseId = courseId;
    if (batchId) filter.batchId = batchId;
    if (shift) {
      const batches = await Batch.find({ shift }).select('_id').lean();
      filter.batchId = { $in: batches.map((b) => b._id) };
    }
    const slots = await TimetableSlot.find(filter)
      .populate('courseId', 'name')
      .populate('batchId', 'batchName shift')
      .populate('teacherId', 'name')
      .sort({ day: 1, timeSlot: 1 })
      .lean();
    res.json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { day, timeSlot, startTime, endTime, courseId, batchId, roomNumber, teacherId } = req.body;
    const slot = await TimetableSlot.create({
      day,
      timeSlot,
      startTime,
      endTime,
      courseId,
      batchId,
      roomNumber: roomNumber || '',
      teacherId: teacherId || undefined,
    });
    const populated = await TimetableSlot.findById(slot._id)
      .populate('courseId', 'name')
      .populate('batchId', 'batchName shift')
      .populate('teacherId', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const slot = await TimetableSlot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('courseId', 'name')
      .populate('batchId', 'batchName shift')
      .populate('teacherId', 'name');
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    res.json({ success: true, data: slot });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const slot = await TimetableSlot.findByIdAndDelete(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    res.json({ success: true, message: 'Slot deleted' });
  } catch (err) {
    next(err);
  }
};

exports.bulkCreate = async (req, res, next) => {
  try {
    const { slots } = req.body;
    const created = await TimetableSlot.insertMany(slots || []);
    res.status(201).json({ success: true, data: created, count: created.length });
  } catch (err) {
    next(err);
  }
};
