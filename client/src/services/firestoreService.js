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

/**
 * Standardize Firestore transaction document structure
 */
const formatTxDoc = (docSnap) => {
  const data = docSnap.data();
  return {
    _id: docSnap.id,
    id: docSnap.id,
    ...data,
    // Convert Firestore Timestamp to ISO string if needed
    date: data.date?.toDate ? data.date.toDate().toISOString() : (data.date || new Date().toISOString()),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
  };
};

/**
 * Save a new commodity investment transaction in Firestore.
 * Stored under: users/{userId}/transactions/{txId}
 */
export const saveFirestoreTransaction = async (userId, txData) => {
  if (!userId) throw new Error('User ID is required to save Firestore transaction');

  const userTxCol = collection(db, 'users', userId, 'transactions');
  const now = new Date();
  const txDate = txData.date ? new Date(txData.date) : now;

  const quantity = Number(txData.quantity) || 0;
  const price = Number(txData.price) || 0;
  const fees = Number(txData.fees || 0);
  const subtotal = quantity * price;
  const totalValue = txData.type === 'purchase' ? (subtotal + fees) : (subtotal - fees);

  const cleanCommodityCode = (txData.commodityCode || 'gold').toLowerCase().replace(/\s+/g, '');
  const commodityMeta = SUPPORTED_COMMODITIES[cleanCommodityCode] || { name: txData.commodityName || 'Commodity' };

  const payload = {
    userId,
    transactionId: txData.transactionId || ('TX-' + Math.floor(100000 + Math.random() * 900000)),
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(userTxCol, payload);

  // Synchronize active holdings in users/{userId}/holdings
  await syncHoldingFromTransaction(userId, payload);

  return { _id: docRef.id, id: docRef.id, ...payload };
};

/**
 * Update an existing transaction in Firestore
 */
export const updateFirestoreTransaction = async (userId, txId, updateData) => {
  if (!userId || !txId) throw new Error('User ID and Transaction ID are required');

  const txRef = doc(db, 'users', userId, 'transactions', txId);
  const updates = {
    ...updateData,
    updatedAt: serverTimestamp()
  };

  await updateDoc(txRef, updates);
  return { id: txId, ...updates };
};

/**
 * Delete a transaction from Firestore
 */
export const deleteFirestoreTransaction = async (userId, txId) => {
  if (!userId || !txId) throw new Error('User ID and Transaction ID are required');

  const txRef = doc(db, 'users', userId, 'transactions', txId);
  await deleteDoc(txRef);
  return true;
};

/**
 * Retrieve user's transactions from Firestore with optional filtering
 */
export const getFirestoreTransactions = async (userId, filters = {}) => {
  if (!userId) return [];

  try {
    const userTxCol = collection(db, 'users', userId, 'transactions');
    let q = query(userTxCol, orderBy('date', 'desc'));

    if (filters.type) {
      q = query(userTxCol, where('type', '==', filters.type), orderBy('date', 'desc'));
    }

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(formatTxDoc);

    // In-memory filters for commodity, dates, search
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
  } catch (error) {
    console.warn('Firestore getTransactions warning (verifying index/rules):', error.message);
    // Fallback query without composite index if order failed
    try {
      const userTxCol = collection(db, 'users', userId, 'transactions');
      const snapshot = await getDocs(userTxCol);
      let results = snapshot.docs.map(formatTxDoc);
      results.sort((a, b) => new Date(b.date) - new Date(a.date));
      return results;
    } catch (fallbackErr) {
      console.error('Failed to query Firestore transactions:', fallbackErr);
      return [];
    }
  }
};

/**
 * Maintain and update active portfolio holding based on purchase or sale
 */
async function syncHoldingFromTransaction(userId, tx) {
  try {
    const holdingsCol = collection(db, 'users', userId, 'holdings');
    const holdingDocRef = doc(holdingsCol, `${tx.commodityCode}_${tx.unit}`);
    const holdingSnap = await getDoc(holdingDocRef);

    if (tx.type === 'purchase') {
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
    console.warn('syncHoldingFromTransaction notice:', err.message);
  }
}

/**
 * Get all active portfolio holdings for a user from Firestore
 */
export const getFirestoreHoldings = async (userId) => {
  if (!userId) return [];
  try {
    const holdingsCol = collection(db, 'users', userId, 'holdings');
    const snap = await getDocs(holdingsCol);
    return snap.docs.map(d => ({
      _id: d.id,
      id: d.id,
      ...d.data()
    }));
  } catch (error) {
    console.error('Failed to get Firestore holdings:', error);
    return [];
  }
};

/**
 * Save manual portfolio holding directly
 */
export const saveFirestoreHolding = async (userId, holdingData) => {
  if (!userId) throw new Error('User ID is required');
  const holdingsCol = collection(db, 'users', userId, 'holdings');
  const cleanCode = (holdingData.commodityCode || 'gold').toLowerCase().replace(/\s+/g, '');
  const docId = holdingData.id || `${cleanCode}_${holdingData.unit || 'g'}_${Date.now()}`;
  const docRef = doc(holdingsCol, docId);

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
    purchaseQuarter: holdingData.purchaseQuarter || 'Q2 2026',
    purchaseYear: Number(holdingData.purchaseYear) || new Date().getFullYear(),
    lastUpdated: serverTimestamp()
  };

  await setDoc(docRef, payload, { merge: true });
  return { _id: docId, ...payload };
};

/**
 * Delete a holding directly
 */
export const deleteFirestoreHolding = async (userId, holdingId) => {
  if (!userId || !holdingId) throw new Error('User ID and Holding ID required');
  const docRef = doc(db, 'users', userId, 'holdings', holdingId);
  await deleteDoc(docRef);
  return true;
};

/**
 * Compute portfolio statistics (values, ROI, allocations across 6 commodities)
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
    console.warn('Realtime subscription fallback (verifying index):', err.message);
    // Unordered fallback subscription
    return onSnapshot(userTxCol, (fallbackSnap) => {
      const txs = fallbackSnap.docs.map(formatTxDoc);
      txs.sort((a, b) => new Date(b.date) - new Date(a.date));
      onData(txs);
    }, onError);
  });
};
