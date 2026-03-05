const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { loginSchema } = require('../middleware/validators');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account inactive' });
    }
    const token = generateToken(user._id);
    const profile = await User.findById(user._id).select('-password');
    let extra = {};
    if (user.role === 'student') {
      const student = await Student.findOne({ userId: user._id }).populate('courseId');
      extra = { student };
    }
    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: user._id }).populate('assignedCourses');
      extra = { teacher };
    }
    res.json({ success: true, token, user: profile, ...extra });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    let extra = {};
    if (user.role === 'student') {
      const student = await Student.findOne({ userId: user._id }).populate('courseId');
      extra = { student };
    }
    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: user._id }).populate('assignedCourses');
      extra = { teacher };
    }
    res.json({ success: true, user, ...extra });
  } catch (err) {
    next(err);
  }
};
