import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { ChargingPage } from '../src/pages/Charging';
import { ConnectionPage } from '../src/pages/Connection';
import { CoveragePage } from '../src/pages/Coverage';
import { ImportPage } from '../src/pages/Import';
import { TariffsPage } from '../src/pages/Tariffs';
import { ComparePage } from '../src/pages/Compare';
import { Shell } from '../src/components/Shell';
import { FieldsForm } from '../src/components/Fields';
import { ManualMeters } from '../src/components/ManualMeters';
import { ChargingReview } from '../src/components/ChargingReview';
import { FileChargingForm } from '../src/components/ChargingForms';
import { FuelRates, EVRate } from '../src/components/TariffRates';
import {
  EmptyState,
  ErrorNotice,
  NextButton,
  OperationStatus,
  PageHeading,
  PrivacyNote,
} from '../src/components/Shared';
import { exampleTariffs, syntheticReadings, syntheticSupplies } from '../src/fixtures/synthetic';
import { syntheticEnergy } from '../src/adapters/synthetic';
import { midnight } from '../src/core/time';
import { replay } from '../src/core/engine';
import type { Charging, Period, Reading, ReplayResult } from '../src/core/types';
import type { Job } from '../src/core/jobs';
import type { EnergyConnection } from '../src/adapters/contracts';
import type { SessionData, SessionProps } from '../src/state/session';
import { useSession } from '../src/state/use-session';

const period: Period = { start: midnight('2024-03-01'), end: midnight('2024-04-01') };
const electricity = syntheticSupplies[0];
const reading: Reading = {
  start: '2024-03-01T00:00:00Z',
  end: '2024-03-01T00:30:00Z',
  supplyRef: electricity.ref,
  fuel: 'electricity',
  kWh: '0.2',
  source: 'test',
  status: 'measured',
};
const session: Charging = {
  id: 'session',
  supplyRef: electricity.ref,
  start: reading.start,
  end: '2024-03-01T01:00:00Z',
  kWh: '2',
  source: 'test-charger',
  provenance: 'unknown',
  kind: 'session',
  status: 'estimated',
  approved: false,
};
const data = (overrides: Partial<SessionData> = {}): SessionData => ({
  period,
  supplies: syntheticSupplies,
  readings: [reading],
  conflicts: 0,
  charging: [session],
  estimated: null,
  tariffs: structuredClone(exampleTariffs),
  baselineId: exampleTariffs[0].id,
  tariffOffers: [],
  tariffSource: null,
  guidedCompare: false,
  isDemo: false,
  ...overrides,
});
const props = (overrides: Partial<SessionData> = {}): SessionProps => ({
  data: data(overrides),
  update: vi.fn(),
  next: vi.fn(),
});
const connection: EnergyConnection = {
  providerId: 'synthetic',
  supplies: syntheticSupplies,
  import: vi.fn(async () => ({ readings: [reading], failures: [] })),
  disconnect: vi.fn(),
};
class TestWorker {
  static last: TestWorker | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  constructor() {
    TestWorker.last = this;
  }
  postMessage = vi.fn();
}

