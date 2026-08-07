const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  purchaseDate: {
    type: Date,
    required: true,
  },
  purchaseQuarter: {
    type: String,
    required: true,
  },
  purchaseYear: {
    type: Number,
    required: true,
  },
  purchasePrice: {
    type: Number,
    required: true,
  },
  currentPrice: {
    type: Number,
    default: 0,
  },
  currentPriceFetchedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Investment', investmentSchema);
