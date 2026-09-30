import type { Job } from '../core/jobs';
import type { SessionData } from './session';

export function prepareReplay(
  data: SessionData,
  scope: string,
  view: string,
  renewable: string,
): Job {
  const supplies = data.supplies.filter((supply) => scope === 'dual' || supply.fuel === scope);
  if (scope === 'dual' && new Set(supplies.map((supply) => supply.fuel)).size !== 2) {
    throw new Error('Dual-fuel comparison needs both fuels. Select electricity-only or gas-only.');
  }
  if (data.conflicts) {
    throw new Error('Resolve conflicting import records before comparison.');
  }
  const source = view === 'estimated' ? data.estimated?.readings : data.readings;
  if (!source) {
    throw new Error('Create an estimated view before selecting it.');
  }
  const references = new Set(supplies.map((supply) => supply.ref));
  const tariffs = data.tariffs.filter(
    (tariff) =>
      tariff.id === data.baselineId || renewable === 'all' || tariff.renewable === renewable,
  );
  if (!tariffs.some((tariff) => tariff.id === data.baselineId)) {
    throw new Error('Choose a baseline tariff first.');
  }
  return {
    kind: 'replay',
    readings: source.filter((reading) => references.has(reading.supplyRef)),
    supplies,
    period: data.period,
    charging: data.charging.filter((session) => references.has(session.supplyRef)),
    tariffs,
  };
}
