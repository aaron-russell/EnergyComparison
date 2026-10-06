import { useEffect, useRef, useState } from 'react';
import { Plus, Save, Copy, Trash2 } from 'lucide-react';
import Decimal from '../core/decimal';
import type { Tariff } from '../core/types';
import { blankTariff, jsonSource } from '../core/tariff';
import { exampleTariffs } from '../fixtures/synthetic';
import { deleteSavedTariff, exportTariffs, saveTariff } from '../state/tariff-storage';
import type { SessionData, SessionProps } from '../state/session';
import { TariffEditor } from '../components/TariffEditor';
import { ErrorNotice, NextButton, PageHeading } from '../components/Shared';
import { fetchTariffs, lookupRegion } from '../adapters/tarifftracker';
import { useTariffLocation, useTariffUi } from '../state/use-session-ui';
import { useJob } from '../state/use-job';

export function TariffsPage({ data, update, next, ui, updateUi }: SessionProps) {
  const { draft, setDraft, postcode, region, changeLocation } = useTariffUi(ui, updateUi);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const usage = useTariffUsage(data);
  const merge = (tariffs: Tariff[]) =>
    update((current) => ({
      tariffs: [
        ...new Map([...current.tariffs, ...tariffs].map((tariff) => [tariff.id, tariff])).values(),
      ],
    }));
  const apply = (tariff: Tariff) => {
    merge([tariff]);
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
        next={next}
        update={update}
        postcode={postcode}
        region={region}
        changeLocation={changeLocation}
      />
      <ErrorNotice message={error} />
      <TariffSteps hasBaseline={!!data.baselineId} tariffCount={data.tariffs.length} />
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
      <TariffComparisonList
        data={data}
        usage={usage}
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
        next={next}
      />
    </>
  );
}

type TariffUsage = {
  costs: Record<string, string>;
  calculate: () => boolean;
  busy: boolean;
  error: string;
};

