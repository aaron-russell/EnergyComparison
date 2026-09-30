# Architecture and complexity boundaries

The calculation engine accepts only anonymous, provider-independent data. Adapters own credentials,
original meter/device identifiers and upstream response shapes. Parsing never belongs in the replay
engine; network requests never belong in calculation modules.

## Calculation modules

| Module                        | Responsibility                                                                |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `core/engine.ts`              | Validate a replay and orchestrate pricing of readings                         |
| `core/monthly-costs.ts`       | Standing charges, daily credit proration, monthly rounding and reconciliation |
| `core/estimate.ts`            | Orchestrate separate estimated readings per supply and month                  |
| `core/estimation/profiles.ts` | Complete-day selection and electricity/gas profile means                      |
| `core/estimation/bills.ts`    | Bill validation and exact remainder distribution                              |
| `core/estimation/weights.ts`  | Profile eligibility and explicitly authorised uniform allocation              |
| `core/ev.ts`                  | Approved-session allocation, overlaps, provenance and household limits        |
| `core/spikes.ts`              | Unapproved charging suggestions from a background profile                     |
| `core/readings.ts`            | Normalisation, duplicate/conflict detection and gas conversion                |
| `core/time.ts`                | London calendar and explicit UTC interval operations                          |
| `core/decimal.ts`             | Shared decimal precision, sums and currency rounding                          |

## Integration modules

`adapters/octopus.ts` is the connection lifecycle. Its adjacent `octopus/` modules separate form
metadata, meter discovery and consumption import. Replacement meters share an anonymous supply
reference; independent meter points remain separate supplies.

`adapters/charging-files.ts` registers file adapters. The `charging/` modules separate CSV/JSON
reading, column mapping, timestamp handling, energy provenance and normalised session construction.
Provider-specific format policy is passed explicitly to the parser.

`adapters/transport.ts` handles cancellation, bounded retry and validated pagination.
`adapters/response.ts` validates response shapes and converts HTTP failures into sanitised errors.
Neither module knows supplier-specific response fields.

## Enforced limits

ESLint checks all production source functions:

- Cyclomatic complexity: maximum 10.
- Block nesting: maximum 3 levels.
- Function length: maximum 80 nonblank, noncomment lines.
- Explicit braces for control flow.

Do not disable these rules to add a feature. Extract a cohesive operation with a descriptive name.
Prefer domain modules over a generic utilities bucket. Keep shared helpers only when they have a
clear common responsibility. Avoid splitting straightforward expressions just to lower a metric.

The initial complexity review found maximum complexity 36 in estimation, 24 in charging-file
parsing and 22 in replay. Following extraction, the maximum across source functions is 9. These
numbers describe the refactor checkpoint; ESLint is the ongoing enforcement mechanism.

Regression tests cover replay boundaries, monthly rounding, DST profiles, bill conservation,
unchanged observations, charging provenance and limits, parsing variants, replacement meters,
partial failures, retry/cancellation and sanitised transport errors. Fixtures are synthetic.
