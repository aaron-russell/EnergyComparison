import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const files = ['public/_headers', ...(existsSync('dist/_headers') ? ['dist/_headers'] : [])];
const failures = [];

function parse(path) {
  return readFileSync(path, 'utf8')
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n');
      const headers = lines
        .filter((line) => line.startsWith('  ') && !line.trimStart().startsWith('! '))
        .map((line) => {
          const separator = line.indexOf(':');
          return [line.slice(2, separator).trim(), line.slice(separator + 1).trim()];
        });
      const detached = lines
        .filter((line) => line.trimStart().startsWith('! '))
        .map((line) => line.trimStart().slice(2));
      return { path: lines[0], headers, detached };
    });
}

for (const file of files) {
  const blocks = parse(file);
  const common = blocks.find((block) => block.path === '/*');
  const docs = blocks.find((block) => block.path === '/docs/*');
  const assets = blocks.find((block) => block.path === '/assets/*');
  const docsAssets = blocks.find((block) => block.path === '/docs/assets/*');
  const api = blocks.find((block) => block.path === '/api/*');

  const value = (block, name) => block?.headers.find(([key]) => key === name)?.[1];
  const count = (block, name) => block?.headers.filter(([key]) => key === name).length ?? 0;

  for (const name of [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'Referrer-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Permissions-Policy',
    'Cross-Origin-Opener-Policy',
    'Cache-Control',
  ]) {
    if (!value(common, name)) failures.push(`${file}: missing common ${name}`);
  }
  if (value(common, 'Cache-Control') !== 'public, max-age=0, must-revalidate') {
    failures.push(`${file}: common HTML cache policy is incorrect`);
  }
  if (!common?.detached.includes('Access-Control-Allow-Origin')) {
    failures.push(`${file}: default Pages CORS header is not detached`);
  }
  for (const [block, label] of [
    [assets, 'app assets'],
    [docsAssets, 'documentation assets'],
  ]) {
    if (value(block, 'Cache-Control') !== 'public, max-age=31536000, immutable') {
      failures.push(`${file}: ${label} are not immutable for one year`);
    }
  }
  if (
    !docs?.detached.includes('Content-Security-Policy') ||
    count(docs, 'Content-Security-Policy') !== 1
  ) {
    failures.push(`${file}: documentation CSP is not a single detached rule`);
  }
  if (value(api, 'Cache-Control') !== 'no-store')
    failures.push(`${file}: API responses are cacheable`);
  if (blocks.filter((block) => block.path.includes('pages.dev')).length !== 2) {
    failures.push(`${file}: preview noindex rules are incomplete`);
  }
  if (file === 'dist/_headers' && existsSync('dist/index.html')) {
    const html = readFileSync('dist/index.html', 'utf8');
    const style = html.match(/<style id="critical-loading-style">([\s\S]*?)<\/style>/)?.[1];
    const csp = value(common, 'Content-Security-Policy') ?? '';
    const hash = style ? `'sha256-${createHash('sha256').update(style).digest('base64')}'` : null;
    if (!hash || !csp.includes(hash)) {
      failures.push(`${file}: critical loading style hash is missing from the app CSP`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checked Pages headers in ${files.join(', ')}.`);
}
