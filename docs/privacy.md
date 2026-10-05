---
title: Privacy and cookie policy | Energy Replay
description: How Energy Replay and energy.russell-tech.co.uk handle personal data, local storage and cookies.
canonical: /docs/privacy.html
reviewed: 2026-10-05
---

# Privacy and cookie policy

This policy applies to [energy.russell-tech.co.uk](https://energy.russell-tech.co.uk/) and its
documentation at `/docs/`. It describes the current implementation of Energy Replay, an
open-source static browser application from Russell Tech. It was reviewed on 5 October 2026.

This notice is written for transparency about the service as it is currently built. It is not a
substitute for tailored legal advice. If the application or its providers change, this notice will
be updated before the change is treated as part of the service.

## Use at your own risk

Energy Replay is provided as an open-source comparison and replay tool. Use it at your own risk
and check important results independently before relying on them. It is not financial, energy,
supplier or legal advice, does not guarantee accuracy or savings, and is not a substitute for your
provider's records or terms.

Russell Tech does not collect or store your household usage information, imported readings, account
details, meter or device identifiers, charging history, credentials or calculated results on its own
servers. The application processes this information in your browser, and your browser may send the
information required for a connection directly to a provider you choose. Technical hosting and
privacy-focused analytics may still process limited website or performance data as described below.

## Who is responsible for your data?

Russell Tech is responsible for the Energy Replay application and this website. The application
is developed in the [open-source Energy Replay repository](https://github.com/aaron-russell/EnergyComparison).
The repository does not currently publish a registered-company address or a general business email.
For questions or a data-rights request, use the [contact page](/contact)
to ask for a private channel before sharing personal information. Do not put credentials, account
numbers, meter identifiers or household readings in a public issue.

## Energy Replay application

Imported readings and charging records remain in the active browser tab session so a refresh can
restore progress. Credentials and account connections remain memory-only and are never stored.
Leaving the tab or using **Clear session** removes the progress. Only explicitly saved tariff definitions
and the dark/light theme use local storage. Tariff exports
contain tariff definitions only, never consumption, account, meter, or device data.

Provider requests are made directly from your browser to the fixed HTTPS origins documented by the
application. The chosen provider receives the request and any credentials or records required for
that provider connection under its own privacy notice. Russell Tech does not control how a provider
uses data after the request leaves your browser.

The application keeps provider credentials, connection objects and active workers in memory. The
non-credential workflow snapshot is written to `sessionStorage` for the current browser tab so a
refresh can restore progress; closing the tab or using **Clear session** removes it. Explicitly saved
tariff definitions and the dark/light theme are the only values written to `localStorage`.
Tariff exports contain tariff definitions only, never consumption, account, meter or device data.

The service is not intended for children, and you should only import data that you are authorised
to use.

## Cookies and similar technologies

The application and documentation site do not set cookies for login, advertising, profiling or
personalisation. They also do not use a service worker, remote fonts, session replay, advertising
pixels or other third-party tracking tools.

| Technology                    | What it does                                                                                | Where it is stored                                           | Retention                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| `energy-replay:theme`         | Remembers the selected dark or light theme.                                                 | Browser local storage                                        | Until you remove it or clear site data                     |
| `energy-replay:saved-tariffs` | Stores tariff definitions that you explicitly save.                                         | Browser local storage                                        | Until you delete the saved tariff or clear site data       |
| Session progress              | Holds non-credential imports, readings, charging data, results and in-progress form values. | Browser `sessionStorage` for the current tab                 | Until tab close, **Clear session**, or storage failure     |
| Cloudflare Web Analytics      | Measures aggregate page-performance signals for the application.                            | No cookie or local-storage identifier is used by the beacon. | Controlled by Cloudflare's service and dashboard retention |

Cloudflare Web Analytics is loaded only by the application shell, not by the documentation pages.
It is used for privacy-focused performance measurement and does not receive the household data
held by the app. Cloudflare states that Web Analytics does not use cookies or local storage and
does not collect visitors' personal data. See [Cloudflare's Web Analytics overview](https://developers.cloudflare.com/web-analytics/about/)
and [data-collection documentation](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/).

Because no non-essential cookies are currently set, there is no cookie-consent banner in this
version of the site. If that changes, the policy will identify the new technology and the site
will obtain consent where applicable before using non-essential cookies or similar storage.

## Why we use data and our legal basis

We use information only for these purposes:

- to provide the application features you request, including provider connections, import,
  calculation and export;
- to remember the tariff definitions and theme preference you explicitly save locally;
- to keep the site secure, available and usable; and
- to understand aggregate application performance through Cloudflare Web Analytics.

For data held only in your browser, the processing is necessary to provide the feature you choose
to use. For hosting and security, Russell Tech relies on the legitimate interest of operating and
protecting a public website. Web Analytics is limited to performance measurement and is not used
for advertising or behavioural profiling. The relevant provider may apply different purposes and
legal bases to data sent directly to it.

## Who receives data?

Russell Tech does not sell household data. Data may be processed by:

- Cloudflare, as the hosting and Web Analytics provider, to deliver, protect and measure the
  service; and
- the energy or charging provider you deliberately connect to, because your browser sends the
  connection request directly to that provider.

The app has no analytics other than the Cloudflare Web Analytics beacon, no application logging of
sensitive values, and no general-purpose proxy. The provider's own terms and privacy notice apply
to its systems and account data.

## Retention and deletion

Russell Tech does not retain the application session or locally saved tariff data on its own
servers. You can delete it by using **Clear session**, removing saved tariffs, clearing site data
in your browser, or deleting exported files from wherever you saved them. Provider-side retention
is controlled by the provider. Cloudflare's infrastructure and analytics retention are controlled
by Cloudflare's terms and settings.

## Your rights

Depending on the circumstances, UK data-protection law may give you rights to access, correct,
erase or restrict the use of personal data, object to processing, and receive portable data. You
may also complain to the [Information Commissioner's Office](https://ico.org.uk/make-a-complaint/).

To exercise a right about Energy Replay, use the [contact page](/contact) to request a
private contact route. We may need enough information to identify the request, but do not disclose
credentials or household records in a public issue. Requests about a provider's own account or
systems should be made to that provider.

## Changes and questions

We will update this page when the application's data handling, cookies, analytics or providers
change materially. The review date is shown in the page metadata and the current version is kept
in the repository. For questions, see the [contact page](/contact). For security issues,
follow the private process in [SECURITY.md](https://github.com/aaron-russell/EnergyComparison/blob/main/SECURITY.md).

For implementation details, see the [privacy and security guide](/operations/privacy-and-security).
