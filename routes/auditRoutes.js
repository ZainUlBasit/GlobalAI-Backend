const express = require('express');
const auditController = require('../controllers/auditController');
const { protect, isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.use(isAdmin);
router.get('/', auditController.list);
router.get('/student/:id', auditController.getStudentLogs);

module.exports = router;
