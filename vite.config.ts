import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const headerBlocks = readFileSync(new URL('./public/_headers', import.meta.url), 'utf8')
  .split(/\n\s*\n/)
  .map((block) => {
    const lines = block.split('\n');
    const path = lines[0] === '/*' ? '/*' : lines[0].replace(/\*$/, '') || '/';
    const headers: Record<string, string> = {};
    const detached = new Set<string>();
    lines
      .filter((line) => line.startsWith('  '))
      .forEach((line) => {
        const value = line.slice(2).trim();
        if (value.startsWith('! ')) {
          detached.add(value.slice(2));
          return;
        }
        const separator = value.indexOf(':');
        headers[value.slice(0, separator).trim()] = value.slice(separator + 1).trim();
      });
    return { path, headers, detached };
  });

const headersFor = (path: string) => {
  const common = headerBlocks.find((block) => block.path === '/*');
  const headers = { ...(common?.headers ?? {}) };
  const specific = headerBlocks
    .filter((block) => block.path !== '/*' && path.startsWith(block.path))
    .sort((left, right) => right.path.length - left.path.length)[0]?.headers;
  const block = headerBlocks
    .filter((candidate) => candidate.path !== '/*' && path.startsWith(candidate.path))
    .sort((left, right) => right.path.length - left.path.length)[0];
  block?.detached.forEach((name) => delete headers[name]);
  return { ...headers, ...specific };
};

const docsHeaders = { ...headersFor('/docs/') };
try {
  const docsHtml = readFileSync(new URL('./dist/docs/index.html', import.meta.url), 'utf8');
  const hashes = [...docsHtml.matchAll(/<script(?: id="[^"]+")?>([\s\S]*?)<\/script>/gi)].map(
    ([, script]) => `'sha256-${createHash('sha256').update(script).digest('base64')}'`,
  );
  docsHeaders['Content-Security-Policy'] = docsHeaders['Content-Security-Policy'].replace(
    "script-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`,
  );
} catch {
  // The docs build is optional for the app-only development server.
}

const previewHeadersFor = (path: string) => {
  const headers = headersFor(path);
  if (path.startsWith('/docs/') && docsHeaders['Content-Security-Policy']) {
    headers['Content-Security-Policy'] = docsHeaders['Content-Security-Policy'];
  }
  return headers;
};

export default defineConfig({
  appType: 'mpa',
  plugins: [
    react(),
    {
      name: 'preload-app-stylesheet',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html.replace(
            /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
            '<link rel="preload" as="style" crossorigin href="$1">',
          );
        },
      },
    },
    {
      name: 'path-aware-preview-headers',
      configurePreviewServer(server) {
        server.middlewares.use((request, response, next) => {
          const path = request.url?.split(/[?#]/)[0] ?? '/';
          const headers = previewHeadersFor(path);
          const setHeader = response.setHeader.bind(response);
          response.setHeader = (name, value) => {
            if (name.toLowerCase() === 'cache-control' && headers['Cache-Control']) {
              return setHeader(name, headers['Cache-Control']);
            }
            return setHeader(name, value);
          };
          Object.entries(headers).forEach(([name, value]) => {
            response.setHeader(name, value);
          });
          if (request.url?.split('?')[0] === '/sitemap.xml') {
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/xml');
            response.end(readFileSync(new URL('./dist/sitemap.xml', import.meta.url)));
            return;
          }
          const pathname = request.url?.split('?')[0] ?? '/';
          const asset = new URL(`./dist${pathname}`, import.meta.url);
          const index = new URL(
            `./dist${pathname.endsWith('/') ? pathname : `${pathname}/`}index.html`,
            import.meta.url,
          );
          if (
            request.method === 'GET' &&
            pathname !== '/' &&
            (!existsSync(asset) || !statSync(asset).isFile()) &&
            (!existsSync(index) || !statSync(index).isFile())
          ) {
            response.statusCode = 404;
            response.setHeader('Content-Type', 'text/html; charset=UTF-8');
            response.end(readFileSync(new URL('./dist/404.html', import.meta.url)));
            return;
          }
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
