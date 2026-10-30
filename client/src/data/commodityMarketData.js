// Comprehensive Institutional Commodity Market Dataset
// Provides live spot metrics, unit scalers, and multi-quarter historical series for all 6 core assets.

export const COMMODITY_DEFINITIONS = [
  {
    _id: 'comm_gold',
    code: 'gold',
    name: 'Gold',
    purityLabel: '24K 999.9',
    baseUnit: '10g',
    defaultWeight: 10,
    accentTheme: { color: '#FFD700', chartColor: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.4)' },
    latestPrice: 83450,       // INR per 10g (approx ₹8,345/g)
    openingPrice: 82900,
    dayHigh: 84200,
    dayLow: 82650,
    qoqChange: 3015,
    qoqChangePercent: 3.75,
    trend: 'Upward',
    volume: '₹14,850 Cr',
    sentiment: 'Bullish',
    volatility: 'Low (Safe Haven)',
    sparkline: [80500, 81200, 81900, 82400, 82900, 83450],
    purities: ['24K', '22K', '18K'],
    weights: [1, 8, 10, 100, 1000],
    states: ['National', 'Maharashtra', 'Delhi (NCT)', 'Karnataka', 'Gujarat', 'Tamil Nadu']
  },
  {
    _id: 'comm_silver',
    code: 'silver',
    name: 'Silver',
    purityLabel: '999 Fine Silver',
    baseUnit: '10g',
    defaultWeight: 10,
    accentTheme: { color: '#CBD5E1', chartColor: '#CBD5E1', glowColor: 'rgba(148, 163, 184, 0.4)' },
    latestPrice: 968,         // INR per 10g (₹96,800 per 1kg)
    openingPrice: 954,
    dayHigh: 975,
    dayLow: 951,
    qoqChange: 48,
    qoqChangePercent: 5.20,
    trend: 'Upward',
    volume: '₹8,420 Cr',
    sentiment: 'Strong Bullish',
    volatility: 'Moderate (Industrial)',
    sparkline: [910, 925, 938, 948, 955, 968],
    purities: ['999 (Fine Silver)', '925 (Sterling)'],
    weights: [10, 100, 1000],
    states: ['National', 'Maharashtra', 'Delhi (NCT)', 'Gujarat', 'Rajasthan', 'Tamil Nadu']
  },
  {
    _id: 'comm_platinum',
    code: 'platinum',
    name: 'Platinum',
    purityLabel: '999 Fine Platinum',
    baseUnit: '10g',
    defaultWeight: 10,
    accentTheme: { color: '#F8FAFC', chartColor: '#F8FAFC', glowColor: 'rgba(203, 213, 225, 0.4)' },
    latestPrice: 33250,       // INR per 10g
    openingPrice: 33100,
    dayHigh: 33600,
    dayLow: 32900,
    qoqChange: -490,
    qoqChangePercent: -1.45,
    trend: 'Downward',
    volume: '₹2,180 Cr',
    sentiment: 'Consolidating',
    volatility: 'Moderate',
    sparkline: [34100, 33900, 33750, 33500, 33300, 33250],
    purities: ['999 (Fine Platinum)', '950'],
    weights: [1, 10, 50, 100],
    states: ['National', 'Maharashtra', 'Delhi (NCT)']
  },
  {
    _id: 'comm_copper',
    code: 'copper',
    name: 'Copper',
    purityLabel: 'Grade A Cathode',
    baseUnit: 'kg',
    defaultWeight: 1000,
    accentTheme: { color: '#B87333', chartColor: '#B87333', glowColor: 'rgba(184, 115, 51, 0.4)' },
    latestPrice: 872,         // INR per kg (₹8,72,000 / ton)
    openingPrice: 865,
    dayHigh: 880,
    dayLow: 861,
    qoqChange: 18.5,
    qoqChangePercent: 2.15,
    trend: 'Upward',
    volume: '₹5,960 Cr',
    sentiment: 'Bullish',
    volatility: 'High (Cyclical)',
    sparkline: [842, 850, 858, 863, 868, 872],
    purities: ['Grade A Cathode', 'Standard Grade'],
    weights: [1, 100, 1000],
    states: ['National', 'Gujarat', 'Maharashtra', 'West Bengal']
  },
  {
    _id: 'comm_crudeoil',
    code: 'crudeoil',
    name: 'Crude Oil',
    purityLabel: 'Brent Blend / Indian Basket',
    baseUnit: 'bbl',
    defaultWeight: 1,
    accentTheme: { color: '#F97316', chartColor: '#EA580C', glowColor: 'rgba(249, 115, 22, 0.4)' },
    latestPrice: 6580,        // INR per Barrel
    openingPrice: 6640,
    dayHigh: 6720,
    dayLow: 6510,
    qoqChange: -155,
    qoqChangePercent: -2.30,
    trend: 'Downward',
    volume: '₹18,400 Cr',
    sentiment: 'Neutral / Rangebound',
    volatility: 'High (Geopolitical)',
    sparkline: [6820, 6790, 6730, 6680, 6620, 6580],
    purities: ['Brent Blend', 'Indian Basket', 'WTI Light Sweet'],
    weights: [1, 10, 100],
    states: ['National']
  },
  {
    _id: 'comm_naturalgas',
    code: 'naturalgas',
    name: 'Natural Gas',
    purityLabel: 'Pipeline Quality',
    baseUnit: 'mmbtu',
    defaultWeight: 1,
    accentTheme: { color: '#06B6D4', chartColor: '#06B6D4', glowColor: 'rgba(6, 182, 212, 0.4)' },
    latestPrice: 268,         // INR per MMBtu
    openingPrice: 262,
    dayHigh: 274,
    dayLow: 259,
    qoqChange: 12.3,
    qoqChangePercent: 4.80,
    trend: 'Upward',
    volume: '₹3,750 Cr',
    sentiment: 'Bullish',
    volatility: 'High',
    sparkline: [248, 252, 256, 260, 264, 268],
    purities: ['Pipeline Quality', 'LNG Benchmark'],
    weights: [1, 10, 100],
    states: ['National']
  }
];

