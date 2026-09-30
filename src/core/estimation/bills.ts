import { Temporal } from '@js-temporal/polyfill';
import { midnight, ms } from '../time';
import Decimal, { isNonNegativeDecimal, sum } from '../decimal';
import type { Period, Reading, Supply } from '../types';

export type BillTotal = { supplyRef: string; month: string; kWh: string };

export function validateBills(bills: BillTotal[], supplies: Supply[], period: Period): void {
  const keys = bills.map((bill) => `${bill.supplyRef}|${bill.month}`);
  if (new Set(keys).size !== keys.length) {
    throw new Error('Enter one bill total per supply and month.');
  }
  for (const bill of bills) {
    const knownSupply = supplies.some((supply) => supply.ref === bill.supplyRef);
    if (!knownSupply || !isNonNegativeDecimal(bill.kWh) || !/^\d{4}-\d{2}$/.test(bill.month)) {
      throw new Error('Invalid bill total.');
    }
    assertFullBillMonth(bill.month, period);
  }
}

export function billRemainder(
  bill: BillTotal | undefined,
  observed: Reading[],
  missingCount: number,
): Decimal | undefined {
  if (!bill) {
    return undefined;
  }
  const remainder = new Decimal(bill.kWh).sub(sum(observed.map((reading) => reading.kWh)));
  if (remainder.isNegative()) {
    throw new Error(`${bill.month}: bill total is below observed consumption.`);
  }
  if (!missingCount && !remainder.isZero()) {
    throw new Error(`${bill.month}: full coverage cannot absorb a different bill total.`);
  }
  return remainder;
}

/** Put division residue in the final interval so the bill's remainder is conserved. */
export function distributeRemainder(weights: Decimal[], remainder: Decimal): Decimal[] {
  const totalWeight = sum(weights);
  let allocated = new Decimal(0);
  const result = weights.map((weight, index) => {
    if (index === weights.length - 1) {
      return remainder.sub(allocated);
    }
    const energy = totalWeight.isZero() ? new Decimal(0) : remainder.mul(weight).div(totalWeight);
    allocated = allocated.add(energy);
    return energy;
  });

  // Decimal arithmetic can round the sum of the independently calculated values by one
  // precision unit. Apply that tiny correction to the final interval as well, so conservation
  // holds for the returned values when they are summed again.
  if (result.length > 0) {
    const last = result.length - 1;
    result[last] = result[last].add(remainder.sub(sum(result)));
  }
  return result;
}

function assertFullBillMonth(month: string, period: Period): void {
  const first = Temporal.PlainDate.from(`${month}-01`);
  const start = midnight(first.toString());
  const end = midnight(first.add({ months: 1 }).toString());
  if (ms(start) < ms(period.start) || ms(end) > ms(period.end)) {
    throw new Error(
      'Monthly bill totals require the complete bill month inside the replay period.',
    );
  }
}
