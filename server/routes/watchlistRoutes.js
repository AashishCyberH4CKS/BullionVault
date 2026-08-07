const express = require('express');
const router = express.Router();
const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist
} = require('../controllers/watchlistController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getWatchlist)
  .post(addToWatchlist);

router.delete('/:id', removeFromWatchlist);

module.exports = router;
