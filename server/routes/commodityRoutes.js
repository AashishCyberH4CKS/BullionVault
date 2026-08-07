const express = require('express');
const router = express.Router();
const {
  getCommodities,
  getCommodityFilters,
  getCommodityPrices,
  getMarketOverview,
  getMarketInsights,
  getCommodityAnalytics,
  lookupPrice
} = require('../controllers/commodityController');

router.get('/', getCommodities);
router.get('/market/overview', getMarketOverview);
router.get('/market/insights', getMarketInsights);
router.get('/:code/filters', getCommodityFilters);
router.get('/:code/prices', getCommodityPrices);
router.get('/:code/analytics', getCommodityAnalytics);
router.get('/:code/lookup', lookupPrice);

module.exports = router;
