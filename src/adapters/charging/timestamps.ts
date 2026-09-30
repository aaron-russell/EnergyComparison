import { Temporal } from '@js-temporal/polyfill';
import { ms, parseTimestamp } from '../../core/time';
import type { Period } from '../../core/types';
import { IntegrationError, type ChargingOptions } from '../contracts';
import type { ColumnReader } from './rows';

function normaliseDate(value: string): string {
  const match = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function dateOnlyWindow(options: ChargingOptions, notices: Set<string>): Period {
  if (!options.windowStart || !options.windowEnd) {
    throw new IntegrationError(
      'invalid',
      'This date-only report requires a charging window. Enter start and end times, then preview again.',
    );
  }
  notices.add('Date-only sessions use your chosen window: timing is estimated.');
  return { start: options.windowStart, end: options.windowEnd };
}

function attachDate(period: Period, date: string): Period {
  if (!/^\d\d:\d\d(:\d\d)?$/.test(period.start)) {
    return period;
  }
  const startDate = Temporal.PlainDate.from(date);
  const endDate = period.end <= period.start ? startDate.add({ days: 1 }) : startDate;
  return { start: `${startDate}T${period.start}`, end: `${endDate}T${period.end}` };
}

export function chargingPeriod(
  read: ColumnReader,
  options: ChargingOptions,
  notices: Set<string>,
): Period {
  let period = {
    start: read(['start', 'interval_start', 'start time'], 'Start'),
    end: read(['end', 'interval_end', 'end time'], 'End'),
  };
  const date = normaliseDate(read(['date'], 'Date'));
  if (!period.start && date) {
    period = dateOnlyWindow(options, notices);
  }
  const dated = attachDate(period, date);
  const result = { start: parseTimestamp(dated.start), end: parseTimestamp(dated.end) };
  if (ms(result.end) <= ms(result.start)) {
    throw new Error('Charging must end after it starts.');
  }
  return result;
}
