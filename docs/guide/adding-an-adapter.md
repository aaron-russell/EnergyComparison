---
title: Add an energy adapter | Energy Replay
description: Implement a provider adapter that preserves Energy Replay's contracts, privacy boundaries and test guarantees.
---

# Add an energy adapter

An energy adapter connects one provider to the shared replay engine. The adapter owns credentials,
provider identifiers, network requests, pagination, and upstream response shapes. The engine must only
see anonymous `Supply` and normalized `Reading` values.

## 1. Define metadata and fields

Create a focused module in `src/adapters/`. Export an `EnergyProviderAdapter` with a stable `id`, a
human-readable name and description, declarative connection fields, and honest capabilities. Fields
describe the UI; they are not a place to store secrets.

```ts
export const exampleEnergy: EnergyProviderAdapter = {
  id: 'example-energy',
  name: 'Example Energy',
  description: 'Synthetic example for tests.',
  fields: [{ key: 'token', label: 'Access token', type: 'password', required: true }],
  capabilities: {
    discovery: true,
    fuels: ['electricity'],
    resolution: 'half-hour',
    history: 'Historical half-hour imports',
    currentTariff: false,
  },
  async connect(fields, context) {
    // Validate, discover, and return an EnergyConnection.
    throw new Error('Implement provider connection');
  },
};
```

## 2. Implement the connection lifecycle

`connect` should validate required input, discover supplies, and return `supplies`, `import`, and
`disconnect`. Generate opaque references for supplies. Never return a meter point, serial, account
number, or upstream device identifier to the core model. `disconnect` must clear credentials and maps.

Use `request`, `pages`, `IntegrationError`, and the response helpers from `src/adapters/transport.ts`
and `src/adapters/response.ts`. Requests must omit cookies, reject untrusted pagination destinations,
use bounded retries, honor `AbortSignal`, and expose sanitized errors.

## 3. Normalize readings

Return nonnegative decimal kWh, explicit UTC half-hour boundaries, an anonymous supply reference, source,
and measured/estimated status. Reject ambiguous timestamps, non-half-hour records, unsupported units,
malformed response shapes, and conflicting overlaps. Keep replacement meters together when they represent
the same import supply; keep independent meter points separate.

## 4. Register and test

Add the adapter to the `energyProviders` array in `src/adapters/registries.ts`. Do not edit the pricing
engine or add provider IDs to a page. Add synthetic fixtures and contract tests for valid data,
malformed rows, units, timestamps, cancellation, retry, pagination, partial failures, replacement
meters, overlaps, and sanitized errors. Add or extend a Playwright workflow through the existing forms.

The bundled `syntheticEnergy` adapter is the smallest complete example. Compare it with the public
[adapter contracts](/reference/contracts) before copying a pattern.
