import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
__TAILWIND_IMPORT__

export default defineConfig({
  base: './',
  plugins: [react()__TAILWIND_PLUGIN_TRAILING__],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: { manualChunks: undefined },
    },
  },
});

