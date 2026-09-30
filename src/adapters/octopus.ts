import type { Context, EnergyProviderAdapter, Fields } from './contracts';
import { IntegrationError } from './contracts';
import { request } from './transport';
import { octopusMetadata } from './octopus/metadata';
import {
  createMeterCatalogue,
  parseAccountMeters,
  parseManualMeters,
  validateDiscoveredSupplies,
} from './octopus/discovery';
import { authHeaders, importConsumption, OCTOPUS_ORIGIN } from './octopus/consumption';

async function discoverMeters(fields: Fields, context: Context) {
  if (fields.manual?.trim()) {
    return parseManualMeters(fields.manual);
  }
  if (!fields.account) {
    throw new IntegrationError('invalid', 'Enter an account number or manual meters.');
  }
  const endpoint = `${OCTOPUS_ORIGIN}/v1/accounts/${encodeURIComponent(fields.account)}/`;
  return parseAccountMeters(
    await request(endpoint, { headers: authHeaders(fields) }, context.signal),
  );
}

export const octopus: EnergyProviderAdapter = {
  ...octopusMetadata,
  async connect(fields, context) {
    let credentials = { ...fields };
    if (!credentials.apiKey) {
      throw new IntegrationError('auth', 'Enter your API key.');
    }
    const points = await discoverMeters(credentials, context);
    const { meters, supplies } = createMeterCatalogue(points, credentials);
    validateDiscoveredSupplies(supplies, credentials);
    return {
      supplies,
      disconnect() {
        credentials = {};
        meters.length = 0;
      },
      import(period, context, onBatch) {
        return importConsumption(meters, period, credentials, context, onBatch);
      },
    };
  },
};
