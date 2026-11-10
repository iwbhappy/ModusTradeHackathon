export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#E9EEF4',
        surface: '#FFFFFF',
        line: '#D5DDE7',
        steel: '#1F3A5F',
        action: '#1D5FD1',
        attention: '#FAB219',
        graphite: '#0F1B2D',
        muted: '#718096',
        secondary: '#4A5568',
        good: '#0CA30C',
        serious: '#EC835A',
        critical: '#D03B3B',
      },
      fontFamily: { sans: ['Golos Text', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
      borderRadius: { DEFAULT: '4px', sm: '2px', md: '6px', lg: '6px' },
      boxShadow: {
        panel: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10)',
        modal: '0 8px 32px #0F1B2D26',
      },
    },
  },
  plugins: [],
};
