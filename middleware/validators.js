const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const registerUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'accountant', 'teacher', 'student').required(),
  contact: Joi.string().allow(''),
  address: Joi.string().allow(''),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

module.exports = { loginSchema, registerUserSchema };