function TariffComparisonList({
  data,
  usage,
  choose,
  edit,
  save,
  duplicate,
  remove,
  next,
}: {
  data: SessionData;
  usage: TariffUsage;
  choose: (id: string) => void;
  edit: (tariff: Tariff) => void;
  save: (tariff: Tariff) => void;
  duplicate: (tariff: Tariff) => void;
  remove: (tariff: Tariff) => void;
  next: () => void;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  return (
    <>
      <TariffListControls
        search={search}
        sort={sort}
        changeSearch={setSearch}
        changeSort={setSort}
        calculateUsageCosts={() => {
          const started = usage.calculate();
          if (started) {
            setSort('usage');
          }
          return started;
        }}
        hasUsageCosts={Object.keys(usage.costs).length > 0}
        calculating={usage.busy}
      />
      <ErrorNotice message={usage.error} />
      <p className="muted">
        Usage prices include standing charges and tariff credits for this period. They use recorded
        readings; missing intervals are excluded.
      </p>
      <TariffCards
        tariffs={sortTariffs(data.tariffs, search, sort, usage.costs)}
        usageCosts={usage.costs}
        baselineId={data.baselineId}
        choose={choose}
        edit={edit}
        save={save}
        duplicate={duplicate}
        remove={remove}
      />
      {data.tariffs.length > 0 &&
        !data.tariffs.some((tariff) =>
          tariff.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
        ) && <p className="muted">No tariffs match. Try another name or clear the search.</p>}
      {(data.tariffs.length < 2 || !data.baselineId) && (
        <p className="muted">
          {!data.baselineId
            ? 'Choose your current tariff and add at least one alternative to continue.'
            : 'Add at least one alternative tariff to continue.'}
        </p>
      )}
      <NextButton onClick={next} disabled={data.tariffs.length < 2 || !data.baselineId}>
        Continue to comparison
      </NextButton>
    </>
  );
}

function useTariffUsage(data: SessionData): TariffUsage {
  const job = useJob();
  const [requestError, setRequestError] = useState('');
  const [result, setResult] = useState<{
    tariffs: Tariff[];
    readings: SessionData['readings'];
    supplies: SessionData['supplies'];
    period: SessionData['period'];
    charging: SessionData['charging'];
    costs: Record<string, string>;
  } | null>(null);
  const costs =
    result?.tariffs === data.tariffs &&
    result.readings === data.readings &&
    result.supplies === data.supplies &&
    result.period === data.period &&
    result.charging === data.charging
      ? result.costs
      : {};
  const calculate = () => {
    const tariffs = compatibleTariffs(data);
    if (!data.readings.length || tariffs.length < 2) {
      setRequestError('Add observed usage and at least two tariffs priced for the same supplies.');
      return false;
    }
    setRequestError('');
    job.run(
      {
        kind: 'replay',
        readings: data.readings,
        supplies: data.supplies,
        period: data.period,
        charging: data.charging,
        tariffs,
      },
      (output) => {
        if (output.kind === 'replay') {
          setResult({
            tariffs: data.tariffs,
            readings: data.readings,
            supplies: data.supplies,
            period: data.period,
            charging: data.charging,
            costs: Object.fromEntries(
              output.results.map(({ tariffId, total }) => [tariffId, total]),
            ),
          });
        }
      },
    );
    return true;
  };
  return { costs, calculate, busy: job.busy, error: job.error || requestError };
}

function compatibleTariffs(data: SessionData) {
  return data.tariffs.filter(
    (tariff) => data.supplies.length > 0 && data.supplies.every((supply) => tariff[supply.fuel]),
  );
}

function TariffSteps({ hasBaseline, tariffCount }: { hasBaseline: boolean; tariffCount: number }) {
  return (
    <section className="panel" aria-label="How to compare tariffs">
      <strong>Compare your tariffs in three steps</strong>
      <ol>
        <li>
          {hasBaseline ? 'Current tariff selected.' : 'Choose the tariff you are on now below.'}
        </li>
        <li>
          {tariffCount > 1
            ? 'Add or keep at least one alternative tariff.'
            : 'Add an alternative tariff.'}
        </li>
        <li>Continue, then choose “Compare using this usage” to see each tariff priced.</li>
      </ol>
    </section>
  );
}

function TariffListControls({
  search,
  sort,
  changeSearch,
  changeSort,
  calculateUsageCosts,
  hasUsageCosts,
  calculating,
}: {
  search: string;
  sort: string;
  changeSearch: (value: string) => void;
  changeSort: (value: string) => void;
  calculateUsageCosts: () => boolean;
  hasUsageCosts: boolean;
  calculating: boolean;
}) {
  return (
    <div className="form-row tariff-list-controls">
      <label className="field">
        Search tariffs
        <input
          type="search"
          value={search}
          onChange={(event) => changeSearch(event.target.value)}
          placeholder="Search by tariff name"
        />
      </label>
      <label className="field">
        Sort tariffs by
        <select value={sort} onChange={(event) => changeSort(event.target.value)}>
          <option value="name">Name (A to Z)</option>
          <option value="electricity">Electricity unit price (lowest rate)</option>
          <option value="gas">Gas unit price</option>
          <option value="renewable">Renewable status</option>
          <option value="usage" disabled={!hasUsageCosts}>
            Price for your recorded usage
          </option>
        </select>
      </label>
      {!hasUsageCosts && (
        <button type="button" onClick={calculateUsageCosts} disabled={calculating}>
          {calculating ? 'Calculating…' : 'Calculate price for my usage'}
        </button>
      )}
    </div>
  );
}

function sortTariffs(
  tariffs: Tariff[],
  search: string,
  sort: string,
  usageCosts: Record<string, string>,
) {
  const query = search.trim().toLocaleLowerCase();
  return tariffs
    .filter((tariff) => tariff.name.toLocaleLowerCase().includes(query))
    .sort((left, right) => compareTariffs(left, right, sort, usageCosts));
}

function compareTariffs(
  left: Tariff,
  right: Tariff,
  sort: string,
  usageCosts: Record<string, string>,
) {
  if (sort === 'electricity') {
    return compareRates(lowestElectricityRate(left), lowestElectricityRate(right));
  }
  if (sort === 'gas') {
    return compareRates(left.gas?.rate, right.gas?.rate);
  }
  if (sort === 'renewable') {
    return left.renewable.localeCompare(right.renewable) || compareNames(left, right);
  }
  if (sort === 'usage') {
    return compareRates(usageCosts[left.id], usageCosts[right.id]) || compareNames(left, right);
  }
  return compareNames(left, right);
}

function lowestElectricityRate(tariff: Tariff): string | undefined {
  return tariff.electricity?.bands
    .reduce(
      (lowest, band) => (new Decimal(band.rate).lessThan(lowest) ? new Decimal(band.rate) : lowest),
      new Decimal(tariff.electricity.bands[0].rate),
    )
    .toString();
}

function compareRates(left?: string, right?: string): number {
  if (!left) {
    return right ? 1 : 0;
  }
  if (!right) {
    return -1;
  }
  return new Decimal(left).comparedTo(right);
}

function compareNames(left: Tariff, right: Tariff): number {
  return left.name.localeCompare(right.name);
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
  usageCosts,
  baselineId,
  choose,
  edit,
  save,
  duplicate,
  remove,
}: {
  tariffs: Tariff[];
  usageCosts: Record<string, string>;
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
          usageCost={usageCosts[tariff.id]}
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
  next,
  update,
  postcode,
  region,
  changeLocation,
}: {
  add: () => void;
  examples: () => void;
  exportAll: () => void;
  importFile: (file: File) => Promise<void>;
  merge: (tariffs: Tariff[]) => void;
  next: () => void;
  update: SessionProps['update'];
  postcode: string;
  region: string;
  changeLocation: (postcode: string, region: string) => void;
}) {
  return (
    <div className="panel">
      <div className="actions">
        <button className="primary" onClick={add}>
          <Plus size={17} />
          Create a tariff
        </button>
        <button onClick={examples}>Add sample tariffs</button>
        <button onClick={exportAll}>Download tariff definitions</button>
      </div>
      <p className="muted">
        Create a tariff yourself, add sample rates, or move tariff definitions in and out as JSON.
      </p>
      <label className="field">
        Add tariffs from a JSON file
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
        next={next}
        update={update}
        postcode={postcode}
        region={region}
        changeLocation={changeLocation}
      />
      <p className="muted">
        Your current comparison stays in this tab through refresh. Downloaded files contain tariff
        definitions only.
      </p>
    </div>
  );
}

