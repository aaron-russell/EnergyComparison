---
title: Privacy and household energy data | Energy Replay
description: See where Energy Replay keeps imported readings, credentials, tariff definitions, and browser preferences.
schemaType: TechArticle
reviewed: 2026-10-05
---

# Privacy and household energy data

Energy Replay is a static browser application. Imported readings and comparison work happen in
your browser; the application does not send them to an Energy Replay application server.

## Data during a session

Imported readings, charging records, workflow progress, and in-progress form values are held in
the current browser tab session so a refresh can resume the workflow. Provider credentials and
live connections remain in memory and are not stored. Clear the session or close the tab to remove
the session data. A live provider connection may need to be made again after a refresh.

Provider connections make requests from your browser to the provider. Review that provider's own
privacy terms and decide whether to connect. Synthetic examples let you explore without using a
real account or household export.

## What is saved on this device

Only tariff definitions that you explicitly save and the display theme use local storage. Tariff
exports contain tariff definitions, not readings, credentials, account identifiers, or comparison
results. You can remove saved tariffs from the tariff screen and reset the theme in the app.

## Your choices

Use synthetic data if you do not want to connect a provider. You can also import a file locally,
review the [privacy policy](/privacy), and read the [connection and import guide](/guide/connection-and-import)
before starting. [Open the app](https://energy.russell-tech.co.uk/app/).
