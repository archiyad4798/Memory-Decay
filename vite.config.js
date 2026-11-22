import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    rollupOptions: {
      input: {
        dashboard: resolve(import.meta.dirname, 'index.html'),
        concept: resolve(import.meta.dirname, 'src/pages/concept.html'),
        concepts: resolve(import.meta.dirname, 'src/pages/concepts.html'),
        recall: resolve(import.meta.dirname, 'src/pages/recall.html'),
        result: resolve(import.meta.dirname, 'src/pages/result.html'),
        settings: resolve(import.meta.dirname, 'src/pages/settings.html')
      }
    }
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js']
  }
});
