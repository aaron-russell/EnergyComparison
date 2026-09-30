import Decimal, { isNonNegativeDecimal } from './decimal';
import type { Reading, Period, Supply } from './types';
import { ms, HALF_HOUR } from './time';

function validateReading(reading: Reading): void {
  const metadataValid =
    reading.supplyRef &&
    reading.source &&
    ['electricity', 'gas'].includes(reading.fuel) &&
    ['measured', 'estimated'].includes(reading.status);
  const intervalValid =
    ms(reading.end) - ms(reading.start) === HALF_HOUR && ms(reading.start) % HALF_HOUR === 0;
  if (!metadataValid || !intervalValid || !isNonNegativeDecimal(reading.kWh)) {
    throw new Error(
      'Readings must be non-negative decimal kWh on explicit half-hour UTC boundaries.',
    );
  }
}

export function normaliseReadings(rows: Reading[]): {
  readings: Reading[];
  conflicts: Reading[];
  duplicates: number;
} {
  const seen = new Map<string, Reading>();
  const conflicts: Reading[] = [];
  let duplicates = 0;
  for (const reading of rows) {
    validateReading(reading);
    const key = `${reading.supplyRef}|${ms(reading.start)}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, { ...reading });
    } else if (existing.fuel === reading.fuel && new Decimal(existing.kWh).eq(reading.kWh)) {
      duplicates++;
    } else {
      conflicts.push(reading);
    }
  }
  const readings = [...seen.values()].sort((first, second) => ms(first.start) - ms(second.start));
  return { readings, conflicts, duplicates };
}

export function assertDataset(rows: Reading[], supplies: Supply[], period: Period): void {
  const normalised = normaliseReadings(rows);
  if (normalised.conflicts.length || normalised.duplicates) {
    throw new Error('Resolve duplicate or conflicting meter records before comparison.');
  }
  if (new Set(supplies.map((supply) => supply.ref)).size !== supplies.length) {
    throw new Error('Supply references must be unique.');
  }
  for (const reading of rows) {
    const matchingSupply = supplies.some(
      (supply) => supply.ref === reading.supplyRef && supply.fuel === reading.fuel,
    );
    const withinPeriod = ms(reading.start) >= ms(period.start) && ms(reading.end) <= ms(period.end);
    if (!matchingSupply || !withinPeriod) {
      throw new Error('Readings do not match the selected supplies and period.');
    }
  }
}

export function gasToKWh(value: string, unit: 'kWh' | 'm3', calorific = '39.2'): string {
  if (!new Decimal(calorific).isFinite() || new Decimal(calorific).lte(0)) {
    throw new Error('Enter a positive calorific value.');
  }
  if (unit === 'kWh') {
    return new Decimal(value).toString();
  }
  return new Decimal(value).mul('1.02264').mul(calorific).div('3.6').toString();
}
