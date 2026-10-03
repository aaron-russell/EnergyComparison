import type { Supply, Tariff } from '../core/types';

export const syntheticSupplies: Supply[] = [
  { ref: 'synthetic-electricity', fuel: 'electricity', label: 'Example home · electricity' },
  { ref: 'synthetic-gas', fuel: 'gas', label: 'Example home · gas' },
];

export const exampleTariffs: Tariff[] = [
  {
    version: 1,
    id: 'example-baseline',
    name: 'Example current tariff',
    renewable: 'unknown',
    annualCredit: '0',
    gas: { rate: '6.2', standing: '31' },
    electricity: {
      standing: '49',
      bands: [
        { name: 'All day', days: [1, 2, 3, 4, 5, 6, 7], start: '00:00', end: '00:00', rate: '25' },
      ],
    },
  },
  {
    version: 1,
    id: 'example-night',
    name: 'Example overnight tariff',
    renewable: 'yes',
    annualCredit: '0',
    gas: { rate: '6.2', standing: '31' },
    electricity: {
      standing: '51',
      bands: [
        { name: 'Overnight', days: [1, 2, 3, 4, 5, 6, 7], start: '00:00', end: '05:30', rate: '8' },
        { name: 'Daytime', days: [1, 2, 3, 4, 5, 6, 7], start: '05:30', end: '00:00', rate: '29' },
      ],
    },
  },
];
