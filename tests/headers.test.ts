import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type HeaderBlock = {
  path: string;
  headers: Map<string, string>;
  detached: Set<string>;
};

const parseHeaders = (content: string): HeaderBlock[] =>
  content.split(/\n\s*\n/).map((block) => {
    const lines = block.split('\n');
    const headers = new Map<string, string>();
    const detached = new Set<string>();
    lines.slice(1).forEach((line) => {
      const value = line.trim();
      if (!value) return;
      if (value.startsWith('! ')) {
        detached.add(value.slice(2));
        return;
      }
      const separator = value.indexOf(':');
      headers.set(value.slice(0, separator), value.slice(separator + 1).trim());
    });
    return { path: lines[0], headers, detached };
  });

const source = readFileSync(resolve('public/_headers'), 'utf8');
const blocks = parseHeaders(source);
const block = (path: string) => blocks.find((candidate) => candidate.path === path);

describe('Pages header policy', () => {
  it('keeps security headers and revalidates default HTML', () => {
    const common = block('/*');
    expect(common?.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
    expect(common?.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
    expect(common?.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(common?.headers.get('X-Frame-Options')).toBe('DENY');
    expect(common?.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(common?.headers.get('Permissions-Policy')).toContain('camera=()');
    expect(common?.detached.has('Access-Control-Allow-Origin')).toBe(true);
  });

  it('caches only fingerprinted asset directories immutably', () => {
    const immutable = 'public, max-age=31536000, immutable';
    expect(block('/assets/*')?.headers.get('Cache-Control')).toBe(immutable);
    expect(block('/docs/assets/*')?.headers.get('Cache-Control')).toBe(immutable);
    expect(block('/api/*')?.headers.get('Cache-Control')).toBe('no-store');
  });

  it('detaches the application CSP before applying one docs CSP', () => {
    const docs = block('/docs/*');
    expect(docs?.detached.has('Content-Security-Policy')).toBe(true);
    const csp = docs?.headers.get('Content-Security-Policy') ?? '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it('marks both Pages preview host shapes noindex', () => {
    expect(block('https://:project.pages.dev/*')?.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(block('https://:version.:project.pages.dev/*')?.headers.get('X-Robots-Tag')).toBe(
      'noindex',
    );
  });
});
