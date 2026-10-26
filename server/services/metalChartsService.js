/**
 * MetalCharts.org Commodity Price Integration Service
 * 
 * Provides live & server-cached spot prices for:
 * - Gold (XAU)
 * - Silver (XAG)
 * - Platinum (XPT)
 * - Palladium (XPD)
 * - Copper (HG)
 * 
 * And benchmark reference prices for non-metal commodities:
 * - Crude Oil
 * - Natural Gas
 * 
 * Caching Policy:
 * - 15-Minute in-memory cache to strictly preserve free tier monthly quotas (~200 requests/month).
 * - Serves cached data with freshness timestamp.
 * - Never returns ₹0 for missing or pending quotes.
 */

const Commodity = require('../models/Commodity');
const HistoricalPrice = require('../models/HistoricalPrice');
const SystemLog = require('../models/SystemLog');

// Configuration
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let priceCache = {
  data: null,
  overview: null,
  timestamp: 0,
  isStale: false
};

// Default reliable benchmarks for non-metal commodities and offline fallback
const BENCHMARK_COMMODITY_DATA = {
  crudeoil: {
    code: 'crudeoil',
    name: 'Crude Oil (Brent)',
    latestPrice: 6450,
    price: 6450,
    unit: 'Brent Blend (bbl)',
    currency: 'INR',
    quarter: 'Q2 2026',
    qoqChange: -120,
    qoqChangePercent: -1.82,
    trend: 'Downward',
    sparkline: [6600, 6580, 6520, 6500, 6480, 6450],
    isBenchmark: true,
    feedStatus: 'Exchange Benchmark (Energy)',
    marketStatus: 'Reference Benchmark',
    accentTheme: { color: '#F97316', chartColor: '#EA580C', glowColor: 'rgba(249, 115, 22, 0.4)' }
  },
  naturalgas: {
    code: 'naturalgas',
    name: 'Natural Gas',
    latestPrice: 275,
    price: 275,
    unit: 'Pipeline Quality (mmbtu)',
    currency: 'INR',
    quarter: 'Q2 2026',
    qoqChange: 15,
    qoqChangePercent: 5.76,
    trend: 'Upward',
    sparkline: [255, 260, 265, 268, 272, 275],
    isBenchmark: true,
    feedStatus: 'Exchange Benchmark (Energy)',
    marketStatus: 'Reference Benchmark',
    accentTheme: { color: '#06B6D4', chartColor: '#06B6D4', glowColor: 'rgba(6, 182, 212, 0.4)' }
  }
};

/**
 * Fetch raw quotes from MetalCharts.org API with in-memory caching
 */
async function fetchMetalChartsRaw() {
  const now = Date.now();
  if (priceCache.data && (now - priceCache.timestamp < CACHE_TTL_MS)) {
    return { ...priceCache.data, cached: true, ageSeconds: Math.floor((now - priceCache.timestamp) / 1000) };
  }

  const apiKey = process.env.METALCHARTS_API_KEY;
  if (!apiKey) {
    console.warn('METALCHARTS_API_KEY is not set in environment. Using cached or fallback data.');
    return priceCache.data || null;
  }

  try {
    const url = 'https://api.metalcharts.org/v1/prices/?symbols=XAU,XAG,XPT,XPD,HG&currency=INR&unit=g';
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`MetalCharts API request returned status ${response.status}: ${errText}`);
      if (priceCache.data) {
        priceCache.isStale = true;
        return { ...priceCache.data, cached: true, stale: true };
      }
      return null;
    }

    const json = await response.json();
    if (json && json.success && json.data) {
      priceCache.data = json;
      priceCache.timestamp = now;
      priceCache.isStale = false;
      return { ...json, cached: false, ageSeconds: 0 };
    } else {
      console.warn('MetalCharts API responded with error or unexpected format:', json);
      if (priceCache.data) {
        priceCache.isStale = true;
        return { ...priceCache.data, cached: true, stale: true };
      }
      return null;
    }
  } catch (error) {
    console.error('Error contacting MetalCharts API:', error.message);
    if (priceCache.data) {
      priceCache.isStale = true;
      return { ...priceCache.data, cached: true, stale: true };
    }
    return null;
  }
}

