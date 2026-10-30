import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Supported Commodities Map
export const SUPPORTED_COMMODITIES = {
  gold: { name: 'Gold', defaultUnit: 'g', defaultPurity: '24K' },
  silver: { name: 'Silver', defaultUnit: 'g', defaultPurity: '999 (Fine Silver)' },
  platinum: { name: 'Platinum', defaultUnit: 'g', defaultPurity: '999 (Fine Platinum)' },
  copper: { name: 'Copper', defaultUnit: 'kg', defaultPurity: 'Grade A Cathode' },
  crudeoil: { name: 'Crude Oil', defaultUnit: 'barrel', defaultPurity: 'Brent Blend' },
  naturalgas: { name: 'Natural Gas', defaultUnit: 'mmbtu', defaultPurity: 'Pipeline Quality' }
};

// -------------------------------------------------------------
// LOCAL STORAGE RESILIENT PERSISTENCE HELPERS
// (Guarantees data preservation even if Firestore rules block write)
// -------------------------------------------------------------
const getLocalTransactions = (userId) => {
  try {
    const raw = localStorage.getItem(`bv_txs_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalTransaction = (userId, tx) => {
  try {
    const list = getLocalTransactions(userId);
    const existingIdx = list.findIndex(t => t.id === tx.id || t.transactionId === tx.transactionId);
    if (existingIdx >= 0) {
      list[existingIdx] = tx;
    } else {
      list.unshift(tx);
    }
    localStorage.setItem(`bv_txs_${userId}`, JSON.stringify(list));
  } catch (e) {}
};

const removeLocalTransaction = (userId, txId) => {
  try {
    const list = getLocalTransactions(userId);
    const filtered = list.filter(t => t.id !== txId && t._id !== txId);
    localStorage.setItem(`bv_txs_${userId}`, JSON.stringify(filtered));
  } catch (e) {}
};

const getLocalHoldings = (userId) => {
  try {
    const raw = localStorage.getItem(`bv_hds_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalHolding = (userId, holding) => {
  try {
    const list = getLocalHoldings(userId);
    const key = holding.id || `${holding.commodityCode}_${holding.unit}`;
    const idx = list.findIndex(h => (h.id || `${h.commodityCode}_${h.unit}`) === key);
    if (idx >= 0) {
      list[idx] = holding;
    } else {
      list.push(holding);
    }
    localStorage.setItem(`bv_hds_${userId}`, JSON.stringify(list));
  } catch (e) {}
};

const removeLocalHolding = (userId, holdingId) => {
  try {
    const list = getLocalHoldings(userId);
    const filtered = list.filter(h => h.id !== holdingId && h._id !== holdingId);
    localStorage.setItem(`bv_hds_${userId}`, JSON.stringify(filtered));
  } catch (e) {}
};

/**
 * Standardize Firestore transaction document structure
 */
const formatTxDoc = (docSnap) => {
  const data = docSnap.data();
  return {
    _id: docSnap.id,
    id: docSnap.id,
    ...data,
    date: data.date?.toDate ? data.date.toDate().toISOString() : (data.date || new Date().toISOString()),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
  };
};

/**
 * Save a new commodity investment transaction in Firestore and Local Storage.
 */
export const saveFirestoreTransaction = async (userId, txData) => {
  if (!userId) throw new Error('User ID is required to save Firestore transaction');

  const now = new Date();
  const txDate = txData.date ? new Date(txData.date) : now;

  const quantity = Number(txData.quantity) || 0;
  const price = Number(txData.price) || 0;
  const fees = Number(txData.fees || 0);
  const subtotal = quantity * price;
  const totalValue = txData.type === 'purchase' ? (subtotal + fees) : (subtotal - fees);

  const cleanCommodityCode = (txData.commodityCode || 'gold').toLowerCase().replace(/\s+/g, '');
  const commodityMeta = SUPPORTED_COMMODITIES[cleanCommodityCode] || { name: txData.commodityName || 'Commodity' };
  const txId = txData.transactionId || ('TX-' + Math.floor(100000 + Math.random() * 900000));

  const payload = {
    userId,
    transactionId: txId,
    type: txData.type || 'purchase', // 'purchase' | 'sale'
    commodityCode: cleanCommodityCode,
    commodityName: commodityMeta.name,
    commodityId: txData.commodityId || '',
    quantity,
    unit: txData.unit || commodityMeta.defaultUnit || 'g',
    price,
    fees,
    totalValue: Number(totalValue.toFixed(2)),
    counterparty: txData.counterparty || 'BullionVault Exchange',
    invoiceNumber: txData.invoiceNumber || ('INV-' + now.getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000)),
    location: txData.location || 'Mumbai Vault',
    notes: txData.notes || '',
    purity: txData.purity || commodityMeta.defaultPurity || 'Standard',
    date: txDate.toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  let docId = txData._id || txData.id || `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // 1. Try persisting to Firestore
  try {
    const userTxCol = collection(db, 'users', userId, 'transactions');
    const docRef = await addDoc(userTxCol, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    docId = docRef.id;
    payload._firestoreSaved = true;
  } catch (fsErr) {
    payload._firestoreSaved = false;
    payload._firestoreError = fsErr.message;
    console.warn('Firestore direct write notice (saving to local backup):', fsErr.message);
  }

  const finalRecord = { _id: docId, id: docId, ...payload };

  // 2. Persist to Local Storage backup
  saveLocalTransaction(userId, finalRecord);

  // 3. Synchronize active holdings in users/{userId}/holdings
  await syncHoldingFromTransaction(userId, finalRecord);

  return finalRecord;
};

/**
 * Update an existing transaction in Firestore & Local Storage
 */
export const updateFirestoreTransaction = async (userId, txId, updateData) => {
  if (!userId || !txId) throw new Error('User ID and Transaction ID are required');

  const updates = {
    ...updateData,
    updatedAt: new Date().toISOString()
  };

  try {
    const txRef = doc(db, 'users', userId, 'transactions', txId);
    await updateDoc(txRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (e) {}

  saveLocalTransaction(userId, { id: txId, _id: txId, ...updates });
  return { id: txId, ...updates };
};

/**
 * Delete a transaction from Firestore & Local Storage
 */
export const deleteFirestoreTransaction = async (userId, txId) => {
  if (!userId || !txId) throw new Error('User ID and Transaction ID are required');

  try {
    const txRef = doc(db, 'users', userId, 'transactions', txId);
    await deleteDoc(txRef);
  } catch (e) {}

  removeLocalTransaction(userId, txId);
  return true;
};

/**
 * Retrieve user's transactions from Firestore + Local Storage backup
 */
export const getFirestoreTransactions = async (userId, filters = {}) => {
  if (!userId) return [];

  let firestoreList = [];
  try {
    const userTxCol = collection(db, 'users', userId, 'transactions');
    const snapshot = await getDocs(userTxCol);
    firestoreList = snapshot.docs.map(formatTxDoc);
  } catch (error) {
    console.warn('Firestore getTransactions notice:', error.message);
  }

  // Retrieve local storage backup
  const localList = getLocalTransactions(userId);

  // Merge & deduplicate
  const txMap = new Map();
  firestoreList.forEach(t => txMap.set(t.transactionId || t.id, t));
  localList.forEach(t => {
    const key = t.transactionId || t.id;
    if (!txMap.has(key)) txMap.set(key, t);
  });

  let results = Array.from(txMap.values());
  results.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filters
  if (filters.type) {
    results = results.filter(tx => tx.type === filters.type);
  }
  if (filters.commodityCode) {
    results = results.filter(tx => tx.commodityCode === filters.commodityCode.toLowerCase());
  }
  if (filters.startDate) {
    results = results.filter(tx => new Date(tx.date) >= new Date(filters.startDate));
  }
  if (filters.endDate) {
    results = results.filter(tx => new Date(tx.date) <= new Date(filters.endDate));
  }

  return results;
};

/**
 * Maintain and update active portfolio holding based on purchase or sale
 */
async function syncHoldingFromTransaction(userId, tx) {
  const holdingKey = `${tx.commodityCode}_${tx.unit}`;
  const localList = getLocalHoldings(userId);
  const existingLocal = localList.find(h => (h.id || `${h.commodityCode}_${h.unit}`) === holdingKey);

  let updatedHolding = null;

  if (tx.type === 'purchase') {
    if (existingLocal) {
      const newQty = (existingLocal.quantity || 0) + tx.quantity;
      const newInvested = (existingLocal.investedValue || 0) + tx.totalValue;
      const avgPrice = newQty > 0 ? (newInvested / newQty) : tx.price;
      updatedHolding = {
        ...existingLocal,
        quantity: newQty,
        investedValue: Number(newInvested.toFixed(2)),
        purchasePrice: Number(avgPrice.toFixed(2)),
        lastUpdated: new Date().toISOString()
      };
    } else {
      updatedHolding = {
        id: holdingKey,
        _id: holdingKey,
        userId,
        commodityCode: tx.commodityCode,
        commodityName: tx.commodityName,
        purity: tx.purity,
        unit: tx.unit,
        quantity: tx.quantity,
        purchasePrice: tx.price,
        investedValue: tx.totalValue,
        state: tx.location || 'National',
        purchaseDate: tx.date,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }
    saveLocalHolding(userId, updatedHolding);
  } else if (tx.type === 'sale') {
    if (existingLocal) {
      const newQty = Math.max(0, (existingLocal.quantity || 0) - tx.quantity);
      if (newQty === 0) {
        removeLocalHolding(userId, holdingKey);
      } else {
        const ratio = newQty / (existingLocal.quantity || 1);
        const newInvested = (existingLocal.investedValue || 0) * ratio;
        updatedHolding = {
          ...existingLocal,
          quantity: newQty,
          investedValue: Number(newInvested.toFixed(2)),
          lastUpdated: new Date().toISOString()
        };
        saveLocalHolding(userId, updatedHolding);
      }
    }
  }

  // Also sync to Cloud Firestore
  try {
    const holdingsCol = collection(db, 'users', userId, 'holdings');
    const holdingDocRef = doc(holdingsCol, holdingKey);

    if (tx.type === 'purchase') {
      const holdingSnap = await getDoc(holdingDocRef);
      if (holdingSnap.exists()) {
        const existing = holdingSnap.data();
        const newQty = (existing.quantity || 0) + tx.quantity;
        const newInvested = (existing.investedValue || 0) + tx.totalValue;
        const avgPrice = newQty > 0 ? (newInvested / newQty) : tx.price;

        await updateDoc(holdingDocRef, {
          quantity: newQty,
          investedValue: Number(newInvested.toFixed(2)),
          purchasePrice: Number(avgPrice.toFixed(2)),
          lastUpdated: serverTimestamp()
        });
      } else {
        await setDoc(holdingDocRef, {
          userId,
          commodityCode: tx.commodityCode,
          commodityName: tx.commodityName,
          purity: tx.purity,
          unit: tx.unit,
          quantity: tx.quantity,
          purchasePrice: tx.price,
          investedValue: tx.totalValue,
          state: tx.location || 'National',
          purchaseDate: tx.date,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
      }
    } else if (tx.type === 'sale') {
      const holdingSnap = await getDoc(holdingDocRef);
      if (holdingSnap.exists()) {
        const existing = holdingSnap.data();
        const newQty = Math.max(0, (existing.quantity || 0) - tx.quantity);
        if (newQty === 0) {
          await deleteDoc(holdingDocRef);
        } else {
          const ratio = newQty / (existing.quantity || 1);
          const newInvested = (existing.investedValue || 0) * ratio;
          await updateDoc(holdingDocRef, {
            quantity: newQty,
            investedValue: Number(newInvested.toFixed(2)),
            lastUpdated: serverTimestamp()
          });
        }
      }
    }
  } catch (err) {
    console.warn('syncHoldingFromTransaction Cloud Firestore notice:', err.message);
  }
}

/**
 * Get all active portfolio holdings for a user from Firestore & Local Storage
 */
export const getFirestoreHoldings = async (userId) => {
  if (!userId) return [];
  let firestoreList = [];
  try {
    const holdingsCol = collection(db, 'users', userId, 'holdings');
    const snap = await getDocs(holdingsCol);
    firestoreList = snap.docs.map(d => ({
      _id: d.id,
      id: d.id,
      ...d.data()
    }));
  } catch (error) {
    console.warn('Failed to get Firestore holdings, using local cache:', error.message);
  }

  const localList = getLocalHoldings(userId);

  // Merge
  const hMap = new Map();
  firestoreList.forEach(h => hMap.set(h.id || `${h.commodityCode}_${h.unit}`, h));
  localList.forEach(h => {
    const key = h.id || `${h.commodityCode}_${h.unit}`;
    if (!hMap.has(key)) hMap.set(key, h);
  });

  return Array.from(hMap.values());
};

/**
 * Save manual portfolio holding directly
 */
export const saveFirestoreHolding = async (userId, holdingData) => {
  if (!userId) throw new Error('User ID is required');
  const cleanCode = (holdingData.commodityCode || 'gold').toLowerCase().replace(/\s+/g, '');
  const docId = holdingData.id || `${cleanCode}_${holdingData.unit || 'g'}_${Date.now()}`;

  const payload = {
    userId,
    commodityCode: cleanCode,
    commodityName: SUPPORTED_COMMODITIES[cleanCode]?.name || holdingData.commodityName || 'Commodity',
    purity: holdingData.purity || 'Standard',
    unit: holdingData.unit || 'g',
    quantity: Number(holdingData.quantity) || 1,
    weight: Number(holdingData.weight) || 1,
    state: holdingData.state || 'National',
    purchasePrice: Number(holdingData.purchasePrice) || 0,
    investedValue: Number(holdingData.purchasePrice || 0) * Number(holdingData.quantity || 1),
    purchaseDate: holdingData.purchaseDate || new Date().toISOString(),
    purchaseQuarter: holdingData.purchaseQuarter || 'Live',
    purchaseYear: Number(holdingData.purchaseYear) || new Date().getFullYear(),
    lastUpdated: new Date().toISOString()
  };

  saveLocalHolding(userId, { _id: docId, id: docId, ...payload });

  try {
    const holdingsCol = collection(db, 'users', userId, 'holdings');
    const docRef = doc(holdingsCol, docId);
    await setDoc(docRef, { ...payload, lastUpdated: serverTimestamp() }, { merge: true });
  } catch (e) {}

  return { _id: docId, ...payload };
};

/**
 * Delete a holding directly
 */
export const deleteFirestoreHolding = async (userId, holdingId) => {
  if (!userId || !holdingId) throw new Error('User ID and Holding ID required');
  try {
    const docRef = doc(db, 'users', userId, 'holdings', holdingId);
    await deleteDoc(docRef);
  } catch (e) {}
  removeLocalHolding(userId, holdingId);
  return true;
};

/**
 * Compute portfolio statistics (values, ROI, allocations across commodities)
 */
export const calculateFirestorePortfolioStats = (holdings = [], priceLookup = {}) => {
  if (!holdings || holdings.length === 0) {
    return {
      totalValue: 0,
      totalInvested: 0,
      totalProfit: 0,
      roi: 0,
      allocations: [],
      performance: { best: null, worst: null, highestValue: null, latest: null },
      timeline: []
    };
  }

  let totalValue = 0;
  let totalInvested = 0;
  const groups = {};

  const evaluated = holdings.map(inv => {
    const code = (inv.commodityCode || 'gold').toLowerCase();
    const curPrice = priceLookup[code] !== undefined ? priceLookup[code] : (inv.currentPrice || inv.purchasePrice);
    const currentValue = curPrice * inv.quantity;
    const invested = (inv.purchasePrice || 0) * inv.quantity;
    const profit = currentValue - invested;

    totalValue += currentValue;
    totalInvested += invested;

    if (!groups[code]) {
      groups[code] = {
        code,
        name: SUPPORTED_COMMODITIES[code]?.name || code.toUpperCase(),
        invested: 0,
        currentValue: 0,
        profit: 0
      };
    }
    groups[code].invested += invested;
    groups[code].currentValue += currentValue;
    groups[code].profit += profit;

    return {
      ...inv,
      currentPrice: curPrice,
      currentValue,
      investedValue: invested,
      profit,
      growthPercent: invested > 0 ? ((profit / invested) * 100) : 0
    };
  });

  const totalProfit = totalValue - totalInvested;
  const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const allocations = Object.values(groups).map(g => ({
    commodity: g.name,
    code: g.code,
    value: Number(g.currentValue.toFixed(2)),
    percentage: totalValue > 0 ? Number(((g.currentValue / totalValue) * 100).toFixed(1)) : 0,
    roi: g.invested > 0 ? Number(((g.profit / g.invested) * 100).toFixed(1)) : 0
  }));

  const sortedByRoi = [...allocations].sort((a, b) => b.roi - a.roi);
  const best = sortedByRoi.length > 0 ? sortedByRoi[0] : null;
  const worst = sortedByRoi.length > 1 ? sortedByRoi[sortedByRoi.length - 1] : null;

  return {
    totalValue: Number(totalValue.toFixed(2)),
    totalInvested: Number(totalInvested.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    roi: Number(roi.toFixed(2)),
    allocations,
    performance: { best, worst },
    evaluatedHoldings: evaluated
  };
};

/**
 * Real-time listener for user's transactions in Firestore
 */
export const subscribeFirestoreTransactions = (userId, onData, onError) => {
  if (!userId) return () => {};
  const userTxCol = collection(db, 'users', userId, 'transactions');
  const q = query(userTxCol, orderBy('date', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const txs = snapshot.docs.map(formatTxDoc);
    onData(txs);
  }, (err) => {
    console.warn('Realtime subscription notice (using local cache):', err.message);
    const local = getLocalTransactions(userId);
    onData(local);
  });
};

/**
 * Seed high-value starter demo portfolio transactions for a new user account
 */
export const seedDemoPortfolioData = async (userId) => {
  if (!userId) return [];
  
  const starterTrades = [
    {
      transactionId: 'TX-892104',
      type: 'purchase',
      commodityCode: 'gold',
      commodityName: 'Gold 24K',
      quantity: 120,
      unit: 'g',
      price: 12250,
      fees: 250,
      totalValue: 1470250,
      counterparty: 'MMTC-PAMP India Ltd.',
      invoiceNumber: 'INV-2026-8901',
      location: 'Mumbai Vault',
      purity: '24K',
      notes: 'Initial bullion reserve acquisition',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      transactionId: 'TX-764319',
      type: 'purchase',
      commodityCode: 'silver',
      commodityName: 'Silver 999',
      quantity: 5,
      unit: 'kg',
      price: 165000,
      fees: 150,
      totalValue: 825150,
      counterparty: 'Hindustan Zinc Bullion',
      invoiceNumber: 'INV-2026-7642',
      location: 'Delhi Vault',
      purity: '999 (Fine Silver)',
      notes: 'Industrial silver reserve allocation',
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      transactionId: 'TX-653208',
      type: 'purchase',
      commodityCode: 'platinum',
      commodityName: 'Platinum 999',
      quantity: 20,
      unit: 'g',
      price: 4700,
      fees: 100,
      totalValue: 94100,
      counterparty: 'Valcambi Suisse Bullion',
      invoiceNumber: 'INV-2026-6530',
      location: 'Bangalore Vault',
      purity: '999 (Fine Platinum)',
      notes: 'Precious metal diversification',
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      transactionId: 'TX-542197',
      type: 'purchase',
      commodityCode: 'copper',
      commodityName: 'Copper Cathode',
      quantity: 50,
      unit: 'kg',
      price: 1360,
      fees: 80,
      totalValue: 68080,
      counterparty: 'Hindalco Industries',
      invoiceNumber: 'INV-2026-5418',
      location: 'Mumbai Vault',
      purity: 'Grade A Cathode',
      notes: 'Industrial manufacturing supply',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      transactionId: 'TX-431086',
      type: 'sale',
      commodityCode: 'gold',
      commodityName: 'Gold 24K',
      quantity: 20,
      unit: 'g',
      price: 12290,
      fees: 150,
      totalValue: 245650,
      counterparty: 'Tanishq Bullion Division',
      invoiceNumber: 'INV-2026-4309',
      location: 'Mumbai Vault',
      purity: '24K',
      notes: 'Profit liquidation on gold spot high',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const trade of starterTrades) {
    await saveFirestoreTransaction(userId, trade);
  }

  return starterTrades;
};
