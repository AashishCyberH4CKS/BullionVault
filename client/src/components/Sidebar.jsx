import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
  Receipt,
  ShieldAlert,
  FileBarChart,
  Bell,
  Sliders,
  Users,
  Building,
  Key,
  History,
  LogOut,
  Sparkles,
  BarChart3,
  Scale,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen = false, onClose }) => {
  const { user, logout } = useAuth();
  const { activeTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      await logout({ redirectUrl: '/login' });
    } catch (err) {
      console.error('Logout failed:', err);
      window.location.href = '/login';
    }
  };

  // State to manage collapsible dropdown submenus
  const [openMenus, setOpenMenus] = useState({
    market: false,
    portfolio: false,
    inventory: false,
    transactions: false,
    risk: false,
    reports: false,
    admin: false
  });

  const toggleMenu = (menuName) => {
    setOpenMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  const navItems = [
    {
      label: 'Market',
      key: 'market',
      icon: TrendingUp,
      subItems: [
        { path: '/market?tab=prices', label: 'Commodity Prices' },
        { path: '/market?tab=comparison', label: 'Commodity Comparison' },
        { path: '/market?tab=intelligence', label: 'Market Intelligence' }
      ]
    },
    {
      label: 'Portfolio',
      key: 'portfolio',
      icon: Briefcase,
      subItems: [
        { path: '/portfolio?tab=overview', label: 'Portfolio Overview' },
        { path: '/portfolio?tab=holdings', label: 'Holdings' },
        { path: '/portfolio?tab=performance', label: 'Performance' }
      ]
    },
    {
      label: 'Inventory',
      key: 'inventory',
      icon: Layers,
      subItems: [
        { path: '/inventory?tab=overview', label: 'Inventory Overview' },
        { path: '/inventory?tab=warehouses', label: 'Warehouses' },
        { path: '/inventory?tab=alerts', label: 'Stock Alerts' }
      ]
    },
    {
      label: 'Transactions',
      key: 'transactions',
      icon: Receipt,
      subItems: [
        { path: '/transactions?tab=purchases', label: 'Purchases' },
        { path: '/transactions?tab=sales', label: 'Sales' },
        { path: '/transactions?tab=history', label: 'Transaction History' }
      ]
    },
    {
      label: 'Risk & Analytics',
      key: 'risk',
      icon: ShieldAlert,
      subItems: [
        { path: '/risk?tab=dashboard', label: 'Risk Dashboard' },
        { path: '/risk?tab=exposure', label: 'Exposure' },
        { path: '/risk?tab=pnl', label: 'P&L Analytics' },
        { path: '/risk?tab=insights', label: 'AI Insights' }
      ]
    },
    {
      label: 'Reports',
      key: 'reports',
      icon: FileBarChart,
      subItems: [
        { path: '/reports?tab=portfolio', label: 'Portfolio Report' },
        { path: '/reports?tab=inventory', label: 'Inventory Report' },
        { path: '/reports?tab=pnl', label: 'P&L Report' },
        { path: '/reports?tab=risk', label: 'Risk Report' }
      ]
    }
  ];

  // Helper to check if a main path or specific tab path is active
  const isTabActive = (itemPath) => {
    const cleanPath = itemPath.split('?')[0];
    const itemQuery = new URLSearchParams(itemPath.split('?')[1]);
    const activeQuery = new URLSearchParams(location.search);
    
    return location.pathname === cleanPath && itemQuery.get('tab') === activeQuery.get('tab');
  };

  const isMenuOpen = (key, items) => {
    return openMenus[key] || items.some(item => isTabActive(item.path));
  };

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 lg:z-20
        w-72 lg:w-64 h-screen
        bg-[#080c16]/98 lg:bg-[#080c16]/95
        border-r border-white/10 lg:border-white/5
        flex flex-col justify-between p-4
        backdrop-blur-xl lg:backdrop-blur-md
        overflow-y-auto select-none scrollbar-thin
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div>
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <div 
              className="flex items-center cursor-pointer justify-center flex-1" 
              onClick={() => {
                navigate('/dashboard');
                handleLinkClick();
              }}
            >
              <img 
                src="/logo.png" 
                alt="BullionVault Logo" 
                className="h-10 w-auto object-contain"
              />
            </div>
            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors ml-2 cursor-pointer"
              aria-label="Close Navigation"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Company Badge */}
        {user && (
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center space-x-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-accent to-amber-600 flex items-center justify-center font-bold text-slate-950 shadow-md text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-accent uppercase font-bold tracking-wider truncate">
                {user.role ? user.role.replace('_', ' ') : 'Viewer'}
              </p>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="space-y-1">
          {/* Dashboard Direct Link */}
          <NavLink
            to="/dashboard"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActive && location.pathname === '/dashboard'
                  ? 'bg-accent/10 border-l-2 border-accent text-accent shadow-luxury'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </NavLink>

          {/* Grouped Collapsible Menus */}
          {navItems.map((group) => {
            const open = isMenuOpen(group.key, group.subItems);
            return (
              <div key={group.key} className="space-y-0.5">
                <button
                  onClick={() => toggleMenu(group.key)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <group.icon size={16} />
                    <span>{group.label}</span>
                  </div>
                  {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {open && (
                  <div className="pl-8 space-y-0.5 border-l border-white/5 ml-5 mt-0.5 mb-1.5">
                    {group.subItems.map((subItem) => {
                      const active = isTabActive(subItem.path);
                      return (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          onClick={handleLinkClick}
                          className={`block px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                            active
                              ? 'text-accent font-semibold bg-accent/5'
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {subItem.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Alerts Direct Link */}
          <NavLink
            to="/alerts"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-accent/10 border-l-2 border-accent text-accent shadow-luxury'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Bell size={16} />
            <span>Alerts & Triggers</span>
          </NavLink>

          {/* Administration Collapsible (Only visible to Company Admins & Super Admins) */}
          {user && (user.role === 'super_admin' || user.role === 'company_admin') && (
            <div className="space-y-0.5">
              <button
                onClick={() => toggleMenu('admin')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-rose-400/80 hover:text-rose-300 hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Sliders size={16} />
                  <span>Administration</span>
                </div>
                {openMenus.admin ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {openMenus.admin && (
                <div className="pl-8 space-y-0.5 border-l border-white/5 ml-5 mt-0.5 mb-1.5">
                  <NavLink
                    to="/admin?tab=users"
                    className={() => `block px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${isTabActive('/admin?tab=users') ? 'text-rose-400 font-semibold bg-rose-500/5' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Users Control
                  </NavLink>
                  <NavLink
                    to="/admin?tab=company"
                    className={() => `block px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${isTabActive('/admin?tab=company') ? 'text-rose-400 font-semibold bg-rose-500/5' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Company Settings
                  </NavLink>
                  <NavLink
                    to="/admin?tab=roles"
                    className={() => `block px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${isTabActive('/admin?tab=roles') ? 'text-rose-400 font-semibold bg-rose-500/5' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Roles & Permissions
                  </NavLink>
                  <NavLink
                    to="/admin?tab=logs"
                    className={() => `block px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${isTabActive('/admin?tab=logs') ? 'text-rose-400 font-semibold bg-rose-500/5' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Audit System Logs
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* Settings Direct Link */}
          <NavLink
            to="/profile"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-accent/10 border-l-2 border-accent text-accent shadow-luxury'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Sliders size={16} />
            <span>Profile & Settings</span>
          </NavLink>
        </nav>
      </div>

      {/* Logout Footer */}
      <div className="pt-4 border-t border-white/5 mt-4">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-rose-500/10 hover:border hover:border-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <LogOut size={16} className={isLoggingOut ? "animate-spin text-rose-400" : ""} />
          <span>{isLoggingOut ? "Logging out..." : "Logout Terminal"}</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
