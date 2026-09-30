import Decimal from '../core/decimal';
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
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
  const response = await fetch(url, {
    signal,
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Tariff Tracker returned ${response.status}.`);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error('Tariff Tracker returned unreadable JSON.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFuel(value: unknown): value is TariffTrackerRow['fuel'] {
  return value === 'electricity' || value === 'gas' || value === 'dual';
}

function isKind(value: unknown): value is TariffTrackerRow['kind'] {
  return value === 'fixed' || value === 'variable';
}

function hasRowIdentity(value: Record<string, unknown>): boolean {
  return (
    typeof value.supplier === 'string' &&
    typeof value.tariff === 'string' &&
    typeof value.product_code === 'string' &&
    typeof value.region === 'string' &&
    isFuel(value.fuel) &&
    isKind(value.kind) &&
    typeof value.payment === 'string'
  );
}

function isRow(value: unknown): value is TariffTrackerRow {
  if (!isRecord(value)) {
    return false;
  }
  return (
    hasRowIdentity(value) &&
    typeof value.payment === 'string' &&
    isFiniteNumber(value.unit_p_kwh) &&
    isFiniteNumber(value.standing_p_day) &&
    isFiniteNumber(value.annual_est_gbp)
  );
}

function parseEnvelope(value: unknown): Envelope {
  if (!isRecord(value) || !Array.isArray(value.rows) || !value.rows.every(isRow)) {
    throw new Error('Tariff Tracker returned malformed tariff data.');
  }
  if (value.as_of !== undefined && typeof value.as_of !== 'string') {
    throw new Error('Tariff Tracker returned malformed freshness data.');
  }
  if (
    value.caveats !== undefined &&
    (!Array.isArray(value.caveats) || !value.caveats.every((item) => typeof item === 'string'))
  ) {
    throw new Error('Tariff Tracker returned malformed caveats.');
  }
  return value as unknown as Envelope;
}

function parseLookup(value: unknown): TariffTrackerLookup {
  if (
    !isRecord(value) ||
    !isRecord(value.data) ||
    typeof value.data.electricity_region !== 'string'
  ) {
    throw new Error('Tariff Tracker returned malformed postcode data.');
  }
  return value.data as TariffTrackerLookup;
}

function poundsToPence(value: number | null | undefined): string {
  return value === null || value === undefined ? '0' : value.toString();
}

function fromRow(row: TariffTrackerRow): Tariff {
  const electricityStanding =
    row.fuel === 'dual' && row.gas_standing_p_day !== null && row.gas_standing_p_day !== undefined
      ? new Decimal(row.standing_p_day).sub(row.gas_standing_p_day).toString()
      : row.standing_p_day;
  const electricity =
    row.fuel === 'gas'
      ? undefined
      : {
          standing:
            typeof electricityStanding === 'string'
              ? electricityStanding
              : poundsToPence(electricityStanding),
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
  const result = parseLookup(
    await getJson<unknown>(`${API}/lookup?postcode=${encodeURIComponent(value)}`, signal),
  );
  const region = result.electricity_region;
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
  const result = parseEnvelope(
    await getJson<unknown>(`${API}/energy/tariffs?region=${encodeURIComponent(value)}`, signal),
  );
  const rows = result.rows ?? [];
  return {
    tariffs: rows.map(fromRow),
    asOf: result.as_of,
    caveats: result.caveats ?? [],
  };
}
