const Company = require('../models/Company');
const Commodity = require('../models/Commodity');
const Inventory = require('../models/Inventory');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const Alert = require('../models/Alert');
const SystemLog = require('../models/SystemLog');
const User = require('../models/User');

const seedB2BData = async () => {
  try {
    console.log('Checking and seeding B2B SaaS demo data...');

    // 1. Create or Find default B2B company
    let company = await Company.findOne({ name: 'Atlas Bullion & Commodities Pvt. Ltd.' });
    if (!company) {
      company = await Company.create({
        name: 'Atlas Bullion & Commodities Pvt. Ltd.',
        industry: 'Bullion Trading & Asset Management',
        country: 'India',
        currency: 'INR',
        contactInfo: 'support@atlasbullion.com',
        logo: '/logo.png'
      });
      console.log('Default B2B Company created.');
    }

    // Associate any existing users with no company to this company
    const unassociatedUsers = await User.find({ companyId: { $exists: false } });
    for (const u of unassociatedUsers) {
      u.companyId = company._id;
      if (u.role === 'admin' || u.role === 'user') {
        u.role = u.role === 'admin' ? 'super_admin' : 'company_admin';
      }
      await u.save();
    }

    // Get any valid admin user to assign as creator for holdings
    let defaultUser = await User.findOne({ companyId: company._id });
    if (!defaultUser) {
      // Create a dummy admin user if none exists
      defaultUser = await User.create({
        name: 'Enterprise Admin',
        email: 'admin@atlasbullion.com',
        role: 'super_admin',
        companyId: company._id,
        settings: { themePreference: 'gold', notificationsEnabled: true }
      });
      console.log('Default Enterprise Admin created.');
    }

    // Look up commodities
    const gold = await Commodity.findOne({ code: 'gold' });
    const silver = await Commodity.findOne({ code: 'silver' });
    const platinum = await Commodity.findOne({ code: 'platinum' });
    const copper = await Commodity.findOne({ code: 'copper' });
    const crudeoil = await Commodity.findOne({ code: 'crudeoil' });

    if (!gold || !silver) {
      console.warn('Commodities not seeded yet. Skipping B2B data seed.');
      return;
    }

    // 2. Seed Portfolio Holdings (Investments)
    const holdingsCount = await Investment.countDocuments({ companyId: company._id });
    if (holdingsCount === 0) {
      await Investment.create([
        {
          userId: defaultUser._id,
          companyId: company._id,
          commodityId: gold._id,
          commodityCode: 'gold',
          state: 'National',
          purity: '24K',
          weight: 10,
          quantity: 12, // 120g
          purchaseDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          purchaseQuarter: 'Q2',
          purchaseYear: 2026,
          purchasePrice: 65000,
          currentPrice: 72000
        },
        {
          userId: defaultUser._id,
          companyId: company._id,
          commodityId: silver._id,
          commodityCode: 'silver',
          state: 'National',
          purity: '999 (Fine Silver)',
          weight: 1000, // 1kg
          quantity: 5, // 5kg
          purchaseDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          purchaseQuarter: 'Q2',
          purchaseYear: 2026,
          purchasePrice: 80000,
          currentPrice: 85000
        },
        {
          userId: defaultUser._id,
          companyId: company._id,
          commodityId: platinum._id,
          commodityCode: 'platinum',
          state: 'All India (national average)',
          purity: '999 (Fine Platinum)',
          weight: 10, // 10g
          quantity: 5, // 50g
          purchaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          purchaseQuarter: 'Q3',
          purchaseYear: 2026,
          purchasePrice: 32000,
          currentPrice: 34000
        },
        {
          userId: defaultUser._id,
          companyId: company._id,
          commodityId: copper._id,
          commodityCode: 'copper',
          state: 'National',
          purity: 'Standard Grade',
          weight: 1000, // 1kg
          quantity: 2000, // 2000kg (2 Tons)
          purchaseDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          purchaseQuarter: 'Q3',
          purchaseYear: 2026,
          purchasePrice: 850,
          currentPrice: 910
        }
      ]);
      console.log('B2B Portfolio Holdings seeded.');
    }

    // 3. Seed Inventory items
    const inventoryCount = await Inventory.countDocuments({ companyId: company._id });
    if (inventoryCount === 0) {
      await Inventory.create([
        {
          companyId: company._id,
          commodityId: gold._id,
          commodityCode: 'gold',
          purity: '24K',
          quantity: 80, // 80g
          unit: 'g',
          location: 'Mumbai Office',
          warehouse: 'Mumbai Vault A',
          batchNumber: 'BATCH-AU-24K-890',
          purchaseDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          purchasePrice: 6500,
          currentValue: 576000,
          status: 'In Stock'
        },
        {
          companyId: company._id,
          commodityId: gold._id,
          commodityCode: 'gold',
          purity: '22K',
          quantity: 8, // 8g (Low stock item)
          unit: 'g',
          location: 'Delhi Office',
          warehouse: 'Delhi Vault B',
          batchNumber: 'BATCH-AU-22K-412',
          purchaseDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          purchasePrice: 5950,
          currentValue: 52000,
          status: 'Low Stock'
        },
        {
          companyId: company._id,
          commodityId: silver._id,
          commodityCode: 'silver',
          purity: '999 (Fine Silver)',
          quantity: 3, // 3kg
          unit: 'kg',
          location: 'Mumbai Office',
          warehouse: 'Mumbai Vault A',
          batchNumber: 'BATCH-AG-999-108',
          purchaseDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          purchasePrice: 80000,
          currentValue: 255000,
          status: 'In Stock'
        },
        {
          companyId: company._id,
          commodityId: copper._id,
          commodityCode: 'copper',
          purity: 'Standard Grade',
          quantity: 1500, // 1500kg
          unit: 'kg',
          location: 'Delhi Office',
          warehouse: 'Delhi Warehouse North',
          batchNumber: 'BATCH-CU-STD-745',
          purchaseDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          purchasePrice: 850,
          currentValue: 1365000,
          status: 'In Stock'
        },
        {
          companyId: company._id,
          commodityId: crudeoil._id,
          commodityCode: 'crudeoil',
          purity: 'INR per Barrel',
          quantity: 150, // 150 barrels
          unit: 'barrel',
          location: 'Mumbai Office',
          warehouse: 'Port Trust Storage',
          batchNumber: 'BATCH-OIL-WTI-090',
          purchaseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          purchasePrice: 7200,
          currentValue: 1080000,
          status: 'In Stock'
        }
      ]);
      console.log('B2B Inventory records seeded.');
    }

    // 4. Seed Transaction logs
    const txCount = await Transaction.countDocuments({ companyId: company._id });
    if (txCount === 0) {
      await Transaction.create([
        {
          companyId: company._id,
          userId: defaultUser._id,
          transactionId: 'TX-902341',
          type: 'purchase',
          date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          commodityId: gold._id,
          commodityCode: 'gold',
          quantity: 120,
          unit: 'g',
          price: 6500,
          totalValue: 780000,
          counterparty: 'Valcambi Bullion Ltd',
          invoiceNumber: 'INV-2026-904',
          location: 'Mumbai Office',
          notes: 'Standard 24K bar stock acquisition'
        },
        {
          companyId: company._id,
          userId: defaultUser._id,
          transactionId: 'TX-781903',
          type: 'purchase',
          date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          commodityId: silver._id,
          commodityCode: 'silver',
          quantity: 5,
          unit: 'kg',
          price: 80000,
          totalValue: 400000,
          counterparty: 'Hindustan Zinc',
          invoiceNumber: 'INV-2026-789',
          location: 'Mumbai Office',
          notes: 'Fine industrial silver granules'
        },
        {
          companyId: company._id,
          userId: defaultUser._id,
          transactionId: 'TX-S90184',
          type: 'sale',
          date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          commodityId: gold._id,
          commodityCode: 'gold',
          quantity: 20,
          unit: 'g',
          price: 7200,
          totalValue: 144000,
          counterparty: 'Tanishq Jewellers',
          invoiceNumber: 'INV-2026-S102',
          location: 'Mumbai Office',
          notes: 'Gold ingot dispatch for jewellery fabrication'
        },
        {
          companyId: company._id,
          userId: defaultUser._id,
          transactionId: 'TX-S87102',
          type: 'sale',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          commodityId: copper._id,
          commodityCode: 'copper',
          quantity: 500,
          unit: 'kg',
          price: 920,
          totalValue: 460000,
          counterparty: 'Tata Power',
          invoiceNumber: 'INV-2026-S108',
          location: 'Delhi Office',
          notes: 'Industrial copper wire feedstock delivery'
        }
      ]);
      console.log('B2B Transaction logs seeded.');
    }

    // 5. Seed Alerts
    const alertCount = await Alert.countDocuments({ companyId: company._id });
    if (alertCount === 0) {
      await Alert.create([
        {
          companyId: company._id,
          userId: defaultUser._id,
          category: 'portfolio_concentration',
          commodityId: gold._id,
          commodityCode: 'gold',
          thresholdValue: 60, // Gold concentration alert limit 60%
          isTriggered: true,
          triggeredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          message: 'High concentration detected: GOLD represents 68.4% of total portfolio value (Threshold limit: 60%)'
        },
        {
          companyId: company._id,
          userId: defaultUser._id,
          category: 'inventory_stock',
          commodityId: gold._id,
          commodityCode: 'gold',
          thresholdValue: 15, // Low stock limit 15g
          isTriggered: true,
          triggeredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          message: 'Low stock alert: Total inventory for GOLD (22K) is 8 units at Delhi Vault B (Threshold limit: 15)'
        },
        {
          companyId: company._id,
          userId: defaultUser._id,
          category: 'price_threshold',
          commodityId: gold._id,
          commodityCode: 'gold',
          state: 'National',
          purity: '24K',
          weight: 10,
          type: 'above',
          thresholdValue: 75000,
          isTriggered: false
        }
      ]);
      console.log('B2B Alerts seeded.');
    }

    // 6. Seed Audit System Logs
    const auditLogsCount = await SystemLog.countDocuments({ type: 'audit' });
    if (auditLogsCount === 0) {
      await SystemLog.create([
        {
          type: 'audit',
          message: 'Atlas Bullion B2B Platform Initialized',
          timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          details: { action: 'SYS_INIT', version: '2.0.0-enterprise' }
        },
        {
          type: 'audit',
          message: 'Primary metal historical datasets imported',
          timestamp: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000),
          details: { action: 'IMPORT_COMPLETED', importer: 'ExcelImportEngine' }
        },
        {
          type: 'audit',
          message: 'Super Admin User mapping established via Clerk identity provider',
          timestamp: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          details: { action: 'AUTH_SYNC', clerkId: defaultUser.clerkId || 'dummy' }
        }
      ]);
      console.log('B2B Audit System Logs seeded.');
    }

    console.log('B2B SaaS Seeding successfully completed.');
  } catch (error) {
    console.error('B2B Seeder Failed:', error.message);
  }
};

module.exports = { seedB2BData };
