import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { commodityService } from '../services/api';
import GlassCard from '../components/GlassCard';
import MetricCard from '../components/MetricCard';
import CustomChart from '../components/CustomChart';
import { 
  BarChart3, 
  Lightbulb, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Layers,
  Scale
} from 'lucide-react';

const Analytics = () => {
  const { commodity, setCommodity } = useTheme();

  const [commodities, setCommodities] = useState([]);
  const [filterOpts, setFilterOpts] = useState({
    states: [],
    purities: [],
    weights: []
  });

  // Filters state
  const [selectedState, setSelectedState] = useState('');
  const [selectedPurity, setSelectedPurity] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');

  // Analytics outputs
  const [analyticsData, setAnalyticsData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Fetch commodities and insights
  useEffect(() => {
    const fetchBasicData = async () => {
      try {
        const [commRes, insightRes] = await Promise.all([
          commodityService.getCommodities(),
          commodityService.getMarketInsights()
        ]);
        if (commRes.success && commRes.data.length > 0) {
          setCommodities(commRes.data);
        }
        if (insightRes.success) {
          setInsights(insightRes.data);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err.message);
      }
    };
    fetchBasicData();
  }, []);

  // Fetch filters for selected commodity
  useEffect(() => {
    if (!commodity) return;
    const fetchFilters = async () => {
      setLoading(true);
      try {
        const res = await commodityService.getFilters(commodity);
        if (res.success) {
          setFilterOpts(res.data);
          setSelectedState(res.data.states.includes('National') ? 'National' : res.data.states[0] || '');
          setSelectedPurity(res.data.purities[0] || '');
          setSelectedWeight(res.data.weights[0] || 1);
        }
      } catch (err) {
        console.error('Failed to fetch filters:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFilters();
  }, [commodity]);

  // Fetch detailed metrics/averages/SMA/rankings
  useEffect(() => {
    if (!commodity || !selectedState || !selectedPurity) return;

    const fetchDetailedAnalytics = async () => {
      setMetricsLoading(true);
      try {
        const res = await commodityService.getAnalytics(commodity, {
          state: selectedState,
          purity: selectedPurity,
          weight: selectedWeight
        });
        if (res.success) {
          setAnalyticsData(res.data);
        }
      } catch (err) {
        console.error('Failed to load analytics metrics:', err.message);
      } finally {
        setMetricsLoading(false);
      }
    };
    fetchDetailedAnalytics();
  }, [commodity, selectedState, selectedPurity, selectedWeight]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Prep chart data
  const hasChartData = analyticsData && analyticsData.chartData && analyticsData.chartData.length > 0;
  const smaChartData = {
    labels: hasChartData ? analyticsData.chartData.map(c => c.quarter) : [],
    datasets: [
      {
        label: 'Historical Rate',
        data: hasChartData ? analyticsData.chartData.map(c => c.price) : [],
        borderColor: 'var(--accent-color)',
        backgroundColor: 'var(--accent-glow)',
        fill: true
      },
      {
        label: '4-Quarter SMA',
        data: hasChartData ? analyticsData.chartData.map(c => c.sma) : [],
        borderColor: '#10B981',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0
      }
    ]
  };

  return (
    <div className="space-y-8">
      
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">System Analytics</h2>
          <p className="text-gray-400 text-sm mt-1">Variance indices, ranking, moving averages, and AI insights</p>
        </div>

        {/* Commodity selector Tabs */}
        <div className="flex bg-white/5 border border-white/5 p-1 rounded-xl self-start overflow-x-auto max-w-full">
          {commodities.map((c) => (
            <button
              key={c.code}
              onClick={() => setCommodity(c.code)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
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

      {/* AI Insights panel */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center">
          <Lightbulb size={18} className="mr-2 text-accent" />
          <span>Database AI Insights</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {insights.map((ins) => (
            <GlassCard 
              key={ins.commodityCode} 
              onClick={() => setCommodity(ins.commodityCode)}
              className={`p-5 flex flex-col justify-between border-l-2 hover:-translate-y-0.5 ${
                ins.highlightType === 'positive' 
                  ? 'border-emerald-500 bg-emerald-950/5' 
                  : ins.highlightType === 'warning' 
                    ? 'border-rose-500 bg-rose-950/5' 
                    : 'border-accent bg-accent/5'
              }`}
            >
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block">{ins.commodityName}</span>
                <p className="text-xs text-gray-300 mt-2 font-medium leading-relaxed">{ins.message}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[11px] text-gray-400">
                <span>Spread Volatility:</span>
                <span className="font-bold text-white">{ins.volatility}%</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Main Analytics Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left pane: selector filters */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center">
            <BarChart3 size={18} className="mr-2 text-accent" />
            <span>Metrics Filters</span>
          </h3>

          <GlassCard hover={false} className="p-5 space-y-5">
            {/* State */}
            {filterOpts.states.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                  <MapPin size={12} className="mr-1 text-accent" />
                  State / UT
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                >
                  {filterOpts.states.map(s => (
                    <option key={s} value={s} className="bg-[#0B0F19] text-white">{s}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Purity */}
            {filterOpts.purities.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                  <Layers size={12} className="mr-1 text-accent" />
                  Purity / Grade
                </label>
                <select
                  value={selectedPurity}
                  onChange={(e) => setSelectedPurity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                >
                  {filterOpts.purities.map(p => (
                    <option key={p} value={p} className="bg-[#0B0F19] text-white">{p}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Weight */}
            {filterOpts.weights.length > 0 && filterOpts.weights.some(w => w !== 1) && (
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                  <Scale size={12} className="mr-1 text-accent" />
                  Weight
                </label>
                <select
                  value={selectedWeight}
                  disabled={commodity === 'crudeoil'}
                  onChange={(e) => setSelectedWeight(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent disabled:opacity-30"
                >
                  {filterOpts.weights.map(w => (
                    <option key={w} value={w} className="bg-[#0B0F19] text-white">{w}g</option>
                  ))}
                </select>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right pane: Charts and Statistics */}
        <div className="lg:col-span-3 space-y-8">
          {metricsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : analyticsData ? (
            <>
              {/* Stat summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard hover={false} className="p-5 flex flex-col justify-between h-32">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Historical Average Rate</p>
                  <h3 className="text-2xl font-bold text-white mt-2">₹{Number(analyticsData.summary?.avgPrice || 0).toLocaleString()}</h3>
                  <span className="text-xs text-gray-500 mt-2">Calculated over all quarters</span>
                </GlassCard>
                
                <GlassCard hover={false} className="p-5 flex flex-col justify-between h-32">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Historical Max Rate</p>
                  <h3 className="text-2xl font-bold text-white mt-2">₹{Number(analyticsData.summary?.maxPrice || 0).toLocaleString()}</h3>
                  <span className="text-xs text-emerald-400 font-semibold mt-2">Market peak index</span>
                </GlassCard>

                <GlassCard hover={false} className="p-5 flex flex-col justify-between h-32">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Historical Min Rate</p>
                  <h3 className="text-2xl font-bold text-white mt-2">₹{Number(analyticsData.summary?.minPrice || 0).toLocaleString()}</h3>
                  <span className="text-xs text-rose-400 font-semibold mt-2">Market bottom floor</span>
                </GlassCard>
              </div>

              {/* Line chart with SMA-4 */}
              <GlassCard hover={false} className="h-[380px] p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">4-Quarter Simple Moving Average (SMA)</h3>
                  <p className="text-xs text-gray-400">Smoothing fluctuations to evaluate long-term trends</p>
                </div>
                <div className="flex-1 min-h-[250px] mt-4">
                  <CustomChart type="line" data={smaChartData} />
                </div>
              </GlassCard>

              {/* State rankings variance (if applicable) */}
              {(commodity === 'gold' || commodity === 'silver') && analyticsData.stateRanking.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Cheapest States list */}
                  <GlassCard hover={false} className="p-5">
                    <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 text-emerald-400">
                      Cheapest Markets (Lowest Rates)
                    </h4>
                    <div className="space-y-3">
                      {analyticsData.stateRanking?.slice(0, 5).map((r, i) => (
                        <div key={r._id || i} className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                          <span className="text-gray-300 font-medium">#{i+1} {r.state}</span>
                          <span className="text-white font-bold">₹{Number(r.price || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Most Expensive States list */}
                  <GlassCard hover={false} className="p-5">
                    <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 text-rose-400">
                      Premium Markets (Highest Rates)
                    </h4>
                    <div className="space-y-3">
                      {[...(analyticsData.stateRanking || [])].reverse().slice(0, 5).map((r, i) => (
                        <div key={r._id || i} className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                          <span className="text-gray-300 font-medium">#{i+1} {r.state}</span>
                          <span className="text-white font-bold">₹{Number(r.price || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}
            </>
          ) : (
            <GlassCard hover={false} className="p-8 text-center text-gray-400">
              Select metrics parameters to evaluate database analytics.
            </GlassCard>
          )}
        </div>

      </div>

    </div>
  );
};

export default Analytics;
