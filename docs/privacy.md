---
title: Privacy | Energy Replay
description: Learn how Energy Replay keeps credentials, readings and charging records in the browser session.
canonical: /docs/operations/privacy-and-security.html
reviewed: 2026-10-02
---

# Privacy policy

This policy describes the browser application and the documentation site using facts in the
repository. It was reviewed on 2 October 2026.

## Energy Replay application

Imported readings, credentials, account connections, and charging records remain in the active
browser session. Refreshing, leaving the page, or using **Clear session** removes them. Only
explicitly saved tariff definitions and the dark/light theme use local storage. Tariff exports
contain tariff definitions only, never consumption, account, meter, or device data.

The application uses Cloudflare Web Analytics as configured in the repository for privacy-focused
performance and usage measurement. It has no other analytics, service worker, remote font,
sensitive logging, or server-side credential proxy. Provider requests originate in the browser to
fixed HTTPS origins documented by the adapters.

## Documentation and contact

The handbook is static documentation. If you contact the project through GitHub, GitHub processes
that interaction under its own terms. Do not submit real credentials or household records in public
issues. Security reports should follow the private process in [SECURITY.md](https://github.com/aaron-russell/EnergyComparison/blob/main/SECURITY.md).

For the implementation details and operational guidance, see the [privacy and security guide](/operations/privacy-and-security).
