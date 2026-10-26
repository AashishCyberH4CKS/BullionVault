import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { watchlistService, commodityService } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import GlassCard from '../components/GlassCard';
import { 
  Eye, 
  Trash2, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedCommId, setSelectedCommId] = useState('');

  const navigate = useNavigate();
  const { setCommodity } = useTheme();

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      const [watchRes, commRes] = await Promise.all([
        watchlistService.getWatchlist(),
        commodityService.getCommodities()
      ]);

      if (watchRes.success) setWatchlist(watchRes.data);
      if (commRes.success) {
        setCommodities(commRes.data);
        if (commRes.data.length > 0) {
          setSelectedCommId(commRes.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load watchlist:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedCommId) return;

    setAdding(true);
    try {
      const res = await watchlistService.addToWatchlist(selectedCommId);
      if (res.success) {
        loadWatchlist();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Commodity already in watchlist.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      const res = await watchlistService.removeFromWatchlist(id);
      if (res.success) {
        loadWatchlist();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove from watchlist.');
    }
  };

  const handleInspect = (code) => {
    setCommodity(code);
    navigate('/market');
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Market Watchlist</h2>
          <p className="text-gray-400 text-sm mt-1">Favourite commodity trackers for rapid market access</p>
        </div>

        {/* Quick Add Form */}
        {commodities.length > 0 && (
          <form onSubmit={handleAdd} className="flex space-x-2 self-start">
            <select
              value={selectedCommId}
              onChange={(e) => setSelectedCommId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-accent"
            >
              {commodities.map(c => (
                <option key={c._id} value={c._id} className="bg-[#0B0F19] text-white">{c.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={adding}
              className="luxury-button py-2 px-4 text-xs flex items-center space-x-1"
            >
              <Plus size={14} />
              <span>Watch</span>
            </button>
          </form>
        )}
      </div>

      {loading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : watchlist.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-white/5 rounded-full text-gray-500">
            <Eye size={28} />
          </div>
          <p className="text-gray-400 text-sm">Your watchlist is currently empty.</p>
          <p className="text-xs text-gray-500 max-w-sm">Use the dropdown menu above to add commodities to your quick-access favorites panel.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchlist.map((item) => {
            const isPositive = item.qoqChangePercent >= 0;
            return (
              <GlassCard 
                key={item._id}
                className="p-6 h-48 flex flex-col justify-between hover:border-accent/30 group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-accent transition-colors flex items-center">
                      {item.name}
                      <Sparkles size={14} className="ml-1.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 uppercase font-semibold">Latest: {item.quarter}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(item._id)}
                    className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Remove Favorite"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="my-2 flex justify-between items-baseline">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    {item.code === 'crudeoil' ? '$' : '₹'}
                    {Number(item.latestPrice !== undefined ? item.latestPrice : (item.price || 0)).toLocaleString()}
                  </span>
                  
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center ${
                    isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {isPositive ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
                    {isPositive ? '+' : ''}{item.qoqChangePercent}%
                  </span>
                </div>

                <div 
                  onClick={() => handleInspect(item.code)}
                  className="border-t border-white/5 pt-3 flex items-center justify-between text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  <span>Launch trading chart</span>
                  <ChevronRight size={14} className="text-gray-500 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Watchlist;
