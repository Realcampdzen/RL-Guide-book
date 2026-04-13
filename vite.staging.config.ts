import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

// Плагин для обслуживания HTML файлов из public/
const htmlServePlugin = (): Plugin => ({
  name: 'html-serve',
  enforce: 'pre',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0] || '';

      // Если запрашивается bluenest.html
      if (url === '/bluenest.html' || url === '/bluenest' || url === '/') {
        const htmlPath = join(process.cwd(), 'public', 'bluenest.html');
        if (existsSync(htmlPath)) {
          try {
            const html = readFileSync(htmlPath, 'utf-8');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.statusCode = 200;
            res.end(html);
            return;
          } catch (error) {
            console.error('Error reading bluenest.html:', error);
          }
        }
      }
      next();
    });
  },
});

// Конфигурация для staging сервера
export default defineConfig({
  plugins: [htmlServePlugin()],
  server: {
    port: 3001,
    host: true,
  },
  publicDir: 'public',
});
