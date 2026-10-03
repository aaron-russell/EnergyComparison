---
title: Energy Replay project case study
description: The implementation, data boundaries, and delivered capabilities of Energy Replay.
schemaType: Project
reviewed: 2026-10-02
---

# Energy Replay: project case study

## Brief

Energy Replay is a private React and TypeScript application that replays UK household electricity
and gas consumption against tariff definitions entered by the user. It runs in the browser and is
deployed as a static Vite build, with documented Cloudflare Pages and Workers Static Assets
options.

## The implementation

- Provider-independent calculation logic lives in `src/core/`; provider authentication, parsing,
  cancellation, retries, pagination, and connection lifecycle live in `src/adapters/`.
- The journey covers connection, import, coverage review, optional EV charging, tariff entry, and
  comparison.
- Calculations preserve decimal money and energy values, exact UTC boundaries, Europe/London
  calendar semantics, and separate measured, estimated, solar, mixed, and unknown provenance.
- Tariff definitions are validated against a versioned JSON Schema with a generated standalone
  validator.
- Synthetic fixtures and Playwright workflows provide a safe, repeatable test path without real
  accounts or consumption data.
- The browser tab session holds imported readings, charging data, and workflow progress. Credentials
  and live connections remain memory-only and are never stored. Only
  explicitly saved tariff definitions and the theme preference are stored locally.

## Delivered outcomes

The repository delivers a working comparison journey, documented adapter contracts, synthetic
provider and charger examples, tariff import/export validation, monthly and component breakdowns,
coverage and estimation review, and production-oriented checks for headers, accessibility, and
the combined application/handbook build.

These are implementation outcomes evidenced by the repository. They are not claims of customer
savings, measured performance improvements, supplier endorsement, or production compatibility with
every account. Live provider compatibility requires the authenticated release checks documented in
the [release guide](/operations/release-checks).

## Evidence and maintenance

The [GitHub repository](https://github.com/aaron-russell/EnergyComparison) contains the source,
tests, documentation, and issue history. The [development guide](/guide/development) explains how
to reproduce checks locally. This case study was reviewed on 2 October 2026.

The author is [Aaron Russell](/about#aaron-russell), and the project is published under the Russell
Tech name. See the [editorial policy](/editorial-policy) for how technical claims are checked and
updated.
