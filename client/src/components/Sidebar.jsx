import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  Calculator,
  BarChart3,
  Eye,
  Bell,
  FileText,
  User,
  Settings,
  LogOut,
  Sparkles
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { activeTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/market', label: 'Market Explorer', icon: TrendingUp },
    { path: '/portfolio', label: 'My Portfolio', icon: Briefcase },
    { path: '/calculator', label: 'Calculator', icon: Calculator },
    { path: '/analytics', label: 'Deep Analytics', icon: BarChart3 },
    { path: '/watchlist', label: 'Watchlist', icon: Eye },
    { path: '/alerts', label: 'Price Alerts', icon: Bell },
    { path: '/reports', label: 'Reports Export', icon: FileText },
    { path: '/profile', label: 'My Profile', icon: User },
  ];

  return (
    <aside className="w-64 bg-[#0d1222]/90 border-r border-white/5 h-screen sticky top-0 flex flex-col justify-between p-6 z-20 backdrop-blur-md">
      {/* Brand Header */}
      <div>
        <div className="flex items-center space-x-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-luxury">
            <span className="text-xl font-bold text-slate-950">👑</span>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              BullionVault
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Commodities</p>
          </div>
        </div>

        {/* User Badge */}
        {user && (
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-accent to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-accent uppercase font-bold tracking-wider text-[10px]">
                {user.role === 'admin' ? 'Premium Admin' : 'Investor'}
              </p>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-accent/10 border-l-2 border-accent text-accent shadow-luxury'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon size={18} className="stroke-[1.8]" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Admin panel logic */}
          {user && user.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 mt-4 border border-dashed ${
                  isActive
                    ? 'bg-red-500/10 border-red-500/40 text-red-400 shadow-lg'
                    : 'border-white/5 text-red-400/80 hover:text-red-400 hover:bg-red-500/5'
                }`
              }
            >
              <Settings size={18} className="stroke-[1.8]" />
              <span>Admin Panel</span>
            </NavLink>
          )}
        </nav>
      </div>

      {/* Logout Footer */}
      <div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-rose-500/10 hover:border hover:border-rose-500/20 transition-all duration-300 cursor-pointer"
        >
          <LogOut size={18} className="stroke-[1.8]" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
