import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE || './',
    plugins: [vue()],
    test: {
      environment: 'jsdom',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        thresholds: {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100
        },
        exclude: [
          'src/main.js',
          '*.js',
          'e2e/**'
        ]
      }
    }
  };
});
