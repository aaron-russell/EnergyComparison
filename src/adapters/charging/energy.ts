import Decimal, { isNonNegativeDecimal } from '../../core/decimal';
import type { Charging } from '../../core/types';
import type { ColumnReader } from './rows';

function provenance(value: string, gridConfirmed: boolean): Charging['provenance'] {
  switch (value) {
    case 'grid':
    case 'solar':
    case 'mixed':
    case 'unknown':
      return value;
    default:
      return gridConfirmed ? 'grid' : 'unknown';
  }
}

export function chargingEnergy(
  read: ColumnReader,
  gridConfirmed = false,
): Pick<Charging, 'kWh' | 'provenance'> {
  const grid = read(['grid_kwh', 'kwh grid (home)', 'grid kwh'], 'Grid energy (preferred)');
  const total =
    grid || read(['kwh', 'kwh consumed', 'total kwh consumed', 'energy'], 'Session energy');
  const value = total.trim().replace(/\s*kwh$/i, '');
  if (!isNonNegativeDecimal(value)) {
    throw new Error('Charging energy must be non-negative decimal kWh.');
  }
  return {
    kWh: new Decimal(value).toString(),
    provenance: grid ? 'grid' : provenance(read(['provenance'], 'Energy origin'), gridConfirmed),
  };
}
