import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ProblemListItem } from '../lib/api';
import { Chip, difficultyTone, ErrorBox, Loading, Meter, PageHeader, Section } from '../components/ui';

interface PatternStat {
  pattern: string;
  total: number;
  solved: number;
  attempted: number;
  mastery: number;
}

const STATUS_TONE: Record<string, 'good' | 'warn' | 'neutral' | 'accent'> = {
  mastered: 'good',
  solved: 'good',
  attempted: 'warn',
  todo: 'neutral',
};

const MODES = [
  { id: 'timed', label: 'Timed OA', hint: 'One easy + mediums, assessment conditions' },
  { id: 'weak', label: 'Weakest patterns', hint: 'Pulled from your three worst patterns' },
  { id: 'review', label: 'Spaced review', hint: 'Problems whose review is due' },
  { id: 'blind', label: 'Blind mix', hint: 'Pattern hidden — the real test condition' },
];

function SessionBuilder() {
  const [mode, setMode] = useState('timed');
  const [count, setCount] = useState(3);
  const [session, setSession] = useState<{ id: string; title: string; difficulty: string; pattern: string }[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const generate = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>(`/problems/session?mode=${mode}&count=${count}`);
      setSession(data);
      setStartedAt(Date.now());
    } finally {
      setLoading(false);
    }
  };

  // Tick the clock only while a session is running.
  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const budget = count * 25 * 60;

  return (
    <div className="card">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[220px] flex-1" role="group" aria-label="Session mode">
          <div className="label mb-1.5">Session mode</div>
          <div className="flex flex-wrap gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                title={m.hint}
                aria-pressed={mode === m.id}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  mode === m.id
                    ? 'border-accent-dim bg-accent/15 text-accent-soft'
                    : 'border-ink-700 text-ink-300 hover:border-ink-600'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div role="group" aria-label="Number of problems">
          <div className="label mb-1.5">Problems</div>
          <div className="flex gap-1.5">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                aria-pressed={count === n}
                className={`h-9 w-9 rounded-lg border text-sm transition ${
                  count === n
                    ? 'border-accent-dim bg-accent/15 text-accent-soft'
                    : 'border-ink-700 text-ink-300 hover:border-ink-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          {loading ? 'Building…' : session ? 'New session' : 'Start session'}
        </button>
      </div>

      <p className="mt-3 text-xs text-ink-500">{MODES.find((m) => m.id === mode)?.hint}</p>

      {session && (
        <div className="mt-4 border-t border-ink-800 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="label">Your set — target {Math.round(budget / 60)} min total</span>
            <span
              className={`font-mono text-sm ${elapsed > budget ? 'text-bad' : elapsed > budget * 0.75 ? 'text-warn' : 'text-ink-300'}`}
            >
              {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
            </span>
          </div>
          <div className="space-y-1.5">
            {session.map((p, i) => (
              <Link
                key={p.id}
                to={`/practice/${p.id}`}
                className="flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-950/50 px-4 py-2.5 transition hover:border-ink-600"
              >
                <span className="text-xs text-ink-500">{i + 1}</span>
                <span className="flex-1 text-sm text-ink-100">{p.title}</span>
                <Chip tone={difficultyTone(p.difficulty) as any}>{p.difficulty}</Chip>
                {p.pattern !== 'hidden' && <Chip>{p.pattern}</Chip>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Practice() {
  const [params, setParams] = useSearchParams();
  const pattern = params.get('pattern') ?? '';
  const difficulty = params.get('difficulty') ?? '';
  const status = params.get('status') ?? '';

  const problems = useQuery({
    queryKey: ['problems', pattern, difficulty, status],
    queryFn: () =>
      api.get<ProblemListItem[]>(
        `/problems?${new URLSearchParams({ ...(pattern && { pattern }), ...(difficulty && { difficulty }), ...(status && { status }) })}`,
      ),
  });
  const patterns = useQuery({ queryKey: ['patterns'], queryFn: () => api.get<PatternStat[]>('/problems/patterns') });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  if (problems.error) return <ErrorBox error={problems.error} />;

  return (
    <>
      <PageHeader
        title="Practice"
        subtitle="101 problems with real test cases, run in your browser. The Node Practical set is the one nobody drills and the one that maps closest to the job."
      />

      <Section title="Build an assessment" subtitle="Untimed practice teaches the solution. Timed practice teaches the job.">
        <SessionBuilder />
      </Section>

      {patterns.data && (
        <Section title="Pattern mastery" subtitle="Sorted worst first — this is your study order">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {patterns.data.map((p) => (
              <button
                key={p.pattern}
                onClick={() => setFilter('pattern', pattern === p.pattern ? '' : p.pattern)}
                aria-pressed={pattern === p.pattern}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  pattern === p.pattern
                    ? 'border-accent-dim bg-accent/10'
                    : 'border-ink-800 bg-ink-900/60 hover:border-ink-600'
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-ink-100">{p.pattern}</span>
                  <span className="text-xs text-ink-400">
                    {p.solved}/{p.total}
                  </span>
                </div>
                <Meter
                  value={p.mastery}
                  tone={p.mastery >= 70 ? 'good' : p.mastery >= 30 ? 'warn' : 'bad'}
                  className="mt-2"
                />
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section
        title={`Problems${pattern ? ` — ${pattern}` : ''}`}
        subtitle={`${problems.data?.length ?? 0} shown`}
        right={
          <div className="flex gap-1.5">
            <div className="flex gap-1.5" role="group" aria-label="Filter by difficulty">
              {['', 'easy', 'medium', 'hard'].map((d) => (
                <button
                  key={d || 'all'}
                  onClick={() => setFilter('difficulty', d)}
                  aria-pressed={difficulty === d}
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                    difficulty === d
                      ? 'border-accent-dim bg-accent/15 text-accent-soft'
                      : 'border-ink-700 text-ink-400 hover:border-ink-600'
                  }`}
                >
                  {d || 'all'}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5" role="group" aria-label="Filter by status">
              {['', 'todo', 'solved'].map((st) => (
                <button
                  key={st || 'any'}
                  onClick={() => setFilter('status', st)}
                  aria-pressed={status === st}
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                    status === st
                      ? 'border-accent-dim bg-accent/15 text-accent-soft'
                      : 'border-ink-700 text-ink-400 hover:border-ink-600'
                  }`}
                >
                  {st || 'any status'}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {problems.isLoading ? (
          <Loading />
        ) : (
          <div className="overflow-hidden rounded-xl border border-ink-800">
            <table className="w-full text-sm">
              <thead className="bg-ink-850 text-left text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Problem</th>
                  <th className="px-4 py-2.5 font-medium">Pattern</th>
                  <th className="px-4 py-2.5 font-medium">Level</th>
                  <th className="px-4 py-2.5 font-medium" title="How often this shape appears in real assessments">
                    Freq
                  </th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(problems.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-ink-850 transition hover:bg-ink-900/60">
                    <td className="px-4 py-2.5">
                      <Link to={`/practice/${p.id}`} className="font-medium text-ink-100 hover:text-accent-soft">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-ink-400">{p.pattern}</td>
                    <td className="px-4 py-2.5">
                      <Chip tone={difficultyTone(p.difficulty) as any}>{p.difficulty}</Chip>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-ink-400">{'★'.repeat(p.frequency)}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Chip tone={STATUS_TONE[p.status] ?? 'neutral'}>{p.status}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
