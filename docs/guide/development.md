---
title: Development workflow | Energy Replay
description: Set up Energy Replay locally and run its formatting, lint, test, build and documentation checks.
---

# Development workflow

## Repository map

- `src/pages` contains the six-step UI journey.
- `src/components` contains shared forms and result views.
- `src/adapters` contains provider connections and parsers.
- `src/core` contains provider-independent normalization, estimation, EV allocation, and pricing.
- `src/fixtures` contains synthetic data for tests and examples.
- `tests` contains unit and contract tests; `e2e` contains browser workflows.
- `docs` contains this handbook and its VitePress configuration.

## Commands

```sh
npm ci
npm run dev
npm run docs:dev
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run docs:check
npm run test:e2e
npm run check
```

`npm run build` produces the app at `dist/` and the handbook at `dist/docs/`. Use the preview server to
check both surfaces together. `npm run check` is the expected pre-PR command.

## Contribution rules

Use synthetic fixtures only. Keep money and energy as decimal strings, keep provider identifiers inside
adapters, and do not add provider conditionals to pages or the engine. Keep functions within the enforced
oxlint complexity, nesting, and length limits. New adapters require contract tests and registry entry.

The [adapter guide](/guide/adding-an-adapter) and [EV charger guide](/guide/adding-an-ev-charger) are
part of the extension surface: update them when a supported contract changes.
