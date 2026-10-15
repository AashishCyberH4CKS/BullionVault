import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Sliders, Users, Building, ShieldCheck, History, Edit, Check, X, Search } from 'lucide-react';

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

const Administration = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'users';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [company, setCompany] = useState({ name: '', industry: '', country: 'India', currency: 'INR', contactInfo: '', logo: '' });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search/Filters for audit logs
  const [logSearch, setLogSearch] = useState('');
  
  // User edit state
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, companyRes, logsRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/companies/profile'),
        api.get('/api/admin/logs')
      ]);

      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (companyRes.data.success) setCompany(companyRes.data.data);
      if (logsRes.data.success) setLogs(logsRes.data.data);
    } catch (err) {
      console.error('Error fetching admin workspace data:', err);
      setError('Not authorized or server not responding. High clearance admin roles required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleUserRoleUpdate = async (userId) => {
    try {
      const res = await api.put(`/api/admin/users/${userId}`, { role: editRole });
      if (res.data.success) {
        setEditingUser(null);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const handleCompanyUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/api/companies/profile', company);
      if (res.data.success) {
        alert('Company profile updated successfully.');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Company update failed');
    }
  };

  const filteredLogs = logs.filter(log => {
    const query = logSearch.toLowerCase();
    const message = log.message?.toLowerCase() || '';
    const type = log.type?.toLowerCase() || '';
    return message.includes(query) || type.includes(query);
  });

  const b2bRoles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'company_admin', label: 'Company Admin' },
    { value: 'portfolio_manager', label: 'Portfolio Manager' },
    { value: 'trader', label: 'Trader' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'inventory_manager', label: 'Inventory Manager' },
    { value: 'viewer', label: 'Viewer / Read-only' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2">
          <Sliders className="text-rose-400" size={24} />
          Administration Control Center
        </h1>
        <p className="text-xs text-gray-500 mt-1">Tenant management dashboard for users, security permissions, company parameters, and audit trails.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5 flex space-x-6">
        {['users', 'company', 'roles', 'logs'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab 
                ? 'border-rose-400 text-rose-400' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'users' ? 'Users Control' : 
             tab === 'company' ? 'Company Settings' : 
             tab === 'roles' ? 'Roles & Permissions' : 'Audit Logs'}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {activeTab === 'users' && (
            <div className="bg-[#0b0f19] border border-white/5 rounded-xl overflow-hidden shadow-luxury">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-[10px] text-gray-400 uppercase tracking-widest">
                      <th className="p-4 font-bold">Name</th>
                      <th className="p-4 font-bold">Email Address</th>
                      <th className="p-4 font-bold">Current Role</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Created Date</th>
                      <th className="p-4 font-bold text-center">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-semibold text-white">{u.name}</td>
                        <td className="p-4 text-gray-400 font-mono">{u.email}</td>
                        <td className="p-4 font-semibold text-accent capitalize">
                          {editingUser === u._id ? (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="px-2 py-1 text-xs bg-[#0F1420] border border-white/10 rounded text-white focus:outline-none"
                            >
                              {b2bRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          ) : (
                            u.role?.replace('_', ' ') || 'viewer'
                          )}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        </td>
                        <td className="p-4 text-gray-400">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="p-4 text-center">
                          {editingUser === u._id ? (
                            <div className="flex justify-center space-x-1.5">
                              <button
                                onClick={() => handleUserRoleUpdate(u._id)}
                                className="p-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded cursor-pointer"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="p-1 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingUser(u._id); setEditRole(u.role || 'viewer'); }}
                              className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="p-6 bg-white/5 border border-white/5 rounded-xl max-w-xl shadow-md">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Building size={16} />
                Organization Parameters
              </h3>
              
              <form onSubmit={handleCompanyUpdate} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold">Registered Company Name</label>
                    <input
                      type="text"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-400"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold">Industry Sector</label>
                    <input
                      type="text"
                      value={company.industry || ''}
                      onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold">Country Jurisdiction</label>
                    <input
                      type="text"
                      value={company.country}
                      onChange={(e) => setCompany({ ...company, country: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold">Default Base Currency</label>
                    <input
                      type="text"
                      value={company.currency}
                      onChange={(e) => setCompany({ ...company, currency: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-gray-400 uppercase font-semibold">Corporate Logo URL</label>
                    <input
                      type="text"
                      value={company.logo || ''}
                      onChange={(e) => setCompany({ ...company, logo: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-400 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-gray-400 uppercase font-semibold">Contact Email Address</label>
                  <input
                    type="email"
                    value={company.contactInfo || ''}
                    onChange={(e) => setCompany({ ...company, contactInfo: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="border-t border-white/5 pt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-600 transition-colors cursor-pointer"
                  >
                    Save Organization Settings
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="bg-[#0b0f19] border border-white/5 rounded-xl p-6 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <ShieldCheck size={16} />
                Role-Based Access Control (RBAC) Permitted Matrix
              </h3>
              
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] text-gray-400 uppercase tracking-wider font-semibold">
                      <th className="pb-2">Role ID</th>
                      <th className="pb-2">Inventory Management</th>
                      <th className="pb-2">Fintech Transactions</th>
                      <th className="pb-2">Portfolio Analytics</th>
                      <th className="pb-2">Company Configuration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    <tr>
                      <td className="py-3 font-semibold text-rose-400">Super Admin</td>
                      <td className="py-3 text-emerald-400">FULL ACCESS (Create, Update, Delete)</td>
                      <td className="py-3 text-emerald-400">FULL ACCESS (Create, Update, Delete)</td>
                      <td className="py-3 text-emerald-400">FULL ACCESS (View, Download)</td>
                      <td className="py-3 text-emerald-400">FULL ACCESS (Config profile/keys)</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-rose-400">Company Admin</td>
                      <td className="py-3 text-emerald-400">FULL ACCESS (Create, Update, Delete)</td>
                      <td className="py-3 text-emerald-400">FULL ACCESS (Create, Update, Delete)</td>
                      <td className="py-3 text-emerald-400">FULL ACCESS (View, Download)</td>
                      <td className="py-3 text-emerald-400">FULL ACCESS (Config profile/keys)</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-blue-400">Portfolio Manager</td>
                      <td className="py-3 text-gray-500">Read-Only View</td>
                      <td className="py-3 text-gray-500">Read-Only View</td>
                      <td className="py-3 text-emerald-400">FULL ACCESS (View, Download, Simulate)</td>
                      <td className="py-3 text-red-500">NO ACCESS (Access Denied)</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-amber-400">Trader</td>
                      <td className="py-3 text-gray-500">Read-Only View</td>
                      <td className="py-3 text-emerald-400">PARTIAL ACCESS (Create buy/sell logs)</td>
                      <td className="py-3 text-gray-500">Read-Only View</td>
                      <td className="py-3 text-red-500">NO ACCESS (Access Denied)</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-amber-400">Accountant</td>
                      <td className="py-3 text-red-500">NO ACCESS (Access Denied)</td>
                      <td className="py-3 text-emerald-400">FULL ACCESS (Create, Edit transactions)</td>
                      <td className="py-3 text-gray-500">Read-Only View</td>
                      <td className="py-3 text-red-500">NO ACCESS (Access Denied)</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-amber-400">Inventory Manager</td>
                      <td className="py-3 text-emerald-400">FULL ACCESS (Log stock, warehouses)</td>
                      <td className="py-3 text-red-500">NO ACCESS (Access Denied)</td>
                      <td className="py-3 text-gray-500">Read-Only View</td>
                      <td className="py-3 text-red-500">NO ACCESS (Access Denied)</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-400">Viewer</td>
                      <td className="py-3 text-gray-500">Read-Only View</td>
                      <td className="py-3 text-gray-500">Read-Only View</td>
                      <td className="py-3 text-gray-500">Read-Only View</td>
                      <td className="py-3 text-red-500">NO ACCESS (Access Denied)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Search Log Bar */}
              <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search logs by action or type..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white/5 border border-white/5 rounded-lg text-white placeholder-gray-500 focus:outline-none"
                />
              </div>

              {/* Logs Table */}
              <div className="bg-[#0b0f19] border border-white/5 rounded-xl overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-[10px] text-gray-400 uppercase tracking-widest">
                        <th className="p-4 font-bold">Category</th>
                        <th className="p-4 font-bold">Event Log Description</th>
                        <th className="p-4 font-bold">Metadata Details</th>
                        <th className="p-4 font-bold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {filteredLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                              log.type === 'audit' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                              log.type === 'admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="p-4 text-white font-sans text-xs">{log.message}</td>
                          <td className="p-4 text-[10px] text-gray-500 truncate max-w-xs">
                            {JSON.stringify(log.details || {})}
                          </td>
                          <td className="p-4 text-gray-400 text-[10px] font-sans">
                            {new Date(log.timestamp || log.createdAt).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-500 font-sans">
                            No logs found matching filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Administration;
