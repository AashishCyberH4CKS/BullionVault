const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a company name'],
    unique: true,
    trim: true,
  },
  industry: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    default: 'India',
  },
  currency: {
    type: String,
    default: 'INR',
  },
  contactInfo: {
    type: String,
  },
  logo: {
    type: String,
    default: '/logo.png',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Company', companySchema);
