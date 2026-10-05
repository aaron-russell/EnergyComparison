---
title: Privacy and security | Energy Replay
description: Review Energy Replay's browser-only data handling, provider transport rules and security boundaries.
---

# Privacy and security

Read the public [privacy and cookie policy](/privacy) for the site's controller, retention,
rights and cookie information. This page records the implementation and security boundaries for
maintainers.

Imported readings and charging records remain in the active browser tab session so refresh can restore
progress. Credentials and account connections remain memory-only and are never stored. Only explicitly
saved tariff definitions and theme preference persist locally. Tariff exports
contain definitions only. The application uses Cloudflare Web Analytics for basic aggregate
performance measurement. Zaraz and other analytics are disabled; there is no service worker, remote
font, sensitive logging, or server-side credential proxy in the application.
The privacy page provides a persistent opt-out cookie that disables the beacon until the user
changes the preference or the cookie expires after one year.

Provider adapters must send requests only to their documented fixed HTTPS origins, omit cookies,
disable caching, reject redirects, omit referrers, validate pagination origins, bound retries, and
sanitize errors. They must use opaque references and clear credentials on disconnect. Never commit
real account data, credentials, meter serials, device IDs, or real consumption. See the repository
[security notes](https://github.com/aaron-russell/EnergyComparison/blob/main/SECURITY.md) for reporting
guidance.
