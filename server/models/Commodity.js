const mongoose = require('mongoose');

const commoditySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  accentTheme: {
    color: { type: String, default: '#FFD700' },
    bgGradient: { type: String, default: 'linear-gradient(135deg, #FFE259 0%, #FFA751 100%)' },
    chartColor: { type: String, default: '#FFD700' },
    glowColor: { type: String, default: 'rgba(255, 215, 0, 0.4)' },
  },
  purities: [{
    type: String,
  }],
  weights: [{
    type: Number,
  }],
  states: [{
    type: String,
  }],
  regions: [{
    type: String,
  }],
  lastImportedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Commodity', commoditySchema);
