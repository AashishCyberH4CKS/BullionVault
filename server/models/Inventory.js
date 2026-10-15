const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
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
    index: true,
  },
  purity: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
  },
  unit: {
    type: String,
    required: true,
    default: 'g',
  },
  location: {
    type: String,
    required: true,
    index: true,
  },
  warehouse: {
    type: String,
    required: true,
  },
  batchNumber: {
    type: String,
    required: true,
    unique: true,
  },
  purchaseDate: {
    type: Date,
    required: true,
  },
  purchasePrice: {
    type: Number,
    required: true,
  },
  currentValue: {
    type: Number,
    required: true,
    default: 0,
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Dispatched'],
    default: 'In Stock',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Inventory', inventorySchema);
