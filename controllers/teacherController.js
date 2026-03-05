const Teacher = require('../models/Teacher');
const User = require('../models/User');

exports.list = async (req, res, next) => {
  try {
    const teachers = await Teacher.find().populate('userId').populate('assignedCourses');
    res.json({ success: true, data: teachers });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.params.id })
      .populate('userId')
      .populate('assignedCourses');
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.json({ success: true, data: teacher });
  } catch (err) {
    next(err);
  }
};

exports.updateCoursesAndSalary = async (req, res, next) => {
  try {
    const { assignedCourses, salary } = req.body;
    let teacher = await Teacher.findOne({ userId: req.params.id });
    if (!teacher) {
      const user = await User.findById(req.params.id);
      if (!user || user.role !== 'teacher') {
        return res.status(404).json({ success: false, message: 'Teacher not found' });
      }
      teacher = await Teacher.create({ userId: req.params.id, assignedCourses: assignedCourses || [], salary: salary ?? 0 });
    } else {
      if (assignedCourses) teacher.assignedCourses = assignedCourses;
      if (salary !== undefined) teacher.salary = salary;
      await teacher.save();
    }
    const updated = await Teacher.findById(teacher._id).populate('userId').populate('assignedCourses');
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};
