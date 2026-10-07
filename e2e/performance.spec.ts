import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';

test('renders the static skeleton before hydration and removes it after the first commit', async ({
  page,
}) => {
  let releaseEntry = () => {};
  const entryGate = new Promise<void>((resolve) => {
    releaseEntry = resolve;
  });
  await page.route('**/assets/app-*.js', async (route) => {
    await entryGate;
    await route.continue();
  });
  const navigation = page.goto('/app/');
  const skeleton = page.locator('#app-loading-skeleton');
  await expect(skeleton).toBeVisible();
  expect(await skeleton.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
  releaseEntry();
  await navigation;
  await expect(skeleton).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
});

test('keeps the critical path strict and does not preload the social image', async ({ page }) => {
  const response = await page.request.get('/app/');
  const html = await response.text();
  const style = html.match(/<style id="critical-loading-style">([\s\S]*?)<\/style>/)?.[1];
  const hash = style ? `'sha256-${createHash('sha256').update(style).digest('base64')}'` : '';
  const csp = response.headers()['content-security-policy'];

  expect(style).toBeTruthy();
  expect(csp).toContain(hash);
  expect(html).not.toMatch(/rel="preload"[^>]+og-image\.png/i);
  expect(html).toContain('/analytics-loader.js');
  expect(html).not.toContain('beacon.min.js');
  expect(csp).toContain('https://static.cloudflareinsights.com');
  expect(csp).toContain('https://cloudflareinsights.com');
});

test('loads only the Cloudflare Web Analytics beacon after the page load', async ({ page }) => {
  await page.route('https://static.cloudflareinsights.com/beacon.min.js', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
  await page.goto('/app/');
  await expect(page.locator('script[data-cf-beacon]')).toHaveAttribute(
    'src',
    'https://static.cloudflareinsights.com/beacon.min.js',
  );
});

test('privacy page opt-out suppresses the analytics beacon for this tab', async ({ page }) => {
  let beaconRequested = false;
  await page.route('https://static.cloudflareinsights.com/beacon.min.js', (route) => {
    beaconRequested = true;
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  await page.goto('/docs/privacy.html');
  await page.getByRole('button', { name: 'Turn off analytics' }).click();
  await expect(page.getByRole('status')).toContainText('off until you change this preference');

  const nextVisit = await page.context().newPage();
  await nextVisit.goto('/app/');
  await nextVisit.waitForTimeout(3200);
  expect(beaconRequested).toBe(false);
  await expect(nextVisit.locator('script[data-cf-beacon]')).toHaveCount(0);
});

test('does not move the footer after the application becomes ready', async ({ page }) => {
  await page.goto('/app/');
  const footer = page.locator('footer');
  const initialTop = await footer.evaluate((element) => element.getBoundingClientRect().top);
  await page.waitForTimeout(100);
  const settledTop = await footer.evaluate((element) => element.getBoundingClientRect().top);
  expect(settledTop).toBe(initialTop);
});
