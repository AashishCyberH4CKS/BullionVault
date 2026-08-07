/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent-color, #FFD700)',
          glow: 'var(--accent-glow, rgba(255, 215, 0, 0.4))',
          muted: 'var(--accent-muted, rgba(255, 215, 0, 0.1))',
        },
        bg: {
          dark: '#0B0F19',
          card: 'rgba(17, 24, 39, 0.7)',
          border: 'rgba(255, 255, 255, 0.08)',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        luxury: '0 0 25px -5px var(--accent-glow, rgba(255, 215, 0, 0.15))',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
