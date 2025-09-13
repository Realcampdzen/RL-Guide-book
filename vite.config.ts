import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/RL-Guide-book/',
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api/chat': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  define: {
    // Определяем переменные окружения для продакшена
    __API_BASE_URL__: JSON.stringify(import.meta.env.MODE === 'production' ? '/api' : '/api')
  },
  publicDir: 'public',
  assetsInclude: ['**/*.md'],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          three: ['three']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'three']
  }
})
