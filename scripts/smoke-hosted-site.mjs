import assert from 'node:assert/strict';

const siteUrl = new URL(process.env.SITE_URL ?? '');
const expectNoIndex = process.env.EXPECT_NOINDEX === 'true';
const validHost = expectNoIndex
  ? siteUrl.hostname.endsWith('.pages.dev')
  : siteUrl.hostname === 'energy.russell-tech.co.uk';
assert.equal(siteUrl.protocol, 'https:', 'Hosted smoke checks require HTTPS.');
assert.ok(validHost, `Unexpected hosted smoke-check domain: ${siteUrl.hostname}`);

async function request(path, expectedStatus = 200) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(new URL(path, siteUrl), {
      signal: AbortSignal.timeout(10000),
    }).catch(() => undefined);
    if (response?.status === expectedStatus) {
      assert.equal(new URL(response.url).origin, siteUrl.origin, `${path} changed origin`);
      return response;
    }
    lastStatus = response?.status ?? 0;
    if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert.fail(`${path} did not return ${expectedStatus}; last status was ${lastStatus}`);
}

function requireHeader(headers, name, fragment) {
  assert.ok(headers.get(name)?.includes(fragment), `Expected ${name} to include ${fragment}`);
}

const home = await request('/');
requireHeader(home.headers, 'content-type', 'text/html');
requireHeader(home.headers, 'strict-transport-security', 'max-age=31536000');
requireHeader(home.headers, 'content-security-policy', "default-src 'none'");
requireHeader(home.headers, 'x-content-type-options', 'nosniff');
requireHeader(home.headers, 'cache-control', 'must-revalidate');
assert.equal(home.headers.get('x-robots-tag')?.includes('noindex') ?? false, expectNoIndex);

const homeHtml = await home.text();
const appAsset = homeHtml.match(/(?:src|href)="(\/assets\/[^"]+\.js)"/)?.[1];
assert.ok(appAsset, 'Application JavaScript asset was not referenced by the homepage.');
const appAssetResponse = await request(appAsset);
requireHeader(appAssetResponse.headers, 'cache-control', 'immutable');

const docs = await request('/docs/');
requireHeader(docs.headers, 'content-type', 'text/html');
requireHeader(docs.headers, 'content-security-policy', "default-src 'none'");
requireHeader(docs.headers, 'cache-control', 'must-revalidate');
assert.equal(docs.headers.get('x-robots-tag')?.includes('noindex') ?? false, expectNoIndex);
const docsHtml = await docs.text();
const docsAsset = docsHtml.match(/(?:src|href)="(\/docs\/assets\/[^"]+\.js)"/)?.[1];
assert.ok(docsAsset, 'Handbook JavaScript asset was not referenced by /docs/.');
const docsAssetResponse = await request(docsAsset);
requireHeader(docsAssetResponse.headers, 'cache-control', 'immutable');

await request('/docs/guide/using-the-app.html');
const robots = await request('/robots.txt');
requireHeader(robots.headers, 'content-type', 'text/plain');
assert.match(await robots.text(), /Sitemap:/);
const sitemap = await request('/sitemap.xml');
requireHeader(sitemap.headers, 'content-type', 'xml');
assert.match(await sitemap.text(), /<urlset/);
await request('/__energy_replay_smoke_missing_route__', 404);

console.log(`Hosted smoke checks passed for ${siteUrl.origin}.`);
