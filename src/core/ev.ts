import Decimal, { isNonNegativeDecimal } from './decimal';
import type { Charging, Reading } from './types';
import { ms, HALF_HOUR, overlapDuration } from './time';

function validateSession(session: Charging): void {
  const duration = ms(session.end) - ms(session.start);
  if (!isNonNegativeDecimal(session.kWh) || duration <= 0) {
    throw new Error('Charging energy and duration must be valid.');
  }
  const aligned = duration === HALF_HOUR && ms(session.start) % HALF_HOUR === 0;
  if (session.kind === 'interval' && !aligned) {
    throw new Error('Measured charging intervals must use half-hour boundaries.');
  }
}

function assertNoOverlaps(sessions: Charging[]): void {
  sessions.forEach((session, index) => {
    const overlaps = sessions
      .slice(0, index)
      .some(
        (other) => other.supplyRef === session.supplyRef && overlapDuration(other, session) > 0,
      );
    if (overlaps) {
      throw new Error(
        'Charging datasets overlap. Select one authoritative source or remove overlapping sessions.',
      );
    }
  });
}

function addAllocation(allocation: Map<string, Decimal>, reading: Reading, energy: Decimal): void {
  const key = `${reading.supplyRef}|${reading.start}`;
  const total = (allocation.get(key) ?? new Decimal(0)).add(energy);
  if (total.gt(reading.kWh)) {
    throw new Error(
      'Allocated EV grid energy exceeds household imports. Correct the session or its attribution; energy has not been clipped.',
    );
  }
  allocation.set(key, total);
}

function allocateSession(
  session: Charging,
  readings: Reading[],
  allocation: Map<string, Decimal>,
): void {
  if (session.provenance === 'solar') {
    return;
  }
  if (session.provenance !== 'grid') {
    throw new Error(
      'Confirm grid-energy attribution before applying EV rates. Mixed or unknown energy is not eligible.',
    );
  }
  const duration = ms(session.end) - ms(session.start);
  const matching = readings.filter(
    (reading) => reading.fuel === 'electricity' && reading.supplyRef === session.supplyRef,
  );
  let covered = 0;
  for (const reading of matching) {
    const overlap = overlapDuration(reading, session);
    if (overlap === 0) {
      continue;
    }
    covered += overlap;
    addAllocation(allocation, reading, new Decimal(session.kWh).mul(overlap).div(duration));
  }
  if (covered !== duration) {
    throw new Error('Charging sessions need household import coverage for their entire duration.');
  }
}

export function allocateEV(sessions: Charging[], readings: Reading[]): Map<string, Decimal> {
  const approved = sessions.filter((session) => session.approved);
  approved.forEach(validateSession);
  assertNoOverlaps(approved);
  const allocation = new Map<string, Decimal>();
  approved.forEach((session) => allocateSession(session, readings, allocation));
  return allocation;
}
