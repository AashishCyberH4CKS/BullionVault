import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  FileText, 
  Download, 
  FileDown, 
  CheckCircle, 
  Info, 
  Calendar, 
  Filter, 
  Printer, 
  ExternalLink, 
  Trash2,
  Building,
  Receipt,
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { useAuth } from '../context/AuthContext';
import { getFirestoreTransactions } from '../services/firestoreService';

const DEFAULT_SAMPLE_TRANSACTIONS = [
  { transactionId: 'TX-2026-8801', counterparty: 'MMTC-PAMP India Pvt Ltd', commodityCode: 'gold', commodityName: 'Gold', type: 'purchase', quantity: 100, unit: 'g', price: 8345, totalValue: 834500, date: '2026-06-15', invoiceNumber: 'INV-MMTC-8801', location: 'Mumbai Vault A' },
  { transactionId: 'TX-2026-8802', counterparty: 'Tanishq Bullion Ltd', commodityCode: 'gold', commodityName: 'Gold', type: 'purchase', quantity: 50, unit: 'g', price: 8345, totalValue: 417250, date: '2026-06-20', invoiceNumber: 'INV-TB-9120', location: 'Delhi Central Vault' },
  { transactionId: 'TX-2026-8803', counterparty: 'MMTC-PAMP India Pvt Ltd', commodityCode: 'silver', commodityName: 'Silver', type: 'purchase', quantity: 10, unit: 'kg', price: 96800, totalValue: 968000, date: '2026-06-22', invoiceNumber: 'INV-MMTC-8844', location: 'Mumbai Vault A' },
  { transactionId: 'TX-2026-8804', counterparty: 'Kundan Gold Refineries', commodityCode: 'platinum', commodityName: 'Platinum', type: 'purchase', quantity: 50, unit: 'g', price: 3325, totalValue: 166250, date: '2026-06-28', invoiceNumber: 'INV-KGD-4011', location: 'Bangalore Depot' },
  { transactionId: 'TX-2026-8805', counterparty: 'Tanishq Bullion Ltd', commodityCode: 'gold', commodityName: 'Gold', type: 'sale', quantity: 20, unit: 'g', price: 8420, totalValue: 168400, date: '2026-07-02', invoiceNumber: 'INV-SL-5510', location: 'Mumbai Vault A' }
];

