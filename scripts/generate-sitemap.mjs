import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';

const outputDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const siteOrigin = 'https://energy.russell-tech.co.uk';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await htmlFiles(path)));
    } else if (entry.name.endsWith('.html') && entry.name !== '404.html') {
      files.push(path);
    }
  }
  return files;
}

function publicPath(file) {
  const path = relative(outputDirectory, file).split(sep).join('/');
  if (path === 'index.html') return '/';
  if (path.endsWith('/index.html')) return `/${path.slice(0, -'index.html'.length)}`;
  return `/${path}`;
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function lastModified(path) {
  if (!path.startsWith('/docs/')) return undefined;
  const relativePath = path.slice('/docs/'.length).replace(/\.html$/, '.md') || 'index.md';
  const sourcePath = join(fileURLToPath(new URL('../docs/', import.meta.url)), relativePath);
  try {
    const source = await readFile(sourcePath, 'utf8');
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---/);
    const date = frontmatter?.[1].match(
      /^(?:reviewed|dateModified):\s*['"]?(\d{4}-\d{2}-\d{2})['"]?\s*$/m,
    )?.[1];
    return date;
  } catch {
    return undefined;
  }
}

const files = await htmlFiles(outputDirectory);
const legacyDocumentationPaths = new Set([
  '/docs/adapters.html',
  '/docs/cloudflare-pages.html',
  '/docs/cloudflare-workers.html',
  '/docs/release-checks.html',
]);
const paths = files
  .map(publicPath)
  .filter((path) => !legacyDocumentationPaths.has(path))
  .sort();
const urls = (
  await Promise.all(
    paths.map(async (path) => {
      const lastmod = await lastModified(path);
      return `  <url><loc>${escapeXml(`${siteOrigin}${path}`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    }),
  )
).join('\n');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

await writeFile(join(outputDirectory, 'sitemap.xml'), sitemap);
await stat(join(outputDirectory, 'sitemap.xml'));
