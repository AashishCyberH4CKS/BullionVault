const Inventory = require('../models/Inventory');
const Commodity = require('../models/Commodity');
const HistoricalPrice = require('../models/HistoricalPrice');
const SystemLog = require('../models/SystemLog');

// Helper to look up latest price for an inventory item
const getLatestPriceForInventory = async (commodityCode, purity, unit) => {
  try {
    const query = { commodityCode };
    
    // Select standard mapping filters based on unit/purity
    if (commodityCode === 'gold') {
      query.purity = purity || '24K';
      query.weight = 10; // default benchmark
      query.state = 'National';
    } else if (commodityCode === 'silver') {
      query.purity = purity || '999 (Fine Silver)';
      query.weight = 10;
      query.state = 'National';
    } else if (commodityCode === 'platinum') {
      query.purity = purity || '999 (Fine Platinum)';
      query.weight = 10;
      query.state = 'All India (national average)';
    } else if (commodityCode === 'copper') {
      query.purity = 'Standard Grade';
      query.weight = 1000;
      query.state = 'National';
    } else if (commodityCode === 'crudeoil') {
      query.purity = 'INR per Barrel';
      query.state = 'All India (Indian Basket, national benchmark)';
    }

    let priceDoc = await HistoricalPrice.findOne(query).sort({ year: -1, quarterNum: -1 });
    if (!priceDoc) {
      priceDoc = await HistoricalPrice.findOne({ commodityCode }).sort({ year: -1, quarterNum: -1 });
    }

    if (priceDoc) {
      // Scale price to per-unit basis
      // Database gold/silver price is per 10g
      if ((commodityCode === 'gold' || commodityCode === 'silver' || commodityCode === 'platinum') && priceDoc.weight === 10) {
        const pricePerGram = priceDoc.price / 10;
        return unit === 'kg' ? pricePerGram * 1000 : pricePerGram;
      }
      // Database copper is per 1000g (1kg)
      if (commodityCode === 'copper' && priceDoc.weight === 1000) {
        return unit === 'g' ? priceDoc.price / 1000 : priceDoc.price;
      }
      return priceDoc.price;
    }
    return 0;
  } catch (error) {
    console.error('Error getting latest price for inventory:', error.message);
    return 0;
  }
};

