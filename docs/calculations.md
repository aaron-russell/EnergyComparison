---
title: Calculation assumptions | Energy Replay
description: Review Energy Replay's time, decimal arithmetic, estimation and tariff calculation assumptions.
---

# Calculation assumptions

## Boundaries and money

All normalised household readings are nonnegative decimal kWh, exactly 30 minutes long with
explicit UTC boundaries. The engine accepts anonymous supply references only. Intervals are
start-inclusive and end-exclusive. Electricity schedules use Europe/London local time, Monday=1.
A band's weekdays describe its starting day. An end before the start crosses midnight; matching
start/end means 24 hours. A valid weekly schedule covers every half-hour exactly once.

Temporal preserves both repeated autumn intervals and does not fabricate spring intervals.
Replay boundaries must be local midnights and the selected period must be at most five years.
The default is the previous 12 complete London calendar months. Export meters are excluded.
Non-half-hour API records are rejected rather than silently disaggregated into measured records.

Decimal arithmetic uses 40 significant digits. Prices are decimal strings in VAT-inclusive pence
per kWh, pence per local calendar day and pence per year for fixed credits. Negative unit prices
are allowed. Standing charges apply once per local day per selected supply, even on missing-data
days. Credits apply once per comparison, prorated by the actual days in each calendar year.
Enter a credit appropriate to the selected fuel scope; this tool does not infer dual-fuel eligibility.

Electricity, gas, standing charges, credits and EV adjustments each round monthly to pennies,
half-up. Displayed monthly totals sum those components; displayed period totals sum months.
Displayed band rounding residue goes to the final band to reconcile to the electricity component.
The monthly equivalent divides the period total by the number of months touched. Only a complete
12-month comparison represents an annual historical cost; shorter periods are labelled period totals.

The manually selected baseline and all alternatives use identical dates, fuels and readings.
Dual-fuel comparisons need both fuel prices and both supplies; electricity-only and gas-only
comparisons are separate options. Rates entered today are replayed unchanged over the period.

## Missing data

Observed readings are never overwritten. A separate estimate fills unobserved intervals. Complete
observed days have all actual UTC half-hours (46, 48 or 50 depending on DST). Electricity uses a
mean for each local half-hour and weekday/weekend category. Four matching complete days in the
same calendar month are preferred; otherwise all matching day categories are used. Gas uses an
equivalent mean daily total, distributed over the actual number of half-hours in the missing day.
Profiles are cached by month/category/half-hour/day length during the estimate.

Without bills, at least 28 complete observed days per supply are required. Missing whole months
can be extrapolated but are marked low reliability because their seasonal pattern is unknown.
Monthly bill totals require the complete bill month inside the replay period.
With a monthly bill, only the total minus observed energy is distributed. Totals below observed
use, duplicate monthly totals, or incompatible totals on completely observed months are rejected.
If profiles are insufficient, the user must explicitly opt into uniform allocation; it is never
silently enabled. The final interval absorbs division residue so bill totals are conserved.

Coverage is observed intervals divided by expected intervals for the selected supplies and dates.
Estimated share is estimated energy divided by total estimated-plus-observed energy. Coverage
screens show both by month. An observed-only result excludes missing energy, but includes all
standing charges and prorated credits and is visibly labelled incomplete.

## Gas and EV energy

Gas units must be confirmed because response availability and meter type vary. Cubic metres use
`m³ × 1.02264 × calorific value ÷ 3.6`; the editable default calorific value is 39.2. This is an
approximation, not invoice reconciliation. kWh API data is not converted again.

Session-total charging reports do not establish a measured half-hour profile. They are distributed
evenly over duration and explicitly described as estimated timing. Date-only reports need a user
window. Ambiguous/nonexistent London timestamps require an explicit offset in the source. A
reported/measured session total remains distinct from its estimated timing. Measured interval
imports must use half-hour boundaries.

Only approved grid charging already within household imports can receive EV pricing. Overlapping
approved sessions require a chosen authoritative source or rejection/correction. Mixed/unknown
provenance blocks discounts; solar energy is excluded. Allocations exceeding household imports or
covering a missing household interval are rejected without clipping. EV energy is never added to
household imports. Session edits are explicit user corrections, not provider verification.

Spike suggestions use a median background by local half-hour and weekday/weekend. Demand must
exceed that background by more than 60% of configured charger power for at least two consecutive
half-hours. Defaults to 7 kW. Suggestions start unapproved, estimated and unknown-provenance.
Other appliances can produce false positives; frequent charging can influence the background.

Only purchased energy is modelled. Solar/battery attribution needs confirmation. Export income,
battery dispatch simulation, future price changes, exit fees and speculative savings are excluded.
