const express = require('express');
const subjectController = require('../controllers/subjectController');
const { protect, isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.use(isAdmin);

router.get('/', subjectController.list);
router.post('/', subjectController.create);
router.put('/:id', subjectController.update);
router.delete('/:id', subjectController.remove);

module.exports = router;
