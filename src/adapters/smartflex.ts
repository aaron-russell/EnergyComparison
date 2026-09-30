import type { ChargingProviderAdapter } from './contracts';
import { IntegrationError } from './contracts';
import { list, object, str } from './transport';
import { DEVICE_QUERY, graphQL } from './smartflex/api';
import { chargingHistory } from './smartflex/history';

export const smartFlex: ChargingProviderAdapter = {
  id: 'octopus-smartflex',
  name: 'Octopus SmartFlex',
  method: 'api',
  description:
    'Optional account-dependent charging history. Unavailable permissions or devices produce an explicit unsupported state.',
  fields: [
    { key: 'account', label: 'SmartFlex account number', type: 'text', required: true },
    {
      key: 'token',
      label: 'Octopus GraphQL access token',
      type: 'password',
      required: true,
      help: 'Use an authorised, unexpired Octopus API token. Held in this session only.',
    },
  ],
  capabilities: {
    discovery: true,
    api: true,
    files: [],
    resolution: 'session',
    history: 'Account-dependent availability',
    measuredGrid: false,
  },
  async connect(fields, context) {
    let credentials = { ...fields };
    const data = await graphQL(credentials, DEVICE_QUERY, { account: fields.account }, context);
    const ids = new Map<string, string>();
    const devices = list(data.devices)
      .map(object)
      .filter((device) =>
        ['SmartFlexVehicle', 'SmartFlexChargePoint'].includes(str(device.__typename)),
      )
      .map((device, index) => {
        const ref = crypto.randomUUID();
        ids.set(ref, str(device.id));
        return { ref, label: `Charging device ${index + 1}` };
      });
    if (!devices.length) {
      throw new IntegrationError(
        'unsupported',
        'No supported SmartFlex charging devices are available. Use a charging-file import instead.',
      );
    }
    return {
      devices,
      history(ref, period, options, context) {
        const id = ids.get(ref);
        if (!id) {
          throw new IntegrationError('invalid', 'Select a connected charging device.');
        }
        return chargingHistory(credentials, id, period, options, context);
      },
      disconnect() {
        credentials = {};
        ids.clear();
      },
    };
  },
};