// Helper to scale prices based on weight unit
export const scalePriceByUnit = (basePrice, commCode, unit = 'g') => {
  const p = Number(basePrice) || 0;
  if (commCode === 'gold' || commCode === 'silver' || commCode === 'platinum') {
    // Base price stored per 10g
    const perGram = p / 10;
    if (unit === 'kg') return perGram * 1000;
    if (unit === 'ton') return perGram * 1000000;
    return perGram; // default g
  }
  if (commCode === 'copper') {
    // Base price stored per 1kg (1000g)
    if (unit === 'g') return p / 1000;
    if (unit === 'ton') return p * 1000;
    return p; // default kg
  }
  // crudeoil & naturalgas
  return p;
};

export const getUnitSymbol = (commCode, unit = 'g') => {
  if (commCode === 'gold' || commCode === 'silver' || commCode === 'platinum') {
    return unit === 'g' ? 'per Gram' : unit === 'kg' ? 'per Kilogram' : 'per Metric Ton';
  }
  if (commCode === 'copper') {
    return unit === 'g' ? 'per Gram' : unit === 'kg' ? 'per Kilogram' : 'per Metric Ton';
  }
  if (commCode === 'crudeoil') return 'per Barrel (bbl)';
  if (commCode === 'naturalgas') return 'per MMBtu';
  return 'per Unit';
};

