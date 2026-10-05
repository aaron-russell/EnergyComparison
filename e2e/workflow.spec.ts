import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { exampleTariffs, syntheticReadings, syntheticSupplies } from '../src/fixtures/synthetic';
import { replay } from '../src/core/engine';
import { midnight } from '../src/core/time';

test('combined production build serves the app and handbook', async ({ page }) => {
  const docsErrors: string[] = [];
  page.on('pageerror', (error) => docsErrors.push(error.message));
  await page.addInitScript(() => {
    if (!localStorage.getItem('energy-replay:theme')) {
      localStorage.setItem('energy-replay:theme', 'dark');
    }
  });
  await page.goto('/docs/guide/using-the-app.html');
  await expect(page.locator('h1#use-the-app')).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(
        (window as unknown as { __VP_SITE_DATA__: { locales: object } }).__VP_SITE_DATA__.locales,
      ),
    ),
  ).toContain('root');
  await page.goto('/docs/');
  const docsResponse = await page.request.get('/docs/');
  const docsHeaders = docsResponse.headers();
  const docsCsp = docsHeaders['content-security-policy'];
  expect(docsCsp).toContain("script-src 'self'");
  expect(docsCsp).toMatch(/script-src[^;]*'sha256-/);
  expect(docsCsp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(docsCsp.match(/default-src/g)).toHaveLength(1);
  expect(docsHeaders['cache-control']).toBe('public, max-age=0, must-revalidate');
  expect(docsHeaders['referrer-policy']).toBe('no-referrer');
  expect(docsHeaders['strict-transport-security']).toContain('max-age=31536000');
  expect(docsHeaders['x-content-type-options']).toBe('nosniff');
  expect(docsHeaders['x-frame-options']).toBe('DENY');
  expect(docsHeaders['permissions-policy']).toContain('camera=()');
  expect(docsHeaders['cross-origin-opener-policy']).toBe('same-origin');
  expect(docsHeaders['access-control-allow-origin']).toBeUndefined();
  const appResponse = await page.request.get('/');
  const appHeaders = appResponse.headers();
  expect(appHeaders['content-security-policy']).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(appHeaders['cache-control']).toBe('public, max-age=0, must-revalidate');
  expect(appHeaders.etag).toBeTruthy();
  expect(appHeaders['access-control-allow-origin']).toBeUndefined();
  const conditional = await page.request.get('/', {
    headers: { 'If-None-Match': appHeaders.etag },
  });
  expect(conditional.status()).toBe(304);

  const appHtml = await appResponse.text();
  const appAsset = appHtml.match(/(?:src|href)="(\/assets\/[^"?]+)"/)?.[1];
  expect(appAsset).toBeTruthy();
  const appAssetResponse = await page.request.get(appAsset!);
  expect(appAssetResponse.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  expect(appAssetResponse.headers()['access-control-allow-origin']).toBeUndefined();

  const docsHtml = await docsResponse.text();
  const docsAsset = docsHtml.match(/(?:src|href)="(\/docs\/assets\/[^"?]+)"/)?.[1];
  expect(docsAsset).toBeTruthy();
  const docsAssetResponse = await page.request.get(docsAsset!);
  expect(docsAssetResponse.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  const encoding = docsAssetResponse.headers()['content-encoding'];
  if (encoding) expect(['br', 'gzip', 'zstd']).toContain(encoding);

  const apiResponse = await page.request.get('/api/not-configured');
  expect(apiResponse.headers()['cache-control']).toBe('no-store');
  expect(appHeaders['link']).toContain('</sitemap.xml>; rel="sitemap"');
  const robotsResponse = await page.request.get('/robots.txt');
  expect(robotsResponse.status()).toBe(200);
  expect(robotsResponse.headers()['content-type']).toMatch(/^text\/plain/);
  const robots = await robotsResponse.text();
  expect(robots).toContain('Content-Signal: ai-train=no, search=yes, ai-input=yes');
  expect(robots.indexOf('Content-Signal:')).toBeLessThan(
    robots.indexOf('User-agent: OAI-SearchBot'),
  );
  expect(robots).toContain('Sitemap: https://energy.russell-tech.co.uk/sitemap.xml');
  const sitemapResponse = await page.request.get('/sitemap.xml');
  expect(sitemapResponse.status()).toBe(200);
  expect(sitemapResponse.headers()['content-type']).toMatch(/xml/);
  expect(await sitemapResponse.text()).toContain('<loc>https://energy.russell-tech.co.uk/</loc>');
  expect(await sitemapResponse.text()).toContain(
    '<loc>https://energy.russell-tech.co.uk/docs/</loc>',
  );
  const sitemapUrls = await page.evaluate(
    (xml) => {
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      if (document.querySelector('parsererror')) return null;
      return [...document.querySelectorAll('urlset > url > loc')].map((node) => node.textContent);
    },
    await sitemapResponse.text(),
  );
  const expectedSitemapUrls = [
    '/',
    '/docs/',
    '/docs/about.html',
    '/docs/architecture.html',
    '/docs/calculations.html',
    '/docs/contact.html',
    '/docs/editorial-policy.html',
    '/docs/guide/adding-an-adapter.html',
    '/docs/guide/adding-an-ev-charger.html',
    '/docs/guide/connection-and-import.html',
    '/docs/guide/coverage-and-estimates.html',
    '/docs/guide/development.html',
    '/docs/guide/ev-charging.html',
    '/docs/guide/tariffs-and-comparison.html',
    '/docs/guide/troubleshooting.html',
    '/docs/guide/using-the-app.html',
    '/docs/operations/cloudflare-pages.html',
    '/docs/operations/cloudflare-workers.html',
    '/docs/operations/privacy-and-security.html',
    '/docs/operations/release-checks.html',
    '/docs/privacy.html',
    '/docs/projects/energy-replay.html',
    '/docs/reference/contracts.html',
    '/docs/reference/data-model.html',
    '/docs/reference/tariff-schema.html',
    '/docs/versions.html',
  ].map((path) => new URL(path, 'https://energy.russell-tech.co.uk').href);
  expect(sitemapUrls).toEqual(expectedSitemapUrls);
  expect(new Set(sitemapUrls ?? []).size).toBe(expectedSitemapUrls.length);
  for (const url of expectedSitemapUrls) {
    expect((await page.request.get(new URL(url).pathname)).status()).toBe(200);
  }
  const missingResponse = await page.request.get('/this-page-does-not-exist');
  expect(missingResponse.status()).toBe(404);
  expect(missingResponse.headers()['content-type']).toMatch(/^text\/html(?:;|$)/);
  expect(await missingResponse.text()).toContain('<h1>Page not found</h1>');
  for (const legacyPath of [
    '/docs/adapters.html',
    '/docs/cloudflare-pages.html',
    '/docs/cloudflare-workers.html',
    '/docs/release-checks.html',
    '/docs/privacy.html',
  ]) {
    expect((await page.request.get(legacyPath)).status()).toBe(200);
  }
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Use the app' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Operations' })).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Search' }).click();
  const search = page.locator('#localsearch-input');
  await expect(search).toBeVisible();
  await search.fill('Tariffs and comparison');
  await expect(
    page.getByRole('link', { name: 'Tariffs and comparison', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/docs/calculations.html');
  await expect(
    page.locator('#VPSidebarNav').getByRole('link', { name: 'Adapter contracts', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Architecture', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/architecture\.html$/);
  await expect(
    page.locator('#VPSidebarNav').getByRole('link', { name: 'Adapter contracts', exact: true }),
  ).toBeVisible();
  await page.goto('/docs/');
  await page.getByRole('link', { name: 'Use the app' }).click();
  await expect(page).toHaveURL(/\/docs\/guide\/using-the-app\.html$/);
  await expect(page.locator('h1#use-the-app')).toBeVisible();
  await page.getByRole('link', { name: 'Connect and import history', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/guide\/connection-and-import\.html$/);
  await expect(page.locator('h1')).toContainText('Connect and import history');
  await page.goBack();
  await expect(page).toHaveURL(/\/docs\/guide\/using-the-app\.html$/);
  await expect(page.locator('h1#use-the-app')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/docs\/guide\/connection-and-import\.html$/);
  await expect(page.locator('h1')).toContainText('Connect and import history');
  await page.evaluate(() => localStorage.setItem('energy-replay:theme', 'light'));
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  expect(docsErrors).toEqual([]);
  const nested = await page.request.get('/docs/guide/adding-an-ev-charger.html');
  expect(nested.ok()).toBe(true);
  expect(await nested.text()).toContain('Add an EV charger');
  const asset = await page.request.get('/docs/logo.svg');
  expect(asset.ok()).toBe(true);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

async function syntheticImport(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clear session' }).click();
  await page.getByLabel('Energy provider', { exact: true }).selectOption('synthetic');
  await page.getByRole('button', { name: 'Connect provider', exact: true }).click();
  await page.getByRole('button', { name: 'Choose import period' }).click();
  await page.getByLabel('Start date (included)').fill('2024-03-01');
  await page.getByLabel('End date (excluded)').fill('2024-04-01');
  await page.getByRole('button', { name: 'Import history / retry' }).click();
  await expect(page.getByRole('button', { name: 'Review coverage' })).toBeEnabled();
  await page.getByRole('button', { name: 'Review coverage' }).click();
}

async function finishComparison(
  page: Page,
  options: { chargingStepOpen?: boolean; electricityOnly?: boolean } = {},
) {
  if (!options.chargingStepOpen) {
    await page.getByRole('button', { name: 'Review optional EV charging' }).click();
  }
  await page.getByRole('button', { name: 'Continue to tariffs' }).click();
  await page.getByRole('button', { name: 'Load synthetic examples' }).click();
  await page.getByRole('button', { name: 'Use as baseline' }).first().click();
  await page.getByRole('button', { name: 'Compare tariffs', exact: true }).click();
  if (options.electricityOnly) {
    await page.getByLabel('Fuel comparison').selectOption('electricity');
  }
  await page.getByRole('button', { name: 'Replay these tariffs' }).click();
  await expect(page.getByRole('heading', { name: 'Historical replay costs' })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('table', {
      name: 'Identical period, supplies and energy for all tariffs',
    }),
  ).toBeVisible();
  const tariffRows = page
    .getByRole('table', { name: 'Identical period, supplies and energy for all tariffs' })
    .locator('tbody tr');
  expect(await tariffRows.count()).toBeGreaterThan(1);
  await expect(tariffRows.filter({ hasText: 'Baseline' })).toHaveCount(1);
}

async function compareSyntheticPeriod(
  page: Page,
  start: string,
  end: string,
  incomplete = false,
  electricityOnly = false,
) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clear session' }).click();
  await page.getByLabel('Energy provider', { exact: true }).selectOption('synthetic');
  await page.getByRole('button', { name: 'Connect provider', exact: true }).click();
  await page.getByRole('button', { name: 'Choose import period' }).click();
  if (electricityOnly) {
    await page
      .locator('label')
      .filter({ hasText: 'Example home · gas' })
      .getByRole('checkbox')
      .uncheck();
  }
  await page.getByLabel('Start date (included)').fill(start);
  await page.getByLabel('End date (excluded)').fill(end);
  await page.getByRole('button', { name: 'Import history / retry' }).click();
  if (incomplete) {
    await expect(page.getByText('Generating synthetic intervals', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  }
  await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0, { timeout: 120000 });
  await expect(page.getByRole('button', { name: 'Review coverage' })).toBeEnabled();
  await page.getByRole('button', { name: 'Review coverage' }).click();
  await page.getByRole('button', { name: 'Review optional EV charging' }).click();
  await page.getByRole('button', { name: 'Continue to tariffs' }).click();
  await page.getByRole('button', { name: 'Load synthetic examples' }).click();
  await expect(page.getByText('25.00p/kWh · 49.00p/day')).toBeVisible();
  await page.getByRole('button', { name: 'Use as baseline' }).first().click();
  await page.getByRole('button', { name: 'Compare tariffs', exact: true }).click();
  if (electricityOnly) {
    await page.getByLabel('Fuel comparison').selectOption('electricity');
  }
  await page.getByRole('button', { name: 'Replay these tariffs' }).click();
}

test('loads the complete demo workspace and renders the visual comparison dashboard', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load complete demo' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { name: 'Same usage. Different possibilities.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Replay these tariffs' }).click();
  await expect(page.getByText('Demo data', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /Monthly cost comparison/ })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole('img', { name: 'Monthly difference from baseline' })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Usage mix', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('manual replacement meters connect as one supply without account discovery', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  await page.route('https://api.octopus.energy/**', async (route) => {
    apiRequests.push(route.request().url());
    await route.abort();
  });
  await page.goto('/');
  await page.getByLabel('API key', { exact: true }).fill('synthetic-private-key');
  await page.getByLabel('Gas API unit (confirm before import)').selectOption('none');
  await page.getByText('Advanced connection options', { exact: true }).click();
  for (const serial of ['SYNTHETIC-OLD', 'SYNTHETIC-NEW']) {
    await page.getByRole('button', { name: 'Add import meter' }).click();
    await page.getByLabel('Meter point (MPAN / MPRN)').last().fill('SYNTHETIC-POINT');
    await page.getByLabel('Meter serial', { exact: true }).last().fill(serial);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Connect provider', exact: true }).click();
  await expect(page.getByText('Connected · 1 import supplies discovered')).toBeVisible();
  await expect(page.getByLabel('API key', { exact: true })).toHaveValue('');
  expect(apiRequests).toEqual([]);
  await page.getByRole('button', { name: 'Clear session' }).click();
  await page.getByText('Advanced connection options', { exact: true }).click();
  await expect(page.getByLabel('Meter serial', { exact: true })).toHaveCount(0);
});

test('complete synthetic workflow, independent charger, comparison and tariff-only export', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await syntheticImport(page);
  await expect(page.getByText('100.0%', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Create estimated view' }).click();
  await expect(page.getByText('0.0% of energy is estimated')).toBeVisible();
  await page.getByRole('button', { name: 'Review optional EV charging' }).click();
  await page.getByLabel('Charging integration', { exact: true }).selectOption('synthetic-charger');
  await page.getByRole('button', { name: 'Connect charging provider' }).click();
  await page.getByRole('button', { name: 'Fetch charging history' }).click();
  await expect(page.getByRole('heading', { name: 'Review 4 sessions' })).toBeVisible();
  await page.getByLabel('Select authoritative source (optional)').selectOption('synthetic-charger');
  await page.getByRole('button', { name: 'Continue to tariffs' }).click();
  await page.getByRole('button', { name: 'Load synthetic examples' }).click();
  await page.getByRole('button', { name: 'Use as baseline' }).first().click();
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export tariffs only' }).click();
  const stream = await (await download).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) {
    chunks.push(chunk);
  }
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(exported).toHaveLength(2);
  expect(JSON.stringify(exported)).not.toMatch(/supplyRef|readings|apiKey|accountNumber/);
  await page.getByRole('button', { name: 'Compare tariffs', exact: true }).click();
  await page.getByRole('button', { name: 'Replay these tariffs' }).click();
  await expect(page.getByRole('heading', { name: 'Historical replay costs' })).toBeVisible();
  const period = { start: midnight('2024-03-01'), end: midnight('2024-04-01') };
  const expected = replay(exampleTariffs[0], syntheticReadings(period), syntheticSupplies, period);
  await expect(page.getByText(`£${expected.total}`, { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
  const storage = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  expect(Object.keys(storage.local)).toEqual(['energy-replay:saved-tariffs']);
  expect(Object.keys(storage.session)).toEqual(['energy-replay:session']);
  await page.getByRole('button', { name: 'Clear session' }).click();
  await expect(page.getByLabel('API key', { exact: true })).toHaveValue('');
});

test('Octopus discovery, authenticated interval import and tariff comparison', async ({ page }) => {
  const requests: Array<{ url: URL; headers: Record<string, string>; method: string }> = [];
  const intervals = Array.from({ length: 48 }, (_, index) => {
    const start = new Date(Date.UTC(2024, 2, 1, 0, index * 30));
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    return {
      interval_start: start.toISOString(),
      interval_end: end.toISOString(),
      consumption: '0.25',
    };
  });
  await page.route('https://api.octopus.energy/**', async (route) => {
    const request = route.request();
    requests.push({
      url: new URL(request.url()),
      headers: await request.allHeaders(),
      method: request.method(),
    });
    const response = request.url().includes('/v1/accounts/')
      ? {
          properties: [
            {
              electricity_meter_points: [
                {
                  mpan: 'SYNTHETIC-MPAN',
                  meters: [{ serial_number: 'SYNTHETIC-METER' }],
                  is_export: false,
                },
              ],
              gas_meter_points: [],
            },
          ],
        }
      : { results: intervals, next: null };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(response) });
  });

  await page.goto('/');
  await page.getByLabel('API key', { exact: true }).fill('synthetic-key');
  await page.getByLabel('Account number', { exact: true }).fill('A-SYNTHETIC');
  await page.getByLabel('Gas API unit (confirm before import)').selectOption('none');
  await page.getByRole('button', { name: 'Connect provider', exact: true }).click();
  await expect(page.getByText('Connected · 1 import supplies discovered')).toBeVisible();
  await expect(page.getByLabel('API key', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Choose import period' }).click();
  await page.getByLabel('Start date (included)').fill('2024-03-01');
  await page.getByLabel('End date (excluded)').fill('2024-03-02');
  await page.getByRole('button', { name: 'Import history / retry' }).click();
  await expect(page.getByText('48 half-hour readings retained.')).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests.map(({ method }) => method)).toEqual(['GET', 'GET']);
  expect(requests[0].url.pathname).toBe('/v1/accounts/A-SYNTHETIC/');
  expect(requests[0].headers.authorization).toBe(
    `Basic ${Buffer.from('synthetic-key:').toString('base64')}`,
  );
  expect(requests[1].url.pathname).toContain('/v1/electricity-meter-points/');
  expect(requests[1].url.searchParams.get('period_from')).toBe('2024-03-01T00:00:00Z');
  expect(requests[1].url.searchParams.get('period_to')).toBe('2024-03-02T00:00:00Z');
  expect(requests[1].url.searchParams.get('page_size')).toBe('1500');
  await page.getByRole('button', { name: 'Review coverage' }).click();
  await expect(page.getByText('100.0%', { exact: true })).toBeVisible();
  await finishComparison(page, { electricityOnly: true });
  await expect(page.getByText('12 kWh electricity · 0 kWh gas')).toBeVisible();
  expect(
    await page.evaluate(async () => JSON.stringify({ ...localStorage, ...sessionStorage })),
  ).not.toContain('synthetic-key');
});

test('SmartFlex device discovery, measured session review and comparison', async ({ page }) => {
  const requests: Array<{
    body: { query: string; variables: Record<string, string> };
    token: string;
  }> = [];
  await page.route('https://api.octopus.energy/v1/graphql/', async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as {
      query: string;
      variables: Record<string, string>;
    };
    requests.push({ body, token: (await request.allHeaders()).authorization });
    const data = body.query.startsWith('query Devices')
      ? { devices: [{ id: 'SYNTHETIC-DEVICE', __typename: 'SmartFlexVehicle' }] }
      : {
          devices: [
            {
              chargingSessions: {
                edges: [
                  {
                    node: {
                      start: '2024-03-10T11:00:00Z',
                      end: '2024-03-10T12:00:00Z',
                      energyAdded: { value: '1500', unit: 'WATT_HOUR' },
                    },
                  },
                ],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          ],
        };
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data }),
    });
  });

  await syntheticImport(page);
  await page.getByRole('button', { name: 'Review optional EV charging' }).click();
  await page.getByLabel('Charging integration', { exact: true }).selectOption('octopus-smartflex');
  await page.getByLabel('SmartFlex account number').fill('A-SYNTHETIC');
  await page.getByLabel('Octopus GraphQL access token').fill('synthetic-token');
  await page.getByRole('button', { name: 'Connect charging provider' }).click();
  await expect(page.getByLabel('Device')).toHaveValue(/.+/);
  await expect(page.getByLabel('Octopus GraphQL access token')).toHaveValue('');
  await page.getByRole('button', { name: 'Fetch charging history' }).click();
  await expect(page.getByRole('heading', { name: 'Review 1 sessions' })).toBeVisible();
  await expect(page.getByLabel('Energy kWh')).toHaveValue('1.5');
  await expect(page.getByLabel('Confirmed provenance')).toHaveValue('unknown');
  await expect(
    page.getByText(/reports session energy, not measured household grid energy/),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests.map(({ body }) => body.variables.account)).toEqual([
    'A-SYNTHETIC',
    'A-SYNTHETIC',
  ]);
  expect(requests.map(({ token }) => token)).toEqual(['synthetic-token', 'synthetic-token']);
  await finishComparison(page, { chargingStepOpen: true });
  expect(
    await page.evaluate(async () => JSON.stringify({ ...localStorage, ...sessionStorage })),
  ).not.toContain('synthetic-token');
});

test('Pod Point CSV filters public sessions and preserves the home-grid amount through comparison', async ({
  page,
}) => {
  await syntheticImport(page);
  await page.getByRole('button', { name: 'Review optional EV charging' }).click();
  await page.getByLabel('Charging integration', { exact: true }).selectOption('pod-point');
  await page.getByLabel('Charging file').setInputFiles({
    name: 'synthetic-pod-point.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Date,Start time,End time,Total kWh Consumed,kWh Grid (Home),Location type\n10/03/2024,11:25,14:52,30.12,10,home\n10/03/2024,15:00,17:00,20,,public',
    ),
  });
  await page.getByRole('button', { name: 'Preview mapping and sessions' }).click();
  await expect(page.getByRole('heading', { name: 'Review 1 sessions' })).toBeVisible();
  await expect(page.getByLabel('Energy kWh')).toHaveValue('10');
  await expect(page.getByLabel('Confirmed provenance')).toHaveValue('grid');
  await expect(page.getByText(/Public and unrecognised locations excluded/)).toBeVisible();
  await expect(
    page.getByText(/Names, addresses and device identifiers are discarded/),
  ).toBeVisible();
  await finishComparison(page, { chargingStepOpen: true });
});

test('generic JSON charging import reviews unknown attribution before tariff replay', async ({
  page,
}) => {
  await syntheticImport(page);
  await page.getByRole('button', { name: 'Review optional EV charging' }).click();
  await page.getByLabel('Charging integration', { exact: true }).selectOption('generic-file');
  await page.getByLabel('Charging file').setInputFiles({
    name: 'synthetic-sessions.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify([
        {
          start: '2024-03-10T11:00:00Z',
          end: '2024-03-10T12:00:00Z',
          kWh: '2.5',
          name: 'Synthetic driver',
          address: '1 Synthetic Lane',
        },
      ]),
    ),
  });
  await page.getByRole('button', { name: 'Preview mapping and sessions' }).click();
  await expect(page.getByRole('heading', { name: 'Review 1 sessions' })).toBeVisible();
  await expect(page.getByLabel('Energy kWh')).toHaveValue('2.5');
  await expect(page.getByLabel('Confirmed provenance')).toHaveValue('unknown');
  await expect(page.getByText('Synthetic driver')).toHaveCount(0);
  await expect(page.getByText('1 Synthetic Lane')).toHaveCount(0);
  await finishComparison(page, { chargingStepOpen: true });
});

