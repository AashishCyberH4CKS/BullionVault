import React, { useState, useEffect } from 'react';
import { commodityService } from '../services/api';
import GlassCard from '../components/GlassCard';
import MetricCard from '../components/MetricCard';
import { 
  Calculator as CalcIcon, 
  HelpCircle, 
  ArrowUpRight, 
  TrendingUp, 
  DollarSign,
  Briefcase,
  Layers,
  MapPin,
  Scale,
  Calendar
} from 'lucide-react';

const Calculator = () => {
  const [commodities, setCommodities] = useState([]);
  const [selectedCommCode, setSelectedCommCode] = useState('');
  const [filterOpts, setFilterOpts] = useState({
    states: [],
    purities: [],
    weights: [],
    quarters: []
  });

  // Calculator form values
  const [state, setState] = useState('');
  const [purity, setPurity] = useState('');
  const [weight, setWeight] = useState('');
  const [buyQuarter, setBuyQuarter] = useState('');
  const [sellQuarter, setSellQuarter] = useState('');
  const [quantity, setQuantity] = useState(10);
  
  // Results
  const [buyPrice, setBuyPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  
  const [buyLoading, setBuyLoading] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);

  // Fetch commodities list
  useEffect(() => {
    const fetchComm = async () => {
      try {
        const res = await commodityService.getCommodities();
        if (res.success && res.data.length > 0) {
          setCommodities(res.data);
          setSelectedCommCode(res.data[0].code);
        }
      } catch (err) {
        console.error('Failed to load commodities:', err.message);
      }
    };
    fetchComm();
  }, []);

  // Fetch options for selected commodity
  useEffect(() => {
    if (!selectedCommCode) return;
    
    const fetchFilters = async () => {
      try {
        const res = await commodityService.getFilters(selectedCommCode);
        if (res.success) {
          const opts = res.data;
          setFilterOpts(opts);
          setState(opts.states.includes('National') ? 'National' : opts.states[0] || '');
          setPurity(opts.purities[0] || '');
          setWeight(opts.weights[0] || 1);
          setBuyQuarter(opts.quarters[opts.quarters.length - 1] || ''); // Oldest
          setSellQuarter(opts.quarters[0] || ''); // Newest
        }
      } catch (err) {
        console.error('Failed to load filters:', err.message);
      }
    };
    fetchFilters();
  }, [selectedCommCode]);

  // Lookup purchase rate
  useEffect(() => {
    if (!selectedCommCode || !state || !purity || !buyQuarter) return;

    const fetchBuyPrice = async () => {
      setBuyLoading(true);
      try {
        const res = await commodityService.lookupPrice(selectedCommCode, {
          state, purity, weight, quarter: buyQuarter
        });
        if (res.success) setBuyPrice(res.data.price);
      } catch (err) {
        setBuyPrice(0);
      } finally {
        setBuyLoading(false);
      }
    };

    fetchBuyPrice();
  }, [selectedCommCode, state, purity, weight, buyQuarter]);

  // Lookup current rate
  useEffect(() => {
    if (!selectedCommCode || !state || !purity || !sellQuarter) return;

    const fetchSellPrice = async () => {
      setSellLoading(true);
      try {
        const res = await commodityService.lookupPrice(selectedCommCode, {
          state, purity, weight, quarter: sellQuarter
        });
        if (res.success) setSellPrice(res.data.price);
      } catch (err) {
        setSellPrice(0);
      } finally {
        setSellLoading(false);
      }
    };

    fetchSellPrice();
  }, [selectedCommCode, state, purity, weight, sellQuarter]);

  // Math Calculations
  const totalInvested = buyPrice * quantity;
  const currentValue = sellPrice * quantity;
  const netProfit = currentValue - totalInvested;
  const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

  // Comparison metrics (contrasting with fixed bank return - say 7% per year)
  // Assuming quarters difference is roughly 0.25 years per step
  let quartersCount = 4;
  if (filterOpts.quarters && filterOpts.quarters.length > 0) {
    const buyIdx = filterOpts.quarters.indexOf(buyQuarter);
    const sellIdx = filterOpts.quarters.indexOf(sellQuarter);
    if (buyIdx !== -1 && sellIdx !== -1) {
      quartersCount = Math.abs(buyIdx - sellIdx) || 1;
    }
  }

  const durationYears = quartersCount * 0.25;
  const bankInterestRate = 0.07; // 7% standard deposit rate
  const bankAlternativeReturn = totalInvested * Math.pow(1 + bankInterestRate, durationYears) - totalInvested;
  const differencePerformance = netProfit - bankAlternativeReturn;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Investment Calculator</h2>
        <p className="text-gray-400 text-sm mt-1">Estimate returns based on historical spreadsheet curves</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Parameters Form */}
        <div className="lg:col-span-1">
          <GlassCard hover={false} className="p-6 space-y-5">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
              <CalcIcon size={18} className="mr-2 text-accent" />
              <span>Calculators Console</span>
            </h3>

            {/* Commodity */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Commodity</label>
              <select
                value={selectedCommCode}
                onChange={(e) => setSelectedCommCode(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
              >
                {commodities.map(c => (
                  <option key={c.code} value={c.code} className="bg-[#0B0F19] text-white">{c.name}</option>
                ))}
              </select>
            </div>

            {/* State */}
            {filterOpts.states.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                  <MapPin size={12} className="mr-1 text-accent" />
                  State / UT
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
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
                  Purity / Unit
                </label>
                <select
                  value={purity}
                  onChange={(e) => setPurity(e.target.value)}
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
                  value={weight}
                  disabled={selectedCommCode === 'crudeoil'}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent disabled:opacity-30"
                >
                  {filterOpts.weights.map(w => (
                    <option key={w} value={w} className="bg-[#0B0F19] text-white">{w}g</option>
                  ))}
                </select>
              </div>
            )}

            {/* Buy / Sell Quarters */}
            <div className="grid grid-cols-2 gap-4">
              {filterOpts.quarters.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                    <Calendar size={12} className="mr-1 text-accent" />
                    Buy Quarter
                  </label>
                  <select
                    value={buyQuarter}
                    onChange={(e) => setBuyQuarter(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                  >
                    {filterOpts.quarters.map(q => (
                      <option key={q} value={q} className="bg-[#0B0F19] text-white">{q}</option>
                    ))}
                  </select>
                </div>
              )}

              {filterOpts.quarters.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                    <Calendar size={12} className="mr-1 text-accent" />
                    Sell Quarter
                  </label>
                  <select
                    value={sellQuarter}
                    onChange={(e) => setSellQuarter(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                  >
                    {filterOpts.quarters.map(q => (
                      <option key={q} value={q} className="bg-[#0B0F19] text-white">{q}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Quantity Size</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Math Outputs */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-white tracking-tight">Calculation Outputs</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard
              title="Acquisition capital"
              value={Number(totalInvested || 0)}
              subtext={buyLoading ? 'Fetching index...' : `Purchase: ₹${Number(buyPrice || 0).toLocaleString()} / unit`}
              icon={DollarSign}
            />
            <MetricCard
              title="Estimated Value"
              value={Number(currentValue || 0)}
              subtext={sellLoading ? 'Fetching index...' : `Selling: ₹${Number(sellPrice || 0).toLocaleString()} / unit`}
              icon={Briefcase}
            />
          </div>

          <GlassCard hover={false} className="p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <div>
                <h4 className="text-md font-bold text-white">Acquisition Returns Summary</h4>
                <p className="text-xs text-gray-400">Yield breakdown across selected periods</p>
              </div>
              <span className={`text-2xl font-black ${(netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {Number(roi || 0).toFixed(2)}%
              </span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Profit / Loss</span>
                <span className={`font-bold ${(netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₹{Number(netProfit || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Holding Duration</span>
                <span className="text-white font-medium">{Number(durationYears || 0).toFixed(2)} Years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Alternative Bank Deposit Return (7% CAGR)</span>
                <span className="text-gray-300">₹{Number(bankAlternativeReturn || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-4 border-t border-white/5">
                <span className="text-gray-400 flex items-center">
                  Alpha Performance vs Deposit Alternative
                  <HelpCircle size={14} className="ml-1 text-gray-500" title="Net Return subtracting bank alternative return" />
                </span>
                <span className={`font-extrabold ${(differencePerformance || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(differencePerformance || 0) >= 0 ? '+' : ''}₹{Number(differencePerformance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {differencePerformance >= 0 ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center space-x-2">
                <ArrowUpRight size={16} />
                <span>Excellent return. This commodity outperformed standard fixed income deposits.</span>
              </div>
            ) : (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center space-x-2">
                <TrendingUp size={16} />
                <span>Standard deposits yielded higher relative returns over this exact interval.</span>
              </div>
            )}
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default Calculator;
