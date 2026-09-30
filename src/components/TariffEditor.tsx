import { useState } from 'react';
import type { Tariff } from '../core/types';
import { manualSource } from '../core/tariff';
import { ErrorNotice } from './Shared';
import { EVRate, FuelRates, PriceInput } from './TariffRates';

export function TariffEditor({
  initial,
  apply,
  cancel,
}: {
  initial: Tariff;
  apply: (tariff: Tariff) => void;
  cancel: () => void;
}) {
  const [tariff, setTariff] = useState(initial);
  const [error, setError] = useState('');
  const submit = () => {
    try {
      apply(manualSource.read(tariff)[0]);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Review tariff fields.');
    }
  };
  return (
    <section className="panel">
      <h2>Edit tariff</h2>
      <p>
        All prices include VAT. Enter decimal pence, not pounds. Negative unit prices are supported.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <TariffIdentity tariff={tariff} change={setTariff} />
        <FuelRates tariff={tariff} change={setTariff} />
        <PriceInput
          label="Fixed annual credit (pence/year)"
          value={tariff.annualCredit}
          change={(annualCredit) => setTariff({ ...tariff, annualCredit })}
        />
        <EVRate tariff={tariff} change={setTariff} />
        <ErrorNotice message={error} />
        <div className="actions">
          <button className="primary" type="submit">
            Apply tariff
          </button>
          <button type="button" onClick={cancel}>
            Cancel edit
          </button>
        </div>
      </form>
    </section>
  );
}
function TariffIdentity({ tariff, change }: { tariff: Tariff; change: (tariff: Tariff) => void }) {
  return (
    <div className="form-row">
      <label className="field">
        Tariff name
        <input
          required
          maxLength={100}
          value={tariff.name}
          onChange={(event) => change({ ...tariff, name: event.target.value })}
        />
      </label>
      <label className="field">
        Renewable status
        <select
          value={tariff.renewable}
          onChange={(event) =>
            change({ ...tariff, renewable: event.target.value as Tariff['renewable'] })
          }
        >
          <option value="unknown">Unknown / not verified</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>
    </div>
  );
}