test('finds the lowest compatible open tariff without a current baseline', async ({ page }) => {
  await page.route('https://tarifftracker.io/api/v1/lookup**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { electricity_region: 'Yorkshire' } }),
    });
  });
  await page.route('https://tarifftracker.io/api/v1/energy/tariffs**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        as_of: '2026-10-01T00:00:00Z',
        caveats: ['Check supplier terms before switching'],
        rows: [
          {
            supplier: 'Synthetic Cheap Energy',
            tariff: 'Fixed',
            product_code: 'CHEAP',
            region: 'Yorkshire',
            fuel: 'dual',
            kind: 'fixed',
            payment: 'direct debit',
            unit_p_kwh: '20',
            standing_p_day: '45',
            gas_unit_p_kwh: '5',
            gas_standing_p_day: '25',
            annual_est_gbp: '800',
            term_months: '12',
            exit_fee_gbp: '50',
          },
          {
            supplier: 'Synthetic Other Energy',
            tariff: 'Variable',
            product_code: 'OTHER',
            region: 'Yorkshire',
            fuel: 'dual',
            kind: 'variable',
            payment: 'direct debit',
            unit_p_kwh: '30',
            standing_p_day: '55',
            gas_unit_p_kwh: '8',
            gas_standing_p_day: '30',
            annual_est_gbp: '1100',
          },
        ],
      }),
    });
  });
  await syntheticImport(page);
  await page.getByRole('button', { name: 'Review optional EV charging' }).click();
  await page.getByRole('button', { name: 'Continue to tariffs' }).click();
  await page.getByLabel('Postcode').fill('L1 1AA');
  await page.getByRole('button', { name: 'Find cheapest for this usage' }).click();
  await expect(page.getByRole('heading', { name: 'Historical replay costs' })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Lowest replay', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Not supplied', { exact: true })).toBeVisible();
  await expect(page.getByText('Open tariff data · Yorkshire')).toBeVisible();
  await expect(page.getByText(/12-month term/)).toBeVisible();
});

