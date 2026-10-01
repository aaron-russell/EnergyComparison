import { describe, expect, it } from 'vitest';
import { prepareReplay } from '../src/state/replay-job';
import { isAnnualPeriod } from '../src/core/time';
import { exampleTariffs } from '../src/fixtures/synthetic';
import type { SessionData } from '../src/state/session';

const period = { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' };

function session(tariffs: SessionData['tariffs'], baselineId: string): SessionData {
  return {
    period,
    supplies: [
      { ref: 'electricity', fuel: 'electricity', label: 'Electricity' },
      { ref: 'gas', fuel: 'gas', label: 'Gas' },
    ],
    readings: [],
    conflicts: 0,
    charging: [],
    estimated: null,
    tariffs,
    baselineId,
  };
}

describe('replay tariff compatibility', () => {
  it.each(['dual', 'electricity', 'gas'])('keeps tariffs compatible with %s scope', (scope) => {
    const dual = structuredClone(exampleTariffs[0]);
    const electricity = { ...structuredClone(dual), id: 'electricity-only', gas: undefined };
    const gas = { ...structuredClone(dual), id: 'gas-only', electricity: undefined };
    const expected =
      scope === 'dual' ? [dual.id] : [dual.id, scope === 'electricity' ? electricity.id : gas.id];
    const job = prepareReplay(session([dual, electricity, gas], dual.id), scope, 'observed', 'all');

    expect(job.kind).toBe('replay');
    if (job.kind === 'replay') {
      expect(job.tariffs.map((tariff) => tariff.id)).toEqual(expected);
    }
  });

  it('rejects a baseline that does not cover the selected fuel scope', () => {
    const dual = structuredClone(exampleTariffs[0]);
    const electricity = { ...structuredClone(dual), id: 'electricity-only', gas: undefined };
    expect(() =>
      prepareReplay(session([electricity], electricity.id), 'dual', 'observed', 'all'),
    ).toThrow('baseline tariff does not include prices');
  });
});

describe('annual result classification', () => {
  it('recognises complete normal, leap, and non-January years', () => {
    expect(
      isAnnualPeriod({ start: '2023-01-01T00:00:00Z', end: '2024-01-01T00:00:00Z' }, true),
    ).toBe(true);
    expect(
      isAnnualPeriod({ start: '2024-01-01T00:00:00Z', end: '2025-01-01T00:00:00Z' }, true),
    ).toBe(true);
    expect(
      isAnnualPeriod({ start: '2024-01-15T00:00:00Z', end: '2025-01-15T00:00:00Z' }, true),
    ).toBe(false);
    expect(
      isAnnualPeriod({ start: '2024-10-01T00:00:00Z', end: '2025-10-01T00:00:00Z' }, true),
    ).toBe(true);
    expect(
      isAnnualPeriod({ start: '2023-01-01T00:00:00Z', end: '2024-01-01T00:00:00Z' }, false),
    ).toBe(false);
  });
});
