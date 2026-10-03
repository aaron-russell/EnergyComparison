import { useEffect, useRef, useState } from 'react';
import { Plus, Save, Copy, Trash2 } from 'lucide-react';
import Decimal from '../core/decimal';
import type { Tariff } from '../core/types';
import { blankTariff, jsonSource } from '../core/tariff';
import { exampleTariffs } from '../fixtures/synthetic';
import { deleteSavedTariff, exportTariffs, saveTariff } from '../state/tariff-storage';
import type { SessionProps } from '../state/session';
import { TariffEditor } from '../components/TariffEditor';
import { ErrorNotice, NextButton, PageHeading } from '../components/Shared';
import { fetchTariffs, lookupRegion } from '../adapters/tarifftracker';
import { useTariffLocation, useTariffUi } from '../state/use-session-ui';

export function TariffsPage({ data, update, next, ui, updateUi }: SessionProps) {
  const { draft, setDraft, postcode, region, changeLocation } = useTariffUi(ui, updateUi);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const merge = (tariffs: Tariff[]) =>
    update((current) => ({
      tariffs: [
        ...new Map([...current.tariffs, ...tariffs].map((tariff) => [tariff.id, tariff])).values(),
      ],
    }));
  const apply = (tariff: Tariff) => {
    merge([tariff]);
    if (!data.baselineId) {
      update({ baselineId: tariff.id });
    }
    setDraft(null);
  };
  const save = (tariff: Tariff) => {
    try {
      saveTariff(tariff);
      setMessage(`${tariff.name} saved on this device.`);
    } catch {
      setError('Browser storage is unavailable. Export your tariffs instead.');
    }
  };
  const remove = (tariff: Tariff) => {
    deleteSavedTariff(tariff.id);
    update({
      tariffs: data.tariffs.filter((item) => item.id !== tariff.id),
      baselineId: data.baselineId === tariff.id ? '' : data.baselineId,
    });
  };
  const importFile = (file: File) => readTariffFile(file, merge, setError);
  return (
    <>
      <TariffsHeading />
      <TariffToolbar
        add={() => setDraft(blankTariff())}
        examples={() => merge(structuredClone(exampleTariffs))}
        exportAll={() => exportTariffs(data.tariffs)}
        importFile={importFile}
        merge={merge}
        postcode={postcode}
        region={region}
        changeLocation={changeLocation}
      />
      <ErrorNotice message={error} />
      <p role="status">{message}</p>
      {draft && (
        <TariffEditor
          key={draft.id}
          initial={draft}
          apply={apply}
          cancel={() => setDraft(null)}
          changeDraft={setDraft}
        />
      )}
      <TariffCards
        tariffs={data.tariffs}
        baselineId={data.baselineId}
        choose={(baselineId) => update({ baselineId })}
        edit={(tariff) => setDraft(structuredClone(tariff))}
        save={save}
        duplicate={(tariff) =>
          setDraft({
            ...structuredClone(tariff),
            id: crypto.randomUUID(),
            name: `${tariff.name} copy`,
          })
        }
        remove={remove}
      />
      <NextButton onClick={next} disabled={data.tariffs.length < 2 || !data.baselineId}>
        Compare tariffs
      </NextButton>
    </>
  );
}

function TariffsHeading() {
  return (
    <PageHeading eyebrow="05 / TARIFFS" title="Your rates. Your alternatives.">
      Enter today’s tariff as your baseline, or load open supplier tariffs from Tariff Tracker.
      Prices stay fixed throughout this historical replay.
    </PageHeading>
  );
}

