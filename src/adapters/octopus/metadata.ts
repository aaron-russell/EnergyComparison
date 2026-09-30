import type { EnergyProviderAdapter } from '../contracts';

export const octopusMetadata: Omit<EnergyProviderAdapter, 'connect'> = {
  id: 'octopus',
  name: 'Octopus Energy',
  description:
    'Import your smart-meter history directly from Octopus. Your API key stays in this browser session.',
  fields: [
    {
      key: 'apiKey',
      label: 'API key',
      type: 'password',
      required: true,
      help: 'Find this in your Octopus online account developer settings.',
    },
    {
      key: 'account',
      label: 'Account number',
      type: 'text',
      help: 'Usually starts A-. Leave blank when using manual meter entry.',
    },
    {
      key: 'gasUnit',
      label: 'Gas API unit (confirm before import)',
      type: 'select',
      required: true,
      options: [
        { value: '', label: 'Select the unit reported by your meter/API' },
        { value: 'kWh', label: 'kWh' },
        { value: 'm3', label: 'Cubic metres (m³)' },
        { value: 'none', label: 'Electricity only' },
      ],
    },
    {
      key: 'calorific',
      label: 'Calorific value for gas (default 39.2)',
      type: 'text',
      help: 'm³ conversion is approximate; use the calorific value from your bill.',
    },
    {
      key: 'manual',
      label: 'Manual import meters (optional JSON)',
      type: 'textarea',
      help: 'Array of {"fuel":"electricity","point":"MPAN","serial":"meter serial","group":"home"}. Add all replacement meters with the same group. Import meters only; never enter export meters.',
    },
  ],
  capabilities: {
    discovery: true,
    fuels: ['electricity', 'gas'],
    resolution: 'half-hour',
    history: 'As available from your account; defaults to the previous 12 complete months.',
    currentTariff: false,
  },
};
