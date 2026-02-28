import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, existsSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import type { Plugin } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

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
            if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
              copyDir(srcPath, destPath)
            }
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
      const rawUrl = req.url || '/';
      const [rawPath, rawQuery] = rawUrl.split('?');
      const qs = rawQuery ? `?${rawQuery}` : '';

      // Convenience dev routes: allow visiting /profile-desktop and /RL-Guide-book/profile-desktop
      // without remembering the .html suffix or base prefix.
      if (rawPath === '/profile-desktop' || rawPath === '/profile-desktop/') {
        req.url = `/profile-desktop.html${qs}`;
        next();
        return;
      }
      if (
        rawPath === '/RL-Guide-book/profile-desktop' ||
        rawPath === '/RL-Guide-book/profile-desktop/' ||
        rawPath === '/RL-Guide-book/profile-desktop.html'
      ) {
        req.url = `/profile-desktop.html${qs}`;
        next();
        return;
      }

      if (req.url === '/RL-Guide-book' || req.url === '/RL-Guide-book/') {
        req.url = `/${qs}`;
        next()
        return
      }
      // Книга Вожатификатор: dev запрос идёт на /vozhatifikator.md (base /), prod — на /RL-Guide-book/vozhatifikator.md
      const vozhatPath = rawPath === '/vozhatifikator.md' || rawPath === '/RL-Guide-book/vozhatifikator.md'
      if (vozhatPath) {
        const docsPath = resolve(process.cwd(), 'docs', 'вожатификатор.md')
        if (existsSync(docsPath) && statSync(docsPath).isFile()) {
          try {
            const content = readFileSync(docsPath)
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache')
            res.end(content)
            return
          } catch (e) {
            console.error('Error serving vozhatifikator.md from docs:', e)
          }
        }
      }
      if (req.url?.startsWith('/RL-Guide-book/')) {
        // Сначала декодируем URL, потом извлекаем путь
        // Обрабатываем как полностью закодированный путь, так и частично закодированный
        let encodedPath = req.url.replace('/RL-Guide-book/', '')
        
        // Пытаемся декодировать путь, обрабатывая возможное двойное кодирование
        let decodedPath: string
        try {
          // Сначала пробуем декодировать полностью
          decodedPath = decodeURIComponent(encodedPath)
          // Если после декодирования все еще есть закодированные символы, декодируем еще раз
          if (decodedPath.includes('%')) {
            decodedPath = decodeURIComponent(decodedPath)
          }
        } catch (e) {
          // Если декодирование не удалось, используем исходный путь
          decodedPath = encodedPath
        }
        
        const cleanPath = decodedPath.split('?')[0].split('#')[0]
        // profile-desktop.html: в dev отдаём из корня проекта (multi-page entry)
        if (cleanPath === 'profile-desktop.html') {
          const htmlPath = resolve(process.cwd(), 'profile-desktop.html')
          if (existsSync(htmlPath) && statSync(htmlPath).isFile()) {
            try {
              const content = readFileSync(htmlPath)
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.setHeader('Cache-Control', 'no-cache')
              res.end(content)
              return
            } catch (e) {
              console.error('Error serving profile-desktop.html:', e)
            }
          }
        }
        // Книга Вожатификатор: в dev отдаём из docs/вожатификатор.md
        if (cleanPath === 'vozhatifikator.md') {
          const docsPath = resolve(process.cwd(), 'docs', 'вожатификатор.md')
          if (existsSync(docsPath) && statSync(docsPath).isFile()) {
            try {
              const content = readFileSync(docsPath)
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
              res.setHeader('Cache-Control', 'no-cache')
              res.end(content)
              return
            } catch (e) {
              console.error('Error serving vozhatifikator.md from docs:', e)
            }
          }
        }
        const publicPath = resolve(process.cwd(), 'public', cleanPath)
        
        // Логирование для отладки (только для изображений значков)
        if (cleanPath.includes('Новые значки') || cleanPath.includes('%D0%9D%D0%BE%D0%B2%D1%8B%D0%B5')) {
          console.log('Vite plugin: serving file', {
            originalUrl: req.url,
            encodedPath,
            decodedPath,
            cleanPath,
            publicPath,
            exists: existsSync(publicPath)
          })
        }
        
        if (existsSync(publicPath) && statSync(publicPath).isFile()) {
          try {
            const content = readFileSync(publicPath)
            const ext = publicPath.split('.').pop()?.toLowerCase()
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
            console.error('Error serving file:', publicPath, error)
          }
        } else if (cleanPath.includes('Новые значки') || cleanPath.includes('%D0%9D%D0%BE%D0%B2%D1%8B%D0%B5')) {
          console.warn('Vite plugin: file not found', {
            originalUrl: req.url,
            encodedPath,
            decodedPath,
            cleanPath,
            publicPath,
            exists: existsSync(publicPath),
            parentExists: existsSync(resolve(process.cwd(), 'public'))
          })
        }
      }
      next()
    })
  }
})

