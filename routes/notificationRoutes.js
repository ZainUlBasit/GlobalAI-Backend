const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect, isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', isAdmin, notificationController.list);
router.get('/my', notificationController.getMyNotifications);
router.post('/', isAdmin, notificationController.create);
router.post('/bulk', isAdmin, notificationController.bulkCreate);
router.patch('/read', notificationController.markRead);

module.exports = router;
