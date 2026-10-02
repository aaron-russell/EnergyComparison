---
title: Use the app | Energy Replay
description: Follow the six-step Energy Replay journey from connecting usage through comparing tariffs.
---

# Use the app

Energy Replay is a browser-based historical replay tool. It does not predict future bills, fetch a
supplier catalogue, rank suppliers, or guarantee savings. It prices the same selected household
readings against the tariff definitions you provide.

## The six-step journey

1. **Connect** an energy provider, or choose **Synthetic example** to explore without an account.
2. **Import** a period of half-hour electricity and gas readings.
3. **Review coverage** and optionally create a separately labelled estimate for missing intervals.
4. **Review optional EV charging** and approve only charging energy that is already in household imports.
5. **Enter tariffs**: select a baseline and add at least one alternative.
6. **Compare** identical supplies, dates, and energy, then inspect monthly, component, and band results.

The browser session owns imported readings, credentials, connections, and charging data. Refreshing,
leaving the page, or using **Clear session** removes them. Only explicitly saved tariff definitions
and the theme preference use local storage.

## Start locally

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open the local Vite URL. For a production-style preview, run `npm run build` followed by
`npm run preview`. The normal build includes both the application and this handbook.

## What a result means

Results are historical costs in VAT-inclusive pence, displayed as pounds. A complete 12-month
comparison is an annual historical cost; a shorter period is a period total. Rates entered today
are replayed unchanged over the selected historical dates.

Read [calculations](/calculations) before interpreting estimates, gas conversion, standing charges,
credits, rounding, or EV adjustments.
