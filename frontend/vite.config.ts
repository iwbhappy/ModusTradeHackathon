import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// mode "streamlit": the whole app in one index.html, embedded by streamlit/streamlit_app.py
export default defineConfig(({ mode }) => ({
  plugins: mode === 'streamlit' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'streamlit' ? { outDir: '../streamlit/build', emptyOutDir: true } : undefined,
  server: { proxy: { '/api': 'http://127.0.0.1:8000' }, fs: { allow: ['..'] } },
}));
