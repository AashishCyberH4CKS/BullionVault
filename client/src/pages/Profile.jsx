import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import { 
  User, 
  Lock, 
  Settings, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  
  const [name, setName] = useState(user ? user.name : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [themePreference, setThemePreference] = useState(user?.settings?.themePreference || 'gold');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.settings?.notificationsEnabled ?? true);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Investor Settings</h2>
        <p className="text-gray-400 text-sm mt-1">Manage credentials, display parameters and alert alerts preferences</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-center space-x-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-center space-x-2">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-8">
        
        {/* Basic profile info card */}
        <GlassCard hover={false} className="p-6 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center">
            <User size={18} className="mr-2 text-accent" />
            <span>Profile Information</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Investor Name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Registered Email Address</label>
              <input
                type="email"
                disabled
                value={user ? user.email : ''}
                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-gray-500 text-sm focus:outline-none opacity-50 cursor-not-allowed"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Email addresses cannot be modified.</span>
            </div>
          </div>
        </GlassCard>

        {/* Change password card */}
        <GlassCard hover={false} className="p-6 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Lock size={18} className="mr-2 text-accent" />
            <span>Security Credentials</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </GlassCard>

        {/* Theme and Preferences card */}
        <GlassCard hover={false} className="p-6 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Settings size={18} className="mr-2 text-accent" />
            <span>Preferences & Settings</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Preferred Fallback Theme Accent */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Default Base Theme Accent</label>
              <select
                value={themePreference}
                onChange={(e) => setThemePreference(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-accent"
              >
                <option value="gold" className="bg-[#0B0F19] text-white">Luxury Gold</option>
                <option value="silver" className="bg-[#0B0F19] text-white">Metallic Silver</option>
                <option value="platinum" className="bg-[#0B0F19] text-white">Platinum White</option>
                <option value="crudeoil" className="bg-[#0B0F19] text-white">Amber Copper</option>
              </select>
            </div>

            {/* Notifications Toggle */}
            <div className="flex flex-col justify-center">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Alert Price Notifications</label>
              <div className="flex items-center space-x-3 mt-1">
                <input
                  id="notifications"
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="w-4 h-4 text-accent border-white/10 rounded focus:ring-accent bg-white/5 accent-accent"
                />
                <label htmlFor="notifications" className="text-sm text-gray-300 font-medium cursor-pointer">
                  Enable alerts triggers console notification audits
                </label>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="luxury-button px-8 py-3 text-sm font-semibold shadow-md"
          >
            {saving ? 'Saving changes...' : 'Save Configuration'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default Profile;
