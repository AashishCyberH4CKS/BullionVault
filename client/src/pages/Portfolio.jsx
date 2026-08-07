import React, { useState, useEffect } from 'react';
import { portfolioService, commodityService } from '../services/api';
import GlassCard from '../components/GlassCard';
import MetricCard from '../components/MetricCard';
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
  Info
} from 'lucide-react';

const Portfolio = () => {
  const [investments, setInvestments] = useState([]);
  const [commodities, setCommodities] = useState([]);
  
  // Dashboard overall summary metrics
  const [summary, setSummary] = useState({
    totalValue: 0,
    totalInvested: 0,
    totalProfit: 0,
    roi: 0
  });

  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Load investments and commodities on boot
  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, commRes, statsRes] = await Promise.all([
        portfolioService.getInvestments(),
        commodityService.getCommodities(),
        portfolioService.getStats()
      ]);

      if (invRes.success) setInvestments(invRes.data);
      if (commRes.success) {
        setCommodities(commRes.data);
        if (commRes.data.length > 0) {
          setSelectedCommCode(commRes.data[0].code);
          setSelectedCommId(commRes.data[0]._id);
        }
      }
      if (statsRes.success) {
        setSummary(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch filters whenever the selected commodity in the form changes
  useEffect(() => {
    if (!selectedCommCode) return;
    
    const fetchFormFilters = async () => {
      try {
        const res = await commodityService.getFilters(selectedCommCode);
        if (res.success) {
          const opts = res.data;
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
        const params = {
          state: formState.state,
          purity: formState.purity,
          weight: formState.weight,
          quarter: formState.quarter
        };

        const res = await commodityService.lookupPrice(selectedCommCode, params);
        if (res.success) {
          const price = res.data.price;
          setFormState(prev => ({
            ...prev,
            purchasePrice: price
          }));
          setLookupMessage(`Fetched Rate: ₹${price.toLocaleString()} (${res.data.quarter})`);
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
        state: formState.state,
        purity: formState.purity,
        weight: formState.weight,
        quantity: Number(formState.quantity),
        purchaseDate: formState.purchaseDate || new Date().toISOString().split('T')[0],
        purchaseQuarter: formState.quarter,
        purchaseYear,
        purchasePrice: formState.purchasePrice
      };

      const res = await portfolioService.addInvestment(postData);
      if (res.success) {
        setFormOpen(false);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction from your portfolio?')) return;
    try {
      const res = await portfolioService.deleteInvestment(id);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove investment.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Portfolio Tracker</h2>
          <p className="text-gray-400 text-sm mt-1">Acquisition cost ledgers and returns simulator</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="luxury-button flex items-center space-x-2 self-start"
        >
          <Plus size={18} />
          <span>Log Precious Metals Acquisition</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Summary metrics widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Portfolio Valuation"
              value={summary.totalValue}
              subtext="Sum of Current Assets"
              changePercent={summary.roi}
              trend={summary.totalProfit >= 0 ? 'Increase' : 'Decrease'}
              icon={Briefcase}
            />
            <MetricCard
              title="Acquisition Cost"
              value={summary.totalInvested}
              subtext="Original Invested Capital"
              icon={DollarSign}
            />
            <MetricCard
              title="Cumulative Net Gain"
              value={summary.totalProfit}
              subtext="Capital Gains / Loss"
              changePercent={summary.roi}
              trend={summary.totalProfit >= 0 ? 'Increase' : 'Decrease'}
              icon={TrendingUp}
            />
            <MetricCard
              title="Net Returns (ROI)"
              value={`${summary.roi.toFixed(2)}%`}
              subtext="Return Performance Index"
              isCurrency={false}
              icon={Percent}
            />
          </div>

          {/* Investment list grid */}
          <GlassCard hover={false} className="flex flex-col">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">Investment Ledgers</h3>
              <p className="text-xs text-gray-400 mt-0.5">Asset purchase logs mapped dynamically with database prices</p>
            </div>

            <div className="overflow-x-auto">
              {investments.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 bg-white/5 rounded-full text-gray-500">
                    <Briefcase size={28} />
                  </div>
                  <p className="text-gray-400 text-sm">No metals transactions registered in your portfolio.</p>
                  <button onClick={() => setFormOpen(true)} className="luxury-button-secondary py-2 text-xs">
                    Log Transaction Now
                  </button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Asset Type</th>
                      <th className="py-4 px-6">State / UT</th>
                      <th className="py-4 px-6">Karat / Purity</th>
                      <th className="py-4 px-6">Weight</th>
                      <th className="py-4 px-6">Qty</th>
                      <th className="py-4 px-6">Acquisition Price</th>
                      <th className="py-4 px-6">Current Value</th>
                      <th className="py-4 px-6">Return Rate</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {investments.map((inv) => {
                      const isGain = inv.profit >= 0;
                      return (
                        <tr key={inv._id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-bold text-white uppercase">{inv.commodityCode}</td>
                          <td className="py-4 px-6 text-gray-300">{inv.state}</td>
                          <td className="py-4 px-6">{inv.purity}</td>
                          <td className="py-4 px-6">{inv.weight}g</td>
                          <td className="py-4 px-6 text-white font-medium">{inv.quantity}</td>
                          <td className="py-4 px-6">
                            <span className="text-gray-400 block text-xs">₹{inv.purchasePrice.toLocaleString()} / unit</span>
                            <span className="text-white">₹{inv.investedValue.toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-gray-400 block text-xs">₹{inv.currentPrice.toLocaleString()} / unit</span>
                            <span className="text-accent font-semibold">₹{inv.currentValue.toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`font-bold flex items-center ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isGain ? <ArrowUpRight size={14} className="mr-0.5" /> : <ArrowDownRight size={14} className="mr-0.5" />}
                              {isGain ? '+' : ''}{inv.growthPercent.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-gray-500">₹{inv.profit.toLocaleString()} gain</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleDelete(inv._id)}
                              className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                              title="Delete Ledger"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </GlassCard>

          {/* Add transaction modal */}
          {formOpen && (
            <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <GlassCard hover={false} className="w-full max-w-xl p-8 border border-white/10 shadow-glass">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">Log Commodity Transaction</h3>
                    <p className="text-xs text-gray-400 mt-1">Verify rates using automated database index lookups</p>
                  </div>
                  <button
                    onClick={() => setFormOpen(false)}
                    className="p-2 text-gray-500 hover:text-white bg-white/5 rounded-lg cursor-pointer"
                  >
                    X
                  </button>
                </div>

                <form onSubmit={handleAddSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Commodity Selection */}
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Commodity</label>
                      <select
                        value={selectedCommCode}
                        onChange={handleCommodityChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                      >
                        {commodities.map(c => (
                          <option key={c.code} value={c.code} className="bg-[#0B0F19] text-white">{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quarter Selection */}
                    {filterOpts.quarters && (
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Quarter Purchased</label>
                        <select
                          name="quarter"
                          value={formState.quarter}
                          onChange={handleInputChange}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                        >
                          {filterOpts.quarters.map(q => (
                            <option key={q} value={q} className="bg-[#0B0F19] text-white">{q}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* State Selection */}
                    {filterOpts.states && (
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">State / UT Location</label>
                        <select
                          name="state"
                          value={formState.state}
                          onChange={handleInputChange}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                        >
                          {filterOpts.states.map(s => (
                            <option key={s} value={s} className="bg-[#0B0F19] text-white">{s}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Purity Selection */}
                    {filterOpts.purities && (
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Purity / Grade</label>
                        <select
                          name="purity"
                          value={formState.purity}
                          onChange={handleInputChange}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                        >
                          {filterOpts.purities.map(p => (
                            <option key={p} value={p} className="bg-[#0B0F19] text-white">{p}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Weight Selection */}
                    {filterOpts.weights && (
                      <div className="col-span-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Weight</label>
                        <select
                          name="weight"
                          value={formState.weight}
                          onChange={handleInputChange}
                          disabled={selectedCommCode === 'crudeoil'}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent disabled:opacity-30"
                        >
                          {filterOpts.weights.map(w => (
                            <option key={w} value={w} className="bg-[#0B0F19] text-white">{w}g</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Quantity Input */}
                    <div className="col-span-1">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Quantity</label>
                      <input
                        type="number"
                        name="quantity"
                        min="1"
                        required
                        value={formState.quantity}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                      />
                    </div>

                    {/* Date Input */}
                    <div className="col-span-1">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Purchase Date</label>
                      <input
                        type="date"
                        name="purchaseDate"
                        value={formState.purchaseDate}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  {/* Auto lookup pricing alert box */}
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Info size={18} className="text-accent" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Automatic Database Price Index Lookup</p>
                        <p className="text-sm font-bold text-white mt-0.5">
                          {lookupLoading ? 'Evaluating index rate...' : (lookupMessage || 'Select values to lookup rate.')}
                        </p>
                      </div>
                    </div>
                    {formState.purchasePrice > 0 && !lookupLoading && (
                      <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center">
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setFormOpen(false)}
                      className="luxury-button-secondary py-2.5 px-5 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || formState.purchasePrice === 0}
                      className="luxury-button py-2.5 px-5 text-sm disabled:opacity-30 disabled:pointer-events-none"
                    >
                      {submitting ? 'Registering...' : 'Add to Holdings'}
                    </button>
                  </div>

                </form>
              </GlassCard>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default Portfolio;
