import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Chip, difficultyTone, ErrorBox, Loading, Meter, PageHeader, Section } from '../components/ui';

interface DrillRow {
  id: string;
  title: string;
  kind: string;
  difficulty: string;
  timeboxMin: number;
  attemptCount: number;
  lastScore: number | null;
  lastAttemptAt: string | null;
}

const KIND_LABEL: Record<string, string> = {
  hld: 'High-level design',
  lld: 'Low-level design',
  architecture: 'Architecture & leadership',
};

export default function Design() {
  const [kind, setKind] = useState('');
  const drills = useQuery({
    queryKey: ['drills'],
    queryFn: () => api.get<DrillRow[]>('/design'),
  });
  const dims = useQuery({
    queryKey: ['drill-dims'],
    queryFn: () => api.get<{ id: string; label: string; average: number; samples: number }[]>('/design/stats/dimensions'),
  });

  if (drills.isLoading) return <Loading />;
  if (drills.error) return <ErrorBox error={drills.error} />;

  const rows = (drills.data ?? []).filter((d) => !kind || d.kind === kind);
  const kinds = [...new Set((drills.data ?? []).map((d) => d.kind))];

  return (
    <>
      <PageHeader
        title="Design drills"
        subtitle="Timed, then self-scored against an explicit rubric. Reading solutions trains recognition; scoring yourself trains performance."
      />

      {dims.data && dims.data.length > 0 && (
        <Section
          title="Your weakest design habits"
          subtitle="Averaged across every attempt, worst first — fix the habit, not the problem"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {dims.data.slice(0, 6).map((d) => (
              <div key={d.id} className="card-tight">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink-200">{d.label}</span>
                  <span className="whitespace-nowrap text-xs text-ink-400">{d.average.toFixed(1)}/3</span>
                </div>
                <Meter
                  value={d.average}
                  max={3}
                  tone={d.average >= 2.3 ? 'good' : d.average >= 1.5 ? 'warn' : 'bad'}
                  className="mt-2"
                />
                <div className="mt-1 text-[11px] text-ink-500">{d.samples} attempts</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section
        title={`${rows.length} drills`}
        right={
          <div className="flex gap-1.5" role="group" aria-label="Filter drills by kind">
            <button
              onClick={() => setKind('')}
              aria-pressed={!kind}
              className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                !kind ? 'border-accent-dim bg-accent/15 text-accent-soft' : 'border-ink-700 text-ink-400 hover:border-ink-600'
              }`}
            >
              all
            </button>
            {kinds.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                  kind === k ? 'border-accent-dim bg-accent/15 text-accent-soft' : 'border-ink-700 text-ink-400 hover:border-ink-600'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        }
      >
        <div className="space-y-4">
          {kinds
            .filter((k) => !kind || k === kind)
            .map((k) => (
              <div key={k}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                  {KIND_LABEL[k] ?? k}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rows
                    .filter((d) => d.kind === k)
                    .map((d) => (
                      <Link
                        key={d.id}
                        to={`/design/${d.id}`}
                        className="rounded-xl border border-ink-800 bg-ink-900/60 p-4 transition hover:border-ink-600"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium text-ink-100">{d.title}</span>
                          <Chip tone={difficultyTone(d.difficulty) as any}>{d.difficulty}</Chip>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-500">
                          <span>{d.timeboxMin} min timebox</span>
                          <span>·</span>
                          <span>{d.attemptCount ? `${d.attemptCount} attempt(s)` : 'never attempted'}</span>
                        </div>
                        {d.lastScore !== null && (
                          <div className="mt-2">
                            <Meter
                              value={d.lastScore}
                              tone={d.lastScore >= 70 ? 'good' : d.lastScore >= 45 ? 'warn' : 'bad'}
                            />
                            <div className="mt-1 text-[11px] text-ink-500">last score {d.lastScore}%</div>
                          </div>
                        )}
                      </Link>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </Section>
    </>
  );
}
