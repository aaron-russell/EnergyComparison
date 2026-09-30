import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export default Decimal;

export function sum(values: Iterable<Decimal.Value>): Decimal {
  let total = new Decimal(0);
  for (const value of values) {
    total = total.add(value);
  }
  return total;
}

export function pounds(pence: Decimal): string {
  return pence.div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

export function isNonNegativeDecimal(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value) && new Decimal(value).isFinite();
}
