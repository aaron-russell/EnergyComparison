---
title: Tariff JSON schema | Energy Replay
description: Validate the versioned tariff JSON structure used by Energy Replay imports and exports.
---

# Tariff JSON schema

The machine-readable tariff schema is [`public/tariff.schema.json`](https://github.com/aaron-russell/EnergyComparison/blob/main/public/tariff.schema.json).
Use the app's export action to create a valid starting point, or validate an edited file before import.

The schema is versioned. A tariff contains an ID, name, renewable status, annual credit, optional
electricity bands, optional gas pricing, and optional EV pricing. Electricity bands must form a complete,
non-overlapping weekly schedule. Monetary and energy values are decimal strings.

Tariff imports are validated data. They cannot provide URLs, execute code, register adapters, or introduce
provider connections.
