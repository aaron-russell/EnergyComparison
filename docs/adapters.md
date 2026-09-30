# Adapter development

## Separate contracts

`EnergyProviderAdapter` defines identity, declarative connection fields, capabilities and a
connection factory. A connection discovers anonymous supplies, imports readings in batches, and
supports explicit disconnect. Optional current-tariff metadata is capability-gated; Octopus
currently declares it unsupported, so the user's manually entered baseline remains authoritative.

`ChargingProviderAdapter` separately defines file or API access, discovery, formats, format
detection, resolution, history and measured-grid capabilities. API connections expose anonymous
device references and history retrieval. File parsers return mapping previews, notices and
normalised charging sessions. Do not describe spike detection as a charging-provider adapter.

`TariffSource` is a third independent interface for tariff data. Manual entry and JSON import are
registered in `core/tariff.ts`. Runtime validation rejects executable URLs, unknown rules and
unsupported schema versions. A future public tariff source must return the same validated data.

## Add a provider

1. Implement the appropriate contract in a focused adapter module. Use metadata for connection
   fields and capabilities; never add provider-ID conditionals to page components.
2. Keep credentials, addresses, meter identifiers and device IDs in the connection/parser layer.
   Generate opaque supply/device references. Connection disconnect must release its state.
3. Reuse transport cancellation, bounded retries, pagination and sanitised errors. Keep provider
   authentication and upstream parsing inside the adapter. Use a fixed origin and review any
   pagination destinations before sending credentials.
4. Normalise nonnegative decimal kWh and explicit UTC half-hour boundaries before returning
   consumption. Distinguish measured energy, estimated energy and estimated session timing.
5. Declare capabilities honestly. If a service returns battery-added rather than measured grid
   energy, declare grid attribution unknown. Surface unavailable account capabilities explicitly.
6. Add synthetic fixtures and tests for malformed data, units, timestamps, cancellation, progress,
   retry, pagination and safe errors. Exercise replacement meters and overlaps where applicable.
7. Register in the separate `energyProviders` or `chargingProviders` array. No engine edits.
8. Add an end-to-end workflow using the shared forms and an unchanged replay engine.

The bundled `syntheticEnergy` and `syntheticCharger` adapters are compact executable examples.
The browser workflow tests pair them through the same UI and worker used by real integrations.

## File formats

Generic CSV headers: `start,end,kWh,provenance,kind,status`. JSON uses an array of equivalent
objects. Timestamps should use `Z` or an explicit offset. `kind` is `session` or `interval`;
provenance is `grid`, `solar`, `mixed` or `unknown`. Omitted provenance defaults to unknown.
Optional `grid_kwh` is preferred over total energy. Names and arbitrary extra fields are discarded.

Pod Point recognises the legacy `Date,kWh Consumed,Location type` report and newer reports with
`Start time,End time,Total kWh Consumed,kWh Grid (Home),kWh Solar (Home)`. Only Home rows survive.
The grid column is preferred when present; otherwise attribution is unknown until reviewed.
Names, addresses and locations are not retained. Legacy dates need a charging window. The UI
shows the detected mapping before sessions can be approved.

Documented provider references:

- [Octopus REST account and consumption endpoints](https://docs.octopus.energy/rest/guides/endpoints/)
- [Octopus SmartFlex devices query](https://docs.octopus.energy/graphql/reference/queries/)
- [Octopus charging-session and energy definitions](https://docs.octopus.energy/graphql/reference/objects/)
- [Pod Point Solo 3S report columns](https://cdn-www.pod-point.com/Solo-3S-App-User-Guide-PP-D-MK0068-7_2025-05-30-090157_vauk.pdf)
- [Pod Point legacy charging report](https://cdn-www.pod-point.com/App-User-Guide-PP-D-MK0019-5.pdf)

SmartFlex uses actual historical `chargingSessions`, not planned dispatches. DateTime pagination
must advance; duplicate boundary sessions are deduplicated. Unavailable energy values, units,
permissions, response shapes or pagination are explicit errors. Live token/CORS checks are release
gates and cannot be proven by synthetic fixtures.

## Future proxies

Do not add a proxy until an integration demonstrably cannot work directly in-browser. Any future
endpoint must be stateless, allow fixed upstream destinations only, omit cookies, and avoid
credential/consumption persistence or logging. Review and test it as a new trust boundary.
