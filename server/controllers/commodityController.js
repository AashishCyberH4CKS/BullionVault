const Commodity = require('../models/Commodity');
const HistoricalPrice = require('../models/HistoricalPrice');

// Helper to parse quarter string sort ordering
const sortPricesByQuarter = (prices) => {
  return prices.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.quarterNum - b.quarterNum;
  });
};

// @desc    Get all commodities
// @route   GET /api/commodities
// @access  Public
const getCommodities = async (req, res) => {
  try {
    const commodities = await Commodity.find({});
    res.json({ success: true, data: commodities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get filters options for a specific commodity
// @route   GET /api/commodities/:code/filters
// @access  Public
const getCommodityFilters = async (req, res) => {
  try {
    const { code } = req.params;
    const commodity = await Commodity.findOne({ code });
    if (!commodity) {
      return res.status(404).json({ success: false, message: 'Commodity not found' });
    }

    // Dynamic fetch from historical prices to ensure completeness
    const states = await HistoricalPrice.distinct('state', { commodityCode: code });
    const regions = await HistoricalPrice.distinct('region', { commodityCode: code });
    const purities = await HistoricalPrice.distinct('purity', { commodityCode: code });
    const weights = await HistoricalPrice.distinct('weight', { commodityCode: code });
    const quarters = await HistoricalPrice.distinct('quarter', { commodityCode: code });

    res.json({
      success: true,
      data: {
        states: states.sort(),
        regions: regions.sort(),
        purities: purities.sort(),
        weights: weights.sort((a, b) => a - b),
        quarters: quarters // We'll handle chronological sorting on front
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get historical prices with filters
// @route   GET /api/commodities/:code/prices
// @access  Public
const getCommodityPrices = async (req, res) => {
  try {
    const { code } = req.params;
    const { state, purity, weight, region, quarter, year, sort, page = 1, limit = 50 } = req.query;

    const query = { commodityCode: code };

    if (state) query.state = state;
    if (region) query.region = region;
    if (purity) query.purity = purity;
    if (weight) query.weight = Number(weight);
    if (quarter) query.quarter = quarter;
    if (year) query.year = Number(year);

    // Pagination
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    // Sorting
    let sortOptions = { year: -1, quarterNum: -1 };
    if (sort === 'oldest') {
      sortOptions = { year: 1, quarterNum: 1 };
    } else if (sort === 'price_high') {
      sortOptions = { price: -1 };
    } else if (sort === 'price_low') {
      sortOptions = { price: 1 };
    }

    const prices = await HistoricalPrice.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const total = await HistoricalPrice.countDocuments(query);

    res.json({
      success: true,
      data: prices,
      pagination: {
        total,
        page: Number(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get market overview / summary stats for landing & market overview
// @route   GET /api/commodities/market/overview
// @access  Public
const getMarketOverview = async (req, res) => {
  try {
    const commodities = await Commodity.find({});
    const overview = [];

    for (const comm of commodities) {
      // Find latest price record.
      // Usually, national avg, standard weight & purity
      const filter = { commodityCode: comm.code };
      
      // Select defaults based on commodity code
      if (comm.code === 'gold') {
        filter.purity = '24K';
        filter.weight = 10;
        filter.state = 'National';
      } else if (comm.code === 'silver') {
        filter.purity = '999 (Fine Silver)';
        filter.weight = 10;
        filter.state = 'National';
      } else if (comm.code === 'platinum') {
        filter.purity = '999 (Fine Platinum)';
        filter.weight = 10;
        filter.state = 'All India (national average)';
      } else if (comm.code === 'crudeoil') {
        filter.purity = 'INR per Barrel';
        filter.state = 'All India (Indian Basket, national benchmark)';
      }

      // If defaults don't match, fall back to whatever latest row exists
      let latestPrice = await HistoricalPrice.findOne(filter).sort({ year: -1, quarterNum: -1 });
      if (!latestPrice) {
        latestPrice = await HistoricalPrice.findOne({ commodityCode: comm.code }).sort({ year: -1, quarterNum: -1 });
      }

      // Get historical trend series for sparklines (last 8 quarters)
      let trendSeries = [];
      if (latestPrice) {
        trendSeries = await HistoricalPrice.find({
          commodityCode: comm.code,
          state: latestPrice.state,
          purity: latestPrice.purity,
          weight: latestPrice.weight
        })
        .sort({ year: 1, quarterNum: 1 })
        .limit(8);
      }

      overview.push({
        name: comm.name,
        code: comm.code,
        accentTheme: comm.accentTheme,
        latestPrice: latestPrice ? latestPrice.price : 0,
        currency: comm.code === 'crudeoil' && latestPrice && latestPrice.purity.includes('USD') ? 'USD' : 'INR',
        unit: latestPrice ? `${latestPrice.purity} (${latestPrice.weight}g)` : 'Standard Unit',
        quarter: latestPrice ? latestPrice.quarter : 'N/A',
        qoqChange: latestPrice ? latestPrice.qoqChange : 0,
        qoqChangePercent: latestPrice ? latestPrice.qoqChangePercent : 0,
        trend: latestPrice ? latestPrice.trend : 'Base',
        sparkline: trendSeries.map(p => p.price)
      });
    }

    res.json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dynamic AI Insights and descriptive metrics from database
// @route   GET /api/commodities/market/insights
// @access  Public
const getMarketInsights = async (req, res) => {
  try {
    const commodities = await Commodity.find({});
    const insights = [];

    for (const comm of commodities) {
      const code = comm.code;
      
      // Fetch national records over time
      let filter = { commodityCode: code };
      if (code === 'gold') {
        filter.purity = '24K'; filter.weight = 10; filter.state = 'National';
      } else if (code === 'silver') {
        filter.purity = '999 (Fine Silver)'; filter.weight = 10; filter.state = 'National';
      } else if (code === 'platinum') {
        filter.purity = '999 (Fine Platinum)'; filter.weight = 10; filter.state = 'All India (national average)';
      } else if (code === 'crudeoil') {
        filter.purity = 'INR per Barrel'; filter.state = 'All India (Indian Basket, national benchmark)';
      }

      const history = await HistoricalPrice.find(filter).sort({ year: 1, quarterNum: 1 });
      if (history.length < 2) continue;

      const firstPrice = history[0].price;
      const lastPrice = history[history.length - 1].price;
      const totalGrowth = ((lastPrice - firstPrice) / firstPrice) * 100;
      
      // Volatility calculation (standard deviation of prices)
      const prices = history.map(h => h.price);
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const stdev = Math.sqrt(prices.map(p => Math.pow(p - mean, 2)).reduce((a, b) => a + b, 0) / prices.length);
      const volatilityIndex = (stdev / mean) * 100; // normalized coefficient of variance

      let message = '';
      let highlightType = 'positive'; // positive, neutral, warning

      if (code === 'gold') {
        message = `Gold values grew by ${totalGrowth.toFixed(1)}% since ${history[0].quarter}, maintaining strong luxury demand hedge.`;
        highlightType = 'positive';
      } else if (code === 'silver') {
        message = `Silver registered a high return profile of ${totalGrowth.toFixed(1)}% with standard volatility (${volatilityIndex.toFixed(1)}%).`;
        highlightType = 'positive';
      } else if (code === 'platinum') {
        message = `Platinum prices demonstrated the lowest historical volatility coefficient at ${volatilityIndex.toFixed(1)}%.`;
        highlightType = 'neutral';
      } else if (code === 'crudeoil') {
        message = `Crude Oil fluctuated heavily, with volatility index at ${volatilityIndex.toFixed(1)}% due to international pricing adjustments.`;
        highlightType = 'warning';
      } else {
        message = `${comm.name} prices grew by ${totalGrowth.toFixed(1)}% with volatility index of ${volatilityIndex.toFixed(1)}%.`;
        highlightType = totalGrowth > 0 ? 'positive' : 'warning';
      }

      // Let's find highest/lowest price in this series
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);

      // Find state variances for state-wise commodities
      let cheapState = null;
      let expState = null;
      if (code === 'gold' || code === 'silver') {
        const stateAverages = await HistoricalPrice.aggregate([
          { $match: { commodityCode: code, purity: filter.purity, weight: filter.weight, state: { $ne: 'National' } } },
          { $group: { _id: '$state', avgPrice: { $avg: '$price' } } },
          { $sort: { avgPrice: 1 } }
        ]);

        if (stateAverages.length > 0) {
          cheapState = { state: stateAverages[0]._id, price: stateAverages[0].avgPrice };
          expState = { state: stateAverages[stateAverages.length - 1]._id, price: stateAverages[stateAverages.length - 1].avgPrice };
        }
      }

      insights.push({
        commodityName: comm.name,
        commodityCode: code,
        accentTheme: comm.accentTheme,
        totalGrowth: totalGrowth.toFixed(1),
        volatility: volatilityIndex.toFixed(1),
        message,
        highlightType,
        minPrice,
        maxPrice,
        cheapestState: cheapState ? cheapState.state : 'N/A',
        cheapestPrice: cheapState ? cheapState.price.toFixed(1) : null,
        expensiveState: expState ? expState.state : 'N/A',
        expensivePrice: expState ? expState.price.toFixed(1) : null
      });
    }

    res.json({ success: true, data: insights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed analytics for a commodity (YoY growth, state ranking, QoQ table)
// @route   GET /api/commodities/:code/analytics
// @access  Public
const getCommodityAnalytics = async (req, res) => {
  try {
    const { code } = req.params;
    const { state, purity, weight } = req.query;

    const commodity = await Commodity.findOne({ code });
    if (!commodity) {
      return res.status(404).json({ success: false, message: 'Commodity not found' });
    }

    // Default filters
    let searchState = state || (code === 'gold' || code === 'silver' ? 'National' : 
                        code === 'platinum' ? 'All India (national average)' : 
                        'All India (Indian Basket, national benchmark)');
    let searchPurity = purity || (code === 'gold' ? '24K' : 
                            code === 'silver' ? '999 (Fine Silver)' : 
                            code === 'platinum' ? '999 (Fine Platinum)' : 
                            'INR per Barrel');
    let searchWeight = weight ? Number(weight) : 10;
    if (code === 'crudeoil') searchWeight = 1;

    // 1. Get complete historical trend line for this selection
    const priceHistory = await HistoricalPrice.find({
      commodityCode: code,
      state: searchState,
      purity: searchPurity,
      weight: searchWeight
    }).sort({ year: 1, quarterNum: 1 });

    // 2. Average, Max, Min
    const prices = priceHistory.map(p => p.price);
    const avgPrice = prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    // 3. Simple moving average (SMA-4)
    const priceHistoryWithSMA = priceHistory.map((p, idx) => {
      let sma = null;
      if (idx >= 3) {
        const slice = prices.slice(idx - 3, idx + 1);
        sma = slice.reduce((a, b) => a + b, 0) / 4;
      }
      return {
        ...p.toObject(),
        sma
      };
    });

    // 4. Regional state-wise ranking (for the latest quarter)
    let stateRanking = [];
    if (code === 'gold' || code === 'silver') {
      const latestRecord = await HistoricalPrice.findOne({ commodityCode: code }).sort({ year: -1, quarterNum: -1 });
      if (latestRecord) {
        stateRanking = await HistoricalPrice.find({
          commodityCode: code,
          quarter: latestRecord.quarter,
          purity: searchPurity,
          weight: searchWeight,
          state: { $ne: 'National' }
        }).sort({ price: 1 }); // Lowest to highest
      }
    }

    res.json({
      success: true,
      data: {
        summary: {
          avgPrice: avgPrice.toFixed(2),
          maxPrice,
          minPrice,
          currentPrice: prices.length > 0 ? prices[prices.length - 1] : 0,
          growthPercent: prices.length >= 2 ? (((prices[prices.length - 1] - prices[0]) / prices[0]) * 100).toFixed(2) : 0
        },
        chartData: priceHistoryWithSMA,
        stateRanking
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lookup historical price based on filters
// @route   GET /api/commodities/:code/lookup
// @access  Public
const lookupPrice = async (req, res) => {
  try {
    const { code } = req.params;
    const { state, quarter, purity, weight } = req.query;

    const query = { commodityCode: code };
    if (state) query.state = state;
    if (purity) query.purity = purity;
    if (weight) query.weight = Number(weight);
    if (quarter) query.quarter = quarter;

    // Find the closest record matching. Sort chronologically to get latest if quarter not specified.
    const priceDoc = await HistoricalPrice.findOne(query).sort({ year: -1, quarterNum: -1 });

    if (!priceDoc) {
      return res.status(404).json({ success: false, message: 'Matching price record not found' });
    }

    res.json({ success: true, data: priceDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCommodities,
  getCommodityFilters,
  getCommodityPrices,
  getMarketOverview,
  getMarketInsights,
  getCommodityAnalytics,
  lookupPrice
};