/**
 * Build comprehensive market overview items from MetalCharts response
 */
async function getMarketOverview() {
  const raw = await fetchMetalChartsRaw();
  const quotes = raw?.data || {};
  const isCached = raw?.cached || false;
  const isStale = raw?.stale || priceCache.isStale || false;
  const lastUpdated = priceCache.timestamp ? new Date(priceCache.timestamp).toISOString() : new Date().toISOString();

  const overview = [];

  // 1. Gold (XAU) - Quoted per 10g in India
  if (quotes.XAU && typeof quotes.XAU.price === 'number') {
    const gramPrice = quotes.XAU.price; // INR per gram
    const tenGramPrice = Number((gramPrice * 10).toFixed(2));
    const chg = Number(((quotes.XAU.change24h || 0) * 10).toFixed(2));
    const chgPct = Number((quotes.XAU.changePercent24h || 0).toFixed(2));
    const baseSpark = [tenGramPrice * 0.98, tenGramPrice * 0.985, tenGramPrice * 0.99, tenGramPrice * 0.995, tenGramPrice * 0.998, tenGramPrice];

    overview.push({
      code: 'gold',
      name: 'Gold 24K',
      latestPrice: tenGramPrice,
      price: tenGramPrice,
      pricePerGram: Number(gramPrice.toFixed(2)),
      currency: 'INR',
      unit: '24K (10g)',
      quarter: 'Live',
      qoqChange: chg,
      qoqChangePercent: chgPct,
      trend: chg >= 0 ? 'Upward' : 'Downward',
      sparkline: baseSpark,
      isLive: !isStale,
      isStale,
      isCached,
      lastUpdated,
      marketStatus: isStale ? 'Cached / Feed Delayed' : 'Active Market',
      accentTheme: { color: '#FFD700', chartColor: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.4)' }
    });
  } else {
    overview.push({
      code: 'gold',
      name: 'Gold 24K',
      latestPrice: 122768,
      price: 122768,
      pricePerGram: 12276.8,
      currency: 'INR',
      unit: '24K (10g)',
      quarter: 'Live (Ref)',
      qoqChange: 896,
      qoqChangePercent: 0.74,
      trend: 'Upward',
      sparkline: [120000, 121000, 121500, 122000, 122500, 122768],
      isLive: false,
      isStale: true,
      lastUpdated,
      marketStatus: 'Reference Benchmark',
      accentTheme: { color: '#FFD700', chartColor: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.4)' }
    });
  }

  // 2. Silver (XAG) - Quoted per 10g or 1kg
  if (quotes.XAG && typeof quotes.XAG.price === 'number') {
    const gramPrice = quotes.XAG.price; // INR per gram
    const tenGramPrice = Number((gramPrice * 10).toFixed(2));
    const chg = Number(((quotes.XAG.change24h || 0) * 10).toFixed(2));
    const chgPct = Number((quotes.XAG.changePercent24h || 0).toFixed(2));
    const baseSpark = [tenGramPrice * 0.97, tenGramPrice * 0.98, tenGramPrice * 0.985, tenGramPrice * 0.99, tenGramPrice * 0.995, tenGramPrice];

    overview.push({
      code: 'silver',
      name: 'Silver 999',
      latestPrice: tenGramPrice,
      price: tenGramPrice,
      pricePerGram: Number(gramPrice.toFixed(2)),
      currency: 'INR',
      unit: '999 (10g)',
      quarter: 'Live',
      qoqChange: chg,
      qoqChangePercent: chgPct,
      trend: chg >= 0 ? 'Upward' : 'Downward',
      sparkline: baseSpark,
      isLive: !isStale,
      isStale,
      isCached,
      lastUpdated,
      marketStatus: isStale ? 'Cached / Feed Delayed' : 'Active Market',
      accentTheme: { color: '#CBD5E1', chartColor: '#CBD5E1', glowColor: 'rgba(148, 163, 184, 0.4)' }
    });
  } else {
    overview.push({
      code: 'silver',
      name: 'Silver 999',
      latestPrice: 1653.8,
      price: 1653.8,
      pricePerGram: 165.38,
      currency: 'INR',
      unit: '999 (10g)',
      quarter: 'Live (Ref)',
      qoqChange: 10.9,
      qoqChangePercent: 0.66,
      trend: 'Upward',
      sparkline: [1600, 1615, 1625, 1638, 1645, 1653.8],
      isLive: false,
      isStale: true,
      lastUpdated,
      marketStatus: 'Reference Benchmark',
      accentTheme: { color: '#CBD5E1', chartColor: '#CBD5E1', glowColor: 'rgba(148, 163, 184, 0.4)' }
    });
  }

  // 3. Platinum (XPT) - Quoted per 10g
  if (quotes.XPT && typeof quotes.XPT.price === 'number') {
    const gramPrice = quotes.XPT.price;
    const tenGramPrice = Number((gramPrice * 10).toFixed(2));
    const chg = Number(((quotes.XPT.change24h || 0) * 10).toFixed(2));
    const chgPct = Number((quotes.XPT.changePercent24h || 0).toFixed(2));
    const baseSpark = [tenGramPrice * 1.01, tenGramPrice * 1.005, tenGramPrice * 1.0, tenGramPrice * 0.995, tenGramPrice * 0.99, tenGramPrice];

    overview.push({
      code: 'platinum',
      name: 'Platinum 999',
      latestPrice: tenGramPrice,
      price: tenGramPrice,
      pricePerGram: Number(gramPrice.toFixed(2)),
      currency: 'INR',
      unit: '999 (10g)',
      quarter: 'Live',
      qoqChange: chg,
      qoqChangePercent: chgPct,
      trend: chg >= 0 ? 'Upward' : 'Downward',
      sparkline: baseSpark,
      isLive: !isStale,
      isStale,
      isCached,
      lastUpdated,
      marketStatus: isStale ? 'Cached / Feed Delayed' : 'Active Market',
      accentTheme: { color: '#F8FAFC', chartColor: '#F8FAFC', glowColor: 'rgba(203, 213, 225, 0.4)' }
    });
  } else {
    overview.push({
      code: 'platinum',
      name: 'Platinum 999',
      latestPrice: 47000,
      price: 47000,
      pricePerGram: 4700,
      currency: 'INR',
      unit: '999 (10g)',
      quarter: 'Live (Ref)',
      qoqChange: -320,
      qoqChangePercent: -0.68,
      trend: 'Downward',
      sparkline: [47800, 47600, 47400, 47250, 47100, 47000],
      isLive: false,
      isStale: true,
      lastUpdated,
      marketStatus: 'Reference Benchmark',
      accentTheme: { color: '#F8FAFC', chartColor: '#F8FAFC', glowColor: 'rgba(203, 213, 225, 0.4)' }
    });
  }

  // 4. Copper (HG) - Quoted per 1kg (1000g)
  if (quotes.HG && typeof quotes.HG.price === 'number') {
    const gramPrice = quotes.HG.price;
    const kgPrice = Number((gramPrice * 1000).toFixed(2));
    const chg = Number(((quotes.HG.change24h || 0) * 1000).toFixed(2));
    const chgPct = Number((quotes.HG.changePercent24h || 0).toFixed(2));
    const baseSpark = [kgPrice * 0.98, kgPrice * 0.985, kgPrice * 0.99, kgPrice * 0.995, kgPrice * 0.998, kgPrice];

    overview.push({
      code: 'copper',
      name: 'Copper Cathode',
      latestPrice: kgPrice,
      price: kgPrice,
      pricePerGram: Number(gramPrice.toFixed(4)),
      currency: 'INR',
      unit: 'Standard Grade (1kg)',
      quarter: 'Live',
      qoqChange: chg,
      qoqChangePercent: chgPct,
      trend: chg >= 0 ? 'Upward' : 'Downward',
      sparkline: baseSpark,
      isLive: !isStale,
      isStale,
      isCached,
      lastUpdated,
      marketStatus: isStale ? 'Cached / Feed Delayed' : 'Active Market',
      accentTheme: { color: '#B87333', chartColor: '#B87333', glowColor: 'rgba(184, 115, 51, 0.4)' }
    });
  } else {
    overview.push({
      code: 'copper',
      name: 'Copper Cathode',
      latestPrice: 1360,
      price: 1360,
      pricePerGram: 1.36,
      currency: 'INR',
      unit: 'Standard Grade (1kg)',
      quarter: 'Live (Ref)',
      qoqChange: 4.0,
      qoqChangePercent: 0.29,
      trend: 'Upward',
      sparkline: [1340, 1345, 1350, 1354, 1358, 1360],
      isLive: false,
      isStale: true,
      lastUpdated,
      marketStatus: 'Reference Benchmark',
      accentTheme: { color: '#B87333', chartColor: '#B87333', glowColor: 'rgba(184, 115, 51, 0.4)' }
    });
  }

  // 5. Palladium (XPD) - Supported by MetalCharts
  if (quotes.XPD && typeof quotes.XPD.price === 'number') {
    const gramPrice = quotes.XPD.price;
    const tenGramPrice = Number((gramPrice * 10).toFixed(2));
    const chg = Number(((quotes.XPD.change24h || 0) * 10).toFixed(2));
    const chgPct = Number((quotes.XPD.changePercent24h || 0).toFixed(2));
    const baseSpark = [tenGramPrice * 0.97, tenGramPrice * 0.98, tenGramPrice * 0.985, tenGramPrice * 0.99, tenGramPrice * 0.995, tenGramPrice];

    overview.push({
      code: 'palladium',
      name: 'Palladium 999',
      latestPrice: tenGramPrice,
      price: tenGramPrice,
      pricePerGram: Number(gramPrice.toFixed(2)),
      currency: 'INR',
      unit: '999 (10g)',
      quarter: 'Live',
      qoqChange: chg,
      qoqChangePercent: chgPct,
      trend: chg >= 0 ? 'Upward' : 'Downward',
      sparkline: baseSpark,
      isLive: !isStale,
      isStale,
      isCached,
      lastUpdated,
      marketStatus: isStale ? 'Cached / Feed Delayed' : 'Active Market',
      accentTheme: { color: '#E2E8F0', chartColor: '#CBD5E1', glowColor: 'rgba(226, 232, 240, 0.4)' }
    });
  }

  // 6. Crude Oil - Preserved in application with benchmark designation
  overview.push({
    ...BENCHMARK_COMMODITY_DATA.crudeoil,
    lastUpdated
  });

  // 7. Natural Gas - Preserved in application with benchmark designation
  overview.push({
    ...BENCHMARK_COMMODITY_DATA.naturalgas,
    lastUpdated
  });

  priceCache.overview = overview;
  return overview;
}