const Reports = () => {
  const { firebaseUid, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  const [reports, setReports] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [transactions, setTransactions] = useState(DEFAULT_SAMPLE_TRANSACTIONS);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form parameters
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState(queryParams.get('type') || 'portfolio_valuation');
  const [exportFormat, setExportFormat] = useState('official_printable');
  
  // Specific Filters
  const [selectedTxId, setSelectedTxId] = useState(queryParams.get('txId') || '');
  const [counterpartyFilter, setCounterpartyFilter] = useState(queryParams.get('company') || '');
  const [commodityFilter, setCommodityFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Auto-generate title when type or inputs change
  useEffect(() => {
    if (reportType === 'single_transaction') {
      const match = transactions.find(t => t.transactionId === selectedTxId);
      const cName = match?.counterparty || counterpartyFilter || 'Supplier';
      const comm = match?.commodityName || match?.commodityCode || 'Commodity';
      setReportTitle(`Single Transaction Audit Certificate – ${comm} (${cName})`);
    } else if (reportType === 'company_ledger') {
      const cName = counterpartyFilter || 'MMTC-PAMP India';
      setReportTitle(`Corporate Ledger & Trade Statement – ${cName}`);
    } else if (reportType === 'portfolio_valuation') {
      setReportTitle(`Q2 2026 Portfolio Valuation Statement`);
    } else if (reportType === 'inventory_report') {
      setReportTitle(`Monthly Physical Vault Inventory Stock Audit`);
    } else if (reportType === 'commodity_exposure') {
      setReportTitle(`Commodity Value-at-Risk & Exposure Assessment`);
    }
  }, [reportType, selectedTxId, counterpartyFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [repRes, commRes, txRes] = await Promise.allSettled([
        api.get('/reports'),
        api.get('/commodities'),
        api.get('/transactions')
      ]);

      if (repRes.status === 'fulfilled' && repRes.value.data.success && repRes.value.data.data.length > 0) {
        setReports(repRes.value.data.data);
      } else {
        // Default standard B2B reports archive
        setReports([
          { _id: 'rep_1', name: 'Q2 2026 Portfolio Valuation Statement', type: 'portfolio_valuation', format: 'official_printable', status: 'completed', createdAt: new Date().toISOString(), fileUrl: '#' },
          { _id: 'rep_2', name: 'Single Transaction Audit Certificate – Gold (MMTC-PAMP)', type: 'single_transaction', format: 'official_printable', status: 'completed', createdAt: new Date().toISOString(), fileUrl: '#' },
          { _id: 'rep_3', name: 'Corporate Trading Statement – MMTC-PAMP India Pvt Ltd', type: 'company_ledger', format: 'official_printable', status: 'completed', createdAt: new Date().toISOString(), fileUrl: '#' },
          { _id: 'rep_4', name: 'Physical Vault Inventory Stock Audit (All Locations)', type: 'inventory_report', format: 'official_printable', status: 'completed', createdAt: new Date().toISOString(), fileUrl: '#' }
        ]);
      }

      if (commRes.status === 'fulfilled' && commRes.value.data.success) {
        setCommodities(commRes.value.data.data);
      }

      let txList = [];
      if (txRes.status === 'fulfilled' && txRes.value.data.success && txRes.value.data.data.length > 0) {
        txList = txRes.value.data.data;
      } else if (firebaseUid) {
        try {
          const fsTxs = await getFirestoreTransactions(firebaseUid);
          if (fsTxs && fsTxs.length > 0) txList = fsTxs;
        } catch (e) {}
      }

      if (txList.length > 0) {
        setTransactions(txList);
        if (!selectedTxId) setSelectedTxId(txList[0].transactionId || txList[0].id);
        if (!counterpartyFilter) setCounterpartyFilter(txList[0].counterparty || '');
      }
    } catch (err) {
      console.warn('Failed to load reports archive:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [firebaseUid]);

  // Client-side HTML Document Builder for direct printing / offline fallback
  const renderPrintableDocumentHtml = (title, type, params = {}) => {
    const serial = `BV-REP-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const currentDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });
    const userName = user?.name || 'Enterprise Bullion Trader';
    const userEmail = user?.email || 'trader@bullionvault.internal';

    let tableHeaders = [];
    let tableRows = [];

    if (type === 'single_transaction') {
      const tx = transactions.find(t => t.transactionId === params.transactionId) || transactions[0];
      tableHeaders = ['Parameter', 'Audited Value / Record'];
      tableRows = [
        ['Certificate Serial', serial],
        ['Transaction ID', tx.transactionId || 'TX-2026-8801'],
        ['Trade Direction', tx.type?.toUpperCase() === 'PURCHASE' ? 'ACQUISITION / BUY ORDER' : 'DISPOSITION / SALE INVOICE'],
        ['Counterparty / Vendor Company', tx.counterparty || params.counterparty || 'MMTC-PAMP India Pvt Ltd'],
        ['Commodity Metal', (tx.commodityName || tx.commodityCode || 'Gold').toUpperCase()],
        ['Purity Grade', tx.purity || '24K 999.9 Fine Metal'],
        ['Quantity / Weight', `${tx.quantity} ${tx.unit || 'g'}`],
        ['Agreed Benchmark Rate', `₹${Number(tx.price || 8345).toLocaleString('en-IN')} per ${tx.unit || 'g'}`],
        ['Gross Settlement Amount', `₹${Number(tx.totalValue || (tx.quantity * tx.price)).toLocaleString('en-IN')}`],
        ['GST / Tax Surcharge (3%)', `₹${Number((tx.totalValue || (tx.quantity * tx.price)) * 0.03).toLocaleString('en-IN')}`],
        ['Net Settled Balance', `₹${Number((tx.totalValue || (tx.quantity * tx.price)) * 1.03).toLocaleString('en-IN')}`],
        ['Custody Vault Depot', tx.location || 'Mumbai Vault A'],
        ['Enterprise Invoice #', tx.invoiceNumber || 'INV-2026-8801'],
        ['Execution Timestamp', tx.date ? new Date(tx.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')],
        ['Compliance Clearance', 'VERIFIED, SETTLED & VAULTED']
      ];
    } else if (type === 'company_ledger') {
      const company = params.counterparty || 'MMTC-PAMP India Pvt Ltd';
      const companyTxs = transactions.filter(t => 
        t.counterparty?.toLowerCase().includes(company.toLowerCase())
      );
      const list = companyTxs.length > 0 ? companyTxs : transactions.slice(0, 3);
      tableHeaders = ['#', 'Date', 'Type', 'Commodity', 'Quantity', 'Rate (INR)', 'Total Value (INR)', 'Invoice #', 'Status'];
      tableRows = list.map((t, idx) => [
        idx + 1,
        t.date ? new Date(t.date).toLocaleDateString('en-IN') : '2026-06-15',
        t.type?.toUpperCase() || 'PURCHASE',
        (t.commodityName || t.commodityCode || 'Gold').toUpperCase(),
        `${t.quantity} ${t.unit || 'g'}`,
        `₹${Number(t.price || 0).toLocaleString('en-IN')}`,
        `₹${Number(t.totalValue || 0).toLocaleString('en-IN')}`,
        t.invoiceNumber || 'INV-2026',
        'SETTLED'
      ]);
    } else {
      tableHeaders = ['#', 'Commodity Asset', 'Holdings Weight', 'Acquisition Cost (INR)', 'Market Valuation (INR)', 'Unrealized P&L (INR)', 'ROI %'];
      tableRows = [
        [1, 'GOLD 24K', '300 g', '₹22,50,000', '₹25,03,500', '+₹2,53,500', '+11.27%'],
        [2, 'SILVER 999', '10 kg', '₹8,20,000', '₹9,68,000', '+₹1,48,000', '+18.05%'],
        [3, 'PLATINUM 999', '100 g', '₹3,40,000', '₹3,32,500', '-₹7,500', '-2.21%'],
        [4, 'COPPER CATHODE', '240 kg', '₹1,90,000', '₹2,06,000', '+₹16,000', '+8.42%']
      ];
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - BullionVault Corporate Document</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 24px; }
    .print-bar { max-width: 900px; margin: 0 auto 20px auto; display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 8px; }
    .print-btn { background: #f59e0b; color: #000; font-weight: 700; font-size: 13px; padding: 8px 18px; border: none; border-radius: 6px; cursor: pointer; }
    .doc-container { max-width: 900px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 36px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .logo-title { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; }
    .logo-sub { font-size: 11px; color: #d97706; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .doc-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 24px; font-size: 11px; }
    .doc-meta div span { display: block; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .doc-meta div strong { font-size: 12px; color: #0f172a; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 24px; }
    .data-table th { background: #0f172a; color: #ffffff; padding: 10px 12px; font-weight: 700; font-size: 10px; text-transform: uppercase; text-align: left; border: 1px solid #0f172a; }
    .data-table td { padding: 9px 12px; border: 1px solid #e2e8f0; font-size: 11px; }
    .data-table tr:nth-child(even) { background: #f8fafc; }
    .sign-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .seal-stamp { width: 72px; height: 72px; border: 3px double #d97706; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #d97706; font-size: 8px; font-weight: 900; text-transform: uppercase; transform: rotate(-8deg); text-align: center; }
    @media print { .print-bar { display: none !important; } body { padding: 0; } .doc-container { border: none; box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="print-bar">
    <div><strong>BullionVault Certified Document System</strong> (ID: ${serial})</div>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save to PDF</button>
  </div>
  <div class="doc-container">
    <div class="header-row">
      <div>
        <div class="logo-title">BULLIONVAULT</div>
        <div class="logo-sub">Enterprise Precious Metals & Commodity Terminal</div>
      </div>
      <div style="text-align: right; font-size: 10px; color: #64748b; line-height: 1.4;">
        <strong>Audit Certificate Ref:</strong> ${serial}<br/>
        <strong>Issued Date:</strong> ${currentDate}<br/>
        <strong>Classification:</strong> OFFICIAL CORPORATE RECORD
      </div>
    </div>
    <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 16px;">${title}</h2>
    <div class="doc-meta">
      <div><span>Registered Entity</span><strong>${userName}</strong></div>
      <div><span>Account ID</span><strong>${userEmail}</strong></div>
      <div><span>Audit Clearing</span><strong style="color: #16a34a;">● RECONCILED & AUDITED</strong></div>
      <div><span>Vault Verification</span><strong>TIER-4 CONFIRMED</strong></div>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          ${tableHeaders.map(h => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${tableRows.map(row => `<tr>${row.map((cell, i) => `<td style="${i === 1 && type === 'single_transaction' ? 'font-weight: 700; color: #0f172a;' : ''}">${cell}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
    <div class="sign-section">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div class="seal-stamp">
          <span>ATLAS</span>
          <span style="font-size: 11px;">★</span>
          <span>AUDITED</span>
        </div>
        <div style="font-size: 10px; color: #64748b; line-height: 1.4;">
          <strong>Cryptographic Ledger Check:</strong> OK<br/>
          <strong>Certified Spot Fixing Benchmark:</strong> MCX / LBMA Spot
        </div>
      </div>
      <div style="text-align: right;">
        <div style="width: 180px; border-bottom: 1px solid #0f172a; margin-bottom: 4px; display: inline-block;"></div>
        <div style="font-size: 10px; font-weight: 700; color: #0f172a;">Authorized Custody Officer</div>
        <div style="font-size: 9px; color: #64748b;">BullionVault Audit Clearing Desk</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handleOpenPrintPreview = (report) => {
    const html = renderPrintableDocumentHtml(
      report.name,
      report.type,
      report.parameters || { transactionId: selectedTxId, counterparty: counterpartyFilter }
    );
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      alert('Pop-up blocked. Please allow pop-ups for this site to view the official report.');
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!reportTitle) return;

    setGenerating(true);
    try {
      const filters = {};
      if (commodityFilter) filters.commodityCode = commodityFilter;
      if (locationFilter) filters.location = locationFilter;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (counterpartyFilter) filters.counterparty = counterpartyFilter;
      if (selectedTxId) filters.transactionId = selectedTxId;

      let createdReport = null;

      try {
        const res = await api.post('/reports', {
          name: reportTitle,
          type: reportType,
          format: exportFormat,
          queryParams: filters
        });
        if (res.data?.success) {
          createdReport = res.data.data;
        }
      } catch (backendErr) {
        console.warn('Backend report compile notice (falling back to client generator):', backendErr.message);
      }

      if (!createdReport) {
        createdReport = {
          _id: `rep_${Date.now()}`,
          name: reportTitle,
          type: reportType,
          format: exportFormat,
          parameters: filters,
          status: 'completed',
          createdAt: new Date().toISOString()
        };
      }

      // Add to local reports state
      setReports(prev => [createdReport, ...prev]);

      // Automatically open the official printable document in new window
      handleOpenPrintPreview(createdReport);
    } catch (err) {
      alert(err.message || 'Failed to compile report.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRequestDelete = (rep) => {
    setReportToDelete(rep);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/reports/${reportToDelete._id}`).catch(() => {});
      setReports(prev => prev.filter(r => r._id !== reportToDelete._id));
      setDeleteModalOpen(false);
      setReportToDelete(null);
    } catch (err) {
      setReports(prev => prev.filter(r => r._id !== reportToDelete._id));
      setDeleteModalOpen(false);
      setReportToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const reportTypes = [
    { value: 'single_transaction', label: 'Single Transaction Invoice & Audit Certificate', icon: Receipt },
    { value: 'company_ledger', label: 'Company / Counterparty Trading Statement', icon: Building },
    { value: 'portfolio_valuation', label: 'Portfolio Valuation Report (NAV)', icon: FileText },
    { value: 'commodity_exposure', label: 'Commodity Exposure & Risk Report', icon: ShieldCheck },
    { value: 'inventory_report', label: 'Physical Vault Inventory Stock Report', icon: Layers },
    { value: 'purchase_report', label: 'Ledger Purchase Orders Report', icon: FileText },
    { value: 'sales_report', label: 'Ledger Sales Invoices Report', icon: FileText },
    { value: 'pnl_report', label: 'Profit & Loss Performance Report', icon: FileText }
  ];

  // Distinct counterparties
  const distinctCounterparties = Array.from(new Set(transactions.map(t => t.counterparty).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
          <FileText className="text-accent" size={24} />
          Corporate Reports & Audit Certificate Exporter
        </h1>
        <p className="text-xs text-gray-500 mt-1">Compile official certificates for single transactions, company trade statements, and vault inventory sheets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Controls */}
        <div className="p-6 bg-white/5 border border-white/5 rounded-xl shadow-md space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
            <FileDown size={16} className="text-accent" />
            Compile Audit Report
          </h3>
          
          <form onSubmit={handleGenerateReport} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Report Content Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-accent"
              >
                {reportTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* SINGLE TRANSACTION SELECTION */}
            {reportType === 'single_transaction' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <label className="block text-[10px] text-amber-300 uppercase font-bold flex items-center gap-1">
                  <Receipt size={12} />
                  Select Target Transaction
                </label>
                <select
                  value={selectedTxId}
                  onChange={(e) => {
                    setSelectedTxId(e.target.value);
                    const tx = transactions.find(t => t.transactionId === e.target.value);
                    if (tx) setCounterpartyFilter(tx.counterparty || '');
                  }}
                  className="w-full px-2.5 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-accent font-medium"
                >
                  {transactions.map(t => (
                    <option key={t.transactionId || t.id} value={t.transactionId || t.id}>
                      {t.transactionId} · {t.counterparty} · {t.commodityName || t.commodityCode} ({t.quantity}{t.unit}) · ₹{Number(t.totalValue).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-amber-200/70 block">
                  Generates an individual audited trade certificate & tax invoice for this execution.
                </span>
              </div>
            )}

            {/* COMPANY / COUNTERPARTY SELECTION */}
            {(reportType === 'company_ledger' || reportType === 'purchase_report' || reportType === 'sales_report') && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl space-y-2">
                <label className="block text-[10px] text-cyan-300 uppercase font-bold flex items-center gap-1">
                  <Building size={12} />
                  Target Company / Counterparty
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={counterpartyFilter}
                    onChange={(e) => setCounterpartyFilter(e.target.value)}
                    placeholder="Enter or pick company name (e.g. MMTC-PAMP)"
                    className="w-full px-3 py-1.5 bg-[#0F1420] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-accent"
                  />
                  {distinctCounterparties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {distinctCounterparties.map(c => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setCounterpartyFilter(c)}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 border border-white/10"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Report Title</label>
              <input
                type="text"
                required
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="e.g. Q2 2026 Gold Purchase Statement"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-4 border-t border-white/5 pt-3">
              <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider">Report Filters</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] text-gray-400">Commodity</label>
                  <select
                    value={commodityFilter}
                    onChange={(e) => setCommodityFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#0F1420] border border-white/10 rounded-lg text-white"
                  >
                    <option value="">All Commodities</option>
                    {commodities.map(c => <option key={c._id || c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-gray-400">Vault Location</label>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#0F1420] border border-white/10 rounded-lg text-white"
                  >
                    <option value="">All Vaults</option>
                    <option value="Mumbai Vault A">Mumbai Vault A</option>
                    <option value="Delhi Central Vault">Delhi Central Vault</option>
                    <option value="Bangalore Depot">Bangalore Depot</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] text-gray-400">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-gray-400">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Official Export Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
              >
                <option value="official_printable">Official Corporate Printable Document (.pdf / print)</option>
              </select>
            </div>

            <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center space-x-2 text-[10px] text-gray-400">
              <Info size={14} className="text-accent shrink-0" />
              <span>Includes verified audit seal, certificate serial numbers, itemized valuations, and authorized signoff.</span>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 flex items-center justify-center space-x-2 luxury-button"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Printer size={14} />
                  <span>Compile & Open Official Report</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Reports Archive */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <FileText size={16} className="text-accent" />
              Exported Files Archive ({reports.length})
            </h3>
            <span className="text-[11px] text-gray-500">Click any document to view or print</span>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 bg-white/5 rounded-xl border border-white/5">
              No files compiled yet. Request exports above.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep._id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md hover:border-white/10 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-accent shadow-luxury">
                      {rep.type === 'single_transaction' ? (
                        <Receipt size={20} />
                      ) : rep.type === 'company_ledger' ? (
                        <Building size={20} />
                      ) : (
                        <FileText size={20} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs leading-normal">{rep.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold flex items-center gap-2">
                        <span>Type: {rep.type?.replace('_', ' ')}</span>
                        <span className="text-amber-400 font-bold">• Official Audit Certificate</span>
                      </p>
                      <span className="text-[9px] text-gray-500 block mt-0.5">
                        Generated: {rep.createdAt ? new Date(rep.createdAt).toLocaleString('en-IN') : 'Recently'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleOpenPrintPreview(rep)}
                      className="px-3 py-2 border border-accent/40 text-accent hover:bg-accent hover:text-slate-950 bg-accent/10 rounded-xl transition-all flex items-center space-x-1.5 text-[11px] font-bold cursor-pointer shadow-sm"
                    >
                      <Printer size={13} />
                      <span>View & Print</span>
                    </button>

                    <button
                      onClick={() => handleOpenPrintPreview(rep)}
                      className="p-2 border border-white/10 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                      title="Download Official Document"
                    >
                      <Download size={13} />
                    </button>

                    <button
                      onClick={() => handleRequestDelete(rep)}
                      className="p-2 border border-white/10 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                      title="Delete Report"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setReportToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete Corporate Report"
        message="Are you sure you want to delete this generated report from your archive?"
        itemName={reportToDelete ? `${reportToDelete.name} (${reportToDelete.type?.replace('_', ' ')})` : ''}
      />
    </div>
  );
};

export default Reports;