beforeEach(() => {
  vi.stubGlobal('Worker', TestWorker);
  vi.stubGlobal('crypto', { randomUUID: () => 'generated-id' });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe('shared components and forms', () => {
  it('renders shared states and invokes controls', () => {
    const next = vi.fn();
    const cancel = vi.fn();
    render(
      <>
        <PageHeading eyebrow="Test" title="Heading">
          Description
        </PageHeading>
        <ErrorNotice message="Problem" />
        <ErrorNotice message="" />
        <NextButton onClick={next}>Next</NextButton>
        <PrivacyNote />
        <EmptyState>Nothing here</EmptyState>
        <OperationStatus busy message="Working" cancel={cancel} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(next).toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Problem');
  });

  it('covers Shell navigation, theme state, reset and connection status', () => {
    const navigate = vi.fn();
    const reset = vi.fn();
    const toggleTheme = vi.fn();
    render(
      <Shell
        step={1}
        navigate={navigate}
        reset={reset}
        theme="light"
        toggleTheme={toggleTheme}
        connected
      >
        Content
      </Shell>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Connect/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear session' }));
    expect(navigate).toHaveBeenCalledWith(0);
    expect(toggleTheme).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
    expect(screen.getByText(/Provider connected/)).toBeVisible();
  });

  it('renders every field kind and updates values', () => {
    const change = vi.fn();
    const fields = [
      { key: 'name', label: 'Name', type: 'text' as const, help: 'Name help' },
      { key: 'secret', label: 'Secret', type: 'password' as const },
      {
        key: 'unit',
        label: 'Unit',
        type: 'select' as const,
        options: [{ value: 'm3', label: 'm3' }],
      },
      { key: 'notes', label: 'Notes', type: 'textarea' as const },
      {
        key: 'meters',
        label: 'Meters',
        type: 'meters' as const,
        advanced: true,
        help: 'Meter help',
      },
    ];
    render(<FieldsForm fields={fields} values={{}} change={change} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'x' } });
    fireEvent.click(screen.getByText('Advanced connection options'));
    fireEvent.click(screen.getByRole('button', { name: 'Add import meter' }));
    expect(change).toHaveBeenCalled();
  });

  it('renders malformed meters safely and supports disabled controls', () => {
    const change = vi.fn();
    render(<ManualMeters value="not-json" change={change} disabled />);
    expect(screen.getByRole('button', { name: 'Add import meter' })).toBeDisabled();
  });

  it('edits charging sessions, approves a source, and removes a session', () => {
    const change = vi.fn();
    render(
      <ChargingReview
        sessions={[session, { ...session, id: 'other', source: 'other' }]}
        change={change}
      />,
    );
    fireEvent.change(screen.getByLabelText('Select authoritative source (optional)'), {
      target: { value: 'test-charger' },
    });
    fireEvent.change(screen.getAllByLabelText('Energy kWh')[0], { target: { value: '3' } });
    fireEvent.change(screen.getAllByLabelText('Confirmed provenance')[0], {
      target: { value: 'grid' },
    });
    fireEvent.click(screen.getAllByLabelText('Approve for replay')[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject session' })[0]);
    expect(change).toHaveBeenCalled();
  });

  it('updates tariff rate editors and toggles optional fuels and EV', () => {
    const change = vi.fn();
    const tariff = structuredClone(exampleTariffs[0]);
    render(
      <>
        <FuelRates tariff={{ ...tariff, electricity: undefined, gas: undefined }} change={change} />
        <EVRate tariff={{ ...tariff, ev: undefined }} change={change} />
      </>,
    );
    fireEvent.click(screen.getByLabelText('Electricity prices'));
    fireEvent.click(screen.getByLabelText('Gas prices'));
    fireEvent.click(screen.getByLabelText('EV-only grid rate adjustment'));
    expect(change).toHaveBeenCalledTimes(3);
  });

  it('previews a file charging import and reports parsing failures', async () => {
    const provider = {
      id: 'file',
      name: 'File',
      description: 'File provider',
      method: 'file' as const,
      fields: [],
      capabilities: {
        discovery: false,
        api: false,
        files: ['csv'],
        resolution: 'session' as const,
        history: '',
        measuredGrid: false,
      },
      parse: vi.fn().mockRejectedValue(new Error('bad file')),
    };
    const preview = vi.fn();
    render(
      <FileChargingForm provider={provider} supplyRef="home" period={period} preview={preview} />,
    );
    const input = screen.getByLabelText('Charging file');
    fireEvent.change(input, { target: { files: [new File(['bad'], 'bad.csv')] } });
    expect(screen.getByText('Selected file: bad.csv')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Preview mapping and sessions' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Preview mapping and sessions' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('operation could not be completed'),
    );
  });
});

describe('page journeys', () => {
  it('resets demo-derived state when a real provider connects', { timeout: 30000 }, () => {
    const { result } = renderHook(() => useSession());
    act(() => result.current.loadDemo());
    expect(result.current.data.isDemo).toBe(true);
    expect(result.current.data.readings.length).toBeGreaterThan(0);
    act(() => result.current.connected(connection));
    expect(result.current.data.isDemo).toBe(false);
    expect(result.current.data.readings).toEqual([]);
    expect(result.current.data.charging).toEqual([]);
    expect(result.current.data.baselineId).toBe('');
  });

  it('disconnects a provider result that arrives after the connection was aborted', async () => {
    const connected = vi.fn();
    const disconnect = vi.fn();
    let signal: AbortSignal | undefined;
    let resolveConnection!: (value: EnergyConnection) => void;
    const pending = new Promise<EnergyConnection>((resolve) => {
      resolveConnection = resolve;
    });
    vi.spyOn(syntheticEnergy, 'connect').mockImplementation((_values, context) => {
      signal = context.signal;
      return pending;
    });
    render(
      <ConnectionPage connection={null} connected={connected} loadDemo={vi.fn()} next={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('Energy provider'), { target: { value: 'synthetic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect provider' }));
    expect(signal).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(signal?.aborted).toBe(true);
    resolveConnection({ ...connection, disconnect });
    await waitFor(() => expect(disconnect).toHaveBeenCalled());
    expect(connected).not.toHaveBeenCalled();
  });

  it('offers a complete demo workspace without connecting a provider', () => {
    const loadDemo = vi.fn();
    render(
      <ConnectionPage connection={null} connected={vi.fn()} loadDemo={loadDemo} next={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load complete demo' }));
    expect(loadDemo).toHaveBeenCalledOnce();
  });

  it('renders import options and imports readings', async () => {
    const update = vi.fn();
    const next = vi.fn();
    render(
      <ImportPage
        {...props({ supplies: syntheticSupplies })}
        update={update}
        next={next}
        connection={connection}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Import history / retry' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Review coverage' }));
    expect(next).toHaveBeenCalled();
  });

  it('disables importing when no connection is available', () => {
    render(
      <ImportPage
        {...props({ supplies: syntheticSupplies })}
        update={vi.fn()}
        next={vi.fn()}
        connection={null}
      />,
    );
    expect(screen.getByRole('button', { name: 'Import history / retry' })).toBeDisabled();
  });

  it('renders coverage, edits a bill, toggles uniform allocation and continues', () => {
    const update = vi.fn();
    const next = vi.fn();
    render(
      <CoveragePage
        {...props({ readings: syntheticReadings(period) })}
        update={update}
        next={next}
      />,
    );
    const bill = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(bill, { target: { value: '100' } });
    fireEvent.click(screen.getByLabelText(/Allow uniform allocation/));
    fireEvent.click(screen.getByRole('button', { name: 'Review optional EV charging' }));
    expect(next).toHaveBeenCalled();
  });

  it('renders charging sources and handles invalid spike power and continuation', () => {
    const update = vi.fn();
    const next = vi.fn();
    render(
      <ChargingPage
        {...props({ readings: syntheticReadings(period), charging: [], isDemo: true })}
        update={update}
        next={next}
      />,
    );
    fireEvent.change(screen.getByLabelText('Charger power (kW)'), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suggest sessions from usage' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid charger power.');
    expect(update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Charger power (kW)'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suggest sessions from usage' }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ isDemo: false }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to tariffs' }));
    expect(next).toHaveBeenCalled();
  });

  it('adds examples, edits, duplicates, saves, exports and deletes tariffs', async () => {
    const update = vi.fn();
    const pageData = data({ tariffs: [] });
    render(<TariffsPage data={pageData} update={update} next={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add sample tariffs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create a tariff' }));
    fireEvent.change(screen.getByLabelText('Tariff name'), { target: { value: 'New tariff' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save tariff to comparison' }));
    expect(update).toHaveBeenCalled();
  });

  it('covers tariff card actions and import errors', async () => {
    const update = vi.fn();
    render(<TariffsPage data={data()} update={update} next={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('radio')[1]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit tariff details' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Save on this device' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Make a copy' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove tariff' })[1]);
    const input = screen.getByLabelText('Add tariffs from a JSON file');
    fireEvent.change(input, { target: { files: [new File(['bad'], 'bad.json')] } });
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
    expect(update).toHaveBeenCalled();
  });

  it('searches tariffs and sorts by their replayed price for recorded usage', async () => {
    const tariffs = structuredClone(exampleTariffs.slice(0, 2));
    render(
      <TariffsPage
        data={data({ tariffs, supplies: [electricity], readings: [reading] })}
        update={vi.fn()}
        next={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search tariffs' }), {
      target: { value: tariffs[0].name },
    });
    expect(screen.getByRole('heading', { name: tariffs[0].name })).toBeVisible();
    expect(screen.queryByRole('heading', { name: tariffs[1].name })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search tariffs'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate price for my usage' }));
    await waitFor(() => expect(TestWorker.last).not.toBeNull());
    const job = TestWorker.last!.postMessage.mock.calls[0][0] as Job;
    expect(job.kind).toBe('replay');
    if (job.kind !== 'replay') throw new Error('Expected a replay job.');
    const results = job.tariffs.map((tariff) =>
      replay(tariff, job.readings, job.supplies, job.period, job.charging),
    );
    TestWorker.last!.onmessage?.({ data: { kind: 'replay', results } } as MessageEvent);
    await waitFor(() => expect(screen.getByLabelText('Sort tariffs by')).toHaveValue('usage'));
    expect(screen.queryByRole('button', { name: 'Calculate price for my usage' })).toBeNull();
    expect(screen.getAllByText('Cost for recorded usage')).toHaveLength(2);
    expect(screen.getByText(/missing intervals are excluded/)).toBeVisible();
  });

  it('shows compact prices for flat, multi-rate, gas-only and adjusted tariffs', () => {
    const flat = {
      ...structuredClone(exampleTariffs[0]),
      id: 'flat',
      name: 'Flat prices',
      annualCredit: '100',
      ev: { mode: 'discount' as const, rate: '2.5' },
    };
    const gasOnly = {
      ...structuredClone(exampleTariffs[0]),
      id: 'gas-only',
      name: 'Gas only',
      electricity: undefined,
    };
    render(
      <TariffsPage
        data={data({ tariffs: [flat, exampleTariffs[1], gasOnly] })}
        update={vi.fn()}
        next={vi.fn()}
      />,
    );

    expect(screen.getByText('25.00p/kWh · 49.00p/day')).toBeVisible();
    expect(screen.getAllByText('6.20p/kWh · 31.00p/day')).toHaveLength(3);
    expect(screen.getByText('£1.00/year')).toBeVisible();
    expect(screen.getByText('Discount 2.50p/kWh')).toBeVisible();
    expect(screen.getByText('8.00p–29.00p/kWh · 2 bands · 51.00p/day')).toBeVisible();
    expect(screen.getAllByText('Not included')).toHaveLength(1);
  });

  it('loads Tariff Tracker tariffs and displays provider caveats', async () => {
    const update = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: { electricity_region: 'Yorkshire' } })),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              as_of: '2026-10-01T00:00:00Z',
              caveats: ['Synthetic supplier note'],
              rows: [
                {
                  supplier: 'Test Energy',
                  tariff: 'Fixed',
                  product_code: 'TEST',
                  region: 'Yorkshire',
                  fuel: 'electricity',
                  kind: 'fixed',
                  payment: 'direct debit',
                  unit_p_kwh: '25',
                  standing_p_day: '50',
                  annual_est_gbp: '1000',
                },
              ],
            }),
          ),
        ),
    );
    render(<TariffsPage data={data({ tariffs: [] })} update={update} next={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Postcode'), { target: { value: 'L1 1AA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add tariffs to comparison' }));
    await waitFor(() =>
      expect(screen.getByText('Loaded 1 tariffs', { exact: false })).toBeVisible(),
    );
    expect(screen.getByText('Synthetic supplier note')).toBeVisible();
    expect(update).toHaveBeenCalled();
  });

  it('starts the guided cheapest replay after loading open offers', async () => {
    const update = vi.fn();
    const next = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: { electricity_region: 'Yorkshire' } })),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              rows: [
                {
                  supplier: 'Test Energy',
                  tariff: 'Fixed',
                  product_code: 'TEST',
                  region: 'Yorkshire',
                  fuel: 'dual',
                  kind: 'fixed',
                  payment: 'direct debit',
                  unit_p_kwh: '25',
                  standing_p_day: '50',
                  gas_unit_p_kwh: '7',
                  gas_standing_p_day: '30',
                  annual_est_gbp: '1000',
                },
              ],
            }),
          ),
        ),
    );
    render(<TariffsPage data={data({ tariffs: [] })} update={update} next={next} />);
    fireEvent.change(screen.getByLabelText('Postcode'), { target: { value: 'L1 1AA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find cheapest and compare now' }));
    await waitFor(() => expect(next).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ guidedCompare: true, tariffOffers: expect.any(Array) }),
    );
  });

  it('reports missing regions and empty Tariff Tracker catalogues', async () => {
    render(<TariffsPage data={data({ tariffs: [] })} update={vi.fn()} next={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add tariffs to comparison' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Enter a postcode'));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ rows: [] }))));
    fireEvent.change(screen.getByLabelText('Electricity region'), {
      target: { value: 'Yorkshire' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add tariffs to comparison' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No open tariffs'));
  });

  it('renders compare controls and validation errors', () => {
    render(<ComparePage {...props({ tariffs: [exampleTariffs[0]], baselineId: '' })} />);
    expect(screen.getByRole('button', { name: 'Compare using this usage' })).toBeDisabled();
  });

  it('runs a replay and renders results', async () => {
    const result = replay(
      exampleTariffs[0],
      syntheticReadings(period),
      syntheticSupplies,
      period,
    ) as ReplayResult;
    render(<ComparePage {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Compare using this usage' }));
    await waitFor(() => expect(TestWorker.last).not.toBeNull());
    TestWorker.last!.onmessage?.({ data: { kind: 'replay', results: [result] } } as MessageEvent);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Historical replay costs' })).toBeVisible(),
    );
  });

  it('terminates an active replay worker when controls change', async () => {
    render(<ComparePage {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Compare using this usage' }));
    await waitFor(() => expect(TestWorker.last).not.toBeNull());
    const worker = TestWorker.last!;
    fireEvent.change(screen.getByLabelText('Fuel comparison'), {
      target: { value: 'electricity' },
    });
    expect(worker.terminate).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Compare using this usage' })).toBeEnabled();
  });
});

describe('application shell', () => {
  it('navigates through steps and persists theme', async () => {
    render(<App reset={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 1 })[0]).toHaveTextContent('Your usage'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(localStorage.getItem('energy-replay:theme')).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: /Import usage/ }));
    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 1 })[0]).toHaveTextContent(
        'Bring your history',
      ),
    );
  });
});
