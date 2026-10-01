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
  unit_p_kwh: '25.123456789',
  standing_p_day: '51.00000000000001',
  gas_unit_p_kwh: '7.123456789',
  gas_standing_p_day: '31.00000000000001',
  annual_est_gbp: '1200',
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
      expect.objectContaining({
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      }),
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
    expect(result.tariffs[0].name).toContain('direct debit');
  });

  it('preserves signed unit rates and payment variants', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      json({
        rows: [
          row({ fuel: 'electricity', unit_p_kwh: '-2.5', product_code: 'VARIANT' }),
          row({
            fuel: 'electricity',
            unit_p_kwh: '2.5',
            payment: 'prepayment',
            product_code: 'VARIANT',
          }),
        ],
      }),
    );
    vi.stubGlobal('fetch', fetcher);

    const result = await fetchTariffs('Yorkshire');
    expect(result.tariffs).toHaveLength(2);
    expect(result.tariffs[0].electricity?.bands[0].rate).toBe('-2.5');
    expect(result.tariffs[0].id).not.toBe(result.tariffs[1].id);
    expect(result.tariffs[1].name).toContain('prepayment');
  });

  it('rejects malformed responses and HTTP failures', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ rows: [{ supplier: 'missing fields' }] }))
      .mockResolvedValueOnce(json({}, 503));
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchTariffs('Yorkshire')).rejects.toThrow('malformed tariff data');
    await expect(fetchTariffs('Yorkshire')).rejects.toMatchObject({ code: 'network' });
  });

  it('preserves upstream numeric tokens and validates dual-fuel rates and mapped tariffs', async () => {
    const body = `{"rows":[{"supplier":"Test Energy","tariff":"Precise","product_code":"PRECISE","region":"Yorkshire","fuel":"electricity","kind":"fixed","payment":"direct debit","unit_p_kwh":25.123456789012345678901,"standing_p_day":51.000000000000000001,"annual_est_gbp":1200} ]}`;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    const result = await fetchTariffs('Yorkshire');
    expect(result.tariffs[0].electricity).toMatchObject({
      standing: '51.000000000000000001',
      bands: [{ rate: '25.123456789012345678901' }],
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json({
          rows: [
            row({
              gas_unit_p_kwh: null,
              gas_standing_p_day: null,
            }),
          ],
        }),
      ),
    );
    await expect(fetchTariffs('Yorkshire')).rejects.toThrow('malformed tariff data');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ rows: [row({ supplier: 'x'.repeat(101) })] })),
    );
    await expect(fetchTariffs('Yorkshire')).rejects.toThrow('Invalid tariff');
  });

  it('does not issue a request after cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    await expect(fetchTariffs('Yorkshire', controller.signal)).rejects.toMatchObject({
      code: 'cancelled',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
