import type { ChargingProviderAdapter } from './contracts';
import { parseChargingFile } from './charging/parse';

const capabilities = {
  discovery: false,
  api: false,
  files: ['csv', 'json'],
  resolution: 'mixed' as const,
  history: 'User-selected file',
  measuredGrid: false,
};
export const genericCharging: ChargingProviderAdapter = {
  id: 'generic-file',
  name: 'CSV / JSON import',
  description:
    'Import charging sessions or measured half-hour readings with start, end and kWh columns.',
  method: 'file',
  fields: [],
  capabilities,
  detect: (text) => /kwh/i.test(text),
  parse: (text, options, ctx) =>
    parseChargingFile(text, options, ctx, { source: 'generic-file', homeOnly: false }),
};
export const podPoint: ChargingProviderAdapter = {
  id: 'pod-point',
  name: 'Pod Point',
  description:
    'Import a charging activity report. Home charging only; grid energy is preferred when present.',
  method: 'file',
  fields: [],
  capabilities: { ...capabilities, files: ['csv'], measuredGrid: true },
  detect: (text) => /kwh consumed|kwh grid \(home\)/i.test(text),
  parse: (text, options, ctx) =>
    parseChargingFile(text, options, ctx, { source: 'pod-point', homeOnly: true }),
};
