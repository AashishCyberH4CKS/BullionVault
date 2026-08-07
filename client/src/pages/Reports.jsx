import React, { useState, useEffect } from 'react';
import { reportService, commodityService } from '../services/api';
import GlassCard from '../components/GlassCard';
import { 
  FileText, 
  Download, 
  FileDown, 
  CheckCircle,
  Plus,
  Info
} from 'lucide-react';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [commodities, setCommodities] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form parameters
  const [name, setName] = useState('');
  const [type, setType] = useState('portfolio');
  const [format, setFormat] = useState('excel');
  
  // Extra filter parameters (for historical report)
  const [selectedCommCode, setSelectedCommCode] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [filterOpts, setFilterOpts] = useState({ states: [] });

  const loadReports = async () => {
    setLoading(true);
    try {
      const [reportsRes, commRes] = await Promise.all([
        reportService.getReports(),
        commodityService.getCommodities()
      ]);
      if (reportsRes.success) setReports(reportsRes.data);
      if (commRes.success && commRes.data.length > 0) {
        setCommodities(commRes.data);
        setSelectedCommCode(commRes.data[0].code);
      }
    } catch (err) {
      console.error('Failed to load reports ledger:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Fetch states filter options if user is compiling historical record sheet
  useEffect(() => {
    if (type !== 'historical' || !selectedCommCode) return;
    const fetchFilters = async () => {
      try {
        const res = await commodityService.getFilters(selectedCommCode);
        if (res.success) {
          setFilterOpts(res.data);
          setSelectedState(res.data.states[0] || '');
        }
      } catch (err) {
        console.error('Failed to fetch historical parameters:', err.message);
      }
    };
    fetchFilters();
  }, [type, selectedCommCode]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!name) return;

    setGenerating(true);
    try {
      const reportParams = {};
      if (type === 'historical') {
        reportParams.code = selectedCommCode;
        if (selectedState) reportParams.state = selectedState;
      }

      const res = await reportService.generateReport({
        name,
        type,
        format,
        queryParams: reportParams
      });

      if (res.success) {
        setName('');
        loadReports();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to compile report.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Reports Exporter</h2>
        <p className="text-gray-400 text-sm mt-1">Export transaction summaries, histories and stats into Excel files</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Generate Report Form */}
        <div className="lg:col-span-1">
          <GlassCard hover={false} className="p-6 space-y-5">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
              <FileDown size={18} className="mr-2 text-accent" />
              <span>Compile Report</span>
            </h3>

            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Report Name */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Report Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q2 2026 Gold Holdings"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                />
              </div>

              {/* Report Type */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Report Content Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                >
                  <option value="portfolio" className="bg-[#0B0F19] text-white">Holdings Valuation (Portfolio)</option>
                  <option value="investment" className="bg-[#0B0F19] text-white">Investments Ledgers (Transactions)</option>
                  <option value="historical" className="bg-[#0B0F19] text-white">Historical price indexes sheets</option>
                  <option value="analytics" className="bg-[#0B0F19] text-white">Analytics summaries statistics</option>
                </select>
              </div>

              {/* Historical-specific sub-parameters */}
              {type === 'historical' && (
                <div className="space-y-4 border-t border-white/5 pt-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Dataset constraints</p>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-2">Select Commodity</label>
                    <select
                      value={selectedCommCode}
                      onChange={(e) => setSelectedCommCode(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                    >
                      {commodities.map(c => (
                        <option key={c.code} value={c.code} className="bg-[#0B0F19] text-white">{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {filterOpts.states.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-2">Select Location</label>
                      <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
                      >
                        <option value="" className="bg-[#0B0F19] text-white">All Locations</option>
                        {filterOpts.states.map(s => (
                          <option key={s} value={s} className="bg-[#0B0F19] text-white">{s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Format selection */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Export Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                >
                  <option value="excel" className="bg-[#0B0F19] text-white">Microsoft Excel (.xlsx)</option>
                  <option value="csv" className="bg-[#0B0F19] text-white">Comma Separated Values (.csv)</option>
                  <option value="pdf" className="bg-[#0B0F19] text-white">Structured Summary Report (.pdf)</option>
                </select>
              </div>

              {/* Info alerts */}
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex items-center space-x-2 text-gray-400">
                <Info size={14} className="text-accent" />
                <span>Generated files are stored on server, ready for immediate download links.</span>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 mt-2 flex items-center justify-center space-x-2 luxury-button text-sm"
              >
                {generating ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Compile & Export</span>
                  </>
                )}
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Generated Reports List */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-white">Generated Exports Ledgers</h3>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : reports.length === 0 ? (
            <GlassCard hover={false} className="p-12 text-center text-gray-400">
              No files exported yet. Use the control console on the left to request exports.
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {reports.map((rep) => {
                const isExcel = rep.format === 'excel' || rep.format === 'xlsx';
                const isCSV = rep.format === 'csv';
                
                return (
                  <GlassCard hover={false} key={rep._id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-accent shadow-luxury">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{rep.name}</h4>
                        <p className="text-xs text-gray-400 mt-1 uppercase font-semibold">
                          Type: {rep.type} | Format: {rep.format}
                        </p>
                        <span className="text-[10px] text-gray-500 block mt-1">
                          Generated: {new Date(rep.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <a
                      href={rep.fileUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 border border-white/10 text-gray-400 hover:text-accent bg-white/5 rounded-xl transition-all flex items-center space-x-1.5 text-xs font-semibold hover:border-accent/30 cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Download File</span>
                    </a>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Reports;
