import { octopus } from './octopus';
import { genericCharging, podPoint } from './charging-files';
import { smartFlex } from './smartflex';
import { syntheticCharger, syntheticEnergy } from './synthetic';
import type { ChargingProviderAdapter, EnergyProviderAdapter } from './contracts';

// Only reviewed, build-time adapters are executable. Imported tariffs cannot register code.
export const energyProviders: EnergyProviderAdapter[] = [octopus, syntheticEnergy];
export const chargingProviders: ChargingProviderAdapter[] = [
  genericCharging,
  podPoint,
  smartFlex,
  syntheticCharger,
];
