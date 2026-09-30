import { useEffect, useRef, useState } from 'react';
import type { Context } from '../adapters/contracts';
import { safeError } from '../adapters/contracts';

export function useOperation() {
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => () => active.current?.abort(), []);
  const cancel = () => active.current?.abort();
  const run = async (task: (context: Context) => Promise<void>) => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError('');
    setMessage('Preparing…');
    try {
      await task({
        signal: controller.signal,
        progress: (progress) => setMessage(progress.message),
      });
      setMessage('Complete');
    } catch (failure) {
      setError(safeError(failure));
    } finally {
      setBusy(false);
    }
  };
  return { run, cancel, busy, message, error };
}
