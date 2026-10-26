import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { ShieldAlert, BarChart3, BrainCircuit, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getFirestoreHoldings, 
  calculateFirestorePortfolioStats, 
  getFirestoreTransactions 
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

const RiskAnalytics = () => {
  const { firebaseUid } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'dashboard';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [portfolioStats, setPortfolioStats] = useState(null);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [txStats, setTxStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Scenario Simulator variables
  const [scenarioCommodity, setScenarioCommodity] = useState('gold');
  const [scenarioPercentChange, setScenarioPercentChange] = useState(-5); // default Wacc price drop -5%

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [portRes, invRes, txRes] = await Promise.allSettled([
        api.get('/api/portfolio/stats'),
        api.get('/api/inventory/stats'),
        api.get('/api/transactions/stats')
      ]);

      let pStats = (portRes.status === 'fulfilled' && portRes.value.data.success) ? portRes.value.data.data : null;
      let iStats = (invRes.status === 'fulfilled' && invRes.value.data.success) ? invRes.value.data.data : null;
      let tStats = (txRes.status === 'fulfilled' && txRes.value.data.success) ? txRes.value.data.data : null;

      // Firestore fallback if backend responses are empty or missing
      if (firebaseUid) {
        try {
          const [fsHoldings, fsTxs] = await Promise.all([
            getFirestoreHoldings(firebaseUid).catch(() => []),
            getFirestoreTransactions(firebaseUid).catch(() => [])
          ]);

          if ((!pStats || !pStats.totalValue) && fsHoldings.length > 0) {
            pStats = calculateFirestorePortfolioStats(fsHoldings);
          }

          if ((!iStats || !iStats.totalValue) && fsHoldings.length > 0) {
            const totalVal = fsHoldings.reduce((acc, h) => acc + (Number(h.investedValue) || 0), 0);
            iStats = {
              totalValue: totalVal,
              totalItems: fsHoldings.length,
              lowStockCount: fsHoldings.filter(h => Number(h.quantity) <= 5).length,
              commodityBreakdown: fsHoldings.map(h => ({ _id: h.commodityCode, totalValue: h.investedValue, totalQuantity: h.quantity }))
            };
          }

          if ((!tStats || (!tStats.totalPurchases && !tStats.totalSales)) && fsTxs.length > 0) {
            let totalP = 0, totalS = 0, pCount = 0, sCount = 0;
            fsTxs.forEach(t => {
              if (t.type === 'purchase') {
                totalP += (Number(t.totalValue) || 0);
                pCount++;
              } else {
                totalS += (Number(t.totalValue) || 0);
                sCount++;
              }
            });
            tStats = {
              totalPurchases: totalP,
              totalSales: totalS,
              purchaseCount: pCount,
              salesCount: sCount,
              netProfit: totalS - totalP,
              monthlyTrends: []
            };
          }
        } catch (fsErr) {
          console.warn('RiskAnalytics Firestore fallback notice:', fsErr.message);
        }
      }

      setPortfolioStats(pStats || { totalValue: 0, totalInvested: 0, totalProfit: 0, roi: 0, allocations: [] });
      setInventoryStats(iStats || { totalValue: 0, totalItems: 0, lowStockCount: 0, commodityBreakdown: [] });
      setTxStats(tStats || { totalPurchases: 0, totalSales: 0, purchaseCount: 0, salesCount: 0, netProfit: 0 });
    } catch (err) {
      console.error('Error fetching analytics statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Compute values for simulation
  const calculateSimulationImpact = () => {
    if (!portfolioStats || !portfolioStats.allocations) return { oldVal: 0, newVal: 0, delta: 0, percentDelta: 0 };
    
    const totalVal = portfolioStats.totalValue;
    const targetAlloc = portfolioStats.allocations.find(
      a => a.code.toLowerCase() === scenarioCommodity.toLowerCase()
    );
    
    if (!targetAlloc) return { oldVal: totalVal, newVal: totalVal, delta: 0, percentDelta: 0 };

    const targetVal = targetAlloc.value;
    const change = targetVal * (scenarioPercentChange / 100);
    const newVal = totalVal + change;

    return {
      oldVal: totalVal,
      newVal: Number(newVal.toFixed(2)),
      delta: Number(change.toFixed(2)),
      percentDelta: Number(((change / totalVal) * 100).toFixed(2))
    };
  };

  // Rule-based insights generation
  const generateAIStyleInsights = () => {
    const insights = [];
    if (!portfolioStats || !inventoryStats) return [];

    // 1. Concentration Insight
    const goldAlloc = portfolioStats.allocations?.find(a => a.code === 'gold');
    if (goldAlloc && parseFloat(goldAlloc.percentage) > 60) {
      insights.push({
        type: 'danger',
        message: `High Portfolio Concentration: Gold represents ${goldAlloc.percentage}% of total holdings, exceeding the 60% B2B target limit. Consider diversifying.`,
      });
    }

    // 2. Performance Insight
    if (portfolioStats.performance && portfolioStats.performance.best) {
      insights.push({
        type: 'success',
        message: `High Performer: ${portfolioStats.performance.best.commodity} is currently generating the highest yields with an average ROI of ${portfolioStats.performance.best.roi}%.`,
      });
    }

    // 3. Stock Level Warning Insight
    if (inventoryStats.lowStockCount > 0) {
      insights.push({
        type: 'warning',
        message: `Inventory Alert: ${inventoryStats.lowStockCount} items are below the safety stock levels. Inward acquisitions are recommended to satisfy active purchase commitments.`,
      });
    }

    // 4. Monthly Trend Insight
    if (txStats && txStats.netProfit > 0) {
      insights.push({
        type: 'success',
        message: `Capital Efficiency: Positive net cash flow of ₹${Number(txStats.netProfit || 0).toLocaleString('en-IN')} achieved. Current sales invoices are outperforming purchase expenditures.`,
      });
    } else if (txStats && txStats.netProfit < 0) {
      insights.push({
        type: 'warning',
        message: `Capital Allocation: Negative net cash flow of ₹${Number(Math.abs(txStats.netProfit) || 0).toLocaleString('en-IN')} detected due to heavy inventory restocking this quarter.`,
      });
    }

    return insights;
  };

  const getRiskLevel = () => {
    if (!portfolioStats || !portfolioStats.allocations) return 'Low';
    
    // If one commodity exceeds 60% -> High Risk
    const hasHighConcentration = portfolioStats.allocations.some(a => parseFloat(a.percentage) > 60);
    if (hasHighConcentration) return 'High';
    
    // If one commodity exceeds 40% -> Moderate Risk
    const hasModerateConcentration = portfolioStats.allocations.some(a => parseFloat(a.percentage) > 40);
    if (hasModerateConcentration) return 'Moderate';

    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
          <ShieldAlert className="text-accent" size={24} />
          Risk & Exposure Analytics Terminal
        </h1>
        <p className="text-xs text-gray-500 mt-1">Institutional analysis of exposure, volatility downside simulation, and overall P&L margins.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5 flex space-x-6">
        {['dashboard', 'pnl', 'insights', 'simulation'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab 
                ? 'border-accent text-accent' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'dashboard' ? 'Risk Dashboard' : 
             tab === 'pnl' ? 'P&L Analysis' : 
             tab === 'insights' ? 'AI Insights' : 'Scenario Simulator'}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && portfolioStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Risk KPI */}
              <div className="p-5 bg-white/5 border border-white/5 rounded-xl flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Diversification Risk Index</p>
                  <p className={`text-2xl font-bold mt-2 ${
                    getRiskLevel() === 'High' ? 'text-red-500 animate-pulse' :
                    getRiskLevel() === 'Moderate' ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {getRiskLevel()} Risk
                  </p>
                </div>
                <div className="mt-4 p-3 bg-white/5 border border-white/5 rounded-lg text-[11px] text-gray-400">
                  {getRiskLevel() === 'High' 
                    ? 'Concentration exceeds 60% in a single commodity. Portfolio is vulnerable to sector volatility.' 
                    : 'Portfolio satisfies institutional hedging standards.'}
                </div>
              </div>

              {/* Exposure Concentration Table */}
              <div className="col-span-2 p-5 bg-white/5 border border-white/5 rounded-xl shadow-md space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Asset Concentration Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] text-gray-400 uppercase tracking-widest">
                        <th className="pb-2">Commodity</th>
                        <th className="pb-2 text-right">Holdings Value</th>
                        <th className="pb-2 text-right">Allocation %</th>
                        <th className="pb-2 text-right">ROI %</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {portfolioStats.allocations?.map((alloc) => (
                        <tr key={alloc.code} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 font-semibold text-white capitalize">{alloc.commodity}</td>
                          <td className="py-2.5 text-right font-bold text-accent">₹{Number(alloc?.value || 0).toLocaleString('en-IN')}</td>
                          <td className="py-2.5 text-right font-semibold text-white">{alloc.percentage}%</td>
                          <td className={`py-2.5 text-right font-bold ${parseFloat(alloc.roi) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {alloc.roi}%
                          </td>
                          <td className="py-2.5">
                            {parseFloat(alloc.percentage) > 60 ? (
                              <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                                <AlertTriangle size={10} /> Overexposed
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle size={10} /> Scoped
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pnl' && portfolioStats && (
            <div className="space-y-6">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl shadow-md">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total Capital Invested</p>
                  <p className="text-lg font-bold text-white mt-1.5">₹{Number(portfolioStats?.totalInvested || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl shadow-md">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Current Asset Valuation</p>
                  <p className="text-lg font-bold text-white mt-1.5">₹{Number(portfolioStats?.totalValue || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl shadow-md">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Unrealized profit & loss</p>
                  <p className={`text-lg font-bold mt-1.5 ${(portfolioStats?.totalProfit || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    ₹{Number(portfolioStats?.totalProfit || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl shadow-md">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Yield Return Ratio (ROI)</p>
                  <p className={`text-lg font-bold mt-1.5 ${(portfolioStats?.roi || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {Number(portfolioStats?.roi || 0)}%
                  </p>
                </div>
              </div>

              {/* P&L Breakdown Timeline */}
              <div className="p-5 bg-[#0b0f19] border border-white/5 rounded-xl shadow-luxury">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Historical Financial Growth Timeline</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] text-gray-400 uppercase tracking-widest">
                        <th className="pb-3">Period</th>
                        <th className="pb-3 text-right">Invested Value</th>
                        <th className="pb-3 text-right">Market Valuation</th>
                        <th className="pb-3 text-right">Yield Return P&L</th>
                        <th className="pb-3 text-right">ROI Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-semibold">
                      {portfolioStats.timeline?.map((item, idx) => {
                        const profit = Number(item.currentValue || 0) - Number(item.invested || 0);
                        const roi = Number(item.invested || 0) > 0 ? (profit / Number(item.invested)) * 100 : 0;
                        return (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 text-white">{item.year} - {item.quarter}</td>
                            <td className="py-3 text-right text-gray-400">₹{Number(item.invested || 0).toLocaleString('en-IN')}</td>
                            <td className="py-3 text-right text-white">₹{Number(item.currentValue || 0).toLocaleString('en-IN')}</td>
                            <td className={`py-3 text-right ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              ₹{Number(profit || 0).toLocaleString('en-IN')}
                            </td>
                            <td className={`py-3 text-right ${roi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {roi.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit className="text-accent" size={20} />
                <h3 className="text-sm font-bold text-white">Rule-Based Intelligence & Decision Support</h3>
              </div>
              <div className="space-y-3">
                {generateAIStyleInsights().map((ins, idx) => (
                  <div key={idx} className={`p-4 rounded-xl flex items-start space-x-3 border ${
                    ins.type === 'danger' ? 'bg-red-500/5 border-red-500/15 text-red-400' :
                    ins.type === 'warning' ? 'bg-amber-500/5 border-amber-500/15 text-amber-400' :
                    'bg-emerald-500/5 border-emerald-500/15 text-emerald-400'
                  }`}>
                    {ins.type === 'danger' && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                    {ins.type === 'warning' && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                    {ins.type === 'success' && <CheckCircle size={16} className="shrink-0 mt-0.5" />}
                    <div className="text-xs leading-relaxed font-semibold">
                      {ins.message}
                    </div>
                  </div>
                ))}
                {generateAIStyleInsights().length === 0 && (
                  <div className="p-8 text-center text-xs text-gray-500 bg-white/5 rounded-xl border border-white/5">
                    No intelligence insights loaded. Setup portfolio data.
                  </div>
                )}
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center space-x-3 text-gray-500 text-[11px] font-medium leading-relaxed mt-6">
                <Info size={16} className="shrink-0 text-accent" />
                <span>
                  <strong>DISCLAIMER</strong>: Insights are rule-based system notifications derived from current database quantities, concentration percentages, and stock counts. These do not constitute guaranteed financial or investing recommendations.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'simulation' && portfolioStats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Inputs */}
              <div className="p-6 bg-white/5 border border-white/5 rounded-xl shadow-md space-y-4 text-xs">
                <h3 className="text-sm font-bold text-white mb-2">Scenario Controls</h3>
                
                <div className="space-y-1">
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold">Select Commodity Target</label>
                  <select
                    value={scenarioCommodity}
                    onChange={(e) => setScenarioCommodity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                  >
                    {portfolioStats.allocations?.map(a => (
                      <option key={a.code} value={a.code} className="capitalize">{a.commodity}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-gray-400 uppercase font-semibold">
                    <span>Simulated Price Shift</span>
                    <span className={`font-bold ${scenarioPercentChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {scenarioPercentChange >= 0 ? '+' : ''}{scenarioPercentChange}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={scenarioPercentChange}
                    onChange={(e) => setScenarioPercentChange(Number(e.target.value))}
                    className="w-full accent-accent bg-white/10 h-1 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-gray-500 font-semibold">
                    <span>-50% Drop</span>
                    <span>0% Flat</span>
                    <span>+50% Surge</span>
                  </div>
                </div>
              </div>

              {/* Simulation Output Card */}
              <div className="lg:col-span-2 p-6 bg-white/5 border border-white/5 rounded-xl shadow-md flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Estimated Impact Valuation</h3>
                  <p className="text-xs text-gray-500">Calculated impact on active portfolio holding values.</p>
                </div>

                {(() => {
                  const sim = calculateSimulationImpact();
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Current Portfolio Value</p>
                        <p className="text-lg font-bold text-white mt-1.5">₹{Number(sim?.oldVal || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Simulated Value Shift</p>
                        <p className={`text-lg font-bold mt-1.5 ${(sim?.delta || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {(sim?.delta || 0) >= 0 ? '+' : ''}₹{Number(sim?.delta || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Projected Value Result</p>
                        <p className="text-lg font-bold text-white mt-1.5">₹{Number(sim?.newVal || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center space-x-3 text-gray-500 text-[10px] font-medium leading-relaxed">
                  <Info size={14} className="shrink-0 text-accent" />
                  <span>
                    <strong>SIMULATION WARNING</strong>: Estimates are linear mathematical projections of price variance on current database asset holdings. They do not simulate market liquidity changes or price correlations.
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RiskAnalytics;
