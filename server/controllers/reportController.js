const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const Investment = require('../models/Investment');
const HistoricalPrice = require('../models/HistoricalPrice');
const Report = require('../models/Report');

// Helper to lookup latest price
const getLatestPrice = async (inv) => {
  const priceDoc = await HistoricalPrice.findOne({
    commodityCode: inv.commodityCode,
    state: inv.state,
    purity: inv.purity,
    weight: inv.weight
  }).sort({ year: -1, quarterNum: -1 });
  return priceDoc ? priceDoc.price : inv.purchasePrice;
};

// @desc    Get user generated reports list
// @route   GET /api/reports
// @access  Private
const getReports = async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate a report (Excel, CSV, PDF)
// @route   POST /api/reports/generate
// @access  Private
const generateReport = async (req, res) => {
  try {
    const { name, type, format, queryParams = {} } = req.body;
    if (!name || !type || !format) {
      return res.status(400).json({ success: false, message: 'Please provide name, type, and format' });
    }

    let reportData = [];
    let fileName = `report_${type}_${Date.now()}`;

    if (type === 'portfolio' || type === 'investment') {
      const investments = await Investment.find({ userId: req.user.id });
      
      for (const inv of investments) {
        const currentPrice = await getLatestPrice(inv);
        const investedVal = inv.purchasePrice * inv.quantity;
        const currentVal = currentPrice * inv.quantity;
        const profit = currentVal - investedVal;
        const roi = investedVal > 0 ? ((profit / investedVal) * 100).toFixed(2) : 0;

        reportData.push({
          'Investment ID': inv._id.toString(),
          'Commodity': inv.commodityCode.toUpperCase(),
          'State': inv.state,
          'Purity/Grade': inv.purity,
          'Weight (g)': inv.weight,
          'Quantity': inv.quantity,
          'Purchase Date': inv.purchaseDate.toISOString().split('T')[0],
          'Purchase Quarter': inv.purchaseQuarter,
          'Purchase Price (INR)': inv.purchasePrice,
          'Invested Value (INR)': investedVal,
          'Current Price (INR)': currentPrice,
          'Current Value (INR)': currentVal,
          'Profit/Loss (INR)': profit,
          'ROI (%)': Number(roi)
        });
      }
    } else if (type === 'historical') {
      const { code, state, purity, weight } = queryParams;
      const filter = {};
      if (code) filter.commodityCode = code;
      if (state) filter.state = state;
      if (purity) filter.purity = purity;
      if (weight) filter.weight = Number(weight);

      const prices = await HistoricalPrice.find(filter).sort({ year: -1, quarterNum: -1 }).limit(100);
      
      reportData = prices.map(p => ({
        'Commodity': p.commodityCode.toUpperCase(),
        'State/UT': p.state,
        'Region': p.region,
        'Quarter': p.quarter,
        'Purity/Grade': p.purity,
        'Weight (g)': p.weight,
        'Price (INR)': p.price,
        'QoQ Change': p.qoqChange,
        'QoQ Change (%)': p.qoqChangePercent,
        'Trend': p.trend
      }));
    } else if (type === 'analytics') {
      // Aggregate summary statistics
      const codes = await HistoricalPrice.distinct('commodityCode');
      for (const code of codes) {
        const stats = await HistoricalPrice.aggregate([
          { $match: { commodityCode: code } },
          { $group: {
              _id: '$commodityCode',
              avgPrice: { $avg: '$price' },
              maxPrice: { $max: '$price' },
              minPrice: { $min: '$price' },
              totalRecords: { $sum: 1 }
            }
          }
        ]);
        if (stats.length > 0) {
          reportData.push({
            'Commodity': code.toUpperCase(),
            'Avg Price (INR)': parseFloat(stats[0].avgPrice.toFixed(2)),
            'Max Price (INR)': stats[0].maxPrice,
            'Min Price (INR)': stats[0].minPrice,
            'Historical Records Count': stats[0].totalRecords
          });
        }
      }
    }

    // Set reports export folder
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    let fileUrl = '';
    
    if (format === 'excel' || format === 'xlsx') {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(reportData);
      xlsx.utils.book_append_sheet(wb, ws, 'Report Data');
      
      fileName += '.xlsx';
      const filePath = path.join(reportsDir, fileName);
      xlsx.writeFile(wb, filePath);
      fileUrl = `/reports/${fileName}`;
    } else if (format === 'csv') {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(reportData);
      xlsx.utils.book_append_sheet(wb, ws, 'Report Data');
      
      fileName += '.csv';
      const filePath = path.join(reportsDir, fileName);
      xlsx.writeFile(wb, filePath, { bookType: 'csv' });
      fileUrl = `/reports/${fileName}`;
    } else if (format === 'pdf') {
      // Generate standard text-based summary as PDF mockup
      fileName += '.pdf';
      const filePath = path.join(reportsDir, fileName);
      const content = `BULLIONVAULT INVESTMENT REPORT\n==============================\nGenerated At: ${new Date().toISOString()}\nReport Title: ${name}\nReport Type: ${type.toUpperCase()}\n\n` + 
        JSON.stringify(reportData, null, 2);
      fs.writeFileSync(filePath, content, 'utf8');
      fileUrl = `/reports/${fileName}`;
    }

    const report = await Report.create({
      userId: req.user.id,
      name,
      type,
      format,
      parameters: queryParams,
      fileUrl
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getReports,
  generateReport
};
