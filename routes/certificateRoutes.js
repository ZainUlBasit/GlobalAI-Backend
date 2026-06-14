const express = require('express');
const certificateController = require('../controllers/certificateController');
const { protect, isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', isAdmin, certificateController.list);
router.post('/', isAdmin, certificateController.create);

module.exports = router;
