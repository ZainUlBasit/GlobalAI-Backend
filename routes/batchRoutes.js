const express = require('express');
const batchController = require('../controllers/batchController');
const { protect, isAdmin } = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(protect);
router.use(isAdmin);

router.get('/', batchController.list);
router.get('/:id', batchController.getOne);
router.post('/', batchController.create);
router.put('/:id', batchController.update);
router.delete('/:id', batchController.remove);

module.exports = router;
