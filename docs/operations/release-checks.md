---
title: Release checks | Energy Replay
description: Verify automated quality, hosted behavior and authenticated provider compatibility before release.
---

# Release checks

Run the automated checks first:

```sh
npm run check
npm run docs:check
npm run test:e2e
```

Then verify the combined preview at `/` and `/docs/`. Synthetic workflows prove contracts, parsing,
calculation, accessibility, and build behavior only. They do not prove live provider compatibility,
real-account CORS, credentials, DNS, or every export variant.

## Authenticated Octopus gate

With a consenting test account, verify property and supply discovery, manual fallback, exclusion of
export points, and inclusion of replacement meters. Import 12 complete Europe/London months including
both clock changes, compare a sample against the provider response, and check original precision and
gas units. For m³, check the editable calorific value and approximation label. Cancel during pagination,
confirm completed pages are retained, retry a transient failure, and verify unsupported history and
authentication errors are safe. Browser network tools must show fixed HTTPS requests with credentials
omitted, caching disabled, redirects rejected, and referrers omitted. Clear the session and navigate
back to confirm imports and credentials are absent.

## SmartFlex gate

With an authorised GraphQL token and eligible device, verify device discovery, real session history,
energy units, DateTime pagination, missing-permission errors, and unsupported devices. Compare session
totals with the provider record and confirm that vehicle-added energy is not labelled as household grid
energy unless that purchased portion is established; planned dispatches are not substitutes for measured
energy. Verify cancellation, retries, safe errors, and the provider request policy.

## Pod Point export gate

Use consented, redacted legacy and current reports. Verify recognised columns, public-row exclusion,
grid-over-total preference, empty-grid handling, local dates, overnight windows, and ambiguous DST
timestamps. Confirm names and addresses are removed during normalisation, compare totals manually, and
clear the session and dispose of local files. Do not commit reports or screenshots containing real data.

## Hosted release gate

Verify `/`, `/docs/`, nested docs routes, docs assets, application SPA fallback, CSP, MIME types,
worker loading, JSON import/export, HTTPS, and self-hosted assets. Confirm the Cloudflare Web
Analytics beacon is present and no Zaraz, additional analytics, service workers, sensitive browser
storage, or application logging is present. Keep the last successful deployment available for
rollback and record the tested provider/report versions without account identifiers.
