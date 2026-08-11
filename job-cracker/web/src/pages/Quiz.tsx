import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Announce, Chip, ErrorBox, Loading, Meter, PageHeader, RefLink, Section } from '../components/ui';

interface Question {
  id: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
}

interface ResultDetail {
  id: string;
  topic: string;
  question: string;
  options: string[];
  given: number;
  correct: number;
  right: boolean;
  explanation: string;
  ref: string;
}

export default function Quiz() {
  const [params] = useSearchParams();
  const initialTopic = params.get('topic') ?? '';
  const initialMode = params.get('mode') ?? '';

  const topics = useQuery({
    queryKey: ['quiz-topics'],
    queryFn: () => api.get<{ topic: string; count: number }[]>('/quiz/topics'),
  });
  const weak = useQuery({
    queryKey: ['quiz-weak'],
    queryFn: () => api.get<{ topic: string; accuracy: number; total: number }[]>('/quiz/weak-topics'),
  });

  const [topic, setTopic] = useState(initialTopic);
  const [count, setCount] = useState(initialMode === 'mixed' ? 25 : 15);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<{ score: number; total: number; detail: ResultDetail[] } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  /** In-flight guard + message for start/finish, which both hit the network. */
  const [busy, setBusy] = useState<'' | 'starting' | 'finishing'>('');
  const [failure, setFailure] = useState<unknown>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setTopic(initialTopic);
  }, [initialTopic]);

  // Moving between questions swaps the whole card in place; without this a
  // keyboard or screen-reader user is left on the Next button with no signal
  // that the question changed.
  useEffect(() => {
    if (questions) questionRef.current?.focus();
  }, [index, questions]);

  const start = async () => {
    if (busy) return;
    setBusy('starting');
    setFailure(null);
    try {
      const qs = await api.get<Question[]>(
        `/quiz/session?count=${count}${topic ? `&topic=${encodeURIComponent(topic)}` : ''}`,
      );
      setQuestions(qs);
      setIndex(0);
      setAnswers({});
      setResults(null);
      setStartedAt(Date.now());
    } catch (e) {
      setFailure(e);
    } finally {
      setBusy('');
    }
  };

  const finish = async () => {
    if (busy) return;
    setBusy('finishing');
    setFailure(null);
    try {
      const res = await api.post<{ score: number; total: number; detail: ResultDetail[] }>('/quiz/submit', {
        answers,
        mode: topic ? 'topic' : 'mixed',
        topics: topic ? [topic] : [],
        durationSec: Math.floor((Date.now() - startedAt) / 1000),
      });
      setResults(res);
      setQuestions(null);
      weak.refetch();
    } catch (e) {
      // Keep the questions on screen — the answers are only in memory, and
      // dropping them here would throw away the whole session.
      setFailure(e);
    } finally {
      setBusy('');
    }
  };

  if (topics.isLoading) return <Loading />;
  if (topics.error) return <ErrorBox error={topics.error} />;

  // ---------------------------------------------------------------- results
  if (results) {
    const pct = Math.round((results.score / results.total) * 100);
    return (
      <>
        <PageHeader
          title="Quiz results"
          subtitle={`${results.score} of ${results.total} correct`}
          right={
            <button className="btn btn-primary" onClick={() => setResults(null)}>
              New quiz
            </button>
          }
        />
        <Announce>
          {`Quiz finished. ${results.score} of ${results.total} correct — ${pct} percent.`}
        </Announce>
        <div className="card mb-6">
          <div className="flex items-baseline justify-between">
            <span className="label">Score</span>
            <span className="text-3xl font-semibold text-ink-100">{pct}%</span>
          </div>
          <Meter
            value={pct}
            tone={pct >= 80 ? 'good' : pct >= 60 ? 'warn' : 'bad'}
            className="mt-3"
            label="Quiz score"
          />
          <p className="mt-3 text-sm text-ink-400">
            {pct >= 85
              ? 'Solid. This topic is interview-ready — move on and come back to it in a week.'
              : pct >= 60
                ? 'Passable, not confident. Re-read the guide for the ones you missed and retake tomorrow.'
                : 'This topic would hurt you in a deep-dive round. Read the linked guide before retaking.'}
          </p>
        </div>

        <div className="space-y-3">
          {results.detail.map((d, i) => (
            <div
              key={d.id}
              className={`rounded-xl border p-5 ${d.right ? 'border-ink-800 bg-ink-900/50' : 'border-bad/30 bg-bad/[0.05]'}`}
            >
              <div className="mb-2 flex items-start gap-2">
                <span className={d.right ? 'text-good' : 'text-bad'}>{d.right ? '✓' : '✗'}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink-100">
                    {i + 1}. {d.question}
                  </div>
                  <Chip>{d.topic}</Chip>
                </div>
              </div>
              <div className="ml-6 space-y-1 text-sm">
                {d.options.map((option, oi) => (
                  <div
                    key={oi}
                    className={`rounded px-2 py-1 ${
                      oi === d.correct
                        ? 'bg-good/10 text-good'
                        : oi === d.given
                          ? 'bg-bad/10 text-bad line-through'
                          : 'text-ink-500'
                    }`}
                  >
                    {option}
                  </div>
                ))}
              </div>
              <p className="ml-6 mt-3 border-l-2 border-accent-dim pl-3 text-[13px] leading-relaxed text-ink-300">
                {d.explanation}
              </p>
              {d.ref && (
                <p className="ml-6 mt-2">
                  <RefLink refPath={d.ref} />
                </p>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------- session
  if (questions) {
    const q = questions[index];
    const answered = Object.keys(answers).length;
    return (
      <>
        <PageHeader
          title={topic || 'Mixed quiz'}
          subtitle={`Question ${index + 1} of ${questions.length}`}
          right={
            <button className="btn btn-ghost text-xs" onClick={() => setQuestions(null)}>
              Abandon
            </button>
          }
        />
        <Meter value={answered} max={questions.length} className="mb-6" label="Questions answered" />

        {failure && (
          <div className="mb-4">
            <ErrorBox error={failure} />
            <p className="mt-1 text-xs text-ink-400">
              Your answers are still here — try Finish again once the API is back.
            </p>
          </div>
        )}

        <div className="card mb-5">
          <Chip>{q.topic}</Chip>
          <h2
            ref={questionRef}
            tabIndex={-1}
            className="mt-3 text-lg font-medium leading-snug text-ink-100 focus:outline-none"
          >
            {q.question}
          </h2>
          <div className="mt-5 space-y-2">
            {q.options.map((option, oi) => (
              <button
                key={oi}
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                aria-pressed={answers[q.id] === oi}
                className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                  answers[q.id] === oi
                    ? 'border-accent-dim bg-accent/10 text-ink-100'
                    : 'border-ink-800 bg-ink-950/40 text-ink-300 hover:border-ink-600'
                }`}
              >
                <span className="font-mono text-xs text-ink-500">{'ABCD'[oi]}</span>
                <span>{option}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button className="btn" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            ← Previous
          </button>
          {index === questions.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={finish}
              disabled={answered === 0 || busy === 'finishing'}
            >
              {busy === 'finishing'
                ? 'Scoring…'
                : `Finish & score (${answered}/${questions.length} answered)`}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setIndex((i) => i + 1)}>
              Next →
            </button>
          )}
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------- setup
  return (
    <>
      <PageHeader
        title="Quiz"
        subtitle="Rapid recall across the topics a deep-dive round actually probes. Cheap, fast, and it exposes what you only think you know."
      />

      <Section title="Pick a topic" subtitle="Or leave unselected for a mixed set across everything">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTopic('')}
            aria-pressed={!topic}
            className={`rounded-lg border px-3 py-1.5 text-xs transition ${
              !topic ? 'border-accent-dim bg-accent/15 text-accent-soft' : 'border-ink-700 text-ink-300 hover:border-ink-600'
            }`}
          >
            Mixed (all topics)
          </button>
          {(topics.data ?? []).map((t) => (
            <button
              key={t.topic}
              onClick={() => setTopic(t.topic)}
              aria-pressed={topic === t.topic}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                topic === t.topic
                  ? 'border-accent-dim bg-accent/15 text-accent-soft'
                  : 'border-ink-700 text-ink-300 hover:border-ink-600'
              }`}
            >
              {t.topic} <span className="text-ink-500">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-end gap-4">
          <div role="group" aria-label="Number of questions">
            <div className="label mb-1.5">Questions</div>
            <div className="flex gap-1.5">
              {[10, 15, 25, 40].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  aria-pressed={count === n}
                  className={`h-9 w-11 rounded-lg border text-sm transition ${
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
          <button className="btn btn-primary" onClick={start} disabled={busy === 'starting'}>
            {busy === 'starting' ? 'Building…' : 'Start quiz'}
          </button>
        </div>

        {failure && (
          <div className="mt-4">
            <ErrorBox error={failure} />
          </div>
        )}
      </Section>

      {weak.data && weak.data.length > 0 && (
        <Section title="Your accuracy by topic" subtitle="Worst first — this is where a deep dive would hurt">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {weak.data.map((w) => (
              <button
                key={w.topic}
                onClick={() => setTopic(w.topic)}
                className="rounded-lg border border-ink-800 bg-ink-900/60 px-4 py-3 text-left transition hover:border-ink-600"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-100">{w.topic}</span>
                  <span className="text-xs text-ink-400">{w.accuracy}%</span>
                </div>
                <Meter
                  value={w.accuracy}
                  tone={w.accuracy >= 80 ? 'good' : w.accuracy >= 60 ? 'warn' : 'bad'}
                  className="mt-2"
                />
                <div className="mt-1.5 text-[11px] text-ink-500">{w.total} answered</div>
              </button>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
