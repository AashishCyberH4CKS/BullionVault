const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bullionvault';
    
    try {
      console.log(`Connecting to MongoDB at: ${mongoUri}`);
      // Try to connect with a short selection timeout (3 seconds)
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      console.log(`MongoDB Connected successfully to local database.`);
    } catch (localError) {
      console.warn(`Local MongoDB connection failed (${localError.message}).`);
      console.log('Initiating fallback to In-Memory MongoDB Server...');
      
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      
      console.log(`In-Memory MongoDB Server running at: ${mongoUri}`);
      await mongoose.connect(mongoUri);
      console.log('MongoDB Connected to In-Memory Database.');
      
      // Store the server instance globally to handle clean shutdown
      global.__MONGOD__ = mongod;
    }
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
