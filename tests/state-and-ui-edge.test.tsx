import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareReplay } from '../src/state/replay-job';
import {
  deleteSavedTariff,
  exportTariffs,
  savedTariffs,
  saveTariff,
} from '../src/state/tariff-storage';
import { TariffEditor } from '../src/components/TariffEditor';
import { FuelRates, EVRate } from '../src/components/TariffRates';
import { ManualMeters } from '../src/components/ManualMeters';
import { ApiChargingForm } from '../src/components/ChargingForms';
import { ReplayResults } from '../src/components/Results';
import { exampleTariffs, syntheticReadings, syntheticSupplies } from '../src/fixtures/synthetic';
import { midnight } from '../src/core/time';
import { replay } from '../src/core/engine';
import type { ChargingPreview, ChargingProviderAdapter } from '../src/adapters/contracts';
import type { SessionData } from '../src/state/session';

const period = { start: midnight('2024-03-01'), end: midnight('2024-03-02') };
const baseData = (patch: Partial<SessionData> = {}): SessionData => ({
  period,
  supplies: syntheticSupplies,
  readings: syntheticReadings(period),
  conflicts: 0,
  charging: [],
  estimated: null,
  tariffs: structuredClone(exampleTariffs),
  baselineId: exampleTariffs[0].id,
  ...patch,
});
const preview: ChargingPreview = { sessions: [], mapping: [], notices: [] };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('replay state and tariff persistence', () => {
  it('prepares observed, estimated, fuel and renewable replay jobs', () => {
    const data = baseData({
      estimated: { readings: [], estimated: [], coverage: 1, estimatedShare: '2.0', notes: [] },
    });
    expect(prepareReplay(data, 'electricity', 'observed', 'yes')).toMatchObject({
      kind: 'replay',
      supplies: [syntheticSupplies[0]],
      tariffs: [exampleTariffs[0], exampleTariffs[1]],
    });
    const gasJob = prepareReplay(data, 'gas', 'estimated', 'yes');
    const dualJob = prepareReplay(data, 'dual', 'observed', 'yes');
    expect(gasJob.kind === 'replay' && gasJob.readings).toEqual([]);
    expect(dualJob.kind === 'replay' && dualJob.tariffs).toHaveLength(2);
  });

  it('rejects invalid replay selections', () => {
    expect(() =>
      prepareReplay(baseData({ supplies: [syntheticSupplies[0]] }), 'dual', 'observed', 'all'),
    ).toThrow('Dual-fuel');
    expect(() => prepareReplay(baseData({ conflicts: 1 }), 'dual', 'observed', 'all')).toThrow(
      'conflicting',
    );
    expect(() => prepareReplay(baseData(), 'dual', 'estimated', 'all')).toThrow('estimated view');
    expect(() =>
      prepareReplay(baseData({ baselineId: 'missing' }), 'dual', 'observed', 'all'),
    ).toThrow('baseline');
  });

  it('saves, replaces, deletes, exports and recovers from malformed storage', () => {
    const tariff = structuredClone(exampleTariffs[0]);
    localStorage.setItem('energy-replay:saved-tariffs', '{bad');
    expect(savedTariffs()).toEqual([]);
    saveTariff(tariff);
    saveTariff({ ...tariff, name: 'Updated' });
    expect(savedTariffs()).toHaveLength(1);
    expect(savedTariffs()[0].name).toBe('Updated');
    deleteSavedTariff(tariff.id);
    expect(savedTariffs()).toEqual([]);
    vi.stubGlobal('URL', { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() });
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers();
    exportTariffs([tariff]);
    expect(create).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:test');
    vi.useRealTimers();
  });
});

