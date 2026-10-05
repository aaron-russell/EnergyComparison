import { useCallback, useEffect, useState } from 'react';
import type { EnergyConnection } from '../adapters/contracts';
import { previousYear } from '../core/time';
import type { SessionData, SessionUi } from './session';
import { loadSessionSnapshot } from './session-storage';
import { exampleTariffs, syntheticSupplies } from '../fixtures/synthetic-data';
import type { Reading } from '../core/types';

export function useSession() {
  const [snapshot] = useState(loadSessionSnapshot);
  const [connection, setConnection] = useState<EnergyConnection | null>(null);
  const [data, setData] = useState<SessionData>(() => ({
    period: previousYear(),
    supplies: [],
    readings: [],
    conflicts: 0,
    charging: [],
    estimated: null,
    tariffs: [],
    baselineId: '',
    tariffOffers: [],
    tariffSource: null,
    guidedCompare: false,
    isDemo: false,
    ...snapshot?.data,
  }));
  const [ui, setUi] = useState<SessionUi>(
    () =>
      snapshot?.ui ?? {
        import: { start: '', end: '', selected: [] },
        coverage: { bills: [], uniform: false },
        charging: { providerId: 'synthetic', supplyRef: '', power: '7' },
        tariffs: { draft: null, postcode: '', region: '' },
      },
  );
  const update = useCallback(
    (patch: Partial<SessionData> | ((current: SessionData) => Partial<SessionData>)) =>
      setData((current) => ({
        ...current,
        ...(typeof patch === 'function' ? patch(current) : patch),
      })),
    [],
  );
  const updateUi = (patch: Partial<SessionUi>) => setUi((current) => ({ ...current, ...patch }));
  useSavedTariffs(data.isDemo, snapshot, connection, update);
  const connected = (next: EnergyConnection) => {
    setConnection(next);
    if (data.isDemo) {
      update({
        period: previousYear(),
        supplies: next.supplies,
        readings: [],
        conflicts: 0,
        charging: [],
        estimated: null,
        tariffs: [],
        baselineId: '',
        tariffOffers: [],
        tariffSource: null,
        guidedCompare: false,
        isDemo: false,
      });
      loadSavedTariffs(update);
      return;
    }
    update({ supplies: next.supplies, isDemo: false });
  };
  const loadDemo = () => {
    const period = previousYear();
    setConnection(null);
    update({
      period,
      supplies: syntheticSupplies,
      readings: [demoPlaceholder(period.start)],
      conflicts: 0,
      charging: [],
      estimated: null,
      tariffs: structuredClone(exampleTariffs),
      baselineId: exampleTariffs[0].id,
      tariffOffers: [],
      tariffSource: null,
      guidedCompare: false,
      isDemo: true,
    });
    hydrateDemo(update, period);
  };
  return { data, update, ui, updateUi, connection, connected, loadDemo };
}

function useSavedTariffs(
  isDemo: boolean,
  snapshot: ReturnType<typeof loadSessionSnapshot>,
  connection: EnergyConnection | null,
  update: (patch: Partial<SessionData>) => void,
) {
  useEffect(() => {
    if (isDemo || snapshot) {
      return;
    }
    let active = true;
    void import('./tariff-storage').then(({ savedTariffs }) => {
      if (active) {
        update({ tariffs: savedTariffs() });
      }
    });
    return () => {
      active = false;
      connection?.disconnect();
    };
  }, [connection, isDemo, snapshot, update]);
}

function loadSavedTariffs(update: (patch: Partial<SessionData>) => void) {
  void import('./tariff-storage').then(({ savedTariffs }) => update({ tariffs: savedTariffs() }));
}

function hydrateDemo(
  update: (patch: Partial<SessionData> | ((current: SessionData) => Partial<SessionData>)) => void,
  period: SessionData['period'],
) {
  void import('../fixtures/synthetic').then(({ syntheticCharging, syntheticReadings }) => {
    update((current) =>
      current.isDemo
        ? { readings: syntheticReadings(period), charging: syntheticCharging(period) }
        : {},
    );
  });
}

function demoPlaceholder(start: string): Reading {
  return {
    start,
    end: new Date(Date.parse(start) + 1_800_000).toISOString(),
    supplyRef: syntheticSupplies[0].ref,
    fuel: 'electricity',
    kWh: '0',
    source: 'synthetic-example',
    status: 'measured',
  };
}
