import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Skill } from '../lib/api';
import { Chip, ErrorBox, Loading, Meter, PageHeader, RefLink, Section } from '../components/ui';

const PRIORITY_TONE: Record<string, 'bad' | 'warn' | 'accent' | 'good'> = {
  critical: 'bad',
  high: 'warn',
  medium: 'accent',
  ok: 'good',
};

function SkillRow({ skill, market }: { skill: Skill; market: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(skill.note ?? '');

  const update = useMutation({
    mutationFn: (body: any) => api.patch(`/skills/${skill.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      qc.invalidateQueries({ queryKey: ['skills-summary'] });
    },
  });

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/60">
      <div className="flex flex-wrap items-center gap-4 px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-100">{skill.name}</span>
            {!skill.rated && <span className="text-[10px] text-ink-500">(assumed)</span>}
          </div>
          <div className="mt-0.5 text-[11px] text-ink-500">{skill.category}</div>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="w-14 text-right text-[11px] text-ink-500">demand</span>
          <div className="flex gap-0.5" role="img" aria-label={`Market demand ${skill.demand} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`h-4 w-2 rounded-sm ${n <= skill.demand ? 'bg-ink-400' : 'bg-ink-800'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label={`Your level in ${skill.name}`}>
          <span className="w-8 text-right text-[11px] text-ink-500">you</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                title={`Rate ${n}/5`}
                aria-label={`Rate ${skill.name} ${n} out of 5`}
                aria-pressed={skill.level === n}
                onClick={() => update.mutate({ level: n })}
                className={`h-4 w-2 rounded-sm transition hover:opacity-80 ${
                  n <= skill.level
                    ? skill.level >= skill.demand
                      ? 'bg-good'
                      : 'bg-warn'
                    : 'bg-ink-800 hover:bg-ink-600'
                }`}
              />
            ))}
          </div>
        </div>

        <Chip tone={PRIORITY_TONE[skill.priority]}>{skill.priority}</Chip>
      </div>

      {update.isError && !open && (
        <p role="alert" className="border-t border-ink-850 px-4 py-2 text-[11px] text-bad">
          Could not save that rating — it was not recorded.
        </p>
      )}

      {open && (
        <div className="border-t border-ink-850 px-4 py-4">
          <div className="label mb-1">Why it is weighted this way ({market})</div>
          <p className="text-[13px] leading-relaxed text-ink-300">{skill.why}</p>
          <div className="label mb-1 mt-3">How to prove it in an interview</div>
          <p className="text-[13px] leading-relaxed text-ink-300">{skill.proveIt}</p>
          {skill.ref && (
            <p className="mt-3">
              {skill.ref.endsWith('.md') ? (
                <RefLink refPath={skill.ref} />
              ) : (
                <Link to={`/${skill.ref}`} className="text-[11px] text-accent-soft hover:underline">
                  open in app →
                </Link>
              )}
            </p>
          )}
          <div className="mt-3">
            <label className="sr-only" htmlFor={`skill-note-${skill.id}`}>
              Your note on {skill.name}
            </label>
            <textarea
              id={`skill-note-${skill.id}`}
              className="input h-16 resize-y text-xs"
              placeholder="Your note — evidence you have, or the gap you need to close"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => note !== skill.note && update.mutate({ note })}
            />
            {update.isError && (
              <p role="alert" className="mt-1 text-[11px] text-bad">
                Could not save — this rating or note was not recorded.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Skills() {
  const [market, setMarket] = useState('remote');
  const skills = useQuery({
    queryKey: ['skills', market],
    queryFn: () => api.get<Skill[]>(`/skills?market=${market}`),
  });
  const summary = useQuery({
    queryKey: ['skills-summary', market],
    queryFn: () => api.get<any>(`/skills/summary?market=${market}`),
  });

  if (skills.isLoading) return <Loading />;
  if (skills.error) return <ErrorBox error={skills.error} />;

  const rows = skills.data ?? [];
  const categories = [...new Set(rows.map((s) => s.category))];

  return (
    <>
      <PageHeader
        title="Skills matrix"
        subtitle="Rate yourself honestly. Gap = (market demand − your level) × demand, so a weak high-demand skill outranks a weak niche one. That ordering is your study priority."
        right={
          <div className="flex gap-1.5">
            {[
              { id: 'remote', label: 'International remote' },
              { id: 'bd', label: 'Bangladesh' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMarket(m.id)}
                aria-pressed={market === m.id}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  market === m.id
                    ? 'border-accent-dim bg-accent/15 text-accent-soft'
                    : 'border-ink-700 text-ink-400 hover:border-ink-600'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      />

      {summary.data && (
        <>
          {summary.data.ratedCount < summary.data.total && (
            <div className="mb-6 rounded-lg border border-warn/30 bg-warn/[0.07] px-4 py-3 text-sm text-ink-200">
              <strong className="text-warn">{summary.data.total - summary.data.ratedCount} skills unrated.</strong>{' '}
              The seeded values are my guess from your repo, not your judgment. Click the bars to rate them — the
              whole priority ordering depends on it.
            </div>
          )}

          <Section title="By category" subtitle="Average market demand versus your average level">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {summary.data.categories.map((c: any) => (
                <div key={c.category} className="card-tight">
                  <div className="text-sm font-medium text-ink-100">{c.category}</div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] text-ink-500">
                        <span>demand</span>
                        <span>{c.avgDemand}/5</span>
                      </div>
                      <Meter value={c.avgDemand} max={5} tone="accent" className="mt-1" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-ink-500">
                        <span>you</span>
                        <span>{c.avgLevel}/5</span>
                      </div>
                      <Meter
                        value={c.avgLevel}
                        max={5}
                        tone={c.avgLevel >= c.avgDemand ? 'good' : c.avgLevel >= c.avgDemand - 1 ? 'warn' : 'bad'}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      <Section title="All skills" subtitle="Sorted by gap — work top down">
        <div className="space-y-2">
          {rows.map((s) => (
            <SkillRow key={s.id} skill={s} market={market === 'bd' ? 'Bangladesh' : 'international remote'} />
          ))}
        </div>
      </Section>

      <Section title="By category (grouped)">
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">{cat}</h3>
              <div className="space-y-1.5">
                {rows
                  .filter((s) => s.category === cat)
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border border-ink-850 bg-ink-900/40 px-4 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink-200">{s.name}</span>
                      <span className="text-[11px] text-ink-500">
                        {s.level}/{s.demand}
                      </span>
                      <span className="w-24">
                        <Meter
                          value={s.level}
                          max={5}
                          tone={s.level >= s.demand ? 'good' : s.level >= s.demand - 1 ? 'warn' : 'bad'}
                        />
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
