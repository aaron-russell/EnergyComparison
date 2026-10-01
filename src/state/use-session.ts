import { useEffect, useState } from 'react';
import type { EnergyConnection } from '../adapters/contracts';
import { previousYear } from '../core/time';
import { savedTariffs } from './tariff-storage';
import type { SessionData } from './session';

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
  }));
  useEffect(() => () => connection?.disconnect(), [connection]);
  const update = (patch: Partial<SessionData> | ((current: SessionData) => Partial<SessionData>)) =>
    setData((current) => ({
      ...current,
      ...(typeof patch === 'function' ? patch(current) : patch),
    }));
  const connected = (next: EnergyConnection) => {
    setConnection(next);
    update({ supplies: next.supplies });
  };
  return { data, update, connection, connected };
}
