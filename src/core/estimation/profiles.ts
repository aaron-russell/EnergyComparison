import { Temporal } from '@js-temporal/polyfill';
import Decimal, { sum } from '../decimal';
import { groupBy } from '../collections';
import { halfHoursInDay, local, localDate } from '../time';
import type { Fuel, Period, Reading } from '../types';

type ObservedDay = {
  readings: Reading[];
  halfHours: Map<string, Reading[]>;
  weekend: boolean;
  month: number;
};

function halfHourKey(timestamp: string): string {
  const time = local(timestamp);
  return `${time.hour}:${time.minute}`;
}
export type ConsumptionProfile = {
  completeDays: number;
  meanFor: (slot: Period) => Decimal | undefined;
};

function completeObservedDays(readings: Reading[]): ObservedDay[] {
  const days = groupBy(readings, (reading) => localDate(reading.start));
  return [...days]
    .filter(([date, rows]) => rows.length === halfHoursInDay(date))
    .map(([date, rows]) => {
      const day = Temporal.PlainDate.from(date);
      return {
        readings: rows,
        halfHours: groupBy(rows, (reading) => halfHourKey(reading.start)),
        weekend: day.dayOfWeek > 5,
        month: day.month,
      };
    });
}

function matchingDays(days: ObservedDay[], slot: Period): ObservedDay[] {
  const time = local(slot.start);
  const weekend = time.dayOfWeek > 5;
  const matching = days.filter((day) => day.weekend === weekend);
  const sameMonth = matching.filter((day) => day.month === time.month);
  return sameMonth.length >= 4 ? sameMonth : matching;
}

function electricityMean(days: ObservedDay[], slot: Period): Decimal | undefined {
  const key = halfHourKey(slot.start);
  const values = days.flatMap((day) =>
    (day.halfHours.get(key) ?? []).map((reading) => reading.kWh),
  );
  return values.length ? sum(values).div(values.length) : undefined;
}

function gasMean(days: ObservedDay[], slot: Period): Decimal {
  const dailyTotals = days.map((day) => sum(day.readings.map((reading) => reading.kWh)));
  return sum(dailyTotals)
    .div(days.length)
    .div(halfHoursInDay(localDate(slot.start)));
}

export function buildProfile(readings: Reading[], fuel: Fuel): ConsumptionProfile {
  const complete = completeObservedDays(readings);
  // Local profile results repeat; gas additionally depends on the actual DST day length.
  const means = new Map<string, Decimal | undefined>();
  return {
    completeDays: complete.length,
    meanFor(slot) {
      const time = local(slot.start);
      const key = `${time.month}|${time.dayOfWeek > 5}|${halfHourKey(slot.start)}|${halfHoursInDay(localDate(slot.start))}`;
      if (means.has(key)) {
        return means.get(key);
      }
      const days = matchingDays(complete, slot);
      if (!days.length) {
        return undefined;
      }
      const mean = fuel === 'gas' ? gasMean(days, slot) : electricityMean(days, slot);
      means.set(key, mean);
      return mean;
    },
  };
}
