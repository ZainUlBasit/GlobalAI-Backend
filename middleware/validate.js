const validate = (schema) => (req, res, next) => {
  const toValidate = { ...req.body, ...req.params, ...req.query };
  const { error, value } = schema.validate(toValidate, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message).join(', ');
    return res.status(400).json({ success: false, message: messages });
  }
  req.validated = value;
  next();
};

module.exports = validate;
