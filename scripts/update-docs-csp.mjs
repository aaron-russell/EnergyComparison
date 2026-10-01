import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/docs/index.html', 'utf8');
const hashes = [...html.matchAll(/<script(?: id="[^"]+")?>([\s\S]*?)<\/script>/g)].map(
  ([, script]) => `'sha256-${createHash('sha256').update(script).digest('base64')}'`,
);
const path = 'dist/_headers';
const headers = readFileSync(path, 'utf8');
const updated = headers.replace(
  /(?<=\/docs\/\*\n {2}Content-Security-Policy: .*?script-src 'self')(?: [^;]*)?(?=;)/,
  ` ${hashes.join(' ')}`,
);

if (updated === headers) throw new Error('Could not update the /docs/* Content-Security-Policy');
writeFileSync(path, updated);
