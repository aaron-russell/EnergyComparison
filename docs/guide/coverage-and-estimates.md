---
title: Coverage and estimates | Energy Replay
description: Understand observed coverage, missing intervals and explicitly labelled energy estimates.
---

# Coverage and estimates

The coverage table reports observed intervals, expected intervals, and observed kWh for every supply
and month. DST months have 46, 48, or 50 expected half-hour intervals per local day as appropriate.

## Observed view

Observed data is never overwritten. The observed comparison excludes missing energy, but still applies
standing charges and credits to every selected day. Use this view when you want only measured readings.

## Estimated full-period view

Use **Create estimated view** to create a separate dataset. Profiles prefer four matching complete
days in the same month and require at least 28 complete observed days per supply without bills. Monthly
bill totals fill only the missing remainder; they do not replace observed energy.

Uniform allocation is an explicit opt-in for cases where a bill total exists but there is not enough
profile data. The final interval absorbs decimal residue so the monthly total is conserved.

The result labels estimated share and notes reliability. A missing whole month remains lower confidence
because its seasonal pattern is unknown. Compare the observed and estimated views separately rather than
mixing their conclusions.