function TariffTrackerImport({
  merge,
  next,
  update,
  postcode,
  region,
  changeLocation,
}: Pick<SessionProps, 'update' | 'next'> & {
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
  const load = async (guided = false) => {
    const requestController = startRequest();
    setLoading(true);
    setError('');
    setSourceNote('');
    setCaveats([]);
    try {
      const { resolvedRegion, tariffs, offers, asOf, caveats } = await requestTariffs(
        postcodeValue,
        regionValue,
        requestController.signal,
      );
      if (!requestController.signal.aborted) {
        changeRegion(resolvedRegion);
        merge(tariffs);
        update({
          tariffOffers: offers,
          tariffSource: { region: resolvedRegion, asOf, caveats },
          guidedCompare: guided,
        });
        if (guided) {
          next();
        }
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
    <TariffTrackerControls
      postcode={postcodeValue}
      region={regionValue}
      changePostcode={changePostcode}
      changeRegion={changeRegion}
      load={load}
      loading={loading}
      error={error}
      sourceNote={sourceNote}
      caveats={caveats}
    />
  );
}

function TariffTrackerControls({
  postcode,
  region,
  changePostcode,
  changeRegion,
  load,
  loading,
  error,
  sourceNote,
  caveats,
}: {
  postcode: string;
  region: string;
  changePostcode: (value: string) => void;
  changeRegion: (value: string) => void;
  load: (guided?: boolean) => Promise<void>;
  loading: boolean;
  error: string;
  sourceNote: string;
  caveats: string[];
}) {
  return (
    <div className="tariff-tracker-import">
      <div>
        <strong>Find tariffs from Tariff Tracker</strong>
        <p className="muted">
          Use a postcode to resolve your electricity region, or enter the region directly.
        </p>
      </div>
      <TariffTrackerFields {...{ postcode, region, changePostcode, changeRegion, load, loading }} />
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
  load: (guided?: boolean) => Promise<void>;
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
        {loading ? 'Loading…' : 'Add tariffs to comparison'}
      </button>
      <button type="button" className="primary" onClick={() => void load(true)} disabled={loading}>
        {loading ? 'Loading…' : 'Find cheapest and compare now'}
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
  usageCost,
  baseline,
  choose,
  edit,
  save,
  duplicate,
  remove,
}: {
  tariff: Tariff;
  usageCost?: string;
  baseline: boolean;
  choose: () => void;
  edit: () => void;
  save: () => void;
  duplicate: () => void;
  remove: () => void;
}) {
  return (
    <article className={`panel tariff-card ${baseline ? 'selected' : ''}`}>
      <span className="badge">{baseline ? 'CURRENT TARIFF' : 'ALTERNATIVE TARIFF'}</span>
      <h2>{tariff.name}</h2>
      <p>Renewable: {tariff.renewable}</p>
      <TariffPriceSummary tariff={tariff} />
      {usageCost !== undefined && (
        <dl className="tariff-prices">
          <PriceSummaryRow label="Cost for recorded usage" value={pounds(usageCost)} />
        </dl>
      )}
      <p className="muted">Choose the tariff you currently pay for</p>
      <div className="actions">
        <button onClick={edit}>Edit tariff details</button>
        <label className="tariff-current-choice">
          <input
            type="radio"
            name="current-tariff"
            value={tariff.id}
            checked={baseline}
            onChange={choose}
            aria-label={`I am on ${tariff.name}`}
          />
          I’m on this tariff
        </label>
      </div>
      <p className="muted">Tariff list actions</p>
      <div className="actions">
        <button onClick={save}>
          <Save size={15} />
          Save on this device
        </button>
        <button onClick={duplicate}>
          <Copy size={15} />
          Make a copy
        </button>
        <button onClick={remove}>
          <Trash2 size={15} />
          Remove tariff
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
