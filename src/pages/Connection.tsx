import { Selection } from '../components/Selection';
import { useState } from 'react';
import { Cable, FlaskConical } from 'lucide-react';
import { energyProviders } from '../adapters/registries';
import type { EnergyConnection, Fields } from '../adapters/contracts';
import { useOperation } from '../state/use-operation';
import { FieldsForm } from '../components/Fields';
import {
  ErrorNotice,
  NextButton,
  OperationStatus,
  PageHeading,
  PrivacyNote,
} from '../components/Shared';

type Props = {
  connection: EnergyConnection | null;
  connected: (connection: EnergyConnection) => void;
  next: () => void;
};
export function ConnectionPage({ connection, connected, next }: Props) {
  const [providerId, setProviderId] = useState(connection?.providerId ?? energyProviders[0].id);
  const [values, setValues] = useState<Fields>({});
  const operation = useOperation();
  const provider = energyProviders.find((item) => item.id === providerId)!;
  const connect = () =>
    operation.run(async (context) => {
      const result = await provider.connect(values, context);
      if (context.signal.aborted) {
        result.disconnect();
        return;
      }
      setValues({});
      connected(result);
    });
  return (
    <>
      <PageHeading eyebrow="01 / CONNECT" title="Your usage. A clearer comparison.">
        Replay your actual energy use against tariffs you choose. No sales calls, no supplier
        rankings, no guesswork hidden in the numbers.
      </PageHeading>
      <div className="two-columns">
        <section className="panel">
          <div className="section-title">
            <Cable size={23} />
            <div>
              <h2>Connect your energy</h2>
              <p>Choose where your meter history comes from.</p>
            </div>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void connect();
            }}
          >
            <Selection
              label="Energy provider"
              value={providerId}
              disabled={operation.busy || !!connection}
              options={energyProviders.map((provider) => ({
                value: provider.id,
                label: provider.name,
              }))}
              change={(value) => {
                setProviderId(value);
                setValues({});
              }}
            />
            <p className="muted">{provider.description}</p>
            <FieldsForm
              fields={provider.fields}
              values={values}
              change={setValues}
              disabled={operation.busy || !!connection}
            />
            <ErrorNotice message={operation.error} />
            {!connection && (
              <button className="primary" disabled={operation.busy} type="submit">
                Connect provider <Cable size={16} />
              </button>
            )}
          </form>
          <OperationStatus {...operation} />
          {connection && (
            <div className="notice success">
              Connected · {connection.supplies.length} import supplies discovered
            </div>
          )}
          {connection && <NextButton onClick={next}>Choose import period</NextButton>}
        </section>
        <ConnectionExplainer history={provider.capabilities.history} />
      </div>
      <PrivacyNote />
    </>
  );
}

function ConnectionExplainer({ history }: { history: string }) {
  return (
    <aside className="panel accent-panel" aria-label="About historical replay">
      <div className="icon-tile">
        <FlaskConical />
      </div>
      <h2>A replay, not a prediction.</h2>
      <p>
        See what the same historical usage would have cost on different rates. Future prices and
        habits can change.
      </p>
      <ol className="explain-list">
        <li>Bring in your meter readings</li>
        <li>Review gaps and optional EV charging</li>
        <li>Enter your current tariff and alternatives</li>
        <li>Compare the same energy, over the same dates</li>
      </ol>
      <div className="divider" />
      <small>{history}</small>
      <p className="muted">
        Just exploring? Select “Synthetic example” to use generated data without an account.
      </p>
    </aside>
  );
}
