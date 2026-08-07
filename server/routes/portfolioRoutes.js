const express = require('express');
const router = express.Router();
const {
  getInvestments,
  addInvestment,
  deleteInvestment,
  getPortfolioStats
} = require('../controllers/portfolioController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getInvestments)
  .post(addInvestment);

router.delete('/:id', deleteInvestment);
router.get('/stats', getPortfolioStats);

module.exports = router;
