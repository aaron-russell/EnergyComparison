import { useEffect, useRef, useState } from 'react';
import { Plus, Save, Copy, Trash2 } from 'lucide-react';
import type { Tariff } from '../core/types';
import { blankTariff, jsonSource } from '../core/tariff';
import { exampleTariffs } from '../fixtures/synthetic';
import { deleteSavedTariff, exportTariffs, saveTariff } from '../state/tariff-storage';
import type { SessionProps } from '../state/session';
import { TariffEditor } from '../components/TariffEditor';
import { ErrorNotice, NextButton, PageHeading } from '../components/Shared';
import { fetchTariffs, lookupRegion } from '../adapters/tarifftracker';

export function TariffsPage({ data, update, next }: SessionProps) {
  const [draft, setDraft] = useState<Tariff | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const merge = (tariffs: Tariff[]) =>
    update({
      tariffs: [
        ...new Map([...data.tariffs, ...tariffs].map((tariff) => [tariff.id, tariff])).values(),
      ],
    });
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
      <PageHeading eyebrow="05 / TARIFFS" title="Your rates. Your alternatives.">
        Enter today’s tariff as your baseline, or load open supplier tariffs from Tariff Tracker.
        Prices stay fixed throughout this historical replay.
      </PageHeading>
      <TariffToolbar
        add={() => setDraft(blankTariff())}
        examples={() => merge(structuredClone(exampleTariffs))}
        exportAll={() => exportTariffs(data.tariffs)}
        importFile={importFile}
        merge={merge}
      />
      <ErrorNotice message={error} />
      <p role="status">{message}</p>
      {draft && (
        <TariffEditor key={draft.id} initial={draft} apply={apply} cancel={() => setDraft(null)} />
      )}
      <div className="tariff-grid">
        {data.tariffs.map((tariff) => (
          <TariffCard
            key={tariff.id}
            tariff={tariff}
            baseline={tariff.id === data.baselineId}
            choose={() => update({ baselineId: tariff.id })}
            edit={() => setDraft(structuredClone(tariff))}
            save={() => save(tariff)}
            duplicate={() =>
              setDraft({
                ...structuredClone(tariff),
                id: crypto.randomUUID(),
                name: `${tariff.name} copy`,
              })
            }
            remove={() => remove(tariff)}
          />
        ))}
      </div>
      <NextButton onClick={next} disabled={data.tariffs.length < 2 || !data.baselineId}>
        Compare tariffs
      </NextButton>
    </>
  );
}
function TariffToolbar({
  add,
  examples,
  exportAll,
  importFile,
  merge,
}: {
  add: () => void;
  examples: () => void;
  exportAll: () => void;
  importFile: (file: File) => Promise<void>;
  merge: (tariffs: Tariff[]) => void;
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
      <TariffTrackerImport merge={merge} />
      <p className="muted">
        Saving is explicit. Refreshing clears unsaved definitions. Export includes tariff
        definitions only.
      </p>
    </div>
  );
}

function TariffTrackerImport({ merge }: { merge: (tariffs: Tariff[]) => void }) {
  const [postcode, setPostcode] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sourceNote, setSourceNote] = useState('');
  const startRequest = useAbortableRequest();
  const load = async () => {
    const requestController = startRequest();
    setLoading(true);
    setError('');
    setSourceNote('');
    try {
      const { resolvedRegion, tariffs, asOf } = await requestTariffs(
        postcode,
        region,
        requestController.signal,
      );
      if (!requestController.signal.aborted) {
        setRegion(resolvedRegion);
        merge(tariffs);
      }
      if (!requestController.signal.aborted) {
        setSourceNote(
          `Loaded ${tariffs.length} tariffs for ${resolvedRegion}${asOf ? ` · prices checked ${asOf.slice(0, 10)}` : ''}.`,
        );
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
      <div className="form-row">
        <label className="field">
          Postcode
          <input
            value={postcode}
            onChange={(event) => setPostcode(event.target.value)}
            placeholder="L1 1AA"
          />
        </label>
        <label className="field">
          Electricity region
          <input
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            placeholder="Yorkshire"
          />
        </label>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading…' : 'Load tariffs'}
        </button>
      </div>
      <ErrorNotice message={error} />
      <p role="status">{sourceNote}</p>
      <small>
        Open data from{' '}
        <a href="https://tarifftracker.io/api/" target="_blank" rel="noreferrer">
          Tariff Tracker
        </a>
        . Supplier rates and terms should be checked before switching.
      </small>
    </div>
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
      <p>
        {tariff.electricity
          ? `${tariff.electricity.bands.length} electricity band(s)`
          : 'No electricity price'}{' '}
        · {tariff.gas ? 'Gas included' : 'No gas price'}
      </p>
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
