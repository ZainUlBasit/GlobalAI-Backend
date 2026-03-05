const Notification = require('../models/Notification');

exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      // can see all or filter by receiver
    } else {
      filter.$or = [{ receiverId: req.user.id }, { receiverRole: req.user.role }];
    }
    const list = await Notification.find(filter)
      .populate('receiverId', 'name email')
      .populate('sentBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { title, message, receiverId, receiverRole, type } = req.body;
    const notif = await Notification.create({
      title,
      message,
      receiverId: receiverId || undefined,
      receiverRole: receiverRole || undefined,
      type: type || 'inapp',
      sentBy: req.user.id,
    });
    const populated = await Notification.findById(notif._id).populate('receiverId', 'name email').populate('sentBy', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.bulkCreate = async (req, res, next) => {
  try {
    const { notifications } = req.body;
    const created = await Notification.insertMany(
      (notifications || []).map((n) => ({
        ...n,
        type: n.type || 'inapp',
        sentBy: req.user.id,
      }))
    );
    res.status(201).json({ success: true, data: created, count: created.length });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { receiverId: req.user.id, _id: { $in: req.body.ids || [] } },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.getMyNotifications = async (req, res, next) => {
  try {
    const list = await Notification.find({
      $or: [{ receiverId: req.user.id }, { receiverRole: req.user.role }],
    })
      .populate('sentBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};
