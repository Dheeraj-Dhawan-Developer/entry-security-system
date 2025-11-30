import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    root: '.', 
    base: '/', // Standard setting for Netlify root deployment
    publicDir: 'public',
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
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});