# Security notes

## Trust boundaries

Reviewed adapters are bundled at build time. Tariff files are strict versioned data, not executable
plugins. Unsupported fields, versions and schedules are rejected. Credentials and original meter
identifiers belong to connection closures; neither the calculation worker nor tariff exports
receive them. Imported content is rendered as React text, not HTML.

Provider transport uses fixed origins. Octopus pagination must retain the original origin and
pathname, must progress and has a page limit. Provider cookies, API caching and redirects are
disabled. A first-party preference cookie stores only the user's Cloudflare analytics opt-out;
provider requests never receive it.
Errors are sanitised: upstream error bodies and request URLs are never displayed or logged.

`public/_headers` defines production CSP with no evaluated scripts, no inline styles, and build-time
hashes for static JSON-LD data blocks and documentation bootstrap scripts. It uses fixed connection
origins, no framing, and no object/embed content. Assets are self-hosted. AJV
standalone validators are generated before production builds; the browser never compiles schemas
with `new Function`. No sensitive endpoint exists on Cloudflare. HTML is revalidated, fingerprinted
assets are immutable for one year, and `/api/*` is explicitly `no-store` for future protection.
Cloudflare Pages supplies ETags and content encoding; the repository does not manufacture either.
The default wildcard CORS header is detached because no cross-origin asset access is required.

## Reporting and maintenance

Report vulnerabilities privately to the repository owner using the hosting platform's private
security reporting facility when configured. Do not include real credentials or customer meter
records in public issues. Revoke exposed provider tokens in the provider account.

Run dependency audits and the synthetic checks before releases. Real-account CORS and production
headers need hosted verification. If a future integration needs a proxy, review it separately:
fixed upstream destinations, stateless requests, no credentials/consumption in storage or logs.
Do not relax CSP or introduce a general proxy to make an unsupported integration appear connected.
