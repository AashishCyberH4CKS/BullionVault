import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Settings, CheckCircle2, AlertCircle, Building, SwitchCamera, RefreshCw } from 'lucide-react';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : ''),
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

const Profile = () => {
  const { user, updateProfile, checkAuthStatus } = useAuth();
  
  const [name, setName] = useState(user ? user.name : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [themePreference, setThemePreference] = useState(user?.settings?.themePreference || 'gold');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.settings?.notificationsEnabled ?? true);
  
  // Base B2B units
  const [baseCurrency, setBaseCurrency] = useState('INR');
  const [baseUnit, setBaseUnit] = useState('g');

  // Multi-tenant switching state
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.companyId || '');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await api.get('/api/companies');
        if (res.data.success) {
          setCompanies(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching companies list:', err);
      }
    };
    loadCompanies();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        name,
        settings: {
          themePreference,
          notificationsEnabled
        }
      };

      if (password) {
        payload.password = password;
      }

      const res = await updateProfile(payload);
      if (res.success) {
        setSuccess('Profile updated successfully!');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchCompany = async () => {
    if (!selectedCompanyId) return;
    try {
      setSwitching(true);
      setError('');
      setSuccess('');
      
      const res = await api.post('/api/companies/switch', { companyId: selectedCompanyId });
      if (res.data.success) {
        setSuccess(res.data.message);
        // Refresh Auth Context to fetch user's new company context details
        await checkAuthStatus();
        window.location.reload(); // Hard refresh to clear cached values and repopulate seeder
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch company context.');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
          <Settings className="text-accent" size={24} />
          Terminal Settings & Tenant Switching
        </h1>
        <p className="text-xs text-gray-500 mt-1">Configure units parameters, themes preference, or switch active corporate organization profiles.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Multi-Company Context Switcher */}
      <div className="p-5 bg-white/5 border border-white/5 rounded-xl space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Building size={16} className="text-accent" />
          Multi-Tenant Context Switcher
        </h3>
        <p className="text-[11px] text-gray-500">Switch between different bullion companies to view segregated inventories, transactions, and holdings.</p>
        
        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center text-xs">
          <div className="space-y-1 w-full sm:w-72">
            <label className="block text-[10px] text-gray-400 uppercase font-semibold">Active Corporate Tenant</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white"
            >
              {companies.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwitchCompany}
            disabled={switching || selectedCompanyId === user?.companyId}
            className="luxury-button py-2.5 px-4 flex items-center space-x-1.5 shrink-0 disabled:opacity-40 cursor-pointer"
          >
            {switching ? <RefreshCw size={12} className="animate-spin" /> : <SwitchCamera size={14} />}
            <span>Switch Context</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        {/* Profile Info */}
        <div className="p-5 bg-white/5 border border-white/5 rounded-xl space-y-4">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <User size={16} className="text-accent" />
            Profile Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Registered Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-gray-500 cursor-not-allowed opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Change password card */}
        <div className="p-5 bg-white/5 border border-white/5 rounded-xl space-y-4">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Lock size={16} className="text-accent" />
            Security Credentials
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="p-5 bg-white/5 border border-white/5 rounded-xl space-y-4">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Settings size={16} className="text-accent" />
            B2B Interface Preferences
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Default Currency</label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Default Weight Unit</label>
              <select
                value={baseUnit}
                onChange={(e) => setBaseUnit(e.target.value)}
                className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white"
              >
                <option value="g">Gram (g)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="ton">Metric Ton</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 uppercase font-semibold">Interface Accent Color</label>
              <select
                value={themePreference}
                onChange={(e) => setThemePreference(e.target.value)}
                className="w-full px-3 py-2 bg-[#0F1420] border border-white/10 rounded-lg text-white"
              >
                <option value="gold">Luxury Gold</option>
                <option value="silver">Metallic Silver</option>
                <option value="platinum">Platinum White</option>
                <option value="crudeoil">Amber Copper</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="luxury-button px-6 py-2.5 text-xs font-bold shadow-md"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
