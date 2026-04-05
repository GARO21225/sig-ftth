import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Base URL : /sig-ftth/ sur GitHub Pages, / en local/Codespace
const base = process.env.GITHUB_PAGES === 'true' ? '/sig-ftth/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages':      path.resolve(__dirname, './src/pages'),
      '@hooks':      path.resolve(__dirname, './src/hooks'),
      '@store':      path.resolve(__dirname, './src/store'),
      '@services':   path.resolve(__dirname, './src/services'),
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api':  { target: 'http://localhost:8000', changeOrigin: true },
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws':   { target: 'ws://localhost:8000',   ws: true },
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          map:    ['leaflet', 'react-leaflet'],
          charts: ['chart.js', 'react-chartjs-2'],
          store:  ['zustand'],
        }
      }
    }
  }
})