describe('tariff and results UI', () => {
  it('edits tariff identity, prices, bands, and EV settings', () => {
    const apply = vi.fn();
    const cancel = vi.fn();
    const tariff = structuredClone(exampleTariffs[0]);
    render(<TariffEditor initial={tariff} apply={apply} cancel={cancel} />);
    fireEvent.change(screen.getByLabelText('Tariff name'), { target: { value: 'Edited' } });
    fireEvent.click(screen.getByLabelText('EV-only grid rate adjustment'));
    fireEvent.change(screen.getByLabelText('Adjustment'), { target: { value: 'discount' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add time band' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove band' }).at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: 'Apply tariff' }));
    expect(apply).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel edit' }));
    expect(cancel).toHaveBeenCalled();
  });

  it('rejects an invalid tariff submission', () => {
    const apply = vi.fn();
    const tariff = structuredClone(exampleTariffs[0]);
    render(<TariffEditor initial={tariff} apply={apply} cancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add time band' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply tariff' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Electricity bands overlap');
    expect(apply).not.toHaveBeenCalled();
  });

  it('covers tariff rate toggles and band edits', () => {
    const change = vi.fn();
    const tariff = structuredClone(exampleTariffs[0]);
    render(<FuelRates tariff={tariff} change={change} />);
    fireEvent.change(screen.getByLabelText('Electricity standing charge (p/day)'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText('Unit rate (p/kWh)'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '01:00' } });
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '02:00' } });
    fireEvent.click(screen.getByLabelText('Mon'));
    fireEvent.click(screen.getByRole('button', { name: 'Add time band' }));
    expect(change).toHaveBeenCalled();
    render(<EVRate tariff={{ ...tariff, ev: { mode: 'override', rate: '1' } }} change={change} />);
    fireEvent.change(screen.getByLabelText('Adjustment'), { target: { value: 'discount' } });
    expect(change).toHaveBeenCalled();
  });

  it('renders tariff results, monthly chart and component details', () => {
    const result = replay(exampleTariffs[0], syntheticReadings(period), syntheticSupplies, period);
    render(
      <ReplayResults
        results={[result]}
        tariffs={exampleTariffs}
        baselineId={exampleTariffs[0].id}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Historical replay costs' })).toBeVisible();
    expect(screen.getByRole('img', { name: /Monthly cost comparison/ })).toBeVisible();
    fireEvent.click(screen.getByText(/monthly and component breakdown/));
    expect(screen.getByText(/Band rounding residue/)).toBeVisible();
  });
});

describe('alternative adapters and forms', () => {
  it('edits existing manual meters', () => {
    const change = vi.fn();
    const value = JSON.stringify([
      { fuel: 'electricity', point: 'point', serial: 'serial', group: 'home' },
    ]);
    render(<ManualMeters value={value} change={change} />);
    fireEvent.change(screen.getByLabelText('Fuel'), { target: { value: 'gas' } });
    fireEvent.change(screen.getByLabelText('Meter point (MPAN / MPRN)'), {
      target: { value: 'new-point' },
    });
    fireEvent.change(screen.getByLabelText('Meter serial'), { target: { value: 'new-serial' } });
    fireEvent.change(screen.getByLabelText('Property group'), { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove meter' }));
    expect(change).toHaveBeenCalled();
  });

  it('connects an API charging provider and fetches history', async () => {
    const disconnect = vi.fn();
    const history = vi.fn().mockResolvedValue(preview);
    const provider: ChargingProviderAdapter = {
      id: 'api',
      name: 'API',
      description: 'API',
      method: 'api',
      fields: [],
      capabilities: {
        discovery: true,
        api: true,
        files: [],
        resolution: 'session',
        history: '',
        measuredGrid: false,
      },
      connect: vi
        .fn()
        .mockResolvedValue({ devices: [{ ref: 'device', label: 'Device' }], history, disconnect }),
    };
    const receive = vi.fn();
    render(
      <ApiChargingForm provider={provider} supplyRef="home" period={period} preview={receive} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Connect charging provider' }));
    await waitFor(() => expect(provider.connect).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Fetch charging history' })).toBeVisible(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fetch charging history' }));
    await waitFor(() => expect(receive).toHaveBeenCalledWith(preview));
    expect(history).toHaveBeenCalled();
  });
});
