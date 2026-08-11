/// <reference lib="webworker" />
import { runTests } from './harness';

/**
 * Runs the candidate's code off the main thread. The page owns the timeout:
 * if a submission loops forever, the page terminates this worker and spawns a
 * fresh one — which is why the worker itself needs no watchdog.
 */
self.onmessage = async (event: MessageEvent) => {
  const { code, symbol, spec } = event.data;
  try {
    const result = await runTests(code, symbol, spec);
    (self as any).postMessage({ ok: true, result });
  } catch (err: any) {
    (self as any).postMessage({ ok: false, error: err?.message ?? String(err) });
  }
};
