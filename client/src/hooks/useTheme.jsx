import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEMES = {
  gold: {
    name: 'Luxury Gold',
    color: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.4)',
    muted: 'rgba(255, 215, 0, 0.05)',
    gradient: 'linear-gradient(135deg, #FFE259 0%, #FFA751 100%)'
  },
  silver: {
    name: 'Metallic Silver',
    color: '#CBD5E1',
    glow: 'rgba(203, 213, 225, 0.35)',
    muted: 'rgba(203, 213, 225, 0.05)',
    gradient: 'linear-gradient(135deg, #E2E8F0 0%, #64748B 100%)'
  },
  platinum: {
    name: 'Platinum Glow',
    color: '#F8FAFC',
    glow: 'rgba(248, 250, 252, 0.35)',
    muted: 'rgba(248, 250, 252, 0.05)',
    gradient: 'linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)'
  },
  crudeoil: {
    name: 'Energy Copper',
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
    muted: 'rgba(249, 115, 22, 0.05)',
    gradient: 'linear-gradient(135deg, #F97316 0%, #B45309 100%)'
  },
  copper: {
    name: 'Industrial Bronze',
    color: '#B87333',
    glow: 'rgba(184, 115, 51, 0.4)',
    muted: 'rgba(184, 115, 51, 0.05)',
    gradient: 'linear-gradient(135deg, #E58E49 0%, #783F1A 100%)'
  }
};

export const ThemeProvider = ({ children }) => {
  const [commodity, setCommodityState] = useState('gold');
  const [dynamicThemes, setDynamicThemes] = useState({});

  const setCommodity = (code) => {
    const cleanCode = code ? code.toLowerCase().replace(/\s+/g, '') : 'gold';
    if (THEMES[cleanCode] || dynamicThemes[cleanCode]) {
      setCommodityState(cleanCode);
    } else {
      // Deterministically generate a theme based on commodity code
      let hash = 0;
      for (let i = 0; i < cleanCode.length; i++) {
        hash = cleanCode.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash % 360);
      const color = `hsl(${hue}, 85%, 55%)`;
      const glow = `hsla(${hue}, 85%, 55%, 0.4)`;
      const muted = `hsla(${hue}, 85%, 55%, 0.05)`;
      const gradient = `linear-gradient(135deg, hsl(${hue}, 90%, 65%) 0%, hsl(${(hue + 30) % 360}, 90%, 45%) 100%)`;

      const generatedTheme = {
        name: code.charAt(0).toUpperCase() + code.slice(1),
        color,
        glow,
        muted,
        gradient
      };

      setDynamicThemes(prev => ({ ...prev, [cleanCode]: generatedTheme }));
      setCommodityState(cleanCode);
    }
  };

  const getActiveTheme = () => {
    return THEMES[commodity] || dynamicThemes[commodity] || THEMES.gold;
  };

  useEffect(() => {
    const theme = getActiveTheme();
    const root = document.documentElement;
    
    // Apply styling transition styles dynamically to root
    root.style.setProperty('--accent-color', theme.color);
    root.style.setProperty('--accent-glow', theme.glow);
    root.style.setProperty('--accent-muted', theme.muted);
    root.style.setProperty('--accent-gradient', theme.gradient);
  }, [commodity, dynamicThemes]);

  return (
    <ThemeContext.Provider value={{ commodity, setCommodity, themes: { ...THEMES, ...dynamicThemes }, activeTheme: getActiveTheme() }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
