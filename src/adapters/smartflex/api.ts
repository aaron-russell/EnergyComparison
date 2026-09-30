import { IntegrationError, type Context, type Fields } from '../contracts';
import { object, request } from '../transport';

export async function graphQL(
  fields: Fields,
  query: string,
  variables: Record<string, unknown>,
  context: Context,
) {
  const response = object(
    await request(
      'https://api.octopus.energy/v1/graphql/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: fields.token },
        body: JSON.stringify({ query, variables }),
      },
      context.signal,
    ),
  );
  if (response.errors) {
    throw new IntegrationError(
      'unsupported',
      'SmartFlex charging history is unavailable or not authorised for this account. Use a charging-file import instead.',
    );
  }
  return object(response.data);
}

export const DEVICE_QUERY =
  'query Devices($account: String!) { devices(accountNumber: $account) { id __typename } }';
const HISTORY_FIELDS = `chargingSessions(after: $after, before: $before, first: 100) {
  edges { node { start end energyAdded { value unit } } }
  pageInfo { hasNextPage endCursor }
}`;
export const HISTORY_QUERY = `query History($account: String!, $device: String!, $after: DateTime!, $before: DateTime!) {
  devices(accountNumber: $account, deviceId: $device) {
    ... on SmartFlexVehicle { ${HISTORY_FIELDS} }
    ... on SmartFlexChargePoint { ${HISTORY_FIELDS} }
  }
}`;
