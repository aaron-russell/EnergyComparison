---
title: Normalized data model | Energy Replay
description: Reference the anonymous, provider-independent data shapes accepted by the Energy Replay core.
---

# Normalized data model

The core accepts provider-independent values only.

| Shape      | Required meaning                                                                           |
| ---------- | ------------------------------------------------------------------------------------------ |
| `Period`   | UTC `start` and exclusive `end` timestamps                                                 |
| `Supply`   | Anonymous `ref`, `fuel` (`electricity` or `gas`), and display `label`                      |
| `Reading`  | A supply, fuel, decimal-string `kWh`, source, and measured/estimated status                |
| `Charging` | A supply, period, decimal-string `kWh`, source, provenance, kind, status, approval, and ID |
| `Tariff`   | Versioned ID/name, renewable status, fuel rates, annual credit, and optional EV rule       |

Energy readings are nonnegative and exactly half-hour aligned. Charging sessions may span multiple
intervals, but measured charging intervals must be half-hour aligned. Provenance is one of `grid`,
`solar`, `mixed`, or `unknown`; `kind` is `session` or `interval`.

Keep decimal values as strings. Do not convert energy or money to JavaScript numbers. Provider names,
account numbers, meter identifiers, device identifiers, credentials, and arbitrary upstream fields do
not cross this boundary.
