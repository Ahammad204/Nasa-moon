/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep-space palette: near-black base, elevation via lightness.
        space: {
          950: '#0a0e17',
          900: '#101827',
          850: '#162032',
          800: '#1c2740',
          700: '#263349',
        },
        // Single accent — the signal color for CTA / links / active states.
        accent: {
          DEFAULT: '#38bdf8',
          dim: '#0e4a6f',
        },
        // Semantic signals (status only): positive / warning / danger.
        signal: {
          ok: '#34d399',
          warn: '#fbbf24',
          danger: '#fb7185',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(56, 189, 248, 0.35), 0 4px 24px rgba(56, 189, 248, 0.12)',
        panel: '0 8px 32px rgba(2, 6, 16, 0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        nebula: {
          '0%': { transform: 'translate3d(-2%, -1%, 0) scale(1)' },
          '100%': { transform: 'translate3d(2%, 1%, 0) scale(1.08)' },
        },
        'marker-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 0 2px rgba(56,189,248,.55), 0 0 12px 4px rgba(56,189,248,.35)',
          },
          '50%': {
            boxShadow: '0 0 0 5px rgba(56,189,248,.2), 0 0 22px 8px rgba(56,189,248,.12)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 200ms ease-out both',
        'fade-in': 'fade-in 250ms ease-out both',
        nebula: 'nebula 80s ease-in-out infinite alternate',
        'marker-pulse': 'marker-pulse 2.4s ease-in-out infinite',
        shimmer: 'shimmer 8s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
