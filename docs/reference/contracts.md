---
title: Adapter contracts | Energy Replay
description: Reference the TypeScript contracts shared by Energy Replay energy and charging adapters.
---

# Adapter contracts

These TypeScript interfaces are the supported extension boundary. Source links point to the current
branch definitions in [`src/adapters/contracts.ts`](https://github.com/aaron-russell/EnergyComparison/blob/main/src/adapters/contracts.ts). The source link intentionally targets the repository's default branch; use the local file for the exact revision under review.

## Shared operation types

`Context` contains an `AbortSignal` and a progress callback. Every network or large parsing operation
must check cancellation. `Fields` is a string record populated by the declarative form. `IntegrationError`
uses `auth`, `network`, `invalid`, `unsupported`, `cancelled`, or `conflict` codes and can mark an error
retryable. `safeError` converts unknown failures to a non-sensitive message.

## EnergyProviderAdapter

An energy adapter declares `id`, `name`, `description`, `fields`, and `capabilities`, then implements
`connect(fields, context)`. The returned `EnergyConnection` exposes anonymous supplies, `import(period,
context, onBatch)`, optional current-tariff metadata, and `disconnect()`.

The import result contains normalized readings and user-safe failure messages. Connections may return
partial successes, but conflicting overlaps must block replay.

## ChargingProviderAdapter

A charging adapter declares whether it is a `file` or `api` integration. File adapters implement
`parse`; API adapters implement `connect`, which returns anonymous devices and a `history` method. Both
return `ChargingPreview` with sessions, column mapping, and notices. `measuredGrid` describes capability,
not a guarantee that every returned record is measured grid energy.

## Registration

Executable adapters are build-time code and must be explicitly registered in `src/adapters/registries.ts`.
Imported tariff JSON is data only and cannot register executable code.
