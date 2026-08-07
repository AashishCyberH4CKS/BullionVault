import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import GlassCard from '../components/GlassCard';
import { Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const res = await authService.forgotPassword({ email, newPassword });
      if (res.success) {
        setMessage(res.message || 'Password updated successfully! Redirecting...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Email not registered.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] px-6 py-12 relative">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-glow rounded-full blur-3xl opacity-30 pointer-events-none" />

      <GlassCard hover={false} className="w-full max-w-md p-8 shadow-glass border border-white/5 relative z-10">
        
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-luxury mb-4">
            <span className="text-2xl font-bold text-slate-950">👑</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Recover Credentials</h2>
          <p className="text-gray-400 text-sm mt-1 font-light">Reset your secure key access</p>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-center space-x-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-4 mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-center space-x-2">
            <ShieldCheck size={18} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Registered Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="investor@bullionvault.com"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">New Secure Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 mt-4 flex items-center justify-center space-x-2 luxury-button"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Reset Access Password</span>
            )}
          </button>
        </form>

        <p className="text-sm text-gray-400 text-center mt-8 font-light">
          Remember details?{' '}
          <Link to="/login" className="text-accent font-semibold hover:text-accent/85 transition-colors">
            Sign In
          </Link>
        </p>
      </GlassCard>
    </div>
  );
};

export default ForgotPassword;
