const express = require('express');
const employeeController = require('../controllers/employeeController');
const { protect, isAdmin, isAccountant } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', isAccountant, employeeController.list);
router.get('/:id', isAccountant, employeeController.getOne);
router.post('/', isAdmin, employeeController.create);
router.put('/:id', isAdmin, employeeController.update);
router.delete('/:id', isAdmin, employeeController.remove);

module.exports = router;