// Rich quarterly historical price records for all commodities
export const HISTORICAL_PRICES = {
  gold: [
    { quarter: 'Q2 2026', year: 2026, state: 'National', purity: '24K', weight: 10, price: 83450, qoqChange: 3015, qoqChangePercent: 3.75, trend: 'Upward' },
    { quarter: 'Q2 2026', year: 2026, state: 'Maharashtra', purity: '24K', weight: 10, price: 83600, qoqChange: 3080, qoqChangePercent: 3.82, trend: 'Upward' },
    { quarter: 'Q2 2026', year: 2026, state: 'Delhi (NCT)', purity: '24K', weight: 10, price: 83720, qoqChange: 3120, qoqChangePercent: 3.87, trend: 'Upward' },
    { quarter: 'Q2 2026', year: 2026, state: 'Karnataka', purity: '22K', weight: 10, price: 76800, qoqChange: 2780, qoqChangePercent: 3.76, trend: 'Upward' },
    { quarter: 'Q2 2026', year: 2026, state: 'Tamil Nadu', purity: '24K', weight: 10, price: 83850, qoqChange: 3200, qoqChangePercent: 3.97, trend: 'Upward' },
    { quarter: 'Q1 2026', year: 2026, state: 'National', purity: '24K', weight: 10, price: 80435, qoqChange: 2950, qoqChangePercent: 3.81, trend: 'Upward' },
    { quarter: 'Q1 2026', year: 2026, state: 'Maharashtra', purity: '24K', weight: 10, price: 80520, qoqChange: 2910, qoqChangePercent: 3.75, trend: 'Upward' },
    { quarter: 'Q4 2025', year: 2025, state: 'National', purity: '24K', weight: 10, price: 77485, qoqChange: 2680, qoqChangePercent: 3.58, trend: 'Upward' },
    { quarter: 'Q3 2025', year: 2025, state: 'National', purity: '24K', weight: 10, price: 74805, qoqChange: 2420, qoqChangePercent: 3.34, trend: 'Upward' },
    { quarter: 'Q2 2025', year: 2025, state: 'National', purity: '24K', weight: 10, price: 72385, qoqChange: 2150, qoqChangePercent: 3.06, trend: 'Upward' },
    { quarter: 'Q1 2025', year: 2025, state: 'National', purity: '24K', weight: 10, price: 70235, qoqChange: 2010, qoqChangePercent: 2.95, trend: 'Upward' },
    { quarter: 'Q4 2024', year: 2024, state: 'National', purity: '24K', weight: 10, price: 68225, qoqChange: 1980, qoqChangePercent: 2.99, trend: 'Upward' }
  ],
  silver: [
    { quarter: 'Q2 2026', year: 2026, state: 'National', purity: '999 (Fine Silver)', weight: 10, price: 968, qoqChange: 48, qoqChangePercent: 5.20, trend: 'Upward' },
    { quarter: 'Q2 2026', year: 2026, state: 'Maharashtra', purity: '999 (Fine Silver)', weight: 10, price: 972, qoqChange: 50, qoqChangePercent: 5.42, trend: 'Upward' },
    { quarter: 'Q2 2026', year: 2026, state: 'Delhi (NCT)', purity: '999 (Fine Silver)', weight: 10, price: 975, qoqChange: 52, qoqChangePercent: 5.63, trend: 'Upward' },
    { quarter: 'Q2 2026', year: 2026, state: 'Gujarat', purity: '999 (Fine Silver)', weight: 1000, price: 96500, qoqChange: 4800, qoqChangePercent: 5.23, trend: 'Upward' },
    { quarter: 'Q1 2026', year: 2026, state: 'National', purity: '999 (Fine Silver)', weight: 10, price: 920, qoqChange: 42, qoqChangePercent: 4.78, trend: 'Upward' },
    { quarter: 'Q4 2025', year: 2025, state: 'National', purity: '999 (Fine Silver)', weight: 10, price: 878, qoqChange: 38, qoqChangePercent: 4.52, trend: 'Upward' },
    { quarter: 'Q3 2025', year: 2025, state: 'National', purity: '999 (Fine Silver)', weight: 10, price: 840, qoqChange: 35, qoqChangePercent: 4.35, trend: 'Upward' },
    { quarter: 'Q2 2025', year: 2025, state: 'National', purity: '999 (Fine Silver)', weight: 10, price: 805, qoqChange: 31, qoqChangePercent: 4.01, trend: 'Upward' }
  ],
  platinum: [
    { quarter: 'Q2 2026', year: 2026, state: 'National', purity: '999 (Fine Platinum)', weight: 10, price: 33250, qoqChange: -490, qoqChangePercent: -1.45, trend: 'Downward' },
    { quarter: 'Q2 2026', year: 2026, state: 'Maharashtra', purity: '999 (Fine Platinum)', weight: 10, price: 33380, qoqChange: -450, qoqChangePercent: -1.33, trend: 'Downward' },
    { quarter: 'Q1 2026', year: 2026, state: 'National', purity: '999 (Fine Platinum)', weight: 10, price: 33740, qoqChange: 320, qoqChangePercent: 0.96, trend: 'Upward' },
    { quarter: 'Q4 2025', year: 2025, state: 'National', purity: '999 (Fine Platinum)', weight: 10, price: 33420, qoqChange: 480, qoqChangePercent: 1.46, trend: 'Upward' },
    { quarter: 'Q3 2025', year: 2025, state: 'National', purity: '999 (Fine Platinum)', weight: 10, price: 32940, qoqChange: -210, qoqChangePercent: -0.63, trend: 'Downward' },
    { quarter: 'Q2 2025', year: 2025, state: 'National', purity: '999 (Fine Platinum)', weight: 10, price: 33150, qoqChange: 520, qoqChangePercent: 1.60, trend: 'Upward' }
  ],
  copper: [
    { quarter: 'Q2 2026', year: 2026, state: 'National', purity: 'Grade A Cathode', weight: 1000, price: 872, qoqChange: 18.5, qoqChangePercent: 2.15, trend: 'Upward' },
    { quarter: 'Q2 2026', year: 2026, state: 'Gujarat', purity: 'Grade A Cathode', weight: 1000, price: 875, qoqChange: 19.0, qoqChangePercent: 2.22, trend: 'Upward' },
    { quarter: 'Q1 2026', year: 2026, state: 'National', purity: 'Grade A Cathode', weight: 1000, price: 853.5, qoqChange: 21.0, qoqChangePercent: 2.52, trend: 'Upward' },
    { quarter: 'Q4 2025', year: 2025, state: 'National', purity: 'Grade A Cathode', weight: 1000, price: 832.5, qoqChange: 16.5, qoqChangePercent: 2.02, trend: 'Upward' },
    { quarter: 'Q3 2025', year: 2025, state: 'National', purity: 'Grade A Cathode', weight: 1000, price: 816, qoqChange: -12.0, qoqChangePercent: -1.45, trend: 'Downward' },
    { quarter: 'Q2 2025', year: 2025, state: 'National', purity: 'Grade A Cathode', weight: 1000, price: 828, qoqChange: 24.0, qoqChangePercent: 2.99, trend: 'Upward' }
  ],
  crudeoil: [
    { quarter: 'Q2 2026', year: 2026, state: 'National', purity: 'Brent Blend', weight: 1, price: 6580, qoqChange: -155, qoqChangePercent: -2.30, trend: 'Downward' },
    { quarter: 'Q1 2026', year: 2026, state: 'National', purity: 'Brent Blend', weight: 1, price: 6735, qoqChange: 210, qoqChangePercent: 3.22, trend: 'Upward' },
    { quarter: 'Q4 2025', year: 2025, state: 'National', purity: 'Brent Blend', weight: 1, price: 6525, qoqChange: -180, qoqChangePercent: -2.68, trend: 'Downward' },
    { quarter: 'Q3 2025', year: 2025, state: 'National', purity: 'Brent Blend', weight: 1, price: 6705, qoqChange: 320, qoqChangePercent: 5.01, trend: 'Upward' },
    { quarter: 'Q2 2025', year: 2025, state: 'National', purity: 'Brent Blend', weight: 1, price: 6385, qoqChange: -90, qoqChangePercent: -1.39, trend: 'Downward' }
  ],
  naturalgas: [
    { quarter: 'Q2 2026', year: 2026, state: 'National', purity: 'Pipeline Quality', weight: 1, price: 268, qoqChange: 12.3, qoqChangePercent: 4.80, trend: 'Upward' },
    { quarter: 'Q1 2026', year: 2026, state: 'National', purity: 'Pipeline Quality', weight: 1, price: 255.7, qoqChange: 8.5, qoqChangePercent: 3.44, trend: 'Upward' },
    { quarter: 'Q4 2025', year: 2025, state: 'National', purity: 'Pipeline Quality', weight: 1, price: 247.2, qoqChange: 14.2, qoqChangePercent: 6.09, trend: 'Upward' },
    { quarter: 'Q3 2025', year: 2025, state: 'National', purity: 'Pipeline Quality', weight: 1, price: 233, qoqChange: -7.5, qoqChangePercent: -3.12, trend: 'Downward' }
  ]
};

