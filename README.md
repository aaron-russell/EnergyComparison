# Energy Replay

A private React + TypeScript tool for replaying UK household consumption against user-entered
energy tariffs. Built with Vite and npm for Cloudflare Pages, with an alternative Workers Static
Assets configuration. Historical replay is **not a prediction or guarantee of future savings**.

Live app: [energy.russell-tech.co.uk](https://energy.russell-tech.co.uk/) · [Documentation](https://energy.russell-tech.co.uk/docs/)

## What it does

Energy Replay replays measured UK electricity and gas consumption against tariff definitions you
enter yourself. It keeps the provider layer separate from the calculation engine, so the same
readings can be compared against a current baseline and multiple alternatives. Results include
period totals plus monthly, component and electricity-band breakdowns.

The app runs in the browser. Imported readings, credentials, connections and charging data stay
in the active session; only explicitly saved tariff definitions and the dark/light theme are
stored locally. Tariff exports contain tariff definitions only, never consumption, account or
meter data.

## Run locally

Use Node.js 24:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The default theme is dark; use the theme control to switch to
light mode. To inspect the production build and security headers, use:

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

Charging file imports support the generic schema documented in [Adapters and extension
checklist](docs/adapters.md), as well as the recognised legacy and current Pod Point report
variants. Tariffs can be entered in the editor or imported/exported as validated JSON using the
[tariff schema](public/tariff.schema.json).

SmartFlex uses a user-supplied authorised GraphQL token and account number. Tokens are kept in
memory. Missing permissions/devices are an explicit unsupported state; no server-side proxy is
introduced. Provider browser access and real-account compatibility require the live release
checks below.

## Quality checks

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
# Formatting, lint, type, unit and build checks:
npm run check
```

oxlint enforces complexity <= 10, nesting <= 3, and <= 80 nonblank/noncomment lines per source
function. Prettier owns formatting. CI also runs Playwright using synthetic data. Tariff schema
validators are generated at build time, so runtime validation works without `unsafe-eval`.
Generated validator code is exempt from hand-authored-code style/complexity rules.

## Documentation

The complete versioned handbook is built from Markdown and published at `/docs/` in the deployed app.
Start with the [user guide](docs/guide/using-the-app.md), [development workflow](docs/guide/development.md),
[energy adapter guide](docs/guide/adding-an-adapter.md), or [EV charger guide](docs/guide/adding-an-ev-charger.md).

Reference pages cover the [adapter contracts](docs/reference/contracts.md), [normalized data model](docs/reference/data-model.md),
[calculations](docs/calculations.md), [architecture](docs/architecture.md), [privacy](docs/privacy.md),
[deployment](docs/operations/cloudflare-pages.md), and [release checks](docs/operations/release-checks.md).

Only explicitly saved tariffs and the theme preference persist. Exports contain tariffs only.
Refresh, page exit and Clear session dispose of imports, credentials, connections and workers.
The application contains no analytics, service worker, sensitive logging or remote fonts.

## Release status

Synthetic automated tests do not establish live Octopus/SmartFlex or real Pod Point compatibility.
Run the documented authenticated-account, real-export, hosted-CSP and CORS checks before treating
this as a verified live-account release. Publishing also requires a valid Cloudflare login.

MIT licensed. This project is independent of the named energy and charging providers.
