import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Layers, Plus, Edit2, Trash2, ShieldAlert, CheckCircle2, AlertTriangle, Filter, Search } from 'lucide-react';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { getFirestoreHoldings } from '../services/firestoreService';

const Inventory = () => {
  const { user, firebaseUid } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'overview';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [inventory, setInventory] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [stats, setStats] = useState({ totalValue: 0, totalItems: 0, lowStockCount: 0, commodityBreakdown: [], locationBreakdown: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filters state
  const [commodityFilter, setCommodityFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Form state for Add/Edit Stock
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    commodityId: '',
    purity: '24K',
    quantity: '',
    unit: 'g',
    location: 'Mumbai Office',
    warehouse: 'Mumbai Vault A',
    batchNumber: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stock items
      let url = '/api/inventory';
      const params = [];
      if (commodityFilter) params.push(`commodityCode=${commodityFilter}`);
      if (locationFilter) params.push(`location=${locationFilter}`);
      if (statusFilter) params.push(`status=${statusFilter}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const [invRes, statsRes, commRes] = await Promise.allSettled([
        api.get(url),
        api.get('/api/inventory/stats'),
        api.get('/api/commodities')
      ]);

      let backendItems = (invRes.status === 'fulfilled' && invRes.value.data.success) ? invRes.value.data.data : [];
      let backendStats = (statsRes.status === 'fulfilled' && statsRes.value.data.success) ? statsRes.value.data.data : null;
      if (commRes.status === 'fulfilled' && commRes.value.data.success) setCommodities(commRes.value.data.data);

      let fsHoldings = [];
      if (firebaseUid) {
        try {
          fsHoldings = await getFirestoreHoldings(firebaseUid);
        } catch (e) {}
      }

      // Merge backend items and Firestore holdings
      const itemMap = new Map();
      backendItems.forEach(i => itemMap.set(i._id || i.batchNumber, i));
      fsHoldings.forEach(h => {
        const key = 'FS-' + (h.id || `${h.commodityCode}_${h.unit}`);
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            _id: key,
            commodityCode: h.commodityCode,
            commodityName: h.commodityName || (h.commodityCode?.toUpperCase()),
            commodityId: { name: h.commodityName || h.commodityCode, code: h.commodityCode },
            purity: h.purity || 'Standard',
            quantity: Number(h.quantity) || 1,
            unit: h.unit || 'g',
            location: h.state || 'Mumbai Vault',
            warehouse: (h.state || 'Mumbai Vault') + ' Vault',
            batchNumber: 'BATCH-FS-' + (h.id || h.commodityCode).slice(-6),
            purchasePrice: Number(h.purchasePrice) || 0,
            currentValue: Number(h.investedValue) || (Number(h.purchasePrice) * Number(h.quantity)),
            currentUnitMarketPrice: Number(h.purchasePrice) || 0,
            status: Number(h.quantity) > 10 ? 'In Stock' : (Number(h.quantity) > 0 ? 'Low Stock' : 'Out of Stock'),
            purchaseDate: h.purchaseDate || new Date().toISOString()
          });
        }
      });

      const mergedList = Array.from(itemMap.values());
      setInventory(mergedList);

      let totalVal = mergedList.reduce((acc, i) => acc + (Number(i.currentValue) || 0), 0);
      let lowCount = mergedList.filter(i => i.status === 'Low Stock').length;
      setStats(backendStats && backendStats.totalValue > 0 ? backendStats : {
        totalValue: totalVal,
        totalItems: mergedList.length,
        lowStockCount: lowCount,
        commodityBreakdown: [],
        locationBreakdown: []
      });
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [commodityFilter, locationFilter, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      commodityId: commodities[0]?._id || '',
      purity: '24K',
      quantity: '',
      unit: 'g',
      location: 'Mumbai Office',
      warehouse: 'Mumbai Vault A',
      batchNumber: 'BATCH-AU-' + Math.floor(100 + Math.random() * 900),
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0]
    });
    setShowFormModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      commodityId: item.commodityId?._id || item.commodityId,
      purity: item.purity,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
      warehouse: item.warehouse,
      batchNumber: item.batchNumber,
      purchasePrice: item.purchasePrice,
      purchaseDate: new Date(item.purchaseDate).toISOString().split('T')[0]
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        // Update item
        await api.put(`/api/inventory/${editingItem._id}`, {
          purity: formData.purity,
          quantity: Number(formData.quantity),
          unit: formData.unit,
          location: formData.location,
          warehouse: formData.warehouse
        });
      } else {
        // Add item
        await api.post('/api/inventory', formData);
      }
      setShowFormModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing request');
    }
  };

  const handleRequestDelete = (item) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/api/inventory/${itemToDelete._id}`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  const isB2BAdmin = true;

  const filteredInventory = inventory.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      (item.batchNumber?.toLowerCase() || '').includes(query) ||
      (item.warehouse?.toLowerCase() || '').includes(query) ||
      (item.commodityCode?.toLowerCase() || '').includes(query) ||
      (item.location?.toLowerCase() || '').includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
            <Layers className="text-accent" size={24} />
            Inventory & Stock Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-1">Monitor bulk commodity inventory, grade purity levels, and warehouse allocations.</p>
        </div>

        {isB2BAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="luxury-button py-2 px-4 text-xs flex items-center space-x-1.5 shrink-0 self-start md:self-auto"
          >
            <Plus size={14} />
            <span>Add Stock Item</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-white/5 border border-white/5 rounded-xl shadow-md">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total Stock Valuation</p>
          <p className="text-xl font-bold text-white mt-1.5">₹{Number(stats?.totalValue || 0).toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-accent font-semibold">Live asset value</span>
        </div>
        <div className="p-5 bg-white/5 border border-white/5 rounded-xl shadow-md">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Stock Item Valuations</p>
          <p className="text-xl font-bold text-white mt-1.5">{inventory.length} Records</p>
          <span className="text-[10px] text-gray-400 font-semibold">{stats.totalItems} absolute items quantity</span>
        </div>
        <div className="p-5 bg-white/5 border border-white/5 rounded-xl shadow-md flex justify-between items-center">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Low Stock Warnings</p>
            <p className="text-xl font-bold text-red-500 mt-1.5">{stats.lowStockCount}</p>
            <span className="text-[10px] text-gray-400 font-semibold">Limit threshold: 10 units</span>
          </div>
          <ShieldAlert size={28} className={stats.lowStockCount > 0 ? "text-red-500 animate-pulse" : "text-gray-600"} />
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="border-b border-white/5 flex space-x-6">
        {['overview', 'warehouses', 'alerts'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab 
                ? 'border-accent text-accent' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.replace('_', ' ')}
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
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Search and filters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search batch, warehouse..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-white/5 border border-white/5 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <select
                    value={commodityFilter}
                    onChange={(e) => setCommodityFilter(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-[#0F1420] border border-white/5 rounded-lg text-gray-300 focus:outline-none focus:border-accent"
                  >
                    <option value="">All Commodities</option>
                    {commodities.map(c => <option key={c._id} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-[#0F1420] border border-white/5 rounded-lg text-gray-300 focus:outline-none focus:border-accent"
                  >
                    <option value="">All Locations</option>
                    <option value="Mumbai Office">Mumbai Office</option>
                    <option value="Delhi Office">Delhi Office</option>
                    <option value="Main Warehouse">Main Warehouse</option>
                  </select>
                </div>
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-[#0F1420] border border-white/5 rounded-lg text-gray-300 focus:outline-none focus:border-accent"
                  >
                    <option value="">All Statuses</option>
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-[#0b0f19] border border-white/5 rounded-xl overflow-hidden shadow-luxury">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-[10px] text-gray-400 uppercase tracking-widest">
                        <th className="p-4 font-bold">Commodity</th>
                        <th className="p-4 font-bold">Purity / Grade</th>
                        <th className="p-4 font-bold">Batch #</th>
                        <th className="p-4 font-bold">Warehouse</th>
                        <th className="p-4 font-bold">Location</th>
                        <th className="p-4 font-bold text-right">Quantity</th>
                        <th className="p-4 font-bold text-right">Valuation</th>
                        <th className="p-4 font-bold">Status</th>
                        {isB2BAdmin && <th className="p-4 font-bold text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredInventory.length === 0 ? (
                        <tr>
                          <td colSpan={isB2BAdmin ? 9 : 8} className="p-8 text-center text-gray-500">
                            No inventory items match search/filters.
                          </td>
                        </tr>
                      ) : (
                        filteredInventory.map((item) => (
                          <tr key={item._id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 font-semibold text-white capitalize">{item.commodityCode}</td>
                            <td className="p-4 text-gray-400">{item.purity}</td>
                            <td className="p-4 font-mono text-gray-400">{item.batchNumber}</td>
                            <td className="p-4 text-gray-400">{item.warehouse}</td>
                            <td className="p-4 text-gray-400">{item.location}</td>
                            <td className="p-4 text-right font-semibold text-white">
                              {item.quantity} <span className="text-[10px] text-gray-500 uppercase">{item.unit}</span>
                            </td>
                            <td className="p-4 text-right font-bold text-accent">
                              ₹{Number(item?.currentValue || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                item.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                item.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {item.status === 'In Stock' && <CheckCircle2 size={10} />}
                                {item.status === 'Low Stock' && <AlertTriangle size={10} />}
                                <span>{item.status}</span>
                              </span>
                            </td>
                            {isB2BAdmin && (
                              <td className="p-4">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => handleOpenEditModal(item)}
                                    className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleRequestDelete(item)}
                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Stock Record"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'warehouses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Commodity allocations */}
              <div className="p-6 bg-white/5 border border-white/5 rounded-xl shadow-md">
                <h3 className="text-sm font-bold text-white mb-4">Stock Value by Commodity</h3>
                <div className="space-y-4">
                  {stats.commodityBreakdown?.map((c) => (
                    <div key={c.code} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-white capitalize">{c.name}</span>
                        <span className="text-gray-400">₹{Number(c?.value || 0).toLocaleString('en-IN')} ({c.quantity || 0} items)</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-accent h-full rounded-full" 
                          style={{ width: `${(stats?.totalValue || 0) > 0 ? (Number(c?.value || 0) / stats.totalValue) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location allocations */}
              <div className="p-6 bg-white/5 border border-white/5 rounded-xl shadow-md">
                <h3 className="text-sm font-bold text-white mb-4">Warehouse Facility Concentration</h3>
                <div className="space-y-4">
                  {stats.locationBreakdown?.map((loc) => (
                    <div key={loc.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-white">{loc.name}</span>
                        <span className="text-gray-400">₹{Number(loc?.value || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full" 
                          style={{ width: `${(stats?.totalValue || 0) > 0 ? (Number(loc?.value || 0) / stats.totalValue) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white mb-2">Active Low Stock Alerts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inventory.filter(item => item.quantity <= 10).map((item) => (
                  <div key={item._id} className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white capitalize">{item.commodityCode} - {item.purity}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Batch: {item.batchNumber} | Location: {item.location} ({item.warehouse})</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-red-400">{item.quantity} {item.unit}</span>
                      <p className="text-[9px] text-gray-500 uppercase mt-0.5 font-semibold">Stock Warning</p>
                    </div>
                  </div>
                ))}
                {inventory.filter(item => item.quantity <= 10).length === 0 && (
                  <div className="col-span-2 p-8 text-center text-xs text-gray-500 bg-white/5 rounded-xl border border-white/5">
                    No active stock warnings. All items satisfy limit criteria.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0B0F19] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
              {editingItem ? 'Edit Stock Record' : 'Log New Stock Inward'}
            </h3>
            
            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {!editingItem && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Commodity</label>
                      <select
                        value={formData.commodityId}
                        onChange={(e) => setFormData({ ...formData, commodityId: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                      >
                        {commodities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Batch Number</label>
                      <input
                        type="text"
                        value={formData.batchNumber}
                        onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent font-mono"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Quantity</label>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                  >
                    <option value="g">Gram (g)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ton">Metric Ton</option>
                    <option value="barrel">Barrel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Purity / Grade</label>
                  <input
                    type="text"
                    placeholder="e.g. 24K, 22K, 999"
                    value={formData.purity}
                    onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Inward Cost Price (per unit)</label>
                  <input
                    type="number"
                    placeholder="Price per g/kg"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Location Office</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Warehouse Vault</label>
                  <input
                    type="text"
                    value={formData.warehouse}
                    onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent text-slate-950 font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {editingItem ? 'Save Updates' : 'Add Stock Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete Inventory Stock"
        message="Are you sure you want to remove this stock record from inventory?"
        itemName={itemToDelete ? `Batch: ${itemToDelete.batchNumber} | ${itemToDelete.commodityCode?.toUpperCase()} (${itemToDelete.purity}, ${itemToDelete.quantity} ${itemToDelete.unit}) | Warehouse: ${itemToDelete.warehouse}` : ''}
      />
    </div>
  );
};

export default Inventory;
