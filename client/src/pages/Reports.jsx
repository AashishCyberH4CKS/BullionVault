import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Download, FileDown, CheckCircle, Info, Calendar, Filter, Printer, ExternalLink, Trash2 } from 'lucide-react';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : ''),
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('token');
  if (window.Clerk?.session) {
    try {
      const freshToken = await window.Clerk.session.getToken();
      if (freshToken) {
        token = freshToken;
        localStorage.setItem('token', freshToken);
      }
    } catch (e) {}
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form parameters
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState('portfolio_valuation');
  const [exportFormat, setExportFormat] = useState('official_printable');
  
  // Filters
  const [commodityFilter, setCommodityFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      const [repRes, commRes] = await Promise.all([
        api.get('/api/reports'),
        api.get('/api/commodities')
      ]);

      if (repRes.data.success) setReports(repRes.data.data);
      if (commRes.data.success) setCommodities(commRes.data.data);
    } catch (err) {
      console.error('Failed to load B2B reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

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

      // Create backend report record
      const res = await api.post('/api/reports', {
        name: reportTitle,
        type: reportType,
        format: exportFormat,
        queryParams: filters
      });

      if (res.data.success) {
        setReportTitle('');
        loadReports();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to compile report.');
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
      await api.delete(`/api/reports/${reportToDelete._id}`);
      setDeleteModalOpen(false);
      setReportToDelete(null);
      loadReports();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  const reportTypes = [
    { value: 'portfolio_valuation', label: 'Portfolio Valuation Report' },
    { value: 'commodity_exposure', label: 'Commodity Exposure Report' },
    { value: 'inventory_report', label: 'Inventory Stock Report' },
    { value: 'purchase_report', label: 'Ledger Purchase Orders Report' },
    { value: 'sales_report', label: 'Ledger Sales Invoices Report' },
    { value: 'pnl_report', label: 'Profit & Loss Performance Report' },
    { value: 'risk_report', label: 'Concentration & Risk Report' },
    { value: 'monthly_performance', label: 'Monthly Performance Review' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
          <FileText className="text-accent" size={24} />
          Corporate Reports Exporter
        </h1>
        <p className="text-xs text-gray-500 mt-1">Compile structured portfolios, inventory stocks, and P&L ledger data sheets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Controls */}
        <div className="p-6 bg-white/5 border border-white/5 rounded-xl shadow-md space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
            <FileDown size={16} className="text-accent" />
            Compile Report
          </h3>
          
          <form onSubmit={handleGenerateReport} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Report Title</label>
              <input
                type="text"
                required
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="e.g. Q2 2026 Gold Holdings Valuation"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Report Content Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none"
              >
                {reportTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
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
                    <option value="">All</option>
                    {commodities.map(c => <option key={c._id} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-gray-400">Location Office</label>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#0F1420] border border-white/10 rounded-lg text-white"
                  >
                    <option value="">All</option>
                    <option value="Mumbai Office">Mumbai Office</option>
                    <option value="Delhi Office">Delhi Office</option>
                    <option value="Main Warehouse">Main Warehouse</option>
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
              <span>Compiled in institutional corporate letterhead format, optimized for printing & PDF export.</span>
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
                  <span>Compile Official Report</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Reports Archive */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white mb-2">Exported Files Archive</h3>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 bg-white/5 rounded-xl border border-white/5">
              No files compiled yet. Request exports.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep._id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-accent shadow-luxury">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs leading-normal">{rep.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold flex items-center gap-2">
                        <span>Type: {rep.type?.replace('_', ' ')}</span>
                        <span className="text-amber-400 font-bold">• Official Printable Document</span>
                      </p>
                      <span className="text-[9px] text-gray-500 block mt-0.5">
                        Generated: {new Date(rep.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <a
                      href={rep.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 border border-accent/40 text-accent hover:bg-accent hover:text-slate-950 bg-accent/10 rounded-xl transition-all flex items-center space-x-1.5 text-[11px] font-bold cursor-pointer shadow-sm"
                    >
                      <Printer size={13} />
                      <span>View & Print</span>
                    </a>

                    <a
                      href={`/api/reports/download/${rep._id}`}
                      download
                      className="p-2 border border-white/10 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                      title="Download Official Document"
                    >
                      <Download size={13} />
                    </a>

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
