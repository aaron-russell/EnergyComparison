import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { exampleTariffs, syntheticReadings, syntheticSupplies } from '../src/fixtures/synthetic';
import { replay } from '../src/core/engine';
import { midnight } from '../src/core/time';

async function syntheticImport(page: Page, start = '2024-03-01', end = '2024-04-01') {
  await page.goto('/');
  await page.getByLabel('Energy provider', { exact: true }).selectOption('synthetic');
  await page.getByRole('button', { name: 'Connect provider', exact: true }).click();
  await page.getByRole('button', { name: 'Choose import period' }).click();
  await page.getByLabel('Start date (included)').fill(start);
  await page.getByLabel('End date (excluded)').fill(end);
  await page.getByRole('button', { name: 'Import history / retry' }).click();
  await expect(page.getByRole('button', { name: 'Review coverage' })).toBeEnabled();
  await page.getByRole('button', { name: 'Review coverage' }).click();
}

async function compareSyntheticPeriod(page: Page, start: string, end: string) {
  await syntheticImport(page, start, end);
  await page.getByRole('button', { name: 'Review optional EV charging' }).click();
  await page.getByRole('button', { name: 'Continue to tariffs' }).click();
  await page.getByRole('button', { name: 'Load synthetic examples' }).click();
  await page.getByRole('button', { name: 'Use as baseline' }).first().click();
  await page.getByRole('button', { name: 'Compare tariffs', exact: true }).click();
  await page.getByRole('button', { name: 'Replay these tariffs' }).click();
}

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
  expect(storage.session).toEqual({});
  await page.getByRole('button', { name: 'Clear session' }).click();
  await expect(page.getByLabel('API key', { exact: true })).toHaveValue('');
});

test('labels complete normal, leap and non-calendar-year periods correctly', async ({ page }) => {
  await compareSyntheticPeriod(page, '2023-01-01', '2024-01-01');
  await expect(page.getByRole('heading', { name: 'Annual usage and monthly cost' })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole('columnheader', { name: 'Annual cost' })).toBeVisible({
    timeout: 30000,
  });

  await compareSyntheticPeriod(page, '2024-01-01', '2025-01-01');
  await expect(page.getByRole('heading', { name: 'Annual usage and monthly cost' })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole('columnheader', { name: 'Annual cost' })).toBeVisible({
    timeout: 30000,
  });

  await compareSyntheticPeriod(page, '2024-01-15', '2025-01-15');
  await expect(page.getByRole('heading', { name: 'Usage and cost for this period' })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole('columnheader', { name: 'Period total' })).toBeVisible({
    timeout: 30000,
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
  await expect(page.getByRole('heading', { name: 'Alternative', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('energy-replay:saved-tariffs')!)),
  ).toEqual([]);
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

test('Tariff Tracker imports through the production CSP', async ({ page }) => {
  const requests: string[] = [];
  await page.route('https://tarifftracker.io/api/v1/**', async (route) => {
    requests.push(route.request().url());
    if (route.request().url().includes('/lookup?')) {
      await route.fulfill({
        contentType: 'application/json',
        body: '{"data":{"electricity_region":"Yorkshire"}}',
      });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: '{"rows":[{"supplier":"Synthetic Supplier","tariff":"Fixed","product_code":"SYNTH","region":"Yorkshire","fuel":"electricity","kind":"fixed","payment":"direct debit","unit_p_kwh":25.1234567890123456789,"standing_p_day":51,"annual_est_gbp":1200}]}',
    });
  });
  const response = await page.goto('/');
  expect(response!.headers()['content-security-policy']).toContain('https://tarifftracker.io');
  await page.getByRole('button', { name: 'Tariffs 05' }).click();
  await page.getByLabel('Postcode').fill('L1 1AA');
  await page.getByRole('button', { name: 'Load tariffs' }).click();
  await expect(page.getByRole('heading', { name: /Synthetic Supplier · Fixed/ })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Loaded 1 tariffs for Yorkshire' }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
});
