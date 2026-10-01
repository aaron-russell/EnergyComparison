import { useEffect, useState } from 'react';
import type { EnergyConnection } from '../adapters/contracts';
import { previousYear } from '../core/time';
import { savedTariffs } from './tariff-storage';
import type { SessionData } from './session';
import {
  syntheticCharging,
  syntheticReadings,
  syntheticSupplies,
  exampleTariffs,
} from '../fixtures/synthetic';

export function useSession() {
  const [connection, setConnection] = useState<EnergyConnection | null>(null);
  const [data, setData] = useState<SessionData>(() => ({
    period: previousYear(),
    supplies: [],
    readings: [],
    conflicts: 0,
    charging: [],
    estimated: null,
    tariffs: savedTariffs(),
    baselineId: '',
    isDemo: false,
  }));
  useEffect(() => () => connection?.disconnect(), [connection]);
  const update = (patch: Partial<SessionData>) => setData((current) => ({ ...current, ...patch }));
  const connected = (next: EnergyConnection) => {
    setConnection(next);
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
  return { data, update, connection, connected, loadDemo };
}
