import type { Period, Reading, Supply, Charging, Tariff, ReplayResult } from './types';
import type { BillTotal, EstimateResult } from './estimate';
export type Job =
  | {
      kind: 'estimate';
      observed: Reading[];
      supplies: Supply[];
      period: Period;
      bills: BillTotal[];
      uniform: boolean;
    }
  | {
      kind: 'replay';
      readings: Reading[];
      supplies: Supply[];
      period: Period;
      charging: Charging[];
      tariffs: Tariff[];
    };
export type JobResult =
  { kind: 'estimate'; result: EstimateResult } | { kind: 'replay'; results: ReplayResult[] };
