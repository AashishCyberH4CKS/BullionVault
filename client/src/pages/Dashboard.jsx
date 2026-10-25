import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import { getFirestoreTransactions } from '../services/firestoreService';
import { 
  TrendingUp, 
  Briefcase, 
  Layers, 
  ShieldAlert, 
  Bell, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Search, 
  Clock, 
  DollarSign, 
  FileText,
  Percent,
  Database
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { setCommodity } = useTheme();
  const { firebaseUid } = useAuth();
  
  const [portfolioStats, setPortfolioStats] = useState(null);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [marketOverview, setMarketOverview] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [portRes, invRes, txRes, alertRes, marketRes] = await Promise.allSettled([
        api.get('/api/portfolio/stats'),
        api.get('/api/inventory/stats'),
        api.get('/api/transactions'),
        api.get('/api/alerts'),
        api.get('/api/commodities/market/overview')
      ]);

      if (portRes.status === 'fulfilled' && portRes.value.data.success) setPortfolioStats(portRes.value.data.data);
      if (invRes.status === 'fulfilled' && invRes.value.data.success) setInventoryStats(invRes.value.data.data);
      
      let backendTxs = [];
      if (txRes.status === 'fulfilled' && txRes.value.data.success) backendTxs = txRes.value.data.data;
      if (alertRes.status === 'fulfilled' && alertRes.value.data.success) setAlerts(alertRes.value.data.data);
      if (marketRes.status === 'fulfilled' && marketRes.value.data.success) setMarketOverview(marketRes.value.data.data);

      // Load Firestore transactions
      let fsTxs = [];
      if (firebaseUid) {
        try {
          fsTxs = await getFirestoreTransactions(firebaseUid);
        } catch (e) {}
      }

      // Merge and deduplicate
      const txMap = new Map();
      fsTxs.forEach(t => txMap.set(t.transactionId || t.id, t));
      backendTxs.forEach(t => {
        const key = t.transactionId || t._id;
        if (!txMap.has(key)) txMap.set(key, t);
      });

      const mergedTxs = Array.from(txMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(mergedTxs);

    } catch (err) {
      console.error('Failed to load B2B dashboard terminal metrics:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [firebaseUid]);

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getRiskLevel = () => {
    if (!portfolioStats || !portfolioStats.allocations) return 'Low';
    const hasHighConcentration = portfolioStats.allocations.some(a => parseFloat(a.percentage) > 60);
    return hasHighConcentration ? 'High' : (portfolioStats.allocations.some(a => parseFloat(a.percentage) > 40) ? 'Moderate' : 'Low');
  };

  // Extract exposure values
  const goldAlloc = portfolioStats?.allocations?.find(a => a.code === 'gold') || { value: 0, percentage: 0 };
  const silverAlloc = portfolioStats?.allocations?.find(a => a.code === 'silver') || { value: 0, percentage: 0 };
  const otherAllocVal = (portfolioStats?.totalValue || 0) - (goldAlloc.value + silverAlloc.value);
  const otherAllocPercent = portfolioStats?.totalValue > 0 
    ? ((otherAllocVal / portfolioStats.totalValue) * 100).toFixed(1) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Upper Terminal Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight uppercase font-mono">
            Enterprise Intelligence Dashboard
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            Institutional overview of commodity portfolios, bulk inventory reserves, and P&L metrics.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/transactions?tab=purchases')}
            className="luxury-button py-2 px-4 text-xs flex items-center space-x-1.5"
          >
            <Plus size={14} />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Indices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 bg-[#090D17] border border-white/5 rounded-xl shadow-md space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total Portfolio Value (NAV)</span>
          <p className="text-xl font-bold text-white">₹{portfolioStats ? portfolioStats.totalValue.toLocaleString('en-IN') : '0'}</p>
          <p className="text-[10px] text-gray-400">Total invested and market-mapped holdings</p>
        </div>

        <div className="p-5 bg-[#090D17] border border-white/5 rounded-xl shadow-md space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Bulk Inventory Reserve Value</span>
          <p className="text-xl font-bold text-white">₹{inventoryStats ? inventoryStats.totalValue.toLocaleString('en-IN') : '0'}</p>
          <p className="text-[10px] text-gray-400">Warehouse stock valuation index</p>
        </div>

        <div className="p-5 bg-[#090D17] border border-white/5 rounded-xl shadow-md space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total Unrealized returns (P&L)</span>
          <div className="flex items-center space-x-2 mt-0.5">
            <p className={`text-xl font-bold ${portfolioStats && portfolioStats.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              ₹{portfolioStats ? portfolioStats.totalProfit.toLocaleString('en-IN') : '0'}
            </p>
            <span className={`text-[10px] font-bold flex items-center ${portfolioStats && portfolioStats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {portfolioStats && portfolioStats.totalProfit >= 0 ? '+' : ''}{portfolioStats ? portfolioStats.roi : '0'}%
            </span>
          </div>
          <p className="text-[10px] text-gray-400">Net portfolio margin metrics</p>
        </div>

        <div className="p-5 bg-[#090D17] border border-white/5 rounded-xl shadow-md space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Concentration Risk Assessment</span>
          <p className={`text-xl font-bold ${getRiskLevel() === 'High' ? 'text-red-500' : getRiskLevel() === 'Moderate' ? 'text-amber-500' : 'text-emerald-500'}`}>
            {getRiskLevel()} Risk
          </p>
          <p className="text-[10px] text-gray-400">Asset diversification status</p>
        </div>
      </div>

      {/* Sector Exposure Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exposure summary */}
        <div className="p-6 bg-white/5 border border-white/5 rounded-xl flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Portfolio Asset Exposure</h3>
            <p className="text-[10px] text-gray-500">Asset concentration allocations by commodity value</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-400">Gold Exposure</span>
                <span className="text-white">₹{goldAlloc.value.toLocaleString('en-IN')} ({goldAlloc.percentage}%)</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#FFD700] h-full rounded-full" style={{ width: `${goldAlloc.percentage}%` }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-400">Silver Exposure</span>
                <span className="text-white">₹{silverAlloc.value.toLocaleString('en-IN')} ({silverAlloc.percentage}%)</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#CBD5E1] h-full rounded-full" style={{ width: `${silverAlloc.percentage}%` }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-400">Other Commodities</span>
                <span className="text-white">₹{otherAllocVal.toLocaleString('en-IN')} ({otherAllocPercent}%)</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-accent h-full rounded-full" style={{ width: `${otherAllocPercent}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance spots */}
        <div className="p-6 bg-white/5 border border-white/5 rounded-xl flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Volatility Spotlight</h3>
            <p className="text-[10px] text-gray-500">Sector yield performance indices</p>
          </div>

          {portfolioStats && (
            <div className="space-y-4">
              {portfolioStats.performance?.best && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Top Performer</span>
                    <h4 className="text-xs font-bold text-white mt-0.5 capitalize">{portfolioStats.performance.best.commodity}</h4>
                  </div>
                  <span className="text-xs font-black text-emerald-400">+{portfolioStats.performance.best.roi}% ROI</span>
                </div>
              )}

              {portfolioStats.performance?.worst && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-rose-400 tracking-wider">Worst Performer</span>
                    <h4 className="text-xs font-bold text-white mt-0.5 capitalize">{portfolioStats.performance.worst.commodity}</h4>
                  </div>
                  <span className="text-xs font-black text-rose-400">{portfolioStats.performance.worst.roi}% ROI</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active triggered warnings */}
        <div className="p-6 bg-white/5 border border-white/5 rounded-xl flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Active Exposure Alerts</h3>
              <p className="text-[10px] text-gray-500">Triggered B2B risk index notifications</p>
            </div>
            <Bell size={16} className="text-gray-500" />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[140px] pr-1">
            {alerts.filter(a => a.isTriggered).slice(0, 3).map((a) => (
              <div key={a._id} className="p-2.5 bg-red-500/5 border border-red-500/10 rounded-lg flex items-start space-x-2">
                <ShieldAlert size={12} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-400 leading-normal font-medium">{a.message}</p>
              </div>
            ))}
            {alerts.filter(a => a.isTriggered).length === 0 && (
              <div className="text-center py-8 text-xs text-gray-500">
                All asset risk indicators nominal.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Ledger logs & Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Ledger Logs */}
        <div className="lg:col-span-2 p-6 bg-white/5 border border-white/5 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Corporate Purchase & Sale Ledger</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Unified business transaction journal entries</p>
            </div>
            <button
              onClick={() => navigate('/transactions')}
              className="text-xs font-bold text-accent hover:underline"
            >
              View Journal
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx._id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase ${
                    tx.type === 'purchase' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {tx.type === 'purchase' ? 'IN' : 'OUT'}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white capitalize">{tx.commodityCode} - {tx.counterparty}</h4>
                    <p className="text-[10px] text-gray-500 font-mono">Invoice: {tx.invoiceNumber} | {new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white">₹{tx.totalValue.toLocaleString('en-IN')}</p>
                  <span className="text-[9px] text-gray-400 font-semibold">{tx.quantity} {tx.unit}</span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-10 text-xs text-gray-500">
                No recent transaction logs. Use add action.
              </div>
            )}
          </div>
        </div>

        {/* Live Rates */}
        <div className="p-6 bg-white/5 border border-white/5 rounded-xl space-y-4">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Benchmark Spot Prices</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Metal & Energy indexes. Gram / bbl units.</p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
            {marketOverview.slice(0, 5).map((comm) => (
              <div 
                key={comm.code}
                onClick={() => { setCommodity(comm.code); navigate('/market'); }}
                className="p-2.5 bg-white/5 border border-white/5 rounded-lg flex justify-between items-center hover:border-accent/40 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-white capitalize">{comm.name}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5 font-semibold">10g / bbl average</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white">₹{comm.latestPrice.toLocaleString('en-IN')}</p>
                  <span className={`text-[9px] font-bold ${comm.qoqChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {comm.qoqChangePercent >= 0 ? '+' : ''}{comm.qoqChangePercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
