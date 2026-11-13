import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import '@fontsource/golos-text/latin-400.css';
import '@fontsource/golos-text/cyrillic-400.css';
import '@fontsource/golos-text/latin-500.css';
import '@fontsource/golos-text/cyrillic-500.css';
import '@fontsource/golos-text/latin-600.css';
import '@fontsource/golos-text/cyrillic-600.css';
import '@fontsource/golos-text/latin-700.css';
import '@fontsource/golos-text/cyrillic-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/cyrillic-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/cyrillic-500.css';
import App from './App';
import './styles.css';
import './visual.css';
import './themes/md3.css';
import { initializeDesign } from './themes/design';
initializeDesign();

// Streamlit embeds the app in an iframe without its own URL, so routes live in memory there.
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter;
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
