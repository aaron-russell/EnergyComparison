import { useState } from 'react';
import { chargingProviders } from '../adapters/registries';
import type { ChargingPreview } from '../adapters/contracts';
import { allocateEV } from '../core/ev';
import { detectSpikes } from '../core/spikes';
import type { SessionProps } from '../state/session';
import { ApiChargingForm, FileChargingForm } from '../components/ChargingForms';
import { ChargingReview } from '../components/ChargingReview';
import { ErrorNotice, NextButton, PageHeading } from '../components/Shared';

export function ChargingPage({ data, update, next }: SessionProps) {
  const [providerId, setProviderId] = useState(chargingProviders[0].id);
  const [supplyRef, setSupplyRef] = useState(
    data.supplies.find((supply) => supply.fuel === 'electricity')?.ref ?? '',
  );
  const [power, setPower] = useState('7');
  const [preview, setPreview] = useState<ChargingPreview | null>(null);
  const [error, setError] = useState('');
  const provider = chargingProviders.find((item) => item.id === providerId)!;
  const receive = (result: ChargingPreview) => {
    setPreview(result);
    update({ charging: [...data.charging, ...result.sessions] });
  };
  const detect = () => {
    try {
      update({ charging: [...data.charging, ...detectSpikes(data.readings, power)] });
      setError('');
    } catch {
      setError('Enter a valid charger power.');
    }
  };
  const continueWithEV = () => {
    try {
      allocateEV(data.charging, data.estimated?.readings ?? data.readings);
      setError('');
      next();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Review charging sessions.');
    }
  };
  const formProps = { provider, supplyRef, period: data.period, preview: receive };
  return (
    <>
      <PageHeading
        eyebrow="04 / EV CHARGING · OPTIONAL"
        title="Give your charging its own context."
      >
        Any energy supplier can be paired with any charging source. Household imports already
        include charging; energy is never added twice.
      </PageHeading>
      <section className="panel">
        <h2>Charging source</h2>
        <label className="field">
          Electricity supply
          <select value={supplyRef} onChange={(event) => setSupplyRef(event.target.value)}>
            {data.supplies
              .filter((supply) => supply.fuel === 'electricity')
              .map((supply) => (
                <option key={supply.ref} value={supply.ref}>
                  {supply.label}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          Charging integration
          <select value={providerId} onChange={(event) => setProviderId(event.target.value)}>
            {chargingProviders.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">{provider.description}</p>
        {supplyRef &&
          (provider.method === 'file' ? (
            <FileChargingForm key={provider.id} {...formProps} />
          ) : (
            <ApiChargingForm key={provider.id} {...formProps} />
          ))}
        {preview && <MappingPreview preview={preview} />}
      </section>
      <section className="panel">
        <h2>Or review suggested charging</h2>
        <p>
          A separate estimate finds excess demand above 60% of charger power for at least one hour.
          Other appliances can create false positives.
        </p>
        <label className="field">
          Charger power (kW)
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={power}
            onChange={(event) => setPower(event.target.value)}
          />
        </label>
        <button onClick={detect}>Suggest sessions from usage</button>
      </section>
      {!!data.charging.length && (
        <section className="panel">
          <h2>Review {data.charging.length} sessions</h2>
          <ChargingReview sessions={data.charging} change={(charging) => update({ charging })} />
        </section>
      )}
      <ErrorNotice message={error} />
      <NextButton onClick={continueWithEV}>Continue to tariffs</NextButton>
    </>
  );
}

function MappingPreview({ preview }: { preview: ChargingPreview }) {
  return (
    <div className="notice">
      <div>
        <h3>Import mapping</h3>
        <dl>
          {preview.mapping.map((item) => (
            <div key={item.column}>
              <dt>{item.column}</dt>
              <dd>{item.meaning}</dd>
            </div>
          ))}
        </dl>
        {preview.notices.map((notice) => (
          <p key={notice}>{notice}</p>
        ))}
      </div>
    </div>
  );
}
