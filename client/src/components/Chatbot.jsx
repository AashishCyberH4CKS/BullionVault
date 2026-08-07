import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { commodityService } from '../services/api';
import GlassCard from './GlassCard';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  HelpCircle,
  TrendingUp,
  Calculator,
  UserCheck
} from 'lucide-react';

const Chatbot = () => {
  const { activeTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Welcome to BullionVault Premium Assistant. I can explain market rates, help calculate returns, or guide you through your dashboard features. What are you looking to analyze today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [rates, setRates] = useState({});

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Load current rates for intelligent replies
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await commodityService.getMarketOverview();
        if (res.success) {
          const ratesMap = {};
          res.data.forEach(item => {
            ratesMap[item.code] = item;
          });
          setRates(ratesMap);
        }
      } catch (err) {
        console.error('Chatbot rates sync failed:', err.message);
      }
    };
    fetchRates();
  }, []);

  const getBotResponse = (query) => {
    const q = query.toLowerCase();
    
    // Rates queries
    if (q.includes('gold price') || q.includes('gold rate') || q.includes('rate of gold')) {
      const rate = rates.gold;
      if (rate) {
        return `The latest recorded spot rate for Gold is ₹${rate.latestPrice.toLocaleString()} per ${rate.unit} (${rate.quarter}). The QoQ trend is ${rate.qoqChangePercent >= 0 ? 'up' : 'down'} by ${rate.qoqChangePercent}%.`;
      }
      return "The current market rate for 24K Gold in India is approximately ₹82,500 per 10 grams (Q2 2026).";
    }
    
    if (q.includes('silver price') || q.includes('silver rate') || q.includes('rate of silver')) {
      const rate = rates.silver;
      if (rate) {
        return `The latest spot rate for Silver stands at ₹${rate.latestPrice.toLocaleString()} per ${rate.unit} (${rate.quarter}). Growth has registered ${rate.qoqChangePercent}%.`;
      }
      return "The latest Silver index price is approximately ₹95,000 per Kilogram (Q2 2026).";
    }

    if (q.includes('platinum price') || q.includes('platinum rate') || q.includes('rate of platinum')) {
      const rate = rates.platinum;
      if (rate) {
        return `Platinum spot index stands at ₹${rate.latestPrice.toLocaleString()} per ${rate.unit} (${rate.quarter}). Trend index is ${rate.qoqChangePercent}%.`;
      }
      return "Platinum spot rate stands at ₹51,000 per 10 grams (Q2 2026).";
    }

    if (q.includes('crude oil') || q.includes('oil price') || q.includes('rate of oil')) {
      const rate = rates.crudeoil;
      if (rate) {
        return `Crude Oil benchmark index stands at $${rate.latestPrice.toLocaleString()} per ${rate.unit} (${rate.quarter}), showing a QoQ return of ${rate.qoqChangePercent}%.`;
      }
      return "Crude Oil Brent futures trade at approximately $6,848.4 per Barrel (Q2 2026).";
    }

    // Calculator / ROI
    if (q.includes('roi') || q.includes('return') || q.includes('calculate')) {
      return "You can use the 'Investment ROI Calculator' in the sidebar panel. It allows you to simulate acquisition costs, calculate returns over different years, and compare yield values directly against typical bank Fixed Deposits (FDs).";
    }

    // Portfolio
    if (q.includes('portfolio') || q.includes('holdings') || q.includes('my investment')) {
      return "The 'Holdings Portfolio' helps you track purchase transactions. Once you input a transaction (date, state, purity, weight, price), the system auto-valuates its current value and ROI based on the latest database indexes.";
    }

    // Alerts
    if (q.includes('alert') || q.includes('notify') || q.includes('trigger')) {
      return "Establish automated alerts by going to the 'Price Triggers' panel. You can configure 'Price Rises Above' or 'Price Falls Below' parameters for any state, grade, or weight option.";
    }

    // Articles/Scams/BIS
    if (q.includes('scam') || q.includes('hallmark') || q.includes('huid') || q.includes('avoid fraud')) {
      return "Ensure all physical gold items purchased bear the BIS Hallmark logo, the purity code (e.g. 916 for 22K), and the 6-digit laser-marked Hallmark Unique Identification (HUID) code. You can verify this in the BIS Care App.";
    }

    if (q.includes('sgb') || q.includes('sovereign gold bond') || q.includes('etf')) {
      return "Sovereign Gold Bonds (SGB) offer a 2.5% fixed annual coupon and are completely tax-exempt at maturity. Gold ETFs trade on exchanges and offer higher liquidity, but carry asset management charges.";
    }

    // Navigation
    if (q.includes('admin') || q.includes('upload') || q.includes('import')) {
      return "The 'Admin Console' allows uploading spreadsheets (.xlsx) to update the database. If you have admin privileges, you can upload new files and view real-time system logs.";
    }

    return "I can fetch live prices for Gold, Silver, Platinum or Crude Oil, explain dashboard tools, and guide you through SGB or jewelry calculations. Ask me something specific like 'Gold rate today' or 'How SGB works'!";
  };

  const handleSend = (textToSend = input) => {
    if (!textToSend.trim()) return;

    // User message
    const userMsg = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulated response delay
    setTimeout(() => {
      const responseText = getBotResponse(textToSend);
      const botMsg = {
        sender: 'bot',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 800);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const suggestedPrompts = [
    { text: "Gold rate in India", icon: <TrendingUp size={12} /> },
    { text: "Compare SGB vs Gold ETF", icon: <HelpCircle size={12} /> },
    { text: "How does the calculator work?", icon: <Calculator size={12} /> },
    { text: "Verify HUID hallmarks", icon: <UserCheck size={12} /> }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'var(--accent-gradient, linear-gradient(to right, #fbbf24, #d97706))',
            boxShadow: '0 4px 20px 0 var(--accent-glow, rgba(251, 191, 36, 0.3))'
          }}
          className="w-14 h-14 rounded-full flex items-center justify-center text-[#0B0F19] hover:scale-105 transition-all duration-300 cursor-pointer group"
        >
          <MessageSquare size={24} className="group-hover:rotate-6 transition-transform" />
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <GlassCard 
          hover={false} 
          className="w-85 sm:w-96 h-[500px] flex flex-col justify-between shadow-2xl border-white/10 animate-fade-in"
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center shadow-luxury">
                <Sparkles size={16} className="text-slate-950" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">Vault Intelligence Bot</h4>
                <span className="text-[10px] text-accent font-semibold flex items-center">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
                  Live Market System Online
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-500 hover:text-white bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((m, index) => {
              const isBot = m.sender === 'bot';
              return (
                <div key={index} className={`flex ${isBot ? 'justify-start' : 'justify-end'} items-end space-x-2`}>
                  {isBot && (
                    <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] shrink-0 text-accent font-bold">
                      BV
                    </div>
                  )}
                  <div className={`max-w-[75%] p-3 rounded-2xl ${
                    isBot 
                      ? 'bg-white/5 text-gray-300 border border-white/5 rounded-bl-none' 
                      : 'bg-accent text-slate-950 font-medium rounded-br-none'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    <span className={`text-[8px] block mt-1 text-right ${isBot ? 'text-gray-500' : 'text-slate-950/70'}`}>
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start items-end space-x-2">
                <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] shrink-0 text-accent font-bold">
                  BV
                </div>
                <div className="bg-white/5 border border-white/5 text-gray-400 p-3 rounded-2xl rounded-bl-none flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick suggestions pills */}
          {messages.length === 1 && (
            <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-white/5 bg-white/5">
              {suggestedPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p.text)}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 rounded-full text-[10px] text-gray-400 hover:text-white transition-all cursor-pointer font-medium"
                >
                  {p.icon}
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Chat Input */}
          <div className="p-3 border-t border-white/5 bg-[#0B0F19]/50 flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about rates, ROI, or guides..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-accent"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-2.5 bg-accent hover:bg-amber-500 text-slate-950 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Send size={14} />
            </button>
          </div>

        </GlassCard>
      )}

    </div>
  );
};

export default Chatbot;
