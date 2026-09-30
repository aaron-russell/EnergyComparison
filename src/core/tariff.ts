import Ajv from 'ajv';
import schema from '../../public/tariff.schema.json';
import type { Tariff, Band } from './types';
const check = new Ajv({ allErrors: true }).compile(schema);
export const clockIndex = (v: string) => {
  const [h, m] = v.split(':').map(Number);
  return h * 2 + m / 30;
};
function bandIndices(band: Band): number[] {
  const start = clockIndex(band.start);
  const end = clockIndex(band.end);
  const length = end > start ? end - start : 48 - start + end;
  return band.days.flatMap((day) =>
    Array.from({ length }, (_, offset) => ((day - 1) * 48 + start + offset) % 336),
  );
}

export function schedule(bands: Band[]): Band[] {
  const week = new Array<Band>(336);
  for (const band of bands) {
    for (const index of bandIndices(band)) {
      if (week[index]) {
        throw new Error('Electricity bands overlap. Each half-hour needs exactly one rate.');
      }
      week[index] = band;
    }
  }
  if (Array.from({ length: 336 }, (_, index) => week[index]).some((band) => !band)) {
    throw new Error('Electricity schedule has gaps. Cover every half-hour of the week.');
  }
  return week;
}

export function validateTariff(value: unknown): Tariff {
  if (!check(value)) {
    throw new Error(
      `Invalid tariff: ${check.errors?.map((e) => `${e.instancePath || '/'} ${e.message}`).join(';')}`,
    );
  }
  const t = value as Tariff;
  if (!t.electricity && !t.gas) {
    throw new Error('Enter at least one fuel.');
  }
  if (t.ev && !t.electricity) {
    throw new Error('EV adjustments require electricity rates.');
  }
  if (t.electricity) {
    schedule(t.electricity.bands);
    const names = t.electricity.bands.map((x) => x.name);
    if (new Set(names).size !== names.length) {
      throw new Error('Give each electricity band a unique name.');
    }
  }
  return structuredClone(t);
}
export interface TariffSource {
  id: string;
  label: string;
  read(input: unknown): Tariff[];
}
export const manualSource: TariffSource = {
  id: 'manual',
  label: 'Manual entry',
  read: (input) => [validateTariff(input)],
};
export const jsonSource: TariffSource = {
  id: 'json',
  label: 'JSON import',
  read(input) {
    if (typeof input !== 'string' || input.length > 1_000_000) {
      throw new Error('Choose a tariff JSON file under 1 MB.');
    }
    const parsed = JSON.parse(input);
    return (Array.isArray(parsed) ? parsed : [parsed]).map(validateTariff);
  },
};
export const tariffSources = [manualSource, jsonSource];
export const blankTariff = (): Tariff => ({
  version: 1,
  id: crypto.randomUUID(),
  name: 'My tariff',
  renewable: 'unknown',
  annualCredit: '0',
  electricity: {
    standing: '0',
    bands: [
      { name: 'All day', days: [1, 2, 3, 4, 5, 6, 7], start: '00:00', end: '00:00', rate: '0' },
    ],
  },
});
