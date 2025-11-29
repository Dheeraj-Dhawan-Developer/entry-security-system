import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.', 
  base: './', // CRITICAL for Netlify/GitHub Pages
  publicDir: 'public', // Serves sw.js and manifest.json
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true
  },
  server: {
    port: 3000,
  }
});