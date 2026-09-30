import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTariffs, lookupRegion, type TariffTrackerRow } from '../src/adapters/tarifftracker';

const row = (overrides: Partial<TariffTrackerRow> = {}): TariffTrackerRow => ({
  supplier: 'Test Energy',
  tariff: 'Fixed 12M',
  product_code: 'TEST-12M',
  region: 'Yorkshire',
  fuel: 'dual',
  kind: 'fixed',
  payment: 'direct debit',
  unit_p_kwh: 25.123456789,
  standing_p_day: 51.00000000000001,
  gas_unit_p_kwh: 7.123456789,
  gas_standing_p_day: 31.00000000000001,
  annual_est_gbp: 1200,
  ...overrides,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('Tariff Tracker adapter', () => {
  it('looks up a postcode with private, uncached request controls', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ data: { electricity_region: 'Yorkshire' } }));
    vi.stubGlobal('fetch', fetcher);

    await expect(lookupRegion('L1 1AA')).resolves.toBe('Yorkshire');
    expect(fetcher).toHaveBeenCalledWith(
      'https://tarifftracker.io/api/v1/lookup?postcode=L1%201AA',
      expect.objectContaining({ credentials: 'omit', cache: 'no-store', redirect: 'error' }),
    );
  });

  it('converts electricity, gas and dual rows without floating-point standing-charge drift', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      json({
        as_of: '2026-09-30T00:00:00Z',
        caveats: ['Open supplier data'],
        rows: [
          row(),
          row({
            fuel: 'electricity',
            product_code: 'TEST-E',
            gas_unit_p_kwh: null,
            gas_standing_p_day: null,
          }),
          row({
            fuel: 'gas',
            product_code: 'TEST-G',
            gas_unit_p_kwh: null,
            gas_standing_p_day: null,
          }),
        ],
      }),
    );
    vi.stubGlobal('fetch', fetcher);

    const result = await fetchTariffs('Yorkshire');
    expect(result.asOf).toBe('2026-09-30T00:00:00Z');
    expect(result.caveats).toEqual(['Open supplier data']);
    expect(result.tariffs).toHaveLength(3);
    expect(result.tariffs[0]).toMatchObject({
      electricity: { standing: '20', bands: [{ rate: '25.123456789' }] },
      gas: { standing: '31.00000000000001', rate: '7.123456789' },
    });
    expect(result.tariffs[1].gas).toBeUndefined();
    expect(result.tariffs[2].electricity).toBeUndefined();
  });

  it('rejects malformed responses and HTTP failures', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ rows: [{ supplier: 'missing fields' }] }))
      .mockResolvedValueOnce(json({}, 503));
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchTariffs('Yorkshire')).rejects.toThrow('malformed tariff data');
    await expect(fetchTariffs('Yorkshire')).rejects.toThrow('returned 503');
  });

  it('does not issue a request after cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchTariffs('Yorkshire', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
