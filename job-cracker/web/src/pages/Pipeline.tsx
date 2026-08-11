import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Application } from '../lib/api';
import { Chip, ErrorBox, Loading, PageHeader, Section, Stat } from '../components/ui';

const STAGES = [
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'applied', label: 'Applied' },
  { id: 'screen', label: 'Recruiter screen' },
  { id: 'oa', label: 'Online assessment' },
  { id: 'tech', label: 'Technical' },
  { id: 'design', label: 'System design' },
  { id: 'final', label: 'Final / bar raiser' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Rejected' },
];

const STAGE_TONE: Record<string, 'neutral' | 'accent' | 'warn' | 'good' | 'bad'> = {
  wishlist: 'neutral',
  applied: 'accent',
  screen: 'accent',
  oa: 'warn',
  tech: 'warn',
  design: 'warn',
  final: 'good',
  offer: 'good',
  rejected: 'bad',
};

function AddForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    company: '',
    role: 'Senior Backend Engineer',
    market: 'remote',
    source: '',
    link: '',
    status: 'wishlist',
  });

  const create = useMutation({
    mutationFn: () => api.post('/pipeline', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      qc.invalidateQueries({ queryKey: ['funnel'] });
      onDone();
    },
  });

  return (
    <div className="card mb-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label mb-1 block" htmlFor="pipeline-company">
            Company
          </label>
          <input
            id="pipeline-company"
            className="input"
            autoFocus
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="bKash / Proxify / …"
          />
        </div>
        <div>
          <label className="label mb-1 block" htmlFor="pipeline-role">
            Role
          </label>
          <input
            id="pipeline-role"
            className="input"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
        </div>
        <div>
          <label className="label mb-1 block" htmlFor="pipeline-market">
            Market
          </label>
          <select
            id="pipeline-market"
            className="input"
            value={form.market}
            onChange={(e) => setForm({ ...form, market: e.target.value })}
          >
            <option value="remote">International remote</option>
            <option value="bd">Bangladesh</option>
          </select>
        </div>
        <div>
          <label className="label mb-1 block" htmlFor="pipeline-source">
            Source
          </label>
          <input
            id="pipeline-source"
            className="input"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="LinkedIn / referral / WWR"
          />
        </div>
        <div>
          <label className="label mb-1 block" htmlFor="pipeline-link">
            Link
          </label>
          <input
            id="pipeline-link"
            type="url"
            className="input"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="label mb-1 block" htmlFor="pipeline-stage">
            Stage
          </label>
          <select
            id="pipeline-stage"
            className="input"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {create.isError && (
        <p role="alert" className="mt-3 text-xs text-bad">
          Could not add {form.company || 'this application'} — nothing was saved.
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          className="btn btn-primary text-xs"
          onClick={() => create.mutate()}
          disabled={!form.company || create.isPending}
        >
          {create.isPending ? 'Adding…' : 'Add'}
        </button>
        <button className="btn btn-ghost text-xs" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Row({ app }: { app: Application }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nextAction, setNextAction] = useState(app.nextAction);
  const [compNote, setCompNote] = useState(app.compNote);

  const update = useMutation({
    mutationFn: (body: any) => api.patch(`/pipeline/${app.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      qc.invalidateQueries({ queryKey: ['funnel'] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/pipeline/${app.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      qc.invalidateQueries({ queryKey: ['funnel'] });
    },
  });

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/60">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="text-sm font-medium text-ink-100">{app.company}</div>
          <div className="mt-0.5 text-[11px] text-ink-500">
            {app.role} · {app.market === 'bd' ? 'Bangladesh' : 'remote'}
            {app.source && ` · ${app.source}`}
          </div>
        </button>

        <label className="sr-only" htmlFor={`stage-${app.id}`}>
          Pipeline stage for {app.company}
        </label>
        <select
          id={`stage-${app.id}`}
          className="rounded-lg border border-ink-700 bg-ink-950 px-2 py-1 text-xs text-ink-200"
          value={app.status}
          onChange={(e) => update.mutate({ status: e.target.value })}
        >
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <Chip tone={STAGE_TONE[app.status]}>{app.status}</Chip>
      </div>

      {(update.isError || remove.isError) && (
        <p role="alert" className="border-t border-ink-850 px-4 py-2 text-xs text-bad">
          Could not save that change — it was not recorded.
        </p>
      )}

      {open && (
        <div className="space-y-3 border-t border-ink-850 px-4 py-4">
          <div>
            <label className="label mb-1 block" htmlFor={`next-action-${app.id}`}>
              Next action
            </label>
            <input
              id={`next-action-${app.id}`}
              className="input text-xs"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              onBlur={() => nextAction !== app.nextAction && update.mutate({ nextAction })}
              placeholder="Follow up Tue · prep MFS design · send ADR"
            />
          </div>
          <div>
            <label className="label mb-1 block" htmlFor={`comp-note-${app.id}`}>
              Comp notes
            </label>
            <input
              id={`comp-note-${app.id}`}
              className="input text-xs"
              value={compNote}
              onChange={(e) => setCompNote(e.target.value)}
              onBlur={() => compNote !== app.compNote && update.mutate({ compNote })}
              placeholder="Band they quoted · what you anchored · who named a number first"
            />
          </div>
          {app.link && (
            <a
              href={app.link}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-xs text-accent-soft hover:underline"
            >
              {app.link}
            </a>
          )}
          <button
            className="text-xs text-ink-500 hover:text-bad"
            onClick={() => confirm(`Remove ${app.company}?`) && remove.mutate()}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const [adding, setAdding] = useState(false);
  // The form autoFocuses on open; closing it has to hand focus back or it
  // falls to <body> and a keyboard user restarts from the top of the page.
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const closeAdd = () => {
    setAdding(false);
    addButtonRef.current?.focus();
  };
  const apps = useQuery({ queryKey: ['pipeline'], queryFn: () => api.get<Application[]>('/pipeline') });
  const funnel = useQuery({ queryKey: ['funnel'], queryFn: () => api.get<any>('/pipeline/funnel') });

  if (apps.isLoading) return <Loading />;
  if (apps.error) return <ErrorBox error={apps.error} />;

  const rows = apps.data ?? [];

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="A strong candidate converts roughly 2–5% of applications into offers. That is arithmetic, not a judgment — which is why volume matters as much as preparation."
        right={
          <button
            ref={addButtonRef}
            className="btn btn-primary"
            onClick={() => setAdding(true)}
            aria-expanded={adding}
          >
            + Add
          </button>
        }
      />

      {adding && <AddForm onDone={closeAdd} />}

      {funnel.data && (
        <Section title="Funnel">
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Applied" value={funnel.data.applied} hint={`${funnel.data.total} tracked total`} />
            <Stat label="Active" value={funnel.data.active} hint="Not rejected, not closed" />
            <Stat label="Response rate" value={`${funnel.data.responseRate}%`} hint="Got past 'applied'" />
            <Stat label="Reached technical" value={`${funnel.data.techRate}%`} hint="Tech round or beyond" />
          </div>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <div
                key={s.id}
                className="flex-1 rounded-lg border border-ink-800 bg-ink-900/60 px-3 py-2 text-center"
              >
                <div className="text-lg font-semibold text-ink-100">{funnel.data.counts[s.id] ?? 0}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-500">{s.label}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Applications (${rows.length})`}>
        {rows.length ? (
          <div className="space-y-2">
            {rows.map((app) => (
              <Row key={app.id} app={app} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink-800 px-6 py-10 text-center text-sm text-ink-400">
            Day 1 asks you to add 15 BD and 15 remote targets as wishlist entries. Do that now — you cannot run a
            30-day sprint against an abstract goal.
          </div>
        )}
      </Section>
    </>
  );
}
