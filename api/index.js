const app = require('../server/app');
const connectDB = require('../server/config/db');

/**
 * Vercel Serverless Function Handler
 * Routes all /api/* requests to Express app with cached database connection.
 */
module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.warn('Vercel serverless DB connection notice:', err.message);
  }
  return app(req, res);
};
