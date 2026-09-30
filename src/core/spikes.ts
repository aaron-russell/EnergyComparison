import Decimal, { sum } from './decimal';
import type { Charging, Reading } from './types';
import { ms, local } from './time';
import { groupBy } from './collections';

type ExcessReading = { reading: Reading; excess: Decimal };

function profileKey(reading: Reading): string {
  const time = local(reading.start);
  return `${reading.supplyRef}|${time.dayOfWeek > 5}|${time.hour}:${time.minute}`;
}

function backgroundProfile(readings: Reading[]): Map<string, Decimal> {
  const groups = groupBy(readings, profileKey);
  return new Map(
    [...groups].map(([key, rows]) => {
      const values = rows
        .map((reading) => new Decimal(reading.kWh))
        .sort((first, second) => first.cmp(second));
      return [key, values[Math.floor((values.length - 1) / 2)]];
    }),
  );
}

function inferredSession(group: ExcessReading[]): Charging {
  const first = group[0].reading;
  return {
    id: `spike-${first.supplyRef}-${first.start}`,
    supplyRef: first.supplyRef,
    start: first.start,
    end: group.at(-1)!.reading.end,
    kWh: sum(group.map((item) => item.excess)).toString(),
    source: 'spike-estimate',
    provenance: 'unknown',
    kind: 'session',
    status: 'estimated',
    approved: false,
  };
}

function consecutiveSpikes(
  rows: Reading[],
  background: Map<string, Decimal>,
  threshold: Decimal,
): Charging[] {
  const sessions: Charging[] = [];
  let group: ExcessReading[] = [];
  const flush = () => {
    if (group.length >= 2) {
      sessions.push(inferredSession(group));
    }
    group = [];
  };
  for (const reading of [...rows].sort((first, second) => ms(first.start) - ms(second.start))) {
    const excess = new Decimal(reading.kWh).sub(background.get(profileKey(reading)) ?? 0);
    if (group.at(-1)?.reading.end !== reading.start) {
      flush();
    }
    if (excess.mul(2).gt(threshold)) {
      group.push({ reading, excess });
    } else {
      flush();
    }
  }
  flush();
  return sessions;
}

/** Heuristic suggestions only: sessions require explicit review and grid attribution. */
export function detectSpikes(readings: Reading[], power = '7'): Charging[] {
  const chargerPower = new Decimal(power);
  if (!chargerPower.isFinite() || chargerPower.lte(0)) {
    throw new Error('Enter a positive charger power.');
  }
  const observed = readings.filter(
    (reading) => reading.fuel === 'electricity' && reading.status === 'measured',
  );
  const background = backgroundProfile(observed);
  const supplies = groupBy(observed, (reading) => reading.supplyRef);
  const threshold = chargerPower.mul('0.6');
  return [...supplies.values()].flatMap((rows) => consecutiveSpikes(rows, background, threshold));
}
