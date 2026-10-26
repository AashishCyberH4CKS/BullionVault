/**
 * Safe number and currency formatting utilities
 * Prevents TypeError: Cannot read properties of undefined (reading 'toLocaleString')
 */

export const safeNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

export const formatCurrency = (value, currencySymbol = '₹', locale = 'en-IN', options = {}) => {
  const num = safeNumber(value, 0);
  return `${currencySymbol}${num.toLocaleString(locale, options)}`;
};

export const formatNumber = (value, locale = 'en-IN', options = {}) => {
  const num = safeNumber(value, 0);
  return num.toLocaleString(locale, options);
};

export const formatPercent = (value, decimals = 2) => {
  const num = safeNumber(value, 0);
  return `${num >= 0 ? '+' : ''}${num.toFixed(decimals)}%`;
};
