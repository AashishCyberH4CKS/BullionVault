import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { commodityService } from '../services/api';
import GlassCard from '../components/GlassCard';
import CustomChart from '../components/CustomChart';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  LineChart,
  Calendar,
  Layers,
  MapPin,
  Scale
} from 'lucide-react';

const Market = () => {
  const { commodity, setCommodity, activeTheme } = useTheme();
  
  // List of commodities
  const [commoditiesList, setCommoditiesList] = useState([]);
  
  // Available filter options for selected commodity
  const [filterOptions, setFilterOptions] = useState({
    states: [],
    regions: [],
    purities: [],
    weights: [],
    quarters: []
  });

  // Active filter selections
  const [selectedState, setSelectedState] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedPurity, setSelectedPurity] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Query results
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sparkline data
  const [chartData, setChartData] = useState(null);

  // Fetch commodities list on boot
  useEffect(() => {
    const fetchCommodities = async () => {
      try {
        const res = await commodityService.getCommodities();
        if (res.success) {
          setCommoditiesList(res.data);
          // Set initial commodity if not set
          if (res.data.length > 0 && !commodity) {
            setCommodity(res.data[0].code);
          }
        }
      } catch (err) {
        console.error('Failed to load commodities:', err.message);
      }
    };
    fetchCommodities();
  }, []);

  // Fetch filters and initial prices when active commodity changes
  useEffect(() => {
    if (!commodity) return;
    
    const fetchFiltersAndData = async () => {
      setLoading(true);
      try {
        // Fetch filters
        const filterRes = await commodityService.getFilters(commodity);
        if (filterRes.success) {
          const opts = filterRes.data;
          setFilterOptions(opts);
          
          // Clear selections
          setSelectedState(opts.states.includes('National') ? 'National' : opts.states[0] || '');
          setSelectedRegion('');
          setSelectedPurity(opts.purities[0] || '');
          setSelectedWeight(opts.weights[0] || '');
          setPage(1);
        }
      } catch (err) {
        console.error('Failed to load filter options:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFiltersAndData();
  }, [commodity]);

  // Fetch prices table & chart whenever filters or page changes
  useEffect(() => {
    if (!commodity) return;

    const fetchPricesData = async () => {
      setTableLoading(true);
      try {
        const params = {
          page,
          limit: 10,
          sort: sortBy
        };

        if (selectedState) params.state = selectedState;
        if (selectedRegion) params.region = selectedRegion;
        if (selectedPurity) params.purity = selectedPurity;
        if (selectedWeight) params.weight = selectedWeight;
        
        const priceRes = await commodityService.getPrices(commodity, params);
        if (priceRes.success) {
          setPrices(priceRes.data);
          setTotalPages(priceRes.pagination.pages);
          setTotalCount(priceRes.pagination.total);
        }

        // Fetch complete historical line for chart (limit=100, chronological order)
        const chartRes = await commodityService.getPrices(commodity, {
          state: selectedState || undefined,
          region: selectedRegion || undefined,
          purity: selectedPurity || undefined,
          weight: selectedWeight || undefined,
          sort: 'oldest',
          limit: 100
        });

        if (chartRes.success && chartRes.data.length > 0) {
          const sortedData = chartRes.data;
          setChartData({
            labels: sortedData.map(p => p.quarter),
            datasets: [{
              label: `${commodity.toUpperCase()} Price Index`,
              data: sortedData.map(p => p.price)
            }]
          });
        } else {
          setChartData(null);
        }

      } catch (err) {
        console.error('Failed to load prices feed:', err.message);
      } finally {
        setTableLoading(false);
      }
    };

    fetchPricesData();
  }, [commodity, selectedState, selectedRegion, selectedPurity, selectedWeight, sortBy, page]);

  const handleExportCSV = () => {
    if (prices.length === 0) return;
    
    // Create headers
    const headers = ['Quarter', 'State/UT', 'Region', 'Purity', 'Weight', 'Price', 'QoQ Change', 'QoQ %', 'Trend'];
    const csvRows = [headers.join(',')];

    prices.forEach(p => {
      const row = [
        `"${p.quarter}"`,
        `"${p.state}"`,
        `"${p.region}"`,
        `"${p.purity}"`,
        p.weight,
        p.price,
        p.qoqChange || 0,
        p.qoqChangePercent || 0,
        `"${p.trend}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `bullionvault_${commodity}_data.csv`);
    a.click();
  };

  // Filter table prices by search terms locally
  const filteredPrices = prices.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.state.toLowerCase().includes(term) ||
      p.region.toLowerCase().includes(term) ||
      p.purity.toLowerCase().includes(term) ||
      p.trend.toLowerCase().includes(term) ||
      p.quarter.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      
      {/* Header Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Market Analyzer</h2>
          <p className="text-gray-400 text-sm mt-1">Institutional commodity matrices & rates trends</p>
        </div>

        {/* Commodity Tabs Selector */}
        <div className="flex bg-white/5 border border-white/5 p-1 rounded-xl self-start overflow-x-auto max-w-full">
          {commoditiesList.map((c) => (
            <button
              key={c.code}
              onClick={() => setCommodity(c.code)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                commodity === c.code
                  ? 'bg-accent text-slate-950 font-bold shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left panel: Filters selector */}
          <div className="lg:col-span-1 space-y-6">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
              <Filter size={18} className="mr-2 text-accent" />
              <span>Filters Console</span>
            </h3>

            <GlassCard hover={false} className="space-y-5 p-5">
              {/* State Filter */}
              {filterOptions.states.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                    <MapPin size={12} className="mr-1 text-accent" />
                    State / UT
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => { setSelectedState(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="" className="bg-[#0B0F19] text-gray-400">All Regions/National</option>
                    {filterOptions.states.map(s => (
                      <option key={s} value={s} className="bg-[#0B0F19] text-white">{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Region Filter */}
              {filterOptions.regions.length > 0 && filterOptions.regions.some(r => r !== 'National') && (
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                    <MapPin size={12} className="mr-1 text-accent" />
                    Geographic Region
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => { setSelectedRegion(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="" className="bg-[#0B0F19] text-gray-400">All Zones</option>
                    {filterOptions.regions.map(r => (
                      <option key={r} value={r} className="bg-[#0B0F19] text-white">{r}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Purity Filter */}
              {filterOptions.purities.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                    <Layers size={12} className="mr-1 text-accent" />
                    Purity / Unit
                  </label>
                  <select
                    value={selectedPurity}
                    onChange={(e) => { setSelectedPurity(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                  >
                    {filterOptions.purities.map(p => (
                      <option key={p} value={p} className="bg-[#0B0F19] text-white">{p}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Weight Filter */}
              {filterOptions.weights.length > 0 && filterOptions.weights.some(w => w !== 1) && (
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                    <Scale size={12} className="mr-1 text-accent" />
                    Weight Segment
                  </label>
                  <select
                    value={selectedWeight}
                    onChange={(e) => { setSelectedWeight(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                  >
                    {filterOptions.weights.map(w => (
                      <option key={w} value={w} className="bg-[#0B0F19] text-white">{w} grams</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sorting options */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Sort Ordering</label>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                >
                  <option value="newest" className="bg-[#0B0F19] text-white">Chronological: Newest</option>
                  <option value="oldest" className="bg-[#0B0F19] text-white">Chronological: Oldest</option>
                  <option value="price_high" className="bg-[#0B0F19] text-white">Price: High to Low</option>
                  <option value="price_low" className="bg-[#0B0F19] text-white">Price: Low to High</option>
                </select>
              </div>
            </GlassCard>
          </div>

          {/* Right panel: Chart and Table */}
          <div className="lg:col-span-3 space-y-8">
            {/* Real-time price chart */}
            {chartData ? (
              <GlassCard hover={false} className="h-[380px] p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
                    <LineChart size={18} className="mr-2 text-accent" />
                    <span>Price index trend curve</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Historical price charts for {selectedState || 'National Average'} ({selectedPurity})
                  </p>
                </div>
                <div className="flex-1 min-h-[250px] mt-4">
                  <CustomChart type="area" data={chartData} />
                </div>
              </GlassCard>
            ) : (
              <GlassCard hover={false} className="p-8 text-center text-gray-400">
                No historical chart indices found for this configuration.
              </GlassCard>
            )}

            {/* Price records table */}
            <GlassCard hover={false} className="flex flex-col justify-between">
              
              {/* Table search toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-white/5 gap-4">
                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search records list..."
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                
                <button
                  onClick={handleExportCSV}
                  disabled={prices.length === 0}
                  className="luxury-button-secondary py-2 px-4 flex items-center space-x-2 text-xs self-end"
                >
                  <Download size={14} />
                  <span>Download CSV</span>
                </button>
              </div>

              {/* Table grid */}
              <div className="overflow-x-auto min-h-[300px]">
                {tableLoading ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredPrices.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 text-sm">No price indexes matches filters.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-6">Quarter</th>
                        <th className="py-4 px-6">State / UT</th>
                        <th className="py-4 px-6">Region</th>
                        <th className="py-4 px-6">Purity</th>
                        {commodity !== 'crudeoil' && <th className="py-4 px-6">Weight</th>}
                        <th className="py-4 px-6">Rate (INR)</th>
                        <th className="py-4 px-6">QoQ Change</th>
                        <th className="py-4 px-6">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {filteredPrices.map((p, idx) => {
                        const changePercent = p.qoqChangePercent;
                        const isPositive = changePercent > 0;
                        const isNegative = changePercent < 0;
                        return (
                          <tr key={p._id || idx} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6 text-white font-medium">{p.quarter}</td>
                            <td className="py-4 px-6">{p.state}</td>
                            <td className="py-4 px-6 text-gray-400">{p.region}</td>
                            <td className="py-4 px-6">{p.purity}</td>
                            {commodity !== 'crudeoil' && <td className="py-4 px-6">{p.weight}g</td>}
                            <td className="py-4 px-6 text-white font-bold">₹{p.price.toLocaleString()}</td>
                            <td className="py-4 px-6">
                              {changePercent !== null && changePercent !== undefined ? (
                                <span className={`font-semibold text-xs ${isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-gray-400'}`}>
                                  {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-gray-500 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                                p.trend === 'Increase' || p.trend === 'Rose'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : p.trend === 'Decrease' || p.trend === 'Fell'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-white/5 text-gray-400 border border-white/10'
                              }`}>
                                {p.trend || 'Stable'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Table pagination footer */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-5 border-t border-white/5">
                  <span className="text-xs text-gray-400">
                    Showing Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({totalCount} entries)
                  </span>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                      className="p-2 border border-white/10 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={page === totalPages}
                      className="p-2 border border-white/10 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

            </GlassCard>
          </div>

        </div>
      )}

    </div>
  );
};

export default Market;
