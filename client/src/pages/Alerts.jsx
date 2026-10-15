import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Trash2, Plus, ArrowUp, ArrowDown, CheckCircle, Clock, Info, AlertTriangle, ShieldAlert } from 'lucide-react';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

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

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form parameters
  const [category, setCategory] = useState('price_threshold');
  const [selectedCommCode, setSelectedCommCode] = useState('');
  const [selectedCommId, setSelectedCommId] = useState('');
  
  const [thresholdValue, setThresholdValue] = useState('');
  const [priceType, setPriceType] = useState('above'); // above / below
  const [purity, setPurity] = useState('24K');
  const [state, setState] = useState('National');

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const [alertRes, commRes] = await Promise.all([
        api.get('/api/alerts'),
        api.get('/api/commodities')
      ]);

      if (alertRes.data.success) setAlerts(alertRes.data.data);
      if (commRes.data.success && commRes.data.data.length > 0) {
        setCommodities(commRes.data.data);
        setSelectedCommCode(commRes.data.data[0].code);
        setSelectedCommId(commRes.data.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to query active notification triggers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleCommodityChange = (e) => {
    const code = e.target.value;
    setSelectedCommCode(code);
    const comm = commodities.find(c => c.code === code);
    if (comm) setSelectedCommId(comm._id);
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!thresholdValue) return;

    setAdding(true);
    try {
      const postData = {
        category,
        thresholdValue: Number(thresholdValue)
      };

      if (category === 'price_threshold') {
        postData.commodityId = selectedCommId;
        postData.commodityCode = selectedCommCode;
        postData.type = priceType;
        postData.purity = purity;
        postData.state = state;
        postData.weight = 10; // Default benchmark
      } else if (category === 'price_movement' || category === 'inventory_stock' || category === 'portfolio_concentration') {
        postData.commodityId = selectedCommId;
        postData.commodityCode = selectedCommCode;
      }

      const res = await api.post('/api/alerts', postData);
      if (res.data.success) {
        setThresholdValue('');
        loadAlerts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to establish price notification trigger.');
    } finally {
      setAdding(false);
    }
  };

  const handleRequestDelete = (alertItem) => {
    setAlertToDelete(alertItem);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!alertToDelete) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/api/alerts/${alertToDelete._id}`);
      setDeleteModalOpen(false);
      setAlertToDelete(null);
      loadAlerts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove alert');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
          <Bell className="text-accent" size={24} />
          B2B Triggers & Notifications Console
        </h1>
        <p className="text-xs text-gray-500 mt-1">Configure threshold limits for prices, stock levels, concentration warnings, and loss limits.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator form */}
          <div className="p-6 bg-white/5 border border-white/5 rounded-xl text-xs space-y-4 shadow-md self-start">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
              <Plus size={16} className="text-accent" />
              Configure Custom Trigger
            </h3>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] text-gray-400 uppercase font-semibold">Trigger Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white"
                >
                  <option value="price_threshold">Price Spot Threshold</option>
                  <option value="price_movement">Quarterly Price Movement %</option>
                  <option value="inventory_stock">Low Inventory Quantity</option>
                  <option value="portfolio_loss">Portfolio Loss Threshold %</option>
                  <option value="portfolio_concentration">Asset Portfolio Concentration %</option>
                </select>
              </div>

              {/* Show commodity selector if relevant */}
              {category !== 'portfolio_loss' && (
                <div className="space-y-1">
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold">Target Commodity</label>
                  <select
                    value={selectedCommCode}
                    onChange={handleCommodityChange}
                    className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white"
                  >
                    {commodities.map(c => <option key={c._id} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {category === 'price_threshold' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] text-gray-400">Purity</label>
                      <input
                        type="text"
                        value={purity}
                        onChange={(e) => setPurity(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-gray-400">State UT</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold">Price Trigger Type</label>
                    <select
                      value={priceType}
                      onChange={(e) => setPriceType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white"
                    >
                      <option value="above">Price Rises Above (₹)</option>
                      <option value="below">Price Falls Below (₹)</option>
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] text-gray-400 uppercase font-semibold">
                  {category === 'price_threshold' ? 'Threshold Price Value (INR)' :
                   category === 'price_movement' ? 'Target Price Shift (Percentage %)' :
                   category === 'inventory_stock' ? 'Safety Stock Quantity limit' :
                   category === 'portfolio_loss' ? 'Maximum Permitted Loss %' :
                   'Maximum Concentration limit %'}
                </label>
                <input
                  type="number"
                  required
                  placeholder={category === 'price_threshold' ? 'e.g. 75000' : 'e.g. 15'}
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none"
                />
              </div>

              <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center space-x-2 text-[10px] text-gray-400 leading-normal">
                <Info size={14} className="text-accent shrink-0" />
                <span>Triggers evaluate dynamically when prices update or stocks logs change.</span>
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full py-2 bg-accent text-slate-950 font-bold rounded-lg hover:opacity-95 cursor-pointer"
              >
                Establish Trigger
              </button>
            </form>
          </div>

          {/* Alert listings */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-white mb-2">Established Trigger Ledger</h3>

            {alerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 bg-white/5 rounded-xl border border-white/5">
                No active notifications configured. Use left console to add.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {alerts.map((al) => (
                  <div 
                    key={al._id} 
                    className={`p-4 border rounded-xl flex items-center justify-between shadow-md border-l-2 ${
                      al.isTriggered 
                        ? 'border-l-red-500 border-red-500/10 bg-red-950/5' 
                        : 'border-l-accent border-white/5 bg-white/5'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-white capitalize">
                        {al.category?.replace('_', ' ')}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {al.commodityCode ? `Commodity: ${al.commodityCode.toUpperCase()} | ` : ''}
                        Limit limit: {al.thresholdValue}
                      </p>
                      {al.isTriggered && (
                        <p className="text-[10px] text-red-400 font-semibold flex items-center gap-1 mt-1">
                          <AlertTriangle size={10} /> {al.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      <div>
                        {al.isTriggered ? (
                          <span className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-full text-[9px] uppercase">
                            Triggered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-accent/10 border border-accent/20 text-accent font-bold px-2 py-0.5 rounded-full text-[9px] uppercase">
                            Active
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleRequestDelete(al)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                        title="Delete Alert Trigger"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setAlertToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete Alert Trigger"
        message="Are you sure you want to delete this notification trigger?"
        itemName={alertToDelete ? `${alertToDelete.category?.replace('_', ' ').toUpperCase()} | ${alertToDelete.commodityCode ? alertToDelete.commodityCode.toUpperCase() : 'General'} | Threshold: ₹${alertToDelete.thresholdValue?.toLocaleString('en-IN')}` : ''}
      />
    </div>
  );
};

export default Alerts;