function TariffCards({
  tariffs,
  baselineId,
  choose,
  edit,
  save,
  duplicate,
  remove,
}: {
  tariffs: Tariff[];
  baselineId: string;
  choose: (id: string) => void;
  edit: (tariff: Tariff) => void;
  save: (tariff: Tariff) => void;
  duplicate: (tariff: Tariff) => void;
  remove: (tariff: Tariff) => void;
}) {
  return (
    <div className="tariff-grid">
      {tariffs.map((tariff) => (
        <TariffCard
          key={tariff.id}
          tariff={tariff}
          baseline={tariff.id === baselineId}
          choose={() => choose(tariff.id)}
          edit={() => edit(tariff)}
          save={() => save(tariff)}
          duplicate={() => duplicate(tariff)}
          remove={() => remove(tariff)}
        />
      ))}
    </div>
  );
}
function TariffToolbar({
  add,
  examples,
  exportAll,
  importFile,
  merge,
  postcode,
  region,
  changeLocation,
}: {
  add: () => void;
  examples: () => void;
  exportAll: () => void;
  importFile: (file: File) => Promise<void>;
  merge: (tariffs: Tariff[]) => void;
  postcode: string;
  region: string;
  changeLocation: (postcode: string, region: string) => void;
}) {
  return (
    <div className="panel">
      <div className="actions">
        <button className="primary" onClick={add}>
          <Plus size={17} />
          Add tariff
        </button>
        <button onClick={examples}>Load synthetic examples</button>
        <button onClick={exportAll}>Export tariffs only</button>
      </div>
      <label className="field">
        Import tariff JSON
        <input
          type="file"
          accept=".json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void importFile(file);
            }
            event.target.value = '';
          }}
        />
      </label>
      <TariffTrackerImport
        merge={merge}
        postcode={postcode}
        region={region}
        changeLocation={changeLocation}
      />
      <p className="muted">
        Saving is explicit. Progress and unsaved definitions stay in this tab through refresh;
        export includes tariff definitions only.
      </p>
    </div>
  );
}

function TariffTrackerImport({
  merge,
  postcode,
  region,
  changeLocation,
}: {
  merge: (tariffs: Tariff[]) => void;
  postcode: string;
  region: string;
  changeLocation: (postcode: string, region: string) => void;
}) {
  const { postcodeValue, regionValue, changePostcode, changeRegion } = useTariffLocation(
    postcode,
    region,
    changeLocation,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sourceNote, setSourceNote] = useState('');
  const [caveats, setCaveats] = useState<string[]>([]);
  const startRequest = useAbortableRequest();
  const load = async () => {
    const requestController = startRequest();
    setLoading(true);
    setError('');
    setSourceNote('');
    setCaveats([]);
    try {
      const { resolvedRegion, tariffs, asOf, caveats } = await requestTariffs(
        postcodeValue,
        regionValue,
        requestController.signal,
      );
      if (!requestController.signal.aborted) {
        changeRegion(resolvedRegion);
        merge(tariffs);
      }
      if (!requestController.signal.aborted) {
        setSourceNote(
          `Loaded ${tariffs.length} tariffs for ${resolvedRegion}${asOf ? ` · prices checked ${asOf.slice(0, 10)}` : ''}.`,
        );
        setCaveats(caveats);
      }
    } catch (failure) {
      if (!requestController.signal.aborted) {
        setError(
          failure instanceof Error ? failure.message : 'Could not load Tariff Tracker tariffs.',
        );
      }
    } finally {
      if (!requestController.signal.aborted) {
        setLoading(false);
      }
    }
  };
  return (
    <div className="tariff-tracker-import">
      <div>
        <strong>Find tariffs from Tariff Tracker</strong>
        <p className="muted">
          Use a postcode to resolve your electricity region, or enter the region directly.
        </p>
      </div>
      <TariffTrackerFields
        postcode={postcodeValue}
        region={regionValue}
        changePostcode={changePostcode}
        changeRegion={changeRegion}
        load={load}
        loading={loading}
      />
      <ErrorNotice message={error} />
      <p role="status">{sourceNote}</p>
      <TariffCaveats caveats={caveats} />
      <TariffTrackerDisclosure />
    </div>
  );
}

function TariffTrackerFields({
  postcode,
  region,
  changePostcode,
  changeRegion,
  load,
  loading,
}: {
  postcode: string;
  region: string;
  changePostcode: (value: string) => void;
  changeRegion: (value: string) => void;
  load: () => Promise<void>;
  loading: boolean;
}) {
  return (
    <div className="form-row">
      <label className="field">
        Postcode
        <input
          value={postcode}
          onChange={(event) => changePostcode(event.target.value)}
          placeholder="L1 1AA"
        />
      </label>
      <label className="field">
        Electricity region
        <input
          value={region}
          onChange={(event) => changeRegion(event.target.value)}
          placeholder="Yorkshire"
        />
      </label>
      <button type="button" onClick={() => void load()} disabled={loading}>
        {loading ? 'Loading…' : 'Load tariffs'}
      </button>
    </div>
  );
}

function TariffCaveats({ caveats }: { caveats: string[] }) {
  if (!caveats.length) {
    return null;
  }
  return (
    <ul className="muted">
      {caveats.map((caveat, index) => (
        <li key={`${index}-${caveat}`}>{caveat}</li>
      ))}
    </ul>
  );
}

