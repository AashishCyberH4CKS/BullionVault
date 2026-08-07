import axios from 'axios';

// Configure Axios Instance
const api = axios.create({
  baseURL: '/api', // Proxied via Vite config to http://localhost:5000/api
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

// Commodity & Markets Services
export const commodityService = {
  getCommodities: async () => {
    const response = await api.get('/commodities');
    return response.data;
  },
  getMarketOverview: async () => {
    const response = await api.get('/commodities/market/overview');
    return response.data;
  },
  getMarketInsights: async () => {
    const response = await api.get('/commodities/market/insights');
    return response.data;
  },
  getFilters: async (code) => {
    const response = await api.get(`/commodities/${code}/filters`);
    return response.data;
  },
  getPrices: async (code, params) => {
    const response = await api.get(`/commodities/${code}/prices`, { params });
    return response.data;
  },
  getAnalytics: async (code, params) => {
    const response = await api.get(`/commodities/${code}/analytics`, { params });
    return response.data;
  },
  lookupPrice: async (code, params) => {
    const response = await api.get(`/commodities/${code}/lookup`, { params });
    return response.data;
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
