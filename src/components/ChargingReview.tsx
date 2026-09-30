import type { Charging } from '../core/types';

type Props = { sessions: Charging[]; change: (sessions: Charging[]) => void };
export function ChargingReview({ sessions, change }: Props) {
  const sources = [...new Set(sessions.map((session) => session.source))];
  const authoritative = (source: string) =>
    change(sessions.map((session) => ({ ...session, approved: session.source === source })));
  const update = (index: number, patch: Partial<Charging>) =>
    change(
      sessions.map((session, current) => (current === index ? { ...session, ...patch } : session)),
    );
  return (
    <div>
      <p>
        Review timing, energy and provenance. Approve only grid energy already included in your
        household imports. Session timing and spike detections are estimates. Solar or battery
        systems need particular care.
      </p>
      <label className="field">
        Select authoritative source (optional)
        <select defaultValue="" onChange={(event) => authoritative(event.target.value)}>
          <option value="">Review sessions individually</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </label>
      <div className="session-list">
        {sessions.map((session, index) => (
          <SessionEditor
            key={session.id}
            session={session}
            change={(patch) => update(index, patch)}
            remove={() => change(sessions.filter((_, current) => current !== index))}
          />
        ))}
      </div>
    </div>
  );
}

function SessionEditor({
  session,
  change,
  remove,
}: {
  session: Charging;
  change: (patch: Partial<Charging>) => void;
  remove: () => void;
}) {
  return (
    <fieldset className="session-editor">
      <legend>
        {session.source} · {session.status === 'estimated' ? 'Estimated energy' : 'Reported energy'}{' '}
        · {session.kind === 'session' ? 'Estimated timing' : 'Half-hour reading'}
      </legend>
      <div className="form-row">
        <label className="field">
          Start (UTC / explicit offset)
          <input
            value={session.start}
            onChange={(event) => change({ start: event.target.value })}
          />
        </label>
        <label className="field">
          End (UTC / explicit offset)
          <input value={session.end} onChange={(event) => change({ end: event.target.value })} />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          Energy kWh
          <input
            type="number"
            min="0"
            step="any"
            value={session.kWh}
            onChange={(event) => change({ kWh: event.target.value })}
          />
        </label>
        <label className="field">
          Confirmed provenance
          <select
            value={session.provenance}
            onChange={(event) =>
              change({ provenance: event.target.value as Charging['provenance'] })
            }
          >
            {['unknown', 'grid', 'solar', 'mixed'].map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="actions">
        <label className="check">
          <input
            type="checkbox"
            checked={session.approved}
            onChange={(event) => change({ approved: event.target.checked })}
          />
          Approve for replay
        </label>
        <button onClick={remove}>Reject session</button>
      </div>
    </fieldset>
  );
}
