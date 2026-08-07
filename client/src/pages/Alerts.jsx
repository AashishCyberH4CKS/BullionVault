import React, { useState, useEffect } from 'react';
import { alertService, commodityService } from '../services/api';
import GlassCard from '../components/GlassCard';
import { 
  Bell, 
  Trash2, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle,
  Clock,
  Info
} from 'lucide-react';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form selections
  const [selectedCommCode, setSelectedCommCode] = useState('');
  const [selectedCommId, setSelectedCommId] = useState('');
  const [filterOpts, setFilterOpts] = useState({
    states: [],
    purities: [],
    weights: []
  });

  const [formState, setFormState] = useState({
    state: '',
    purity: '',
    weight: '',
    type: 'above',
    thresholdPrice: ''
  });

  const [currentRate, setCurrentRate] = useState(0);
  const [rateLoading, setRateLoading] = useState(false);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const [alertRes, commRes] = await Promise.all([
        alertService.getAlerts(),
        commodityService.getCommodities()
      ]);

      if (alertRes.success) setAlerts(alertRes.data);
      if (commRes.success && commRes.data.length > 0) {
        setCommodities(commRes.data);
        setSelectedCommCode(commRes.data[0].code);
        setSelectedCommId(commRes.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load price triggers:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  // Fetch filters for form
  useEffect(() => {
    if (!selectedCommCode) return;
    const fetchFormFilters = async () => {
      try {
        const res = await commodityService.getFilters(selectedCommCode);
        if (res.success) {
          const opts = res.data;
          setFilterOpts(opts);
          setFormState(prev => ({
            ...prev,
            state: opts.states.includes('National') ? 'National' : opts.states[0] || '',
            purity: opts.purities[0] || '',
            weight: opts.weights[0] || 1,
            thresholdPrice: ''
          }));
        }
      } catch (err) {
        console.error('Failed to fetch filters:', err.message);
      }
    };
    fetchFormFilters();
  }, [selectedCommCode]);

  // Lookup current price for select filters to guide trigger price input
  useEffect(() => {
    if (!selectedCommCode || !formState.state || !formState.purity) return;
    const fetchRate = async () => {
      setRateLoading(true);
      try {
        const res = await commodityService.lookupPrice(selectedCommCode, {
          state: formState.state,
          purity: formState.purity,
          weight: formState.weight
        });
        if (res.success) setCurrentRate(res.data.price);
      } catch (err) {
        setCurrentRate(0);
      } finally {
        setRateLoading(false);
      }
    };
    fetchRate();
  }, [selectedCommCode, formState.state, formState.purity, formState.weight]);

  const handleCommodityChange = (e) => {
    const code = e.target.value;
    setSelectedCommCode(code);
    const comm = commodities.find(c => c.code === code);
    if (comm) setSelectedCommId(comm._id);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formState.thresholdPrice) return;

    setAdding(true);
    try {
      const res = await alertService.createAlert({
        commodityId: selectedCommId,
        state: formState.state,
        purity: formState.purity,
        weight: formState.weight,
        type: formState.type,
        thresholdPrice: Number(formState.thresholdPrice)
      });
      if (res.success) {
        setFormState(prev => ({ ...prev, thresholdPrice: '' }));
        loadAlerts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create price trigger.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await alertService.deleteAlert(id);
      if (res.success) {
        loadAlerts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete alert.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Price Triggers & Alerts</h2>
        <p className="text-gray-400 text-sm mt-1">Configure threshold indexes to alert on value conditions</p>
      </div>

      {loading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form setup */}
          <div className="lg:col-span-1">
            <GlassCard hover={false} className="p-6 space-y-5">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
                <Bell size={18} className="mr-2 text-accent" />
                <span>Configure Alert</span>
              </h3>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Commodity */}
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

                {/* State */}
                {filterOpts.states && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">State Location</label>
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

                {/* Purity */}
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

                {/* Weight */}
                {filterOpts.weights && filterOpts.weights.some(w => w !== 1) && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Weight</label>
                    <select
                      name="weight"
                      value={formState.weight}
                      disabled={selectedCommCode === 'crudeoil'}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent disabled:opacity-35"
                    >
                      {filterOpts.weights.map(w => (
                        <option key={w} value={w} className="bg-[#0B0F19] text-white">{w}g</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Trigger logic */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Trigger Option</label>
                    <select
                      name="type"
                      value={formState.type}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="above" className="bg-[#0B0F19] text-white">Price Rises Above</option>
                      <option value="below" className="bg-[#0B0F19] text-white">Price Falls Below</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Trigger Rate (INR)</label>
                    <input
                      type="number"
                      name="thresholdPrice"
                      required
                      value={formState.thresholdPrice}
                      onChange={handleInputChange}
                      placeholder="e.g. 75000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Info block */}
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex items-center space-x-2 text-gray-400">
                  <Info size={14} className="text-accent" />
                  <span>
                    Current database rate: <strong>₹{rateLoading ? 'Loading...' : currentRate.toLocaleString()}</strong>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={adding || currentRate === 0}
                  className="w-full py-2.5 mt-2 flex items-center justify-center space-x-2 luxury-button text-sm"
                >
                  <Plus size={16} />
                  <span>Establish Price Trigger</span>
                </button>
              </form>
            </GlassCard>
          </div>

          {/* List panel */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold text-white">Trigger Conditions ledgers</h3>

            {alerts.length === 0 ? (
              <GlassCard hover={false} className="p-12 text-center text-gray-400">
                No price notifications established.
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {alerts.map((al) => {
                  const triggersAbove = al.type === 'above';
                  const isCurrentConditionTriggered = al.isTriggered;
                  
                  return (
                    <GlassCard 
                      key={al._id} 
                      hover={false}
                      className={`p-5 flex items-center justify-between border-l-2 ${
                        isCurrentConditionTriggered 
                          ? 'border-emerald-500 bg-emerald-950/5' 
                          : 'border-accent bg-accent/5'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl border ${
                          isCurrentConditionTriggered 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-accent/10 text-accent border-accent/20'
                        }`}>
                          {triggersAbove ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                        </div>

                        <div>
                          <h4 className="font-bold text-white uppercase text-sm">
                            {al.commodityCode} Price {triggersAbove ? 'Above' : 'Below'} ₹{al.thresholdPrice.toLocaleString()}
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {al.state} | {al.purity} | {al.weight}g
                          </p>
                          <span className="text-[10px] text-gray-500 block mt-1">
                            Current DB Rate: ₹{al.currentPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          {isCurrentConditionTriggered ? (
                            <span className="text-xs font-bold text-emerald-400 flex items-center bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              <CheckCircle size={12} className="mr-1" />
                              Triggered
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-accent flex items-center bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full">
                              <Clock size={12} className="mr-1" />
                              Active
                            </span>
                          )}
                          {al.triggeredAt && (
                            <span className="text-[10px] text-gray-500 block mt-1">
                              {new Date(al.triggeredAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleDelete(al._id)}
                          className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Alert"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default Alerts;
