const Institute = require('../models/Institute');

const DEFAULTS = {
  name: 'Global AI Institute',
  tagline: 'Smart Institute Management System',
  address: '',
  phone: '',
  email: '',
  receiptFooter: 'Thank you for your payment.',
  currency: 'PKR',
};

async function getOrCreateInstitute() {
  let doc = await Institute.findOne();
  if (!doc) {
    doc = await Institute.create(DEFAULTS);
  }
  return doc;
}

exports.getSettings = async (req, res, next) => {
  try {
    const data = await getOrCreateInstitute();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const allowed = ['name', 'tagline', 'address', 'phone', 'email', 'receiptFooter', 'currency'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = String(req.body[key]).trim();
    });

    let doc = await Institute.findOne();
    if (!doc) {
      doc = await Institute.create({ ...DEFAULTS, ...updates });
    } else {
      Object.assign(doc, updates);
      await doc.save();
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};
