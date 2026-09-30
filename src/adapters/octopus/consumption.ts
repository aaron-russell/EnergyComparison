import type { Period, Reading } from '../../core/types';
import { instant, ms } from '../../core/time';
import { gasToKWh, normaliseReadings } from '../../core/readings';
import type { Context, Fields } from '../contracts';
import { safeError } from '../contracts';
import { cancelled, object, pages, str } from '../transport';
import type { Meter } from './discovery';

export const OCTOPUS_ORIGIN = 'https://api.octopus.energy';
export const authHeaders = (fields: Fields) => ({
  Authorization: `Basic ${btoa(`${fields.apiKey}:`)}`,
});

function consumptionURL(meter: Meter, period: Period): string {
  const point = encodeURIComponent(meter.point);
  const serial = encodeURIComponent(meter.serial);
  const url = new URL(
    `${OCTOPUS_ORIGIN}/v1/${meter.supply.fuel}-meter-points/${point}/meters/${serial}/consumption/`,
  );
  url.search = new URLSearchParams({
    period_from: period.start,
    period_to: period.end,
    page_size: '1500',
    order_by: 'period',
  }).toString();
  return url.href;
}

function parseReading(raw: unknown, meter: Meter, fields: Fields): Reading {
  const record = object(raw);
  const consumption = str(record.consumption);
  const kWh =
    meter.supply.fuel === 'gas'
      ? gasToKWh(consumption, fields.gasUnit as 'kWh' | 'm3', fields.calorific || '39.2')
      : consumption;
  return {
    start: instant(str(record.interval_start)).toString(),
    end: instant(str(record.interval_end)).toString(),
    kWh,
    supplyRef: meter.supply.ref,
    fuel: meter.supply.fuel,
    source: 'octopus',
    status: 'measured',
  };
}

async function importMeter(
  meter: Meter,
  period: Period,
  fields: Fields,
  context: Context,
  onBatch: (rows: Reading[]) => void,
): Promise<void> {
  const endpoint = consumptionURL(meter, period);
  for await (const page of pages(endpoint, { headers: authHeaders(fields) }, context.signal)) {
    const batch = page
      .map((raw) => parseReading(raw, meter, fields))
      .filter(
        (reading) => ms(reading.start) >= ms(period.start) && ms(reading.end) <= ms(period.end),
      );
    normaliseReadings(batch);
    onBatch(batch);
  }
}

export async function importConsumption(
  meters: Meter[],
  period: Period,
  fields: Fields,
  context: Context,
  onBatch: (rows: Reading[]) => void,
) {
  const readings: Reading[] = [];
  const failures: string[] = [];
  const receive = (batch: Reading[]) => {
    readings.push(...batch);
    onBatch(batch);
    context.progress({
      completed: readings.length,
      message: `Imported ${readings.length.toLocaleString()} intervals`,
    });
  };
  for (const meter of meters) {
    cancelled(context.signal);
    try {
      await importMeter(meter, period, fields, context, receive);
    } catch (error) {
      cancelled(context.signal);
      failures.push(`${meter.supply.label}: ${safeError(error)}`);
    }
  }
  return { readings, failures };
}
