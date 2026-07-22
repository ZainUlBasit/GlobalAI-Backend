const express = require('express');
const studentController = require('../controllers/studentController');
const { protect, isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', isAdmin, studentController.list);
router.get('/:id', isAdmin, studentController.getOne);
router.post('/', isAdmin, studentController.create);
router.patch('/:id/promote', isAdmin, studentController.promote);
router.patch('/:id/transfer-course', isAdmin, studentController.transferCourse);
router.patch('/:id/status', isAdmin, studentController.setStatus);
router.patch('/:id/struck-off', isAdmin, studentController.struckOff);
router.put('/:id', isAdmin, studentController.update);
router.delete('/:id', isAdmin, studentController.remove);

module.exports = router;
