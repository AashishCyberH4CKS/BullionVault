import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Receipt, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Calendar, 
  Landmark, 
  Tag, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck,
  Flame,
  Activity,
  Sparkles,
  Printer,
  FileText
} from 'lucide-react';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { 
  saveFirestoreTransaction, 
  getFirestoreTransactions, 
  deleteFirestoreTransaction, 
  updateFirestoreTransaction, 
  subscribeFirestoreTransactions,
  seedDemoPortfolioData,
  SUPPORTED_COMMODITIES 
} from '../services/firestoreService';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';



// Standard 6 Supported Commodities fallback list
const DEFAULT_COMMODITIES = [
  { _id: 'comm_gold', code: 'gold', name: 'Gold', defaultUnit: 'g' },
  { _id: 'comm_silver', code: 'silver', name: 'Silver', defaultUnit: 'g' },
  { _id: 'comm_platinum', code: 'platinum', name: 'Platinum', defaultUnit: 'g' },
  { _id: 'comm_copper', code: 'copper', name: 'Copper', defaultUnit: 'kg' },
  { _id: 'comm_crudeoil', code: 'crudeoil', name: 'Crude Oil', defaultUnit: 'barrel' },
  { _id: 'comm_naturalgas', code: 'naturalgas', name: 'Natural Gas', defaultUnit: 'mmbtu' },
];

