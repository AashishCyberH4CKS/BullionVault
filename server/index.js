require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { runImportEngine } = require('./services/importEngine');
const SystemLog = require('./models/SystemLog');

// Connect to Database and run seeding on standalone startup
connectDB().then(async () => {
  console.log('Database connected successfully.');
  
  // Trigger Excel Import Engine automatically on startup if in development
  try {
    const importResults = await runImportEngine();
    console.log(`Startup import succeeded: Processed ${importResults.length} workbooks.`);
    
    // Seed B2B SaaS demo data
    const { seedB2BData } = require('./services/b2bSeeder');
    await seedB2BData();
  } catch (error) {
    console.warn('Import Engine / Seeder notice on startup:', error.message);
  }
}).catch((err) => {
  console.warn('Database initialization warning on startup:', err.message);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`BullionVault Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
