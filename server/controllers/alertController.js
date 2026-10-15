const Alert = require('../models/Alert');
const HistoricalPrice = require('../models/HistoricalPrice');
const Commodity = require('../models/Commodity');
const Inventory = require('../models/Inventory');
const Investment = require('../models/Investment');

// @desc    Get user alerts
// @route   GET /api/alerts
// @access  Private
const getAlerts = async (req, res) => {
  try {
    const query = req.user.companyId 
      ? { companyId: req.user.companyId } 
      : { userId: req.user.id };
      
    const alerts = await Alert.find(query).populate('commodityId');
    const evaluatedAlerts = [];

    // Retrieve portfolio details once for stats checking (concentration/loss)
    const investments = req.user.companyId
      ? await Investment.find({ companyId: req.user.companyId })
      : await Investment.find({ userId: req.user.id });

    let totalPortfolioValue = 0;
    let totalInvested = 0;
    const commodityValues = {};

    for (const inv of investments) {
      const latestPriceDoc = await HistoricalPrice.findOne({
        commodityCode: inv.commodityCode,
        state: inv.state,
        purity: inv.purity,
        weight: inv.weight
      }).sort({ year: -1, quarterNum: -1 });

      const price = latestPriceDoc ? latestPriceDoc.price : inv.purchasePrice;
      const currentValue = price * inv.quantity;
      const investedValue = inv.purchasePrice * inv.quantity;

      totalPortfolioValue += currentValue;
      totalInvested += investedValue;

      if (!commodityValues[inv.commodityCode]) {
        commodityValues[inv.commodityCode] = 0;
      }
      commodityValues[inv.commodityCode] += currentValue;
    }

    const overallLossPercent = totalInvested > 0 
      ? ((totalInvested - totalPortfolioValue) / totalInvested) * 100 
      : 0;

    for (const alert of alerts) {
      const alertObj = alert.toObject();
      alertObj.currentPrice = 0; // Default

      let shouldTrigger = false;
      let triggerMsg = '';

      if (alert.category === 'price_threshold' || !alert.category) {
        // Evaluate price threshold
        const latestPriceDoc = await HistoricalPrice.findOne({
          commodityCode: alert.commodityCode,
          state: alert.state || 'National',
          purity: alert.purity,
          weight: alert.weight || 1
        }).sort({ year: -1, quarterNum: -1 });

        if (latestPriceDoc) {
          const price = latestPriceDoc.price;
          alertObj.currentPrice = price;

          if (alert.type === 'above' && price >= alert.thresholdValue) {
            shouldTrigger = true;
            triggerMsg = `${alert.commodityCode.toUpperCase()} price rose above threshold ₹${alert.thresholdValue} (Current: ₹${price})`;
          } else if (alert.type === 'below' && price <= alert.thresholdValue) {
            shouldTrigger = true;
            triggerMsg = `${alert.commodityCode.toUpperCase()} price fell below threshold ₹${alert.thresholdValue} (Current: ₹${price})`;
          }
        }
      } else if (alert.category === 'price_movement') {
        // Evaluate price movement
        const latestPriceDoc = await HistoricalPrice.findOne({
          commodityCode: alert.commodityCode
        }).sort({ year: -1, quarterNum: -1 });

        if (latestPriceDoc && latestPriceDoc.qoqChangePercent !== null) {
          const change = Math.abs(latestPriceDoc.qoqChangePercent);
          if (change >= alert.thresholdValue) {
            shouldTrigger = true;
            triggerMsg = `${alert.commodityCode.toUpperCase()} registered a large quarterly movement of ${latestPriceDoc.qoqChangePercent}% (Threshold: ${alert.thresholdValue}%)`;
          }
        }
      } else if (alert.category === 'inventory_stock') {
        // Evaluate stock count
        const stockItems = await Inventory.find({
          companyId: req.user.companyId,
          commodityCode: alert.commodityCode
        });
        const totalStock = stockItems.reduce((acc, curr) => acc + curr.quantity, 0);
        
        if (totalStock <= alert.thresholdValue) {
          shouldTrigger = true;
          triggerMsg = `Low stock alert: Total inventory for ${alert.commodityCode.toUpperCase()} is ${totalStock} units (Threshold limit: ${alert.thresholdValue})`;
        }
      } else if (alert.category === 'portfolio_loss') {
        // Evaluate portfolio overall loss threshold
        if (overallLossPercent >= alert.thresholdValue) {
          shouldTrigger = true;
          triggerMsg = `Portfolio loss threshold exceeded: Total loss of ${overallLossPercent.toFixed(1)}% detected (Threshold limit: ${alert.thresholdValue}%)`;
        }
      } else if (alert.category === 'portfolio_concentration') {
        // Evaluate concentration of target commodity
        const commVal = commodityValues[alert.commodityCode] || 0;
        const concentration = totalPortfolioValue > 0 ? (commVal / totalPortfolioValue) * 100 : 0;
        
        if (concentration >= alert.thresholdValue) {
          shouldTrigger = true;
          triggerMsg = `High concentration detected: ${alert.commodityCode.toUpperCase()} represents ${concentration.toFixed(1)}% of total portfolio value (Threshold limit: ${alert.thresholdValue}%)`;
        }
      }

      if (shouldTrigger && !alert.isTriggered) {
        alert.isTriggered = true;
        alert.triggeredAt = new Date();
        alert.message = triggerMsg;
        await alert.save();
        
        alertObj.isTriggered = true;
        alertObj.triggeredAt = alert.triggeredAt;
        alertObj.message = triggerMsg;
      }

      evaluatedAlerts.push(alertObj);
    }

    res.json({ success: true, data: evaluatedAlerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create price alert
// @route   POST /api/alerts
// @access  Private
const createAlert = async (req, res) => {
  try {
    const { category, commodityId, commodityCode, state, purity, weight, type, thresholdValue } = req.body;

    if (!category || !thresholdValue) {
      return res.status(400).json({ success: false, message: 'Please add alert category and threshold value' });
    }

    const alertData = {
      companyId: req.user.companyId,
      userId: req.user.id,
      category,
      thresholdValue: Number(thresholdValue),
      isTriggered: false
    };

    if (commodityId) {
      const commodity = await Commodity.findById(commodityId);
      if (commodity) {
        alertData.commodityId = commodityId;
        alertData.commodityCode = commodity.code;
      }
    } else if (commodityCode) {
      const commodity = await Commodity.findOne({ code: commodityCode });
      if (commodity) {
        alertData.commodityId = commodity._id;
        alertData.commodityCode = commodityCode;
      }
    }

    if (state) alertData.state = state;
    if (purity) alertData.purity = purity;
    if (weight) alertData.weight = Number(weight);
    if (type) alertData.type = type;

    const alert = await Alert.create(alertData);
    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete price alert
// @route   DELETE /api/alerts/:id
// @access  Private
const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    // Tenant / User ownership check
    if (alert.companyId && req.user.companyId) {
      if (alert.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
    } else {
      if (alert.userId.toString() !== req.user.id) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
      }
    }

    await alert.deleteOne();
    res.json({ success: true, message: 'Alert deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAlerts,
  createAlert,
  deleteAlert
};
