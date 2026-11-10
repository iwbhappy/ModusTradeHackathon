export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { canvas: '#F5F6F8', surface: '#FFFFFF', line: '#DDE1E6', steel: '#1E3A5F', action: '#2457A6', attention: '#C77700', graphite: '#1B2430' },
    fontFamily: { sans: ['Golos Text', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
    borderRadius: { DEFAULT: '4px', sm: '2px', md: '6px', lg: '6px' },
    boxShadow: { panel: '0 2px 8px #1B24300A', modal: '0 8px 32px #1B243026' }
  } }, plugins: []
};
