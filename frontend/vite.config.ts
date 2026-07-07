/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // '/' for same-origin prod (FastAPI serves the SPA at site root).
  // GitHub Pages demo overrides this with `vite build --base=./`.
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    // jsdom only where a test opts in via `// @vitest-environment jsdom`;
    // pure store-logic tests run in the faster default node environment.
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
