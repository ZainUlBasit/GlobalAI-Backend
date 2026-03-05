const User = require('../models/User');
const Teacher = require('../models/Teacher');

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;
    const filter = { role: { $in: ['admin', 'accountant', 'teacher'] }, status: 'active' };
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }
    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    const teacherProfiles = await Teacher.find({ userId: { $in: users.map((u) => u._id) } })
      .populate('assignedCourses')
      .lean();
    const tMap = {};
    teacherProfiles.forEach((t) => { tMap[t.userId.toString()] = t; });
    const list = users.map((u) => ({
      ...u.toObject(),
      teacherProfile: u.role === 'teacher' ? tMap[u._id.toString()] || null : null,
    }));
    res.json({ success: true, data: list, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, email, password, role, contact, address } = req.body;
    const allowedRoles = ['admin', 'accountant', 'teacher'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Only admin, accountant, and teacher can be added.' });
    }
    if (role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Super admin accounts cannot be created from here.' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    const user = await User.create({
      name,
      email,
      password: password || 'employee123',
      role,
      contact: contact || '',
      address: address || '',
      status: 'active',
    });
    if (role === 'teacher') {
      await Teacher.create({ userId: user._id, assignedCourses: [], salary: 0 });
    }
    const created = await User.findById(user._id).select('-password');
    let teacher = null;
    if (role === 'teacher') {
      teacher = await Teacher.findOne({ userId: user._id }).populate('assignedCourses');
    }
    res.status(201).json({ success: true, data: { user: created, teacher } });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, role, contact, address, assignedCourses, salary } = req.body;
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (name) user.name = name;
    if (role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot change role to super admin.' });
    }
    if (role && ['admin', 'accountant', 'teacher'].includes(role)) user.role = role;
    if (contact !== undefined) user.contact = contact;
    if (address !== undefined) user.address = address;
    await user.save();

    if (user.role === 'teacher') {
      let teacher = await Teacher.findOne({ userId });
      if (!teacher) teacher = await Teacher.create({ userId: user._id });
      if (assignedCourses) teacher.assignedCourses = assignedCourses;
      if (salary !== undefined) teacher.salary = salary;
      await teacher.save();
    }
    const updated = await User.findById(userId).select('-password');
    const teacher = user.role === 'teacher'
      ? await Teacher.findOne({ userId }).populate('assignedCourses')
      : null;
    res.json({ success: true, data: { user: updated, teacher } });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot delete superadmin' });
    }
    user.status = 'inactive';
    await user.save();
    if (user.role === 'teacher') await Teacher.deleteOne({ userId: user._id });
    res.json({ success: true, message: 'Employee removed' });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    let teacher = null;
    if (user.role === 'teacher') {
      teacher = await Teacher.findOne({ userId: user._id }).populate('assignedCourses');
    }
    res.json({ success: true, data: { user, teacher } });
  } catch (err) {
    next(err);
  }
};
