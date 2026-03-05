const express = require('express');
const accountsController = require('../controllers/accountsController');
const { protect, isAdmin, isAccountant } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(protect);

router.get('/income', isAccountant, accountsController.getIncome);
router.get('/expenses', isAccountant, accountsController.getExpenses);
router.get('/salaries', isAccountant, accountsController.getSalaries);
router.get('/reports', isAccountant, accountsController.getReports);
router.get('/today-summary', isAccountant, accountsController.getTodaySummary);

router.get('/student-fee/:studentId', isAccountant, accountsController.getStudentFee);
router.post('/fee-payment', isAccountant, accountsController.addFeePayment);
router.put('/due/:studentId', isAccountant, accountsController.updateDue);

router.post('/income', isAccountant, accountsController.addIncome);
router.post('/expense', isAccountant, upload.single('bill'), accountsController.addExpense);
router.post('/salary', isAccountant, accountsController.recordSalary);

module.exports = router;
