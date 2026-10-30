import axios from 'axios';
import { COMMODITY_DEFINITIONS, HISTORICAL_PRICES, MARKET_INTELLIGENCE_FEEDS } from '../data/commodityMarketData';

// Determine smart API base URL (relative in browser on Vercel/production, fallback to dev proxy)
export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      return ''; // On Vercel / deployed production, use relative origin
    }
  }
  return import.meta.env.VITE_API_URL || '';
};

export const API_BASE_URL = getApiBaseUrl();

// Configure Axios Instance
const api = axios.create({
  baseURL: API_BASE_URL ? (API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`) : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to automatically add JWT auth token
api.interceptors.request.use(
  async (config) => {
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

export const FALLBACK_COMMODITIES = COMMODITY_DEFINITIONS;

export const FALLBACK_MARKET_OVERVIEW = COMMODITY_DEFINITIONS.map(c => ({
  code: c.code,
  name: c.name,
  price: c.latestPrice,
  latestPrice: c.latestPrice,
  openingPrice: c.openingPrice,
  dayHigh: c.dayHigh,
  dayLow: c.dayLow,
  unit: `${c.purityLabel} (${c.baseUnit})`,
  quarter: 'Live',
  qoqChange: c.qoqChange,
  qoqChangePercent: c.qoqChangePercent,
  trend: c.trend,
  volume: c.volume,
  sentiment: c.sentiment,
  sparkline: c.sparkline,
  accentTheme: c.accentTheme
}));

// Commodity & Markets Services
export const commodityService = {
  getCommodities: async () => {
    try {
      const response = await api.get('/commodities');
      if (response.data?.success && Array.isArray(response.data?.data) && response.data.data.length > 0) {
        return {
          success: true,
          data: response.data.data.map(comm => {
            const def = COMMODITY_DEFINITIONS.find(c => c.code === comm.code) || {};
            return { ...def, ...comm };
          })
        };
      }
      return { success: true, data: COMMODITY_DEFINITIONS };
    } catch (e) {
      return { success: true, data: COMMODITY_DEFINITIONS };
    }
  },
  getMarketOverview: async () => {
    try {
      const response = await api.get('/commodities/market/overview');
      if (response.data?.success && Array.isArray(response.data?.data) && response.data.data.length > 0) {
        const normalized = response.data.data.map(item => {
          const def = COMMODITY_DEFINITIONS.find(c => c.code === item.code) || {};
          const rawPrice = item.latestPrice !== undefined ? item.latestPrice : (item.price || def.latestPrice);
          const safeVal = Number(rawPrice) || def.latestPrice || 0;
          return {
            ...def,
            ...item,
            latestPrice: safeVal,
            price: safeVal,
            openingPrice: Number(item.openingPrice) || def.openingPrice || (safeVal * 0.99),
            dayHigh: Number(item.dayHigh) || def.dayHigh || (safeVal * 1.015),
            dayLow: Number(item.dayLow) || def.dayLow || (safeVal * 0.985),
            quarter: item.quarter || 'Live',
            qoqChange: Number(item.qoqChange) || def.qoqChange || 0,
            qoqChangePercent: Number(item.qoqChangePercent) || def.qoqChangePercent || 0,
            unit: item.unit || `${def.purityLabel || 'Standard'} (${def.baseUnit || 'Unit'})`
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
      if (response.data?.success && Array.isArray(response.data?.data) && response.data.data.length > 0) {
        return response.data;
      }
      return { success: true, data: MARKET_INTELLIGENCE_FEEDS };
    } catch (e) {
      return { success: true, data: MARKET_INTELLIGENCE_FEEDS };
    }
  },
  getFilters: async (code) => {
    try {
      const response = await api.get(`/commodities/${code}/filters`);
      if (response.data?.success && response.data.data?.purities?.length > 0) {
        return response.data;
      }
      const comm = COMMODITY_DEFINITIONS.find(c => c.code === code) || COMMODITY_DEFINITIONS[0];
      return {
        success: true,
        data: {
          states: comm.states,
          purities: comm.purities,
          weights: comm.weights,
          quarters: ['Q2 2026', 'Q1 2026', 'Q4 2025', 'Q3 2025', 'Q2 2025', 'Q1 2025']
        }
      };
    } catch (e) {
      const comm = COMMODITY_DEFINITIONS.find(c => c.code === code) || COMMODITY_DEFINITIONS[0];
      return {
        success: true,
        data: {
          states: comm.states,
          purities: comm.purities,
          weights: comm.weights,
          quarters: ['Q2 2026', 'Q1 2026', 'Q4 2025', 'Q3 2025', 'Q2 2025', 'Q1 2025']
        }
      };
    }
  },
  getPrices: async (code, params) => {
    const cleanCode = (code || 'gold').toLowerCase();
    try {
      const response = await api.get(`/commodities/${cleanCode}/prices`, { params });
      if (response.data?.success && Array.isArray(response.data?.data) && response.data.data.length > 0) {
        return response.data;
      }
      const fallbackList = HISTORICAL_PRICES[cleanCode] || HISTORICAL_PRICES.gold;
      return {
        success: true,
        data: fallbackList,
        pagination: { total: fallbackList.length, page: 1, limit: 50, pages: 1 }
      };
    } catch (e) {
      const fallbackList = HISTORICAL_PRICES[cleanCode] || HISTORICAL_PRICES.gold;
      return {
        success: true,
        data: fallbackList,
        pagination: { total: fallbackList.length, page: 1, limit: 50, pages: 1 }
      };
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
