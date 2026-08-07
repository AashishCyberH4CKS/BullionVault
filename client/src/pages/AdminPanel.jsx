import React, { useState, useEffect } from 'react';
import { adminService, commodityService } from '../services/api';
import GlassCard from '../components/GlassCard';
import { 
  Settings, 
  UploadCloud, 
  RefreshCw, 
  Terminal, 
  Trash2, 
  Users, 
  ShieldAlert, 
  Database,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [commodities, setCommodities] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // File state
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, logsRes, commRes] = await Promise.all([
        adminService.getUsers(),
        adminService.getLogs(),
        commodityService.getCommodities()
      ]);

      if (usersRes.success) setUsers(usersRes.data);
      if (logsRes.success) setLogs(logsRes.data);
      if (commRes.success) setCommodities(commRes.data);
    } catch (err) {
      console.error('Failed to load admin controls:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRefreshDatabase = async () => {
    setRefreshing(true);
    try {
      const res = await adminService.triggerRefresh();
      if (res.success) {
        alert(res.message);
        loadAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Database refresh failed.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadMessage('');
    setUploadError('');
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadMessage('');
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await adminService.uploadSpreadsheet(formData);
      if (res.success) {
        setUploadMessage(res.message);
        setFile(null);
        // Clear files inputs on DOM
        document.getElementById('excel-file-input').value = '';
        loadAdminData();
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to upload spreadsheet.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCommodity = async (code) => {
    if (!window.confirm(`Delete ALL records and definitions for ${code.toUpperCase()}? This is irreversible.`)) return;
    
    try {
      const res = await adminService.deleteCommodity(code);
      if (res.success) {
        alert(res.message);
        loadAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Delete operation failed.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Admin Console</h2>
          <p className="text-gray-400 text-sm mt-1">Institutional data overrides, parser configurations and user listings</p>
        </div>
        <button
          onClick={handleRefreshDatabase}
          disabled={refreshing}
          className="luxury-button flex items-center space-x-2 self-start cursor-pointer"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing database...' : 'Trigger Imports Sync'}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel: Upload Excel */}
          <div className="space-y-6 lg:col-span-1">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
              <UploadCloud size={18} className="mr-2 text-accent" />
              <span>Import Workbook</span>
            </h3>

            <GlassCard hover={false} className="p-6">
              <form onSubmit={handleUploadSubmit} className="space-y-5">
                <div>
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    Upload a new precious metal index workbook. Ensure the sheet layout follows standard headers. The engine parses the file and integrates it immediately.
                  </p>

                  <div className="border border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-accent/40 hover:bg-white/5 transition-all">
                    <FileSpreadsheet size={32} className="mx-auto text-gray-500 mb-2" />
                    <input
                      id="excel-file-input"
                      type="file"
                      accept=".xlsx"
                      required
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="excel-file-input" className="text-xs font-semibold text-accent cursor-pointer hover:underline block mb-1">
                      {file ? file.name : 'Click to select spreadsheet'}
                    </label>
                    <span className="text-[10px] text-gray-500 block">Only Excel sheets (.xlsx) supported</span>
                  </div>
                </div>

                {uploadMessage && (
                  <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center">
                    <CheckCircle size={14} className="mr-1.5 shrink-0" />
                    {uploadMessage}
                  </p>
                )}

                {uploadError && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center">
                    <ShieldAlert size={14} className="mr-1.5 shrink-0" />
                    {uploadError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full py-2.5 flex items-center justify-center space-x-2 luxury-button text-sm disabled:opacity-30 disabled:pointer-events-none"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Process Excel Workbook</span>
                  )}
                </button>
              </form>
            </GlassCard>

            {/* Manage Commodities list */}
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center pt-4">
              <Database size={18} className="mr-2 text-accent" />
              <span>Imported Commodities</span>
            </h3>

            <GlassCard hover={false} className="p-4 space-y-3">
              {commodities.map((c) => (
                <div key={c._id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase">{c.name}</h4>
                    <span className="text-[10px] text-gray-500 block mt-0.5">
                      Purities: {c.purities.length} | States: {c.states.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteCommodity(c.code)}
                    className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                    title="Drop Commodity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </GlassCard>
          </div>

          {/* Right panel: Users & Diagnostic logs terminal */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* User directories */}
            <h3 className="text-lg font-bold text-white flex items-center">
              <Users size={18} className="mr-2 text-accent" />
              <span>Registered Accounts</span>
            </h3>
            
            <GlassCard hover={false} className="overflow-x-auto p-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-5">Name</th>
                    <th className="py-3.5 px-5">Email</th>
                    <th className="py-3.5 px-5">Role</th>
                    <th className="py-3.5 px-5">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-5 text-white font-medium">{u.name}</td>
                      <td className="py-3 px-5 text-gray-300">{u.email}</td>
                      <td className="py-3 px-5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white/5 text-gray-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>

            {/* Diagnostic Logs console */}
            <h3 className="text-lg font-bold text-white flex items-center pt-4">
              <Terminal size={18} className="mr-2 text-accent" />
              <span>System Operations Console logs</span>
            </h3>

            <GlassCard hover={false} className="bg-black/80 font-mono text-[11px] p-4 text-emerald-400 border border-emerald-500/10 h-72 flex flex-col justify-between shadow-inner">
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
                {logs.length === 0 ? (
                  <p className="text-gray-600">Console empty. Trigger actions to inspect system diagnostics.</p>
                ) : (
                  logs.map((l) => (
                    <div key={l._id} className="border-b border-white/5 pb-2">
                      <p className="text-gray-500 text-[10px]">{new Date(l.timestamp).toLocaleString()}</p>
                      <p className="mt-0.5">
                        <span className={`font-bold mr-1.5 uppercase ${
                          l.type === 'error' ? 'text-red-400' : l.type === 'import' ? 'text-blue-400' : 'text-emerald-400'
                        }`}>
                          [{l.type}]
                        </span>
                        <span className="text-gray-100">{l.message}</span>
                      </p>
                      {l.details && (
                        <pre className="text-gray-500 text-[10px] mt-1 pl-4 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(l.details)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-white/10 pt-2 text-gray-600 text-[10px] flex justify-between">
                <span>Auditing Stream: online</span>
                <span>Active fallback port: 5000</span>
              </div>
            </GlassCard>
          </div>

        </div>
      )}

    </div>
  );
};

export default AdminPanel;
