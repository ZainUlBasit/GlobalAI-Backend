const express = require('express');
const { protect, isAdmin } = require('../middleware/roleMiddleware');
const instituteController = require('../controllers/instituteController');

const router = express.Router();

router.get('/', protect, instituteController.getSettings);
router.put('/', protect, isAdmin, instituteController.updateSettings);

module.exports = router;