// Historical Comparison Timeline Data across Quarters
export const COMPARISON_HISTORICAL_TIMELINE = [
  {
    quarter: 'Q2 2025',
    gold: 72385,
    silver: 805,
    platinum: 33150,
    copper: 828,
    crudeoil: 6385
  },
  {
    quarter: 'Q3 2025',
    gold: 74805,
    silver: 840,
    platinum: 32940,
    copper: 816,
    crudeoil: 6705
  },
  {
    quarter: 'Q4 2025',
    gold: 77485,
    silver: 878,
    platinum: 33420,
    copper: 832.5,
    crudeoil: 6525
  },
  {
    quarter: 'Q1 2026',
    gold: 80435,
    silver: 920,
    platinum: 33740,
    copper: 853.5,
    crudeoil: 6735
  },
  {
    quarter: 'Q2 2026',
    gold: 83450,
    silver: 968,
    platinum: 33250,
    copper: 872,
    crudeoil: 6580
  }
];

// Market Intelligence Commentary & Global Feeds
export const MARKET_INTELLIGENCE_FEEDS = [
  {
    title: 'Central Bank Gold Purchases Set New Multi-Decade Benchmark',
    source: 'World Gold Council (WGC)',
    summary: 'Global sovereign reserve managers added over 480 tons of physical bullion in H1 2026, driven by currency diversification, strategic de-dollarization, and inflation protection mandates.',
    impact: 'Strong Bullish for Gold & Silver',
    category: 'Macro Economics',
    sentiment: 'Bullish'
  },
  {
    title: 'Industrial Silver Deficit Widens on Solar PV & EV Electronics Surge',
    source: 'The Silver Institute Annual Review',
    summary: 'Industrial fabrication demand for Silver reached record highs, driven by TOPCon and N-type solar cell architectures requiring higher conductive silver loadings per square meter.',
    impact: 'Structural Supply Deficit; Upward Bias on Silver',
    category: 'Industrial Demand',
    sentiment: 'Bullish'
  },
  {
    title: 'Refined Copper Spot Premia Rise on Concentrates Supply Constraints',
    source: 'London Metal Exchange (LME) Intelligence',
    summary: 'Smelter treatment and refining charges (TC/RCs) hovered near multi-year lows, curtailing cathode expansion across Asian and European manufacturing hubs.',
    impact: 'Moderate Supply Tightening; Favorable for Copper',
    category: 'Supply Chain',
    sentiment: 'Bullish'
  },
  {
    title: 'Global Energy Rebalancing: Crude Oil Rangebound Amid Geopolitics',
    source: 'International Energy Agency (IEA)',
    summary: 'OPEC+ output discipline and non-OPEC growth continue to counterbalance each other, keeping Brent benchmarks constrained between $74 and $82 per barrel.',
    impact: 'Neutral / Rangebound Volatility',
    category: 'Energy Markets',
    sentiment: 'Neutral'
  }
];

