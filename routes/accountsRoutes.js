const express = require('express');
const accountsController = require('../controllers/accountsController');
const { protect, isAdmin } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(protect);

router.get('/income', isAdmin, accountsController.getIncome);
router.get('/expenses', isAdmin, accountsController.getExpenses);
router.get('/salaries', isAdmin, accountsController.getSalaries);
router.get('/reports', isAdmin, accountsController.getReports);
router.get('/today-summary', isAdmin, accountsController.getTodaySummary);
router.get('/dashboard-summary', isAdmin, accountsController.getDashboardSummary);
router.get('/dues', isAdmin, accountsController.getDuesList);

router.get('/student-fee/:studentId', isAdmin, accountsController.getStudentFee);
router.post('/fee-payment', isAdmin, accountsController.addFeePayment);
router.put('/due/:studentId', isAdmin, accountsController.updateDue);

router.post('/income', isAdmin, accountsController.addIncome);
router.post('/expense', isAdmin, upload.single('bill'), accountsController.addExpense);
router.post('/salary', isAdmin, accountsController.recordSalary);

module.exports = router;
