---
title: Tariffs and comparison | Energy Replay
description: Build tariff definitions and compare identical historical usage across your chosen rates.
---

# Tariffs and comparison

There is no live tariff catalogue. Enter the rates you want to test, load synthetic examples, or import
validated tariff JSON. Prices remain fixed throughout the historical replay.

## Build tariffs

Add electricity bands that cover every half-hour of the week exactly once. A band uses Monday-based
weekday numbers and a local start/end time; an end before the start crosses midnight. Add gas pricing
when gas is selected, and enter standing charges, annual credit, renewable status, and optional EV rules.

Choose one tariff as the baseline and add at least one alternative. Saving is explicit and stores tariff
definitions only on the device. Exported JSON never contains readings, accounts, credentials, or device data.

## Compare

Choose dual fuel, electricity only, or gas only. Select observed-only or estimated-full-period data, and
optionally filter by renewable status. The replay worker prices the same supplies, dates, and readings
for every tariff. Results show period totals, monthly equivalents, monthly costs, component totals, and
electricity-band breakdowns.

For the import format and validation rules, see the [tariff schema](/reference/tariff-schema). For rounding and
EV adjustments, see [calculation assumptions](/calculations).
