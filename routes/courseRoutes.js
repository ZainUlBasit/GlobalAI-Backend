const express = require('express');
const courseController = require('../controllers/courseController');
const { protect, isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', courseController.list);
router.get('/:id', courseController.getOne);
router.post('/', isAdmin, courseController.create);
router.put('/:id', isAdmin, courseController.update);
router.delete('/:id', isAdmin, courseController.remove);

module.exports = router;
