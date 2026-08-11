import type { HarnessResult } from './harness';

const TIMEOUT_MS = 8000;

/**
 * Execute a submission in a throwaway worker with a hard wall-clock limit.
 * An infinite loop cannot be interrupted from inside, so the only reliable
 * escape is terminating the worker from here.
 */
export function runInWorker(code: string, symbol: string, spec: any): Promise<HarnessResult> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' });

    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        passed: false,
        passedCount: 0,
        totalCount: spec?.cases?.length ?? 0,
        compileError: `Timed out after ${TIMEOUT_MS / 1000}s — most likely an infinite loop, or a pointer that never advances.`,
        results: [],
      });
    }, TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent) => {
      clearTimeout(timer);
      worker.terminate();
      if (event.data.ok) resolve(event.data.result);
      else
        resolve({
          passed: false,
          passedCount: 0,
          totalCount: spec?.cases?.length ?? 0,
          compileError: event.data.error,
          results: [],
        });
    };

    worker.onerror = (event) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({
        passed: false,
        passedCount: 0,
        totalCount: spec?.cases?.length ?? 0,
        compileError: event.message || 'Worker crashed',
        results: [],
      });
    };

    worker.postMessage({ code, symbol, spec });
  });
}
