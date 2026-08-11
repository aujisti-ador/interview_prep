import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, StarPrompt, StarStory } from '../lib/api';
import { Chip, ErrorBox, Loading, PageHeader, Section } from '../components/ui';

const FIELDS: { key: keyof StarStory; label: string; placeholder: string }[] = [
  {
    key: 'situation',
    label: 'Situation',
    placeholder: 'The context AND the constraint that made it hard. One or two sentences.',
  },
  { key: 'task', label: 'Task', placeholder: 'What you specifically owned. Use "I", not "we".' },
  {
    key: 'action',
    label: 'Action',
    placeholder: 'The decisions you made and why. Name the alternative you rejected.',
  },
  { key: 'result', label: 'Result', placeholder: 'What changed, with at least two numbers.' },
  {
    key: 'metrics',
    label: 'Numbers to quote',
    placeholder: 'p99 2.4s → 380ms · 41M subscribers · cost down 38% · 4 engineers mentored',
  },
];

function StoryEditor({ story, prompts }: { story: StarStory; prompts: StarPrompt[] }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(story);
  const [dirty, setDirty] = useState(false);

  const save = useMutation({
    mutationFn: () => api.patch(`/behavioral/stories/${story.id}`, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stories'] });
      setDirty(false);
    },
  });
  const rehearse = useMutation({
    mutationFn: () => api.post(`/behavioral/stories/${story.id}/rehearse`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stories'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/behavioral/stories/${story.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories'] }),
  });

  const set = (key: string, value: any) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const prompt = prompts.find((p) => p.id === draft.promptId);
  const wordCount = [draft.situation, draft.task, draft.action, draft.result].join(' ').trim().split(/\s+/)
    .filter(Boolean).length;
  // ~140 wpm spoken; a 3-minute answer is roughly 420 words.
  const spokenSeconds = Math.round((wordCount / 140) * 60);

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor={`${story.id}-title`}>
          Story title
        </label>
        <input
          id={`${story.id}-title`}
          className="input flex-1 text-base font-medium"
          value={draft.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Story title — e.g. Scaling notifications to 41M"
        />
        <span className="text-xs text-ink-500">
          {wordCount} words · ~{Math.floor(spokenSeconds / 60)}m{spokenSeconds % 60}s spoken
        </span>
        <Chip tone={draft.rehearsals >= 2 ? 'good' : 'warn'}>{draft.rehearsals} rehearsals</Chip>
      </div>

      {prompt && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-good/25 bg-good/[0.05] p-3">
            <div className="label mb-1 text-good">What good looks like</div>
            <p className="text-[12px] leading-relaxed text-ink-300">{prompt.whatGoodLooksLike}</p>
          </div>
          <div className="rounded-lg border border-bad/25 bg-bad/[0.05] p-3">
            <div className="label mb-1 text-bad">Red flags</div>
            <p className="text-[12px] leading-relaxed text-ink-300">{prompt.redFlags}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {FIELDS.map((field) => (
          <div key={field.key as string}>
            <label className="label mb-1 block" htmlFor={`${story.id}-${field.key as string}`}>
              {field.label}
            </label>
            <textarea
              id={`${story.id}-${field.key as string}`}
              className="input h-20 resize-y text-[13px]"
              placeholder={field.placeholder}
              value={(draft[field.key] as string) ?? ''}
              onChange={(e) => set(field.key as string, e.target.value)}
            />
          </div>
        ))}
      </div>

      {save.isError && (
        <p role="alert" className="mt-3 text-xs text-bad">
          Could not save this story — your edits are still on screen but are not persisted.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className="btn btn-primary text-xs" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          {save.isPending ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
        <button className="btn text-xs" onClick={() => rehearse.mutate()}>
          + Rehearsed out loud
        </button>
        <button
          className="btn btn-ghost ml-auto text-xs text-ink-500 hover:text-bad"
          onClick={() => {
            if (confirm(`Delete "${draft.title}"? This cannot be undone.`)) remove.mutate();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function Behavioral() {
  const qc = useQueryClient();
  const prompts = useQuery({ queryKey: ['prompts'], queryFn: () => api.get<StarPrompt[]>('/behavioral/prompts') });
  const stories = useQuery({ queryKey: ['stories'], queryFn: () => api.get<StarStory[]>('/behavioral/stories') });

  const create = useMutation({
    mutationFn: (body: any) => api.post('/behavioral/stories', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories'] }),
  });

  if (prompts.isLoading || stories.isLoading) return <Loading />;
  if (prompts.error) return <ErrorBox error={prompts.error} />;

  const used = new Set((stories.data ?? []).map((s) => s.promptId));
  const rehearsed = (stories.data ?? []).filter((s) => s.rehearsals >= 2).length;

  return (
    <>
      <PageHeader
        title="Behavioral"
        subtitle="Seven metric-backed stories, rehearsed out loud, cover almost every behavioral question you will be asked. Target: seven stories with two rehearsals each."
        right={
          <div className="text-right">
            <div className="text-2xl font-semibold text-ink-100">{rehearsed}/7</div>
            <div className="label">rehearsed</div>
          </div>
        }
      />

      <Section title="Prompts" subtitle="Click one to start a story against it — the grading notes come with it">
        <div className="grid gap-2 sm:grid-cols-2">
          {(prompts.data ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() =>
                create.mutate({
                  promptId: p.id,
                  title: p.competency,
                  competency: p.competency,
                })
              }
              className={`rounded-lg border px-4 py-3 text-left transition ${
                used.has(p.id)
                  ? 'border-good/30 bg-good/[0.05]'
                  : 'border-ink-800 bg-ink-900/60 hover:border-ink-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-400">{p.competency}</span>
                {used.has(p.id) && <span className="text-xs text-good">✓</span>}
              </div>
              <p className="mt-1 text-[13px] leading-snug text-ink-200">{p.prompt}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title={`Your stories (${stories.data?.length ?? 0})`}
        right={
          <button className="btn text-xs" onClick={() => create.mutate({ title: 'New story' })}>
            + Blank story
          </button>
        }
      >
        {stories.data && stories.data.length > 0 ? (
          <div className="space-y-4">
            {stories.data.map((s) => (
              <StoryEditor key={s.id} story={s} prompts={prompts.data ?? []} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink-800 px-6 py-10 text-center text-sm text-ink-400">
            Pick a prompt above to start. Ninety minutes per story, and it upgrades every behavioral round you will
            ever sit.
          </div>
        )}
      </Section>
    </>
  );
}
