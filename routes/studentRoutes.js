const express = require('express');
const studentController = require('../controllers/studentController');
const { protect, isAdmin, isAccountant } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', isAccountant, studentController.list);
router.get('/:id', isAdmin, studentController.getOne);
router.post('/', isAdmin, studentController.create);
router.put('/:id', isAdmin, studentController.update);
router.delete('/:id', isAdmin, studentController.remove);

module.exports = router;
