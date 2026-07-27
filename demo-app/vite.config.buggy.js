import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Buggy version config — port 3001
// Keeps root as demo-app/ but rewrites the root request to serve index-buggy.html
export default defineConfig({
  plugins: [
    react(),
    // Middleware plugin: intercept requests for / and serve index-buggy.html
    {
      name: 'serve-buggy-index',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/index-buggy.html';
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 3001,
    strictPort: true,
  },
  build: {
    outDir: 'dist/buggy',
    rollupOptions: {
      input: './index-buggy.html',
    },
  },
});
