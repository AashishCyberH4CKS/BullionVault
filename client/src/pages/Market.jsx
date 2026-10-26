import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../hooks/useTheme';
import { 
  TrendingUp, 
  Search, 
  Filter, 
  Sliders, 
  TrendingDown, 
  Info, 
  Download, 
  BookOpen, 
  Compass, 
  ChevronLeft, 
  ChevronRight,
  Scale
} from 'lucide-react';

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

const Market = () => {
  const { commodity: activeThemeCommodity, setCommodity } = useTheme();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'prices';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [commodities, setCommodities] = useState([]);
  const [selectedCommodity, setSelectedCommodity] = useState(activeThemeCommodity || 'gold');
  const [unitFilter, setUnitFilter] = useState('g'); // g, kg, ton, barrel
  const [timeFilter, setTimeFilter] = useState('3m'); // 1d, 1w, 1m, 3m, 1y

  // Prices details
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Comparison state
  const [compareSource, setCompareSource] = useState('gold');
  const [compareTarget, setCompareTarget] = useState('silver');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadMarketData = async () => {
    try {
      setLoading(true);
      const [commRes, priceRes, overviewRes] = await Promise.allSettled([
        api.get('/api/commodities'),
        api.get(`/api/commodities/${selectedCommodity}/prices?page=${page}&limit=10`),
        api.get('/api/commodities/market/overview')
      ]);

      const commData = (commRes.status === 'fulfilled' && commRes.value.data.success) ? commRes.value.data.data : [];
      const overviews = (overviewRes.status === 'fulfilled' && overviewRes.value.data.success) ? overviewRes.value.data.data : [];

      if (commData.length > 0) {
        const enrichedCommodities = commData.map(c => {
          const ov = overviews.find(o => o.code === c.code) || {};
          return {
            ...c,
            latestPrice: ov.latestPrice || 0,
            qoqChangePercent: ov.qoqChangePercent || 0,
            trend: ov.trend || 'Base',
            unitName: ov.unit || 'Standard Unit',
            sparkline: ov.sparkline || []
          };
        });
        setCommodities(enrichedCommodities);
      }

      if (priceRes.status === 'fulfilled' && priceRes.value.data.success) {
        setPrices(priceRes.value.data.data);
        setTotalPages(priceRes.value.data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Error fetching market analyzer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [selectedCommodity, page, activeTab]);

  // Adjust prices based on unit selected
  const scalePriceByUnit = (basePrice, commCode) => {
    const raw = Number(basePrice);
    const valid = isNaN(raw) ? 0 : raw;
    if (commCode === 'gold' || commCode === 'silver' || commCode === 'platinum') {
      // Base DB price is per 10 grams
      const pricePerGram = valid / 10;
      if (unitFilter === 'kg') return pricePerGram * 1000;
      if (unitFilter === 'ton') return pricePerGram * 1000000;
      return pricePerGram;
    }
    if (commCode === 'copper') {
      // Base DB copper is per 1000g (1kg)
      if (unitFilter === 'g') return valid / 1000;
      if (unitFilter === 'ton') return valid * 1000;
      return valid;
    }
    return valid;
  };

  const getUnitSymbol = (commCode) => {
    if (commCode === 'gold' || commCode === 'silver' || commCode === 'platinum') {
      return unitFilter === 'g' ? 'per Gram' : (unitFilter === 'kg' ? 'per Kilogram' : 'per Metric Ton');
    }
    if (commCode === 'copper') {
      return unitFilter === 'g' ? 'per Gram' : (unitFilter === 'kg' ? 'per Kilogram' : 'per Metric Ton');
    }
    return 'per Barrel';
  };

  const activeCommodityData = commodities.find(c => c.code === selectedCommodity) || {
    name: selectedCommodity.toUpperCase(),
    latestPrice: 0,
    openingPrice: 0,
    dayHigh: 0,
    dayLow: 0,
    prevClose: 0,
    qoqChange: 0,
    qoqChangePercent: 0
  };

  // Setup unit filter on commodity change
  useEffect(() => {
    if (selectedCommodity === 'crudeoil' || selectedCommodity === 'naturalgas') {
      setUnitFilter('barrel');
    } else {
      setUnitFilter('g');
    }
    setCommodity(selectedCommodity);
  }, [selectedCommodity]);

  const handleExportCSV = () => {
    if (prices.length === 0) return;
    const headers = ['Period', 'Purity/Grade', 'State', 'Weight', 'Price (INR)', 'Change', 'Trend'];
    const rows = [headers.join(',')];
    prices.forEach(p => {
      rows.push([
        `"${p.quarter}"`,
        `"${p.purity}"`,
        `"${p.state}"`,
        p.weight,
        p.price,
        p.qoqChangePercent || 0,
        `"${p.trend}"`
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCommodity}_market_rates.csv`;
    a.click();
  };

  // Demo Articles
  const demoArticles = [
    {
      title: "Global Gold Demand Outlines Robust Industrial & Bank Buying Dynamics",
      source: "World Gold Council macro insights",
      summary: "Institutional central bank purchases of gold reserves reached standard highs this quarter, driven by hedging and diversification away from fiat values.",
      impact: "Inflation Hedge, Bullish Gold"
    },
    {
      title: "Copper Supply Deficit Expands as Industrial Smelter Capacity Limits Persist",
      source: "London Metal Exchange (LME) analytics",
      summary: "Refining operations are facing electricity rationing across industrial corridors, causing warehouse copper inventories to hit record lows.",
      impact: "Industrial Growth, Bullish Copper"
    },
    {
      title: "Crude Oil Market Rebalances Amid Geopolitical Pipeline Disruptions",
      source: "OPEC+ regional reports",
      summary: "Shipping delays across primary transit channels are offset by supply gains from non-OPEC producers. Volatility remains moderate.",
      impact: "Supply Constraints, Neutral Crude Oil"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
            <TrendingUp className="text-accent" size={24} />
            Institutional Commodity Analyzer
          </h1>
          <p className="text-xs text-gray-500 mt-1">Institutional analysis maps, comparison overlays, and global supply/demand newsfeeds.</p>
        </div>

        {/* Tab selection */}
        <div className="flex bg-white/5 p-1 border border-white/5 rounded-xl self-start">
          {commodities.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelectedCommodity(c.code)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCommodity === c.code 
                  ? 'bg-accent text-slate-950 shadow-md font-extrabold' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-white/5 flex space-x-6">
        {['prices', 'comparison', 'intelligence'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab 
                ? 'border-accent text-accent' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'prices' ? 'Commodity Prices' : 
             tab === 'comparison' ? 'Commodity Comparison' : 'Market Intelligence'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {activeTab === 'prices' && (
            <div className="space-y-6">
              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Latest Rate</span>
                  <p className="text-base font-bold text-white mt-1.5">
                    ₹{Number(scalePriceByUnit(activeCommodityData.latestPrice, selectedCommodity) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-gray-400 font-semibold">{getUnitSymbol(selectedCommodity)}</span>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Opening price</span>
                  <p className="text-base font-bold text-white mt-1.5">
                    ₹{Number(scalePriceByUnit(activeCommodityData.openingPrice || (activeCommodityData.latestPrice || 0) * 0.98, selectedCommodity) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Day High</span>
                  <p className="text-base font-bold text-emerald-400 mt-1.5">
                    ₹{Number(scalePriceByUnit(activeCommodityData.dayHigh || (activeCommodityData.latestPrice || 0) * 1.02, selectedCommodity) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Day Low</span>
                  <p className="text-base font-bold text-rose-400 mt-1.5">
                    ₹{Number(scalePriceByUnit(activeCommodityData.dayLow || (activeCommodityData.latestPrice || 0) * 0.97, selectedCommodity) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">QoQ Change %</span>
                  <p className={`text-base font-bold mt-1.5 ${Number(activeCommodityData.qoqChangePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(activeCommodityData.qoqChangePercent || 0) >= 0 ? '+' : ''}{Number(activeCommodityData.qoqChangePercent || 0)}%
                  </p>
                </div>
              </div>

              {/* Filters toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/5 rounded-xl border border-white/5 gap-4">
                <div className="flex items-center space-x-3 text-xs w-full sm:w-auto">
                  <div className="flex items-center space-x-2 shrink-0">
                    <Scale size={14} className="text-accent" />
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Weight Unit:</span>
                  </div>
                  {selectedCommodity !== 'crudeoil' && selectedCommodity !== 'naturalgas' ? (
                    <select
                      value={unitFilter}
                      onChange={(e) => setUnitFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none"
                    >
                      <option value="g">Gram (g)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="ton">Metric Ton</option>
                    </select>
                  ) : (
                    <span className="text-white font-semibold">Barrel</span>
                  )}
                </div>

                <button
                  onClick={handleExportCSV}
                  disabled={prices.length === 0}
                  className="luxury-button py-2 px-4 flex items-center space-x-2 text-xs"
                >
                  <Download size={14} />
                  <span>Download Historical CSV</span>
                </button>
              </div>

              {/* Price Table */}
              <div className="bg-[#0b0f19] border border-white/5 rounded-xl overflow-hidden shadow-luxury">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-[10px] text-gray-400 uppercase tracking-widest">
                        <th className="p-4 font-bold">Quarterly Period</th>
                        <th className="p-4 font-bold">State Location</th>
                        <th className="p-4 font-bold">Purity Grade</th>
                        <th className="p-4 font-bold text-right">Scaled Price (INR)</th>
                        <th className="p-4 font-bold text-right">QoQ Change</th>
                        <th className="p-4 font-bold">Market Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {prices.map((p, idx) => (
                        <tr key={p._id || idx} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-semibold text-white">{p.quarter}</td>
                          <td className="p-4 text-gray-400">{p.state}</td>
                          <td className="p-4 text-gray-400">{p.purity}</td>
                          <td className="p-4 text-right font-bold text-white">
                            ₹{Number(scalePriceByUnit(p.price, selectedCommodity) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td className={`p-4 text-right font-semibold ${p.qoqChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {p.qoqChangePercent >= 0 ? '+' : ''}{p.qoqChangePercent}%
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.trend === 'Increase' || p.trend === 'Rose'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {p.trend || 'Stable'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase">Page {page} of {totalPages}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        disabled={page === 1}
                        className="p-1.5 border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-40 cursor-pointer"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={page === totalPages}
                        className="p-1.5 border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center space-x-3 text-gray-500 text-[10px] font-medium leading-relaxed">
                <Info size={16} className="shrink-0 text-accent" />
                <span>
                  <strong>BENCHMARK DEMO METRICS</strong>: Commodity rate figures represent indexed historical spots. Values are clearly labeled for B2B simulation planning only.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'comparison' && (
            <div className="space-y-6">
              {/* Selector toolbar */}
              <div className="p-5 bg-white/5 border border-white/5 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs shadow-md">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Benchmark A:</span>
                    <select
                      value={compareSource}
                      onChange={(e) => setCompareSource(e.target.value)}
                      className="px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-accent"
                    >
                      {commodities.map(c => <option key={c._id || c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      const temp = compareSource;
                      setCompareSource(compareTarget);
                      setCompareTarget(temp);
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-accent text-xs font-bold transition-all"
                    title="Swap commodities"
                  >
                    ⇄ Swap
                  </button>

                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Benchmark B:</span>
                    <select
                      value={compareTarget}
                      onChange={(e) => setCompareTarget(e.target.value)}
                      className="px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-accent"
                    >
                      {commodities.map(c => <option key={c._id || c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 flex items-center gap-2">
                  <Scale size={14} className="text-accent" />
                  <span>Real-time Inter-Commodity Parity Analysis</span>
                </div>
              </div>

              {/* Data sheets comparison */}
              {(() => {
                const s1 = commodities.find(c => c.code === compareSource) || { latestPrice: 0, qoqChangePercent: 0, trend: 'Base' };
                const s2 = commodities.find(c => c.code === compareTarget) || { latestPrice: 0, qoqChangePercent: 0, trend: 'Base' };
                const price1 = Number(s1.latestPrice || 0);
                const price2 = Number(s2.latestPrice || 0);
                const qoq1 = Number(s1.qoqChangePercent || 0);
                const qoq2 = Number(s2.qoqChangePercent || 0);
                const ratio = price2 > 0 ? (price1 / price2).toFixed(2) : 'N/A';
                const spread = Math.abs(price1 - price2);

                return (
                  <div className="space-y-6">
                    {/* Parity & Ratio summary ribbon */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold block">Parity Ratio ({s1.name || compareSource} : {s2.name || compareTarget})</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-bold text-accent">{ratio}</span>
                          <span className="text-[10px] text-gray-400">units of {s2.name || compareTarget} per 1 unit {s1.name || compareSource}</span>
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold block">Absolute Spread</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-bold text-white">₹{Number(spread || 0).toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-gray-400">price differential</span>
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold block">Quarterly Momentum Divergence</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className={`text-xl font-bold ${(qoq1 - qoq2) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {(qoq1 - qoq2) >= 0 ? '+' : ''}{(qoq1 - qoq2).toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-gray-400">{s1.name || compareSource} vs {s2.name || compareTarget}</span>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Side-by-side cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      {/* Asset 1 */}
                      <div className="p-6 bg-white/5 border border-white/5 rounded-xl space-y-4 shadow-md">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div>
                            <h3 className="text-base font-bold text-white capitalize">{s1.name || compareSource} Spot</h3>
                            <span className="text-[10px] text-gray-400">{s1.unitName || 'Benchmark Rate (10g / Unit)'}</span>
                          </div>
                          <span className="px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-md text-[10px] text-accent font-semibold uppercase">
                            {s1.code || compareSource}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-400">Spot Benchmark Rate</span>
                            <span className="text-white font-bold text-sm">₹{Number(price1 || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-400">Quarter-over-Quarter Shift</span>
                            <span className={`font-bold ${qoq1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {qoq1 >= 0 ? '+' : ''}{qoq1}%
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-400">Market Trend Profile</span>
                            <span className="text-white capitalize font-semibold">{s1.trend || 'Upward Momentum'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Institutional Volatility Risk</span>
                            <span className="text-white font-semibold">
                              {compareSource === 'gold' ? 'Low / Safe Haven' : compareSource === 'silver' ? 'Moderate / Industrial' : 'Market Variable'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Asset 2 */}
                      <div className="p-6 bg-white/5 border border-white/5 rounded-xl space-y-4 shadow-md">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div>
                            <h3 className="text-base font-bold text-white capitalize">{s2.name || compareTarget} Spot</h3>
                            <span className="text-[10px] text-gray-400">{s2.unitName || 'Benchmark Rate (10g / Unit)'}</span>
                          </div>
                          <span className="px-2.5 py-1 bg-white/10 border border-white/20 rounded-md text-[10px] text-gray-300 font-semibold uppercase">
                            {s2.code || compareTarget}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-400">Spot Benchmark Rate</span>
                            <span className="text-white font-bold text-sm">₹{Number(price2 || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-400">Quarter-over-Quarter Shift</span>
                            <span className={`font-bold ${qoq2 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {qoq2 >= 0 ? '+' : ''}{qoq2}%
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-400">Market Trend Profile</span>
                            <span className="text-white capitalize font-semibold">{s2.trend || 'Upward Momentum'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Institutional Volatility Risk</span>
                            <span className="text-white font-semibold">
                              {compareTarget === 'silver' ? 'Moderate / Industrial' : compareTarget === 'gold' ? 'Low / Safe Haven' : 'Market Variable'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'intelligence' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Compass className="text-accent" size={20} />
                <h3 className="text-sm font-bold text-white">Global Commodity Intelligence Newsfeed</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {demoArticles.map((art, idx) => (
                  <div key={idx} className="p-5 bg-white/5 border border-white/5 rounded-xl flex flex-col justify-between space-y-4 shadow-md">
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-bold text-accent tracking-wider">{art.source}</span>
                      <h4 className="text-xs font-bold text-white leading-normal">{art.title}</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-light">{art.summary}</p>
                    </div>
                    
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-gray-400 font-semibold">Macro Driver:</span>
                      <span className="text-accent font-bold">{art.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Market;
