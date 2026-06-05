// tailwind.config.cjs
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        backgroundStart: '#E8DEF8', // Soft Lavender
        backgroundEnd: '#D0F0E8',   // Pale Mint
        glassBase: 'rgba(255, 255, 255, 0.25)', // Frosted White
        glassBorder: 'rgba(255, 255, 255, 0.5)', // Subtle White
        primaryText: '#1E2A3A', // Deep Slate
        secondaryText: '#5B6C7E', // Soft Gray
        accentPositive: '#FFB7B2', // Warm Peach
        accentNegative: '#A0D2E4', // Soft Blue
      },
      backgroundImage: {
        'gradient-bg': 'linear-gradient(to bottom, #E8DEF8, #D0F0E8)',
      },
    },
  },
  plugins: [],
};
