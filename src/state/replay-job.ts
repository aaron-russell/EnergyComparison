import type { Job } from '../core/jobs';
import type { SessionData } from './session';

export function prepareReplay(
  data: SessionData,
  scope: string,
  view: string,
  renewable: string,
  requireBaseline = true,
): Job {
  const supplies = selectSupplies(data, scope);
  validateInputs(data, scope, supplies, view, requireBaseline);
  const source = view === 'estimated' ? data.estimated?.readings : data.readings;
  if (!source) {
    throw new Error('Create an estimated view before selecting it.');
  }
  const references = new Set(supplies.map((supply) => supply.ref));
  const tariffs = selectTariffs(data, supplies, renewable, requireBaseline);
  return {
    kind: 'replay',
    readings: source.filter((reading) => references.has(reading.supplyRef)),
    supplies,
    period: data.period,
    charging: data.charging.filter((session) => references.has(session.supplyRef)),
    tariffs,
  };
}

function selectSupplies(data: SessionData, scope: string) {
  return data.supplies.filter((supply) => scope === 'dual' || supply.fuel === scope);
}

function validateInputs(
  data: SessionData,
  scope: string,
  supplies: ReturnType<typeof selectSupplies>,
  view: string,
  requireBaseline: boolean,
) {
  if (scope === 'dual' && new Set(supplies.map((supply) => supply.fuel)).size !== 2) {
    throw new Error('Dual-fuel comparison needs both fuels. Select electricity-only or gas-only.');
  }
  if (data.conflicts) {
    throw new Error('Resolve conflicting import records before comparison.');
  }
  if (view === 'estimated' && !data.estimated?.readings) {
    throw new Error('Create an estimated view before selecting it.');
  }
  if (requireBaseline && !data.baselineId) {
    throw new Error('Choose a baseline tariff first.');
  }
}

function selectTariffs(
  data: SessionData,
  supplies: ReturnType<typeof selectSupplies>,
  renewable: string,
  requireBaseline: boolean,
) {
  const compatible = data.tariffs.filter((tariff) =>
    supplies.every((supply) => tariff[supply.fuel]),
  );
  if (requireBaseline && !compatible.some((tariff) => tariff.id === data.baselineId)) {
    throw new Error('The baseline tariff does not include prices for the selected fuels.');
  }
  const tariffs = compatible.filter((tariff) =>
    isIncludedTariff(tariff.id, tariff.renewable, data.baselineId, renewable, requireBaseline),
  );
  if (tariffs.length < (requireBaseline ? 2 : 1)) {
    throw new Error('Add at least one compatible alternative tariff before comparing.');
  }
  return tariffs;
}

function isIncludedTariff(
  id: string,
  renewableValue: string,
  baselineId: string,
  renewable: string,
  requireBaseline: boolean,
) {
  return (
    !requireBaseline || id === baselineId || renewable === 'all' || renewableValue === renewable
  );
}
