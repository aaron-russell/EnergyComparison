import { useState } from 'react';
import { Plus, Save, Copy, Trash2 } from 'lucide-react';
import type { Tariff } from '../core/types';
import { blankTariff, jsonSource } from '../core/tariff';
import { exampleTariffs } from '../fixtures/synthetic';
import { deleteSavedTariff, exportTariffs, saveTariff } from '../state/tariff-storage';
import type { SessionProps } from '../state/session';
import { TariffEditor } from '../components/TariffEditor';
import { ErrorNotice, NextButton, PageHeading } from '../components/Shared';

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
  const importFile = async (file: File) => {
    try {
      merge(jsonSource.read(await file.text()));
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Invalid tariff file.');
    }
  };
  return (
    <>
      <PageHeading eyebrow="05 / TARIFFS" title="Your rates. Your alternatives.">
        Enter today’s tariff as your baseline. There is no supplier catalogue or live offer feed.
        Prices stay fixed throughout this historical replay.
      </PageHeading>
      <TariffToolbar
        add={() => setDraft(blankTariff())}
        examples={() => merge(structuredClone(exampleTariffs))}
        exportAll={() => exportTariffs(data.tariffs)}
        importFile={importFile}
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
}: {
  add: () => void;
  examples: () => void;
  exportAll: () => void;
  importFile: (file: File) => Promise<void>;
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
      <p className="muted">
        Saving is explicit. Refreshing clears unsaved definitions. Export includes tariff
        definitions only.
      </p>
    </div>
  );
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
