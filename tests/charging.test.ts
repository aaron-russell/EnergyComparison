import { describe, expect, it } from 'vitest';
import { genericCharging, podPoint } from '../src/adapters/charging-files';
import { allocateEV } from '../src/core/ev';
import { detectSpikes } from '../src/core/spikes';
import { sum } from '../src/core/decimal';
import { midnight, slots } from '../src/core/time';
import type { Charging, Reading } from '../src/core/types';

const context = () => ({ signal: new AbortController().signal, progress: () => {} });
const options = { supplyRef: 'home' };
const session: Charging = {
  id: 'session',
  supplyRef: 'home',
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-01T01:00:00Z',
  kWh: '2',
  source: 'test',
  provenance: 'grid',
  kind: 'session',
  status: 'measured',
  approved: true,
};
const household: Reading[] = slots(session).map((slot) => ({
  ...slot,
  supplyRef: 'home',
  fuel: 'electricity',
  kWh: '2',
  source: 'meter',
  status: 'measured',
}));

describe('charging import and attribution', () => {
  it('parses generic JSON and discards unrelated fields', async () => {
    const result = await genericCharging.parse!(
      JSON.stringify([
        {
          start: session.start,
          end: session.end,
          kWh: '2',
          name: 'Private Name',
          address: 'Private Street',
        },
      ]),
      options,
      context(),
    );
    expect(result.sessions[0].provenance).toBe('unknown');
    expect(result.sessions[0].approved).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/Private Name|Private Street/);
  });
  it('prefers Pod Point grid energy and excludes public charging', async () => {
    const csv =
      'Date,Start time,End time,Total kWh Consumed,kWh Grid (Home),Location type\n10/04/2024,11:25,14:52,30.12,10,home\n10/04/2024,15:00,17:00,20,,public';
    const result = await podPoint.parse!(csv, options, context());
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].kWh).toBe('10');
    expect(result.sessions[0].provenance).toBe('grid');
    expect(result.mapping.some((column) => column.column === 'kwh grid (home)')).toBe(true);
  });
  it('requires a date-only window and rejects ambiguous local timestamps', async () => {
    const csv = 'Date,kWh Consumed,Location type\n06-03-2024,5.5 kWh,Home';
    await expect(podPoint.parse!(csv, options, context())).rejects.toThrow('charging window');
    const result = await podPoint.parse!(
      csv,
      { ...options, windowStart: '23:00', windowEnd: '02:00' },
      context(),
    );
    expect(result.sessions[0].end).toBe('2024-03-07T02:00:00Z');
    await expect(
      genericCharging.parse!(
        'start,end,kWh\n2024-10-27T01:00,2024-10-27T02:00,1',
        options,
        context(),
      ),
    ).rejects.toThrow('explicit UTC offset');
  });
  it('cancels before parsing rows', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      genericCharging.parse!('start,end,kWh\n2024-01-01T00:00Z,2024-01-01T01:00Z,2', options, {
        signal: controller.signal,
        progress: () => {},
      }),
    ).rejects.toThrow('cancelled');
  });
  it('conserves session energy without modifying household imports', () => {
    const original = structuredClone(household);
    expect(sum(allocateEV([session], household).values()).toString()).toBe('2');
    expect(household).toEqual(original);
    expect(allocateEV([{ ...session, approved: false }], household).size).toBe(0);
  });
  it('rejects overlaps, uncertain attribution, missing imports and excess energy', () => {
    expect(() => allocateEV([session, { ...session, id: 'second' }], household)).toThrow('overlap');
    expect(() => allocateEV([{ ...session, provenance: 'mixed' }], household)).toThrow(
      'attribution',
    );
    expect(() => allocateEV([session], household.slice(0, 1))).toThrow('coverage');
    expect(() => allocateEV([{ ...session, kWh: '10' }], household)).toThrow('exceeds');
  });
  it('ignores solar energy and detects only reviewed spike candidates', () => {
    expect(allocateEV([{ ...session, provenance: 'solar' }], household).size).toBe(0);
    const period = { start: midnight('2024-01-01'), end: midnight('2024-02-01') };
    const rows: Reading[] = slots(period).map((slot) => ({
      ...slot,
      supplyRef: 'home',
      fuel: 'electricity',
      kWh: '0.2',
      source: 'test',
      status: 'measured',
    }));
    expect(detectSpikes(rows)).toHaveLength(0);
    rows[0].kWh = '3.7';
    rows[1].kWh = '3.7';
    const suggestions = detectSpikes(rows);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      approved: false,
      status: 'estimated',
      provenance: 'unknown',
    });
    rows[1].kWh = '0.2';
    expect(detectSpikes(rows)).toHaveLength(0);
  });
});
