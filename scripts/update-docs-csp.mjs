import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });
}

const hashes = new Set();
for (const file of htmlFiles('dist/docs')) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/\bsrc\s*=/.test(match[1])) {
      hashes.add(`'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`);
    }
  }
}
const path = existsSync('dist/_headers') ? 'dist/_headers' : 'public/_headers';
const headers = readFileSync(path, 'utf8');
const updated = headers.replace(
  /(?<=\/docs\/\*\n {2}Content-Security-Policy: .*?script-src 'self')(?: [^;]*)?(?=;)/,
  ` ${[...hashes].join(' ')}`,
);

if (updated !== headers) writeFileSync('dist/_headers', updated);
