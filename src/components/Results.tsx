import Decimal, { sum } from '../core/decimal';
import type { Period, ReplayResult, Tariff } from '../core/types';
import type { TariffTrackerOffer } from '../adapters/tarifftracker';

const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const money = (value: string) => currency.format(Number(value));
const energy = (value: string) => `${Number(value).toFixed(0)} kWh`;
type Props = {
  results: ReplayResult[];
  tariffs: Tariff[];
  baselineId: string;
  period?: Period;
  offers?: TariffTrackerOffer[];
  source?: { region: string; asOf?: string; caveats: string[] } | null;
};
type ComponentKey = 'electricity' | 'gas' | 'standing' | 'credits' | 'evAdjustment';

export function ReplayResults({ results, tariffs, baselineId, offers = [], source }: Props) {
  const ranked = [...results].sort((left, right) => {
    const leftTotal = new Decimal(left.total);
    const rightTotal = new Decimal(right.total);
    return leftTotal.lessThan(rightTotal) ? -1 : leftTotal.greaterThan(rightTotal) ? 1 : 0;
  });
  const baseline = ranked.find((result) => result.tariffId === baselineId);
  const names = new Map(tariffs.map((tariff) => [tariff.id, tariff.name]));
  const annual = ranked[0].complete && ranked[0].months.length === 12;
  return (
    <div className="results">
      <SourceNotice source={source} />
      <Dashboard results={ranked} baseline={baseline} names={names} annual={annual} />
      <section className="panel">
        <div className="section-title">
          <div>
            <h2>Historical replay costs</h2>
            <p>Identical period, supplies and energy for every tariff.</p>
          </div>
        </div>
        <ResultsTable
          results={ranked}
          baseline={baseline}
          names={names}
          annual={annual}
          offers={offers}
        />
      </section>
      <MonthlyChart results={ranked} names={names} />
      {baseline && <DifferenceChart results={ranked} baseline={baseline} names={names} />}
      {ranked.map((result) => (
        <CostDetails
          key={result.tariffId}
          result={result}
          name={names.get(result.tariffId) ?? result.tariffId}
        />
      ))}
    </div>
  );
}

