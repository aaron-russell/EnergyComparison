# Troubleshooting

## The app will not compare

Check that at least one supply is selected, every selected fuel has a price on every tariff, and at
least two tariffs exist with one baseline. Resolve conflicting overlapping readings before continuing.

## Coverage is incomplete

Retry the import first. If the provider still cannot supply history, use observed-only results or add
monthly bill totals and create an explicitly labelled estimate. Do not treat estimated energy as measured.

## Charging is rejected

Confirm grid provenance, remove overlapping sessions, correct the supply selection, and check that the
whole session is covered by electricity imports. A solar session does not receive grid EV pricing.

## A provider connection fails

Re-enter credentials, check account permissions and browser CORS behavior, and retry. The app does not
store credentials or use a server proxy. SmartFlex availability is account-dependent; use a charging-file
import when no supported device is exposed.

## Hosted behavior differs locally

Run `npm run build` and `npm run preview` so security headers and `/docs/` asset paths are exercised.
Live provider compatibility, Cloudflare credentials, DNS, and CORS cannot be proven by synthetic tests.
