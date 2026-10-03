import Decimal from 'decimal.js';
import type { Charging, Period, Reading } from '../core/types';
import { local, slots } from '../core/time';
import { syntheticSupplies } from './synthetic-data';
export { exampleTariffs, syntheticSupplies } from './synthetic-data';

export function syntheticReadings(period: Period): Reading[] {
  return slots(period).flatMap((slot) => {
    const time = local(slot.start);
    const evening = time.hour >= 17 && time.hour < 21;
    const charging = time.dayOfWeek === 2 && time.hour >= 1 && time.hour < 3;
    const winter = time.month <= 3 || time.month >= 10;
    return syntheticSupplies.map((supply) => ({
      ...slot,
      supplyRef: supply.ref,
      fuel: supply.fuel,
      kWh:
        supply.fuel === 'electricity'
          ? new Decimal(evening ? '0.46' : '0.13').add(charging ? '3.5' : '0').toString()
          : winter
            ? '0.9'
            : '0.24',
      source: 'synthetic-example',
      status: 'measured' as const,
    }));
  });
}

export function syntheticCharging(period: Period): Charging[] {
  return slots(period)
    .filter((slot) => {
      const time = local(slot.start);
      return time.dayOfWeek === 2 && time.hour === 1 && time.minute === 0;
    })
    .map((slot, index) => ({
      id: `synthetic-session-${index}`,
      supplyRef: 'synthetic-electricity',
      start: slot.start,
      end: new Date(Date.parse(slot.start) + 2 * 60 * 60 * 1000).toISOString(),
      kWh: '14',
      source: 'synthetic-charger',
      provenance: 'grid',
      kind: 'session',
      status: 'measured',
      approved: false,
    }));
}
