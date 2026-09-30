import { afterEach, expect, it, vi } from 'vitest';
import { smartFlex } from '../src/adapters/smartflex';
const context = () => ({ signal: new AbortController().signal, progress: vi.fn() });
const json = (body: unknown) => new Response(JSON.stringify(body));
afterEach(() => vi.unstubAllGlobals());

it('reports unavailable SmartFlex capabilities without leaking upstream errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(json({ errors: [{ message: 'private account and token' }] })),
  );
  await expect(
    smartFlex.connect!({ account: 'private', token: 'secret' }, context()),
  ).rejects.toMatchObject({ code: 'unsupported' });
});

it('keeps device identities in the adapter and imports session energy with unknown grid provenance', async () => {
  const node = {
    start: '2024-01-01T01:00:00Z',
    end: '2024-01-01T02:00:00Z',
    energyAdded: { value: '7000', unit: 'WATT_HOUR' },
  };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      json({ data: { devices: [{ id: 'private-device', __typename: 'SmartFlexVehicle' }] } }),
    )
    .mockResolvedValueOnce(
      json({
        data: {
          devices: [
            {
              chargingSessions: {
                edges: [{ node }],
                pageInfo: { hasNextPage: false, endCursor: node.start },
              },
            },
          ],
        },
      }),
    );
  vi.stubGlobal('fetch', fetcher);
  const connection = await smartFlex.connect!({ account: 'private', token: 'secret' }, context());
  expect(JSON.stringify(connection.devices)).not.toContain('private-device');
  const history = await connection.history(
    connection.devices[0].ref,
    { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
    { supplyRef: 'anonymous' },
    context(),
  );
  expect(history.sessions[0]).toMatchObject({
    kWh: '7',
    kind: 'session',
    provenance: 'unknown',
    approved: false,
  });
  expect(JSON.stringify(history)).not.toMatch(/private-device|secret/);
  connection.disconnect();
  expect(() =>
    connection.history(connection.devices[0].ref, node, { supplyRef: 'anonymous' }, context()),
  ).toThrow('connected');
});
