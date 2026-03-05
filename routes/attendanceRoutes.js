const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const { protect, isAdmin, isTeacher, isStudent } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(protect);

router.get('/', isAdmin, attendanceController.list);
router.get('/my', attendanceController.getMyAttendance);
router.post('/check-in', upload.single('image'), attendanceController.checkIn);
router.post('/check-out', upload.single('image'), attendanceController.checkOut);

router.get('/class', isTeacher, attendanceController.getClassAttendance);
router.post('/class', isTeacher, attendanceController.markClassAttendance);
router.post('/class/bulk', isTeacher, attendanceController.bulkMarkClassAttendance);

module.exports = router;