// Плагин для копирования public/ в dist/ (замена отключённого copyPublicDir).
// copyPublicDir: false из-за Windows EBUSY/ENOTEMPTY с кириллическими путями.
// GitHub Pages для repo RL-Guide-book уже добавляет prefix /RL-Guide-book/ к URL,
// поэтому файлы должны лежать в dist/ (корень артефакта), а НЕ в dist/RL-Guide-book/.
const copyRLGuideBookPlugin = () => ({
  name: 'copy-rl-guide-book',
  writeBundle() {
    const fs = require('fs')
    const path = require('path')
    
    // Целевая директория — корень dist, т.к. GitHub Pages уже добавляет /RL-Guide-book/ prefix
    const targetDir = 'dist'
    
    console.log('📦 Копирование public/ → dist/ ...')
    
    if (existsSync('public')) {
      let copiedFiles = 0
      let copiedDirs = 0
      let skippedFiles = 0

      const sleepSync = (ms: number) => {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
      }
      const copyFileWithRetry = (srcPath: string, destPath: string) => {
        const attempts = 6
        for (let i = 0; i < attempts; i++) {
          try {
            fs.copyFileSync(srcPath, destPath)
            return true
          } catch (e: any) {
            const code = e?.code
            if ((code === 'EBUSY' || code === 'EPERM') && i < attempts - 1) {
              sleepSync(40 * (i + 1))
              continue
            }
            throw e
          }
        }
        return false
      }
       
      function copyDir(src, dest) {
        if (!existsSync(dest)) {
          mkdirSync(dest, { recursive: true })
          copiedDirs++
        }
        
        try {
          const entries = fs.readdirSync(src, { withFileTypes: true, encoding: 'utf8' })
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name)
            const destPath = path.join(dest, entry.name)
            
            if (entry.isDirectory()) {
              if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                copyDir(srcPath, destPath)
              }
            } else {
              const ext = path.extname(entry.name).toLowerCase()
              const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.json', '.css', '.html', '.md', '.js', '.txt', '.ico']
              if (entry.name.toLowerCase().includes('.orig.')) {
                skippedFiles++
                continue
              }
               
              if (allowedExts.includes(ext) || !ext) {
                try {
                  copyFileWithRetry(srcPath, destPath)
                  copiedFiles++
                } catch (error) {
                  console.error(`  ❌ Ошибка копирования ${srcPath}:`, error?.message || error)
                }
              } else {
                skippedFiles++
              }
            }
          }
        } catch (error) {
          console.error(`  ❌ Ошибка чтения директории ${src}:`, error.message)
        }
      }
      
      copyDir('public', targetDir)

      console.log(`✅ public/ → dist/ завершено:`)
      console.log(`   - Скопировано файлов: ${copiedFiles}`)
      console.log(`   - Создано директорий: ${copiedDirs}`)
      if (skippedFiles > 0) {
        console.log(`   - Пропущено файлов: ${skippedFiles}`)
      }
    } else {
      console.warn('⚠️  Папка public не найдена!')
    }
    
    // Копируем 404.html в dist для GitHub Pages SPA routing
    if (existsSync('404.html')) {
      copyFileSync('404.html', 'dist/404.html')
      console.log('✅ Скопирован 404.html')
    }

    // Service worker must live at site root (/sw.js). We disabled Vite's publicDir copy.
    const swSrc = resolve(process.cwd(), 'public', 'sw.js')
    if (existsSync(swSrc)) {
      try {
        copyFileSync(swSrc, 'dist/sw.js')
        console.log('✅ Скопирован public/sw.js → dist/sw.js')
      } catch (e) {
        console.warn('⚠️  Не удалось скопировать sw.js:', (e as any)?.message || e)
      }
    }

    // Книга Вожатификатор: копируем из docs в dist для просмотра на сайте.
    // На GitHub Pages корень артефакта = /RL-Guide-book/, поэтому vozhatifikator.md должен лежать
    // в корне dist/ (artifact root), чтобы fetch /RL-Guide-book/vozhatifikator.md вёл на него.
    const vozhatifikatorSrc = resolve(process.cwd(), 'docs', 'вожатификатор.md')
    if (existsSync(vozhatifikatorSrc)) {
      const vozhatifikatorDestRoot = join(process.cwd(), 'dist', 'vozhatifikator.md')
      copyFileSync(vozhatifikatorSrc, vozhatifikatorDestRoot)
      console.log('✅ Скопирован docs/вожатификатор.md → dist/vozhatifikator.md')
    }
  }
})

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const isAnalyze = mode === 'analyze'
  const isDevServer = command === 'serve'

  const plugins = [
    react({
      // Use Babel for JSX so build parses deep JSX correctly (esbuild has a parse bug).
      babel: {
        babelrc: false,
        configFile: false,
        presets: [['@babel/preset-react', { runtime: 'automatic' }]]
      }
    }),
    copyApiPlugin(),
    rlGuideBookDevPlugin(),
    copyRLGuideBookPlugin(),
    ...(isAnalyze
      ? [
          visualizer({
            filename: 'dist/stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true
          })
        ]
      : [])
  ]

  return {
    plugins,
    // Dev should work from http://localhost:3001/ without requiring /RL-Guide-book/ prefix.
    // Build/preview keeps the GitHub Pages base path.
    base: isDevServer ? '/' : '/RL-Guide-book/',
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
      emptyOutDir: false, // не очищать dist: папки с кириллицей (Новые значки) дают ENOTEMPTY на Windows
      // Disable Vite's default public/ -> dist copy.
      // We copy public/ ourselves (to dist/RL-Guide-book) to avoid Windows EBUSY/ENOTEMPTY issues with large Cyrillic paths.
      copyPublicDir: false,
      sourcemap: false,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          'profile-desktop': resolve(__dirname, 'profile-desktop.html'),
        },
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            const normalizedId = id.replace(/\\/g, '/')
            const isReactCore =
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/scheduler/') ||
              normalizedId.includes('/node_modules/react-is/')
            if (isReactCore) return 'react-vendor'
            if (normalizedId.includes('/node_modules/openai/')) return 'openai'
            if (normalizedId.includes('/node_modules/@google/')) return 'google-ai'
            return 'vendor'
          }
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  }
})
