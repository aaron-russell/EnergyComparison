import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import Decimal from 'decimal.js';
import { replay } from '../src/core/engine';
import { midnight, slots, previousYear } from '../src/core/time';
import { validateTariff } from '../src/core/tariff';
import { exampleTariffs } from '../src/fixtures/synthetic';
import type { Reading, Tariff } from '../src/core/types';

const supply = { ref: 'anonymous', fuel: 'electricity' as const, label: 'Home' };
const period = { start: midnight('2024-01-01'), end: midnight('2024-02-01') };
const flat = (): Tariff => ({ ...structuredClone(exampleTariffs[0]), gas: undefined });
const readings = (p = period, kWh = '0.1'): Reading[] =>
  slots(p).map((s) => ({
    ...s,
    supplyRef: supply.ref,
    fuel: supply.fuel,
    kWh,
    source: 'test',
    status: 'measured',
  }));

describe('time and tariff engine', () => {
  it('uses actual spring/autumn intervals and leap days', () => {
    expect(slots({ start: midnight('2024-03-31'), end: midnight('2024-04-01') })).toHaveLength(46);
    expect(slots({ start: midnight('2024-10-27'), end: midnight('2024-10-28') })).toHaveLength(50);
    expect(slots({ start: midnight('2024-02-01'), end: midnight('2024-03-01') })).toHaveLength(
      29 * 48,
    );
  });
  it('charges all local days even without readings', () => {
    const result = replay(flat(), [], [supply], period);
    expect(result.total).toBe('15.19');
    expect(result.complete).toBe(false);
  });
  it('preserves precision and reconciles rounded components', () => {
    const result = replay(flat(), readings(period, '0.123456789'), [supply], period);
    const month = result.months[0];
    expect(result.energy.electricity).toBe(new Decimal('0.123456789').mul(1488).toString());
    expect(new Decimal(month.electricity).add(month.standing).toFixed(2)).toBe(result.total);
    expect(month.bands['All day']).toBe(month.electricity);
  });
  it('permits negative rates and rejects unknown rules and versions', () => {
    const tariff = flat();
    tariff.electricity!.bands[0].rate = '-10';
    expect(Number(replay(tariff, readings(), [supply], period).months[0].electricity)).toBeLessThan(
      0,
    );
    expect(() => validateTariff({ ...tariff, version: 2 })).toThrow();
    expect(() => validateTariff({ ...tariff, plugin: 'https://example.test/code.js' })).toThrow();
  });
  it('rejects gaps, overlaps and non-half-hour schedules', () => {
    const tariff = flat();
    tariff.electricity!.bands[0].end = '23:30';
    expect(() => validateTariff(tariff)).toThrow('gaps');
    tariff.electricity!.bands.push({ ...tariff.electricity!.bands[0] });
    expect(() => validateTariff(tariff)).toThrow('overlap');
    tariff.electricity!.bands[0].start = '00:15';
    expect(() => validateTariff(tariff)).toThrow();
  });
  it('handles overnight weekdays as the starting day', () => {
    const tariff = flat();
    tariff.electricity!.bands = [
      { name: 'Monday night', days: [1], start: '23:00', end: '01:00', rate: '1' },
      { name: 'Tuesday', days: [2], start: '01:00', end: '00:00', rate: '20' },
      { name: 'Monday', days: [1], start: '00:00', end: '23:00', rate: '20' },
      { name: 'Other', days: [3, 4, 5, 6, 7], start: '00:00', end: '00:00', rate: '20' },
    ];
    const row = readings().find((r) => r.start === '2024-01-02T00:00:00Z')!;
    expect(replay(tariff, [{ ...row, kWh: '1' }], [supply], period).months[0].electricity).toBe(
      '0.01',
    );
  });
  it('requires selected fuel prices', () => {
    expect(() => replay(flat(), [], [{ ref: 'gas', fuel: 'gas', label: 'Gas' }], period)).toThrow(
      'gas prices',
    );
  });
  it('rounds half up and has a complete calendar-year default', () => {
    const tariff = flat();
    tariff.electricity!.bands[0].rate = '0.5';
    expect(
      replay(tariff, [{ ...readings()[0], kWh: '1' }], [supply], period).months[0].electricity,
    ).toBe('0.01');
    const defaultPeriod = previousYear();
    expect(defaultPeriod.start).not.toBe(defaultPeriod.end);
  });
  it('conserves cost under arbitrary decimal energy values', () => {
    const firstReading = readings()[0];
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100000 }), (units) => {
        const kWh = new Decimal(units).div(10000).toString();
        const result = replay(flat(), [{ ...firstReading, kWh }], [supply], period);
        expect(result.months[0].electricity).toBe(
          new Decimal(kWh).mul(25).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
        );
      }),
      { numRuns: 40 },
    );
  });
});
