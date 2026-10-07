import { test, expect } from '@playwright/test';

async function jsonLd(page: import('@playwright/test').Page) {
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  return page.evaluate(() =>
    JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!),
  );
}

test('application exposes unique metadata for each journey step', async ({ page }) => {
  await page.goto('/app/');
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
  expect(canonical).toBe('https://energy.russell-tech.co.uk/app/');
  expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe(
    'https://energy.russell-tech.co.uk/og-image.png',
  );
  expect(await page.locator('meta[name="twitter:url"]').getAttribute('content')).toBe(
    'https://energy.russell-tech.co.uk/app/',
  );
  expect((await jsonLd(page))['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual([
    'WebSite',
    'SoftwareApplication',
  ]);
});

test('household landing page is useful and indexable before JavaScript runs', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  const html = await response!.text();
  expect(html).toContain('Compare tariffs using the energy you actually used.');
  expect(html).toContain('A historical replay, not a forecast');
  expect(html).toContain('Your energy history stays in your session');
  expect(html).toContain('href="/app/"');
  expect(html).not.toContain('/src/main.tsx');
  await expect(page).toHaveTitle('Compare energy tariffs using your past usage | Energy Replay');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://energy.russell-tech.co.uk/',
  );
  const graph = await jsonLd(page);
  expect(graph['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual([
    'WebSite',
    'WebPage',
    'SoftwareApplication',
  ]);
});

test('the app entry works directly at /app and serves the workflow on refresh', async ({
  page,
}) => {
  const response = await page.goto('/app/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Load complete demo' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Load complete demo' })).toBeVisible();
});

test('household guides expose their purpose and structured data', async ({ page }) => {
  await page.goto('/docs/guide/understanding-historical-comparisons.html');
  await expect(page).toHaveTitle(
    'Compare energy tariffs using past household usage | Energy Replay',
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /replays selected historical electricity and gas usage/,
  );
  await expect(page.locator('h1')).toContainText(
    'Compare energy tariffs using past household usage',
  );
  await expect(page.getByRole('link', { name: 'Open Energy Replay' })).toHaveAttribute(
    'href',
    'https://energy.russell-tech.co.uk/app/',
  );
  expect(
    (await jsonLd(page))['@graph'].map((node: { '@type': string }) => node['@type']),
  ).toContain('TechArticle');
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

test('landing, app, and handbook share one header and the same responsive breakpoints', async ({
  page,
}) => {
  const routes = ['/', '/app/', '/docs/guide/using-the-app.html'];
  const menuNames = ['How it works', 'Privacy', 'About', 'Search', 'Open app'];

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      const header = page.locator(
        `${route === '/app/' ? '#root' : 'body'} energy-site-header .er-site-header`,
      );
      await expect(header).toBeVisible();
      await expect(header.locator('.er-site-menu a')).toHaveText(menuNames);
      await expect(header).toHaveCSS('min-height', width < 900 ? '112px' : '64px');
      if (route.startsWith('/docs/')) {
        await expect(page.locator('.VPNav')).toBeHidden();
      }
    }
  }
});

test('app desktop and mobile layouts keep one visible site menu and a visible brand mark', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Visual baselines are recorded in Chromium.');
  const header = page.locator('#root .er-site-header');
  const logo = header.locator('.er-site-brand img');

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/app/');
  await expect(page.locator('#app-loading-skeleton')).toBeHidden();
  await expect(page.locator('energy-site-header:visible')).toHaveCount(1);
  await expect(header).toBeVisible();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', '/logo.svg');
  await expect(logo).toHaveJSProperty('complete', true);
  expect(await logo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(
    0,
  );
  await expect(page.locator('energy-site-header')).toHaveCount(1);
  await expect(page.locator('#root nav[aria-label="Main navigation"]')).toHaveCount(1);
  await expect(page).toHaveScreenshot('app-desktop.png', { animations: 'disabled' });

  await page.setViewportSize({ width: 899, height: 960 });
  await expect(header).toHaveCSS('min-height', '112px');
  await expect(page.locator('energy-site-header')).toHaveCount(1);
  await expect(page.locator('energy-site-header:visible')).toHaveCount(1);
  await expect(page).toHaveScreenshot('app-tablet.png', { animations: 'disabled' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(header).toHaveCSS('min-height', '112px');
  await expect(logo).toBeVisible();
  await expect(page.locator('energy-site-header:visible')).toHaveCount(1);
  await expect(page.locator('#root .nav-label')).toHaveText('REPLAY STEPS');
  await expect(page.locator('#root .nav-item').first()).toHaveCSS('min-height', '44px');
  await expect(page.locator('#root .nav-item').first()).toHaveCSS('font-size', '12px');
  expect(
    await page
      .locator('#root .sidebar nav')
      .evaluate((menu) => getComputedStyle(menu).gridTemplateColumns.split(' ').length),
  ).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page).toHaveScreenshot('app-mobile.png', { animations: 'disabled' });
});

test('documentation desktop header shows the shared logo and one menu', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Visual baselines are recorded in Chromium.');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/docs/guide/using-the-app.html');

  const header = page.locator('energy-site-header .er-site-header');
  const logo = header.locator('.er-site-brand img');
  await expect(header).toBeVisible();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', '/logo.svg');
  await expect(logo).toHaveJSProperty('complete', true);
  expect(await logo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(
    0,
  );
  await expect(header.locator('.er-site-brand-copy')).toContainText('Energy Replay');
  await expect(page.locator('energy-site-header:visible')).toHaveCount(1);
  await expect(page.locator('nav[aria-label="Main navigation"]')).toHaveCount(1);
  await expect(page.locator('.VPNav')).toBeHidden();
  await expect(header).toHaveScreenshot('docs-header-desktop.png', { animations: 'disabled' });
  await expect(page).toHaveScreenshot('docs-desktop.png', { animations: 'disabled' });
});

test('mobile documentation header opens the handbook sidebar', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Visual baselines are recorded in Chromium.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/docs/guide/using-the-app.html');

  const menu = page.getByRole('button', { name: 'Open handbook menu' });
  const sidebar = page.locator('.VPSidebar');
  await expect(menu).toBeVisible();
  await expect(page.locator('.VPLocalNav .menu')).toBeHidden();
  await expect(sidebar).not.toHaveClass(/open/);
  await expect(page).toHaveScreenshot('docs-mobile-sidebar-closed.png', {
    animations: 'disabled',
  });

  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(sidebar).toHaveClass(/open/);
  await expect(sidebar).toHaveCSS('z-index', '60');
  await expect(sidebar).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  expect(
    await sidebar.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return (
        document
          .elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
          ?.closest('.VPSidebar') === element
      );
    }),
  ).toBe(true);
  const comparisonGuide = sidebar.getByRole('link', {
    name: 'Compare past energy costs',
    exact: true,
  });
  await expect(comparisonGuide).toBeVisible();
  await expect(page).toHaveScreenshot('docs-mobile-sidebar-open.png', {
    animations: 'allow',
  });
  await comparisonGuide.click();
  await expect(page).toHaveURL(/understanding-historical-comparisons\.html$/);
});
