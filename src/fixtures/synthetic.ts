import Decimal from 'decimal.js';
import type { Charging, Period, Reading, Supply, Tariff } from '../core/types';
import { local, slots } from '../core/time';

export const syntheticSupplies: Supply[] = [
  { ref: 'synthetic-electricity', fuel: 'electricity', label: 'Example home · electricity' },
  { ref: 'synthetic-gas', fuel: 'gas', label: 'Example home · gas' },
];

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

export const exampleTariffs: Tariff[] = [
  {
    version: 1,
    id: 'example-baseline',
    name: 'Example current tariff',
    renewable: 'unknown',
    annualCredit: '0',
    gas: { rate: '6.2', standing: '31' },
    electricity: {
      standing: '49',
      bands: [
        { name: 'All day', days: [1, 2, 3, 4, 5, 6, 7], start: '00:00', end: '00:00', rate: '25' },
      ],
    },
  },
  {
    version: 1,
    id: 'example-night',
    name: 'Example overnight tariff',
    renewable: 'yes',
    annualCredit: '0',
    gas: { rate: '6.2', standing: '31' },
    electricity: {
      standing: '51',
      bands: [
        { name: 'Overnight', days: [1, 2, 3, 4, 5, 6, 7], start: '00:00', end: '05:30', rate: '8' },
        { name: 'Daytime', days: [1, 2, 3, 4, 5, 6, 7], start: '05:30', end: '00:00', rate: '29' },
      ],
    },
  },
];