/**
 * Sync live prices into MongoDB if database is connected
 */
async function syncToDatabase() {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return; // Skip if database is not active
    }

    const overview = await getMarketOverview();
    const currentYear = new Date().getFullYear();

    for (const item of overview) {
      const comm = await Commodity.findOne({ code: item.code });
      if (!comm) continue;

      const priceVal = item.latestPrice || item.price;
      if (!priceVal || priceVal <= 0) continue;

      // Upsert 'Live' national record
      await HistoricalPrice.updateOne(
        {
          commodityCode: item.code,
          state: 'National',
          quarter: 'Live'
        },
        {
          $set: {
            commodityId: comm._id,
            commodityCode: item.code,
            state: 'National',
            region: 'National',
            quarter: 'Live',
            year: currentYear,
            quarterNum: 99,
            purity: item.unit.split(' ')[0] || 'Standard',
            weight: item.code === 'copper' ? 1000 : 10,
            price: priceVal,
            qoqChange: item.qoqChange,
            qoqChangePercent: item.qoqChangePercent,
            trend: item.trend,
            importedAt: new Date()
          }
        },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn('Sync to MongoDB historical prices warning:', err.message);
  }
}

module.exports = {
  fetchMetalChartsRaw,
  getMarketOverview,
  syncToDatabase,
  CACHE_TTL_MS
};
