import type { ChargingProviderAdapter, EnergyProviderAdapter } from './contracts';
import { syntheticCharging, syntheticReadings, syntheticSupplies } from '../fixtures/synthetic';
import { cancelled } from './transport';

// Reviewed, bundled synthetic providers demonstrate the same contracts as real providers.
export const syntheticEnergy: EnergyProviderAdapter = {
  id: 'synthetic',
  name: 'Synthetic example',
  description: 'Explore with generated household data. No account or real tariff offers.',
  fields: [],
  capabilities: {
    discovery: true,
    fuels: ['electricity', 'gas'],
    resolution: 'half-hour',
    history: 'Generated for the chosen period',
    currentTariff: false,
  },
  async connect(_fields, context) {
    cancelled(context.signal);
    return {
      supplies: structuredClone(syntheticSupplies),
      disconnect() {},
      async import(period, context, onBatch) {
        const readings = syntheticReadings(period);
        for (let index = 0; index < readings.length; index += 1500) {
          cancelled(context.signal);
          onBatch(readings.slice(index, index + 1500));
          context.progress({
            completed: Math.min(index + 1500, readings.length),
            message: 'Generating synthetic intervals',
          });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        return { readings, failures: [] };
      },
    };
  },
};

export const syntheticCharger: ChargingProviderAdapter = {
  id: 'synthetic-charger',
  name: 'Synthetic API charger',
  description:
    'A second API contract implementation using generated sessions, for examples and tests.',
  method: 'api',
  fields: [],
  capabilities: {
    discovery: true,
    api: true,
    files: [],
    resolution: 'session',
    history: 'Generated for the chosen period',
    measuredGrid: true,
  },
  async connect(_fields, context) {
    cancelled(context.signal);
    return {
      devices: [{ ref: 'example-device', label: 'Example charger' }],
      disconnect() {},
      async history(_device, period, options, context) {
        cancelled(context.signal);
        return {
          sessions: syntheticCharging(period).map((s) => ({ ...s, supplyRef: options.supplyRef })),
          mapping: [],
          notices: ['Synthetic session totals; evenly allocated timing is estimated.'],
        };
      },
    };
  },
};
