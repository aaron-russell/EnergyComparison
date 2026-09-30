import { estimate } from './estimate';
import { replay } from './engine';
import type { Job, JobResult } from './jobs';

self.onmessage = (event: MessageEvent<Job>) => {
  try {
    const job = event.data;
    const output: JobResult =
      job.kind === 'estimate'
        ? {
            kind: 'estimate',
            result: estimate(job.observed, job.supplies, job.period, job.bills, job.uniform),
          }
        : {
            kind: 'replay',
            results: job.tariffs.map((tariff) =>
              replay(tariff, job.readings, job.supplies, job.period, job.charging),
            ),
          };
    self.postMessage(output);
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'Calculation could not be completed.',
    });
  }
};
