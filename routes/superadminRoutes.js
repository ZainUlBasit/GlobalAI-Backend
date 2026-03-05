const express = require('express');
const { protect, isSuperAdmin } = require('../middleware/roleMiddleware');
const superadminController = require('../controllers/superadminController');

const router = express.Router();
router.use(protect);
router.use(isSuperAdmin);
router.get('/stats', superadminController.getStats);
router.get('/dues', superadminController.getDuesList);

module.exports = router;