test('labels complete and incomplete 12-month periods correctly', async ({ page }) => {
  test.setTimeout(120000);
  await compareSyntheticPeriod(page, '2024-10-01', '2025-10-01', false, true);
  await expect(page.getByRole('heading', { name: 'Annual usage and monthly cost' })).toBeVisible({
    timeout: 120000,
  });
  await expect(page.getByRole('columnheader', { name: 'Annual cost' })).toBeVisible({
    timeout: 120000,
  });

  await compareSyntheticPeriod(page, '2024-01-15', '2025-01-15', false, true);
  await expect(page.getByRole('heading', { name: 'Usage and cost for this period' })).toBeVisible({
    timeout: 120000,
  });
  await expect(page.getByRole('columnheader', { name: 'Period total' })).toBeVisible({
    timeout: 120000,
  });

  await compareSyntheticPeriod(page, '2024-10-01', '2025-10-01', true, true);
  await expect(page.getByRole('heading', { name: 'Usage and cost for this period' })).toBeVisible({
    timeout: 120000,
  });
  await expect(page.getByRole('columnheader', { name: 'Period total' })).toBeVisible({
    timeout: 120000,
  });
});

test('manual baseline editing, duplication, validation and persistence', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tariffs 05' }).click();
  await page.getByRole('button', { name: 'Add tariff', exact: true }).click();
  await page.getByLabel('Tariff name').fill('My current tariff');
  await page.getByLabel('Unit rate (p/kWh)', { exact: true }).fill('23.456');
  await page.getByLabel('Electricity standing charge (p/day)').fill('48.3');
  await page.getByRole('button', { name: 'Apply tariff' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await page.getByLabel('Tariff name').fill('Alternative');
  await page.getByRole('button', { name: 'Add time band' }).click();
  await page.getByRole('button', { name: 'Apply tariff' }).click();
  await expect(page.getByRole('alert')).toContainText('overlap');
  await page.getByRole('button', { name: 'Remove band' }).last().click();
  await page.getByRole('button', { name: 'Apply tariff' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Tariffs 05' }).click();
  await expect(page.getByRole('heading', { name: 'My current tariff' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alternative', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('energy-replay:saved-tariffs')!)),
  ).toEqual([]);
});

test('restores tab progress after refresh without restoring credentials', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load complete demo' }).click();
  await page.getByRole('button', { name: 'Replay these tariffs' }).click();
  await expect(page.getByRole('heading', { name: 'Historical replay costs' })).toBeVisible({
    timeout: 120000,
  });
  const before = await page.evaluate(() => sessionStorage.getItem('energy-replay:session'));
  expect(before).toBeTruthy();
  expect(before).not.toMatch(/apiKey|accountNumber|token/i);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Replay these tariffs' })).toBeVisible();
  await page.getByRole('button', { name: 'Replay these tariffs' }).click();
  await expect(page.getByRole('heading', { name: 'Historical replay costs' })).toBeVisible({
    timeout: 120000,
  });
  await page.getByRole('button', { name: 'Clear session' }).click();
  expect(await page.evaluate(() => sessionStorage.getItem('energy-replay:session'))).toBeNull();
});

test('accessibility, keyboard focus and responsive layouts in both themes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Skip to content')).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.waitForTimeout(200);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'test-results/mobile-connection.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.screenshot({
    path: 'test-results/desktop-connection.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('credentials never enter storage and are cleared on reload under production CSP', async ({
  page,
}) => {
  const response = await page.goto('/');
  expect(response!.headers()['content-security-policy']).toContain("script-src 'self'");
  await page.getByLabel('API key', { exact: true }).fill('synthetic-private-key');
  await page.getByLabel('Account number', { exact: true }).fill('A-SYNTHETIC');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).toBe(
    '{}',
  );
  await page.reload();
  await expect(page.getByLabel('API key', { exact: true })).toHaveValue('');
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
  ).toBe(0);
});
