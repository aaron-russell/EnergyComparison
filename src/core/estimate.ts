import { sum } from './decimal';
import type { Period, Reading, Supply } from './types';
import { dates, slots, localMonth } from './time';
import { assertDataset } from './readings';
import { groupBy } from './collections';
import { buildProfile, type ConsumptionProfile } from './estimation/profiles';
import {
  billRemainder,
  distributeRemainder,
  validateBills,
  type BillTotal,
} from './estimation/bills';
import { estimationWeights } from './estimation/weights';

export type { BillTotal } from './estimation/bills';
export type EstimateResult = {
  readings: Reading[];
  estimated: Reading[];
  notes: string[];
  coverage: number;
  estimatedShare: string;
};

type MonthInput = {
  month: string;
  missing: Period[];
  observed: Reading[];
  bill: BillTotal | undefined;
  supply: Supply;
  profile: ConsumptionProfile;
  uniform: boolean;
  notes: Set<string>;
};

function estimateMonth(input: MonthInput): Reading[] {
  const { month, missing, observed, bill, supply, profile, uniform, notes } = input;
  const remainder = billRemainder(bill, observed, missing.length);
  if (!missing.length) {
    return [];
  }
  const weights = estimationWeights({ missing, profile, remainder, uniform, notes });
  if (!observed.length && !bill) {
    notes.add(`${month}: whole-month extrapolation has low reliability; seasonality is unknown.`);
  }
  const energy = remainder === undefined ? weights : distributeRemainder(weights, remainder);
  return missing.map((slot, index) => ({
    ...slot,
    supplyRef: supply.ref,
    fuel: supply.fuel,
    kWh: energy[index].toString(),
    status: 'estimated',
    source: bill ? 'monthly-bill-allocation' : 'observed-profile',
  }));
}

function estimateSupply(
  observed: Reading[],
  supply: Supply,
  expected: Map<string, Period[]>,
  bills: BillTotal[],
  uniform: boolean,
  notes: Set<string>,
): Reading[] {
  const seen = new Set(observed.map((reading) => reading.start));
  const observedMonths = groupBy(observed, (reading) => localMonth(reading.start));
  const profile = buildProfile(observed, supply.fuel);
  return [...expected].flatMap(([month, intervals]) =>
    estimateMonth({
      month,
      supply,
      profile,
      uniform,
      notes,
      missing: intervals.filter((slot) => !seen.has(slot.start)),
      observed: observedMonths.get(month) ?? [],
      bill: bills.find((bill) => bill.supplyRef === supply.ref && bill.month === month),
    }),
  );
}

function estimatedEnergyShare(observed: Reading[], estimated: Reading[]): string {
  const extra = sum(estimated.map((reading) => reading.kWh));
  const total = extra.add(sum(observed.map((reading) => reading.kWh)));
  return total.isZero() ? '0' : extra.div(total).mul(100).toFixed(1);
}

export function estimate(
  observed: Reading[],
  supplies: Supply[],
  period: Period,
  bills: BillTotal[] = [],
  uniform = false,
): EstimateResult {
  dates(period);
  assertDataset(observed, supplies, period);
  if (observed.some((reading) => reading.status !== 'measured')) {
    throw new Error('Estimation requires unchanged observed readings.');
  }
  validateBills(bills, supplies);
  const expectedSlots = slots(period);
  const expectedMonths = groupBy(expectedSlots, (slot) => localMonth(slot.start));
  const observedSupplies = groupBy(observed, (reading) => reading.supplyRef);
  const notes = new Set<string>();
  const estimated = supplies.flatMap((supply) =>
    estimateSupply(
      observedSupplies.get(supply.ref) ?? [],
      supply,
      expectedMonths,
      bills,
      uniform,
      notes,
    ),
  );
  return {
    readings: [...observed, ...estimated].sort((first, second) =>
      first.start.localeCompare(second.start),
    ),
    estimated,
    notes: [
      ...notes,
      'Observed readings are unchanged. Profiles use local half-hours and actual DST intervals.',
    ],
    coverage: observed.length / (expectedSlots.length * supplies.length),
    estimatedShare: estimatedEnergyShare(observed, estimated),
  };
}
