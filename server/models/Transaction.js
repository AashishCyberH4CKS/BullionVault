const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['purchase', 'sale'],
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
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
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true,
    default: 'g',
  },
  price: {
    type: Number,
    required: true,
  },
  fees: {
    type: Number,
    default: 0,
  },
  totalValue: {
    type: Number,
    required: true,
  },
  counterparty: {
    type: String,
    required: true, // Supplier for purchases, Client for sales
    trim: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true, // Warehouse or branch name
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', transactionSchema);
