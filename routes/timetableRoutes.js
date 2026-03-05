const express = require('express');
const timetableController = require('../controllers/timetableController');
const { protect, isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.use(isAdmin);

router.get('/', timetableController.list);
router.post('/', timetableController.create);
router.post('/bulk', timetableController.bulkCreate);
router.put('/:id', timetableController.update);
router.delete('/:id', timetableController.remove);

module.exports = router;
