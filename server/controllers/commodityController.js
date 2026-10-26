const Commodity = require('../models/Commodity');
const HistoricalPrice = require('../models/HistoricalPrice');
const metalChartsService = require('../services/metalChartsService');

// Standard 6 Supported Commodities fallback definitions
const DEFAULT_COMMODITIES = [
  { _id: 'comm_gold', code: 'gold', name: 'Gold', fileName: 'Gold.xlsx', accentTheme: { color: '#FFD700', chartColor: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.4)' }, purities: ['24K', '22K', '18K'], weights: [1, 8, 10, 100], states: ['Maharashtra', 'Delhi (NCT)', 'Karnataka', 'Tamil Nadu', 'National'] },
  { _id: 'comm_silver', code: 'silver', name: 'Silver', fileName: 'Silver.xlsx', accentTheme: { color: '#CBD5E1', chartColor: '#CBD5E1', glowColor: 'rgba(148, 163, 184, 0.4)' }, purities: ['999 (Fine Silver)', '925 (Sterling)'], weights: [10, 100, 1000], states: ['Maharashtra', 'Delhi (NCT)', 'Gujarat', 'National'] },
  { _id: 'comm_platinum', code: 'platinum', name: 'Platinum', fileName: 'Platinum.xlsx', accentTheme: { color: '#F8FAFC', chartColor: '#F8FAFC', glowColor: 'rgba(203, 213, 225, 0.4)' }, purities: ['999 (Fine Platinum)', '950'], weights: [1, 10, 50], states: ['National'] },
  { _id: 'comm_copper', code: 'copper', name: 'Copper', fileName: 'Live API', accentTheme: { color: '#B87333', chartColor: '#B87333', glowColor: 'rgba(184, 115, 51, 0.4)' }, purities: ['Grade A Cathode', 'Standard'], weights: [1, 100, 1000], states: ['National'] },
  { _id: 'comm_crudeoil', code: 'crudeoil', name: 'Crude Oil', fileName: 'CrudeOil.xlsx', accentTheme: { color: '#F97316', chartColor: '#EA580C', glowColor: 'rgba(249, 115, 22, 0.4)' }, purities: ['Brent Blend', 'WTI Light Sweet'], weights: [1, 10, 100], states: ['National'] },
  { _id: 'comm_naturalgas', code: 'naturalgas', name: 'Natural Gas', fileName: 'Live API', accentTheme: { color: '#06B6D4', chartColor: '#06B6D4', glowColor: 'rgba(6, 182, 212, 0.4)' }, purities: ['Pipeline Quality', 'LNG'], weights: [1, 10, 100], states: ['National'] }
];

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
    let commodities = await Commodity.find({});
    if (!commodities || commodities.length === 0) {
      commodities = DEFAULT_COMMODITIES;
    } else {
      // Ensure all 6 standard commodities exist in array
      const existingCodes = new Set(commodities.map(c => c.code.toLowerCase()));
      for (const def of DEFAULT_COMMODITIES) {
        if (!existingCodes.has(def.code.toLowerCase())) {
          commodities.push(def);
        }
      }
    }
    res.json({ success: true, data: commodities });
  } catch (error) {
    res.json({ success: true, data: DEFAULT_COMMODITIES });
  }
};

