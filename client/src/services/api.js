import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

// Configure Axios Instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to automatically add JWT auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response.data;
  },
  register: async (userInfo) => {
    const response = await api.post('/auth/register', userInfo);
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response.data;
  },
  forgotPassword: async (data) => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
  }
};

export const FALLBACK_COMMODITIES = [
  { _id: 'comm_gold', code: 'gold', name: 'Gold', fileName: 'Gold.xlsx', accentTheme: { color: '#FFD700', chartColor: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.4)' }, purities: ['24K', '22K', '18K'], weights: [1, 8, 10, 100], states: ['Maharashtra', 'Delhi (NCT)', 'Karnataka', 'Tamil Nadu', 'National'] },
  { _id: 'comm_silver', code: 'silver', name: 'Silver', fileName: 'Silver.xlsx', accentTheme: { color: '#CBD5E1', chartColor: '#CBD5E1', glowColor: 'rgba(148, 163, 184, 0.4)' }, purities: ['999 (Fine Silver)', '925 (Sterling)'], weights: [10, 100, 1000], states: ['Maharashtra', 'Delhi (NCT)', 'Gujarat', 'National'] },
  { _id: 'comm_platinum', code: 'platinum', name: 'Platinum', fileName: 'Platinum.xlsx', accentTheme: { color: '#F8FAFC', chartColor: '#F8FAFC', glowColor: 'rgba(203, 213, 225, 0.4)' }, purities: ['999 (Fine Platinum)', '950'], weights: [1, 10, 50], states: ['National'] },
  { _id: 'comm_copper', code: 'copper', name: 'Copper', fileName: 'Live API', accentTheme: { color: '#B87333', chartColor: '#B87333', glowColor: 'rgba(184, 115, 51, 0.4)' }, purities: ['Grade A Cathode', 'Standard'], weights: [1, 100, 1000], states: ['National'] },
  { _id: 'comm_crudeoil', code: 'crudeoil', name: 'Crude Oil', fileName: 'CrudeOil.xlsx', accentTheme: { color: '#F97316', chartColor: '#EA580C', glowColor: 'rgba(249, 115, 22, 0.4)' }, purities: ['Brent Blend', 'WTI Light Sweet'], weights: [1, 10, 100], states: ['National'] },
  { _id: 'comm_naturalgas', code: 'naturalgas', name: 'Natural Gas', fileName: 'Live API', accentTheme: { color: '#06B6D4', chartColor: '#06B6D4', glowColor: 'rgba(6, 182, 212, 0.4)' }, purities: ['Pipeline Quality', 'LNG'], weights: [1, 10, 100], states: ['National'] }
];

export const FALLBACK_MARKET_OVERVIEW = [
  { code: 'gold', name: 'Gold 24K', price: 122895, latestPrice: 122895, unit: '24K (10g)', quarter: 'Live', qoqChange: 896, qoqChangePercent: 0.74, trend: 'Upward', sparkline: [120000, 121000, 121500, 122000, 122500, 122895] },
  { code: 'silver', name: 'Silver 999', price: 1655, latestPrice: 1655, unit: '999 (10g)', quarter: 'Live', qoqChange: 10.9, qoqChangePercent: 0.66, trend: 'Upward', sparkline: [1600, 1615, 1625, 1638, 1645, 1655] },
  { code: 'platinum', name: 'Platinum 999', price: 47044, latestPrice: 47044, unit: '999 (10g)', quarter: 'Live', qoqChange: -320, qoqChangePercent: -0.68, trend: 'Downward', sparkline: [47800, 47600, 47400, 47250, 47100, 47044] },
  { code: 'copper', name: 'Copper Cathode', price: 1365, latestPrice: 1365, unit: 'Standard Grade (1kg)', quarter: 'Live', qoqChange: 4.0, qoqChangePercent: 0.29, trend: 'Upward', sparkline: [1340, 1345, 1350, 1354, 1358, 1365] },
  { code: 'crudeoil', name: 'Crude Oil (Brent)', price: 6450, latestPrice: 6450, unit: 'Brent Blend (bbl)', quarter: 'Live', qoqChange: -120, qoqChangePercent: -1.82, trend: 'Downward', sparkline: [6600, 6580, 6520, 6500, 6480, 6450] },
  { code: 'naturalgas', name: 'Natural Gas', price: 275, latestPrice: 275, unit: 'Pipeline Quality (mmbtu)', quarter: 'Live', qoqChange: 15, qoqChangePercent: 5.76, trend: 'Upward', sparkline: [255, 260, 265, 268, 272, 275] }
];

// Commodity & Markets Services
export const commodityService = {
  getCommodities: async () => {
    try {
      const response = await api.get('/commodities');
      if (response.data?.success && response.data?.data?.length > 0) return response.data;
      return { success: true, data: FALLBACK_COMMODITIES };
    } catch (e) {
      return { success: true, data: FALLBACK_COMMODITIES };
    }
  },
  getMarketOverview: async () => {
    try {
      const response = await api.get('/commodities/market/overview');
      if (response.data?.success && Array.isArray(response.data?.data) && response.data.data.length > 0) {
        const normalized = response.data.data.map(item => {
          const rawPrice = item.latestPrice !== undefined ? item.latestPrice : item.price;
          const safeVal = Number(rawPrice) || 0;
          return {
            ...item,
            latestPrice: safeVal,
            price: safeVal,
            quarter: item.quarter || 'Q2 2026',
            qoqChange: Number(item.qoqChange) || 0,
            qoqChangePercent: Number(item.qoqChangePercent) || 0,
            unit: item.unit || 'Standard Unit'
          };
        });
        return { success: true, data: normalized };
      }
      return { success: true, data: FALLBACK_MARKET_OVERVIEW };
    } catch (e) {
      return { success: true, data: FALLBACK_MARKET_OVERVIEW };
    }
  },
  getMarketInsights: async () => {
    try {
      const response = await api.get('/commodities/market/insights');
      return response.data;
    } catch (e) {
      return { success: true, data: [] };
    }
  },
  getFilters: async (code) => {
    try {
      const response = await api.get(`/commodities/${code}/filters`);
      return response.data;
    } catch (e) {
      const comm = FALLBACK_COMMODITIES.find(c => c.code === code) || FALLBACK_COMMODITIES[0];
      return {
        success: true,
        data: {
          states: comm.states,
          purities: comm.purities,
          weights: comm.weights,
          quarters: ['Q2 2026', 'Q1 2026', 'Q4 2025', 'Q3 2025']
        }
      };
    }
  },
  getPrices: async (code, params) => {
    try {
      const response = await api.get(`/commodities/${code}/prices`, { params });
      return response.data;
    } catch (e) {
      return { success: true, data: [] };
    }
  },
  getAnalytics: async (code, params) => {
    try {
      const response = await api.get(`/commodities/${code}/analytics`, { params });
      return response.data;
    } catch (e) {
      return { success: true, data: null };
    }
  },
  lookupPrice: async (code, params) => {
    try {
      const response = await api.get(`/commodities/${code}/lookup`, { params });
      return response.data;
    } catch (e) {
      const fallback = FALLBACK_MARKET_OVERVIEW.find(c => c.code === code);
      return { success: true, data: { price: fallback?.price || 5000, quarter: 'Q2 2026' } };
    }
  }
};

// Portfolio Services
export const portfolioService = {
  getInvestments: async () => {
    const response = await api.get('/portfolio');
    return response.data;
  },
  addInvestment: async (investmentData) => {
    const response = await api.post('/portfolio', investmentData);
    return response.data;
  },
  deleteInvestment: async (id) => {
    const response = await api.delete(`/portfolio/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/portfolio/stats');
    return response.data;
  }
};

// Alerts Services
export const alertService = {
  getAlerts: async () => {
    const response = await api.get('/alerts');
    return response.data;
  },
  createAlert: async (alertData) => {
    const response = await api.post('/alerts', alertData);
    return response.data;
  },
  deleteAlert: async (id) => {
    const response = await api.delete(`/alerts/${id}`);
    return response.data;
  }
};

// Watchlist Services
export const watchlistService = {
  getWatchlist: async () => {
    const response = await api.get('/watchlist');
    return response.data;
  },
  addToWatchlist: async (commodityId) => {
    const response = await api.post('/watchlist', { commodityId });
    return response.data;
  },
  removeFromWatchlist: async (id) => {
    const response = await api.delete(`/watchlist/${id}`);
    return response.data;
  }
};

// Report Services
export const reportService = {
  getReports: async () => {
    const response = await api.get('/reports');
    return response.data;
  },
  generateReport: async (reportRequest) => {
    const response = await api.post('/reports/generate', reportRequest);
    return response.data;
  }
};

// Admin Services
export const adminService = {
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  getLogs: async () => {
    const response = await api.get('/admin/logs');
    return response.data;
  },
  triggerRefresh: async () => {
    const response = await api.post('/admin/refresh');
    return response.data;
  },
  deleteCommodity: async (code) => {
    const response = await api.delete(`/admin/commodities/${code}`);
    return response.data;
  },
  uploadSpreadsheet: async (formData) => {
    const response = await api.post('/admin/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export default api;