function SourceNotice({
  source,
}: {
  source?: { region: string; asOf?: string; caveats: string[] } | null;
}) {
  if (!source) {
    return null;
  }
  return (
    <div className="notice" role="note">
      <strong>Open tariff data · {source.region}</strong>
      <p>
        {source.asOf ? `Prices checked ${source.asOf.slice(0, 10)}. ` : ''}
        The lowest result is a historical replay for this usage, not a guarantee of future savings
        or a complete market ranking. Check supplier terms before switching.
      </p>
      {source.caveats.length > 0 && (
        <ul className="muted">
          {source.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Dashboard({
  results,
  baseline,
  names,
  annual,
}: {
  results: ReplayResult[];
  baseline?: ReplayResult;
  names: Map<string, string>;
  annual: boolean;
}) {
  const cheapest = results.reduce((best, result) =>
    new Decimal(result.total).lessThan(best.total) ? result : best,
  );
  const reference = baseline ?? cheapest;
  const saving = baseline ? new Decimal(baseline.total).sub(cheapest.total) : null;
  const savingPercent = baseline
    ? new Decimal(baseline.total).isZero()
      ? '0'
      : (saving?.div(new Decimal(baseline.total).abs()).times(100).toFixed(1) ?? null)
    : null;
  return (
    <>
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">YOUR REPLAY, VISUALISED</p>
          <h2>{annual ? 'Annual usage and monthly cost' : 'Usage and cost for this period'}</h2>
          <p className="muted">A month-by-month view of the same usage on each tariff.</p>
        </div>
        <span className="result-period">{reference.days} local calendar days</span>
      </section>
      <ComparisonMetrics
        baseline={baseline}
        cheapest={cheapest}
        reference={reference}
        names={names}
        saving={saving}
        savingPercent={savingPercent}
      />
      <UsageSummary result={reference} />
      <ComponentChart result={reference} name={names.get(reference.tariffId) ?? 'Lowest replay'} />
    </>
  );
}

function ComparisonMetrics({
  baseline,
  cheapest,
  reference,
  names,
  saving,
  savingPercent,
}: {
  baseline?: ReplayResult;
  cheapest: ReplayResult;
  reference: ReplayResult;
  names: Map<string, string>;
  saving: Decimal | null;
  savingPercent: string | null;
}) {
  return (
    <section className="metric-grid" aria-label="Comparison summary">
      <Metric
        label="Baseline cost"
        value={baseline ? money(baseline.total) : 'Not supplied'}
        detail={baseline ? names.get(baseline.tariffId) : 'Add your current tariff to compare'}
      />
      <Metric
        label="Lowest replay"
        value={money(cheapest.total)}
        detail={names.get(cheapest.tariffId)}
      />
      <Metric
        label="Potential difference"
        value={saving ? money(saving.toFixed(2)) : '—'}
        detail={savingPercent ? `${savingPercent}% vs baseline` : 'No baseline supplied'}
        positive={saving?.greaterThan(0) ?? false}
      />
      <Metric
        label="Energy replayed"
        value={energy(
          new Decimal(reference.energy.electricity).add(reference.energy.gas).toFixed(1),
        )}
        detail={`${energy(reference.energy.electricity)} electricity · ${energy(reference.energy.gas)} gas`}
      />
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  positive = false,
}: {
  label: string;
  value: string;
  detail?: string;
  positive?: boolean;
}) {
  return (
    <div className={positive ? 'metric-card positive' : 'metric-card'}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function UsageSummary({ result }: { result: ReplayResult }) {
  const total = new Decimal(result.energy.electricity).add(result.energy.gas);
  const electricShare = total.isZero()
    ? 0
    : Number(new Decimal(result.energy.electricity).div(total).times(100));
  return (
    <section className="panel usage-panel">
      <div>
        <h2>Usage mix</h2>
        <p className="muted">The energy behind this replay, split by fuel.</p>
      </div>
      <div className="usage-bars" aria-label="Energy usage by fuel">
        <div className="usage-bar electricity" style={{ width: `${electricShare}%` }}>
          <span>Electricity {energy(result.energy.electricity)}</span>
        </div>
        <div className="usage-bar gas" style={{ width: `${100 - electricShare}%` }}>
          <span>Gas {energy(result.energy.gas)}</span>
        </div>
      </div>
      <table className="sr-only">
        <caption>Energy usage by fuel</caption>
        <tbody>
          <tr>
            <th scope="row">Electricity</th>
            <td>{energy(result.energy.electricity)}</td>
          </tr>
          <tr>
            <th scope="row">Gas</th>
            <td>{energy(result.energy.gas)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function MonthlyChart({ results, names }: { results: ReplayResult[]; names: Map<string, string> }) {
  const months = results[0]?.months ?? [];
  const width = Math.max(680, months.length * 74);
  const max = Math.max(
    1,
    ...results.flatMap((result) => result.months.map((month) => Number(month.total))),
  );
  const x = (index: number) => 40 + (index * (width - 65)) / Math.max(1, months.length - 1);
  const y = (value: string) => 190 - (Number(value) / max) * 150;
  return (
    <section className="panel chart-panel">
      <div className="chart-heading">
        <div>
          <h2>Monthly cost trend</h2>
          <p className="muted">See when each tariff pulls ahead.</p>
        </div>
        <div className="chart-legend">
          {results.map((result, index) => (
            <span key={result.tariffId}>
              <i className={`legend-dot series-${index % 5}`} />
              {names.get(result.tariffId)}
            </span>
          ))}
        </div>
      </div>
      <div className="chart-scroll" tabIndex={0}>
        <svg
          role="img"
          aria-label="Monthly cost comparison and trend for every tariff"
          viewBox={`0 0 ${width} 250`}
        >
          <line x1="40" x2={width - 20} y1="190" y2="190" className="chart-axis" />
          {[0, 0.5, 1].map((tick) => (
            <line
              key={tick}
              x1="40"
              x2={width - 20}
              y1={190 - tick * 150}
              y2={190 - tick * 150}
              className="chart-grid"
            />
          ))}
          {results.map((result, series) => (
            <path
              key={result.tariffId}
              d={result.months
                .map((month, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(month.total)}`)
                .join(' ')}
              className={`chart-line series-${series % 5}`}
            />
          ))}
          {results.flatMap((result, series) =>
            result.months.map((month, index) => (
              <circle
                key={`${result.tariffId}-${month.month}`}
                cx={x(index)}
                cy={y(month.total)}
                r="3.5"
                className={`chart-point series-${series % 5}`}
              >
                <title>
                  {names.get(result.tariffId)} · {month.month}: {money(month.total)}
                </title>
              </circle>
            )),
          )}
          {months.map((month, index) => (
            <text key={month.month} x={x(index)} y="225">
              {month.month.slice(5)}
            </text>
          ))}
        </svg>
      </div>
      <ChartTable results={results} names={names} />
    </section>
  );
}

function ChartTable({ results, names }: { results: ReplayResult[]; names: Map<string, string> }) {
  return (
    <details className="chart-data">
      <summary>Show exact monthly values</summary>
      <div className="table-scroll" tabIndex={0}>
        <table>
          <caption>Exact monthly tariff totals</caption>
          <thead>
            <tr>
              <th>Month</th>
              {results.map((result) => (
                <th key={result.tariffId}>{names.get(result.tariffId)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results[0]?.months.map((month, index) => (
              <tr key={month.month}>
                <th scope="row">{month.month}</th>
                {results.map((result) => (
                  <td key={result.tariffId}>{money(result.months[index].total)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function DifferenceChart({
  results,
  baseline,
  names,
}: {
  results: ReplayResult[];
  baseline: ReplayResult;
  names: Map<string, string>;
}) {
  const alternatives = results.filter((result) => result.tariffId !== baseline.tariffId);
  const months = baseline.months;
  const width = Math.max(680, months.length * 74);
  const differences = alternatives.flatMap((result) =>
    result.months.map((month, index) => new Decimal(month.total).sub(baseline.months[index].total)),
  );
  const max = Math.max(1, ...differences.map((value) => Math.abs(Number(value))));
  const x = (index: number) => 40 + (index * (width - 65)) / Math.max(1, months.length - 1);
  if (!alternatives.length) {
    return null;
  }
  return (
    <section className="panel chart-panel">
      <div className="chart-heading">
        <div>
          <h2>Difference from baseline</h2>
          <p className="muted">Below zero means the alternative was cheaper that month.</p>
        </div>
        <div className="chart-legend">
          {alternatives.map((result, index) => (
            <span key={result.tariffId}>
              <i className={`legend-dot series-${(index + 1) % 5}`} />
              {names.get(result.tariffId)}
            </span>
          ))}
        </div>
      </div>
      <DifferencePlot
        alternatives={alternatives}
        baseline={baseline}
        names={names}
        width={width}
        max={max}
        x={x}
        months={months}
      />
      <DifferenceTable alternatives={alternatives} baseline={baseline} names={names} />
    </section>
  );
}

function DifferencePlot({
  alternatives,
  baseline,
  names,
  width,
  max,
  x,
  months,
}: {
  alternatives: ReplayResult[];
  baseline: ReplayResult;
  names: Map<string, string>;
  width: number;
  max: number;
  x: (index: number) => number;
  months: ReplayResult['months'];
}) {
  return (
    <div className="chart-scroll" tabIndex={0}>
      <svg role="img" aria-label="Monthly difference from baseline" viewBox={`0 0 ${width} 220`}>
        <line x1="40" x2={width - 20} y1="100" y2="100" className="chart-axis" />
        {alternatives.flatMap((result, series) =>
          result.months.map((month, index) => {
            const value = Number(new Decimal(month.total).sub(baseline.months[index].total));
            const height = (Math.abs(value) / max) * 82;
            return (
              <rect
                key={`${result.tariffId}-${month.month}`}
                x={x(index) - 12 + series * 16}
                y={value < 0 ? 100 : 100 - height}
                width="12"
                height={height}
                rx="3"
                className={`chart-series-${(series + 1) % 5}`}
              >
                <title>
                  {names.get(result.tariffId)} · {month.month}: {money(value.toFixed(2))}
                </title>
              </rect>
            );
          }),
        )}
        {months.map((month, index) => (
          <text key={month.month} x={x(index)} y="135">
            {month.month.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function DifferenceTable({
  alternatives,
  baseline,
  names,
}: {
  alternatives: ReplayResult[];
  baseline: ReplayResult;
  names: Map<string, string>;
}) {
  return (
    <details className="chart-data">
      <summary>Show exact monthly differences</summary>
      <div className="table-scroll" tabIndex={0}>
        <table>
          <caption>Monthly differences against {names.get(baseline.tariffId)}</caption>
          <thead>
            <tr>
              <th>Month</th>
              {alternatives.map((result) => (
                <th key={result.tariffId}>{names.get(result.tariffId)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {baseline.months.map((month, index) => (
              <tr key={month.month}>
                <th scope="row">{month.month}</th>
                {alternatives.map((result) => (
                  <td key={result.tariffId}>
                    {money(new Decimal(result.months[index].total).sub(month.total).toFixed(2))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ComponentChart({ result, name }: { result: ReplayResult; name: string }) {
  const items = (
    ['electricity', 'gas', 'standing', 'credits', 'evAdjustment'] as ComponentKey[]
  ).map((key) => ({ key, value: sum(result.months.map((month) => month[key])).toFixed(2) }));
  const max = Math.max(1, ...items.map((item) => Math.abs(Number(item.value))));
  return (
    <section className="panel component-panel">
      <div>
        <h2>What makes up the bill?</h2>
        <p className="muted">{name} across the replay period.</p>
      </div>
      <div className="component-chart" aria-label="Baseline cost components">
        {items.map((item) => (
          <div className="component-row" key={item.key}>
            <span>{componentLabel(item.key)}</span>
            <div className="component-track">
              <div
                className={`component-fill ${item.value.startsWith('-') ? 'negative' : ''}`}
                style={{ width: `${Math.min(100, (Math.abs(Number(item.value)) / max) * 100)}%` }}
              />
            </div>
            <strong>{money(item.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function componentLabel(key: ComponentKey) {
  return {
    electricity: 'Electricity',
    gas: 'Gas',
    standing: 'Standing charges',
    credits: 'Credits',
    evAdjustment: 'EV adjustment',
  }[key];
}

function ResultsTable({
  results,
  baseline,
  names,
  annual,
  offers,
}: {
  results: ReplayResult[];
  baseline?: ReplayResult;
  names: Map<string, string>;
  annual: boolean;
  offers: TariffTrackerOffer[];
}) {
  return (
    <div className="table-scroll" tabIndex={0}>
      <table>
        <caption>Identical period, supplies and energy for all tariffs</caption>
        <thead>
          <tr>
            <th scope="col">Tariff</th>
            <th scope="col">{annual ? 'Annual cost' : 'Period total'}</th>
            <th scope="col">Monthly equivalent</th>
            <th scope="col">{baseline ? 'Difference from baseline' : 'Offer details'}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.tariffId}>
              <th scope="row">
                {names.get(result.tariffId)}
                <small>
                  {result.tariffId === baseline?.tariffId
                    ? 'Baseline'
                    : result === results[0]
                      ? 'Lowest replay'
                      : 'Alternative'}
                </small>
              </th>
              <td className="cost">{money(result.total)}</td>
              <td>{money(result.monthlyEquivalent)}</td>
              <td>
                {baseline
                  ? money(new Decimal(result.total).sub(baseline.total).toFixed(2))
                  : formatOffer(offers.find((offer) => offer.tariffId === result.tariffId))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatOffer(offer: TariffTrackerOffer | undefined): string {
  if (!offer) {
    return 'Imported tariff';
  }
  const term = offer.termMonths ? `${offer.termMonths}-month term` : 'Term not stated';
  const exitFee = offer.exitFeeGbp ? ` · £${offer.exitFeeGbp} exit fee` : '';
  return `${offer.kind} · ${offer.payment} · ${term}${exitFee}`;
}

function CostDetails({ result, name }: { result: ReplayResult; name: string }) {
  const componentTotal = (key: ComponentKey) =>
    money(sum(result.months.map((month) => month[key])).toFixed(2));
  return (
    <details className="panel">
      <summary>{name} · monthly and component breakdown</summary>
      <dl className="totals-strip">
        {(['electricity', 'gas', 'standing', 'credits', 'evAdjustment'] as ComponentKey[]).map(
          (key) => (
            <div key={key}>
              <dt>{componentLabel(key)}</dt>
              <dd>{componentTotal(key)}</dd>
            </div>
          ),
        )}
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
    <div className="table-scroll" tabIndex={0}>
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
