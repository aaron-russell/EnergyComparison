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

Pull request CI also reviews dependency changes and smoke-tests the deployed Pages preview. Nightly CI
runs the browser suite in Firefox and WebKit; Chromium runs for every pull request. After production
deployment, an automated smoke check verifies the public domain's routes, security headers, assets,
robots file, sitemap, and 404 response. The deployment workflow then runs the synthetic Playwright
browser workflows against the production domain. Its GitHub Actions summary records the deployed
commit and whether each hosted check passed.

Then verify the combined preview at `/` and `/docs/`. Synthetic workflows prove contracts, parsing,
calculation, accessibility, and build behavior only. They do not prove live provider compatibility,
real-account CORS, credentials, DNS, or every export variant.

## Per-release evidence record

Complete this record for each production deployment before making a live-compatibility claim. Link
the GitHub Actions deployment run for the automated results. Use `passed`, `failed`, or `not run` for
each manual check; do not infer a pass from CI, a previous release, or another provider. A provider
claim is limited to the provider, report format/version, and checks marked passed for this deployment.
Never include account, supply, meter, device, credential, or consumption identifiers.

| Evidence                                                                                    | Result | Notes                                      |
| ------------------------------------------------------------------------------------------- | ------ | ------------------------------------------ |
| Deployed commit and deployment run                                                          |        |                                            |
| Hosted HTTP smoke                                                                           |        |                                            |
| Hosted synthetic browser workflows                                                          |        |                                            |
| Hosted manual checks (routes, CSP, MIME, workers, import/export, HTTPS, self-hosted assets) |        |                                            |
| Octopus authenticated gate                                                                  |        | Provider/API version and test date only    |
| SmartFlex authenticated gate                                                                |        | Provider/API version and test date only    |
| Pod Point legacy report variant                                                             |        | Redacted report version and test date only |
| Pod Point current report variant                                                            |        | Redacted report version and test date only |

The GitHub Actions summary is evidence for the hosted HTTP and synthetic browser rows only. Record
manual results in the release record and retain it with the release notes. If a check was not run or
failed, state that plainly and narrow any compatibility wording accordingly.

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
Analytics beacon is present by default, the privacy-page opt-out cookie suppresses it across visits,
and no Zaraz, additional analytics, service workers, sensitive browser storage, or application
logging is present. Keep the last successful deployment available for
rollback and record the tested provider/report versions without account identifiers.
