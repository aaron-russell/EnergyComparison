import { groupBy } from './collections';
import { sum } from './decimal';
import { localMonth, slots } from './time';
import type { Period, Reading, Supply } from './types';
export type CoverageRow = {
  supply: Supply;
  month: string;
  expected: number;
  observed: number;
  kWh: string;
  percent: number;
};
export function coverageRows(
  readings: Reading[],
  supplies: Supply[],
  period: Period,
): CoverageRow[] {
  const months = groupBy(slots(period), (slot) => localMonth(slot.start));
  const observed = groupBy(
    readings,
    (reading) => `${reading.supplyRef}|${localMonth(reading.start)}`,
  );
  return supplies.flatMap((supply) =>
    [...months].map(([month, expected]) => {
      const rows = observed.get(`${supply.ref}|${month}`) ?? [];
      return {
        supply,
        month,
        expected: expected.length,
        observed: rows.length,
        kWh: sum(rows.map((reading) => reading.kWh)).toFixed(3),
        percent: (rows.length / expected.length) * 100,
      };
    }),
  );
}
