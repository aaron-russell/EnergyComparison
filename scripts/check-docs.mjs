import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const docs = join(root, 'docs');
const markdown = [];

function visit(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (entry === '.vitepress' || entry === 'node_modules') continue;
    if (statSync(path).isDirectory()) visit(path);
    else if (extname(path) === '.md') markdown.push(path);
  }
}

function routeFile(path) {
  const route = path.split('#')[0].split('?')[0].replace(/^\//, '');
  const candidates = [join(docs, `${route}.md`), join(docs, route, 'index.md')];
  return candidates.find((candidate) => existsSync(candidate));
}

function sourceFile(from, target) {
  const candidate = normalize(resolve(dirname(from), target));
  return existsSync(candidate) ? candidate : undefined;
}

visit(docs);
const failures = [];
for (const file of markdown) {
  const content = readFileSync(file, 'utf8');
  const links = [...content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1]);
  for (const link of links) {
    if (/^(https?:|mailto:|#)/.test(link)) continue;
    const target = link.split('#')[0].split('?')[0];
    const found = target.startsWith('/') ? routeFile(target) : sourceFile(file, target);
    if (!found) failures.push(`${relative(root, file)} -> ${link}`);
  }
}

if (failures.length) {
  console.error('Broken documentation links:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Checked ${markdown.length} documentation pages and their local links.`);
}
