import { useEffect, useState } from 'react';
import type { EnergyConnection } from '../adapters/contracts';
import { previousYear } from '../core/time';
import { savedTariffs } from './tariff-storage';
import type { SessionData, SessionUi } from './session';
import { loadSessionSnapshot } from './session-storage';
import {
  syntheticCharging,
  syntheticReadings,
  syntheticSupplies,
  exampleTariffs,
} from '../fixtures/synthetic';

export function useSession() {
  const snapshot = loadSessionSnapshot();
  const [connection, setConnection] = useState<EnergyConnection | null>(null);
  const [data, setData] = useState<SessionData>(() => ({
    period: previousYear(),
    supplies: [],
    readings: [],
    conflicts: 0,
    charging: [],
    estimated: null,
    tariffs: snapshot?.data.tariffs ?? savedTariffs(),
    baselineId: '',
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
  useEffect(() => () => connection?.disconnect(), [connection]);
  const update = (patch: Partial<SessionData> | ((current: SessionData) => Partial<SessionData>)) =>
    setData((current) => ({
      ...current,
      ...(typeof patch === 'function' ? patch(current) : patch),
    }));
  const updateUi = (patch: Partial<SessionUi>) => setUi((current) => ({ ...current, ...patch }));
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
        tariffs: savedTariffs(),
        baselineId: '',
        isDemo: false,
      });
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
      readings: syntheticReadings(period),
      conflicts: 0,
      charging: syntheticCharging(period),
      estimated: null,
      tariffs: structuredClone(exampleTariffs),
      baselineId: exampleTariffs[0].id,
      isDemo: true,
    });
  };
  return { data, update, ui, updateUi, connection, connected, loadDemo };
}
