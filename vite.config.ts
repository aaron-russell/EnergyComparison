import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
const headers = Object.fromEntries(
  readFileSync(new URL('./public/_headers', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith('  '))
    .map((line) => {
      const separator = line.indexOf(':');
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);
export default defineConfig({
  preview: { headers },
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/[.]**/**',
        '**/*.d.ts',
        '**/test{,s}/**',
        '**/*{.,-}{test,spec,bench,benchmark}.*',
        '**/__tests__/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,nyc,eslint,prettier}.config.*',
        '**/vitest.workspace.*',
        '**/.{eslint,mocha,prettier}rc.{js,cjs,mjs,ts}',
        'src/generated/**',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
