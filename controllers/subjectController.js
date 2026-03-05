const Subject = require('../models/Subject');
const Course = require('../models/Course');

exports.list = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    const filter = courseId ? { courseId } : {};
    const subjects = await Subject.find(filter)
      .populate('courseId', 'name')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: subjects });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, courseId, code } = req.body;
    const subject = await Subject.create({
      name: name || 'New Subject',
      courseId,
      code: code || '',
    });
    const populated = await Subject.findById(subject._id).populate('courseId', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('courseId', 'name');
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, message: 'Subject deleted' });
  } catch (err) {
    next(err);
  }
};
