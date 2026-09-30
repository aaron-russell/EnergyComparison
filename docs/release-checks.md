# Release verification

## Automated synthetic checks

Run `npm run check` and `npm run test:e2e`. Browser tests run production output with production CSP,
including worker-based replay, synthetic independent integrations, tariff editing and storage,
JSON exports, responsive layouts, keyboard navigation and automated accessibility checks.

Automated tests must never use real customer data or credentials. Screenshots and failure artifacts
are local test outputs and ignored by version control. CI disables traces to avoid habitual capture
of sensitive form data if a workflow is later adapted manually.

## Live Octopus release gate — not yet verified

Use a consenting account holder's browser and the hosted application:

- Connect a valid account; verify property/supply discovery and manual fallback.
- Confirm that export points are excluded and every replacement meter is included.
- Import the previous 12 complete London months, including spring/autumn clock changes.
- Compare a small sample against the account/API, including original precision and gas units.
- For m³, confirm the editable calorific value and approximation label.
- Cancel during pagination; retain completed pages; retry a transient failure.
- Check unsupported/non-half-hour meter history and account authentication errors.
- Verify browser CORS and request credentials/cache policy in browser network tools.
- Clear the session and navigate back; confirm imports and credentials are absent.

## SmartFlex release gate — not yet verified

Use a valid authorised GraphQL token, eligible device and consenting account. Confirm discovery,
actual charging-session history, energy units and DateTime pagination with the provider. Confirm
missing permissions/devices are clearly unsupported. Compare session totals to the provider's
records. Vehicle-added energy does not prove household grid energy; leave provenance unknown
unless the user can establish the purchased grid portion. Never substitute planned dispatches.

## Real Pod Point export release gate — not yet verified

Use a real legacy and current report if available, with the owner's consent. Verify recognised
columns, public-row exclusion, grid-over-total preference, empty grid columns, local dates,
overnight windows and ambiguous DST timestamps. Confirm names/addresses do not survive
normalisation. Compare energy totals manually, then clear the session and dispose of local files.
Do not commit the real report or screenshots showing it. Synthetic fixtures are not proof of
compatibility with every export variant.

## Hosted release gate

Verify CSP, MIME types, worker loading, self-hosted assets, JSON import/export and HTTPS. Confirm
Cloudflare Web Analytics and Zaraz are off, there is no service worker, and no sensitive browser
storage or application logs. Run keyboard/screen-reader checks in addition to automated axe scans.
Check the last successful deployment can be restored. Record the date and tested provider/report
versions in the release notes without account identifiers.
