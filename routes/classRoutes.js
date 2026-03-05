const express = require('express');
const classController = require('../controllers/classController');
const { protect, isTeacher, isStudent } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(protect);

router.get('/assignments', classController.listAssignments);
router.post('/assignments', isTeacher, upload.single('file'), classController.createAssignment);

router.get('/students', isTeacher, classController.getStudentsByClass);
router.get('/notes', classController.getClassNotes);
router.post('/notes', isTeacher, upload.single('file'), classController.uploadClassNote);

router.post('/marks', isTeacher, classController.addMarks);
router.get('/performance', classController.getStudentPerformance);

router.get('/teacher-dashboard', isTeacher, classController.getTeacherDashboard);

router.post('/assignments/submit', isStudent, upload.single('file'), classController.submitAssignment);
router.get('/my-assignments', isStudent, classController.getMyAssignments);
router.get('/my-courses', isStudent, classController.getMyCourses);
router.get('/my-notes', isStudent, classController.getNotesForCourse);
router.get('/student-dashboard', isStudent, classController.getStudentDashboard);
router.get('/my-dues', isStudent, classController.getMyDues);

module.exports = router;
