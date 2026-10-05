import type { Charging, Period, Reading, Supply, Tariff } from '../core/types';
import type { EstimateResult } from '../core/estimate';
import type { TariffTrackerOffer } from '../adapters/tarifftracker';
import type { BillTotal } from '../core/estimate';

export type SessionUi = {
  import: { start: string; end: string; selected: string[] };
  coverage: { bills: BillTotal[]; uniform: boolean };
  charging: { providerId: string; supplyRef: string; power: string };
  tariffs: { draft: Tariff | null; postcode: string; region: string };
};
export type SessionData = {
  period: Period;
  supplies: Supply[];
  readings: Reading[];
  conflicts: number;
  charging: Charging[];
  estimated: EstimateResult | null;
  tariffs: Tariff[];
  baselineId: string;
  tariffOffers: TariffTrackerOffer[];
  tariffSource: { region: string; asOf?: string; caveats: string[] } | null;
  guidedCompare: boolean;
  isDemo: boolean;
};
export type SessionProps = {
  data: SessionData;
  update: (patch: Partial<SessionData> | ((current: SessionData) => Partial<SessionData>)) => void;
  next: () => void;
  ui?: SessionUi;
  updateUi?: (patch: Partial<SessionUi>) => void;
};
