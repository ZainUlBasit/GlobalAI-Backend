const express = require('express');
const { protect, isSuperAdmin } = require('../middleware/roleMiddleware');
const superadminController = require('../controllers/superadminController');
const accountsController = require('../controllers/accountsController');

const router = express.Router();
router.use(protect);
router.use(isSuperAdmin);
router.get('/stats', superadminController.getStats);
router.get('/dues', accountsController.getDuesList);

module.exports = router;
