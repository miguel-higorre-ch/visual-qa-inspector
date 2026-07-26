import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Baseline config — port 3000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: 'dist/baseline',
  },
});
