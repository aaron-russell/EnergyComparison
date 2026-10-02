import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const origin = 'https://energy.russell-tech.co.uk';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html') && entry.name !== '404.html') files.push(path);
  }
  return files;
}

function publicPath(file) {
  const path = relative(dist, file).split(sep).join('/');
  if (path === 'index.html') return '/';
  if (path.endsWith('/index.html')) return `/${path.slice(0, -'index.html'.length - 1)}`;
  return `/${path}`;
}

function normalizePath(value) {
  const parsed = new URL(value, origin);
  let path = parsed.pathname.replace(/\/+/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
}

function linksFrom(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => href && !/^(?:#|mailto:|tel:|javascript:|data:|https?:\/\/)/i.test(href));
}

function textFrom(html) {
  return html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function similarity(left, right) {
  const a = new Set(left.split(' ').filter((word) => word.length > 3));
  const b = new Set(right.split(' ').filter((word) => word.length > 3));
  return [...a].filter((word) => b.has(word)).length / Math.max(1, Math.min(a.size, b.size));
}

const files = await htmlFiles(dist);
const pages = new Map();
for (const file of files) pages.set(publicPath(file), await readFile(file, 'utf8'));

const redirects = new Map();
const redirectText = await readFile(join(dist, '_redirects'), 'utf8').catch(() => '');
for (const line of redirectText.split('\n')) {
  const match = line.match(/^\s*(\/\S*)\s+(\/\S*)(?:\s+(\d{3}))?/);
  if (match)
    redirects.set(normalizePath(match[1]), {
      target: normalizePath(match[2]),
      status: match[3] ?? '302',
    });
}

const incoming = new Map([...pages.keys()].map((path) => [path, 0]));
const outgoing = new Map();
const brokenInternalLinks = [];
const redirectingInternalLinks = [];
const edges = [];
for (const [source, html] of pages) {
  const targets = linksFrom(html)
    .map(normalizePath)
    .filter((target) => target.startsWith('/'));
  outgoing.set(source, targets.length);
  for (const target of targets) {
    edges.push({ source, target });
    if (redirects.has(target))
      redirectingInternalLinks.push({ source, target, ...redirects.get(target) });
    else if (!pages.has(target) && target !== '/sitemap.xml' && target !== '/robots.txt')
      brokenInternalLinks.push({ source, target });
    else if (pages.has(target)) incoming.set(target, incoming.get(target) + 1);
  }
}

const depths = new Map([['/', 0]]);
const queue = ['/'];
while (queue.length) {
  const source = queue.shift();
  for (const { target } of edges.filter((edge) => edge.source === source)) {
    if (!pages.has(target) || depths.has(target)) continue;
    depths.set(target, depths.get(source) + 1);
    queue.push(target);
  }
}
const documentationPages = [...pages.keys()].filter((path) => path.startsWith('/docs/'));
const aliases = [...redirects.entries()]
  .filter(([source]) => source.startsWith('/docs/'))
  .map(([source, value]) => ({ source, ...value }));
const nearDuplicateDocumentation = [];
for (let index = 0; index < documentationPages.length; index += 1) {
  for (let other = index + 1; other < documentationPages.length; other += 1) {
    const left = documentationPages[index];
    const right = documentationPages[other];
    const score = similarity(textFrom(pages.get(left)), textFrom(pages.get(right)));
    if (score >= 0.9)
      nearDuplicateDocumentation.push({ left, right, score: Number(score.toFixed(3)) });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  pages: [...pages.keys()].sort().map((url) => ({
    url,
    incoming: incoming.get(url),
    outgoing: outgoing.get(url),
    depth: depths.get(url) ?? null,
  })),
  orphanPages: [...pages.keys()].filter(
    (path) => path !== '/' && !redirects.has(path) && incoming.get(path) === 0,
  ),
  deepPages: [...pages.keys()].filter(
    (path) => !redirects.has(path) && (depths.get(path) ?? Infinity) > 3,
  ),
  brokenInternalLinks,
  redirectingInternalLinks,
  documentationAliases: aliases,
  nearDuplicateDocumentation,
  missingBreadcrumbs: documentationPages.filter(
    (path) => path !== '/docs' && !pages.get(path).includes('aria-label="Breadcrumb"'),
  ),
  pagesWithoutRelatedContent: documentationPages.filter(
    (path) => path !== '/docs' && !/related reading|related-content/i.test(pages.get(path)),
  ),
};

await writeFile(join(dist, 'internal-link-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
