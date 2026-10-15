const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      'portfolio',
      'portfolio_valuation',
      'investment',
      'historical',
      'analytics',
      'commodity_exposure',
      'inventory_report',
      'inventory',
      'purchase_report',
      'sales_report',
      'pnl_report',
      'risk_report',
      'monthly_performance'
    ],
    required: true,
  },
  format: {
    type: String,
    enum: ['official_printable', 'pdf', 'html', 'excel', 'xlsx', 'csv'],
    default: 'official_printable',
    required: true,
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed,
  },
  fileUrl: {
    type: String,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Report', reportSchema);
