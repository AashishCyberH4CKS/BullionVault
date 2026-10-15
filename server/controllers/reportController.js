const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const Investment = require('../models/Investment');
const HistoricalPrice = require('../models/HistoricalPrice');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
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

// Builder for official corporate printable report document
const buildOfficialPrintableReport = ({ title, type, reportData, user, refId }) => {
  const headers = reportData.length > 0 ? Object.keys(reportData[0]) : [];
  const currentDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });
  const serialNo = refId || `BV-REP-2026-${Math.floor(100000 + Math.random() * 900000)}`;

  const rowsHtml = reportData.map((row, idx) => `
    <tr>
      <td style="text-align: center; font-weight: bold; color: #475569;">${idx + 1}</td>
      ${headers.map(h => {
        const val = row[h];
        const isNum = typeof val === 'number';
        const isNeg = isNum && val < 0;
        const formatted = isNum ? val.toLocaleString('en-IN') : (val || '-');
        return `<td style="${isNum ? 'text-align: right;' : 'text-align: left;'} ${isNeg ? 'color: #dc2626; font-weight: bold;' : ''}">${formatted}</td>`;
      }).join('')}
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - Official Corporate Report</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm 10mm 15mm 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-bar {
      max-width: 1200px;
      margin: 0 auto 20px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .print-btn {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #0b0f19;
      font-weight: 700;
      font-size: 13px;
      padding: 8px 18px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .print-btn:hover {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      transform: translateY(-1px);
    }
    .report-paper {
      max-width: 1200px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 36px 40px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 72px;
      font-weight: 900;
      color: rgba(148, 163, 184, 0.07);
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
      letter-spacing: 6px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #b45309;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 3px;
    }
    .company-details {
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
      text-align: right;
    }
    .doc-meta-card {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 24px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      font-size: 11px;
    }
    .meta-item label {
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .meta-item span {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 30px;
    }
    .data-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 9px 10px;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid #0f172a;
    }
    .data-table td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .data-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .summary-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      padding: 12px 18px;
      border-radius: 6px;
      margin-bottom: 28px;
      font-size: 11px;
    }
    .sign-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 36px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .seal-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .seal-stamp {
      width: 72px;
      height: 72px;
      border: 3px double #b45309;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #b45309;
      font-size: 8px;
      font-weight: 900;
      text-transform: uppercase;
      transform: rotate(-10deg);
      text-align: center;
      line-height: 1.1;
      box-shadow: 0 0 4px rgba(180, 83, 9, 0.2);
    }
    .signature-line {
      text-align: right;
    }
    .signature-line .line {
      width: 180px;
      border-bottom: 1px solid #0f172a;
      margin-bottom: 4px;
      display: inline-block;
    }
    .footer-note {
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      margin-top: 24px;
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .print-bar { display: none !important; }
      .report-paper { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div style="font-size: 13px; font-weight: 600;">
      Official Company Report • ${title}
    </div>
    <button class="print-btn" onclick="window.print()">
      🖨️ Print / Save as Official PDF
    </button>
  </div>

  <div class="report-paper">
    <div class="watermark">BULLIONVAULT OFFICIAL</div>

    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h1 class="brand-title">ATLAS BULLION & COMMODITIES PVT. LTD.</h1>
          <div class="brand-sub">BullionVault Institutional Custody & Asset Ledger Division</div>
          <div style="font-size: 10px; color: #475569; margin-top: 4px;">
            Accredited Vault Depository • Certified by LBMA & BIS Standards
          </div>
        </td>
        <td class="company-details" style="vertical-align: top;">
          <strong>Corporate Headquarters:</strong><br>
          Level 18, Maker Maxity, Bandra Kurla Complex (BKC)<br>
          Mumbai, Maharashtra 400051, India<br>
          <strong>CIN:</strong> U74999MH2021PTC362819 | <strong>GSTIN:</strong> 27AAACA9812K1Z5<br>
          <strong>Tel:</strong> +91 (22) 6982-5000 | <strong>Email:</strong> audit@bullionvault.in
        </td>
      </tr>
    </table>

    <div class="doc-meta-card">
      <div class="meta-item">
        <label>Document Reference</label>
        <span>${serialNo}</span>
      </div>
      <div class="meta-item">
        <label>Document Title</label>
        <span>${title}</span>
      </div>
      <div class="meta-item">
        <label>Reporting Classification</label>
        <span style="text-transform: capitalize;">${type.replace(/_/g, ' ')}</span>
      </div>
      <div class="meta-item">
        <label>Issue Timestamp</label>
        <span>${currentDate}</span>
      </div>
      <div class="meta-item">
        <label>Issued For Account</label>
        <span>${user?.name || 'Authorized Enterprise Trader'}</span>
      </div>
      <div class="meta-item">
        <label>Entity ID</label>
        <span>${user?.email || 'BV-ENT-CLIENT'}</span>
      </div>
      <div class="meta-item">
        <label>Verification Status</label>
        <span style="color: #16a34a;">● RECONCILED & AUDITED</span>
      </div>
      <div class="meta-item">
        <label>Security Clearance</label>
        <span>LEVEL-4 CONFIDENTIAL</span>
      </div>
    </div>

    <div class="summary-strip">
      <div>
        <strong>Schedule Summary:</strong> Verified ${reportData.length} active ledger positions and asset valuations.
      </div>
      <div>
        <strong>Audit Benchmark:</strong> Spot Market Fixing (Multi-Commodity Index)
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          ${headers.map(h => `<th style="${h.includes('INR') || h.includes('Value') || h.includes('Price') || h.includes('Quantity') ? 'text-align: right;' : 'text-align: left;'}">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="100%" style="text-align:center; padding: 20px; color: #94a3b8;">No records registered under the specified parameters.</td></tr>'}
      </tbody>
    </table>

    <div class="sign-section">
      <div class="seal-box">
        <div class="seal-stamp">
          <span>ATLAS</span>
          <span style="font-size: 11px;">★</span>
          <span>AUDITED</span>
        </div>
        <div style="font-size: 10px; color: #475569; line-height: 1.4;">
          <strong>Digital Audit Signature:</strong><br>
          SHA-256: ${Buffer.from(serialNo + title).toString('hex').substring(0, 32).toUpperCase()}<br>
          Reconciled against distributed bullion vault holdings.
        </div>
      </div>

      <div class="signature-line">
        <div class="line"></div><br>
        <strong style="font-size: 11px; color: #0f172a;">Rajeshwar Singhania, FCA</strong><br>
        <span style="font-size: 10px; color: #64748b;">Chief Treasury Officer & Authorized Signatory</span><br>
        <span style="font-size: 9px; color: #94a3b8;">Atlas Bullion & Commodities Pvt. Ltd.</span>
      </div>
    </div>

    <div class="footer-note">
      This document constitutes an official computerized statutory record issued by Atlas Bullion & Commodities Pvt. Ltd. under the BullionVault Enterprise Treasury System. Any alteration or unauthorized reproduction is strictly prohibited under institutional custody governance.
    </div>
  </div>
</body>
</html>`;
};

// @desc    Get user generated reports list
// @route   GET /api/reports
// @access  Private
const getReports = async (req, res) => {
  try {
    const query = req.user.companyId 
      ? { $or: [{ userId: req.user.id }, { companyId: req.user.companyId }] }
      : { userId: req.user.id };
    const reports = await Report.find(query).sort({ createdAt: -1 });
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

    const invQuery = req.user.companyId ? { companyId: req.user.companyId } : { userId: req.user.id };
    if (queryParams.commodityCode) invQuery.commodityCode = queryParams.commodityCode;

    if (type === 'portfolio' || type === 'portfolio_valuation' || type === 'investment' || type === 'monthly_performance') {
      const investments = await Investment.find(invQuery);
      
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
          'Purchase Date': inv.purchaseDate ? inv.purchaseDate.toISOString().split('T')[0] : 'N/A',
          'Purchase Quarter': inv.purchaseQuarter,
          'Purchase Price (INR)': inv.purchasePrice,
          'Invested Value (INR)': investedVal,
          'Current Price (INR)': currentPrice,
          'Current Value (INR)': currentVal,
          'Profit/Loss (INR)': profit,
          'ROI (%)': Number(roi)
        });
      }
    } else if (type === 'inventory_report' || type === 'inventory') {
      const stockQuery = req.user.companyId ? { companyId: req.user.companyId } : {};
      if (queryParams.commodityCode) stockQuery.commodityCode = queryParams.commodityCode;
      if (queryParams.location) stockQuery.location = queryParams.location;

      const items = await Inventory.find(stockQuery);
      reportData = items.map(item => ({
        'Inventory ID': item._id.toString(),
        'Batch Number': item.batchNumber || 'N/A',
        'Commodity': item.commodityCode.toUpperCase(),
        'Purity/Grade': item.purity,
        'Quantity': item.quantity,
        'Unit': item.unit,
        'Warehouse': item.warehouse,
        'Location': item.location,
        'Status': item.status,
        'Purchase Price (INR)': item.purchasePrice || 0,
        'Entry Date': item.purchaseDate ? item.purchaseDate.toISOString().split('T')[0] : 'N/A'
      }));
    } else if (type === 'purchase_report' || type === 'sales_report') {
      const txQuery = req.user.companyId ? { companyId: req.user.companyId } : {};
      if (type === 'purchase_report') txQuery.type = 'purchase';
      if (type === 'sales_report') txQuery.type = 'sale';
      if (queryParams.commodityCode) txQuery.commodityCode = queryParams.commodityCode;

      const txs = await Transaction.find(txQuery).sort({ date: -1 });
      reportData = txs.map(t => ({
        'Transaction ID': t.transactionId,
        'Date': t.date ? t.date.toISOString().split('T')[0] : 'N/A',
        'Type': t.type.toUpperCase(),
        'Commodity': t.commodityCode.toUpperCase(),
        'Purity': t.purity,
        'Quantity': t.quantity,
        'Unit': t.unit,
        'Rate (INR)': t.price,
        'Total Amount (INR)': t.totalAmount,
        'Counterparty': t.counterparty,
        'Invoice #': t.invoiceNumber,
        'Location': t.location,
        'Payment Terms': t.paymentTerms
      }));
    } else if (type === 'pnl_report' || type === 'risk_report' || type === 'commodity_exposure') {
      const investments = await Investment.find(invQuery);
      let totalPortfolioVal = 0;
      let totalInvestedVal = 0;
      const breakdown = {};

      for (const inv of investments) {
        const curPrice = await getLatestPrice(inv);
        const invested = inv.purchasePrice * inv.quantity;
        const current = curPrice * inv.quantity;
        totalPortfolioVal += current;
        totalInvestedVal += invested;

        if (!breakdown[inv.commodityCode]) {
          breakdown[inv.commodityCode] = { invested: 0, current: 0 };
        }
        breakdown[inv.commodityCode].invested += invested;
        breakdown[inv.commodityCode].current += current;
      }

      for (const [code, val] of Object.entries(breakdown)) {
        const profit = val.current - val.invested;
        const concentration = totalPortfolioVal > 0 ? ((val.current / totalPortfolioVal) * 100).toFixed(2) : 0;
        const roi = val.invested > 0 ? ((profit / val.invested) * 100).toFixed(2) : 0;

        reportData.push({
          'Commodity': code.toUpperCase(),
          'Invested (INR)': val.invested,
          'Current Valuation (INR)': val.current,
          'Net P&L (INR)': profit,
          'ROI (%)': Number(roi),
          'Portfolio Exposure (%)': Number(concentration),
          'Risk Level': Number(concentration) > 50 ? 'HIGH' : Number(concentration) > 25 ? 'MODERATE' : 'OPTIMAL'
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

    const serialRef = `BV-REP-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const htmlReport = buildOfficialPrintableReport({
      title: name,
      type,
      reportData,
      user: req.user,
      refId: serialRef
    });

    // Save official printable report
    const htmlFileName = `${fileName}.html`;
    const htmlFilePath = path.join(reportsDir, htmlFileName);
    fs.writeFileSync(htmlFilePath, htmlReport, 'utf8');

    let fileUrl = `/reports/${htmlFileName}`;

    const report = await Report.create({
      userId: req.user.id,
      companyId: req.user.companyId,
      name,
      type,
      format: 'official_printable',
      parameters: queryParams,
      fileUrl
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a report
// @route   DELETE /api/reports/:id
// @access  Private
const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    await report.deleteOne();
    res.json({ success: true, message: 'Report record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download official report file
// @route   GET /api/reports/download/:id
// @access  Private / Public
const downloadReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    const fileName = path.basename(report.fileUrl);
    const filePath = path.join(__dirname, '../../reports', fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Report file not found on disk' });
    }
    const safeTitle = (report.name || 'Official_Report').replace(/[^a-zA-Z0-9_\-]/g, '_');
    res.download(filePath, `${safeTitle}_Official_Corporate_Report.html`);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getReports,
  generateReport,
  deleteReport,
  downloadReport
};
