import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isGitHubPages = process.env.GITHUB_PAGES === 'true'
const base = isGitHubPages ? '/sig-ftth/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@':           path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages':      path.resolve(__dirname, './src/pages'),
      '@hooks':      path.resolve(__dirname, './src/hooks'),
      '@store':      path.resolve(__dirname, './src/store'),
      '@services':   path.resolve(__dirname, './src/services'),
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { manualChunks: undefined } }
  }
})
