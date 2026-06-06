import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        game: 'index.html',
        editor: 'src/editor/editor.html',
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
