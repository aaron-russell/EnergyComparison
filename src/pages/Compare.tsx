import { prepareReplay } from '../state/replay-job';
import { Selection } from '../components/Selection';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReplayResult } from '../core/types';
import type { SessionProps } from '../state/session';
import { useJob } from '../state/use-job';
import { ErrorNotice, OperationStatus, PageHeading } from '../components/Shared';
import { ReplayResults } from '../components/Results';

export function ComparePage({ data, update }: SessionProps) {
  const defaultScope = data.supplies.length === 2 ? 'dual' : (data.supplies[0]?.fuel ?? 'dual');
  const [scope, setScope] = useState(data.guidedCompare ? defaultScope : 'dual');
  const [view, setView] = useState('observed');
  const [renewable, setRenewable] = useState('all');
  const [results, setResults] = useState<ReplayResult[]>([]);
  const [error, setError] = useState('');
  const job = useJob();
  const guidedStarted = useRef(false);
  const compare = useCallback(
    (guided = false) => {
      try {
        const request = prepareReplay(data, scope, view, renewable, !guided);
        setError('');
        setResults([]);
        guidedStarted.current = guided;
        job.run(request, (output) => {
          if (output.kind === 'replay') {
            setResults(output.results);
          }
        });
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Check the comparison options.');
      }
    },
    [data, job, renewable, scope, view],
  );
  useEffect(() => {
    if (data.guidedCompare && !guidedStarted.current) {
      update({ guidedCompare: false });
      compare(true);
    }
  }, [compare, data.guidedCompare, update]);
  const change = (setter: (value: string) => void) => (value: string) => {
    job.cancel();
    setter(value);
    setResults([]);
  };
  return (
    <>
      <PageHeading eyebrow="06 / COMPARE" title="Same usage. Different possibilities.">
        Historical replay, not guaranteed future savings. Prices are VAT-inclusive and do not
        include export income or battery simulation.
      </PageHeading>
      <ComparePanel
        scope={scope}
        view={view}
        renewable={renewable}
        hasEstimate={!!data.estimated}
        scopeChange={change(setScope)}
        viewChange={change(setView)}
        renewableChange={change(setRenewable)}
        compare={compare}
        busy={job.busy}
        error={error || job.error}
        cancel={job.cancel}
        tariffCount={data.tariffs.length}
      />
      {data.isDemo && <DemoNotice />}
      <ComparisonOutput
        results={results}
        view={view}
        estimatedShare={data.estimated?.estimatedShare}
        tariffs={data.tariffs}
        baselineId={data.baselineId}
        period={data.period}
        offers={data.tariffOffers}
        source={data.tariffSource}
      />
    </>
  );
}

function ComparePanel({
  scope,
  view,
  renewable,
  hasEstimate,
  scopeChange,
  viewChange,
  renewableChange,
  compare,
  busy,
  error,
  cancel,
  tariffCount,
}: {
  scope: string;
  view: string;
  renewable: string;
  hasEstimate: boolean;
  scopeChange: (value: string) => void;
  viewChange: (value: string) => void;
  renewableChange: (value: string) => void;
  compare: () => void;
  busy: boolean;
  error: string;
  cancel: () => void;
  tariffCount: number;
}) {
  return (
    <section className="panel">
      <CompareControls
        scope={scope}
        view={view}
        renewable={renewable}
        hasEstimate={hasEstimate}
        scopeChange={scopeChange}
        viewChange={viewChange}
        renewableChange={renewableChange}
      />
      <button className="primary" disabled={busy || tariffCount < 2} onClick={compare}>
        Replay these tariffs
      </button>
      <OperationStatus
        busy={busy}
        message={busy ? 'Replaying in a private calculation worker…' : ''}
        cancel={cancel}
      />
      <ErrorNotice message={error} />
    </section>
  );
}

function ComparisonOutput({
  results,
  view,
  estimatedShare,
  tariffs,
  baselineId,
  period,
  offers,
  source,
}: {
  results: ReplayResult[];
  view: string;
  estimatedShare?: string;
  tariffs: SessionProps['data']['tariffs'];
  baselineId: string;
  period: SessionProps['data']['period'];
  offers: SessionProps['data']['tariffOffers'];
  source: SessionProps['data']['tariffSource'];
}) {
  if (!results.length) {
    return null;
  }
  return (
    <>
      <ReplayNotice
        result={results[0]}
        estimatedShare={view === 'estimated' ? estimatedShare : undefined}
      />
      <ReplayResults
        results={results}
        tariffs={tariffs}
        baselineId={baselineId}
        period={period}
        offers={offers}
        source={source}
      />
    </>
  );
}

function DemoNotice() {
  return (
    <div className="demo-banner" role="status">
      <span className="demo-dot" />
      <div>
        <strong>Demo data</strong>
        <p>
          This comparison uses generated 12-month household usage and EV charging. No account data
          is included.
        </p>
      </div>
    </div>
  );
}

function CompareControls({
  scope,
  view,
  renewable,
  hasEstimate,
  scopeChange,
  viewChange,
  renewableChange,
}: {
  scope: string;
  view: string;
  renewable: string;
  hasEstimate: boolean;
  scopeChange: (value: string) => void;
  viewChange: (value: string) => void;
  renewableChange: (value: string) => void;
}) {
  return (
    <div className="form-row">
      <Selection
        label="Fuel comparison"
        value={scope}
        change={scopeChange}
        options={[
          { value: 'dual', label: 'Dual fuel' },
          { value: 'electricity', label: 'Electricity only' },
          { value: 'gas', label: 'Gas only' },
        ]}
      />
      <Selection
        label="Data view"
        value={view}
        change={viewChange}
        options={[
          { value: 'observed', label: 'Observed only' },
          { value: 'estimated', label: 'Estimated full period', disabled: !hasEstimate },
        ]}
      />
      <Selection
        label="Renewable alternatives"
        value={renewable}
        change={renewableChange}
        options={[
          { value: 'all', label: 'All / unknown included' },
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'unknown', label: 'Unknown' },
        ]}
      />
    </div>
  );
}

function ReplayNotice({
  result,
  estimatedShare,
}: {
  result: ReplayResult;
  estimatedShare?: string;
}) {
  const label = result.complete
    ? 'Complete observed period'
    : 'Incomplete observed totals — missing energy is excluded';
  return (
    <div className="notice">
      <div>
        <strong>
          {estimatedShare === undefined
            ? label
            : `Estimated full period · ${estimatedShare}% estimated energy`}
        </strong>
        <p>
          {result.days} local calendar days. Standing charges and prorated credits cover every day.
          Monthly equivalent is period total divided by the number of months. A 12-month replay is
          an annual historical cost.
        </p>
      </div>
    </div>
  );
}
