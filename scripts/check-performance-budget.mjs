import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const outputDirectory = 'dist/assets';
const landing = readFileSync('dist/index.html', 'utf8');
const html = readFileSync('dist/app/index.html', 'utf8');
const assetReferences = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(
  ([, reference]) => reference,
);
const entryScript = assetReferences.find((reference) => reference.endsWith('.js'));
const entryStyle = assetReferences.find((reference) => reference.endsWith('.css'));
const failures = [];

function assetPath(reference) {
  const relativePath = reference.replace(/^\//, '');
  return relativePath.startsWith('dist/') ? relativePath : `dist/${relativePath}`;
}

function compressedSize(path) {
  const source = readFileSync(path);
  return {
    raw: statSync(path).size,
    gzip: gzipSync(source, { level: 9 }).byteLength,
    brotli: brotliCompressSync(source).byteLength,
  };
}

function report(label, reference) {
  const sizes = compressedSize(assetPath(reference));
  console.log(
    `${label}: ${sizes.raw} B raw, ${sizes.gzip} B gzip, ${sizes.brotli} B Brotli (${reference})`,
  );
  return sizes;
}

if (/(?:src|href)="\/assets\/[^"?]+\.js/.test(landing)) {
  failures.push('The household landing page should not load application JavaScript');
}
if (!entryScript) failures.push('No initial JavaScript asset is referenced by dist/app/index.html');
if (!entryStyle) failures.push('No initial stylesheet asset is referenced by dist/app/index.html');
if (/rel="preload"[^>]+as="image"[^>]+og-image\.png/i.test(html)) {
  failures.push('The social image must not be preloaded on the initial route');
}

const entryJavaScript = entryScript ? report('Initial JavaScript', entryScript) : null;
const entryCss = entryStyle ? report('Initial CSS', entryStyle) : null;
if (entryJavaScript && entryJavaScript.gzip > 180 * 1024) {
  failures.push(`Initial JavaScript exceeds the 180 KiB gzip budget (${entryJavaScript.gzip} B)`);
}
if (entryCss && entryCss.gzip > 8 * 1024) {
  failures.push(`Initial CSS exceeds the 8 KiB gzip budget (${entryCss.gzip} B)`);
}

const routeNames = ['Import', 'Coverage', 'Charging', 'Tariffs', 'Compare'];
const assetNames = readdirSync(outputDirectory);
for (const routeName of routeNames) {
  const routeChunk = assetNames.find(
    (name) => name.startsWith(`${routeName}-`) && name.endsWith('.js'),
  );
  if (!routeChunk) {
    failures.push(`Lazy route chunk is missing: ${routeName}`);
    continue;
  }
  report(`Lazy ${routeName}`, `/${outputDirectory}/${routeChunk}`);
  if (html.includes(routeChunk))
    failures.push(`Lazy route is loaded in the initial HTML: ${routeChunk}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Performance budget passed: initial assets and lazy route boundaries are intact.');
}
