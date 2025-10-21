import { defineConfig } from 'vite';
__TAILWIND_IMPORT__

export default defineConfig({
  base: './',
  plugins: [__TAILWIND_PLUGIN_SOLO__],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: { manualChunks: undefined },
    },
  },
});

