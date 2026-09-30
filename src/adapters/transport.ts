import { object, list, str, readResponse } from './response';
export { object, list, str } from './response';
import { IntegrationError } from './contracts';
export const cancelled = (signal: AbortSignal) => {
  if (signal.aborted) {
    throw new IntegrationError(
      'cancelled',
      'Import cancelled. Completed pages are retained for review.',
    );
  }
};
function transportError(error: unknown): IntegrationError {
  if (error instanceof IntegrationError) {
    return error;
  }
  return new IntegrationError(
    'network',
    'Unable to reach the provider. Check your connection or browser API access.',
    true,
  );
}

export async function request(
  url: string,
  init: RequestInit,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  for (let attempt = 0; attempt < 3; attempt++) {
    cancelled(signal);
    try {
      const response = await fetcher(url, {
        ...init,
        signal,
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      });
      return await readResponse(response);
    } catch (error) {
      cancelled(signal);
      const failure = transportError(error);
      if (!failure.retryable || attempt === 2) {
        throw failure;
      }
      await delay(250 * 2 ** attempt, signal);
    }
  }
  throw new IntegrationError('network', 'Provider unavailable.', true);
}
function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      reject(new IntegrationError('cancelled', 'Import cancelled.'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) {
      cancel();
    }
  });
}
export async function* pages(
  url: string,
  init: RequestInit,
  signal: AbortSignal,
  fetcher?: typeof fetch,
): AsyncGenerator<unknown[]> {
  const base = new URL(url);
  let next: string | null = url;
  const seen = new Set<string>();
  while (next) {
    cancelled(signal);
    const u = new URL(next, base);
    if (
      u.origin !== base.origin ||
      u.pathname !== base.pathname ||
      seen.has(u.href) ||
      seen.size >= 1000
    ) {
      throw new IntegrationError('invalid', 'Provider pagination was invalid.');
    }
    seen.add(u.href);
    const data = object(await request(u.href, init, signal, fetcher));
    yield list(data.results);
    next = data.next === null ? null : str(data.next);
  }
}
