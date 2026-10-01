import Decimal from '../core/decimal';
import { validateTariff } from '../core/tariff';
import type { Tariff, DecimalString } from '../core/types';
import { request } from './transport';
import type { ResponseDecoder } from './response';

const API = 'https://tarifftracker.io/api/v1';

export type TariffTrackerRow = {
  supplier: string;
  tariff: string;
  product_code: string;
  region: string;
  fuel: 'electricity' | 'gas' | 'dual';
  kind: 'fixed' | 'variable';
  payment: string;
  unit_p_kwh: DecimalString;
  standing_p_day: DecimalString;
  gas_unit_p_kwh?: DecimalString | null;
  gas_standing_p_day?: DecimalString | null;
  term_months?: DecimalString | null;
  exit_fee_gbp?: DecimalString | null;
  annual_est_gbp: DecimalString;
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

const decodeLosslessJson: ResponseDecoder = async (response) =>
  JSON.parse(quoteJsonNumbers(await response.text())) as unknown;

function quoteJsonNumbers(source: string): string {
  let result = '';
  for (let index = 0; index < source.length;) {
    if (source[index] === '"') {
      const end = stringEnd(source, index);
      result += source.slice(index, end);
      index = end;
      continue;
    }
    const number = numberToken(source, index);
    if (number) {
      result += JSON.stringify(number);
      index += number.length;
      continue;
    }
    result += source[index];
    index += 1;
  }
  return result;
}

function stringEnd(source: string, start: number): number {
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    if (escaped) {
      escaped = false;
    } else if (source[index] === '\\') {
      escaped = true;
    } else if (source[index] === '"') {
      return index + 1;
    }
  }
  return source.length;
}

function numberToken(source: string, index: number): string | undefined {
  if (source[index] !== '-' && (source[index] < '0' || source[index] > '9')) {
    return undefined;
  }
  return source.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)?.[0];
}

function isAmount(value: unknown): value is DecimalString {
  if (typeof value !== 'string' || value.length > 64) {
    return false;
  }
  if (/^\d+(\.\d+)?$/.test(value)) {
    return value.length <= 30;
  }
  if (!/^\d+(?:\.\d+)?[eE][+-]?\d+$/.test(value)) {
    return false;
  }
  const exponent = Number(value.slice(value.search(/[eE]/) + 1));
  return (
    Number.isInteger(exponent) &&
    Math.abs(exponent) <= 30 &&
    new Decimal(value).toFixed().length <= 30
  );
}

function amountString(value: DecimalString): DecimalString {
  return value.includes('e') || value.includes('E') ? new Decimal(value).toFixed() : value;
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  return request(
    url,
    { headers: { Accept: 'application/json' } },
    signal ?? new AbortController().signal,
    fetch,
    decodeLosslessJson,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function hasValidGasFields(value: Record<string, unknown>): boolean {
  return (
    isOptionalAmount(value.gas_unit_p_kwh) &&
    isOptionalAmount(value.gas_standing_p_day) &&
    isOptionalAmount(value.term_months) &&
    isOptionalAmount(value.exit_fee_gbp) &&
    (value.closes === undefined || value.closes === null || typeof value.closes === 'string') &&
    (value.fuel !== 'dual' ||
      (isAmount(value.gas_unit_p_kwh) && isAmount(value.gas_standing_p_day)))
  );
}

function isOptionalAmount(value: unknown): boolean {
  return value === undefined || value === null || isAmount(value);
}

function isRow(value: unknown): value is TariffTrackerRow {
  if (!isRecord(value)) {
    return false;
  }
  return (
    hasRowIdentity(value) &&
    isAmount(value.unit_p_kwh) &&
    isAmount(value.standing_p_day) &&
    isAmount(value.annual_est_gbp) &&
    hasValidGasFields(value)
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

function fromRow(row: TariffTrackerRow): Tariff {
  const unit = amountString(row.unit_p_kwh);
  const standing = amountString(row.standing_p_day);
  const electricityStanding =
    row.fuel === 'dual'
      ? new Decimal(standing).sub(amountString(row.gas_standing_p_day!)).toString()
      : standing;
  const electricity =
    row.fuel === 'gas'
      ? undefined
      : {
          standing: electricityStanding,
          bands: [
            {
              name: 'All day',
              days: [1, 2, 3, 4, 5, 6, 7],
              start: '00:00',
              end: '00:00',
              rate: unit,
            },
          ],
        };
  const gas =
    row.fuel === 'electricity'
      ? undefined
      : {
          standing: row.fuel === 'dual' ? amountString(row.gas_standing_p_day!) : standing,
          rate: row.fuel === 'dual' ? amountString(row.gas_unit_p_kwh!) : unit,
        };
  const suffix = row.fuel === 'dual' ? 'dual fuel' : row.fuel;
  return validateTariff({
    version: 1,
    id: `tarifftracker:${row.product_code}:${row.region}:${row.fuel}`,
    name: `${row.supplier} · ${row.tariff} (${suffix})`,
    renewable: 'unknown',
    electricity,
    gas,
    annualCredit: '0',
  });
}

export async function lookupRegion(postcode: string, signal?: AbortSignal): Promise<string> {
  const value = postcode.trim();
  if (!value) {
    throw new Error('Enter a postcode first.');
  }
  const result = parseLookup(
    await getJson(`${API}/lookup?postcode=${encodeURIComponent(value)}`, signal),
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
    await getJson(`${API}/energy/tariffs?region=${encodeURIComponent(value)}`, signal),
  );
  const rows = result.rows ?? [];
  return {
    tariffs: rows.map(fromRow),
    asOf: result.as_of,
    caveats: result.caveats ?? [],
  };
}
