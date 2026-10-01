import { Temporal } from '@js-temporal/polyfill';
import type { Period } from './types';
export const ZONE = 'Europe/London';
export const HALF_HOUR = 1_800_000;
export const instant = (s: string) => Temporal.Instant.from(s);
export const ms = (s: string) => instant(s).epochMilliseconds;
export const utc = (n: number) => Temporal.Instant.fromEpochMilliseconds(n).toString();
export const local = (s: string) => instant(s).toZonedDateTimeISO(ZONE);
export const midnight = (s: string) =>
  Temporal.PlainDate.from(s).toZonedDateTime(ZONE).toInstant().toString();
export function previousYear(now = Temporal.Now.zonedDateTimeISO(ZONE)): Period {
  const end = now.toPlainDate().with({ day: 1 });
  return {
    start: midnight(end.subtract({ months: 12 }).toString()),
    end: midnight(end.toString()),
  };
}
export function dates(period: Period): string[] {
  if (ms(period.start) >= ms(period.end)) {
    throw new Error('Choose an end date after the start date.');
  }
  let day = local(period.start).toPlainDate();
  const end = local(period.end).toPlainDate();
  const out: string[] = [];
  if (
    midnight(day.toString()) !== instant(period.start).toString() ||
    midnight(end.toString()) !== instant(period.end).toString()
  ) {
    throw new Error('Replay periods must start and end at London midnight.');
  }
  if (day.until(end).days > 366 * 5) {
    throw new Error('Choose a period of five years or less.');
  }
  while (Temporal.PlainDate.compare(day, end) < 0) {
    out.push(day.toString());
    day = day.add({ days: 1 });
  }
  return out;
}
export function slots(period: Period): Period[] {
  const out: Period[] = [];
  for (let t = ms(period.start); t < ms(period.end); t += HALF_HOUR) {
    out.push({ start: utc(t), end: utc(Math.min(t + HALF_HOUR, ms(period.end))) });
  }
  return out;
}
export function parseTimestamp(value: string): string {
  try {
    return instant(value).toString();
  } catch {
    return Temporal.PlainDateTime.from(value)
      .toZonedDateTime(ZONE, { disambiguation: 'reject' })
      .toInstant()
      .toString();
  }
}

export function localDate(timestamp: string): string {
  return local(timestamp).toPlainDate().toString();
}

export function localMonth(timestamp: string): string {
  return localDate(timestamp).slice(0, 7);
}

export function halfHoursInDay(date: string): number {
  const nextDate = Temporal.PlainDate.from(date).add({ days: 1 }).toString();
  return (ms(midnight(nextDate)) - ms(midnight(date))) / HALF_HOUR;
}

export function overlapDuration(first: Period, second: Period): number {
  return Math.max(
    0,
    Math.min(ms(first.end), ms(second.end)) - Math.max(ms(first.start), ms(second.start)),
  );
}

export function isAnnualPeriod(period: Period, complete: boolean): boolean {
  const start = local(period.start).toPlainDate();
  const end = local(period.end).toPlainDate();
  return (
    complete &&
    start.day === 1 &&
    end.day === 1 &&
    Temporal.PlainDate.compare(end, start.add({ months: 12 })) === 0
  );
}
