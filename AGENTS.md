# AGENTS.md

Repository-wide instructions for Energy Replay. This is a private React + TypeScript application
that replays UK household energy consumption against user-entered tariffs. It is a static Vite
build deployed to Cloudflare Pages, with a documented Workers Static Assets alternative.

## Runtime and setup

- Use Node.js 24 (`.nvmrc`) and npm.
- Install reproducibly with `npm ci`.
- Start local development with `npm run dev` and open the Vite URL it prints.
- The application needs no API credentials, environment variables, server, or database to start.
- Synthetic provider fixtures are the safe default for local development and automated tests.

## Verified commands

- `npm run dev` — start Vite on `127.0.0.1`.
- `npm run build` — regenerate the tariff validator, type-check, and build `dist/`.
- `npm run preview` — serve the production build locally.
- `npm run format` / `npm run format:check` — apply/check Prettier formatting.
- `npm run lint` / `npm run lint:fix` — run/apply safe oxlint fixes.
- `npm run typecheck` — run TypeScript project checks.
- `npm test` — run Vitest unit tests.
- `npx playwright install --with-deps chromium` — install the CI browser.
- `npm run test:e2e` — run Playwright workflows against the production preview.
- `npm run check` — run formatting, lint, typecheck, unit tests, and the production build.
- `npm run schema:generate` — regenerate `src/generated/validate-tariff.js` and its declaration.

Run `npm run check` and relevant end-to-end tests after implementation changes. CI runs `npm run
check`, installs Chromium, and runs `npm run test:e2e` on every push and pull request.

## Task completion checklist

Before completing an implementation task:

- [ ] Run `npm run check` to verify formatting, linting, type checking, unit tests, and the
      production build.
- [ ] Run `npm run test:e2e` for changes that affect user journeys, browser behavior, integrations,
      accessibility, storage, security headers, or production hosting. Run it for other implementation
      changes when the affected behavior is covered by an E2E workflow.
- [ ] Run any additional focused checks required by the changed area, such as schema generation or
      adapter contract tests.
- [ ] Review the final diff and `git status`; ensure generated files are current and no unrelated or
      sensitive data was added.
- [ ] Report each check run and its result. If an expected check cannot run, state why and leave it
      explicitly unverified rather than treating it as passing.

Do not mark a task complete until the applicable checklist items are addressed.

## Architecture and ownership

- `src/core/` contains provider-independent calculation and domain logic. Keep network requests
  and provider response parsing out of this directory.
- `src/adapters/` owns provider authentication, upstream response shapes, parsing, cancellation,
  retries, pagination, and connection lifecycle. Register new providers in the appropriate
  registry; do not add provider-ID conditionals to page components or the calculation engine.
- `src/components/` contains reusable React UI; `src/pages/` contains journey-level screens.
- `src/state/` owns session, persisted tariff, and background-job coordination.
- `src/fixtures/` contains synthetic data only. `tests/` contains Vitest tests and `e2e/` contains
  Playwright browser workflows.
- `public/` contains static assets, security headers, examples, and the tariff schema.
- `scripts/` contains build-time tooling. Generated validator files under `src/generated/` are
  build artifacts; regenerate them rather than hand-editing them.

The calculation engine accepts anonymous, provider-independent data. Adapters must keep original
credentials, account numbers, meter/device identifiers, and upstream response shapes at the
connection boundary. Preserve the separation between measured, estimated, solar, mixed, and
unknown energy provenance.

## Coding conventions

- TypeScript is strict, uses ES modules, and uses the bundler module resolution configured in
  `tsconfig.json`.
- Prettier is authoritative: single quotes, semicolons, trailing commas, two-space indentation,
  and a 100-character print width.
- Use descriptive names, small focused functions, explicit error states, and accessible labels.
- Keep parsing, validation, calculation, and presentation separate.
- Production source functions must satisfy oxlint limits: complexity <= 10, nesting <= 3, and <= 80
  nonblank/noncomment lines. Extract cohesive domain operations instead of disabling the rules.
- Keep money and energy as decimal strings/`Decimal` values; do not convert calculation values to
  JavaScript numbers. Preserve exact UTC boundaries and Europe/London calendar semantics.
- Keep React components pure and follow Hooks rules. Do not introduce inline/evaluated scripts,
  unsafe HTML rendering, or unnecessary client-side state.

## Tests and data safety

- Add contract tests and synthetic fixtures for new adapters, including malformed data, units,
  timestamps, cancellation, retries, pagination, safe errors, overlaps, and replacement meters.
- Use synthetic data in tests and commits. Never commit API keys, provider tokens, account details,
  meter/device identifiers, real consumption, real exports, or screenshots containing them.
- Credentials, imports, identifiers, and results are intended to remain in memory. Do not add
  sensitive localStorage/sessionStorage, analytics, service workers, tracking, or application logs.
- Preserve the two documented localStorage keys only: `energy-replay:saved-tariffs` and
  `energy-replay:theme`. Tariff exports must contain tariff definitions only.
- Treat `npm run test:e2e` as a production-preview test: it verifies CSP, workers, accessibility,
  storage clearing, responsive layouts, synthetic integrations, and tariff export behavior.

## Cloudflare and deployment

- This repository contains `wrangler.jsonc` for Pages and `wrangler.workers.jsonc` for the
  alternative Workers Static Assets deployment. Because Wrangler configuration exists, use
  `npx wrangler` for Cloudflare commands; use the `cf` CLI only for Cloudflare work in projects
  without a Wrangler configuration.
- Pages deployment uses Node.js 24, build command `npm run build`, and output directory `dist`.
- Pages direct upload is documented in `docs/cloudflare-pages.md`; the Workers alternative is
  documented in `docs/cloudflare-workers.md`. Do not deploy both as competing production targets.
- Deployment credentials are CI/account secrets (`CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID`) only. Never expose them as browser build variables or commit them.
- The app is static and has no Pages Functions, API proxy, server bindings, database, or runtime
  secret. Provider requests originate in the browser to fixed origins.
- Preserve `public/_headers` and verify CSP, HTTPS, MIME types, worker loading, and SPA fallback
  after hosting changes. Keep Cloudflare Web Analytics and Zaraz disabled.
- Before a live release, run the documented authenticated Octopus, SmartFlex, Pod Point, and
  hosted release checks in `docs/release-checks.md`; synthetic CI does not prove live compatibility.

## Security and documentation

- Read `SECURITY.md` before changing trust boundaries, transport, CSP, storage, or provider data
  handling. Report vulnerabilities privately as described there; do not put sensitive data in issues.
- Update the relevant documentation when changing calculation assumptions, adapter formats,
  deployment behavior, privacy guarantees, or release requirements.
- Do not add a proxy or relax CSP to make an unsupported integration work without a separate trust
  boundary review and documented justification.

No more-specific `AGENTS.md` files currently exist below the repository root; these rules therefore
apply to all source, test, documentation, configuration, and deployment files.
