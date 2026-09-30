import Decimal, { sum } from '../core/decimal';
import type { ReplayResult, Tariff } from '../core/types';
const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const money = (value: string) => currency.format(Number(value));
type Props = { results: ReplayResult[]; tariffs: Tariff[]; baselineId: string };

export function ReplayResults({ results, tariffs, baselineId }: Props) {
  const baseline = results.find((result) => result.tariffId === baselineId)!;
  const annual = results[0].complete && results[0].months.length === 12 && results[0].days >= 365;
  return (
    <div className="results">
      <AnnualSummary result={results[0]} baseline={baseline} annual={annual} />
      <section className="panel">
        <h2>{annual ? 'Annual tariff comparison' : 'Historical replay costs'}</h2>
        <div className="table-scroll">
          <table>
            <caption>Identical period, supplies and energy for all tariffs</caption>
            <thead>
              <tr>
                <th scope="col">Tariff</th>
                <th scope="col">{annual ? 'Annual cost' : 'Period total'}</th>
                <th scope="col">Monthly equivalent</th>
                <th scope="col">Difference from baseline</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.tariffId}>
                  <th scope="row">
                    {tariffs.find((tariff) => tariff.id === result.tariffId)?.name}
                    <small>{result.tariffId === baselineId ? 'Baseline' : 'Alternative'}</small>
                  </th>
                  <td className="cost">{money(result.total)}</td>
                  <td>{money(result.monthlyEquivalent)}</td>
                  <td>{money(new Decimal(result.total).sub(baseline.total).toFixed(2))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Monthly shape</h2>
        <MonthlyChart results={results} />
      </section>
      {results.map((result) => (
        <CostDetails
          key={result.tariffId}
          result={result}
          name={tariffs.find((tariff) => tariff.id === result.tariffId)!.name}
        />
      ))}
    </div>
  );
}
function AnnualSummary({
  result,
  baseline,
  annual,
}: {
  result: ReplayResult;
  baseline: ReplayResult;
  annual: boolean;
}) {
  const period = annual ? '/yr' : '';
  return (
    <section className="panel annual-summary">
      <div>
        <span className="badge">{annual ? '12-MONTH VIEW' : 'SELECTED PERIOD'}</span>
        <h2>{annual ? 'Annual usage and monthly cost' : 'Usage and cost for this period'}</h2>
        <p className="muted">Every tariff is priced against the same household energy usage.</p>
      </div>
      <div className="annual-metrics">
        <div>
          <span>Electricity usage</span>
          <strong>
            {formatKwh(result.energy.electricity)} kWh{period}
          </strong>
        </div>
        <div>
          <span>Gas usage</span>
          <strong>
            {formatKwh(result.energy.gas)} kWh{period}
          </strong>
        </div>
        <div>
          <span>{annual ? 'Baseline annual cost' : 'Baseline period cost'}</span>
          <strong>{money(baseline.total)}</strong>
        </div>
        <div>
          <span>{annual ? 'Baseline monthly cost' : 'Baseline monthly equivalent'}</span>
          <strong>{money(baseline.monthlyEquivalent)}</strong>
        </div>
      </div>
    </section>
  );
}
function formatKwh(value: string): string {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(Number(value));
}
function MonthlyChart({ results }: { results: ReplayResult[] }) {
  const shown = results.slice(0, 2);
  const values = shown.flatMap((result) => result.months.map((month) => Number(month.total)));
  const maximum = Math.max(1, ...values.map(Math.abs));
  const months = shown[0].months;
  const width = Math.max(500, months.length * 60);
  const cell = width / months.length;
  return (
    <div className="chart-scroll">
      <p className="muted">
        First two tariffs; full values are available in the accessible tables below. Bars above the
        line are costs, below are credits.
      </p>
      <svg
        role="img"
        aria-label="Monthly cost comparison for the first two tariffs"
        viewBox={`0 0 ${width} 220`}
      >
        <line x1="0" x2={width} y1="165" y2="165" className="chart-axis" />
        {shown.map((result, series) =>
          result.months.map((month, index) => {
            const value = Number(month.total);
            const height = (Math.abs(value) / maximum) * (value < 0 ? 28 : 140);
            return (
              <rect
                key={`${series}-${month.month}`}
                x={index * cell + 10 + series * 15}
                y={value < 0 ? 165 : 165 - height}
                width="12"
                height={height}
                rx="3"
                className={`chart-series-${series}`}
              >
                <title>
                  {month.month}: {money(month.total)}
                </title>
              </rect>
            );
          }),
        )}
        {months.map((month, index) => (
          <text key={month.month} x={index * cell + 10} y="214">
            {month.month.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
}
function CostDetails({ result, name }: { result: ReplayResult; name: string }) {
  const componentTotal = (key: 'electricity' | 'gas' | 'standing' | 'credits' | 'evAdjustment') =>
    money(sum(result.months.map((month) => month[key])).toFixed(2));
  return (
    <details className="panel">
      <summary>{name} · monthly and component breakdown</summary>
      <dl className="totals-strip">
        <div>
          <dt>Electricity</dt>
          <dd>{componentTotal('electricity')}</dd>
        </div>
        <div>
          <dt>Gas</dt>
          <dd>{componentTotal('gas')}</dd>
        </div>
        <div>
          <dt>Standing</dt>
          <dd>{componentTotal('standing')}</dd>
        </div>
        <div>
          <dt>Credits</dt>
          <dd>{componentTotal('credits')}</dd>
        </div>
        <div>
          <dt>EV adjustment</dt>
          <dd>{componentTotal('evAdjustment')}</dd>
        </div>
      </dl>
      <MonthlyTable result={result} />
      <p className="muted">
        Band rounding residue is assigned to the final displayed band so electricity subtotals
        reconcile.
      </p>
    </details>
  );
}
function MonthlyTable({ result }: { result: ReplayResult }) {
  return (
    <div className="table-scroll">
      <table>
        <caption>Monthly charges, rounded to pennies</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Electricity</th>
            <th>Gas</th>
            <th>Standing</th>
            <th>Credits</th>
            <th>EV</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {result.months.map((month) => (
            <tr key={month.month}>
              <th scope="row">
                {month.month}
                <details>
                  <summary>Bands</summary>
                  {Object.entries(month.bands).map(([name, value]) => (
                    <p key={name}>
                      {name}: {money(value)}
                    </p>
                  ))}
                </details>
              </th>
              <td>{money(month.electricity)}</td>
              <td>{money(month.gas)}</td>
              <td>{money(month.standing)}</td>
              <td>{money(month.credits)}</td>
              <td>{money(month.evAdjustment)}</td>
              <td>{money(month.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
