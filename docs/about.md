---
title: About Energy Replay and Russell Tech
description: Who maintains Energy Replay, what the project does, and how to contact the owner.
schemaType: AboutPage
reviewed: 2026-10-02
---

# About Energy Replay

Energy Replay is a private, browser-based tool for replaying UK household energy consumption
against tariff definitions supplied by the user. It is published as part of Russell Tech and is
maintained in the [Energy Replay GitHub repository](https://github.com/aaron-russell/EnergyComparison).

This page describes the project and its maintainer using information currently available in the
repository. It deliberately does not claim regulated advice, supplier affiliation, savings, or
professional credentials that have not been supplied.

## Author and maintainer

### Aaron Russell

Aaron Russell is the copyright holder named in the repository licence and the GitHub account owner
for the Energy Replay repository. The repository demonstrates technical experience with:

- React and TypeScript application development;
- Vite, npm, Vitest, Playwright, and strict automated checks;
- provider adapters, response validation, cancellation, pagination, and safe error handling;
- decimal energy-cost calculations, UK tariff schedules, London calendar boundaries, estimates,
  and EV charging attribution; and
- static deployment documentation for Cloudflare Pages and Workers Static Assets.

These are repository-observable implementation details, not a claim about formal qualifications or
client work.

- GitHub: [aaron-russell/EnergyComparison](https://github.com/aaron-russell/EnergyComparison)
- Website: [aaron-russell.co.uk](https://aaron-russell.co.uk)
- Public contact: use the [GitHub repository](https://github.com/aaron-russell/EnergyComparison)
  for non-sensitive project questions. Do not post credentials, meter identifiers, or real
  consumption data in public issues.

The canonical author entity is `https://energy.russell-tech.co.uk/docs/about.html#aaron-russell`.
It is reused in the structured data for this handbook and the project case study.

## [Russell Tech](https://russell-tech.co.uk)

Russell Tech is the brand shown in the application as “Energy Replay by Russell Tech”. The
repository does not currently provide a registered-company profile, office address, telephone
number, or general business email, so those details are intentionally not inferred here.

The canonical organization entity is
`https://energy.russell-tech.co.uk/docs/about.html#russell-tech`.

Read the [editorial policy](/editorial-policy), [privacy and security guide](/operations/privacy-and-security),
and [contact page](/contact)
for the project’s publishing, privacy, and communication boundaries.

## Project scope

Energy Replay compares the same selected readings against a baseline and alternatives entered by
the user. It does not fetch a supplier catalogue, predict future bills, rank suppliers, or
guarantee savings. See the [project case study](/projects/energy-replay) for implementation and
delivered outcomes.
