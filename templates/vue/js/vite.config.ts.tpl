import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
__TAILWIND_IMPORT__

export default defineConfig({
  base: './',
  plugins: [vue()__TAILWIND_PLUGIN_TRAILING__],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: { manualChunks: undefined },
    },
  },
});

