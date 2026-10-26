import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './hooks/useTheme';
import { Menu } from 'lucide-react';

// Layout & Components
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import Portfolio from './pages/Portfolio';
import Inventory from './pages/Inventory';
import Transactions from './pages/Transactions';
import RiskAnalytics from './pages/RiskAnalytics';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Administration from './pages/Administration';
import ArticlePage from './pages/ArticlePage';
import NewsPage from './pages/NewsPage';
import Calculator from './pages/Calculator';
import Analytics from './pages/Analytics';
import Watchlist from './pages/Watchlist';

// Private Route Guard
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0F19]">
        <div className="relative w-16 h-16 border-2 border-white/5 rounded-full flex items-center justify-center">
          <div className="absolute w-16 h-16 border-t-2 border-accent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-accent">BV</span>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Admin Route Guard
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0F19]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return user && (user.role === 'super_admin' || user.role === 'company_admin') ? children : <Navigate to="/dashboard" />;
};

// App Layout Wrapper (Mobile Friendly + Desktop)
const AppLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Auto-close mobile drawer on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col lg:flex-row">
      {/* Mobile Top Navigation Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#080c16]/95 border-b border-white/5 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>
          <img 
            src="/logo.png" 
            alt="BullionVault" 
            className="h-8 w-auto object-contain cursor-pointer"
            onClick={() => window.location.href = '/dashboard'}
          />
        </div>

        <div className="flex items-center space-x-2">
          {user && (
            <div className="flex items-center space-x-2 bg-white/5 border border-white/10 py-1 px-3 rounded-full">
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-accent to-amber-600 flex items-center justify-center font-bold text-[10px] text-slate-950">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-semibold text-gray-200 max-w-[110px] truncate">
                {user.name}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Sidebar - Desktop Sticky & Mobile Drawer */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-10 pb-20 max-w-full">
        {children}
      </main>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/articles/:id" element={<ArticlePage />} />
      <Route path="/news/:id" element={<NewsPage />} />

      {/* Protected Dashboards */}
      <Route path="/dashboard" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
      <Route path="/market" element={<PrivateRoute><AppLayout><Market /></AppLayout></PrivateRoute>} />
      <Route path="/portfolio" element={<PrivateRoute><AppLayout><Portfolio /></AppLayout></PrivateRoute>} />
      <Route path="/inventory" element={<PrivateRoute><AppLayout><Inventory /></AppLayout></PrivateRoute>} />
      <Route path="/transactions" element={<PrivateRoute><AppLayout><Transactions /></AppLayout></PrivateRoute>} />
      <Route path="/risk" element={<PrivateRoute><AppLayout><RiskAnalytics /></AppLayout></PrivateRoute>} />
      <Route path="/alerts" element={<PrivateRoute><AppLayout><Alerts /></AppLayout></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><AppLayout><Reports /></AppLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><AppLayout><Profile /></AppLayout></PrivateRoute>} />
      <Route path="/calculator" element={<Navigate to="/market" replace />} />
      <Route path="/analytics" element={<Navigate to="/risk" replace />} />
      <Route path="/watchlist" element={<Navigate to="/market" replace />} />
      
      {/* Admin Panel */}
      <Route path="/admin" element={<AdminRoute><AppLayout><Administration /></AppLayout></AdminRoute>} />

      {/* Redirect Fallbacks */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <ThemeProvider>
            <AppRoutes />
          </ThemeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
