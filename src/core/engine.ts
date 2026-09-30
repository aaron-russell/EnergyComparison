import Decimal, { sum } from './decimal';
import type { Reading, Supply, Period, Tariff, Charging, ReplayResult, Band } from './types';
import { dates, local, localMonth, ms, HALF_HOUR } from './time';
import { schedule, validateTariff } from './tariff';
import { assertDataset } from './readings';
import { allocateEV } from './ev';
import { finaliseMonth, initialiseMonths, type CostAccumulator } from './monthly-costs';

function assertFuelPrices(tariff: Tariff, supplies: Supply[]): void {
  if (!supplies.length) {
    throw new Error('Select at least one supply.');
  }
  for (const supply of supplies) {
    if (!tariff[supply.fuel]) {
      throw new Error(`This comparison needs ${supply.fuel} prices on every tariff.`);
    }
  }
}

function electricityBand(reading: Reading, week: Band[]): Band | undefined {
  if (reading.fuel !== 'electricity') {
    return undefined;
  }
  const time = local(reading.start);
  return week[(time.dayOfWeek - 1) * 48 + time.hour * 2 + Math.floor(time.minute / 30)];
}

function addReadingCost(
  cost: CostAccumulator,
  reading: Reading,
  tariff: Tariff,
  week: Band[],
  eligible: Decimal,
): void {
  const band = electricityBand(reading, week);
  const rate = new Decimal(band?.rate ?? tariff.gas!.rate);
  const charge = new Decimal(reading.kWh).mul(rate);
  cost[reading.fuel] = cost[reading.fuel].add(charge);
  if (band) {
    cost.bands[band.name] = (cost.bands[band.name] ?? new Decimal(0)).add(charge);
  }
  if (tariff.ev) {
    const adjustment =
      tariff.ev.mode === 'override'
        ? new Decimal(tariff.ev.rate).sub(rate)
        : new Decimal(tariff.ev.rate).neg();
    cost.evAdjustment = cost.evAdjustment.add(eligible.mul(adjustment));
  }
}

/** Price provider-independent readings; never fetch, persist or mutate input data. */
export function replay(
  tariff: Tariff,
  readings: Reading[],
  supplies: Supply[],
  period: Period,
  charging: Charging[] = [],
): ReplayResult {
  const validated = validateTariff(tariff);
  const days = dates(period);
  assertDataset(readings, supplies, period);
  assertFuelPrices(validated, supplies);
  const week = validated.electricity ? schedule(validated.electricity.bands) : [];
  const ev = validated.ev ? allocateEV(charging, readings) : new Map<string, Decimal>();
  const months = initialiseMonths(days, supplies, validated);
  const energy = { electricity: new Decimal(0), gas: new Decimal(0) };
  for (const reading of readings) {
    const cost = months.get(localMonth(reading.start))!;
    const eligible = ev.get(`${reading.supplyRef}|${reading.start}`) ?? new Decimal(0);
    energy[reading.fuel] = energy[reading.fuel].add(reading.kWh);
    addReadingCost(cost, reading, validated, week, eligible);
  }
  const results = [...months].map(([month, cost]) => finaliseMonth(month, cost));
  const total = sum(results.map((month) => month.total));
  return {
    tariffId: validated.id,
    months: results,
    total: total.toFixed(2),
    monthlyEquivalent: total.div(results.length).toFixed(2),
    days: days.length,
    complete:
      readings.length === (supplies.length * (ms(period.end) - ms(period.start))) / HALF_HOUR,
    energy: { electricity: energy.electricity.toString(), gas: energy.gas.toString() },
  };
}
