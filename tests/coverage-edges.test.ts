import { describe, expect, it } from 'vitest';
import { object, list, str, readResponse } from '../src/adapters/response';
import { chargingEnergy } from '../src/adapters/charging/energy';
import { dates, parseTimestamp, overlapDuration } from '../src/core/time';
import { validateTariff } from '../src/core/tariff';
import { exampleTariffs, syntheticReadings, syntheticSupplies } from '../src/fixtures/synthetic';
import { replay } from '../src/core/engine';

describe('adapter response and charging boundaries', () => {
  it('rejects malformed response values and unsupported statuses', async () => {
    expect(() => object(null)).toThrow('expected format');
    expect(() => object([])).toThrow('expected format');
    expect(() => list({})).toThrow('missing a list');
    expect(() => str(true)).toThrow('required value');
    await expect(readResponse(new Response('', { status: 404 }))).rejects.toMatchObject({
      code: 'unsupported',
    });
    await expect(readResponse(new Response('', { status: 403 }))).rejects.toMatchObject({
      code: 'auth',
    });
    await expect(readResponse(new Response('', { status: 429 }))).rejects.toMatchObject({
      code: 'network',
    });
  });

  it('normalises grid, provenance and invalid charging energy', () => {
    const values: Record<string, string> = { grid_kwh: '', kwh: '2', provenance: 'solar' };
    const read = (names: string[]) => names.map((name) => values[name] ?? '').find(Boolean) ?? '';
    expect(chargingEnergy(read, true)).toEqual({ kWh: '2', provenance: 'solar' });
    values.provenance = 'other';
    expect(chargingEnergy(read, true).provenance).toBe('grid');
    values.kwh = '-1';
    expect(() => chargingEnergy(read)).toThrow('non-negative');
  });
});

describe('time and tariff validation boundaries', () => {
  it('rejects invalid periods and parses local timestamps', () => {
    expect(() => dates({ start: '2024-01-02T00:00:00Z', end: '2024-01-01T00:00:00Z' })).toThrow(
      'end date',
    );
    expect(() => dates({ start: '2024-01-01T01:00:00Z', end: '2024-01-02T00:00:00Z' })).toThrow(
      'London midnight',
    );
    expect(() => dates({ start: '2010-01-01T00:00:00Z', end: '2020-01-02T00:00:00Z' })).toThrow(
      'five years',
    );
    expect(parseTimestamp('2024-01-01T12:00:00')).toContain('2024-01-01T12:00:00');
    expect(
      overlapDuration(
        { start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z' },
        { start: '2024-01-01T02:00:00Z', end: '2024-01-01T03:00:00Z' },
      ),
    ).toBe(0);
  });

  it('rejects tariffs without fuels, invalid EV settings and duplicate bands', () => {
    const empty = structuredClone(exampleTariffs[0]);
    empty.electricity = undefined;
    empty.gas = undefined;
    expect(() => validateTariff(empty)).toThrow('at least one fuel');
    expect(() =>
      validateTariff({
        ...empty,
        gas: structuredClone(exampleTariffs[0].gas),
        ev: { mode: 'override', rate: '1' },
      }),
    ).toThrow('electricity rates');
    const duplicate = structuredClone(exampleTariffs[0]);
    duplicate.electricity!.bands[0].end = '12:00';
    duplicate.electricity!.bands.push({
      ...duplicate.electricity!.bands[0],
      start: '12:00',
      end: '00:00',
    });
    expect(() => validateTariff(duplicate)).toThrow('unique name');
  });

  it('covers EV discount adjustments and missing-supply validation', () => {
    const tariff = {
      ...structuredClone(exampleTariffs[0]),
      ev: { mode: 'discount' as const, rate: '1' },
    };
    expect(() =>
      replay(tariff, [], [], { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' }),
    ).toThrow('at least one supply');
    expect(
      replay(
        tariff,
        [syntheticReadings({ start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' })[0]],
        [syntheticSupplies[0]],
        { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
      ).total,
    ).toBeDefined();
  });
});
