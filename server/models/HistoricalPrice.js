const mongoose = require('mongoose');

const historicalPriceSchema = new mongoose.Schema({
  commodityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commodity',
    required: true,
  },
  commodityCode: {
    type: String,
    required: true,
    index: true,
  },
  state: {
    type: String,
    required: true,
    index: true,
  },
  region: {
    type: String,
    default: 'National',
    index: true,
  },
  quarter: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
    index: true,
  },
  quarterNum: {
    type: Number,
    required: true,
  },
  purity: {
    type: String,
    default: 'Standard',
    index: true,
  },
  weight: {
    type: Number,
    default: 1,
    index: true,
  },
  price: {
    type: Number,
    required: true,
  },
  qoqChange: {
    type: Number,
    default: null,
  },
  qoqChangePercent: {
    type: Number,
    default: null,
  },
  trend: {
    type: String,
    default: 'Base quarter',
  },
  importedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique index to prevent duplicate imports
historicalPriceSchema.index(
  { commodityCode: 1, state: 1, quarter: 1, purity: 1, weight: 1 },
  { unique: true }
);

module.exports = mongoose.model('HistoricalPrice', historicalPriceSchema);
