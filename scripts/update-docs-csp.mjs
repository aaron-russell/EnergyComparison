import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });
}

const scripts = htmlFiles('dist/docs').flatMap((path) => {
  const html = readFileSync(path, 'utf8');
  return [...html.matchAll(/<script(?: id="[^"]+")?>([\s\S]*?)<\/script>/gi)].map(
    ([, script]) => script,
  );
});
const hashes = [...new Set(scripts)].map(
  (script) => `'sha256-${createHash('sha256').update(script).digest('base64')}'`,
);
const path = existsSync('dist/_headers') ? 'dist/_headers' : 'public/_headers';
const headers = readFileSync(path, 'utf8');
const updated = headers.replace(
  /(?<=\/docs\/\*\n {2}Content-Security-Policy: .*?script-src 'self')(?: [^;]*)?(?=;)/,
  ` ${hashes.join(' ')}`,
);

if (updated !== headers) writeFileSync('dist/_headers', updated);
