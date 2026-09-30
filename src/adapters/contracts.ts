import type { Supply, Reading, Period, Charging } from '../core/types';
export type Field = {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'textarea' | 'meters';
  advanced?: boolean;
  required?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
};
export type Progress = { completed: number; message: string };
export type Context = { signal: AbortSignal; progress: (p: Progress) => void };
export type Fields = Record<string, string>;
export class IntegrationError extends Error {
  constructor(
    public code: 'auth' | 'network' | 'invalid' | 'unsupported' | 'cancelled' | 'conflict',
    message: string,
    public retryable = false,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}
export function safeError(e: unknown): string {
  return e instanceof IntegrationError
    ? e.message
    : 'The operation could not be completed. Check the input and try again.';
}
export type EnergyCapabilities = {
  discovery: boolean;
  fuels: ('electricity' | 'gas')[];
  resolution: 'half-hour';
  history: string;
  currentTariff: boolean;
};
export interface EnergyConnection {
  providerId: string;
  supplies: Supply[];
  import(
    period: Period,
    context: Context,
    onBatch: (rows: Reading[]) => void,
  ): Promise<{ readings: Reading[]; failures: string[] }>;
  currentTariff?(): Promise<string>;
  disconnect(): void;
}
export interface EnergyProviderAdapter {
  id: string;
  name: string;
  description: string;
  fields: Field[];
  capabilities: EnergyCapabilities;
  connect(fields: Fields, context: Context): Promise<EnergyConnection>;
}
export type ChargingOptions = {
  supplyRef: string;
  windowStart?: string;
  windowEnd?: string;
  gridConfirmed?: boolean;
};
export type ChargingPreview = {
  sessions: Charging[];
  mapping: { column: string; meaning: string }[];
  notices: string[];
};
export interface ChargingConnection {
  devices: { ref: string; label: string }[];
  history(
    deviceRef: string,
    period: Period,
    options: ChargingOptions,
    context: Context,
  ): Promise<ChargingPreview>;
  disconnect(): void;
}
export interface ChargingProviderAdapter {
  id: string;
  name: string;
  description: string;
  method: 'file' | 'api';
  fields: Field[];
  capabilities: {
    discovery: boolean;
    api: boolean;
    files: string[];
    resolution: 'session' | 'half-hour' | 'mixed';
    history: string;
    measuredGrid: boolean;
  };
  detect?: (text: string) => boolean;
  parse?: (text: string, options: ChargingOptions, context: Context) => Promise<ChargingPreview>;
  connect?: (fields: Fields, context: Context) => Promise<ChargingConnection>;
}