// @desc    Get company inventory list
// @route   GET /api/inventory
// @access  Private
const getInventory = async (req, res) => {
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

    const { location, commodityCode, status } = req.query;
    const query = { companyId: req.user.companyId };

    if (location) query.location = location;
    if (commodityCode) query.commodityCode = commodityCode;
    if (status) query.status = status;

    const items = await Inventory.find(query).populate('commodityId');
    const enrichedItems = [];

    for (const item of items) {
      const pricePerUnit = await getLatestPriceForInventory(item.commodityCode, item.purity, item.unit);
      const itemObj = item.toObject();
      itemObj.currentUnitMarketPrice = pricePerUnit;
      itemObj.currentValue = Number((pricePerUnit * item.quantity).toFixed(2));
      
      // Update status dynamically if quantity is 0 or below a warning threshold (e.g. 5 units)
      let currentStatus = item.status;
      if (item.quantity === 0) {
        currentStatus = 'Out of Stock';
      } else if (item.quantity <= 10) {
        currentStatus = 'Low Stock';
      } else {
        currentStatus = item.quantity > 10 ? 'In Stock' : item.status;
      }

      if (currentStatus !== item.status) {
        item.status = currentStatus;
        await item.save();
        itemObj.status = currentStatus;
      }

      enrichedItems.push(itemObj);
    }

    res.json({ success: true, data: enrichedItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get inventory stats
// @route   GET /api/inventory/stats
// @access  Private
const getInventoryStats = async (req, res) => {
  try {
    if (!req.user.companyId) {
      const Company = require('../models/Company');
      let defaultComp = await Company.findOne({});
      if (defaultComp) req.user.companyId = defaultComp._id;
    }

    const items = await Inventory.find({ companyId: req.user.companyId });
    let totalValue = 0;
    let totalItems = 0;
    let lowStockCount = 0;
    
    const commodityBreakdown = {};
    const locationBreakdown = {};

    for (const item of items) {
      const pricePerUnit = await getLatestPriceForInventory(item.commodityCode, item.purity, item.unit);
      const value = pricePerUnit * item.quantity;
      
      totalValue += value;
      totalItems += item.quantity;

      if (item.quantity <= 10) {
        lowStockCount++;
      }

      // Group by Commodity
      if (!commodityBreakdown[item.commodityCode]) {
        commodityBreakdown[item.commodityCode] = {
          code: item.commodityCode,
          name: item.commodityCode.charAt(0).toUpperCase() + item.commodityCode.slice(1),
          value: 0,
          quantity: 0
        };
      }
      commodityBreakdown[item.commodityCode].value += value;
      commodityBreakdown[item.commodityCode].quantity += item.quantity;

      // Group by Location
      if (!locationBreakdown[item.location]) {
        locationBreakdown[item.location] = {
          name: item.location,
          value: 0,
          itemsCount: 0
        };
      }
      locationBreakdown[item.location].value += value;
      locationBreakdown[item.location].itemsCount += item.quantity;
    }

    res.json({
      success: true,
      data: {
        totalValue: Number(totalValue.toFixed(2)),
        totalItems,
        lowStockCount,
        commodityBreakdown: Object.values(commodityBreakdown),
        locationBreakdown: Object.values(locationBreakdown)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add item to inventory
// @route   POST /api/inventory
// @access  Private (Inventory Manager, Company Admin, Super Admin)
const addInventoryItem = async (req, res) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'User company profile missing' });
    }

    // Role check
    const allowedRoles = ['super_admin', 'company_admin', 'inventory_manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to add stock items' });
    }

    const { commodityId, state, purity, quantity, unit, location, warehouse, batchNumber, purchaseDate, purchasePrice } = req.body;

    if (!commodityId || !purity || !quantity || !unit || !location || !warehouse || !batchNumber || !purchasePrice) {
      return res.status(400).json({ success: false, message: 'Please add all required fields' });
    }

    // Check duplicate batch number
    const duplicate = await Inventory.findOne({ batchNumber });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Batch number already exists' });
    }

    const commodity = await Commodity.findById(commodityId);
    if (!commodity) {
      return res.status(404).json({ success: false, message: 'Commodity not found' });
    }

    const pricePerUnit = await getLatestPriceForInventory(commodity.code, purity, unit);
    const currentValue = pricePerUnit * Number(quantity);

    let status = 'In Stock';
    if (Number(quantity) === 0) status = 'Out of Stock';
    else if (Number(quantity) <= 10) status = 'Low Stock';

    const item = await Inventory.create({
      companyId: req.user.companyId,
      commodityId,
      commodityCode: commodity.code,
      purity,
      quantity: Number(quantity),
      unit,
      location,
      warehouse,
      batchNumber,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      purchasePrice: Number(purchasePrice),
      currentValue: Number(currentValue.toFixed(2)),
      status
    });

    // Create Audit Log
    await SystemLog.create({
      type: 'audit',
      message: `Inventory stock added: ${quantity} ${unit} of ${commodity.name} at ${warehouse}`,
      details: {
        userId: req.user.id,
        userName: req.user.name,
        companyId: req.user.companyId,
        itemId: item._id,
        batchNumber,
        warehouse,
        action: 'INVENTORY_ADD'
      }
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (Inventory Manager, Company Admin, Super Admin)
const updateInventoryItem = async (req, res) => {
  try {
    const allowedRoles = ['super_admin', 'company_admin', 'inventory_manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit stock items' });
    }

    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Stock item not found' });
    }

    // Tenant check
    if (item.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const { purity, quantity, unit, location, warehouse, status } = req.body;
    const oldVal = item.toObject();

    item.purity = purity || item.purity;
    item.quantity = quantity !== undefined ? Number(quantity) : item.quantity;
    item.unit = unit || item.unit;
    item.location = location || item.location;
    item.warehouse = warehouse || item.warehouse;
    
    // Auto status checks
    if (item.quantity === 0) {
      item.status = 'Out of Stock';
    } else if (item.quantity <= 10) {
      item.status = 'Low Stock';
    } else {
      item.status = status || 'In Stock';
    }

    const pricePerUnit = await getLatestPriceForInventory(item.commodityCode, item.purity, item.unit);
    item.currentValue = Number((pricePerUnit * item.quantity).toFixed(2));

    const updatedItem = await item.save();

    // Create Audit Log
    await SystemLog.create({
      type: 'audit',
      message: `Inventory stock updated: Batch ${item.batchNumber}`,
      details: {
        userId: req.user.id,
        userName: req.user.name,
        companyId: req.user.companyId,
        itemId: item._id,
        previous: { quantity: oldVal.quantity, warehouse: oldVal.warehouse },
        updated: { quantity: updatedItem.quantity, warehouse: updatedItem.warehouse },
        action: 'INVENTORY_UPDATE'
      }
    });

    res.json({ success: true, data: updatedItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private (Inventory Manager, Company Admin, Super Admin)
const deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Stock item not found' });
    }

    // Tenant check if companyId is present
    if (item.companyId && req.user.companyId && item.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this stock item' });
    }

    const batch = item.batchNumber;
    await item.deleteOne();

    // Create Audit Log
    await SystemLog.create({
      type: 'audit',
      message: `Inventory stock removed: Batch ${batch}`,
      details: {
        userId: req.user.id,
        userName: req.user.name,
        companyId: req.user.companyId,
        batchNumber: batch,
        action: 'INVENTORY_DELETE'
      }
    });

    res.json({ success: true, message: 'Inventory item removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getInventory,
  getInventoryStats,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLatestPriceForInventory // Exported to be used by transactions seeding/evaluation
};
