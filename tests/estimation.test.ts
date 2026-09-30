import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import Decimal, { sum } from '../src/core/decimal';
import { estimate } from '../src/core/estimate';
import { distributeRemainder } from '../src/core/estimation/bills';
import { buildProfile } from '../src/core/estimation/profiles';
import { local, midnight, slots } from '../src/core/time';
import type { Fuel, Period, Reading, Supply } from '../src/core/types';

const supply: Supply = { ref: 'home', fuel: 'electricity', label: 'Home' };
const period = { start: midnight('2024-03-01'), end: midnight('2024-04-01') };
function readings(range: Period, fuel: Fuel = 'electricity'): Reading[] {
  return slots(range).map((slot) => ({
    ...slot,
    supplyRef: 'home',
    fuel,
    kWh: '0.1',
    source: 'test',
    status: 'measured',
  }));
}

describe('estimation boundaries', () => {
  it('preserves observed records and conserves a monthly bill across spring DST', () => {
    const observed = readings(period).slice(0, 48);
    const original = structuredClone(observed);
    const result = estimate(
      observed,
      [supply],
      period,
      [{ supplyRef: 'home', month: '2024-03', kWh: '100' }],
      true,
    );
    expect(observed).toEqual(original);
    expect(result.readings.filter((reading) => reading.status === 'measured')).toEqual(original);
    expect(sum(result.readings.map((reading) => reading.kWh)).toFixed(8)).toBe('100.00000000');
    expect(result.readings).toHaveLength(31 * 48 - 2);
    expect(result.estimated.every((reading) => reading.status === 'estimated')).toBe(true);
  });
  it('requires explicit uniform allocation with insufficient observed days', () => {
    expect(() =>
      estimate([], [supply], period, [{ supplyRef: 'home', month: '2024-03', kWh: '100' }]),
    ).toThrow('uniform');
    expect(() => estimate([], [supply], period)).toThrow('28 complete');
  });
  it('rejects bills below measured use and mismatched totals with full coverage', () => {
    const observed = readings(period);
    expect(() =>
      estimate(observed, [supply], period, [{ supplyRef: 'home', month: '2024-03', kWh: '1' }]),
    ).toThrow('below observed');
    expect(() =>
      estimate(observed, [supply], period, [{ supplyRef: 'home', month: '2024-03', kWh: '1000' }]),
    ).toThrow('full coverage');
  });
  it('marks whole-month extrapolation as unreliable', () => {
    const observed = readings(period);
    const longer = { start: period.start, end: midnight('2024-05-01') };
    const result = estimate(observed, [supply], longer);
    expect(result.notes.some((note) => note.includes('seasonality is unknown'))).toBe(true);
    expect(result.readings).toHaveLength(slots(longer).length);
  });
  it('prefers same-month profiles after four matching complete days', () => {
    const january = readings({ start: midnight('2024-01-01'), end: midnight('2024-01-29') });
    const february = readings({ start: midnight('2024-02-01'), end: midnight('2024-02-10') }).map(
      (row) => ({ ...row, kWh: '0.7' }),
    );
    const profile = buildProfile([...january, ...february], 'electricity');
    expect(
      profile.meanFor({ start: '2024-02-12T12:00:00Z', end: '2024-02-12T12:30:00Z' })?.toString(),
    ).toBe('0.7');
  });
  it('uses daily gas means weighted across the actual autumn day', () => {
    const ordinary = readings(
      { start: midnight('2024-10-01'), end: midnight('2024-10-27') },
      'gas',
    );
    const profile = buildProfile(ordinary, 'gas');
    const autumn = slots({ start: midnight('2024-10-27'), end: midnight('2024-10-28') });
    expect(sum(autumn.map((slot) => profile.meanFor(slot)!)).toFixed(8)).toBe('4.80000000');
    expect(autumn.filter((slot) => local(slot.start).hour === 1)).toHaveLength(4);
  });
  it('conserves decimal remainders for arbitrary weights', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 50 }),
        fc.integer({ min: 0, max: 100000 }),
        (values, units) => {
          const remainder = new Decimal(units).div(1000);
          const allocated = distributeRemainder(
            values.map((value) => new Decimal(value)),
            remainder,
          );
          expect(sum(allocated).eq(remainder)).toBe(true);
        },
      ),
    );
  });
});
