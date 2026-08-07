import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { portfolioService, commodityService } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import GlassCard from '../components/GlassCard';
import MetricCard from '../components/MetricCard';
import CustomChart from '../components/CustomChart';
import { 
  TrendingUp, 
  Briefcase, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  ChevronRight, 
  DollarSign, 
  Percent,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { setCommodity } = useTheme();
  
  const [stats, setStats] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marketOverview, setMarketOverview] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, invRes, marketRes] = await Promise.all([
          portfolioService.getStats(),
          portfolioService.getInvestments(),
          commodityService.getMarketOverview()
        ]);
        
        if (statsRes.success) setStats(statsRes.data);
        if (invRes.success) setInvestments(invRes.data);
        if (marketRes.success) setMarketOverview(marketRes.data);
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Prep allocation chart data
  const hasInvestments = stats && stats.allocations && stats.allocations.length > 0;
  
  const allocationData = {
    labels: hasInvestments ? stats.allocations.map(a => a.commodity) : ['No Assets'],
    datasets: [{
      data: hasInvestments ? stats.allocations.map(a => a.value) : [1],
      backgroundColor: hasInvestments 
        ? stats.allocations.map(a => {
            if (a.code === 'gold') return '#FFD700';
            if (a.code === 'silver') return '#94A3B8';
            if (a.code === 'platinum') return '#E2E8F0';
            if (a.code === 'crudeoil') return '#F97316';
            return '#10B981';
          })
        : ['rgba(255, 255, 255, 0.05)']
    }]
  };

  // Prep growth timeline data
  const hasTimeline = stats && stats.timeline && stats.timeline.length > 0;
  const timelineData = {
    labels: hasTimeline ? stats.timeline.map(t => `${t.quarter} ${t.year}`) : ['N/A'],
    datasets: [
      {
        label: 'Invested Value',
        data: hasTimeline ? stats.timeline.map(t => t.invested) : [0],
        borderColor: '#94A3B8',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0
      },
      {
        label: 'Current Asset Value',
        data: hasTimeline ? stats.timeline.map(t => t.currentValue) : [0],
        borderColor: 'var(--accent-color)',
        backgroundColor: 'var(--accent-glow)'
      }
    ]
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Financial Terminal</h2>
          <p className="text-gray-400 text-sm mt-1">Real-time valuation summaries & allocations indexes</p>
        </div>
        <button
          onClick={() => navigate('/portfolio')}
          className="luxury-button flex items-center space-x-2 self-start"
        >
          <Plus size={18} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Portfolio Value"
          value={stats ? stats.totalValue : 0}
          subtext="Net Asset Value (NAV)"
          changePercent={stats ? stats.roi : 0}
          trend={stats && stats.totalProfit >= 0 ? 'Increase' : 'Decrease'}
          icon={Briefcase}
        />
        <MetricCard
          title="Total Invested capital"
          value={stats ? stats.totalInvested : 0}
          subtext="Acquisition cost index"
          icon={DollarSign}
        />
        <MetricCard
          title="Total Net Gains"
          value={stats ? stats.totalProfit : 0}
          subtext="Unrealized returns"
          changePercent={stats ? stats.roi : 0}
          trend={stats && stats.totalProfit >= 0 ? 'Increase' : 'Decrease'}
          icon={TrendingUp}
        />
        <MetricCard
          title="Return on Investment"
          value={stats ? `${stats.roi.toFixed(2)}%` : '0%'}
          subtext="Weighted portfolio ROI"
          isCurrency={false}
          icon={Percent}
        />
      </div>

      {/* Empty State warning */}
      {!hasInvestments && (
        <GlassCard hover={false} className="p-8 text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-white/5 rounded-full text-accent shadow-luxury">
            <Briefcase size={36} />
          </div>
          <h3 className="text-xl font-bold text-white">Your Portoflio is Empty</h3>
          <p className="text-gray-400 max-w-md">
            Log your precious metals purchases and contracts to monitor holdings values, growth percentages, and state price disparities automatically.
          </p>
          <button onClick={() => navigate('/portfolio')} className="luxury-button flex items-center space-x-2">
            <span>Establish First Investment</span>
            <ArrowRight size={16} />
          </button>
        </GlassCard>
      )}

      {hasInvestments && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Growth Chart */}
          <GlassCard hover={false} className="lg:col-span-2 h-[400px] flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Investment Value Growth</h3>
                <p className="text-xs text-gray-400">Chronological asset value versus cost index basis</p>
              </div>
              <span className="text-xs font-semibold text-accent flex items-center">
                <Calendar size={14} className="mr-1" />
                Q3 2022 – Q2 2026
              </span>
            </div>
            <div className="flex-1 min-h-[300px]">
              <CustomChart type="line" data={timelineData} />
            </div>
          </GlassCard>

          {/* Allocation Doughnut */}
          <GlassCard hover={false} className="h-[400px] flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Asset Allocation</h3>
              <p className="text-xs text-gray-400">Commodity percentage allocation distribution</p>
            </div>
            <div className="flex-1 max-h-[250px] mt-4">
              <CustomChart type="doughnut" data={allocationData} />
            </div>
            <div className="border-t border-white/5 pt-4 flex justify-around text-center text-xs">
              {stats.allocations.map(a => (
                <div key={a.commodity}>
                  <p className="text-gray-400 font-medium">{a.commodity}</p>
                  <p className="text-sm font-bold text-white mt-1">{a.percentage}%</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Performance spotlights & Recent transactions */}
      {hasInvestments && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Performers cards */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white tracking-tight">Performance Statistics</h3>
            
            {stats.performance.best && (
              <GlassCard hover={false} className="p-5 flex items-center justify-between border-emerald-500/20 bg-emerald-950/10">
                <div>
                  <p className="text-xs text-emerald-400 uppercase font-bold tracking-wider">Top Performer</p>
                  <h4 className="text-lg font-bold text-white mt-1">{stats.performance.best.commodity}</h4>
                  <p className="text-xs text-gray-400 mt-1">NAV: ₹{stats.performance.best.value.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-400">+{stats.performance.best.roi}%</span>
                  <p className="text-[10px] text-gray-500 mt-1 font-semibold uppercase">Total Gain</p>
                </div>
              </GlassCard>
            )}

            {stats.performance.worst && (
              <GlassCard hover={false} className="p-5 flex items-center justify-between border-rose-500/20 bg-rose-950/10">
                <div>
                  <p className="text-xs text-rose-400 uppercase font-bold tracking-wider">Lagging Performer</p>
                  <h4 className="text-lg font-bold text-white mt-1">{stats.performance.worst.commodity}</h4>
                  <p className="text-xs text-gray-400 mt-1">NAV: ₹{stats.performance.worst.value.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-rose-400">{stats.performance.worst.roi}%</span>
                  <p className="text-[10px] text-gray-500 mt-1 font-semibold uppercase">Total Return</p>
                </div>
              </GlassCard>
            )}

            {stats.performance.highestValue && (
              <GlassCard hover={false} className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-accent uppercase font-bold tracking-wider">Highest Exposure</p>
                  <h4 className="text-lg font-bold text-white mt-1 capitalize">{stats.performance.highestValue.commodity}</h4>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-white">₹{stats.performance.highestValue.value.toLocaleString()}</span>
                  <p className="text-[10px] text-gray-500 mt-1 font-semibold uppercase">Holding Value</p>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Recent Investments list */}
          <GlassCard hover={false} className="lg:col-span-2 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                <p className="text-xs text-gray-400">Latest acquisitions logged into simulator</p>
              </div>
              <button onClick={() => navigate('/portfolio')} className="text-xs text-accent font-semibold hover:underline flex items-center">
                Manage Assets <ChevronRight size={14} className="ml-0.5" />
              </button>
            </div>
            
            <div className="space-y-4 overflow-y-auto max-h-[250px] pr-2">
              {investments.slice(0, 4).map((inv) => {
                const profit = inv.currentValue - inv.investedValue;
                const isGain = profit >= 0;
                return (
                  <div key={inv._id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center font-bold text-accent uppercase text-xs">
                        {inv.commodityCode.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white uppercase">{inv.commodityCode}</h4>
                        <p className="text-xs text-gray-500 font-medium">
                          {inv.state} | {inv.purity} | {inv.weight}g
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-white">₹{inv.currentValue.toLocaleString()}</p>
                      <span className={`text-[10px] font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isGain ? '+' : ''}{inv.growthPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Market Watch Sparlines list */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white tracking-tight">Active Commodity Rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {marketOverview.map((comm) => (
            <div 
              key={comm.code} 
              onClick={() => { setCommodity(comm.code); navigate('/market'); }}
              className="p-4 bg-[#0d1222]/80 border border-white/5 rounded-xl flex justify-between items-center hover:border-accent/30 cursor-pointer transition-all"
            >
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">{comm.name}</p>
                <p className="text-md font-bold text-white mt-1">
                  {comm.currency === 'USD' ? '$' : '₹'}
                  {comm.latestPrice.toLocaleString()}
                </p>
              </div>
              <span className={`text-xs font-bold ${comm.qoqChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {comm.qoqChangePercent >= 0 ? '+' : ''}{comm.qoqChangePercent}%
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
