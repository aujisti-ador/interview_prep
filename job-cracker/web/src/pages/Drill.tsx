import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Drill } from '../lib/api';
import { Announce, Chip, difficultyTone, Doc, ErrorBox, Loading, Meter, RefLink } from '../components/ui';

const SCORE_LABELS = ['missed it', 'touched it', 'covered it', 'nailed it'];

export default function DrillPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['drill', id],
    queryFn: () => api.get<Drill>(`/design/${id}`),
  });

  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoring, setScoring] = useState(false);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setSeconds(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const save = useMutation({
    mutationFn: (body: any) => api.post(`/design/${id}/attempt`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drill', id] });
      qc.invalidateQueries({ queryKey: ['drills'] });
      qc.invalidateQueries({ queryKey: ['drill-dims'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      setScoring(false);
      setRunning(false);
      setSeconds(0);
      setNotes('');
      setScores({});
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  const timebox = data.timeboxMin * 60;
  const overtime = seconds > timebox;
  const maxPossible = data.rubric.reduce((a, r) => a + r.weight * 3, 0);
  const current = data.rubric.reduce((a, r) => a + (scores[r.id] ?? 0) * r.weight, 0);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-ink-800 pb-4">
        <Link to="/design" className="text-sm text-ink-500 hover:text-ink-300">
          ← Design
        </Link>
        <h1 className="text-xl font-semibold text-ink-100">{data.title}</h1>
        <Chip tone={difficultyTone(data.difficulty) as any}>{data.difficulty}</Chip>
        <Chip>{data.kind}</Chip>

        <div className="ml-auto flex items-center gap-3">
          <span
            className={`font-mono text-lg ${overtime ? 'text-bad' : seconds > timebox * 0.8 ? 'text-warn' : 'text-ink-300'}`}
          >
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
            <span className="ml-1 text-xs text-ink-500">/ {data.timeboxMin}:00</span>
          </span>
          {/* The timebox is otherwise signalled by colour alone. */}
          <Announce>
            {running && overtime
              ? `Past the ${data.timeboxMin} minute timebox.`
              : running && seconds > timebox * 0.8
                ? 'Approaching the timebox.'
                : ''}
          </Announce>
          {!running ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                startRef.current = Date.now();
                setSeconds(0);
                setRunning(true);
                setScoring(false);
              }}
            >
              Start timer
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => {
                setRunning(false);
                setScoring(true);
              }}
            >
              Stop &amp; score
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="card">
            <Doc body={data.prompt} />
            {data.constraints && (
              <div className="mt-4 rounded-lg border border-ink-800 bg-ink-950/60 p-4">
                <div className="label mb-1">Constraints to design against</div>
                <p className="text-sm text-ink-300">{data.constraints}</p>
              </div>
            )}
            {data.ref && (
              <p className="mt-4 flex items-center gap-1.5">
                <span className="text-[11px] text-ink-500">Reference:</span>
                <RefLink refPath={data.ref} />
              </p>
            )}
          </div>

          <div className="card">
            <label className="label mb-2 block" htmlFor="drill-notes">
              Your working notes
            </label>
            <p className="mb-3 text-xs text-ink-500">
              Draw on excalidraw and talk out loud — that is the real rehearsal. Use this box for the decisions and
              the numbers so you can compare against the rubric afterwards.
            </p>
            <textarea
              id="drill-notes"
              className="input h-72 resize-y font-mono text-xs leading-relaxed"
              placeholder={
                'Requirements (functional / non-functional):\n\nScale numbers:\n  DAU:\n  QPS avg / peak:\n  Storage/yr:\n\nAPI:\n\nData model:\n\nHigh level:\n\nBottleneck + fix:\n\nFailure modes:\n\nTrade-offs (chose X over Y because):\n'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="label">Rubric</span>
              {scoring && (
                <span className="text-sm text-ink-300">
                  {Math.round((current / maxPossible) * 100)}%
                </span>
              )}
            </div>

            {!scoring ? (
              <p className="text-sm text-ink-500">
                Do not read the rubric before you attempt the problem — it is the answer key for how you will be
                judged, and seeing it first turns a rehearsal into a memory test. Hit <strong>Stop &amp; score</strong>{' '}
                when you are done.
              </p>
            ) : (
              <>
                <Meter
                  value={current}
                  max={maxPossible}
                  tone={current / maxPossible >= 0.7 ? 'good' : current / maxPossible >= 0.45 ? 'warn' : 'bad'}
                  className="mb-4"
                  label="Rubric score"
                />
                <div className="space-y-4">
                  {data.rubric.map((item) => (
                    <div key={item.id}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-medium leading-snug text-ink-200">{item.label}</span>
                        <span className="shrink-0 text-[10px] text-ink-500">×{item.weight}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{item.hint}</p>
                      <div className="mt-2 flex gap-1" role="group" aria-label={`Score for ${item.label}`}>
                        {[0, 1, 2, 3].map((score) => (
                          <button
                            key={score}
                            onClick={() => setScores((prev) => ({ ...prev, [item.id]: score }))}
                            title={SCORE_LABELS[score]}
                            aria-label={`${score} — ${SCORE_LABELS[score]}`}
                            aria-pressed={scores[item.id] === score}
                            className={`flex-1 rounded border py-1 text-[11px] transition ${
                              scores[item.id] === score
                                ? score >= 2
                                  ? 'border-good bg-good/15 text-good'
                                  : 'border-warn bg-warn/15 text-warn'
                                : 'border-ink-700 text-ink-500 hover:border-ink-500'
                            }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-primary mt-5 w-full"
                  onClick={() =>
                    save.mutate({ notes, scores, durationMin: Math.round(seconds / 60) })
                  }
                  disabled={Object.keys(scores).length === 0 || save.isPending}
                >
                  {save.isPending ? 'Saving…' : 'Save attempt'}
                </button>
                {save.isError && (
                  <p role="alert" className="mt-2 text-center text-[11px] text-bad">
                    Could not save — your notes and scores are still on screen, try again.
                  </p>
                )}
                <p className="mt-2 text-center text-[11px] text-ink-500">
                  Score honestly. Generous self-scoring is the fastest way to waste this exercise.
                </p>
              </>
            )}
          </div>

          {data.attempts && data.attempts.length > 0 && (
            <div className="card">
              <div className="label mb-3">Previous attempts</div>
              <div className="space-y-2">
                {data.attempts.map((a) => (
                  <div key={a.id} className="rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-ink-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                      <span className="text-ink-200">
                        {Math.round((a.totalScore / Math.max(1, a.maxScore)) * 100)}% · {a.durationMin}m
                      </span>
                    </div>
                    {a.notes && (
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[11px] text-ink-500">{a.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
