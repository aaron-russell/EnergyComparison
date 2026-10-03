---
title: Privacy and security | Energy Replay
description: Review Energy Replay's browser-only data handling, provider transport rules and security boundaries.
---

# Privacy and security

Imported readings and charging records remain in the active browser tab session so refresh can restore
progress. Credentials and account connections remain memory-only and are never stored. Only explicitly
saved tariff definitions and theme preference persist locally. Tariff exports
contain definitions only. The application uses only Cloudflare Web Analytics for privacy-focused
performance and usage measurement; there is no other analytics, service worker, remote font,
sensitive logging, or server-side credential proxy in the application.

Provider adapters must send requests only to their documented fixed HTTPS origins, omit cookies,
disable caching, reject redirects, omit referrers, validate pagination origins, bound retries, and
sanitize errors. They must use opaque references and clear credentials on disconnect. Never commit
real account data, credentials, meter serials, device IDs, or real consumption. See the repository
[security notes](https://github.com/aaron-russell/EnergyComparison/blob/main/SECURITY.md) for reporting
guidance.
