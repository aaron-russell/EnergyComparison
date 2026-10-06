import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith('.html') ? [path] : [];
  });
}

const hashes = new Set();
const siteDataHashes = new Set();
for (const file of htmlFiles('dist/docs')) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script(?:\s[^>]*)?>/gi)) {
    if (!/\bsrc\s*=/.test(match[1])) {
      hashes.add(`'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`);
    }
  }
}

for (const page of ['dist/index.html', 'dist/app/index.html']) {
  const html = readFileSync(page, 'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script(?:\s[^>]*)?>/gi)) {
    if (/application\/ld\+json/i.test(match[1])) {
      siteDataHashes.add(`'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`);
    }
  }
}

if (!hashes.size) throw new Error('Could not find VitePress inline scripts in dist/docs');

const path = 'dist/_headers';
const headers = readFileSync('public/_headers', 'utf8');
const cspPattern =
  /(\/docs\/\*\n(?: {2}! Content-Security-Policy\n)? {2}Content-Security-Policy: .*?script-src 'self')(?: [^;]*)?(?=;)/;
if (!cspPattern.test(headers)) {
  throw new Error('Could not find the /docs/* Content-Security-Policy');
}
const withDocsHashes = headers.replace(cspPattern, `$1 ${[...hashes].join(' ')}`);
const siteCspPattern = /( {2}Content-Security-Policy: [^\n]*?script-src[^;\n]*)(;)/;
const updated = withDocsHashes.replace(
  siteCspPattern,
  (_, policy, end) => `${policy} ${[...siteDataHashes].join(' ')}${end}`,
);

const appHtml = readFileSync('dist/app/index.html', 'utf8');
const criticalStyle = appHtml.match(/<style id="critical-loading-style">([\s\S]*?)<\/style>/)?.[1];
if (!criticalStyle) throw new Error('Could not find the critical loading style');
const criticalStyleHash = `'sha256-${createHash('sha256').update(criticalStyle).digest('base64')}'`;
const appCspPattern = /(\/\*\n[\s\S]*? {2}Content-Security-Policy: .*?; style-src )([^;]+)/;
const withCriticalStyleHash = updated.replace(
  appCspPattern,
  (_, prefix, sources) =>
    `${prefix}${sources}${sources.includes(criticalStyleHash) ? '' : ` ${criticalStyleHash}`}`,
);

for (const hash of hashes) {
  if (!withCriticalStyleHash.includes(hash)) throw new Error(`Missing generated CSP hash: ${hash}`);
}
for (const hash of siteDataHashes) {
  if (!withCriticalStyleHash.includes(hash)) throw new Error(`Missing JSON-LD CSP hash: ${hash}`);
}
writeFileSync(path, withCriticalStyleHash);
