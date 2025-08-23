/**** Tailwind config for NativeWind ****/
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primaryStart: '#0B1736',
          primaryEnd: '#000814',
          accent: '#2563EB',
          focus: '#38BDF8',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          surface: '#0A0F1A',
          text: '#E6EAF2',
          muted: '#93A4BD'
        }
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #0B1736 0%, #000814 100%)'
      }
    }
  },
  plugins: []
};
