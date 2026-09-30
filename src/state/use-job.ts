import { useEffect, useRef, useState } from 'react';
import type { Job, JobResult } from '../core/jobs';

export function useJob() {
  const worker = useRef<Worker | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => worker.current?.terminate(), []);
  const cancel = () => {
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
  };
  const run = (job: Job, complete: (result: JobResult) => void) => {
    cancel();
    setError('');
    setBusy(true);
    worker.current = new Worker(new URL('../core/worker.ts', import.meta.url), { type: 'module' });
    worker.current.onmessage = (event: MessageEvent<JobResult | { error: string }>) => {
      cancel();
      if ('error' in event.data) {
        setError(event.data.error);
      } else {
        complete(event.data);
      }
    };
    worker.current.onerror = () => {
      cancel();
      setError('Calculation failed. Try a smaller period.');
    };
    worker.current.postMessage(job);
  };
  return { run, cancel, busy, error };
}
