const express = require('express');
const router = express.Router();
const {
  getInventory,
  getInventoryStats,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getInventory)
  .post(addInventoryItem);

router.get('/stats', getInventoryStats);

router.route('/:id')
  .put(updateInventoryItem)
  .delete(deleteInventoryItem);

module.exports = router;
