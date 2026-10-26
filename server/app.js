const path = require('path');
// Ensure local .env in server folder is loaded in development
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Non-blocking database connection attempt on request
let dbAttempted = false;
app.use((req, res, next) => {
  if (!dbAttempted) {
    dbAttempted = true;
    connectDB().catch((err) => {
      console.warn('Initial DB connection attempt notice:', err.message);
    });
  }
  next();
});

// Serve static directories for downloadable assets if available
app.use('/reports', express.static(path.join(__dirname, '../reports')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    serverless: Boolean(process.env.VERCEL || process.env.NOW_REGION)
  });
});

// Mount API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/commodities', require('./routes/commodityRoutes'));
app.use('/api/portfolio', require('./routes/portfolioRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/watchlist', require('./routes/watchlistRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));

// 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
