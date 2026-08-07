const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
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
}, {
  timestamps: true,
});

// Ensure a user can watchlist a commodity only once
watchlistSchema.index({ userId: 1, commodityId: 1 }, { unique: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
