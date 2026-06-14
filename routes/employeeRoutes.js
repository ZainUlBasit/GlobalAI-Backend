const express = require('express');
const employeeController = require('../controllers/employeeController');
const { protect, isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', isAdmin, employeeController.list);
router.get('/:id', isAdmin, employeeController.getOne);
router.post('/', isAdmin, employeeController.create);
router.put('/:id', isAdmin, employeeController.update);
router.delete('/:id', isAdmin, employeeController.remove);

module.exports = router;
