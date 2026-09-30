import { useState } from 'react';
import { Download, CalendarDays } from 'lucide-react';
import type { EnergyConnection } from '../adapters/contracts';
import { IntegrationError } from '../adapters/contracts';
import { normaliseReadings } from '../core/readings';
import { dates, localDate, midnight } from '../core/time';
import type { Reading } from '../core/types';
import type { SessionProps } from '../state/session';
import { useOperation } from '../state/use-operation';
import { ErrorNotice, NextButton, OperationStatus, PageHeading } from '../components/Shared';

type Props = SessionProps & { connection: EnergyConnection | null };
export function ImportPage({ data, update, next, connection }: Props) {
  const [start, setStart] = useState(localDate(data.period.start));
  const [end, setEnd] = useState(localDate(data.period.end));
  const [selected, setSelected] = useState(data.supplies.map((supply) => supply.ref));
  const [failures, setFailures] = useState<string[]>([]);
  const operation = useOperation();
  const importHistory = () =>
    operation.run(async (context) => {
      if (!connection) {
        throw new IntegrationError('invalid', 'Connect an energy provider first.');
      }
      const period = { start: midnight(start), end: midnight(end) };
      dates(period);
      const samePeriod = period.start === data.period.start && period.end === data.period.end;
      const rows: Reading[] = samePeriod ? [...data.readings] : [];
      update({ readings: rows, charging: [], estimated: null, conflicts: 0, period });
      try {
        const result = await connection.import(period, context, (batch) => rows.push(...batch));
        setFailures(result.failures);
      } finally {
        const supplies = connection.supplies.filter((supply) => selected.includes(supply.ref));
        const result = normaliseReadings(
          rows.filter((reading) => selected.includes(reading.supplyRef)),
        );
        update({ period, supplies, readings: result.readings, conflicts: result.conflicts.length });
      }
    });
  return (
    <>
      <PageHeading eyebrow="02 / IMPORT" title="Bring your history into focus.">
        The default is the previous 12 complete London calendar months. Replacement meters are
        included; identical records are deduplicated.
      </PageHeading>
      <section className="panel">
        <div className="section-title">
          <CalendarDays />
          <h2>Your replay period</h2>
        </div>
        <ImportOptions
          start={start}
          end={end}
          setStart={setStart}
          setEnd={setEnd}
          selected={selected}
          setSelected={setSelected}
          supplies={connection?.supplies ?? []}
          busy={operation.busy}
        />
        <ErrorNotice message={operation.error} />
        <button
          className="primary"
          disabled={operation.busy || !connection || !selected.length}
          onClick={() => void importHistory()}
        >
          <Download size={17} />
          Import history / retry
        </button>
        <OperationStatus {...operation} />
        <ImportOutcome
          count={data.readings.length}
          conflicts={data.conflicts}
          failures={failures}
        />
        <NextButton
          onClick={next}
          disabled={operation.busy || !data.readings.length || !!data.conflicts}
        >
          Review coverage
        </NextButton>
      </section>
    </>
  );
}

function ImportOutcome({
  count,
  conflicts,
  failures,
}: {
  count: number;
  conflicts: number;
  failures: string[];
}) {
  return (
    <div>
      <p>{count.toLocaleString()} half-hour readings retained.</p>
      {failures.map((failure, index) => (
        <ErrorNotice key={index} message={failure} />
      ))}
      <ErrorNotice
        message={
          conflicts
            ? `${conflicts} conflicting overlaps found. Correct the manual meter list or upstream data and retry; comparisons are blocked.`
            : ''
        }
      />
      {failures.length > 0 && (
        <p className="muted">
          Completed pages are retained. Retry imports the full period and deduplicates; review
          coverage before comparing partial data.
        </p>
      )}
    </div>
  );
}

function ImportOptions({
  start,
  end,
  setStart,
  setEnd,
  selected,
  setSelected,
  supplies,
  busy,
}: {
  start: string;
  end: string;
  setStart: (value: string) => void;
  setEnd: (value: string) => void;
  selected: string[];
  setSelected: (value: string[]) => void;
  supplies: import('../core/types').Supply[];
  busy: boolean;
}) {
  return (
    <>
      <div className="form-row">
        <label className="field">
          Start date (included)
          <input
            type="date"
            value={start}
            disabled={busy}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label className="field">
          End date (excluded)
          <input
            type="date"
            value={end}
            disabled={busy}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
      </div>
      <p className="muted">
        {start} at 00:00 through {end} at 00:00, Europe/London. Standing charges include every day
        in this period.
      </p>
      <fieldset disabled={busy}>
        <legend>Import supplies</legend>
        {supplies.map((supply) => (
          <label className="check" key={supply.ref}>
            <input
              type="checkbox"
              checked={selected.includes(supply.ref)}
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? [...selected, supply.ref]
                    : selected.filter((ref) => ref !== supply.ref),
                )
              }
            />
            {supply.label}
          </label>
        ))}
      </fieldset>
    </>
  );
}
