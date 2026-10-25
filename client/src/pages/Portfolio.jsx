import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Trash2, 
  Briefcase, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Layers,
  MapPin,
  Scale,
  DollarSign,
  Percent,
  CheckCircle,
  XCircle,
  Info,
  Database,
  Flame
} from 'lucide-react';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { 
  saveFirestoreHolding, 
  getFirestoreHoldings, 
  deleteFirestoreHolding, 
  calculateFirestorePortfolioStats 
} from '../services/firestoreService';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : ''),
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

const Portfolio = () => {
  const { setCommodity } = useTheme();
  const { firebaseUid } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'overview';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [investments, setInvestments] = useState([]);
  const [commodities, setCommodities] = useState([]);
  
  // Dashboard overall summary metrics
  const [summary, setSummary] = useState({
    totalValue: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0,
    allocations: [],
    performance: { best: null, worst: null },
    timeline: []
  });

  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [holdingToDelete, setHoldingToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form states
  const [selectedCommCode, setSelectedCommCode] = useState('');
  const [selectedCommId, setSelectedCommId] = useState('');
  const [filterOpts, setFilterOpts] = useState({
    states: [],
    purities: [],
    weights: [],
    quarters: []
  });

  const [formState, setFormState] = useState({
    state: '',
    purity: '',
    weight: '',
    quarter: '',
    quantity: 1,
    purchaseDate: '',
    purchasePrice: 0
  });

  const [lookupMessage, setLookupMessage] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Load investments and commodities on boot
  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, commRes, statsRes] = await Promise.allSettled([
        api.get('/api/portfolio'),
        api.get('/api/commodities'),
        api.get('/api/portfolio/stats')
      ]);

      let backendInvestments = [];
      if (invRes.status === 'fulfilled' && invRes.value.data.success) {
        backendInvestments = invRes.value.data.data;
      }
      if (commRes.status === 'fulfilled' && commRes.value.data.success) {
        setCommodities(commRes.value.data.data);
        if (commRes.value.data.data.length > 0) {
          setSelectedCommCode(commRes.value.data.data[0].code);
          setSelectedCommId(commRes.value.data.data[0]._id);
        }
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
        setSummary(statsRes.value.data.data);
      }

      // Retrieve user's holdings directly from Cloud Firestore
      let firestoreHoldings = [];
      if (firebaseUid) {
        try {
          firestoreHoldings = await getFirestoreHoldings(firebaseUid);
        } catch (fsErr) {
          console.warn('Firestore getHoldings notice:', fsErr.message);
        }
      }

      // Merge Firestore holdings and MongoDB holdings
      const holdingsMap = new Map();
      firestoreHoldings.forEach(h => {
        const key = h.id || `${h.commodityCode}_${h.unit || h.weight}`;
        holdingsMap.set(key, { ...h, source: 'firestore' });
      });
      backendInvestments.forEach(h => {
        const key = h._id || `${h.commodityCode}_${h.weight}`;
        if (!holdingsMap.has(key)) {
          holdingsMap.set(key, { ...h, source: 'mongodb' });
        }
      });

      const merged = Array.from(holdingsMap.values());
      setInvestments(merged);

      if (firestoreHoldings.length > 0) {
        const stats = calculateFirestorePortfolioStats(merged);
        setSummary(prev => ({
          ...prev,
          totalValue: stats.totalValue || prev.totalValue,
          totalInvested: stats.totalInvested || prev.totalInvested,
          totalProfit: stats.totalProfit !== undefined ? stats.totalProfit : prev.totalProfit,
          roi: stats.roi !== undefined ? stats.roi : prev.roi,
          allocations: stats.allocations && stats.allocations.length > 0 ? stats.allocations : prev.allocations
        }));
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDelete = (inv) => {
    setHoldingToDelete(inv);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!holdingToDelete) return;
    try {
      setDeleteLoading(true);

      // Delete from Firestore
      if (firebaseUid) {
        try {
          await deleteFirestoreHolding(firebaseUid, holdingToDelete._id || holdingToDelete.id);
        } catch (fsErr) {}
      }

      // Delete from backend API
      try {
        await api.delete(`/api/portfolio/${holdingToDelete._id}`);
      } catch (apiErr) {}

      setDeleteModalOpen(false);
      setHoldingToDelete(null);
      loadData();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, firebaseUid]);

  // Fetch filters whenever the selected commodity in the form changes
  useEffect(() => {
    if (!selectedCommCode) return;
    
    const fetchFormFilters = async () => {
      try {
        const res = await api.get(`/api/commodities/${selectedCommCode}/filters`);
        if (res.data.success) {
          const opts = res.data.data;
          setFilterOpts(opts);
          
          // Reset form fields to matching defaults
          setFormState(prev => ({
            ...prev,
            state: opts.states.includes('National') ? 'National' : opts.states[0] || '',
            purity: opts.purities[0] || '',
            weight: opts.weights[0] || 1,
            quarter: opts.quarters[0] || '',
            purchasePrice: 0
          }));
          setLookupMessage('');
        }
      } catch (err) {
        console.error('Failed to fetch commodity filters:', err.message);
      }
    };
    fetchFormFilters();
  }, [selectedCommCode]);

  // Automatically lookup price whenever form state values change
  useEffect(() => {
    if (!selectedCommCode || !formState.state || !formState.purity || !formState.quarter) return;

    const performPriceLookup = async () => {
      setLookupLoading(true);
      setLookupMessage('');
      try {
        const params = [];
        if (formState.state) params.push(`state=${formState.state}`);
        if (formState.purity) params.push(`purity=${formState.purity}`);
        if (formState.weight) params.push(`weight=${formState.weight}`);
        if (formState.quarter) params.push(`quarter=${formState.quarter}`);
        
        let url = `/api/commodities/${selectedCommCode}/lookup`;
        if (params.length > 0) url += `?${params.join('&')}`;

        const res = await api.get(url);
        if (res.data.success) {
          const price = res.data.data.price;
          setFormState(prev => ({
            ...prev,
            purchasePrice: price
          }));
          setLookupMessage(`Fetched Rate: ₹${price.toLocaleString()} (${res.data.data.quarter})`);
        }
      } catch (err) {
        setFormState(prev => ({
          ...prev,
          purchasePrice: 0
        }));
        setLookupMessage('No historical rate record matches selections.');
      } finally {
        setLookupLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      performPriceLookup();
    }, 400); // Debounce to allow scroll changes

    return () => clearTimeout(delayDebounce);

  }, [selectedCommCode, formState.state, formState.purity, formState.weight, formState.quarter]);

  const handleCommodityChange = (e) => {
    const code = e.target.value;
    setSelectedCommCode(code);
    const commObj = commodities.find(c => c.code === code);
    if (commObj) {
      setSelectedCommId(commObj._id);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (formState.purchasePrice === 0) {
      alert('Unable to log investment without a valid database lookup rate.');
      return;
    }

    setSubmitting(true);
    try {
      // Parse purchase quarter to extract year
      let purchaseYear = 2022;
      const parts = formState.quarter.split(/\s+/);
      if (parts.length >= 2) {
        purchaseYear = parseInt(parts[1], 10) || 2022;
      }

      const postData = {
        commodityId: selectedCommId,
        commodityCode: selectedCommCode || 'gold',
        state: formState.state,
        purity: formState.purity,
        weight: formState.weight,
        quantity: Number(formState.quantity),
        purchaseDate: formState.purchaseDate || new Date().toISOString().split('T')[0],
        purchaseQuarter: formState.quarter,
        purchaseYear,
        purchasePrice: formState.purchasePrice
      };

      // 1. Persist directly to Cloud Firestore
      if (firebaseUid) {
        try {
          await saveFirestoreHolding(firebaseUid, {
            ...postData,
            commodityName: commodities.find(c => c.code === selectedCommCode)?.name || selectedCommCode
          });
        } catch (fsErr) {
          console.warn('Firestore holding save error:', fsErr.message);
        }
      }

      // 2. Persist to Backend API to maintain MongoDB sync
      try {
        await api.post('/api/portfolio', postData);
      } catch (apiErr) {
        console.info('Backend portfolio post response:', apiErr.message);
      }

      setFormOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to register holding.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction from your portfolio?')) return;
    try {
      const res = await api.delete(`/api/portfolio/${id}`);
      if (res.data.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove investment.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
            <Briefcase className="text-accent" size={24} />
            Precious Metals Portfolio Manager
          </h1>
          <p className="text-xs text-gray-500 mt-1">Manage investment holdings, monitor unrealized returns, and review acquisition costs.</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="luxury-button py-2 px-4 text-xs flex items-center space-x-1.5 shrink-0 self-start md:self-auto"
        >
          <Plus size={14} />
          <span>Log Acquisition</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Portfolio Valuation (NAV)</p>
          <p className="text-lg font-bold text-white mt-1.5">₹{summary.totalValue.toLocaleString('en-IN')}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total Invested Capital</p>
          <p className="text-lg font-bold text-white mt-1.5">₹{summary.totalInvested.toLocaleString('en-IN')}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Cumulative Net Profit</p>
          <p className={`text-lg font-bold mt-1.5 ${summary.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            ₹{summary.totalProfit.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Return Ratio (ROI)</p>
          <p className={`text-lg font-bold mt-1.5 ${summary.roi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {summary.roi.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Custom Sub Tabs */}
      <div className="border-b border-white/5 flex space-x-6">
        {['overview', 'holdings', 'performance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab 
                ? 'border-accent text-accent' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'overview' ? 'Overview' : 
             tab === 'holdings' ? 'Holdings' : 'Performance'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset Allocation progress breakdown */}
              <div className="p-6 bg-white/5 border border-white/5 rounded-xl shadow-md space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Asset Value Allocation</h3>
                <div className="space-y-4">
                  {summary.allocations?.map((alloc) => (
                    <div key={alloc.code} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-white capitalize">{alloc.commodity}</span>
                        <span className="text-gray-400">₹{alloc.value.toLocaleString('en-IN')} ({alloc.percentage}%)</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-accent h-full rounded-full" 
                          style={{ width: `${alloc.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  {(!summary.allocations || summary.allocations.length === 0) && (
                    <div className="text-center py-10 text-xs text-gray-500">
                      No holdings available. Add records.
                    </div>
                  )}
                </div>
              </div>

              {/* Diversification exposure statistics */}
              <div className="p-6 bg-white/5 border border-white/5 rounded-xl shadow-md space-y-4 text-xs">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">diversification risk index</h3>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-400">Gold Concentration</span>
                    <span className="text-white font-semibold">
                      {summary.allocations?.find(a => a.code === 'gold')?.percentage || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-400">Silver Concentration</span>
                    <span className="text-white font-semibold">
                      {summary.allocations?.find(a => a.code === 'silver')?.percentage || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Other Concentration</span>
                    <span className="text-white font-semibold">
                      {summary.allocations ? (100 - summary.allocations.reduce((acc, c) => acc + parseFloat(c.percentage || 0), 0)).toFixed(1) : 100}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'holdings' && (
            <div className="bg-[#0b0f19] border border-white/5 rounded-xl overflow-hidden shadow-luxury">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-[10px] text-gray-400 uppercase tracking-widest">
                      <th className="p-4 font-bold">Commodity</th>
                      <th className="p-4 font-bold">Location State</th>
                      <th className="p-4 font-bold">Purity Grade</th>
                      <th className="p-4 font-bold text-right">Quantity</th>
                      <th className="p-4 font-bold text-right">Avg buy Price</th>
                      <th className="p-4 font-bold text-right">Current Price</th>
                      <th className="p-4 font-bold text-right">Invested Value</th>
                      <th className="p-4 font-bold text-right">Current Value</th>
                      <th className="p-4 font-bold text-right">Returns P&L</th>
                      <th className="p-4 font-bold text-right">ROI %</th>
                      <th className="p-4 font-bold text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {investments.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-gray-500">No holdings found. Use Log Acquisition to add entries.</td>
                      </tr>
                    ) : (
                      investments.map((inv) => {
                        const isGain = inv.profit >= 0;
                        return (
                          <tr key={inv._id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-semibold text-white uppercase">{inv.commodityCode}</td>
                            <td className="p-4 text-gray-400">{inv.state}</td>
                            <td className="p-4 text-gray-400">{inv.purity}</td>
                            <td className="p-4 text-right font-semibold text-white">
                              {inv.quantity} <span className="text-[9px] text-gray-500 uppercase">{inv.weight === 1000 ? 'kg' : 'g'}</span>
                            </td>
                            <td className="p-4 text-right text-gray-400">₹{inv.purchasePrice.toLocaleString()}</td>
                            <td className="p-4 text-right text-gray-400">₹{inv.currentPrice.toLocaleString()}</td>
                            <td className="p-4 text-right font-bold text-white">₹{inv.investedValue.toLocaleString()}</td>
                            <td className="p-4 text-right font-bold text-white">₹{inv.currentValue.toLocaleString()}</td>
                            <td className={`p-4 text-right font-bold ${isGain ? 'text-emerald-500' : 'text-red-500'}`}>
                              ₹{inv.profit.toLocaleString()}
                            </td>
                            <td className={`p-4 text-right font-black ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {inv.growthPercent.toFixed(1)}%
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleRequestDelete(inv)}
                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                title="Delete Holding"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="p-6 bg-white/5 border border-white/5 rounded-xl shadow-md space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Historical Returns Periods</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] text-gray-400 uppercase tracking-widest">
                      <th className="pb-3">Reporting Period</th>
                      <th className="pb-3 text-right">Capital Invested</th>
                      <th className="pb-3 text-right">Value Growth</th>
                      <th className="pb-3 text-right">Returns P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
                    {summary.timeline?.map((item, idx) => {
                      const delta = item.currentValue - item.invested;
                      return (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 text-white">{item.year} - {item.quarter}</td>
                          <td className="py-2.5 text-right">₹{item.invested.toLocaleString()}</td>
                          <td className="py-2.5 text-right text-white">₹{item.currentValue.toLocaleString()}</td>
                          <td className={`py-2.5 text-right ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ₹{delta.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                    {(!summary.timeline || summary.timeline.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">No historical growth logs found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Log Transaction Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-white/5 pb-2">
              <div>
                <h3 className="text-sm font-bold text-white">Add Precious Metals Acquisition</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Lookup index rates dynamically</p>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
              >
                X
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Commodity</label>
                  <select
                    value={selectedCommCode}
                    onChange={handleCommodityChange}
                    className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none"
                  >
                    {commodities.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Quarter</label>
                  <select
                    name="quarter"
                    value={formState.quarter}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none"
                  >
                    {filterOpts.quarters.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">State UT</label>
                  <select
                    name="state"
                    value={formState.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none"
                  >
                    {filterOpts.states.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Purity</label>
                  <select
                    name="purity"
                    value={formState.purity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none"
                  >
                    {filterOpts.purities.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Weight</label>
                  <select
                    name="weight"
                    value={formState.weight}
                    onChange={handleInputChange}
                    disabled={selectedCommCode === 'crudeoil'}
                    className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none disabled:opacity-40"
                  >
                    {filterOpts.weights.map(w => (
                      <option key={w} value={w}>{w}g</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    value={formState.quantity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Purchase Date</label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={formState.purchaseDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center space-x-3">
                <Info size={14} className="text-accent" />
                <div>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Pricing Index Lookup</p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {lookupLoading ? 'Evaluating price index...' : (lookupMessage || 'No price loaded')}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || formState.purchasePrice === 0}
                  className="px-4 py-2 bg-accent text-slate-950 font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
                >
                  {submitting ? 'Adding...' : 'Add to Portfolio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setHoldingToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete Portfolio Holding"
        message="Are you sure you want to delete this precious metal holding record?"
        itemName={holdingToDelete ? `${holdingToDelete.commodityCode?.toUpperCase()} (${holdingToDelete.purity}, ${holdingToDelete.quantity}x ${holdingToDelete.weight}g) | Invested: ₹${holdingToDelete.investedValue?.toLocaleString()}` : ''}
      />
    </div>
  );
};

export default Portfolio;
