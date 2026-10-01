import type { Charging, Period, Reading, Supply, Tariff } from '../core/types';
import type { EstimateResult } from '../core/estimate';
export type SessionData = {
  period: Period;
  supplies: Supply[];
  readings: Reading[];
  conflicts: number;
  charging: Charging[];
  estimated: EstimateResult | null;
  tariffs: Tariff[];
  baselineId: string;
};
export type SessionProps = {
  data: SessionData;
  update: (patch: Partial<SessionData> | ((current: SessionData) => Partial<SessionData>)) => void;
  next: () => void;
};
