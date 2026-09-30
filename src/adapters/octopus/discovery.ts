import type { Fuel, Supply } from '../../core/types';
import type { Fields } from '../contracts';
import { IntegrationError } from '../contracts';
import { list, object, str } from '../transport';

export type Meter = { supply: Supply; point: string; serial: string };
type MeterPoint = { fuel: Fuel; point: string; serials: string[]; group: string };

function manualPoint(raw: unknown, groups: Map<string, string>): MeterPoint[] {
  const meter = object(raw);
  if (meter.is_export === true) {
    return [];
  }
  if (meter.fuel !== 'electricity' && meter.fuel !== 'gas') {
    throw new Error('Invalid fuel');
  }
  const group = str(meter.group ?? 'manual');
  if (!groups.has(group)) {
    groups.set(group, `Manual supply ${groups.size + 1}`);
  }
  return [
    {
      fuel: meter.fuel,
      point: str(meter.point),
      serials: [str(meter.serial)],
      group: groups.get(group)!,
    },
  ];
}

export function parseManualMeters(input: string): MeterPoint[] {
  try {
    const groups = new Map<string, string>();
    return list(JSON.parse(input)).flatMap((raw) => manualPoint(raw, groups));
  } catch {
    throw new IntegrationError(
      'invalid',
      'Manual meters need fuel, point and serial fields. Use the same group for replacement meters.',
    );
  }
}

function propertyPoints(
  property: Record<string, unknown>,
  fuel: Fuel,
  label: string,
): MeterPoint[] {
  return list(property[`${fuel}_meter_points`] ?? []).flatMap((raw) => {
    const point = object(raw);
    if (point.is_export === true) {
      return [];
    }
    return [
      {
        fuel,
        point: str(point[fuel === 'electricity' ? 'mpan' : 'mprn']),
        group: label,
        serials: list(point.meters).map((meter) => str(object(meter).serial_number)),
      },
    ];
  });
}

export function parseAccountMeters(response: unknown): MeterPoint[] {
  return list(object(response).properties).flatMap((raw, index) => {
    const property = object(raw);
    const label = `Property ${index + 1}`;
    return (['electricity', 'gas'] as const).flatMap((fuel) =>
      propertyPoints(property, fuel, label),
    );
  });
}

export function createMeterCatalogue(
  points: MeterPoint[],
  fields: Fields,
): { meters: Meter[]; supplies: Supply[] } {
  const byPoint = new Map<string, Supply>();
  const meters: Meter[] = [];
  for (const point of points) {
    if (point.fuel === 'gas' && fields.gasUnit === 'none') {
      continue;
    }
    const key = `${point.fuel}|${point.point}`;
    const supply = byPoint.get(key) ?? {
      ref: crypto.randomUUID(),
      fuel: point.fuel,
      label: `${point.group} · ${point.fuel} · supply ${byPoint.size + 1}`,
    };
    byPoint.set(key, supply);
    meters.push(...point.serials.map((serial) => ({ supply, point: point.point, serial })));
  }
  return { meters, supplies: [...byPoint.values()] };
}

export function validateDiscoveredSupplies(supplies: Supply[], fields: Fields): void {
  if (!supplies.length) {
    throw new IntegrationError(
      'unsupported',
      'No import meters were found. Try manual meter entry.',
    );
  }
  if (supplies.some((supply) => supply.fuel === 'gas') && !['m3', 'kWh'].includes(fields.gasUnit)) {
    throw new IntegrationError('invalid', 'Confirm your gas consumption unit before importing.');
  }
}
