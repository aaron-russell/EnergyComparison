import { prepareReplay } from '../state/replay-job';
import { Selection } from '../components/Selection';
import { useState } from 'react';
import type { ReplayResult } from '../core/types';
import type { SessionProps } from '../state/session';
import { useJob } from '../state/use-job';
import { ErrorNotice, OperationStatus, PageHeading } from '../components/Shared';
import { ReplayResults } from '../components/Results';

export function ComparePage({ data }: SessionProps) {
  const [scope, setScope] = useState('dual');
  const [view, setView] = useState('observed');
  const [renewable, setRenewable] = useState('all');
  const [results, setResults] = useState<ReplayResult[]>([]);
  const [error, setError] = useState('');
  const job = useJob();
  const compare = () => {
    try {
      const request = prepareReplay(data, scope, view, renewable);
      setError('');
      setResults([]);
      job.run(request, (output) => {
        if (output.kind === 'replay') {
          setResults(output.results);
        }
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Check the comparison options.');
    }
  };
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
      <section className="panel">
        <CompareControls
          scope={scope}
          view={view}
          renewable={renewable}
          hasEstimate={!!data.estimated}
          scopeChange={change(setScope)}
          viewChange={change(setView)}
          renewableChange={change(setRenewable)}
        />
        <button
          className="primary"
          disabled={job.busy || data.tariffs.length < 2}
          onClick={compare}
        >
          Replay these tariffs
        </button>
        <OperationStatus
          busy={job.busy}
          message={job.busy ? 'Replaying in a private calculation worker…' : ''}
          cancel={job.cancel}
        />
        <ErrorNotice message={error || job.error} />
      </section>
      {!!results.length && (
        <>
          <ReplayNotice
            result={results[0]}
            estimatedShare={view === 'estimated' ? data.estimated?.estimatedShare : undefined}
          />
          <ReplayResults results={results} tariffs={data.tariffs} baselineId={data.baselineId} />
        </>
      )}
    </>
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
