import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
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
    },
    define: {
      // Polyfill process.env for the browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});