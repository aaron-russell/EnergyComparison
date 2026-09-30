import type { Band, Tariff } from '../core/types';
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const defaultBand = (): Band => ({
  name: 'All day',
  days: [1, 2, 3, 4, 5, 6, 7],
  start: '00:00',
  end: '00:00',
  rate: '0',
});
type Props = { tariff: Tariff; change: (tariff: Tariff) => void };
export function FuelRates({ tariff, change }: Props) {
  return (
    <>
      <label className="check">
        <input
          type="checkbox"
          checked={!!tariff.electricity}
          onChange={(event) =>
            change({
              ...tariff,
              electricity: event.target.checked
                ? { standing: '0', bands: [defaultBand()] }
                : undefined,
            })
          }
        />
        Electricity prices
      </label>
      {tariff.electricity && <ElectricityRates tariff={tariff} change={change} />}
      <label className="check">
        <input
          type="checkbox"
          checked={!!tariff.gas}
          onChange={(event) =>
            change({
              ...tariff,
              gas: event.target.checked ? { standing: '0', rate: '0' } : undefined,
            })
          }
        />
        Gas prices
      </label>
      {tariff.gas && (
        <div className="form-row">
          <PriceInput
            label="Gas unit rate (p/kWh)"
            value={tariff.gas.rate}
            change={(rate) => change({ ...tariff, gas: { ...tariff.gas!, rate } })}
          />
          <PriceInput
            label="Gas standing charge (p/day)"
            value={tariff.gas.standing}
            change={(standing) => change({ ...tariff, gas: { ...tariff.gas!, standing } })}
          />
        </div>
      )}
    </>
  );
}
export function PriceInput({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
}) {
  return (
    <label className="field">
      {label}
      <input
        type="number"
        step="any"
        required
        value={value}
        onChange={(event) => change(event.target.value)}
      />
    </label>
  );
}
function ElectricityRates({ tariff, change }: Props) {
  const electricity = tariff.electricity!;
  const setBands = (bands: Band[]) => change({ ...tariff, electricity: { ...electricity, bands } });
  return (
    <div>
      <PriceInput
        label="Electricity standing charge (p/day)"
        value={electricity.standing}
        change={(standing) => change({ ...tariff, electricity: { ...electricity, standing } })}
      />
      {electricity.bands.map((band, index) => (
        <BandEditor
          key={index}
          band={band}
          change={(value) =>
            setBands(electricity.bands.map((item, current) => (current === index ? value : item)))
          }
          remove={() => setBands(electricity.bands.filter((_, current) => current !== index))}
        />
      ))}
      <button
        type="button"
        onClick={() =>
          setBands([
            ...electricity.bands,
            { ...defaultBand(), name: `Band ${electricity.bands.length + 1}` },
          ])
        }
      >
        Add time band
      </button>
      <p className="muted">
        Times are Europe/London. The end is excluded. Equal start/end means 24 hours. Overnight
        weekdays refer to the starting day. Every weekly half-hour must have exactly one rate.
      </p>
    </div>
  );
}
function BandEditor({
  band,
  change,
  remove,
}: {
  band: Band;
  change: (band: Band) => void;
  remove: () => void;
}) {
  return (
    <fieldset className="band-editor">
      <legend>Electricity band</legend>
      <div className="form-row">
        <label className="field">
          Band name
          <input
            required
            value={band.name}
            onChange={(event) => change({ ...band, name: event.target.value })}
          />
        </label>
        <PriceInput
          label="Unit rate (p/kWh)"
          value={band.rate}
          change={(rate) => change({ ...band, rate })}
        />
      </div>
      <div className="form-row">
        <label className="field">
          Start
          <input
            type="time"
            step="1800"
            required
            value={band.start}
            onChange={(event) => change({ ...band, start: event.target.value })}
          />
        </label>
        <label className="field">
          End
          <input
            type="time"
            step="1800"
            required
            value={band.end}
            onChange={(event) => change({ ...band, end: event.target.value })}
          />
        </label>
      </div>
      <div className="weekdays">
        {weekdays.map((day, index) => (
          <label className="check" key={day}>
            <input
              type="checkbox"
              checked={band.days.includes(index + 1)}
              onChange={(event) =>
                change({
                  ...band,
                  days: event.target.checked
                    ? [...band.days, index + 1]
                    : band.days.filter((value) => value !== index + 1),
                })
              }
            />
            {day}
          </label>
        ))}
      </div>
      <button type="button" onClick={remove}>
        Remove band
      </button>
    </fieldset>
  );
}
export function EVRate({ tariff, change }: Props) {
  return (
    <div>
      <label className="check">
        <input
          type="checkbox"
          checked={!!tariff.ev}
          onChange={(event) =>
            change({
              ...tariff,
              ev: event.target.checked ? { mode: 'override', rate: '0' } : undefined,
            })
          }
        />
        EV-only grid rate adjustment
      </label>
      {tariff.ev && (
        <div className="form-row">
          <label className="field">
            Adjustment
            <select
              value={tariff.ev.mode}
              onChange={(event) =>
                change({
                  ...tariff,
                  ev: { ...tariff.ev!, mode: event.target.value as 'override' | 'discount' },
                })
              }
            >
              <option value="override">Replace unit rate for eligible EV kWh</option>
              <option value="discount">Discount per eligible EV kWh</option>
            </select>
          </label>
          <PriceInput
            label="EV rate / discount (p/kWh)"
            value={tariff.ev.rate}
            change={(rate) => change({ ...tariff, ev: { ...tariff.ev!, rate } })}
          />
        </div>
      )}
    </div>
  );
}
