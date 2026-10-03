import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { coverageRows, type CoverageRow } from '../core/coverage';
import type { BillTotal } from '../core/estimate';
import type { SessionProps } from '../state/session';
import { useJob } from '../state/use-job';
import { useCoverageUi } from '../state/use-session-ui';
import { ErrorNotice, NextButton, OperationStatus, PageHeading } from '../components/Shared';

export function CoveragePage({ data, update, next, ui, updateUi }: SessionProps) {
  const rows = useMemo(
    () => coverageRows(data.readings, data.supplies, data.period),
    [data.readings, data.supplies, data.period],
  );
  const { bills, uniform, setBills, setUniform } = useCoverageUi(ui, updateUi);
  const job = useJob();
  const changeBill = (row: CoverageRow, kWh: string) => {
    const others = bills.filter(
      (bill) => bill.supplyRef !== row.supply.ref || bill.month !== row.month,
    );
    setBills(kWh ? [...others, { supplyRef: row.supply.ref, month: row.month, kWh }] : others);
  };
  const estimate = () =>
    job.run(
      {
        kind: 'estimate',
        observed: data.readings,
        supplies: data.supplies,
        period: data.period,
        bills,
        uniform,
      },
      (output) => {
        if (output.kind === 'estimate') {
          update({ estimated: output.result });
        }
      },
    );
  return (
    <>
      <PageHeading eyebrow="03 / COVERAGE" title="See what’s there. Understand the gaps.">
        Observed readings remain unchanged. You can compare them as-is, or create a separately
        labelled full-period estimate.
      </PageHeading>
      <section className="panel">
        <div className="section-title">
          <BarChart3 />
          <h2>Monthly coverage</h2>
        </div>
        <CoverageTable rows={rows} bills={bills} changeBill={changeBill} />
        <div className="notice">
          Gas converted from cubic metres is approximate: m³ × 1.02264 × your calorific value ÷ 3.6.
        </div>
      </section>
      <section className="panel">
        <h2>Fill gaps transparently</h2>
        <p>
          Profiles need 28 complete observed days per supply. Monthly bill totals fill only the
          missing remainder. Same-month matching days are preferred where available.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={uniform}
            onChange={(event) => setUniform(event.target.checked)}
          />
          Allow uniform allocation when a bill total is available but profile data is insufficient.
        </label>
        <ErrorNotice message={job.error} />
        <button onClick={estimate} disabled={job.busy || !data.readings.length}>
          Create estimated view
        </button>
        <OperationStatus
          busy={job.busy}
          message={job.busy ? 'Estimating missing consumption…' : ''}
          cancel={job.cancel}
        />
        {data.estimated && <EstimationSummary result={data.estimated} />}
      </section>
      <NextButton onClick={next}>Review optional EV charging</NextButton>
    </>
  );
}

function CoverageTable({
  rows,
  bills,
  changeBill,
}: {
  rows: CoverageRow[];
  bills: BillTotal[];
  changeBill: (row: CoverageRow, value: string) => void;
}) {
  return (
    <div className="table-scroll" tabIndex={0}>
      <table>
        <caption>Observed coverage and optional monthly energy totals</caption>
        <thead>
          <tr>
            <th scope="col">Supply / month</th>
            <th scope="col">Observed kWh</th>
            <th scope="col">Coverage</th>
            <th scope="col">Bill total kWh (optional)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.supply.ref}|${row.month}`}>
              <th scope="row">
                {row.supply.label}
                <small>{row.month}</small>
              </th>
              <td>{row.kWh}</td>
              <td>
                <span className={row.percent === 100 ? 'good' : 'warning'}>
                  {row.percent.toFixed(1)}%
                </span>
                <small>
                  {row.observed} / {row.expected} intervals
                </small>
              </td>
              <td>
                <input
                  className="compact-input"
                  type="number"
                  min="0"
                  step="any"
                  aria-label={`Bill total for ${row.supply.label} ${row.month}`}
                  value={
                    bills.find(
                      (bill) => bill.supplyRef === row.supply.ref && bill.month === row.month,
                    )?.kWh ?? ''
                  }
                  onChange={(event) => changeBill(row, event.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EstimationSummary({ result }: { result: import('../core/estimate').EstimateResult }) {
  return (
    <div className="notice success">
      <div>
        <strong>{result.estimatedShare}% of energy is estimated</strong>
        {result.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
    </div>
  );
}
