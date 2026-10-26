import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { commodityService } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import GlassCard from '../components/GlassCard';
import Navbar from '../components/Navbar';
import Chatbot from '../components/Chatbot';
import { articles } from '../data/articles';
import { news } from '../data/news';
import { 
  TrendingUp, 
  ShieldCheck, 
  Coins, 
  ChevronRight, 
  PieChart, 
  Zap, 
  LineChart,
  ArrowRight,
  Sparkles,
  BookOpen,
  Newspaper,
  ChevronDown,
  ChevronUp,
  Star,
  ShieldAlert,
  HelpCircle,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  GitCompare,
  Bell,
  Mail,
  Linkedin,
  Twitter,
  ArrowUp,
  TrendingDown,
  Calculator
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { setCommodity } = useTheme();
  
  const [overview, setOverview] = useState([]);
  const [loading, setOverviewLoading] = useState(true);

  // Accordion FAQ states
  const [openFaq, setOpenFaq] = useState(null);

  // Testimonials state
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await commodityService.getMarketOverview();
        if (res.success) {
          setOverview(res.data);
        }
      } catch (err) {
        console.error('Failed to load market overview:', err.message);
      } finally {
        setOverviewLoading(false);
      }
    };
    fetchOverview();
  }, []);

  const handleCommodityClick = (code) => {
    setCommodity(code);
    navigate('/login');
  };

  const faqData = [
    {
      q: "How does BullionVault verify the accuracy of historical pricing?",
      a: "BullionVault utilizes official historical datasets imported directly from registered market aggregates. Every transaction rate, state-wise variance, and quarterly index is backed by verifiable spreadsheet data loaded via the institutional import engine."
    },
    {
      q: "Can I simulate portfolios before committing real assets?",
      a: "Absolutely. The platform includes a comprehensive virtual portfolio simulator. You can record mock gold, silver, platinum, or oil purchases and evaluate performance metrics against live market pricing."
    },
    {
      q: "What tax benefits do Sovereign Gold Bonds (SGB) have compared to physical gold?",
      a: "Sovereign Gold Bonds offer a 2.5% fixed annual interest payout and are 100% tax-exempt on capital gains upon maturity (8 years). Physical gold is subject to LTCG tax at 20% with indexation after 3 years."
    },
    {
      q: "How does the automatic database fallback system function?",
      a: "To guarantee instant uptime, if BullionVault fails to connect to a local MongoDB instance, it spins up an automated in-memory server database in the background, loads all spreadsheets, and configures the workspace seamlessly."
    },
    {
      q: "Can I set price triggers and email notifications?",
      a: "Yes. The Price Alerts console lets you establish custom price ceilings ('Price Rises Above') or floors ('Price Falls Below') for any purity grade or location, generating real-time audit triggers."
    }
  ];

  const testimonials = [
    {
      name: "Navjot Singh",
      role: "Capital Markets Analyst",
      rating: 5,
      review: "BullionVault is an absolute masterclass in commodity trackers. The dynamic visual themes shifting to match active metals are visually stunning. Having state-wise pricing and SGB comparisons on a single screen is incredibly powerful."
    },
    {
      name: "Ananya Sharma",
      role: "Private Portfolio Manager",
      rating: 5,
      review: "The Excel import automation is flawless. Normalizing non-homogeneous schemas into unified analytics handles massive administrative overhead. Truly premium SaaS engineering."
    },
    {
      name: "Aashish Babu",
      role: "Wealth Advisor",
      rating: 5,
      review: "The ROI comparisons against bank Fixed Deposits are highly eye-opening. Most investors underestimate gold's inflation hedge index. BullionVault provides the exact data sets to visualize this clearly."
    },
    {
      name: "Piyush Prasannan",
      role: "Commodities Trader",
      rating: 5,
      review: "TradingView-quality analytics panels, clean responsive layouts, and simple PDF downloads. The chatbot answers localized rates immediately. Excellent platform."
    }
  ];

  // Helper mock sparklines for rendering landing rate trends
  const renderSparkline = (isPositive) => {
    const points = isPositive 
      ? "0,25 10,20 20,22 30,12 40,15 50,5 60,8 70,2"
      : "0,5 10,12 20,10 30,18 40,15 50,22 60,20 70,25";
    const strokeColor = isPositive ? "#10b981" : "#f43f5e";
    const fillColor = isPositive ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)";

    return (
      <svg className="w-16 h-8 text-glow" viewBox="0 0 70 30">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          points={points}
        />
        <path
          fill={fillColor}
          d={`M0,30 L0,${isPositive ? '25' : '5'} ${points.split(' ').slice(1).join(' ')} L70,30 Z`}
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col justify-between overflow-x-hidden selection:bg-accent selection:text-slate-950">
      
      {/* Floating Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative px-6 pt-36 pb-20 lg:pt-48 lg:pb-32 max-w-7xl mx-auto flex flex-col items-center text-center z-10 w-full">
        {/* Animated grid map background */}
        <div className="absolute inset-0 -z-10 opacity-10 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        {/* Premium glowing backdrops */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-accent mb-6 shadow-glass hover:bg-white/10 transition-colors"
        >
          <Sparkles size={14} className="animate-pulse text-accent" />
          <span>Bloomberg & TradingView Quality Platform</span>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-300 to-gray-600 bg-clip-text text-transparent leading-none"
        >
          Institutional Commodity <br/>
          <span className="bg-gradient-to-r from-accent to-amber-500 bg-clip-text text-transparent">
            Asset Intelligence
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-gray-400 text-base md:text-lg max-w-3xl mt-6 font-light leading-relaxed"
        >
          Manage holdings in Gold, Silver, Platinum and Crude Oil. Normalize raw Excel datasets automatically, evaluate variance factors across regions, and compile customized reports instantly.
        </motion.p>

        {/* CTA triggers */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-10 z-20"
        >
          <button 
            onClick={() => navigate('/register')} 
            className="luxury-button flex items-center space-x-2 text-sm shadow-luxury"
          >
            <span>Explore Premium Dashboard</span>
            <ArrowRight size={16} />
          </button>
          <button 
            onClick={() => {
              const el = document.getElementById('live-markets');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }} 
            className="luxury-button-secondary text-sm"
          >
            View Live Markets
          </button>
        </motion.div>

        {/* 3D Floating Assets Simulation */}
        <div className="mt-16 w-full max-w-4xl relative select-none pointer-events-none">
          <div className="absolute -top-12 -left-12 w-28 h-28 bg-gradient-to-br from-amber-400/20 to-amber-600/5 rounded-2xl border border-amber-500/20 rotate-12 blur-sm animate-bounce" style={{ animationDuration: '6s' }} />
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-br from-slate-400/20 to-slate-600/5 rounded-2xl border border-slate-500/20 -rotate-12 blur-sm animate-bounce" style={{ animationDuration: '8s' }} />
        </div>
      </section>

      {/* Live Market section */}
      <section id="live-markets" className="px-6 py-20 max-w-7xl mx-auto w-full relative z-10 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-3">
            Realtime Valuations
          </h2>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white">Supported Commodities</h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-44 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {overview.map((comm) => {
              const isPositive = comm.qoqChangePercent >= 0;
              return (
                <GlassCard 
                  key={comm.code} 
                  onClick={() => handleCommodityClick(comm.code)}
                  className="hover:border-accent/30 group flex flex-col justify-between h-48 p-6 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-accent transition-colors flex items-center">
                        {comm.name}
                      </h3>
                      <p className="text-[10px] text-gray-500 uppercase mt-0.5 font-bold tracking-wider">{comm.unit}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-semibold px-2 py-0.5 bg-white/5 border border-white/5 rounded-full uppercase">
                      {comm.quarter}
                    </span>
                  </div>

                  <div className="my-3 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black text-white tracking-tight">
                        {comm.code === 'crudeoil' ? '$' : '₹'}
                        {Number(comm.latestPrice !== undefined ? comm.latestPrice : (comm.price || 0)).toLocaleString()}
                      </span>
                      <div className="flex items-center mt-1 text-[10px]">
                        {isPositive 
                          ? <ArrowUpRight size={12} className="text-emerald-400 mr-0.5" /> 
                          : <ArrowDownRight size={12} className="text-rose-400 mr-0.5" />
                        }
                        <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                          {isPositive ? '+' : ''}{Number(comm.qoqChangePercent || 0)}% (QoQ)
                        </span>
                      </div>
                    </div>
                    
                    {/* Sparkline trend representation */}
                    {renderSparkline(isPositive)}
                  </div>

                  <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[10px] text-gray-500 font-semibold">
                    <span>Evaluate pricing indexes</span>
                    <ChevronRight size={14} className="text-gray-500 group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>

      {/* Why BullionVault Benefits */}
      <section id="why-bullionvault" className="px-6 py-20 max-w-7xl mx-auto w-full relative z-10 border-t border-white/5 bg-[#0B0F19]/25">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-3">Institutional Benefits</h2>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white">Why Investors Choose BullionVault</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <GlassCard hover={false} className="p-6 space-y-4">
            <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center text-accent">
              <Database size={20} />
            </div>
            <h4 className="font-bold text-white">Institution-grade historical database</h4>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Access clean historical price registries across all quarters. The normalizer processes raw files, compiling records securely inside Mongoose.
            </p>
          </GlassCard>

          <GlassCard hover={false} className="p-6 space-y-4">
            <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center text-accent">
              <GitCompare size={20} />
            </div>
            <h4 className="font-bold text-white">State-wise price analysis</h4>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Evaluate retail cost variances across Indian states, identifying price premiums and cheapest markets for purchase decisions.
            </p>
          </GlassCard>

          <GlassCard hover={false} className="p-6 space-y-4">
            <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center text-accent">
              <Calculator size={20} />
            </div>
            <h4 className="font-bold text-white">Advanced ROI calculators</h4>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Determine investment returns, compound metrics, and allocations. Compare yields directly against bank Fixed Deposit benchmarks.
            </p>
          </GlassCard>

          <GlassCard hover={false} className="p-6 space-y-4">
            <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center text-accent">
              <Bell size={20} />
            </div>
            <h4 className="font-bold text-white">Automated price alerts</h4>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Configure trigger ceilings or floors for state locations, grades, or weights, generating immediate console alerts on target rates.
            </p>
          </GlassCard>

          <GlassCard hover={false} className="p-6 space-y-4">
            <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center text-accent">
              <Sparkles size={20} />
            </div>
            <h4 className="font-bold text-white">AI market insights</h4>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Generate analytics summaries, moving averages, standard deviation trends, and pricing comparisons across different metals.
            </p>
          </GlassCard>

          <GlassCard hover={false} className="p-6 space-y-4">
            <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center text-accent">
              <ShieldCheck size={20} />
            </div>
            <h4 className="font-bold text-white">Secure SGB vs ETF analysis</h4>
            <p className="text-xs text-gray-400 leading-relaxed font-light">
              Review tax benefits, interest payments, liquidity profiles, and costs to optimize allocations between paper bonds and physical assets.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="core-features" className="px-6 py-20 max-w-7xl mx-auto w-full relative z-10 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-3">Comprehensive Suite</h2>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white">Core Platform Capabilities</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 text-center">
          {[
            "Historical Price Database",
            "State-wise Price Analysis",
            "Commodity Comparison",
            "Portfolio Management",
            "Investment Return Calculator",
            "Excel Import Engine",
            "Quarterly Analytics",
            "Price Alerts Panel",
            "Market Watchlist Dashboard",
            "Export Reports (Excel/CSV/PDF)",
            "AI Market Insights",
            "Interactive Graph Analytics",
            "Advanced Filtering Engine",
            "Historical Trends Timeline",
            "Data Visualizations",
            "Multi Commodity Tracking"
          ].map((feat, index) => (
            <GlassCard key={index} hover={true} className="p-5 border-white/5 hover:border-accent/10 flex flex-col justify-center items-center h-32">
              <span className="text-xs font-bold text-gray-200">{feat}</span>
              <span className="text-[9px] text-accent font-semibold uppercase mt-2">Enabled</span>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Recent Articles */}
      <section id="recent-articles" className="px-6 py-20 max-w-7xl mx-auto w-full relative z-10 border-t border-white/5 bg-[#0B0F19]/20">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-3">Investment Knowledge</h2>
            <h3 className="text-2xl md:text-3xl font-extrabold text-white">Latest Articles</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.slice(0, 6).map((art) => (
            <Link key={art.id} to={`/articles/${art.id}`} className="block group">
              <GlassCard className="p-6 h-60 flex flex-col justify-between hover:border-accent/30 group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] text-gray-500 font-extrabold uppercase">
                    <span className="text-accent">{art.category}</span>
                    <span>{art.publishDate}</span>
                  </div>
                  <h4 className="text-base font-bold text-white group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h4>
                  <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed font-light">
                    {art.preview}
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 pt-4 border-t border-white/5">
                  <span className="font-semibold text-gray-400">{art.author}</span>
                  <span className="flex items-center">
                    <BookOpen size={12} className="mr-1" />
                    {art.readingTime}
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>

      {/* Market News */}
      <section id="market-news" className="px-6 py-20 max-w-7xl mx-auto w-full relative z-10 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-3">Realtime Stream</h2>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white">Latest Market News</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {news.slice(0, 8).map((ns) => (
            <Link key={ns.id} to={`/news/${ns.id}`} className="block group">
              <GlassCard className="p-5 flex items-center justify-between hover:border-accent/30 group">
                <div className="space-y-2 pr-4 flex-1">
                  <div className="flex items-center space-x-2 text-[9px] text-gray-500 font-bold">
                    <span className="text-gray-400 font-semibold">{ns.source}</span>
                    <span>•</span>
                    <span>{ns.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                    {ns.headline}
                  </h4>
                  <p className="text-xs text-gray-400 line-clamp-2 font-light leading-relaxed">
                    {ns.summary}
                  </p>
                </div>
                <div className="p-2 border border-white/5 group-hover:border-accent/30 rounded-xl bg-white/5 text-gray-400 group-hover:text-accent transition-all shrink-0">
                  <Newspaper size={18} />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs-accordion" className="px-6 py-20 max-w-4xl mx-auto w-full relative z-10 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-3">Platform Queries</h2>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-4">
          {faqData.map((faq, index) => {
            const isFaqOpen = openFaq === index;
            return (
              <GlassCard key={index} hover={false} className="border-white/5 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(isFaqOpen ? null : index)}
                  className="w-full p-5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-white">{faq.q}</span>
                  {isFaqOpen ? <ChevronUp size={16} className="text-accent" /> : <ChevronDown size={16} className="text-gray-500" />}
                </button>

                <AnimatePresence initial={false}>
                  {isFaqOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-5 pb-5 text-xs text-gray-400 leading-relaxed font-light border-t border-white/5 pt-4 bg-[#0B0F19]/20">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Testimonials section */}
      <section className="px-6 py-20 max-w-5xl mx-auto w-full relative z-10 border-t border-white/5 bg-[#0B0F19]/25">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-3">Client Feedback</h2>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white">What Professionals Say</h3>
        </div>

        <div className="relative h-64 md:h-56 flex flex-col justify-between">
          <GlassCard hover={false} className="p-6 md:p-8 flex flex-col justify-between h-full border-white/5 bg-gray-900/50">
            <p className="text-xs sm:text-sm text-gray-300 italic leading-relaxed font-light">
              "{testimonials[activeTestimonial].review}"
            </p>
            <div className="flex justify-between items-center mt-6">
              <div>
                <h4 className="font-bold text-white text-xs">{testimonials[activeTestimonial].name}</h4>
                <p className="text-[10px] text-gray-500 font-semibold">{testimonials[activeTestimonial].role}</p>
              </div>
              <div className="flex space-x-1">
                {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                  <Star key={i} size={12} className="fill-accent text-accent" />
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Carousel controls */}
        <div className="flex justify-center space-x-2 mt-6">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTestimonial(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                activeTestimonial === idx ? 'bg-accent w-6' : 'bg-gray-700 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Luxury Footer */}
      <footer className="border-t border-white/5 bg-[#06080f] text-xs text-gray-500 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
          
          <div className="space-y-4">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="BullionVault Logo" 
                className="h-8 w-auto"
              />
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed font-light">
              An institutional asset intelligence terminal providing multi-dimensional commodity variance and ROI analytics.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-accent"><Twitter size={16} /></a>
              <a href="#" className="hover:text-accent"><Linkedin size={16} /></a>
              <a href="#" className="hover:text-accent"><Mail size={16} /></a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2.5 font-semibold text-[11px]">
              <li><button onClick={() => { const el = document.getElementById('live-markets'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer text-left">Market Overview</button></li>
              <li><button onClick={() => { const el = document.getElementById('why-bullionvault'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer text-left">Investor Benefits</button></li>
              <li><button onClick={() => { const el = document.getElementById('core-features'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer text-left">Core Capabilities</button></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-white transition-colors cursor-pointer text-left">Investment Terminal</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Content Resources</h4>
            <ul className="space-y-2.5 font-semibold text-[11px]">
              <li><button onClick={() => { const el = document.getElementById('recent-articles'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer text-left">Articles Index</button></li>
              <li><button onClick={() => { const el = document.getElementById('market-news'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer text-left">Market News Stream</button></li>
              <li><button onClick={() => { const el = document.getElementById('faqs-accordion'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer text-left">FAQs Accordion</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Support & Contact</h4>
            <p className="text-[11px] text-gray-400 font-light leading-relaxed">
              Institutional API integrations, Bloomberg data feed configs, and user compliance support.
            </p>
            <p className="text-[11px] text-accent font-bold mt-3">support@bullionvault.in</p>
          </div>
        </div>

        <div className="border-t border-white/5 py-6 px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-600">
          <p>&copy; {new Date().getFullYear()} BullionVault Platform. Developed for HNW commodity portfolio management. All rights reserved.</p>
          
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center space-x-1.5 text-gray-500 hover:text-white transition-colors font-bold uppercase mt-4 sm:mt-0 cursor-pointer"
          >
            <span>Back to Top</span>
            <ArrowUp size={12} />
          </button>
        </div>
      </footer>

      {/* Floating Chatbot */}
      <Chatbot />

    </div>
  );
};

export default Landing;
