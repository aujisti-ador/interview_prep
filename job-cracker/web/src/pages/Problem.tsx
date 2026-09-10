import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { api, Problem } from '../lib/api';
import { runInWorker } from '../lib/run';
import type { HarnessResult } from '../lib/harness';
import { Announce, Chip, difficultyTone, Doc, ErrorBox, Loading } from '../components/ui';

const WARN_AT = 18 * 60;
const OVER_AT = 25 * 60;

function Timer({ seconds }: { seconds: number }) {
  const over = seconds >= OVER_AT;
  const warn = seconds >= WARN_AT;
  return (
    <>
      <span className={`font-mono text-sm ${over ? 'text-bad' : warn ? 'text-warn' : 'text-ink-400'}`}>
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </span>
      {/*
       * Colour is the only cue that the clock has gone past budget, so announce
       * the two thresholds. Only the crossing is announced — a live region on
       * every tick would be unusable.
       */}
      <Announce>
        {over ? 'Past the 25 minute budget.' : warn ? '18 minutes elapsed.' : ''}
      </Announce>
    </>
  );
}

function ResultPanel({ result }: { result: HarnessResult }) {
  if (result.compileError) {
    return (
      <div className="rounded-lg border border-bad/40 bg-bad/10 p-4" role="alert">
        <div className="mb-1 text-sm font-medium text-bad">Did not run</div>
        <pre className="whitespace-pre-wrap font-mono text-xs text-ink-300">{result.compileError}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="status"
        aria-live="polite"
        className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${
          result.passed ? 'border-good/40 bg-good/10 text-good' : 'border-bad/40 bg-bad/10 text-bad'
        }`}
      >
        {result.passedCount}/{result.totalCount} test cases passing
        {result.passed && ' — all green'}
      </div>

      {result.results.map((r) => (
        <div
          key={r.index}
          className={`rounded-lg border px-4 py-3 ${
            r.ok ? 'border-ink-800 bg-ink-900/50' : 'border-bad/30 bg-bad/[0.06]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={r.ok ? 'text-good' : 'text-bad'}>{r.ok ? '✓' : '✗'}</span>
            <span className="text-xs text-ink-300">
              Case {r.index + 1}
              {r.note ? ` — ${r.note}` : ''}
            </span>
            <span className="ml-auto text-[11px] text-ink-500">{r.durationMs}ms</span>
          </div>
          {!r.ok && (
            <dl className="mt-2 space-y-1 font-mono text-[11px]">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-ink-500">input</dt>
                <dd className="min-w-0 break-all text-ink-300">{r.input}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-ink-500">expected</dt>
                <dd className="min-w-0 break-all text-good">{r.expected}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-ink-500">got</dt>
                <dd className="min-w-0 break-all text-bad">{r.actual}</dd>
              </div>
            </dl>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['problem', id],
    queryFn: () => api.get<Problem>(`/problems/${id}`),
  });

  const [code, setCode] = useState('');
  const [result, setResult] = useState<HarnessResult | null>(null);
  const [running, setRunning] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!data) return;
    setCode(data.status?.savedCode || data.starterCode);
    setResult(null);
    setHintsShown(0);
    setSolutionShown(false);
    startRef.current = Date.now();
    setSeconds(0);
  }, [data?.id]);

  useEffect(() => {
    const interval = setInterval(() => setSeconds(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [data?.id]);

  const submit = useMutation({
    mutationFn: (body: any) => api.post(`/problems/${id}/attempt`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['problems'] });
      qc.invalidateQueries({ queryKey: ['patterns'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['due'] });
      qc.invalidateQueries({ queryKey: ['problem', id] });
    },
  });

  /**
   * `running` is a ref as well as state: `disabled` on the buttons only takes
   * effect after React commits, so a fast double-click — or a held
   * ⌘↵, which is exactly what happens under timer pressure — could otherwise
   * spawn two workers. Whichever finished last would win, showing results that
   * do not match the code, and `Submit` would record the attempt twice.
   */
  const runningRef = useRef(false);

  // Reset the "Saved ✓" acknowledgement as soon as the code diverges again.
  const saveDraft = useMutation({ mutationFn: () => api.post(`/problems/${id}/save`, { code }) });
  const draftLabel = saveDraft.isPending
    ? 'Saving…'
    : saveDraft.isError
      ? 'Save failed'
      : saveDraft.isSuccess
        ? 'Saved ✓'
        : 'Save draft';

  const run = async (record: boolean) => {
    if (!data || runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    try {
      const res = await runInWorker(code, data.functionName, data.tests);
      setResult(res);
      if (record) {
        submit.mutate({
          passed: res.passed,
          passedCount: res.passedCount,
          totalCount: res.totalCount,
          durationSec: seconds,
          code,
        });
      }
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  };

  // Cmd/Ctrl+Enter runs, matching the muscle memory of every assessment platform.
  // The handler reads through a ref so typing in the editor does not tear down
  // and re-add a window listener on every keystroke.
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runRef.current(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const visibleCases = useMemo(() => data?.tests?.cases?.length ?? 0, [data]);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-ink-800 pb-4">
        <Link to="/practice" className="text-sm text-ink-500 hover:text-ink-300">
          ← Practice
        </Link>
        <h1 className="text-xl font-semibold text-ink-100">{data.title}</h1>
        <Chip tone={difficultyTone(data.difficulty) as any}>{data.difficulty}</Chip>
        <Chip>{data.pattern}</Chip>
        {data.leetcode && (
          // The same problem on LeetCode: a much larger hidden test set, an
          // editorial, and the discussion thread. Worth solving in both places.
          <a
            href={`https://leetcode.com/problems/${data.leetcode}/`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-2 py-0.5
                       text-[11px] font-medium text-ink-300 transition hover:border-warn hover:text-warn"
            title="Open this problem on LeetCode"
          >
            LeetCode ↗
          </a>
        )}
        {data.status?.status && data.status.status !== 'todo' && (
          <Chip tone={data.status.status === 'todo' ? 'neutral' : 'good'}>{data.status.status}</Chip>
        )}
        <div className="ml-auto flex items-center gap-3">
          <Timer seconds={seconds} />
          <button
            className="btn btn-ghost text-xs"
            onClick={() => {
              startRef.current = Date.now();
              setSeconds(0);
            }}
          >
            reset
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ---------------------------------------------------- left: prompt */}
        <div className="space-y-4">
          <div className="card">
            <Doc body={data.prompt} />
            {data.companies?.length > 0 && (
              <p className="mt-4 border-t border-ink-800 pt-3 text-xs text-ink-500">
                Seen at: {data.companies.join(' · ')}
              </p>
            )}
          </div>

          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Hints</span>
              <button
                className="btn btn-ghost py-1 text-xs"
                onClick={() => setHintsShown((n) => Math.min(n + 1, data.hints.length))}
                disabled={hintsShown >= data.hints.length}
              >
                {hintsShown === 0 ? 'Reveal a hint' : `Next (${hintsShown}/${data.hints.length})`}
              </button>
            </div>
            {hintsShown === 0 ? (
              <p className="text-sm text-ink-500">
                Try for 10 minutes before opening these. Struggling is where the learning happens — and in a
                real assessment there is no hint button.
              </p>
            ) : (
              <ol className="space-y-2 text-sm text-ink-300">
                {data.hints.slice(0, hintsShown).map((hint, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-ink-500">{i + 1}.</span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Reference solution</span>
              <button className="btn btn-ghost py-1 text-xs" onClick={() => setSolutionShown((s) => !s)}>
                {solutionShown ? 'Hide' : 'Show'}
              </button>
            </div>
            {solutionShown ? (
              <>
                <pre className="overflow-x-auto rounded-lg border border-ink-800 bg-ink-950 p-3 font-mono text-[12px] leading-relaxed text-ink-200">
                  {data.solution}
                </pre>
                {data.complexity && (
                  <p className="mt-3 text-sm text-ink-400">
                    <span className="text-ink-300">Complexity: </span>
                    {data.complexity}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-500">
                Look only after you have a passing solution, or after you have genuinely stalled for 25 minutes.
              </p>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- right: editor */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-ink-800">
            <div className="flex items-center justify-between border-b border-ink-800 bg-ink-850 px-4 py-2">
              <span className="font-mono text-xs text-ink-400">{data.functionName}</span>
              <span className="text-[11px] text-ink-500">{visibleCases} test cases · ⌘↵ to run</span>
            </div>
            <CodeMirror
              value={code}
              height="420px"
              theme="dark"
              extensions={[javascript()]}
              onChange={(next) => {
                setCode(next);
                if (saveDraft.isSuccess || saveDraft.isError) saveDraft.reset();
              }}
              basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
            />
            <div className="flex flex-wrap gap-2 border-t border-ink-800 bg-ink-850 px-4 py-2.5">
              <button className="btn btn-primary py-1.5 text-xs" onClick={() => run(false)} disabled={running}>
                {running ? 'Running…' : 'Run tests'}
              </button>
              <button className="btn py-1.5 text-xs" onClick={() => run(true)} disabled={running}>
                Submit &amp; record
              </button>
              <button
                className={`btn btn-ghost py-1.5 text-xs ${saveDraft.isError ? 'text-bad' : ''}`}
                onClick={() => saveDraft.mutate()}
                disabled={saveDraft.isPending}
              >
                {draftLabel}
              </button>
              <button
                className="btn btn-ghost ml-auto py-1.5 text-xs"
                onClick={() => {
                  setCode(data.starterCode);
                  setResult(null);
                }}
              >
                Reset code
              </button>
            </div>
          </div>

          {submit.isError && (
            <div role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-2.5 text-sm text-bad">
              The run finished, but the attempt was not recorded — your mastery and review schedule are unchanged.
            </div>
          )}

          {result ? (
            <ResultPanel result={result} />
          ) : (
            <div className="rounded-lg border border-dashed border-ink-800 px-4 py-8 text-center text-sm text-ink-500">
              Run your solution to see the test results.
              <div className="mt-1 text-xs">
                <strong className="text-ink-400">Submit &amp; record</strong> logs the attempt, updates your
                pattern mastery, and schedules the spaced-repetition review.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
