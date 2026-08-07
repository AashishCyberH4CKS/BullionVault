import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './hooks/useTheme';

// Layout & Components
import Sidebar from './components/Sidebar';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import Portfolio from './pages/Portfolio';
import Calculator from './pages/Calculator';
import Analytics from './pages/Analytics';
import Watchlist from './pages/Watchlist';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import ArticlePage from './pages/ArticlePage';
import NewsPage from './pages/NewsPage';

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
  
  return user && user.role === 'admin' ? children : <Navigate to="/dashboard" />;
};

// App Layout Wrapper
const AppLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden p-8 lg:p-10 pb-20">
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
      <Route path="/calculator" element={<PrivateRoute><AppLayout><Calculator /></AppLayout></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute><AppLayout><Analytics /></AppLayout></PrivateRoute>} />
      <Route path="/watchlist" element={<PrivateRoute><AppLayout><Watchlist /></AppLayout></PrivateRoute>} />
      <Route path="/alerts" element={<PrivateRoute><AppLayout><Alerts /></AppLayout></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><AppLayout><Reports /></AppLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><AppLayout><Profile /></AppLayout></PrivateRoute>} />
      
      {/* Admin Panel */}
      <Route path="/admin" element={<AdminRoute><AppLayout><AdminPanel /></AppLayout></AdminRoute>} />

      {/* Redirect Fallbacks */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
