const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  commodityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commodity',
    required: true,
  },
  commodityCode: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  purity: {
    type: String,
    required: true,
  },
  weight: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['above', 'below'],
    required: true,
  },
  thresholdPrice: {
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
}, {
  timestamps: true,
});

module.exports = mongoose.model('Alert', alertSchema);
