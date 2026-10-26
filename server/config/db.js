const mongoose = require('mongoose');

// Reduce buffer timeout so unbuffered queries fail fast to fallbacks if MongoDB is not connected
mongoose.set('bufferTimeoutMS', 1000);

// Cache database connection state across serverless warm invocations
let isConnecting = false;

const connectDB = async () => {
  // If already connected, reuse existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If already connecting, avoid duplicate parallel connection attempts
  if (isConnecting) {
    return null;
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.info('No MONGO_URI / MONGODB_URI configured in environment. Using in-memory / Firestore fallback.');
    return null;
  }

  isConnecting = true;

  try {
    // Attempt standard connection with 2-second timeout to avoid serverless latency
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    console.log('MongoDB connected successfully.');
    return mongoose.connection;
  } catch (err) {
    console.warn('MongoDB connection notice (operating with resilient fallback):', err.message);
    return null;
  } finally {
    isConnecting = false;
  }
};

module.exports = connectDB;
