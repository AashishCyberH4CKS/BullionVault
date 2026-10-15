const User = require('../models/User');
const Commodity = require('../models/Commodity');
const HistoricalPrice = require('../models/HistoricalPrice');
const SystemLog = require('../models/SystemLog');
const { runImportEngine, importWorkbook } = require('../services/importEngine');
const fs = require('fs');
const path = require('path');

// @desc    Get all users (admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get system logs (admin only)
// @route   GET /api/admin/logs
// @access  Private/Admin
const getLogs = async (req, res) => {
  try {
    const logs = await SystemLog.find({}).sort({ timestamp: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Trigger Excel Database Import Refresh
// @route   POST /api/admin/refresh
// @access  Private/Admin
const refreshDatabase = async (req, res) => {
  try {
    console.log("Admin triggered database refresh...");
    const results = await runImportEngine();
    
    await SystemLog.create({
      type: 'admin',
      message: `Admin manual refresh completed. Processed ${results.length} workbooks.`,
      details: results
    });

    res.json({ success: true, message: 'Database refresh completed successfully', data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a commodity and all its historical prices (admin only)
// @route   DELETE /api/admin/commodities/:code
// @access  Private/Admin
const deleteCommodityData = async (req, res) => {
  try {
    const { code } = req.params;
    
    // Find commodity
    const commodity = await Commodity.findOne({ code });
    if (!commodity) {
      return res.status(404).json({ success: false, message: 'Commodity not found' });
    }

    // Delete historical price records
    const priceDelResult = await HistoricalPrice.deleteMany({ commodityCode: code });
    
    // Delete commodity record
    await commodity.deleteOne();

    await SystemLog.create({
      type: 'admin',
      message: `Admin deleted commodity: ${code.toUpperCase()}`,
      details: {
        code,
        deletedPricesCount: priceDelResult.deletedCount
      }
    });

    res.json({
      success: true,
      message: `Successfully deleted commodity ${code.toUpperCase()} and ${priceDelResult.deletedCount} price records.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload new Excel workbook and trigger instant import (admin only)
// @route   POST /api/admin/upload
// @access  Private/Admin
const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file (.xlsx)' });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;

    console.log(`Admin uploaded sheet: ${fileName}. Running importer...`);
    const result = await importWorkbook(filePath);

    res.json({
      success: true,
      message: `Excel uploaded and imported successfully. Created commodity "${result.commodityName}".`,
      data: result
    });
  } catch (error) {
    // Delete file if parsing failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: `Import error: ${error.message}` });
  }
};

// @desc    Update user profile/role (admin only)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { role, name } = req.body;
    user.role = role || user.role;
    user.name = name || user.name;

    const updatedUser = await user.save();

    await SystemLog.create({
      type: 'admin',
      message: `Admin updated user profile: ${updatedUser.email}`,
      details: {
        userId: req.user.id,
        userName: req.user.name,
        targetUser: updatedUser.email,
        targetRole: updatedUser.role
      }
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
  getLogs,
  refreshDatabase,
  deleteCommodityData,
  uploadExcel,
  updateUser
};
