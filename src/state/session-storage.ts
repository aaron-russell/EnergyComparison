import type { SessionData, SessionUi } from './session';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

const KEY = 'energy-replay:session';
const VERSION = 1;

export type SessionSnapshot = { version: number; step: number; data: SessionData; ui: SessionUi };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validSnapshot(value: unknown): value is SessionSnapshot {
  if (!record(value) || value.version !== VERSION || !Number.isInteger(value.step)) {
    return false;
  }
  if (!record(value.data) || !record(value.ui)) {
    return false;
  }
  return validData(value.data) && validUi(value.ui);
}

function validData(value: Record<string, unknown>): boolean {
  const period = value.period;
  return (
    record(period) &&
    typeof period.start === 'string' &&
    typeof period.end === 'string' &&
    Array.isArray(value.supplies) &&
    Array.isArray(value.readings) &&
    Array.isArray(value.charging) &&
    Array.isArray(value.tariffs) &&
    typeof value.baselineId === 'string'
  );
}

function validUi(value: Record<string, unknown>): boolean {
  return (
    record(value.import) &&
    record(value.coverage) &&
    record(value.charging) &&
    record(value.tariffs)
  );
}

export function loadSessionSnapshot(): SessionSnapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    const decoded = decompressFromUTF16(raw) || raw;
    const value: unknown = JSON.parse(decoded);
    return validSnapshot(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveSessionSnapshot(snapshot: SessionSnapshot): void {
  try {
    sessionStorage.setItem(KEY, compressToUTF16(JSON.stringify(snapshot)));
  } catch {
    // Storage can be unavailable or full; the in-memory session remains usable.
  }
}

export function clearSessionSnapshot(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Clearing the in-memory session still succeeds when storage is unavailable.
  }
}

export { KEY as SESSION_STORAGE_KEY };
