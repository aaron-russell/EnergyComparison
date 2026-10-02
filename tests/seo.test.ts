import { describe, expect, it } from 'vitest';
import { appSeo, buildJsonLd, canonicalUrl, jsonLdScript, SITE_ORIGIN } from '../src/seo';

describe('SEO metadata', () => {
  it('normalizes application and documentation canonical URLs', () => {
    expect(canonicalUrl('/')).toBe(`${SITE_ORIGIN}/`);
    expect(canonicalUrl('/docs')).toBe(`${SITE_ORIGIN}/docs/`);
    expect(canonicalUrl('/docs/index.html')).toBe(`${SITE_ORIGIN}/docs/`);
    expect(canonicalUrl('/docs/guide/using-the-app.html')).toBe(
      `${SITE_ORIGIN}/docs/guide/using-the-app.html`,
    );
    expect(canonicalUrl('/docs/guide/adding-an-adapter.html')).toBe(
      `${SITE_ORIGIN}/docs/guide/adding-an-adapter.html`,
    );
  });

  it('provides unique titles and descriptions for every app step', () => {
    const metadata = Object.values(appSeo);
    expect(new Set(metadata.map(({ title }) => title)).size).toBe(6);
    expect(new Set(metadata.map(({ description }) => description)).size).toBe(6);
    expect(metadata.every(({ includeApplication }) => includeApplication)).toBe(true);
  });

  it('escapes JSON-LD values that could break out of a script element', () => {
    const serialized = jsonLdScript({ value: '</script><script>alert("x")</script> &' });
    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<script>');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(serialized).toContain('\\u0026');
  });

  it('builds one graph with valid application, breadcrumbs and opt-in article nodes', () => {
    const graph = buildJsonLd({
      title: 'Editorial page',
      description: 'A safe description.',
      path: '/docs/editorial.html',
      includeApplication: true,
      breadcrumbs: [
        { name: 'Energy Replay', path: '/' },
        { name: 'Editorial page', path: '/docs/editorial.html' },
      ],
      article: {
        headline: 'Editorial page',
        datePublished: '2026-10-02',
        author: 'Energy Replay team',
      },
    });
    expect(graph['@context']).toBe('https://schema.org');
    expect(graph['@graph']).toHaveLength(4);
    expect(graph['@graph'].map((node) => node['@type'])).toEqual([
      'WebSite',
      'SoftwareApplication',
      'BreadcrumbList',
      'Article',
    ]);
  });
});
