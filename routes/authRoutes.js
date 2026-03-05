const express = require('express');
const authController = require('../controllers/authController');
const protect = require('../middleware/auth');
const { loginSchema } = require('../middleware/validators');
const validate = require('../middleware/validate');

const router = express.Router();
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;
