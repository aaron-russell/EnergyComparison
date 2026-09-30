import { jsonSource, validateTariff } from '../core/tariff';
import type { Tariff } from '../core/types';
const KEY = 'energy-replay:saved-tariffs';
export function savedTariffs(): Tariff[] {
  try {
    return jsonSource.read(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
export function saveTariff(tariff: Tariff): void {
  const valid = validateTariff(tariff);
  const existing = savedTariffs().filter((item) => item.id !== valid.id);
  localStorage.setItem(KEY, JSON.stringify([...existing, valid]));
}
export function deleteSavedTariff(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(savedTariffs().filter((tariff) => tariff.id !== id)));
}
export function exportTariffs(tariffs: Tariff[]): void {
  const safe = tariffs.map(validateTariff);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'energy-replay-tariffs.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
