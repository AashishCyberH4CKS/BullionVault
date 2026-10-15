import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Receipt, Plus, Edit2, Trash2, Search, Calendar, Landmark, Tag } from 'lucide-react';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : ''),
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('token');
  if (window.Clerk?.session) {
    try {
      const freshToken = await window.Clerk.session.getToken();
      if (freshToken) {
        token = freshToken;
        localStorage.setItem('token', freshToken);
      }
    } catch (e) {}
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

const Transactions = () => {
  const { user } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'purchases';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [transactions, setTransactions] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [stats, setStats] = useState({ totalPurchases: 0, totalSales: 0, purchaseCount: 0, salesCount: 0, netProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filters state
  const [commodityFilter, setCommodityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [formData, setFormData] = useState({
    type: 'purchase',
    commodityId: '',
    quantity: '',
    unit: 'g',
    price: '',
    counterparty: '', // Supplier or Client
    invoiceNumber: '',
    location: 'Mumbai Office',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch transaction list scoped by filters
      let url = '/api/transactions';
      const params = [];
      if (activeTab === 'purchases') params.push('type=purchase');
      if (activeTab === 'sales') params.push('type=sale');
      if (commodityFilter) params.push(`commodityCode=${commodityFilter}`);
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const [txRes, statsRes, commRes] = await Promise.all([
        api.get(url),
        api.get('/api/transactions/stats'),
        api.get('/api/commodities')
      ]);

      if (txRes.data.success) setTransactions(txRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (commRes.data.success) setCommodities(commRes.data.data);
    } catch (err) {
      console.error('Error loading transaction data:', err);
      setError('Failed to fetch transaction logs. Verify server or auth credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, commodityFilter, startDate, endDate]);

  const handleOpenAddModal = () => {
    setEditingTx(null);
    setFormData({
      type: activeTab === 'sales' ? 'sale' : 'purchase',
      commodityId: commodities[0]?._id || '',
      quantity: '',
      unit: 'g',
      price: '',
      counterparty: '',
      invoiceNumber: 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
      location: 'Mumbai Office',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (tx) => {
    setEditingTx(tx);
    setFormData({
      type: tx.type,
      commodityId: tx.commodityId?._id || tx.commodityId,
      quantity: tx.quantity,
      unit: tx.unit,
      price: tx.price,
      counterparty: tx.counterparty,
      invoiceNumber: tx.invoiceNumber,
      location: tx.location,
      notes: tx.notes || '',
      date: new Date(tx.date).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTx) {
        // Edit transaction (Admin/Accountant)
        await api.put(`/api/transactions/${editingTx._id}`, {
          counterparty: formData.counterparty,
          invoiceNumber: formData.invoiceNumber,
          location: formData.location,
          notes: formData.notes
        });
      } else {
        // Create transaction
        await api.post('/api/transactions', formData);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing request');
    }
  };

  const handleRequestDelete = (tx) => {
    setTxToDelete(tx);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!txToDelete) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/api/transactions/${txToDelete._id}`);
      setDeleteModalOpen(false);
      setTxToDelete(null);
      loadData();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Role permissions:
  // Trader, Accountant, Admin can add transactions
  const canAddTx = user && ['super_admin', 'company_admin', 'trader', 'accountant'].includes(user.role);
  // Accountant, Admin can edit
  const canEditTx = user && ['super_admin', 'company_admin', 'accountant'].includes(user.role);
  const canDeleteTx = true;

  const filteredTransactions = transactions.filter(tx => {
    const query = searchQuery.toLowerCase();
    return (
      (tx.transactionId?.toLowerCase() || '').includes(query) ||
      (tx.counterparty?.toLowerCase() || '').includes(query) ||
      (tx.invoiceNumber?.toLowerCase() || '').includes(query) ||
      (tx.commodityCode?.toLowerCase() || '').includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
            <Receipt className="text-accent" size={24} />
            Business Ledger Journals
          </h1>
          <p className="text-xs text-gray-500 mt-1">Manage purchase orders and sale contracts ledger journals. Not a payment terminal.</p>
        </div>

        {canAddTx && (
          <button
            onClick={handleOpenAddModal}
            className="luxury-button py-2 px-4 text-xs flex items-center space-x-1.5 shrink-0 self-start md:self-auto"
          >
            <Plus size={14} />
            <span>Record {activeTab === 'sales' ? 'Sale' : 'Purchase'}</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-white/5 border border-white/5 rounded-xl shadow-md">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total Purchases Outflow</p>
          <p className="text-xl font-bold text-white mt-1.5">₹{stats.totalPurchases.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-semibold">{stats.purchaseCount} purchase order records</span>
        </div>
        <div className="p-5 bg-white/5 border border-white/5 rounded-xl shadow-md">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total Sales Inflow</p>
          <p className="text-xl font-bold text-white mt-1.5">₹{stats.totalSales.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-gray-400 font-semibold">{stats.salesCount} sale invoice contracts</span>
        </div>
        <div className="p-5 bg-white/5 border border-white/5 rounded-xl shadow-md">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Net Cash Flow P&L</p>
          <p className={`text-xl font-bold mt-1.5 ${stats.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {stats.netProfit >= 0 ? '+' : ''}₹{stats.netProfit.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-gray-400 font-semibold">Sales - Purchases ledger difference</span>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="border-b border-white/5 flex space-x-6">
        {['purchases', 'sales', 'history'].map((tab) => (
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
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search invoice, counterparty..."
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
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-3.5 text-gray-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-white/5 border border-white/5 rounded-lg text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-3.5 text-gray-500" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-white/5 border border-white/5 rounded-lg text-white focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0b0f19] border border-white/5 rounded-xl overflow-hidden shadow-luxury">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-[10px] text-gray-400 uppercase tracking-widest">
                    <th className="p-4 font-bold">TX ID</th>
                    <th className="p-4 font-bold">Date</th>
                    {activeTab === 'history' && <th className="p-4 font-bold">Type</th>}
                    <th className="p-4 font-bold">Commodity</th>
                    <th className="p-4 font-bold text-right">Quantity</th>
                    <th className="p-4 font-bold text-right">Unit Price</th>
                    <th className="p-4 font-bold text-right">Total Value</th>
                    <th className="p-4 font-bold">{activeTab === 'sales' ? 'Client' : 'Supplier'}</th>
                    <th className="p-4 font-bold">Invoice #</th>
                    <th className="p-4 font-bold">Facility Location</th>
                    {(canEditTx || canDeleteTx) && <th className="p-4 font-bold text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-gray-500">
                        No transactions registered under search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono font-semibold text-white">{tx.transactionId}</td>
                        <td className="p-4 text-gray-400">{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                        {activeTab === 'history' && (
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                              tx.type === 'purchase' 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                        )}
                        <td className="p-4 font-semibold text-white capitalize">{tx.commodityCode}</td>
                        <td className="p-4 text-right font-semibold text-white">
                          {tx.quantity} <span className="text-[10px] text-gray-500 uppercase">{tx.unit}</span>
                        </td>
                        <td className="p-4 text-right text-gray-400">
                          ₹{tx.price.toLocaleString('en-IN')}
                        </td>
                        <td className="p-4 text-right font-bold text-accent">
                          ₹{tx.totalValue.toLocaleString('en-IN')}
                        </td>
                        <td className="p-4 text-gray-400">{tx.counterparty}</td>
                        <td className="p-4 font-mono text-gray-400">{tx.invoiceNumber}</td>
                        <td className="p-4 text-gray-400">{tx.location}</td>
                        {(canEditTx || canDeleteTx) && (
                          <td className="p-4">
                            <div className="flex items-center justify-center space-x-2">
                              {canEditTx && (
                                <button
                                  onClick={() => handleOpenEditModal(tx)}
                                  className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit2 size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => handleRequestDelete(tx)}
                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Delete Transaction"
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

      {/* Transaction Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0B0F19] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
              {editingTx ? 'Modify Transaction Details' : `Record ${formData.type === 'sale' ? 'Sale Invoice' : 'Purchase Receipt'}`}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {!editingTx && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Transaction Category</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    >
                      <option value="purchase">Purchase</option>
                      <option value="sale">Sale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Target Commodity</label>
                    <select
                      value={formData.commodityId}
                      onChange={(e) => setFormData({ ...formData, commodityId: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    >
                      {commodities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Quantity</label>
                  <input
                    type="number"
                    disabled={!!editingTx}
                    placeholder="Quantity"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-55"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Unit</label>
                  <select
                    disabled={!!editingTx}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-55"
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
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    disabled={!!editingTx}
                    placeholder="Cost per unit"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-55"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Invoice Number</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-908"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">
                    {formData.type === 'sale' ? 'Client Buyer' : 'Supplier Seller'}
                  </label>
                  <input
                    type="text"
                    placeholder="Counterparty Name"
                    value={formData.counterparty}
                    onChange={(e) => setFormData({ ...formData, counterparty: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Location Branch</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Transaction Ledger Date</label>
                <input
                  type="date"
                  disabled={!!editingTx}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-55"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Internal Notes</label>
                <textarea
                  placeholder="Additional shipment, grade, or billing annotations..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent h-16 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white/5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent text-slate-950 font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {editingTx ? 'Update Entry' : 'Record Transaction'}
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
          setTxToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction record?"
        itemName={txToDelete ? `${txToDelete.transactionId} | ${txToDelete.commodityCode?.toUpperCase()} (${txToDelete.quantity} ${txToDelete.unit}) | ₹${txToDelete.totalValue?.toLocaleString('en-IN')}` : ''}
      />
    </div>
  );
};

export default Transactions;
