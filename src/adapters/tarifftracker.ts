import type { Tariff } from '../core/types';

const API = 'https://tarifftracker.io/api/v1';

export type TariffTrackerRow = {
  supplier: string;
  tariff: string;
  product_code: string;
  region: string;
  fuel: 'electricity' | 'gas' | 'dual';
  kind: 'fixed' | 'variable';
  payment: string;
  unit_p_kwh: number;
  standing_p_day: number;
  gas_unit_p_kwh?: number | null;
  gas_standing_p_day?: number | null;
  term_months?: number | null;
  exit_fee_gbp?: number | null;
  annual_est_gbp: number;
  closes?: string | null;
};

type Envelope = {
  as_of?: string;
  caveats?: string[];
  rows?: TariffTrackerRow[];
};

export type TariffTrackerResult = {
  tariffs: Tariff[];
  asOf?: string;
  caveats: string[];
};

export type TariffTrackerLookup = {
  electricity_region?: string | null;
};

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Tariff Tracker returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

function poundsToPence(value: number | null | undefined): string {
  return value === null || value === undefined ? '0' : value.toString();
}

function fromRow(row: TariffTrackerRow): Tariff {
  const electricityStanding =
    row.fuel === 'dual' && row.gas_standing_p_day !== null && row.gas_standing_p_day !== undefined
      ? row.standing_p_day - row.gas_standing_p_day
      : row.standing_p_day;
  const electricity =
    row.fuel === 'gas'
      ? undefined
      : {
          standing: poundsToPence(electricityStanding),
          bands: [
            {
              name: 'All day',
              days: [1, 2, 3, 4, 5, 6, 7],
              start: '00:00',
              end: '00:00',
              rate: poundsToPence(row.unit_p_kwh),
            },
          ],
        };
  const gas =
    row.fuel === 'electricity'
      ? undefined
      : {
          standing: poundsToPence(
            row.fuel === 'dual' ? row.gas_standing_p_day : row.standing_p_day,
          ),
          rate: poundsToPence(row.fuel === 'dual' ? row.gas_unit_p_kwh : row.unit_p_kwh),
        };
  const suffix = row.fuel === 'dual' ? 'dual fuel' : row.fuel;
  return {
    version: 1,
    id: `tarifftracker:${row.product_code}:${row.region}:${row.fuel}`,
    name: `${row.supplier} · ${row.tariff} (${suffix})`,
    renewable: 'unknown',
    electricity,
    gas,
    annualCredit: '0',
  };
}

export async function lookupRegion(postcode: string, signal?: AbortSignal): Promise<string> {
  const value = postcode.trim();
  if (!value) {
    throw new Error('Enter a postcode first.');
  }
  const result = await getJson<{ data?: TariffTrackerLookup }>(
    `${API}/lookup?postcode=${encodeURIComponent(value)}`,
    signal,
  );
  const region = result.data?.electricity_region;
  if (!region) {
    throw new Error('Tariff Tracker could not find an electricity region for that postcode.');
  }
  return region;
}

export async function fetchTariffs(
  region: string,
  signal?: AbortSignal,
): Promise<TariffTrackerResult> {
  const value = region.trim();
  if (!value) {
    throw new Error('Choose an electricity region first.');
  }
  const result = await getJson<Envelope>(
    `${API}/energy/tariffs?region=${encodeURIComponent(value)}`,
    signal,
  );
  const rows = result.rows ?? [];
  return {
    tariffs: rows.map(fromRow),
    asOf: result.as_of,
    caveats: result.caveats ?? [],
  };
}