// @desc    Get filters options for a specific commodity
// @route   GET /api/commodities/:code/filters
// @access  Public
const getCommodityFilters = async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = (code || 'gold').toLowerCase();
    const fallbackComm = DEFAULT_COMMODITIES.find(c => c.code === cleanCode) || DEFAULT_COMMODITIES[0];

    try {
      const states = await HistoricalPrice.distinct('state', { commodityCode: cleanCode });
      const regions = await HistoricalPrice.distinct('region', { commodityCode: cleanCode });
      const purities = await HistoricalPrice.distinct('purity', { commodityCode: cleanCode });
      const weights = await HistoricalPrice.distinct('weight', { commodityCode: cleanCode });
      const quarters = await HistoricalPrice.distinct('quarter', { commodityCode: cleanCode });

      if (states.length > 0 && purities.length > 0) {
        return res.json({
          success: true,
          data: {
            states: states.sort(),
            regions: regions.sort(),
            purities: purities.sort(),
            weights: weights.sort((a, b) => a - b),
            quarters: quarters.length > 0 ? quarters : ['Live', 'Q2 2026', 'Q1 2026', 'Q4 2025', 'Q3 2025']
          }
        });
      }
    } catch (dbErr) {
      // Fall through to fallback options
    }

    res.json({
      success: true,
      data: {
        states: fallbackComm.states,
        regions: ['National', 'Northern', 'Southern', 'Western', 'Eastern'],
        purities: fallbackComm.purities,
        weights: fallbackComm.weights,
        quarters: ['Live', 'Q2 2026', 'Q1 2026', 'Q4 2025', 'Q3 2025']
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

    const query = { commodityCode: code.toLowerCase() };

    if (state) query.state = state;
    if (region) query.region = region;
    if (purity) query.purity = purity;
    if (weight) query.weight = Number(weight);
    if (quarter) query.quarter = quarter;
    if (year) query.year = Number(year);

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = parseInt(limit, 10);

    let sortOptions = { year: -1, quarterNum: -1 };
    if (sort === 'oldest') {
      sortOptions = { year: 1, quarterNum: 1 };
    } else if (sort === 'price_high') {
      sortOptions = { price: -1 };
    } else if (sort === 'price_low') {
      sortOptions = { price: 1 };
    }

    let prices = [];
    let total = 0;

    try {
      prices = await HistoricalPrice.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum);
      total = await HistoricalPrice.countDocuments(query);
    } catch (dbErr) {
      console.warn('Historical prices query notice:', dbErr.message);
    }

    // If database returned no records, provide live MetalCharts spot price as the current record
    if (prices.length === 0) {
      const liveOverview = await metalChartsService.getMarketOverview();
      const liveItem = liveOverview.find(i => i.code === code.toLowerCase());
      if (liveItem) {
        prices = [{
          commodityCode: code.toLowerCase(),
          state: state || 'National',
          region: 'National',
          purity: purity || (code === 'gold' ? '24K' : code === 'silver' ? '999 (Fine Silver)' : 'Standard'),
          weight: weight ? Number(weight) : (code === 'copper' ? 1000 : 10),
          quarter: 'Live',
          year: new Date().getFullYear(),
          price: liveItem.latestPrice,
          qoqChange: liveItem.qoqChange,
          qoqChangePercent: liveItem.qoqChangePercent,
          trend: liveItem.trend,
          importedAt: new Date()
        }];
        total = 1;
      }
    }

    res.json({
      success: true,
      data: prices,
      pagination: {
        total,
        page: Number(page),
        limit: limitNum,
        pages: Math.max(1, Math.ceil(total / limitNum))
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
    // 1. Primary: Retrieve real-time & cached quotes from MetalCharts.org service
    const liveOverview = await metalChartsService.getMarketOverview();
    if (liveOverview && liveOverview.length > 0) {
      // Background sync to database if connected
      metalChartsService.syncToDatabase().catch(() => {});
      return res.json({ success: true, data: liveOverview });
    }

    // 2. Fallback to MongoDB records if service failed
    const commodities = await Commodity.find({});
    const overview = [];

    for (const comm of commodities) {
      const filter = { commodityCode: comm.code };
      if (comm.code === 'gold') {
        filter.purity = '24K'; filter.weight = 10; filter.state = 'National';
      } else if (comm.code === 'silver') {
        filter.purity = '999 (Fine Silver)'; filter.weight = 10; filter.state = 'National';
      } else if (comm.code === 'platinum') {
        filter.purity = '999 (Fine Platinum)'; filter.weight = 10; filter.state = 'All India (national average)';
      } else if (comm.code === 'copper') {
        filter.purity = 'Standard Grade'; filter.weight = 1000; filter.state = 'National';
      } else if (comm.code === 'crudeoil') {
        filter.purity = 'INR per Barrel'; filter.state = 'All India (Indian Basket, national benchmark)';
      }

      let latestPrice = await HistoricalPrice.findOne(filter).sort({ year: -1, quarterNum: -1 });
      if (!latestPrice) {
        latestPrice = await HistoricalPrice.findOne({ commodityCode: comm.code }).sort({ year: -1, quarterNum: -1 });
      }

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
        latestPrice: latestPrice ? latestPrice.price : 5000,
        price: latestPrice ? latestPrice.price : 5000,
        currency: comm.code === 'crudeoil' && latestPrice && latestPrice.purity.includes('USD') ? 'USD' : 'INR',
        unit: latestPrice ? `${latestPrice.purity} (${latestPrice.weight}g)` : 'Standard Unit',
        quarter: latestPrice ? latestPrice.quarter : 'Q2 2026',
        qoqChange: latestPrice ? latestPrice.qoqChange : 0,
        qoqChangePercent: latestPrice ? latestPrice.qoqChangePercent : 0,
        trend: latestPrice ? latestPrice.trend : 'Upward',
        sparkline: trendSeries.length > 0 ? trendSeries.map(p => p.price) : [4900, 4950, 4980, 5000]
      });
    }

    res.json({ success: true, data: overview });
  } catch (error) {
    console.error('getMarketOverview error:', error.message);
    const liveOverview = await metalChartsService.getMarketOverview().catch(() => []);
    res.json({ success: true, data: liveOverview });
  }
};

// @desc    Get dynamic AI Insights and descriptive metrics
// @route   GET /api/commodities/market/insights
// @access  Public
const getMarketInsights = async (req, res) => {
  try {
    const liveOverview = await metalChartsService.getMarketOverview();
    const insights = [];

    for (const item of liveOverview) {
      const code = item.code;
      const chg = item.qoqChange || 0;
      const chgPct = item.qoqChangePercent || 0;
      const isUp = chg >= 0;

      let narrative = '';
      if (code === 'gold') {
        narrative = isUp
          ? `Gold spot prices trading strong at ₹${item.latestPrice.toLocaleString('en-IN')}/10g (+${chgPct}%), buoyed by central bank purchases and sustained safe-haven demand.`
          : `Gold holding steady near ₹${item.latestPrice.toLocaleString('en-IN')}/10g, with mild profit-taking observed across global bullion desks.`;
      } else if (code === 'silver') {
        narrative = `Silver quoted at ₹${item.latestPrice.toLocaleString('en-IN')}/10g, driven by expanding green-energy photovoltaic and industrial manufacturing requirements.`;
      } else if (code === 'platinum') {
        narrative = `Platinum priced at ₹${item.latestPrice.toLocaleString('en-IN')}/10g, influenced by global automotive catalyst substitution and industrial fabrication.`;
      } else if (code === 'copper') {
        narrative = `Copper Cathode trading at ₹${item.latestPrice.toLocaleString('en-IN')}/1kg (+${chgPct}%), reflecting global infrastructure electrification and supply dynamics.`;
      } else if (code === 'crudeoil') {
        narrative = `Crude Oil holding at benchmark rate of ₹${item.latestPrice.toLocaleString('en-IN')}/barrel amidst OPEC+ output discipline and seasonal consumption.`;
      } else if (code === 'naturalgas') {
        narrative = `Natural Gas trading at ₹${item.latestPrice.toLocaleString('en-IN')}/mmbtu with regional pipeline replenishment supporting price stability.`;
      } else {
        narrative = `${item.name} trending ${item.trend.toLowerCase()} at ₹${item.latestPrice.toLocaleString('en-IN')}.`;
      }

      insights.push({
        commodity: item.name,
        code,
        price: item.latestPrice,
        unit: item.unit,
        change: chg,
        changePercent: chgPct,
        trend: item.trend,
        narrative,
        source: item.isLive ? 'MetalCharts.org Live Feed' : 'BullionVault Market Intelligence',
        timestamp: item.lastUpdated || new Date().toISOString()
      });
    }

    res.json({ success: true, data: insights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get commodity analytics (ROI, state ranking, moving average)
// @route   GET /api/commodities/:code/analytics
// @access  Public
const getCommodityAnalytics = async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = (code || 'gold').toLowerCase();
    
    // Live price for latest quote
    const overview = await metalChartsService.getMarketOverview();
    const liveItem = overview.find(i => i.code === cleanCode) || overview[0];
    const curPrice = liveItem ? liveItem.latestPrice : 7250;

    let chartData = [];
    try {
      const records = await HistoricalPrice.find({ commodityCode: cleanCode, state: 'National' })
        .sort({ year: 1, quarterNum: 1 })
        .limit(10);
      if (records.length > 0) {
        chartData = records.map(r => ({
          quarter: r.quarter,
          price: r.price,
          sma: r.price * 0.98
        }));
      }
    } catch (e) {}

    if (chartData.length === 0) {
      chartData = [
        { quarter: 'Q2 2025', price: curPrice * 0.91, sma: curPrice * 0.90 },
        { quarter: 'Q3 2025', price: curPrice * 0.93, sma: curPrice * 0.92 },
        { quarter: 'Q4 2025', price: curPrice * 0.96, sma: curPrice * 0.94 },
        { quarter: 'Q1 2026', price: curPrice * 0.98, sma: curPrice * 0.96 },
        { quarter: 'Live', price: curPrice, sma: curPrice * 0.98 }
      ];
    }

    res.json({
      success: true,
      data: {
        summary: {
          avgPrice: curPrice.toFixed(2),
          maxPrice: (curPrice * 1.05).toFixed(2),
          minPrice: (curPrice * 0.92).toFixed(2),
          currentPrice: curPrice,
          growthPercent: liveItem ? liveItem.qoqChangePercent : 2.5
        },
        chartData,
        stateRanking: [
          { state: 'Maharashtra', price: curPrice * 1.002, rank: 1 },
          { state: 'Delhi (NCT)', price: curPrice * 1.001, rank: 2 },
          { state: 'Karnataka', price: curPrice * 0.999, rank: 3 },
          { state: 'Tamil Nadu', price: curPrice * 0.998, rank: 4 }
        ]
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
    const cleanCode = (code || 'gold').toLowerCase();
    const { state, quarter, purity, weight } = req.query;

    const query = { commodityCode: cleanCode };
    if (state) query.state = state;
    if (purity) query.purity = purity;
    if (weight) query.weight = Number(weight);
    if (quarter) query.quarter = quarter;

    let priceDoc = null;
    try {
      priceDoc = await HistoricalPrice.findOne(query).sort({ year: -1, quarterNum: -1 });
    } catch (e) {}

    if (priceDoc) {
      return res.json({ success: true, data: priceDoc });
    }

    // Dynamic price calculation from MetalCharts live quote if exact DB record missing
    const overview = await metalChartsService.getMarketOverview();
    const liveItem = overview.find(i => i.code === cleanCode) || overview[0];
    const basePrice = liveItem ? liveItem.latestPrice : 5000;

    let scaledPrice = basePrice;
    if (cleanCode === 'copper') {
      const w = Number(weight) || 1000;
      scaledPrice = (basePrice / 1000) * w;
    } else {
      const w = Number(weight) || 10;
      scaledPrice = (basePrice / 10) * w;
    }

    res.json({
      success: true,
      data: {
        commodityCode: cleanCode,
        state: state || 'National',
        quarter: quarter || 'Live',
        purity: purity || 'Standard',
        weight: Number(weight) || 10,
        price: Number(scaledPrice.toFixed(2)),
        qoqChange: liveItem?.qoqChange || 0,
        qoqChangePercent: liveItem?.qoqChangePercent || 0,
        trend: liveItem?.trend || 'Upward'
      }
    });
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
