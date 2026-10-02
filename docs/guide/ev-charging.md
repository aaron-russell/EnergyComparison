---
title: EV charging | Energy Replay
description: Import, review and attribute EV charging sessions without double-counting household energy.
---

# EV charging

EV charging is optional context for pricing electricity. Household imports already include charging,
so the app allocates eligible charging energy to existing electricity intervals; it never adds a second
copy of that energy.

## Import or suggest sessions

Choose the electricity supply first, then select a charging source:

- Generic CSV/JSON accepts the documented normalized columns.
- Pod Point recognizes current and legacy report variants and shows a mapping preview.
- SmartFlex retrieves account-dependent historical sessions when the account exposes supported devices.
- Synthetic API charger is the safe executable example.
- Spike suggestions use household demand above 60% of charger power for at least one hour. They are
  estimates and can be caused by other appliances.

## Review before approval

Every session has timing, kWh, source, status, and provenance. Approve only sessions that are known to
be grid energy already represented in the selected household import. Solar sessions are ignored for EV
rate allocation. Unknown and mixed provenance must be resolved before approval.

Approved sessions must not overlap each other, must have positive duration, and must be fully covered by
household electricity readings. The allocator distributes a session across overlapping half-hours and
rejects any allocation larger than the household import. Nothing is clipped silently.

See the [EV adapter implementation guide](/guide/adding-an-ev-charger) for provider authors and the
[normalized data model](/reference/data-model) for the exact shape.
