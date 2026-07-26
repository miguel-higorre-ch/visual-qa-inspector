import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Buggy version config — port 3001
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    strictPort: true,
  },
  build: {
    outDir: 'dist/buggy',
  },
  // Point to the buggy entry point
  build: {
    outDir: 'dist/buggy',
    rollupOptions: {
      input: './index-buggy.html',
    },
  },
});
