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
    const supplies = data.supplies.filter((supply) => scope === 'dual' || supply.fuel === scope);
    if (scope === 'dual' && new Set(supplies.map((supply) => supply.fuel)).size !== 2) {
      setError('Dual-fuel comparison needs both fuels. Select electricity-only or gas-only.');
      return;
    }
    if (data.conflicts) {
      setError('Resolve conflicting import records before comparison.');
      return;
    }
    const readings = (view === 'estimated' ? data.estimated!.readings : data.readings).filter(
      (reading) => supplies.some((supply) => supply.ref === reading.supplyRef),
    );
    const tariffs = data.tariffs.filter(
      (tariff) =>
        tariff.id === data.baselineId || renewable === 'all' || tariff.renewable === renewable,
    );
    if (!tariffs.some((tariff) => tariff.id === data.baselineId)) {
      setError('Choose a baseline tariff first.');
      return;
    }
    setError('');
    setResults([]);
    job.run(
      {
        kind: 'replay',
        readings,
        supplies,
        period: data.period,
        charging: data.charging.filter((session) =>
          supplies.some((supply) => supply.ref === session.supplyRef),
        ),
        tariffs,
      },
      (output) => {
        if (output.kind === 'replay') {
          setResults(output.results);
        }
      },
    );
  };
  const change =
    (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLSelectElement>) => {
      setter(event.target.value);
      setResults([]);
    };
  return (
    <>
      <PageHeading eyebrow="06 / COMPARE" title="Same usage. Different possibilities.">
        Historical replay, not guaranteed future savings. Prices are VAT-inclusive and do not
        include export income or battery simulation.
      </PageHeading>
      <section className="panel">
        <div className="form-row">
          <label className="field">
            Fuel comparison
            <select value={scope} onChange={change(setScope)}>
              <option value="dual">Dual fuel</option>
              <option value="electricity">Electricity only</option>
              <option value="gas">Gas only</option>
            </select>
          </label>
          <label className="field">
            Data view
            <select value={view} onChange={change(setView)}>
              <option value="observed">Observed only</option>
              <option value="estimated" disabled={!data.estimated}>
                Estimated full period
              </option>
            </select>
          </label>
          <label className="field">
            Renewable alternatives
            <select value={renewable} onChange={change(setRenewable)}>
              <option value="all">All / unknown included</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
        </div>
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
          <div className="notice">
            <div>
              <strong>
                {view === 'estimated'
                  ? `Estimated full period · ${data.estimated?.estimatedShare}% estimated energy`
                  : results[0].complete
                    ? 'Complete observed period'
                    : 'Incomplete observed totals — missing energy is excluded'}
              </strong>
              <p>
                {results[0].days} local calendar days. Standing charges and prorated credits cover
                every day. Monthly equivalent is period total divided by the number of months. A
                12-month replay is an annual historical cost.
              </p>
            </div>
          </div>
          <ReplayResults results={results} tariffs={data.tariffs} baselineId={data.baselineId} />
        </>
      )}
    </>
  );
}
