import { useEffect, useRef, useState } from 'react';
import type {
  ChargingConnection,
  ChargingPreview,
  ChargingProviderAdapter,
  Fields,
} from '../adapters/contracts';
import type { Period } from '../core/types';
import { useOperation } from '../state/use-operation';
import { FieldsForm } from './Fields';
import { ErrorNotice, OperationStatus } from './Shared';

type Props = {
  provider: ChargingProviderAdapter;
  supplyRef: string;
  period: Period;
  preview: (result: ChargingPreview) => void;
};
export function FileChargingForm({ provider, supplyRef, preview }: Props) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const operation = useOperation();
  const parse = () =>
    operation.run(async (context) => {
      const result = await provider.parse!(text, { supplyRef, windowStart, windowEnd }, context);
      preview(result);
      setText('');
      setFileName('');
      if (fileInput.current) {
        fileInput.current.value = '';
      }
    });
  return (
    <div className="fields">
      <label className="field">
        Charging file
        <input
          ref={fileInput}
          type="file"
          accept={provider.capabilities.files.map((format) => `.${format}`).join(',')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setFileName(file.name);
              void file.text().then(setText);
            }
          }}
        />
      </label>
      {fileName && <p className="muted">Selected file: {fileName}</p>}
      <p className="muted">
        Recognised formats: {provider.capabilities.files.join(', ')}. Files remain in memory. Large
        or invalid files are rejected.
      </p>
      <div className="form-row">
        <label className="field">
          Date-only window start
          <input
            type="time"
            value={windowStart}
            onChange={(event) => setWindowStart(event.target.value)}
          />
        </label>
        <label className="field">
          Date-only window end
          <input
            type="time"
            value={windowEnd}
            onChange={(event) => setWindowEnd(event.target.value)}
          />
        </label>
      </div>
      <button disabled={!text || operation.busy} onClick={() => void parse()}>
        Preview mapping and sessions
      </button>
      <ErrorNotice message={operation.error} />
      <OperationStatus {...operation} />
    </div>
  );
}

export function ApiChargingForm({ provider, supplyRef, period, preview }: Props) {
  const [values, setValues] = useState<Fields>({});
  const connection = useRef<ChargingConnection | null>(null);
  const [devices, setDevices] = useState<ChargingConnection['devices']>([]);
  const [device, setDevice] = useState('');
  const operation = useOperation();
  useEffect(() => () => connection.current?.disconnect(), []);
  const connect = () =>
    operation.run(async (context) => {
      const result = await provider.connect!(values, context);
      if (context.signal.aborted) {
        result.disconnect();
        return;
      }
      connection.current = result;
      setValues({});
      setDevices(result.devices);
      setDevice(result.devices[0]?.ref ?? '');
    });
  const fetchHistory = () =>
    operation.run(async (context) => {
      const result = await connection.current!.history(device, period, { supplyRef }, context);
      preview(result);
    });
  return (
    <div>
      <FieldsForm
        fields={provider.fields}
        values={values}
        change={setValues}
        disabled={operation.busy || !!devices.length}
      />
      {!devices.length && (
        <button disabled={operation.busy} onClick={() => void connect()}>
          Connect charging provider
        </button>
      )}
      {!!devices.length && (
        <>
          <label className="field">
            Device
            <select value={device} onChange={(event) => setDevice(event.target.value)}>
              {devices.map((item) => (
                <option key={item.ref} value={item.ref}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button disabled={operation.busy} onClick={() => void fetchHistory()}>
            Fetch charging history
          </button>
        </>
      )}
      <ErrorNotice message={operation.error} />
      <OperationStatus {...operation} />
    </div>
  );
}
