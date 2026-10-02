import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith('.html') ? [path] : [];
  });
}

const hashes = new Set();
for (const path of htmlFiles('dist/docs')) {
  const html = readFileSync(path, 'utf8');
  for (const [, script] of html.matchAll(/<script(?: id="[^"]+")?>([\s\S]*?)<\/script>/gi)) {
    hashes.add(`'sha256-${createHash('sha256').update(script).digest('base64')}'`);
  }
}

if (!hashes.size) throw new Error('Could not find VitePress inline scripts in dist/docs');

const path = 'dist/_headers';
if (!existsSync(path)) writeFileSync(path, readFileSync('public/_headers', 'utf8'));
const headers = readFileSync(path, 'utf8');
const cspPattern =
  /(?<=\/docs\/\*\n {2}Content-Security-Policy: .*?script-src 'self')(?: [^;]*)?(?=;)/;
if (!cspPattern.test(headers)) {
  throw new Error('Could not find the /docs/* Content-Security-Policy');
}
const updated = headers.replace(cspPattern, ` ${[...hashes].join(' ')}`);

for (const hash of hashes) {
  if (!updated.includes(hash)) throw new Error(`Missing generated CSP hash: ${hash}`);
}
writeFileSync(path, updated);
