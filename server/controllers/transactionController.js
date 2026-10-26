const Transaction = require('../models/Transaction');
const Commodity = require('../models/Commodity');
const Inventory = require('../models/Inventory');
const Investment = require('../models/Investment');
const SystemLog = require('../models/SystemLog');

// @desc    Get company transactions
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    if (!req.user.companyId) {
      const Company = require('../models/Company');
      let defaultComp = await Company.findOne({});
      if (!defaultComp) {
        defaultComp = await Company.create({
          name: 'Atlas Bullion & Commodities Pvt. Ltd.',
          industry: 'Bullion Trading',
          country: 'India',
          currency: 'INR'
        });
      }
      req.user.companyId = defaultComp._id;
    }

    const { type, commodityCode, startDate, endDate } = req.query;
    const query = { companyId: req.user.companyId };

    if (type) query.type = type;
    if (commodityCode) query.commodityCode = commodityCode;
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('commodityId')
      .sort({ date: -1 });

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get transaction analytics & stats
// @route   GET /api/transactions/stats
// @access  Private
const getTransactionStats = async (req, res) => {
  try {
    if (!req.user.companyId) {
      const Company = require('../models/Company');
      let defaultComp = await Company.findOne({});
      if (defaultComp) req.user.companyId = defaultComp._id;
    }

    const txs = await Transaction.find({ companyId: req.user.companyId });
    
    let totalPurchases = 0;
    let totalSales = 0;
    let purchaseCount = 0;
    let salesCount = 0;

    const monthlyTrends = {};

    for (const tx of txs) {
      const monthKey = tx.date.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = { month: monthKey, purchases: 0, sales: 0 };
      }

      if (tx.type === 'purchase') {
        totalPurchases += tx.totalValue;
        purchaseCount++;
        monthlyTrends[monthKey].purchases += tx.totalValue;
      } else if (tx.type === 'sale') {
        totalSales += tx.totalValue;
        salesCount++;
        monthlyTrends[monthKey].sales += tx.totalValue;
      }
    }

    // Profit & Loss calculation: Sales - Purchase Cost of Goods Sold (cogs represented by price difference)
    const netProfit = totalSales - totalPurchases;

    res.json({
      success: true,
      data: {
        totalPurchases: Number(totalPurchases.toFixed(2)),
        totalSales: Number(totalSales.toFixed(2)),
        purchaseCount,
        salesCount,
        netProfit: Number(netProfit.toFixed(2)),
        monthlyTrends: Object.values(monthlyTrends).sort((a, b) => a.month.localeCompare(b.month))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record a new transaction (auto-updates inventory / portfolio)
// @route   POST /api/transactions
// @access  Private (Trader, Accountant, Company Admin, Super Admin)
const createTransaction = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!req.user.companyId) {
      const Company = require('../models/Company');
      let defaultComp = await Company.findOne({});
      if (!defaultComp) {
        defaultComp = await Company.create({
          name: 'Atlas Bullion & Commodities Pvt. Ltd.',
          industry: 'Bullion Trading',
          country: 'India',
          currency: 'INR'
        });
      }
      req.user.companyId = defaultComp._id;
    }

    const { type, commodityId, quantity, unit, price, fees, counterparty, invoiceNumber, location, notes, date } = req.body;

    if (!type || !quantity || !unit || !price || !counterparty || !invoiceNumber || !location) {
      return res.status(400).json({ success: false, message: 'Please add all required fields' });
    }

    let commodity = null;
    if (commodityId && mongoose.Types.ObjectId.isValid(commodityId)) {
      commodity = await Commodity.findById(commodityId);
    }
    if (!commodity) {
      const commCode = (req.body.commodityCode || 'gold').toLowerCase().replace(/\s+/g, '');
      commodity = await Commodity.findOne({ code: commCode });
      if (!commodity) {
        // Fallback seed commodity document if not yet in DB
        commodity = await Commodity.create({
          name: commCode.charAt(0).toUpperCase() + commCode.slice(1),
          code: commCode,
          fileName: 'Live API',
          purities: ['Standard'],
          weights: [1, 10, 100],
          states: ['National']
        });
      }
    }

    const qty = Number(quantity);
    const prc = Number(price);
    const applicableFees = Number(fees || 0);
    const subtotal = qty * prc;
    const totalValue = type === 'purchase' ? subtotal + applicableFees : subtotal - applicableFees;
    const txId = 'TX-' + Math.floor(100000 + Math.random() * 900000);

    const transaction = await Transaction.create({
      companyId: req.user.companyId,
      userId: req.user.id,
      transactionId: txId,
      type,
      date: date ? new Date(date) : new Date(),
      commodityId: commodity._id,
      commodityCode: commodity.code,
      quantity: qty,
      unit,
      price: prc,
      fees: applicableFees,
      totalValue: Number(totalValue.toFixed(2)),
      counterparty,
      invoiceNumber,
      location,
      notes
    });

    // -----------------------------------------------------------------
    // DYNAMIC INVENTORY / PORTFOLIO LINKING BUSINESS LOGIC
    // -----------------------------------------------------------------
    const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
    const month = date ? new Date(date).getMonth() + 1 : new Date().getMonth() + 1;
    const quarter = 'Q' + Math.ceil(month / 3);

    if (type === 'purchase') {
      // 1. Create matching Inventory stock item
      const batchNo = 'BATCH-' + invoiceNumber + '-' + Math.floor(10 + Math.random() * 90);
      await Inventory.create({
        companyId: req.user.companyId,
        commodityId,
        commodityCode: commodity.code,
        purity: commodity.code === 'gold' ? '24K' : commodity.code === 'silver' ? '999 (Fine Silver)' : 'Standard',
        quantity: qty,
        unit,
        location,
        warehouse: location + ' Facility',
        batchNumber: batchNo,
        purchaseDate: date ? new Date(date) : new Date(),
        purchasePrice: prc,
        currentValue: totalValue,
        status: qty > 10 ? 'In Stock' : 'Low Stock'
      });

      // 2. Create matching Portfolio Investment holding
      await Investment.create({
        userId: req.user.id,
        companyId: req.user.companyId,
        commodityId,
        commodityCode: commodity.code,
        state: location.includes('Delhi') ? 'Delhi (NCT)' : location.includes('Mumbai') ? 'Maharashtra' : 'National',
        purity: commodity.code === 'gold' ? '24K' : commodity.code === 'silver' ? '999 (Fine Silver)' : 'Standard',
        weight: unit === 'kg' ? 1000 : 1,
        quantity: qty,
        purchaseDate: date ? new Date(date) : new Date(),
        purchaseQuarter: quarter,
        purchaseYear: year,
        purchasePrice: prc,
        currentPrice: prc
      });

    } else if (type === 'sale') {
      // Find active Inventory item in that location and reduce its quantity
      const stock = await Inventory.findOne({
        companyId: req.user.companyId,
        commodityCode: commodity.code,
        location
      });

      if (stock) {
        stock.quantity = Math.max(0, stock.quantity - qty);
        stock.status = stock.quantity === 0 ? 'Out of Stock' : (stock.quantity <= 10 ? 'Low Stock' : 'In Stock');
        await stock.save();
      }

      // Also reduce equivalent quantity in active Investment holdings
      const investment = await Investment.findOne({
        companyId: req.user.companyId,
        commodityCode: commodity.code
      });
      if (investment) {
        investment.quantity = Math.max(0, investment.quantity - qty);
        if (investment.quantity === 0) {
          await investment.deleteOne();
        } else {
          await investment.save();
        }
      }
    }

    // Create Audit Log
    await SystemLog.create({
      type: 'audit',
      message: `Transaction recorded: [${type.toUpperCase()}] ${qty} ${unit} of ${commodity.name} - Value: INR ${totalValue}`,
      details: {
        userId: req.user.id,
        userName: req.user.name,
        companyId: req.user.companyId,
        transactionId: txId,
        invoiceNumber,
        action: 'TRANSACTION_CREATE'
      }
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private (Accountant, Company Admin, Super Admin)
const updateTransaction = async (req, res) => {
  try {
    const allowedRoles = ['super_admin', 'company_admin', 'accountant'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit financial transactions' });
    }

    const tx = await Transaction.findById(req.params.id);
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Tenant check
    if (tx.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const { counterparty, invoiceNumber, location, notes } = req.body;
    
    tx.counterparty = counterparty || tx.counterparty;
    tx.invoiceNumber = invoiceNumber || tx.invoiceNumber;
    tx.location = location || tx.location;
    tx.notes = notes || tx.notes;

    const updatedTx = await tx.save();

    res.json({ success: true, data: updatedTx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private (Company Admin, Super Admin)
const deleteTransaction = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Tenant check if companyId is present
    if (tx.companyId && req.user.companyId && tx.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this transaction' });
    }

    const txId = tx.transactionId;
    await tx.deleteOne();

    // Create Audit Log
    await SystemLog.create({
      type: 'audit',
      message: `Transaction deleted: ${txId}`,
      details: {
        userId: req.user.id,
        userName: req.user.name,
        companyId: req.user.companyId,
        transactionId: txId,
        action: 'TRANSACTION_DELETE'
      }
    });

    res.json({ success: true, message: 'Transaction record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTransactions,
  getTransactionStats,
  createTransaction,
  updateTransaction,
  deleteTransaction
};
