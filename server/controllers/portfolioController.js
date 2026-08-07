const Investment = require('../models/Investment');
const HistoricalPrice = require('../models/HistoricalPrice');
const Commodity = require('../models/Commodity');

// Helper to look up latest price for an investment
const getLatestPrice = async (investment) => {
  const latestPriceDoc = await HistoricalPrice.findOne({
    commodityCode: investment.commodityCode,
    state: investment.state,
    purity: investment.purity,
    weight: investment.weight
  }).sort({ year: -1, quarterNum: -1 });

  return latestPriceDoc ? latestPriceDoc.price : null;
};

// @desc    Get user investments
// @route   GET /api/portfolio
// @access  Private
const getInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({ userId: req.user.id }).populate('commodityId');
    const investmentsWithCurrentPrice = [];

    for (const inv of investments) {
      const curPrice = await getLatestPrice(inv);
      const invObj = inv.toObject();
      invObj.currentPrice = curPrice || inv.purchasePrice;
      invObj.currentValue = invObj.currentPrice * inv.quantity;
      invObj.investedValue = inv.purchasePrice * inv.quantity;
      invObj.profit = invObj.currentValue - invObj.investedValue;
      invObj.growthPercent = invObj.investedValue > 0 ? ((invObj.profit / invObj.investedValue) * 100) : 0;
      investmentsWithCurrentPrice.push(invObj);
    }

    res.json({ success: true, data: investmentsWithCurrentPrice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add investment
// @route   POST /api/portfolio
// @access  Private
const addInvestment = async (req, res) => {
  try {
    const { commodityId, state, purity, weight, quantity, purchaseDate, purchaseQuarter, purchaseYear, purchasePrice } = req.body;

    if (!commodityId || !state || !purity || !quantity || !purchaseQuarter || !purchaseYear || !purchasePrice) {
      return res.status(400).json({ success: false, message: 'Please add all required fields' });
    }

    const commodity = await Commodity.findById(commodityId);
    if (!commodity) {
      return res.status(404).json({ success: false, message: 'Commodity not found' });
    }

    const investment = await Investment.create({
      userId: req.user.id,
      commodityId,
      commodityCode: commodity.code,
      state,
      purity,
      weight: Number(weight) || 1,
      quantity: Number(quantity),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      purchaseQuarter,
      purchaseYear: Number(purchaseYear),
      purchasePrice: Number(purchasePrice),
      currentPrice: Number(purchasePrice), // Initial setup
      currentPriceFetchedAt: new Date()
    });

    res.status(201).json({ success: true, data: investment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete investment
// @route   DELETE /api/portfolio/:id
// @access  Private
const deleteInvestment = async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);

    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }

    // Ensure user owns investment
    if (investment.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await investment.deleteOne();
    res.json({ success: true, message: 'Investment removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user portfolio statistics
// @route   GET /api/portfolio/stats
// @access  Private
const getPortfolioStats = async (req, res) => {
  try {
    const investments = await Investment.find({ userId: req.user.id });

    if (investments.length === 0) {
      return res.json({
        success: true,
        data: {
          totalValue: 0,
          totalInvested: 0,
          totalProfit: 0,
          roi: 0,
          allocations: [],
          performance: {
            best: null,
            worst: null,
            highestValue: null,
            latest: null
          },
          timeline: []
        }
      });
    }

    let totalValue = 0;
    let totalInvested = 0;
    const commodityGroups = {};

    const evaluatedInvestments = [];
    let latestInvestment = null;

    for (const inv of investments) {
      const curPrice = await getLatestPrice(inv);
      const currentPrice = curPrice !== null ? curPrice : inv.purchasePrice;
      const currentValue = currentPrice * inv.quantity;
      const investedValue = inv.purchasePrice * inv.quantity;
      const profit = currentValue - investedValue;

      totalValue += currentValue;
      totalInvested += investedValue;

      // Track latest investment chronologically
      if (!latestInvestment || new Date(inv.purchaseDate) > new Date(latestInvestment.purchaseDate)) {
        latestInvestment = inv;
      }

      // Dynamic grouping for allocations
      if (!commodityGroups[inv.commodityCode]) {
        commodityGroups[inv.commodityCode] = {
          code: inv.commodityCode,
          invested: 0,
          currentValue: 0,
          profit: 0
        };
      }
      commodityGroups[inv.commodityCode].invested += investedValue;
      commodityGroups[inv.commodityCode].currentValue += currentValue;
      commodityGroups[inv.commodityCode].profit += profit;

      evaluatedInvestments.push({
        _id: inv._id,
        commodityCode: inv.commodityCode,
        quantity: inv.quantity,
        currentValue,
        investedValue,
        profit,
        purchaseDate: inv.purchaseDate
      });
    }

    const totalProfit = totalValue - totalInvested;
    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    // Build allocation percentages
    const allocations = [];
    for (const [code, val] of Object.entries(commodityGroups)) {
      allocations.push({
        commodity: code.charAt(0).toUpperCase() + code.slice(1),
        code: code,
        value: val.currentValue,
        percentage: totalValue > 0 ? ((val.currentValue / totalValue) * 100).toFixed(1) : 0,
        roi: val.invested > 0 ? ((val.profit / val.invested) * 100).toFixed(1) : 0
      });
    }

    // Determine performance ranks
    const sortedPerformers = [...allocations].sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
    const best = sortedPerformers.length > 0 ? sortedPerformers[0] : null;
    const worst = sortedPerformers.length > 1 ? sortedPerformers[sortedPerformers.length - 1] : null;

    const highestValue = [...evaluatedInvestments].sort((a, b) => b.currentValue - a.currentValue)[0];

    // Timeline creation - group by purchase quarter/year to show growth history
    const timelineMap = {};
    for (const inv of investments) {
      const key = `${inv.purchaseYear}-${inv.purchaseQuarter}`;
      if (!timelineMap[key]) {
        timelineMap[key] = {
          year: inv.purchaseYear,
          quarter: inv.purchaseQuarter,
          invested: 0,
          currentValue: 0
        };
      }
      const curPrice = await getLatestPrice(inv);
      timelineMap[key].invested += (inv.purchasePrice * inv.quantity);
      timelineMap[key].currentValue += ((curPrice || inv.purchasePrice) * inv.quantity);
    }

    // Sort timeline chronologically
    const timeline = Object.values(timelineMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.quarter.localeCompare(b.quarter);
    });

    res.json({
      success: true,
      data: {
        totalValue: parseFloat(totalValue.toFixed(2)),
        totalInvested: parseFloat(totalInvested.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        roi: parseFloat(roi.toFixed(2)),
        allocations,
        performance: {
          best,
          worst,
          highestValue: highestValue ? {
            id: highestValue._id,
            commodity: highestValue.commodityCode,
            value: highestValue.currentValue
          } : null,
          latest: latestInvestment ? {
            id: latestInvestment._id,
            commodity: latestInvestment.commodityCode,
            purchaseDate: latestInvestment.purchaseDate,
            invested: latestInvestment.purchasePrice * latestInvestment.quantity
          } : null
        },
        timeline
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getInvestments,
  addInvestment,
  deleteInvestment,
  getPortfolioStats
};
