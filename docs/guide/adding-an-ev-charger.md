# Add an EV charger

Charging integrations are independent of energy providers. A charging adapter produces a preview of
normalized sessions; the existing review UI decides what is approved and the core allocator applies
eligible energy to household imports.

## File adapter

Use `method: 'file'`, advertise extensions in `capabilities.files`, implement `detect` when multiple
file formats are possible, and implement `parse(text, options, context)`. Parse only the fields needed
for the normalized session. Return a mapping preview and notices so a user can audit the import.

```ts
export const exampleFileCharger: ChargingProviderAdapter = {
  id: 'example-file-charger',
  name: 'Example charger export',
  method: 'file',
  description: 'Synthetic CSV format for tests.',
  fields: [],
  capabilities: {
    discovery: false,
    api: false,
    files: ['csv'],
    resolution: 'mixed',
    history: 'Imported file history',
    measuredGrid: false,
  },
  async parse(text, options, context) {
    // Validate rows, map timestamps, and return sessions plus mapping notices.
    throw new Error('Implement file parser');
  },
};
```

## API adapter

Use `method: 'api'`, implement `connect`, and return anonymous device references. `history` receives a
selected device, period, target household supply, and cancellation/progress context. Keep credentials,
provider device IDs, and response parsing inside the connection closure. Clear all of them in `disconnect`.

Use the same transport safety rules as energy adapters. If the account exposes no supported device or
permissions are unavailable, return an explicit `unsupported` integration error with a file-import path.

## Session semantics

Normalize every item to `Charging`: `start`, `end`, `kWh`, `source`, `provenance`, `kind`, `status`,
`approved`, `id`, and `supplyRef`. Use explicit UTC offsets. Use `kind: 'interval'` only for measured
half-hour data; use `kind: 'session'` when timing is estimated. Prefer measured grid kWh over total
energy. If attribution is unknown, preserve that uncertainty and require review.

Register the adapter in `chargingProviders`, add parser/API contract tests, and exercise it through the
shared charging form. The [EV charging guide](/guide/ev-charging) describes the user-facing approval
rules.