const Transactions = () => {
  const { user, firebaseUid } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'purchases';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [transactions, setTransactions] = useState([]);
  const [commodities, setCommodities] = useState(DEFAULT_COMMODITIES);
  const [stats, setStats] = useState({ totalPurchases: 0, totalSales: 0, purchaseCount: 0, salesCount: 0, netProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Firestore status & live diagnostic state
  const [firestoreStatus, setFirestoreStatus] = useState('connected');
  const [firestoreCount, setFirestoreCount] = useState(0);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResult, setDiagResult] = useState(null);
  const [seeding, setSeeding] = useState(false);

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
    commodityCode: 'gold',
    quantity: '',
    unit: 'g',
    price: '',
    fees: 0,
    counterparty: '',
    invoiceNumber: '',
    location: 'Mumbai Vault',
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

      // 1. Fetch transactions and commodities from backend API
      let url = '/api/transactions';
      const params = [];
      if (activeTab === 'purchases') params.push('type=purchase');
      if (activeTab === 'sales') params.push('type=sale');
      if (commodityFilter) params.push(`commodityCode=${commodityFilter}`);
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const [txRes, statsRes, commRes] = await Promise.allSettled([
        api.get(url),
        api.get('/api/transactions/stats'),
        api.get('/api/commodities')
      ]);

      let backendTxs = [];
      if (txRes.status === 'fulfilled' && txRes.value.data.success) {
        backendTxs = txRes.value.data.data;
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
        setStats(statsRes.value.data.data);
      }
      if (commRes.status === 'fulfilled' && commRes.value.data.success) {
        // Merge with DEFAULT_COMMODITIES to guarantee all 6 exist
        const fetched = commRes.value.data.data;
        const merged = [...fetched];
        for (const def of DEFAULT_COMMODITIES) {
          if (!merged.some(c => c.code.toLowerCase() === def.code.toLowerCase())) {
            merged.push(def);
          }
        }
        setCommodities(merged);
      }

      // 2. Fetch from Cloud Firestore under users/{firebaseUid}/transactions
      let firestoreTxs = [];
      if (firebaseUid) {
        try {
          firestoreTxs = await getFirestoreTransactions(firebaseUid, {
            type: activeTab === 'history' ? undefined : (activeTab === 'sales' ? 'sale' : 'purchase'),
            commodityCode: commodityFilter,
            startDate,
            endDate
          });
          setFirestoreCount(firestoreTxs.length);
          setFirestoreStatus('active');
        } catch (fsErr) {
          console.warn('Firestore loadData notice:', fsErr.message);
          setFirestoreStatus('rules_enforced');
        }
      }

      // 3. Merge Firestore transactions and backend transactions seamlessly
      const mergedMap = new Map();
      firestoreTxs.forEach(tx => {
        const key = tx.transactionId || tx.invoiceNumber || tx._id;
        mergedMap.set(key, { ...tx, source: 'firestore' });
      });
      backendTxs.forEach(tx => {
        const key = tx.transactionId || tx.invoiceNumber || tx._id;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, { ...tx, source: 'mongodb' });
        }
      });

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(mergedList);

      // Recompute dynamic stats if Firestore transactions are present
      if (mergedList.length > 0) {
        let totalP = 0, totalS = 0, pCount = 0, sCount = 0;
        mergedList.forEach(t => {
          if (t.type === 'purchase') {
            totalP += (Number(t.totalValue) || 0);
            pCount++;
          } else {
            totalS += (Number(t.totalValue) || 0);
            sCount++;
          }
        });
        setStats({
          totalPurchases: totalP,
          totalSales: totalS,
          purchaseCount: pCount,
          salesCount: sCount,
          netProfit: totalS - totalP
        });
      }

    } catch (err) {
      console.error('Error loading transaction data:', err);
      setError('Transaction fetch warning: ' + (err.message || 'Check network'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, commodityFilter, startDate, endDate, firebaseUid]);

  // Realtime Firestore subscription for instantaneous UI update
  useEffect(() => {
    if (!firebaseUid) return;
    const unsubscribe = subscribeFirestoreTransactions(firebaseUid, (liveTxs) => {
      setFirestoreCount(liveTxs.length);
      setFirestoreStatus('active');
    }, (err) => {
      console.info('Firestore subscription info:', err.message);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseUid]);

  // Real Firestore Read/Write Diagnostic test
  const handleRunFirestoreTest = async () => {
    if (!firebaseUid) {
      setDiagResult({
        success: false,
        message: 'No authenticated user ID found. Please log in first.'
      });
      return;
    }

    setDiagRunning(true);
    setDiagResult(null);

    const testId = `test_diag_${Date.now()}`;
    const testDocRef = doc(db, 'users', firebaseUid, 'transactions', testId);
    const startTime = performance.now();

    try {
      // Step 1: Real Firestore Write
      const testPayload = {
        transactionId: 'TX-TEST-' + Math.floor(1000 + Math.random() * 9000),
        type: 'purchase',
        commodityCode: 'naturalgas',
        commodityName: 'Natural Gas',
        quantity: 50,
        unit: 'mmbtu',
        price: 275,
        fees: 25,
        totalValue: (50 * 275) + 25,
        date: new Date().toISOString(),
        counterparty: 'Diagnostic System Verification',
        invoiceNumber: 'INV-DIAG-01',
        location: 'Mumbai Vault',
        notes: 'Automated Firestore Read/Write Validation Record'
      };
      await setDoc(testDocRef, testPayload);

      // Step 2: Real Firestore Read
      const snap = await getDoc(testDocRef);
      if (!snap.exists()) {
        throw new Error('Firestore document write succeeded but document was not found upon read verification.');
      }

      // Step 3: Cleanup Test Document
      await deleteDoc(testDocRef);

      const latency = Math.round(performance.now() - startTime);
      setDiagResult({
        success: true,
        message: `Success! Real Cloud Firestore write, read, and delete verified in ${latency}ms for user ${firebaseUid.slice(0, 10)}... (Mumbai Asia-South1).`
      });
      loadData();
    } catch (err) {
      console.error('Firestore Diagnostic Test failed:', err);
      let advice = err.message;
      if (err.message.includes('permission-denied') || err.message.includes('Missing or insufficient permissions')) {
        advice = 'Permission Denied: Your restrictive Firestore Security Rules are active. Apply the rules from firestore.rules or configure Firebase custom token minting.';
      }
      setDiagResult({
        success: false,
        message: `Diagnostic test failed: ${advice}`
      });
    } finally {
      setDiagRunning(false);
    }
  };

  const handleSeedDemoData = async () => {
    if (!firebaseUid) {
      alert('Please wait for user authentication to complete');
      return;
    }
    try {
      setSeeding(true);
      await seedDemoPortfolioData(firebaseUid);
      await loadData();
    } catch (err) {
      console.error('Failed to seed starter portfolio:', err);
      alert('Failed to load starter portfolio: ' + (err.message || 'Unknown error'));
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTx(null);
    const firstComm = commodities[0] || DEFAULT_COMMODITIES[0];
    setFormData({
      type: activeTab === 'sales' ? 'sale' : 'purchase',
      commodityId: firstComm._id || '',
      commodityCode: firstComm.code || 'gold',
      quantity: '',
      unit: firstComm.defaultUnit || 'g',
      price: '',
      fees: 0,
      counterparty: '',
      invoiceNumber: 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
      location: 'Mumbai Vault',
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
      commodityCode: tx.commodityCode || 'gold',
      quantity: tx.quantity,
      unit: tx.unit,
      price: tx.price,
      fees: tx.fees || 0,
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
      const selectedComm = commodities.find(c => c._id === formData.commodityId || c.code === formData.commodityCode) || commodities[0];
      const code = selectedComm.code.toLowerCase();

      const payload = {
        ...formData,
        commodityId: selectedComm._id,
        commodityCode: code,
        commodityName: selectedComm.name,
        fees: Number(formData.fees || 0)
      };

      if (editingTx) {
        // Edit transaction in Firestore if user is logged in
        if (firebaseUid && editingTx.source === 'firestore') {
          await updateFirestoreTransaction(firebaseUid, editingTx._id, payload);
        }
        // Also update in backend
        try {
          await api.put(`/api/transactions/${editingTx._id}`, {
            counterparty: formData.counterparty,
            invoiceNumber: formData.invoiceNumber,
            location: formData.location,
            notes: formData.notes
          });
        } catch (apiErr) {}
      } else {
        // 1. Persist directly to Cloud Firestore
        if (firebaseUid) {
          try {
            await saveFirestoreTransaction(firebaseUid, payload);
          } catch (fsErr) {
            console.warn('Direct Firestore save notice (checking backend fallback):', fsErr.message);
          }
        }

        // 2. Persist to Backend API to maintain MongoDB audit logs and inventory
        try {
          await api.post('/api/transactions', payload);
        } catch (apiErr) {
          console.info('Backend transaction sync response:', apiErr.message);
        }
      }

      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Error processing transaction');
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

      // Delete from Firestore
      if (firebaseUid) {
        try {
          await deleteFirestoreTransaction(firebaseUid, txToDelete._id);
        } catch (fsErr) {
          console.warn('Firestore delete notice:', fsErr.message);
        }
      }

      // Delete from backend API
      try {
        await api.delete(`/api/transactions/${txToDelete._id}`);
      } catch (apiErr) {}

      setDeleteModalOpen(false);
      setTxToDelete(null);
      loadData();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  const canAddTx = true;
  const canEditTx = true;
  const canDeleteTx = true;

  const filteredTransactions = transactions.filter(tx => {
    const q = searchQuery.toLowerCase();
    const invoiceMatch = tx.invoiceNumber?.toLowerCase().includes(q);
    const counterpartyMatch = tx.counterparty?.toLowerCase().includes(q);
    const idMatch = tx.transactionId?.toLowerCase().includes(q);
    const commMatch = tx.commodityCode?.toLowerCase().includes(q);
    return !q || invoiceMatch || counterpartyMatch || idMatch || commMatch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
            <Receipt className="text-accent" size={24} />
            Commodity Investment Transactions
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Persist gold, silver, platinum, copper, crude oil, and natural gas buy/sell records with live Cloud Firestore synchronization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDemoData}
            disabled={seeding}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Populate starter bullion assets with Gold, Silver, Platinum, and Copper trades"
          >
            <Sparkles size={14} className={seeding ? 'animate-spin text-amber-400' : 'text-amber-400'} />
            <span>{seeding ? 'Initializing Vault...' : 'Load Starter Portfolio'}</span>
          </button>
          {canAddTx && (
            <button
              onClick={handleOpenAddModal}
              className="luxury-button py-2 px-4 text-xs flex items-center space-x-1.5 shrink-0 self-start md:self-auto cursor-pointer"
            >
              <Plus size={14} />
              <span>Record Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Cloud Firestore Status & Live Diagnostic Banner */}
      <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <Database size={18} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">Google Cloud Firestore</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle size={10} className="mr-1" />
                  Project: goldcommoditytracker (Mumbai asia-south1)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Flame size={10} className="mr-1" />
                  Plan: Spark Free
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Partitioned Collection: <code className="text-amber-400 font-mono text-[10px]">users/{firebaseUid ? `${firebaseUid.slice(0, 12)}...` : '{userId}'}/transactions</code> • Active Cloud Documents: <span className="text-white font-bold">{firestoreCount}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleRunFirestoreTest}
            disabled={diagRunning}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/40 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={diagRunning ? 'animate-spin text-accent' : 'text-gray-400'} />
            <span>{diagRunning ? 'Testing Firestore...' : 'Verify Real Read/Write'}</span>
          </button>
        </div>

        {diagResult && (
          <div className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 border ${
            diagResult.success 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            {diagResult.success ? <CheckCircle size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
            <span>{diagResult.message}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="luxury-card p-4 rounded-xl">
          <p className="text-[10px] text-gray-400 font-semibold uppercase">Total Purchases</p>
          <p className="text-lg font-bold text-white mt-1">₹{Number(stats.totalPurchases || 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-gray-500 mt-1">{stats.purchaseCount || 0} purchase contracts</p>
        </div>
        <div className="luxury-card p-4 rounded-xl">
          <p className="text-[10px] text-gray-400 font-semibold uppercase">Total Sales</p>
          <p className="text-lg font-bold text-white mt-1">₹{Number(stats.totalSales || 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-gray-500 mt-1">{stats.salesCount || 0} sales settled</p>
        </div>
        <div className="luxury-card p-4 rounded-xl">
          <p className="text-[10px] text-gray-400 font-semibold uppercase">Net Trading Balance</p>
          <p className={`text-lg font-bold mt-1 ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ₹{Number(stats.netProfit || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">Sales - Acquisitions</p>
        </div>
        <div className="luxury-card p-4 rounded-xl">
          <p className="text-[10px] text-gray-400 font-semibold uppercase">Supported Commodities</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {['Gold', 'Silver', 'Platinum', 'Copper', 'Crude Oil', 'Natural Gas'].map((c, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/5 pb-3">
        <div className="flex space-x-1 bg-white/5 p-1 rounded-xl w-full md:w-auto">
          {['purchases', 'sales', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-accent text-slate-950 shadow-md font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'purchases' ? 'Purchases' : tab === 'sales' ? 'Sales' : 'Full History'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-48">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={13} />
            <input
              type="text"
              placeholder="Search invoice or party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-accent"
            />
          </div>

          <select
            value={commodityFilter}
            onChange={(e) => setCommodityFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0F1420] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-accent"
          >
            <option value="">All Commodities</option>
            {commodities.map((c) => (
              <option key={c._id || c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="luxury-card rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[11px] text-gray-400 uppercase tracking-wider">
                  <th className="p-4 font-bold">Transaction ID</th>
                  <th className="p-4 font-bold">Date</th>
                  {activeTab === 'history' && <th className="p-4 font-bold">Type</th>}
                  <th className="p-4 font-bold">Commodity</th>
                  <th className="p-4 font-bold text-right">Quantity</th>
                  <th className="p-4 font-bold text-right">Unit Price</th>
                  <th className="p-4 font-bold text-right">Fees (₹)</th>
                  <th className="p-4 font-bold text-right">Total Net Value</th>
                  <th className="p-4 font-bold">{activeTab === 'sales' ? 'Client' : 'Counterparty'}</th>
                  <th className="p-4 font-bold">Invoice #</th>
                  <th className="p-4 font-bold">Location</th>
                  <th className="p-4 font-bold text-center">Sync Source</th>
                  {(canEditTx || canDeleteTx) && <th className="p-4 font-bold text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-12 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                          <Receipt size={24} />
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">Your Portfolio Vault is Empty</h4>
                        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                          No transactions recorded yet for your personal account. You can record your first trade manually, or click below to load a verified starter portfolio with Gold, Silver, Platinum, and Copper trades.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <button
                            onClick={handleSeedDemoData}
                            disabled={seeding}
                            className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-black flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
                          >
                            <Sparkles size={14} className={seeding ? 'animate-spin' : ''} />
                            <span>{seeding ? 'Initializing Bullion Vault...' : 'Load Starter Portfolio (Gold, Silver, Platinum, Copper)'}</span>
                          </button>
                          <button
                            onClick={handleOpenAddModal}
                            className="px-4 py-2.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center space-x-1.5 transition-all cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Record Trade Manually</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx._id || tx.id} className="hover:bg-white/5 transition-colors">
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
                      <td className="p-4 font-semibold text-white capitalize flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                        {tx.commodityName || tx.commodityCode}
                      </td>
                      <td className="p-4 text-right font-semibold text-white">
                        {tx.quantity} <span className="text-[10px] text-gray-500 uppercase">{tx.unit}</span>
                      </td>
                      <td className="p-4 text-right text-gray-400">
                        ₹{Number(tx.price || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-right text-gray-400">
                        ₹{Number(tx.fees || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-right font-bold text-accent">
                        ₹{Number(tx.totalValue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-gray-400">{tx.counterparty}</td>
                      <td className="p-4 font-mono text-gray-400">{tx.invoiceNumber}</td>
                      <td className="p-4 text-gray-400">{tx.location}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <Database size={9} className="mr-1" />
                          Firestore
                        </span>
                      </td>
                      {(canEditTx || canDeleteTx) && (
                        <td className="p-4">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => navigate(`/reports?type=single_transaction&txId=${tx.transactionId || tx.id}&company=${encodeURIComponent(tx.counterparty || '')}`)}
                              className="p-1.5 text-accent hover:text-white hover:bg-accent/20 rounded-lg transition-colors cursor-pointer"
                              title="Generate Official Audit Certificate"
                            >
                              <Printer size={13} />
                            </button>
                            {canEditTx && (
                              <button
                                onClick={() => handleOpenEditModal(tx)}
                                className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}
                            {canDeleteTx && (
                              <button
                                onClick={() => handleRequestDelete(tx)}
                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Delete Transaction"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
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
      )}

      {/* Transaction Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0B0F19] border border-white/10 p-6 rounded-2xl w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="text-accent" size={16} />
                {editingTx ? 'Modify Transaction Record' : `Record ${formData.type === 'sale' ? 'Sale Transaction' : 'Purchase Transaction'}`}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Cloud Firestore Synced
              </span>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              {!editingTx && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Transaction Category</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    >
                      <option value="purchase">Purchase (Acquisition)</option>
                      <option value="sale">Sale (Liquidation)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Target Commodity</label>
                    <select
                      value={formData.commodityCode}
                      onChange={(e) => {
                        const selected = commodities.find(c => c.code === e.target.value) || DEFAULT_COMMODITIES.find(c => c.code === e.target.value);
                        setFormData({
                          ...formData,
                          commodityCode: e.target.value,
                          commodityId: selected?._id || '',
                          unit: selected?.defaultUnit || 'g'
                        });
                      }}
                      className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    >
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                      <option value="platinum">Platinum</option>
                      <option value="copper">Copper</option>
                      <option value="crudeoil">Crude Oil</option>
                      <option value="naturalgas">Natural Gas</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    disabled={!!editingTx}
                    placeholder="e.g. 100"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-55"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Unit of Measure</label>
                  <select
                    disabled={!!editingTx}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-55"
                  >
                    <option value="g">Gram (g)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="oz">Troy Ounce (oz)</option>
                    <option value="barrel">Barrel (bbl)</option>
                    <option value="mmbtu">MMBtu (Natural Gas)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Unit Transaction Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    disabled={!!editingTx}
                    placeholder="Rate per unit"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-55"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Applicable Fees / Brokerage (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Taxes, assaying, brokerage"
                    value={formData.fees}
                    onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Invoice / Reference #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-908"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">
                    {formData.type === 'sale' ? 'Client / Buyer' : 'Supplier / Exchange'}
                  </label>
                  <input
                    type="text"
                    placeholder="Party Name"
                    value={formData.counterparty}
                    onChange={(e) => setFormData({ ...formData, counterparty: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Facility / Vault Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Transaction Date</label>
                  <input
                    type="date"
                    disabled={!!editingTx}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-55"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Internal Notes</label>
                <textarea
                  placeholder="Additional shipment, purity grade, assay details..."
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
                  {editingTx ? 'Update Entry' : 'Save to Firestore'}
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
        title="Delete Investment Transaction"
        message={`Are you sure you want to permanently delete transaction "${txToDelete?.transactionId || txToDelete?.invoiceNumber}" from Cloud Firestore?`}
        loading={deleteLoading}
      />
    </div>
  );
};

export default Transactions;
