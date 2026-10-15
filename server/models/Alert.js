const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: ['price_threshold', 'price_movement', 'inventory_stock', 'portfolio_loss', 'portfolio_concentration'],
    default: 'price_threshold',
    required: true,
  },
  commodityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commodity',
    required: false,
  },
  commodityCode: {
    type: String,
    required: false,
  },
  state: {
    type: String,
    required: false,
  },
  purity: {
    type: String,
    required: false,
  },
  weight: {
    type: Number,
    required: false,
  },
  type: { // For price alerts: 'above' / 'below'
    type: String,
    required: false,
  },
  thresholdValue: { // Can be price limit, % change, stock count limit, loss limit, concentration %
    type: Number,
    required: true,
  },
  isTriggered: {
    type: Boolean,
    default: false,
  },
  triggeredAt: {
    type: Date,
  },
  message: {
    type: String,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Alert', alertSchema);
