const Watchlist = require('../models/Watchlist');
const Commodity = require('../models/Commodity');
const HistoricalPrice = require('../models/HistoricalPrice');

// @desc    Get user watchlist
// @route   GET /api/watchlist
// @access  Private
const getWatchlist = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, data: [] });
    }

    const watchlist = await Watchlist.find({ userId: req.user.id }).populate('commodityId');
    const enrichedList = [];

    for (const item of watchlist) {
      if (!item.commodityId) continue;
      
      const comm = item.commodityId;
      const code = comm.code;

      // Select defaults based on commodity code
      const filter = { commodityCode: code };
      if (code === 'gold') {
        filter.purity = '24K'; filter.weight = 10; filter.state = 'National';
      } else if (code === 'silver') {
        filter.purity = '999 (Fine Silver)'; filter.weight = 10; filter.state = 'National';
      } else if (code === 'platinum') {
        filter.purity = '999 (Fine Platinum)'; filter.weight = 10; filter.state = 'All India (national average)';
      } else if (code === 'copper') {
        filter.purity = 'Standard Grade'; filter.weight = 1000; filter.state = 'National';
      } else if (code === 'crudeoil') {
        filter.purity = 'INR per Barrel'; filter.state = 'All India (Indian Basket, national benchmark)';
      }

      let latestPrice = await HistoricalPrice.findOne(filter).sort({ year: -1, quarterNum: -1 });
      if (!latestPrice) {
        latestPrice = await HistoricalPrice.findOne({ commodityCode: code }).sort({ year: -1, quarterNum: -1 });
      }

      enrichedList.push({
        _id: item._id,
        commodityId: comm._id,
        name: comm.name,
        code: code,
        accentTheme: comm.accentTheme,
        latestPrice: latestPrice ? latestPrice.price : 0,
        qoqChange: latestPrice ? latestPrice.qoqChange : 0,
        qoqChangePercent: latestPrice ? latestPrice.qoqChangePercent : 0,
        trend: latestPrice ? latestPrice.trend : 'Base',
        quarter: latestPrice ? latestPrice.quarter : 'N/A'
      });
    }

    res.json({ success: true, data: enrichedList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add commodity to watchlist
// @route   POST /api/watchlist
// @access  Private
const addToWatchlist = async (req, res) => {
  try {
    const { commodityId } = req.body;
    if (!commodityId) {
      return res.status(400).json({ success: false, message: 'Please add a commodity ID' });
    }

    // Check if commodity exists
    const commodity = await Commodity.findById(commodityId);
    if (!commodity) {
      return res.status(404).json({ success: false, message: 'Commodity not found' });
    }

    // Check if already in watchlist
    const exists = await Watchlist.findOne({ userId: req.user.id, commodityId });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Commodity already in watchlist' });
    }

    const item = await Watchlist.create({
      userId: req.user.id,
      commodityId
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove commodity from watchlist
// @route   DELETE /api/watchlist/:id
// @access  Private
const removeFromWatchlist = async (req, res) => {
  try {
    const item = await Watchlist.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Watchlist item not found' });
    }

    if (item.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await item.deleteOne();
    res.json({ success: true, message: 'Commodity removed from watchlist' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist
};
