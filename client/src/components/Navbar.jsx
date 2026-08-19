import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { Menu, X, ArrowRight, User } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (sectionId, path = '/') => {
    setMobileMenuOpen(false);
    
    if (location.pathname !== '/') {
      navigate(path);
      // Wait for navigation before scrolling
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const navLinks = [
    { label: 'Markets', section: 'live-markets' },
    { label: 'Benefits', section: 'why-bullionvault' },
    { label: 'Features', section: 'core-features' },
    { label: 'Articles', section: 'recent-articles' },
    { label: 'News', section: 'market-news' },
    { label: 'FAQs', section: 'faqs-accordion' },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-out border-b ${
      scrolled 
        ? 'py-3.5 bg-[#0B0F19]/90 border-white/5 shadow-glass backdrop-blur-md' 
        : 'py-5 bg-transparent border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); navigate('/'); }}
          className="flex items-center space-x-2.5 cursor-pointer select-none group"
        >
          <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-luxury group-hover:scale-105 transition-transform duration-300">
            <span className="text-lg font-bold text-slate-950">👑</span>
          </div>
          <span className="text-md font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent group-hover:text-white transition-colors">
            BullionVault
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center space-x-1">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.section)}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-400 hover:text-accent rounded-lg hover:bg-white/5 transition-all duration-300 cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="hidden lg:flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/dashboard')} 
                className="luxury-button py-2 px-5 text-xs flex items-center space-x-1.5"
              >
                <User size={14} />
                <span>Investment Terminal</span>
              </button>
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : (
            <>
              <button 
                onClick={() => navigate('/login')} 
                className="luxury-button-secondary py-2 px-5 text-xs"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')} 
                className="luxury-button py-2 px-5 text-xs flex items-center space-x-1"
              >
                <span>Get Started</span>
                <ArrowRight size={12} />
              </button>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-gray-400 hover:text-white bg-white/5 border border-white/5 rounded-xl transition-all cursor-pointer"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-[#0B0F19]/95 border-b border-white/5 shadow-glass backdrop-blur-lg py-6 px-6 space-y-4 animate-fade-in">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.section)}
                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-400 hover:text-accent hover:bg-white/5 rounded-xl transition-all"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="border-t border-white/5 pt-4 flex flex-col space-y-3">
            {user ? (
              <div className="flex flex-col space-y-3 items-center">
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                  className="w-full text-center luxury-button py-2.5 text-sm"
                >
                  Go to Terminal
                </button>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                  className="w-full text-center luxury-button-secondary py-2.5 text-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}
                  className="w-full text-center luxury-button py-2.5 text-sm"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
