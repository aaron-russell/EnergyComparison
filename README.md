# Energy Replay

A private React + TypeScript tool for replaying UK household consumption against user-entered
energy tariffs. Built with Vite and npm for Cloudflare Pages, with an alternative Workers Static
Assets configuration. Historical replay is **not a prediction or guarantee of future savings**.

## Run locally

Use Node.js 24:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To inspect production security headers, use:

```sh
npm run build
npm run preview
```

No API credentials, environment variables, server or database are required to start. Select
**Synthetic example** in the connection screen for generated consumption. Synthetic tariff
examples load only when requested; they are not real offers or a supplier catalogue.

## Journey

1. Select an energy adapter and connect. Octopus supports account discovery and manual meters.
2. Select supplies and exact London calendar dates, then import half-hour readings.
3. Review monthly coverage and optionally create a separate full-period estimate.
4. Import optional charging records, or review spike suggestions. Approve grid attribution.
5. Enter today's tariff and alternatives. Choose a baseline; save definitions explicitly if wanted.
6. Compare identical supplies, dates and energy, and open monthly/component/band breakdowns.

Energy providers and charging integrations are independent. Included energy adapters are Octopus
and a synthetic example. Charging adapters include generic CSV/JSON, documented Pod Point report
variants, optional account-dependent SmartFlex history, and a synthetic API charger.

SmartFlex uses a user-supplied authorised GraphQL token and account number. Tokens are kept in
memory. Missing permissions/devices are an explicit unsupported state; no server-side proxy is
introduced. Provider browser access and real-account compatibility require the live release
checks below.

## Quality checks

```sh
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
# All formatting, lint, type, unit and build checks:
npm run check
```

ESLint enforces complexity <= 10, nesting <= 3, and <= 80 nonblank/noncomment lines per source
function. Prettier owns formatting. CI also runs Playwright using synthetic data. Tariff schema
validators are generated at build time, so runtime validation works without `unsafe-eval`.
Generated validator code is exempt from hand-authored-code style/complexity rules.

## Documentation

- [Architecture and complexity boundaries](docs/architecture.md)
- [Calculation assumptions](docs/calculations.md)
- [Adapters and extension checklist](docs/adapters.md)
- [Privacy](docs/privacy.md) and [security](SECURITY.md)
- [Cloudflare Pages deployment](docs/cloudflare-pages.md)
- [Workers Static Assets alternative](docs/cloudflare-workers.md)
- [Live release checks](docs/release-checks.md)
- [Contributing](CONTRIBUTING.md)
- [Tariff JSON Schema](public/tariff.schema.json)

Only explicitly saved tariffs and the theme preference persist. Exports contain tariffs only.
Refresh, page exit and Clear session dispose of imports, credentials, connections and workers.
The application contains no analytics, service worker, sensitive logging or remote fonts.

## Release status

Synthetic automated tests do not establish live Octopus/SmartFlex or real Pod Point compatibility.
Run the documented authenticated-account, real-export, hosted-CSP and CORS checks before treating
this as a verified live-account release. Publishing also requires a valid Cloudflare login.

MIT licensed. This project is independent of the named energy and charging providers.
