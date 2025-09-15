import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// Плагин для копирования API файлов
const copyApiPlugin = () => ({
  name: 'copy-api',
  buildStart() {
    // Копируем папку api в dist
    if (existsSync('api')) {
      const distApiDir = 'dist/api'
      if (!existsSync(distApiDir)) {
        mkdirSync(distApiDir, { recursive: true })
      }
      
      // Копируем все файлы из api в dist/api
      const fs = require('fs')
      const path = require('path')
      
      function copyDir(src, dest) {
        if (!existsSync(dest)) {
          mkdirSync(dest, { recursive: true })
        }
        
        const entries = fs.readdirSync(src, { withFileTypes: true })
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
          } else {
            fs.copyFileSync(srcPath, destPath)
          }
        }
      }
      
      copyDir('api', 'dist/api')
    }
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyApiPlugin()],
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
    __API_BASE_URL__: JSON.stringify('/api')
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
