import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, existsSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import type { Plugin } from 'vite'

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

// Плагин для обслуживания файлов из public по пути /RL-Guide-book/ в dev режиме
const rlGuideBookDevPlugin = (): Plugin => ({
  name: 'rl-guide-book-dev',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith('/RL-Guide-book/')) {
        const filePath = req.url.replace('/RL-Guide-book/', '')
        const publicPath = resolve(process.cwd(), 'public', filePath)
        
        // Декодируем URL для правильной обработки кириллицы
        const decodedPath = decodeURIComponent(publicPath)
        
        if (existsSync(decodedPath) && statSync(decodedPath).isFile()) {
          try {
            const content = readFileSync(decodedPath)
            const ext = decodedPath.split('.').pop()?.toLowerCase()
            const mimeTypes: Record<string, string> = {
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'gif': 'image/gif',
              'svg': 'image/svg+xml',
              'webp': 'image/webp',
              'json': 'application/json',
              'css': 'text/css',
              'html': 'text/html',
              'js': 'application/javascript',
              'md': 'text/markdown'
            }
            
            res.setHeader('Content-Type', mimeTypes[ext || ''] || 'application/octet-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.end(content)
            return
          } catch (error) {
            console.error('Error serving file:', decodedPath, error)
          }
        }
      }
      next()
    })
  }
})

// Плагин для копирования файлов в RL-Guide-book для совместимости с путями в коде
const copyRLGuideBookPlugin = () => ({
  name: 'copy-rl-guide-book',
  writeBundle() {
    const fs = require('fs')
    const path = require('path')
    
    // Создаем папку RL-Guide-book в dist
    const rlGuideBookDir = 'dist/RL-Guide-book'
    if (!existsSync(rlGuideBookDir)) {
      mkdirSync(rlGuideBookDir, { recursive: true })
    }
    
    // Копируем все файлы из public в dist/RL-Guide-book
    if (existsSync('public')) {
      function copyDir(src, dest) {
        if (!existsSync(dest)) {
          mkdirSync(dest, { recursive: true })
        }
        
        const entries = fs.readdirSync(src, { withFileTypes: true })
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          
          if (entry.isDirectory()) {
            // Пропускаем node_modules и другие служебные папки
            if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
              copyDir(srcPath, destPath)
            }
          } else {
            // Копируем только изображения и другие статические файлы
            const ext = path.extname(entry.name).toLowerCase()
            if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.json', '.css'].includes(ext)) {
              fs.copyFileSync(srcPath, destPath)
            }
          }
        }
      }
      
      copyDir('public', rlGuideBookDir)
    }
    
    // Копируем 404.html в dist для GitHub Pages SPA routing
    if (existsSync('404.html')) {
      copyFileSync('404.html', 'dist/404.html')
    }
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyApiPlugin(), rlGuideBookDevPlugin(), copyRLGuideBookPlugin()],
  base: '/',
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api/chat': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: 'http://127.0.0.1:4000',
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
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react')) return 'react-vendor';
          if (id.includes('three')) return 'three';
          if (id.includes('openai')) return 'openai';
          if (id.includes('@google')) return 'google-ai';
          return 'vendor';
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'three']
  }
})
