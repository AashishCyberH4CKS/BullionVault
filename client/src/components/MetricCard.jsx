import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';


const MetricCard = ({ title, value, subtext, change, changePercent, trend, icon: Icon, isCurrency = true, currencySymbol = '₹' }) => {
  const isPositive = trend === 'Increase' || (changePercent && parseFloat(changePercent) > 0);
  const isNegative = trend === 'Decrease' || (changePercent && parseFloat(changePercent) < 0);

  const formattedValue = typeof value === 'number' 
    ? (isCurrency 
        ? `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
        : value.toLocaleString())
    : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card glass-card-hover p-6 flex flex-col justify-between h-40 shadow-glass relative overflow-hidden group border-t-2 border-accent/20"
    >
      {/* Premium Shimmer Overlay */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 ease-out pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-white mt-2.5 tracking-tight group-hover:text-accent transition-colors duration-300">
            {formattedValue}
          </h3>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-accent shadow-luxury group-hover:scale-105 transition-transform duration-300">
          {Icon ? <Icon size={20} className="stroke-[1.8]" /> : <TrendingUp size={20} />}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between relative z-10">
        {changePercent !== undefined && changePercent !== null ? (
          <div className={`flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full ${
            isPositive 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : isNegative 
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                : 'bg-white/5 text-gray-400 border border-white/10'
          }`}>
            {isPositive ? <ArrowUpRight size={12} className="mr-0.5" /> : isNegative ? <ArrowDownRight size={12} className="mr-0.5" /> : null}
            <span>{isPositive ? '+' : ''}{changePercent}%</span>
          </div>
        ) : (
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Stable</div>
        )}
        <span className="text-[10px] text-gray-500 font-semibold truncate max-w-[65%] uppercase tracking-wider">{subtext || trend || 'No change'}</span>
      </div>
    </motion.div>
  );
};

export default MetricCard;
