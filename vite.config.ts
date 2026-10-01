import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const headerBlocks = readFileSync(new URL('./public/_headers', import.meta.url), 'utf8')
  .split(/\n\s*\n/)
  .map((block) => {
    const lines = block.split('\n');
    const path = lines[0] === '/*' || lines[0].startsWith('  ') ? '/' : lines[0].replace(/\*$/, '');
    const headers = Object.fromEntries(
      lines
        .filter((line) => line.startsWith('  '))
        .map((line) => {
          const separator = line.indexOf(':');
          return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
        }),
    );
    return { path, headers };
  });

const headersFor = (path: string) =>
  headerBlocks.find((block) => block.path !== '/' && path.startsWith(block.path))?.headers ??
  headerBlocks.find((block) => block.path === '/')?.headers ??
  {};

const docsHeaders = { ...headersFor('/docs/') };
try {
  const docsHtml = readFileSync(new URL('./dist/docs/index.html', import.meta.url), 'utf8');
  const hashes = [...docsHtml.matchAll(/<script(?: id="[^"]+")?>([\s\S]*?)<\/script>/g)].map(
    ([, script]) => `'sha256-${createHash('sha256').update(script).digest('base64')}'`,
  );
  docsHeaders['Content-Security-Policy'] = docsHeaders['Content-Security-Policy'].replace(
    "script-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`,
  );
} catch {
  // The docs build is optional for the app-only development server.
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'path-aware-preview-headers',
      configurePreviewServer(server) {
        server.middlewares.use((request, response, next) => {
          const headers = request.url?.startsWith('/docs') ? docsHeaders : headersFor('/');
          Object.entries(headers).forEach(([name, value]) => {
            response.setHeader(name, value);
          });
          next();
        });
      },
    },
  ],
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
