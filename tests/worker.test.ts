import { describe, expect, it, vi } from 'vitest';
import { exampleTariffs, syntheticSupplies } from '../src/fixtures/synthetic';
import type { Job } from '../src/core/jobs';

describe('calculation worker dispatch', () => {
  it('posts replay results and serialises calculation errors', async () => {
    const postMessage = vi.fn();
    const scope: {
      onmessage?: (event: MessageEvent<Job>) => void;
      postMessage: typeof postMessage;
    } = {
      postMessage,
    };
    vi.stubGlobal('self', scope);
    await import('../src/core/worker');
    const period = { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' };
    scope.onmessage!({
      data: {
        kind: 'replay',
        readings: [],
        supplies: [syntheticSupplies[0]],
        period,
        charging: [],
        tariffs: [exampleTariffs[0]],
      },
    } as unknown as MessageEvent<Job>);
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: 'replay' }));
    scope.onmessage!({
      data: {
        kind: 'replay',
        readings: [],
        supplies: [syntheticSupplies[0]],
        period,
        charging: [],
        tariffs: [{ ...exampleTariffs[0], electricity: undefined, gas: undefined }],
      },
    } as unknown as MessageEvent<Job>);
    expect(postMessage).toHaveBeenLastCalledWith({ error: expect.any(String) });
    vi.unstubAllGlobals();
  });
});
