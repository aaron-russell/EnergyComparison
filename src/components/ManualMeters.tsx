import { useId } from 'react';
type Meter = { fuel: 'electricity' | 'gas'; point: string; serial: string; group: string };
type Props = { value: string; change: (value: string) => void; disabled?: boolean };

function meterRows(value: string): Meter[] {
  try {
    return JSON.parse(value || '[]') as Meter[];
  } catch {
    return [];
  }
}
export function ManualMeters({ value, change, disabled }: Props) {
  const meters = meterRows(value);
  const setMeters = (next: Meter[]) => change(next.length ? JSON.stringify(next) : '');
  const update = (index: number, patch: Partial<Meter>) =>
    setMeters(meters.map((meter, current) => (current === index ? { ...meter, ...patch } : meter)));
  return (
    <div>
      <p className="muted">
        Add import meters only. Include each replacement meter; use the same meter point for
        replacements.
      </p>
      {meters.map((meter, index) => (
        <MeterRow
          key={index}
          meter={meter}
          index={index}
          disabled={disabled}
          update={(patch) => update(index, patch)}
          remove={() => setMeters(meters.filter((_, current) => current !== index))}
        />
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          setMeters([...meters, { fuel: 'electricity', point: '', serial: '', group: 'home' }])
        }
      >
        Add import meter
      </button>
    </div>
  );
}
function MeterRow({
  meter,
  index,
  update,
  remove,
  disabled,
}: {
  meter: Meter;
  index: number;
  update: (patch: Partial<Meter>) => void;
  remove: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <fieldset disabled={disabled}>
      <legend>Import meter {index + 1}</legend>
      <div className="form-row">
        <label className="field">
          Fuel
          <select
            value={meter.fuel}
            onChange={(event) => update({ fuel: event.target.value as Meter['fuel'] })}
          >
            <option value="electricity">Electricity</option>
            <option value="gas">Gas</option>
          </select>
        </label>
        <label className="field" htmlFor={`${id}-point`}>
          Meter point (MPAN / MPRN)
          <input
            id={`${id}-point`}
            required
            autoComplete="off"
            value={meter.point}
            onChange={(event) => update({ point: event.target.value })}
          />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          Meter serial
          <input
            required
            autoComplete="off"
            value={meter.serial}
            onChange={(event) => update({ serial: event.target.value })}
          />
        </label>
        <label className="field">
          Property group
          <input
            autoComplete="off"
            value={meter.group}
            onChange={(event) => update({ group: event.target.value })}
          />
        </label>
      </div>
      <button type="button" onClick={remove}>
        Remove meter
      </button>
    </fieldset>
  );
}
