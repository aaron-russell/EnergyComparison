import { test, expect } from '@playwright/test';

async function jsonLd(page: import('@playwright/test').Page) {
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  return page.evaluate(() =>
    JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!),
  );
}

test('application exposes unique metadata for each journey step', async ({ page }) => {
  await page.goto('/');
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const index of [0, 1, 2, 3, 4, 5]) {
    await page.locator('.nav-item').nth(index).click();
    titles.add(await page.title());
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).not.toBeNull();
    descriptions.add(description!);
  }
  expect(titles.size).toBe(6);
  expect(descriptions.size).toBe(6);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toBe('https://energy.russell-tech.co.uk/');
  expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe(
    'https://energy.russell-tech.co.uk/og-image.png',
  );
  expect(await page.locator('meta[name="twitter:url"]').getAttribute('content')).toBe(
    'https://energy.russell-tech.co.uk/',
  );
  expect((await jsonLd(page))['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual([
    'WebSite',
    'SoftwareApplication',
  ]);
});

test('documentation exposes unique SEO metadata and breadcrumbs under the existing CSP', async ({
  page,
}) => {
  const response = await page.goto('/docs/guide/using-the-app.html');
  expect(response).not.toBeNull();
  expect((await response!.allHeaders())['content-security-policy']).not.toMatch(
    /script-src[^;]*'unsafe-inline'/,
  );
  await expect(page).toHaveTitle('Use the app | Energy Replay');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Follow the six-step Energy Replay journey from connecting usage through comparing tariffs.',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://energy.russell-tech.co.uk/docs/guide/using-the-app.html',
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Use the app | Energy Replay',
  );
  const graph = await jsonLd(page);
  expect(graph['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual([
    'WebSite',
    'BreadcrumbList',
    'Person',
    'Organization',
    'TechArticle',
  ]);
});

test('legacy documentation URLs point canonical metadata at maintained pages', async ({ page }) => {
  await page.goto('/docs/adapters.html');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://energy.russell-tech.co.uk/docs/guide/adding-an-adapter.html',
  );
  expect(await page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});
