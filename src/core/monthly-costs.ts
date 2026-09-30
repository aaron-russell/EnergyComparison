import { Temporal } from '@js-temporal/polyfill';
import Decimal, { pounds, sum } from './decimal';
import type { MonthlyCost, Supply, Tariff } from './types';

export type CostAccumulator = {
  electricity: Decimal;
  gas: Decimal;
  standing: Decimal;
  credits: Decimal;
  evAdjustment: Decimal;
  bands: Record<string, Decimal>;
};

function emptyMonth(): CostAccumulator {
  return {
    electricity: new Decimal(0),
    gas: new Decimal(0),
    standing: new Decimal(0),
    credits: new Decimal(0),
    evAdjustment: new Decimal(0),
    bands: Object.create(null),
  };
}

export function initialiseMonths(days: string[], supplies: Supply[], tariff: Tariff) {
  const months = new Map<string, CostAccumulator>();
  const dailyStanding = sum(supplies.map((supply) => tariff[supply.fuel]!.standing));
  for (const day of days) {
    const month = day.slice(0, 7);
    const cost = months.get(month) ?? emptyMonth();
    const daysInYear = Temporal.PlainDate.from(day).daysInYear;
    cost.standing = cost.standing.add(dailyStanding);
    cost.credits = cost.credits.sub(new Decimal(tariff.annualCredit).div(daysInYear));
    months.set(month, cost);
  }
  return months;
}

function roundedBands(bands: Record<string, Decimal>, electricity: string): Record<string, string> {
  const rounded = Object.fromEntries(
    Object.entries(bands).map(([name, cost]) => [name, pounds(cost)]),
  );
  const lastName = Object.keys(rounded).at(-1);
  if (lastName !== undefined) {
    // Displayed bands must reconcile to the independently rounded electricity component.
    const residual = new Decimal(electricity).sub(sum(Object.values(rounded)));
    rounded[lastName] = new Decimal(rounded[lastName]).add(residual).toFixed(2);
  }
  return rounded;
}

export function finaliseMonth(month: string, cost: CostAccumulator): MonthlyCost {
  const components = {
    electricity: pounds(cost.electricity),
    gas: pounds(cost.gas),
    standing: pounds(cost.standing),
    credits: pounds(cost.credits),
    evAdjustment: pounds(cost.evAdjustment),
  };
  return {
    month,
    ...components,
    bands: roundedBands(cost.bands, components.electricity),
    total: sum(Object.values(components)).toFixed(2),
  };
}
