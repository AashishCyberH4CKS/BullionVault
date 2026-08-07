const Alert = require('../models/Alert');
const HistoricalPrice = require('../models/HistoricalPrice');
const Commodity = require('../models/Commodity');

// @desc    Get user alerts
// @route   GET /api/alerts
// @access  Private
const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user.id }).populate('commodityId');
    
    // Evaluate if any alert is triggered by checking latest price
    const evaluatedAlerts = [];
    for (const alert of alerts) {
      const latestPriceDoc = await HistoricalPrice.findOne({
        commodityCode: alert.commodityCode,
        state: alert.state,
        purity: alert.purity,
        weight: alert.weight
      }).sort({ year: -1, quarterNum: -1 });

      const alertObj = alert.toObject();
      alertObj.currentPrice = latestPriceDoc ? latestPriceDoc.price : 0;
      
      // Check trigger status dynamically (as well as persisting if triggered)
      if (latestPriceDoc && !alert.isTriggered) {
        const price = latestPriceDoc.price;
        if (alert.type === 'above' && price >= alert.thresholdPrice) {
          alert.isTriggered = true;
          alert.triggeredAt = new Date();
          await alert.save();
          alertObj.isTriggered = true;
          alertObj.triggeredAt = alert.triggeredAt;
        } else if (alert.type === 'below' && price <= alert.thresholdPrice) {
          alert.isTriggered = true;
          alert.triggeredAt = new Date();
          await alert.save();
          alertObj.isTriggered = true;
          alertObj.triggeredAt = alert.triggeredAt;
        }
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
    const { commodityId, state, purity, weight, type, thresholdPrice } = req.body;

    if (!commodityId || !state || !purity || !type || !thresholdPrice) {
      return res.status(400).json({ success: false, message: 'Please add all required fields' });
    }

    const commodity = await Commodity.findById(commodityId);
    if (!commodity) {
      return res.status(404).json({ success: false, message: 'Commodity not found' });
    }

    const alert = await Alert.create({
      userId: req.user.id,
      commodityId,
      commodityCode: commodity.code,
      state,
      purity,
      weight: Number(weight) || 1,
      type,
      thresholdPrice: Number(thresholdPrice),
      isTriggered: false
    });

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

    if (alert.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
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
