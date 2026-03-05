const express = require('express');
const teacherController = require('../controllers/teacherController');
const { protect, isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.use(isAdmin);
router.get('/', teacherController.list);
router.get('/:id', teacherController.getOne);
router.put('/:id/courses-salary', teacherController.updateCoursesAndSalary);

module.exports = router;
