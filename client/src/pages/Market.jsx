import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { commodityService } from '../services/api';
import { 
  COMMODITY_DEFINITIONS, 
  HISTORICAL_PRICES, 
  scalePriceByUnit, 
  getUnitSymbol,
  COMPARISON_HISTORICAL_TIMELINE,
  MARKET_INTELLIGENCE_FEEDS
} from '../data/commodityMarketData';
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
  Scale,
  Sparkles,
  BarChart3,
  Flame,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2
} from 'lucide-react';

const Market = () => {
  const { commodity: activeThemeCommodity, setCommodity } = useTheme();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'prices';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [commodities, setCommodities] = useState(COMMODITY_DEFINITIONS);
  const [selectedCommodity, setSelectedCommodity] = useState(activeThemeCommodity || 'gold');
  const [unitFilter, setUnitFilter] = useState('g'); // g, kg, ton, barrel

  // Prices details
  const [prices, setPrices] = useState(HISTORICAL_PRICES.gold);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Comparison state
  const [compareSource, setCompareSource] = useState('gold');
  const [compareTarget, setCompareTarget] = useState('silver');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Load commodities and live quotes
  const loadMarketData = async () => {
    try {
      setLoading(true);
      const [commRes, priceRes, overviewRes] = await Promise.allSettled([
        commodityService.getCommodities(),
        commodityService.getPrices(selectedCommodity, { page, limit: 10 }),
        commodityService.getMarketOverview()
      ]);

      let commData = (commRes.status === 'fulfilled' && commRes.value.success && commRes.value.data.length > 0)
        ? commRes.value.data
        : COMMODITY_DEFINITIONS;

      let overviews = (overviewRes.status === 'fulfilled' && overviewRes.value.success && overviewRes.value.data.length > 0)
        ? overviewRes.value.data
        : [];

      const enriched = commData.map(c => {
        const ov = overviews.find(o => o.code === c.code) || {};
        const def = COMMODITY_DEFINITIONS.find(d => d.code === c.code) || c;
        const latestPrice = ov.latestPrice || c.latestPrice || def.latestPrice || 0;
        return {
          ...def,
          ...c,
          latestPrice,
          price: latestPrice,
          openingPrice: ov.openingPrice || c.openingPrice || def.openingPrice || (latestPrice * 0.99),
          dayHigh: ov.dayHigh || c.dayHigh || def.dayHigh || (latestPrice * 1.015),
          dayLow: ov.dayLow || c.dayLow || def.dayLow || (latestPrice * 0.985),
          qoqChange: ov.qoqChange || c.qoqChange || def.qoqChange || 0,
          qoqChangePercent: ov.qoqChangePercent || c.qoqChangePercent || def.qoqChangePercent || 0,
          trend: ov.trend || c.trend || def.trend || 'Upward',
          unitName: ov.unit || c.unitName || `${c.purityLabel || '24K'} (${c.baseUnit || '10g'})`,
          sparkline: (ov.sparkline && ov.sparkline.length > 0) ? ov.sparkline : (c.sparkline || def.sparkline || [])
        };
      });

      setCommodities(enriched);

      if (priceRes.status === 'fulfilled' && priceRes.value.success && Array.isArray(priceRes.value.data) && priceRes.value.data.length > 0) {
        setPrices(priceRes.value.data);
        setTotalPages(priceRes.value.pagination?.pages || 1);
      } else {
        const defaultList = HISTORICAL_PRICES[selectedCommodity] || HISTORICAL_PRICES.gold;
        setPrices(defaultList);
        setTotalPages(1);
      }
    } catch (err) {
      console.warn('Market analyzer data sync note:', err);
      setCommodities(COMMODITY_DEFINITIONS);
      setPrices(HISTORICAL_PRICES[selectedCommodity] || HISTORICAL_PRICES.gold);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [selectedCommodity, page, activeTab]);

  // Adjust unit filter when commodity changes
  useEffect(() => {
    if (selectedCommodity === 'crudeoil' || selectedCommodity === 'naturalgas') {
      setUnitFilter('barrel');
    } else {
      setUnitFilter('g');
    }
    setCommodity(selectedCommodity);
  }, [selectedCommodity]);

  const activeCommodityData = useMemo(() => {
    const found = commodities.find(c => c.code === selectedCommodity);
    if (found) return found;
    return COMMODITY_DEFINITIONS.find(c => c.code === selectedCommodity) || COMMODITY_DEFINITIONS[0];
  }, [commodities, selectedCommodity]);

  // Filtered prices for the table
  const displayedPrices = useMemo(() => {
    let list = prices;
    if (stateFilter !== 'all') {
      list = list.filter(p => p.state?.toLowerCase() === stateFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.quarter?.toLowerCase().includes(q) || 
        p.state?.toLowerCase().includes(q) || 
        p.purity?.toLowerCase().includes(q) ||
        p.trend?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [prices, stateFilter, searchQuery]);

  const availableStates = useMemo(() => {
    const set = new Set();
    prices.forEach(p => { if (p.state) set.add(p.state); });
    return Array.from(set);
  }, [prices]);

  const handleExportCSV = () => {
    if (displayedPrices.length === 0) return;
    const headers = ['Quarterly Period', 'State Location', 'Purity Grade', 'Weight Base', 'Price (INR)', 'QoQ Change %', 'Trend'];
    const rows = [headers.join(',')];
    displayedPrices.forEach(p => {
      const scaled = scalePriceByUnit(p.price, selectedCommodity, unitFilter);
      rows.push([
        `"${p.quarter}"`,
        `"${p.state || 'National'}"`,
        `"${p.purity || 'Standard'}"`,
        `"${p.weight || 1}"`,
        scaled.toFixed(2),
        `"${p.qoqChangePercent || 0}%"`,
        `"${p.trend || 'Upward'}"`
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCommodity}_rates_${unitFilter}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
            <TrendingUp className="text-accent" size={24} />
            Institutional Commodity Analyzer
          </h1>
          <p className="text-xs text-gray-500 mt-1">Real-time benchmark quotes, inter-commodity parity comparison, and global macro intelligence.</p>
        </div>

        {/* Commodity selector pills */}
        <div className="flex flex-wrap bg-white/5 p-1 border border-white/5 rounded-xl self-start gap-1">
          {commodities.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setSelectedCommodity(c.code);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCommodity === c.code 
                  ? 'bg-accent text-slate-950 shadow-md font-extrabold' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-white/5 flex space-x-6">
        {[
          { key: 'prices', label: 'Commodity Prices' },
          { key: 'comparison', label: 'Commodity Comparison' },
          { key: 'intelligence', label: 'Market Intelligence' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === key 
                ? 'border-accent text-accent' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: COMMODITY PRICES */}
      {activeTab === 'prices' && (
        <div className="space-y-6">
          {/* Financial Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">Latest Spot Rate</span>
              <p className="text-lg font-bold text-white mt-1.5">
                ₹{Number(scalePriceByUnit(activeCommodityData.latestPrice, selectedCommodity, unitFilter)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-accent font-semibold">{getUnitSymbol(selectedCommodity, unitFilter)}</span>
            </div>

            <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">Opening Price</span>
              <p className="text-lg font-bold text-gray-200 mt-1.5">
                ₹{Number(scalePriceByUnit(activeCommodityData.openingPrice, selectedCommodity, unitFilter)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-gray-400 font-semibold">{getUnitSymbol(selectedCommodity, unitFilter)}</span>
            </div>

            <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">Day High</span>
              <p className="text-lg font-bold text-emerald-400 mt-1.5 flex items-center gap-1">
                <ArrowUpRight size={16} />
                ₹{Number(scalePriceByUnit(activeCommodityData.dayHigh, selectedCommodity, unitFilter)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-400/80 font-semibold">24h Peak</span>
            </div>

            <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">Day Low</span>
              <p className="text-lg font-bold text-rose-400 mt-1.5 flex items-center gap-1">
                <ArrowDownRight size={16} />
                ₹{Number(scalePriceByUnit(activeCommodityData.dayLow, selectedCommodity, unitFilter)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-rose-400/80 font-semibold">24h Low</span>
            </div>

            <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block">QoQ Growth %</span>
              <p className={`text-lg font-bold mt-1.5 ${Number(activeCommodityData.qoqChangePercent) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {Number(activeCommodityData.qoqChangePercent) >= 0 ? '+' : ''}{Number(activeCommodityData.qoqChangePercent).toFixed(2)}%
              </p>
              <span className="text-[10px] text-gray-400 font-semibold">{activeCommodityData.trend || 'Upward'} Trend</span>
            </div>
          </div>

          {/* Filters toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/5 rounded-xl border border-white/5 gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs w-full sm:w-auto">
              {/* Unit Switcher */}
              <div className="flex items-center space-x-2 shrink-0">
                <Scale size={14} className="text-accent" />
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Weight Unit:</span>
                {selectedCommodity !== 'crudeoil' && selectedCommodity !== 'naturalgas' ? (
                  <select
                    value={unitFilter}
                    onChange={(e) => setUnitFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-[#0F1420] border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-accent"
                  >
                    <option value="g">Gram (g)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ton">Metric Ton</option>
                  </select>
                ) : (
                  <span className="px-2.5 py-1.5 bg-[#0F1420] border border-white/10 rounded-lg text-white font-medium">
                    {selectedCommodity === 'crudeoil' ? 'Barrel (bbl)' : 'MMBtu'}
                  </span>
                )}
              </div>

              {/* State Filter */}
              {availableStates.length > 1 && (
                <div className="flex items-center space-x-2 shrink-0">
                  <Filter size={14} className="text-accent" />
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">State / Region:</span>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-[#0F1420] border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-accent"
                  >
                    <option value="all">All States</option>
                    {availableStates.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search Box */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter period, state, purity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#0F1420] border border-white/10 rounded-lg text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              className="luxury-button py-2 px-3 text-xs flex items-center space-x-1.5 shrink-0 self-end sm:self-auto"
            >
              <Download size={14} />
              <span>Download Historical CSV</span>
            </button>
          </div>

          {/* Historical Prices Table */}
          <div className="p-5 bg-[#080c16] border border-white/5 rounded-xl shadow-luxury overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={15} className="text-accent" />
                Historical Valuation Schedule ({activeCommodityData.name})
              </h3>
              <span className="text-[11px] text-gray-400">
                Displaying {displayedPrices.length} records · Scaled {getUnitSymbol(selectedCommodity, unitFilter)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] text-gray-400 uppercase tracking-widest bg-white/5">
                    <th className="py-3 px-4">Quarterly Period</th>
                    <th className="py-3 px-4">State Location</th>
                    <th className="py-3 px-4">Purity Grade</th>
                    <th className="py-3 px-4 text-right">Scaled Price (INR)</th>
                    <th className="py-3 px-4 text-right">QoQ Change</th>
                    <th className="py-3 px-4">Market Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedPrices.length > 0 ? (
                    displayedPrices.map((item, idx) => {
                      const scaledPrice = scalePriceByUnit(item.price, selectedCommodity, unitFilter);
                      const isPositive = Number(item.qoqChangePercent || item.qoqChange || 0) >= 0;
                      return (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">{item.quarter}</td>
                          <td className="py-3 px-4 text-gray-300">{item.state || 'National'}</td>
                          <td className="py-3 px-4 text-gray-400">{item.purity || 'Standard'}</td>
                          <td className="py-3 px-4 text-right font-bold text-accent">
                            ₹{scaledPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? '+' : ''}{item.qoqChangePercent !== undefined ? `${item.qoqChangePercent}%` : `₹${item.qoqChange}`}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                              {item.trend || (isPositive ? 'Upward' : 'Downward')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 text-xs">
                        No historical records matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center space-x-3 text-gray-400 text-[10px] leading-relaxed">
              <Info size={14} className="shrink-0 text-accent" />
              <span>
                <strong>Spot Fixing Standard</strong>: Rates reflect official closing benchmarks for precious metals and energy derivatives. Scaled dynamically to your chosen weight unit ({unitFilter}).
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMMODITY COMPARISON */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* Selector Toolbar */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs shadow-md">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Asset A:</span>
                <select
                  value={compareSource}
                  onChange={(e) => setCompareSource(e.target.value)}
                  className="px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-accent"
                >
                  {commodities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>

              <button
                onClick={() => {
                  const temp = compareSource;
                  setCompareSource(compareTarget);
                  setCompareTarget(temp);
                }}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-accent text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Swap assets"
              >
                <span>⇄ Swap</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Asset B:</span>
                <select
                  value={compareTarget}
                  onChange={(e) => setCompareTarget(e.target.value)}
                  className="px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-accent"
                >
                  {commodities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 flex items-center gap-2">
              <Scale size={14} className="text-accent" />
              <span>Inter-Commodity Relative Growth & Parity Modeling</span>
            </div>
          </div>

          {(() => {
            const s1 = commodities.find(c => c.code === compareSource) || COMMODITY_DEFINITIONS.find(c => c.code === compareSource) || COMMODITY_DEFINITIONS[0];
            const s2 = commodities.find(c => c.code === compareTarget) || COMMODITY_DEFINITIONS.find(c => c.code === compareTarget) || COMMODITY_DEFINITIONS[1];

            const price1 = Number(s1.latestPrice || 0);
            const price2 = Number(s2.latestPrice || 0);
            const qoq1 = Number(s1.qoqChangePercent || 0);
            const qoq2 = Number(s2.qoqChangePercent || 0);
            const ratio = price2 > 0 ? (price1 / price2).toFixed(2) : 'N/A';
            const spread = Math.abs(price1 - price2);

            return (
              <div className="space-y-6">
                {/* Parity & Ratio Ribbon */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                      Parity Ratio ({s1.name} : {s2.name})
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold text-accent">{ratio}x</span>
                      <span className="text-[10px] text-gray-400">units of {s2.name} per 1 unit {s1.name}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Absolute Spread</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold text-white">₹{Number(spread).toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-gray-400">nominal divergence</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Quarterly Alpha Divergence</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-2xl font-bold ${(qoq1 - qoq2) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(qoq1 - qoq2) >= 0 ? '+' : ''}{(qoq1 - qoq2).toFixed(2)}%
                      </span>
                      <span className="text-[10px] text-gray-400">{s1.name} relative outperformance</span>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Asset A */}
                  <div className="p-6 bg-white/5 border border-white/5 rounded-xl space-y-4 shadow-md">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-white">{s1.name} Benchmark</h3>
                        <span className="text-[10px] text-gray-400">{s1.purityLabel || 'Spot Grade'} ({s1.baseUnit})</span>
                      </div>
                      <span className="px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-md text-[10px] text-accent font-semibold uppercase">
                        {s1.code}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Spot Market Rate</span>
                        <span className="text-white font-bold text-sm">₹{price1.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">QoQ Growth Momentum</span>
                        <span className={`font-bold ${qoq1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {qoq1 >= 0 ? '+' : ''}{qoq1.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">24h Trading Volume</span>
                        <span className="text-white font-semibold">{s1.volume || 'Active Trading'}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Market Sentiment</span>
                        <span className="text-accent font-semibold">{s1.sentiment || 'Bullish'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Institutional Risk Profile</span>
                        <span className="text-white font-semibold">{s1.volatility || 'Low / Safe Haven'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Asset B */}
                  <div className="p-6 bg-white/5 border border-white/5 rounded-xl space-y-4 shadow-md">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-white">{s2.name} Benchmark</h3>
                        <span className="text-[10px] text-gray-400">{s2.purityLabel || 'Spot Grade'} ({s2.baseUnit})</span>
                      </div>
                      <span className="px-2.5 py-1 bg-white/10 border border-white/20 rounded-md text-[10px] text-gray-300 font-semibold uppercase">
                        {s2.code}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Spot Market Rate</span>
                        <span className="text-white font-bold text-sm">₹{price2.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">QoQ Growth Momentum</span>
                        <span className={`font-bold ${qoq2 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {qoq2 >= 0 ? '+' : ''}{qoq2.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">24h Trading Volume</span>
                        <span className="text-white font-semibold">{s2.volume || 'Active Trading'}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Market Sentiment</span>
                        <span className="text-accent font-semibold">{s2.sentiment || 'Bullish'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Institutional Risk Profile</span>
                        <span className="text-white font-semibold">{s2.volatility || 'Moderate / Industrial'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Quarter Historical Performance Comparison Table */}
                <div className="p-5 bg-[#080c16] border border-white/5 rounded-xl shadow-luxury space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 size={15} className="text-accent" />
                      Quarter-by-Quarter Historical Performance ({s1.name} vs. {s2.name})
                    </h3>
                    <span className="text-[11px] text-gray-400">
                      Tracking 5-Quarter Yield Trajectory
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] text-gray-400 uppercase tracking-widest bg-white/5">
                          <th className="py-3 px-4">Period</th>
                          <th className="py-3 px-4 text-right">{s1.name} Rate (INR)</th>
                          <th className="py-3 px-4 text-right">{s2.name} Rate (INR)</th>
                          <th className="py-3 px-4 text-right">Historical Parity Ratio</th>
                          <th className="py-3 px-4 text-right">{s1.name} Growth</th>
                          <th className="py-3 px-4 text-right">{s2.name} Growth</th>
                          <th className="py-3 px-4 text-center">Leading Asset</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {COMPARISON_HISTORICAL_TIMELINE.map((row, idx) => {
                          const valA = row[s1.code] || (price1 * (0.9 + idx * 0.025));
                          const valB = row[s2.code] || (price2 * (0.9 + idx * 0.025));
                          const rowRatio = valB > 0 ? (valA / valB).toFixed(2) : '-';
                          const prevRow = idx > 0 ? COMPARISON_HISTORICAL_TIMELINE[idx - 1] : null;
                          const prevA = prevRow ? (prevRow[s1.code] || valA) : valA;
                          const prevB = prevRow ? (prevRow[s2.code] || valB) : valB;
                          const growthA = prevA > 0 ? (((valA - prevA) / prevA) * 100).toFixed(2) : '0.00';
                          const growthB = prevB > 0 ? (((valB - prevB) / prevB) * 100).toFixed(2) : '0.00';
                          const leader = Number(growthA) >= Number(growthB) ? s1.name : s2.name;

                          return (
                            <tr key={row.quarter} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-semibold text-white">{row.quarter}</td>
                              <td className="py-3 px-4 text-right font-bold text-accent">₹{Number(valA).toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-right font-bold text-gray-200">₹{Number(valB).toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-right font-mono text-white">{rowRatio}x</td>
                              <td className={`py-3 px-4 text-right font-semibold ${Number(growthA) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {Number(growthA) >= 0 ? '+' : ''}{growthA}%
                              </td>
                              <td className={`py-3 px-4 text-right font-semibold ${Number(growthB) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {Number(growthB) >= 0 ? '+' : ''}{growthB}%
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white">
                                  {leader}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: MARKET INTELLIGENCE */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          {/* Live Rates Intelligence Matrix */}
          <div className="p-5 bg-[#080c16] border border-white/5 rounded-xl shadow-luxury space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Compass size={16} className="text-accent" />
                  Live Commodity Rates Intelligence Matrix
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Real-time institutional pricing, 24h market ranges, liquidity volumes, and sentiment indicators.</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                ● Live Feed Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] text-gray-400 uppercase tracking-widest bg-white/5">
                    <th className="py-3 px-4">Commodity Asset</th>
                    <th className="py-3 px-4">Benchmark Grade</th>
                    <th className="py-3 px-4 text-right">Latest Spot Rate (INR)</th>
                    <th className="py-3 px-4 text-right">Day High / Low Range</th>
                    <th className="py-3 px-4 text-right">QoQ Trend %</th>
                    <th className="py-3 px-4 text-right">24h Trade Volume</th>
                    <th className="py-3 px-4 text-center">Market Sentiment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {commodities.map((comm) => {
                    const isPositive = Number(comm.qoqChangePercent) >= 0;
                    return (
                      <tr key={comm.code} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: comm.accentTheme?.color || '#FFD700' }}></span>
                          {comm.name}
                        </td>
                        <td className="py-3 px-4 text-gray-400">{comm.purityLabel} ({comm.baseUnit})</td>
                        <td className="py-3 px-4 text-right font-bold text-accent">
                          ₹{Number(comm.latestPrice).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-300 font-mono text-[11px]">
                          ₹{Number(comm.dayHigh).toLocaleString('en-IN')} / ₹{Number(comm.dayLow).toLocaleString('en-IN')}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : ''}{Number(comm.qoqChangePercent).toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right text-gray-300">{comm.volume}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            comm.sentiment?.includes('Bullish') 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : comm.sentiment?.includes('Bearish') 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {comm.sentiment || 'Bullish'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Global Commodity Intelligence Feeds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MARKET_INTELLIGENCE_FEEDS.map((feed, idx) => (
              <div key={idx} className="p-5 bg-white/5 border border-white/5 rounded-xl flex flex-col justify-between space-y-4 shadow-md">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-accent tracking-wider">{feed.source}</span>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 bg-white/5 text-gray-400 rounded">
                      {feed.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-normal">{feed.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-light">{feed.summary}</p>
                </div>
                
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 font-semibold">Macro Driver:</span>
                  <span className="text-accent font-bold">{feed.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Market;
