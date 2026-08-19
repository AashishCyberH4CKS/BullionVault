require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { runImportEngine } = require('./services/importEngine');
const { startLivePriceService } = require('./services/livePriceService');
const SystemLog = require('./models/SystemLog');

const app = express();

// Connect to Database
connectDB().then(async () => {
  console.log('Database connected successfully.');
  
  // Trigger Excel Import Engine automatically on startup
  try {
    const importResults = await runImportEngine();
    console.log(`Startup import succeeded: Processed ${importResults.length} workbooks.`);
    
    // Initialize Live Price Service to seed copper and fetch real-time prices
    await startLivePriceService();
    console.log('Live Price Service initialized.');
  } catch (error) {
    console.error('Import Engine / Live Price Service failed on startup:', error.message);
    await SystemLog.create({
      type: 'error',
      message: 'Failed to run Import Engine / Live Price Service on server startup',
      details: error.message
    });
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static directories for downloadable assets
app.use('/reports', express.static(path.join(__dirname, '../reports')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/commodities', require('./routes/commodityRoutes'));
app.use('/api/portfolio', require('./routes/portfolioRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/watchlist', require('./routes/watchlistRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
