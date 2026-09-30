import { afterEach, describe, expect, it, vi } from 'vitest';
import { octopus } from '../src/adapters/octopus';
import { pages, request } from '../src/adapters/transport';
import { normaliseReadings, gasToKWh } from '../src/core/readings';
import { syntheticEnergy, syntheticCharger } from '../src/adapters/synthetic';
import { replay } from '../src/core/engine';
import { exampleTariffs } from '../src/fixtures/synthetic';

const context = () => ({ signal: new AbortController().signal, progress: vi.fn() });
const period = { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('a second energy and API charger satisfy shared contracts and replay', async () => {
  const connection = await syntheticEnergy.connect({}, context());
  const imported = await connection.import(period, context(), vi.fn());
  const charger = await syntheticCharger.connect!({}, context());
  const history = await charger.history(
    charger.devices[0].ref,
    period,
    { supplyRef: connection.supplies[0].ref },
    context(),
  );
  expect(
    replay(exampleTariffs[0], imported.readings, connection.supplies, period, history.sessions)
      .complete,
  ).toBe(true);
  connection.disconnect();
  charger.disconnect();
});

describe('transport', () => {
  it('uses no cookies or cache and follows validated pagination', async () => {
    const endpoint = 'https://api.example.test/consumption/';
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ results: [1], next: `${endpoint}?page=2` }))
      .mockResolvedValueOnce(json({ results: [2], next: null }));
    const result = [];
    for await (const page of pages(endpoint, {}, context().signal, fetcher)) {
      result.push(...page);
    }
    expect(result).toEqual([1, 2]);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
    });
  });
  it('rejects cross-origin and cyclic pagination before following it', async () => {
    const endpoint = 'https://api.example.test/consumption/';
    const fetcher = vi
      .fn()
      .mockResolvedValue(json({ results: [], next: 'https://untrusted.test/' }));
    const collect = async () => {
      for await (const page of pages(endpoint, {}, context().signal, fetcher)) {
        expect(page).toEqual([]);
      }
    };
    await expect(collect()).rejects.toThrow('pagination');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('retries temporary failures with a fixed bound', async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({}, 429))
      .mockResolvedValueOnce(json({ success: true }));
    const pending = request('https://example.test', {}, context().signal, fetcher);
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ success: true });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('sanitises authentication and malformed-response errors without retry', async () => {
    const denied = vi.fn().mockResolvedValue(json({ secret: 'sensitive' }, 401));
    await expect(
      request('https://example.test', {}, context().signal, denied),
    ).rejects.toMatchObject({ code: 'auth' });
    expect(denied).toHaveBeenCalledTimes(1);
    const malformed = vi.fn().mockResolvedValue(new Response('sensitive-not-json'));
    await expect(request('https://example.test', {}, context().signal, malformed)).rejects.toThrow(
      'unreadable',
    );
  });
  it('does not request after cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn();
    await expect(
      request('https://example.test', {}, controller.signal, fetcher),
    ).rejects.toMatchObject({ code: 'cancelled' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('Octopus adapter', () => {
  it('includes replacement meters, excludes exports and keeps independent supplies', async () => {
    const account = {
      properties: [
        {
          electricity_meter_points: [
            {
              mpan: 'private-point',
              meters: [{ serial_number: 'old-meter' }, { serial_number: 'new-meter' }],
              is_export: false,
            },
            {
              mpan: 'second-point',
              meters: [{ serial_number: 'another-meter' }],
              is_export: false,
            },
            { mpan: 'export-point', meters: [{ serial_number: 'export-meter' }], is_export: true },
          ],
          gas_meter_points: [],
        },
      ],
    };
    const reading = {
      interval_start: period.start,
      interval_end: '2024-01-01T00:30:00Z',
      consumption: '0.12',
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json(account))
      .mockImplementation(() => Promise.resolve(json({ results: [reading], next: null })));
    vi.stubGlobal('fetch', fetcher);
    const connection = await octopus.connect(
      { apiKey: 'secret', account: 'private-account', gasUnit: 'none' },
      context(),
    );
    expect(connection.supplies).toHaveLength(2);
    const imported = await connection.import(period, context(), vi.fn());
    const normalised = normaliseReadings(imported.readings);
    expect(normalised.duplicates).toBe(1);
    expect(normalised.readings).toHaveLength(2);
    expect(JSON.stringify(imported)).not.toMatch(/private-point|old-meter|private-account|secret/);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it('retains completed meters on partial failure and flags conflicting overlaps', async () => {
    const page = {
      results: [
        { interval_start: period.start, interval_end: '2024-01-01T00:30:00Z', consumption: '1' },
      ],
      next: null,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(json(page)).mockResolvedValueOnce(json({}, 401)),
    );
    const connection = await octopus.connect(
      {
        apiKey: 'secret',
        gasUnit: 'none',
        manual: JSON.stringify([
          { fuel: 'electricity', point: 'point', serial: 'old' },
          { fuel: 'electricity', point: 'point', serial: 'new' },
        ]),
      },
      context(),
    );
    const imported = await connection.import(period, context(), vi.fn());
    expect(imported.readings).toHaveLength(1);
    expect(imported.failures).toHaveLength(1);
    const reading = imported.readings[0];
    expect(normaliseReadings([reading, { ...reading, kWh: '2' }]).conflicts).toHaveLength(1);
  });
  it('requires gas units and uses the documented conversion formula', async () => {
    await expect(
      octopus.connect(
        {
          apiKey: 'secret',
          manual: JSON.stringify([{ fuel: 'gas', point: 'point', serial: 'meter' }]),
        },
        context(),
      ),
    ).rejects.toThrow('gas consumption unit');
    expect(gasToKWh('1', 'm3')).toBe('11.13541333333333333333333333333333333333');
  });
});
