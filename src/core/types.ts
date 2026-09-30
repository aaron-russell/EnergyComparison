export type Fuel = 'electricity' | 'gas';
export type DecimalString = string;
export type Period = { start: string; end: string }; // UTC, exclusive end
export type Supply = { ref: string; fuel: Fuel; label: string };
export type Reading = Period & {
  supplyRef: string;
  fuel: Fuel;
  kWh: DecimalString;
  source: string;
  status: 'measured' | 'estimated';
};
export type Charging = Period & {
  id: string;
  supplyRef: string;
  kWh: DecimalString;
  source: string;
  provenance: 'grid' | 'solar' | 'mixed' | 'unknown';
  kind: 'session' | 'interval';
  status: 'measured' | 'estimated';
  approved: boolean;
};
export type Band = {
  name: string;
  days: number[];
  start: string;
  end: string;
  rate: DecimalString;
};
export type Tariff = {
  version: 1;
  id: string;
  name: string;
  renewable: 'yes' | 'no' | 'unknown';
  electricity?: { standing: DecimalString; bands: Band[] };
  gas?: { standing: DecimalString; rate: DecimalString };
  annualCredit: DecimalString;
  ev?: { mode: 'override' | 'discount'; rate: DecimalString };
};
export type MonthlyCost = {
  month: string;
  electricity: string;
  gas: string;
  standing: string;
  credits: string;
  evAdjustment: string;
  total: string;
  bands: Record<string, string>;
};
export type ReplayResult = {
  tariffId: string;
  months: MonthlyCost[];
  total: string;
  monthlyEquivalent: string;
  days: number;
  complete: boolean;
  energy: Record<Fuel, string>;
};