function TariffTrackerDisclosure() {
  return (
    <small>
      Open data from{' '}
      <a href="https://tarifftracker.io/api/" target="_blank" rel="noreferrer">
        Tariff Tracker
      </a>
      . Your postcode, if supplied, is sent to Tariff Tracker to resolve the electricity region.
      Supplier rates and terms should be checked before switching.
    </small>
  );
}

function useAbortableRequest() {
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  return () => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    return next;
  };
}

async function requestTariffs(postcode: string, region: string, signal: AbortSignal) {
  const resolvedRegion = postcode.trim() ? await lookupRegion(postcode, signal) : region;
  if (!resolvedRegion) {
    throw new Error('Enter a postcode or an electricity region.');
  }
  const result = await fetchTariffs(resolvedRegion, signal);
  if (!result.tariffs.length) {
    throw new Error('No open tariffs were returned for this region.');
  }
  return { resolvedRegion, ...result };
}
function TariffCard({
  tariff,
  baseline,
  choose,
  edit,
  save,
  duplicate,
  remove,
}: {
  tariff: Tariff;
  baseline: boolean;
  choose: () => void;
  edit: () => void;
  save: () => void;
  duplicate: () => void;
  remove: () => void;
}) {
  return (
    <article className={`panel tariff-card ${baseline ? 'selected' : ''}`}>
      <span className="badge">{baseline ? 'CURRENT BASELINE' : 'ALTERNATIVE'}</span>
      <h2>{tariff.name}</h2>
      <p>Renewable: {tariff.renewable}</p>
      <TariffPriceSummary tariff={tariff} />
      <div className="actions">
        <button onClick={edit}>Edit rates</button>
        <button onClick={choose} disabled={baseline}>
          Use as baseline
        </button>
      </div>
      <div className="actions">
        <button onClick={save}>
          <Save size={15} />
          Save
        </button>
        <button onClick={duplicate}>
          <Copy size={15} />
          Duplicate
        </button>
        <button onClick={remove}>
          <Trash2 size={15} />
          Delete
        </button>
      </div>
    </article>
  );
}

function TariffPriceSummary({ tariff }: { tariff: Tariff }) {
  return (
    <dl className="tariff-prices" aria-label={`${tariff.name} prices`}>
      <PriceSummaryRow
        label="Electricity"
        value={tariff.electricity ? electricitySummary(tariff) : 'Not included'}
      />
      <PriceSummaryRow
        label="Gas"
        value={
          tariff.gas
            ? `${pence(tariff.gas.rate)}/kWh · ${pence(tariff.gas.standing)}/day`
            : 'Not included'
        }
      />
      {new Decimal(tariff.annualCredit).isZero() === false && (
        <PriceSummaryRow label="Annual credit" value={`${pounds(tariff.annualCredit)}/year`} />
      )}
      {tariff.ev && (
        <PriceSummaryRow
          label="EV adjustment"
          value={`${tariff.ev.mode === 'override' ? 'Override' : 'Discount'} ${pence(tariff.ev.rate)}/kWh`}
        />
      )}
    </dl>
  );
}

function PriceSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function electricitySummary(tariff: Tariff): string {
  const electricity = tariff.electricity!;
  const rates = electricity.bands.map((band) => new Decimal(band.rate));
  const lowest = rates.reduce((minimum, rate) => (rate.lessThan(minimum) ? rate : minimum));
  const highest = rates.reduce((maximum, rate) => (rate.greaterThan(maximum) ? rate : maximum));
  const unitRate = lowest.equals(highest)
    ? `${pence(lowest.toString())}/kWh`
    : `${pence(lowest.toString())}–${pence(highest.toString())}/kWh · ${rates.length} bands`;
  return `${unitRate} · ${pence(electricity.standing)}/day`;
}

function pence(value: string): string {
  return `${new Decimal(value).toDecimalPlaces(2).toFixed(2)}p`;
}

function pounds(value: string): string {
  return `£${new Decimal(value).div(100).toDecimalPlaces(2).toFixed(2)}`;
}

async function readTariffFile(
  file: File,
  merge: (tariffs: Tariff[]) => void,
  error: (message: string) => void,
) {
  try {
    merge(jsonSource.read(await file.text()));
    error('');
  } catch (failure) {
    error(failure instanceof Error ? failure.message : 'Invalid tariff file.');
  }
}
