const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['portfolio', 'investment', 'historical', 'analytics'],
    required: true,
  },
  format: {
    type: String,
    enum: ['pdf', 'excel', 'csv'],
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
