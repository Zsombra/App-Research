import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor: React + ReactDOM
          'vendor-react': ['react', 'react-dom'],
          // Layout vendor: Dockview
          'vendor-dockview': ['dockview-react'],
          // State management
          'vendor-zustand': ['zustand'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});
