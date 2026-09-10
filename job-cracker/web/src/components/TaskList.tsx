import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, PlanTask } from '../lib/api';
import { Chip } from './ui';

const STATUS_LABEL: Record<string, string> = {
  todo: 'To do. Activate to mark in progress.',
  doing: 'In progress. Activate to mark done.',
  done: 'Done. Activate to reset to to do.',
};

const KIND_TONE: Record<string, 'accent' | 'good' | 'warn' | 'bad' | 'neutral'> = {
  dsa: 'accent',
  design: 'warn',
  read: 'neutral',
  quiz: 'neutral',
  behavioral: 'good',
  mock: 'bad',
  admin: 'neutral',
  project: 'good',
};

/** Turns a task `ref` into either an in-app route or a link into the repo docs. */
function TaskRef({ task }: { task: PlanTask }) {
  const ref = task.ref;
  if (!ref) return null;

  if (ref.endsWith('.md')) {
    return (
      <Link
        to={`/library/${ref}`}
        className="text-[11px] text-accent-soft hover:underline"
        title={`Read ${ref} in the Library`}
      >
        read: {ref.split('/').pop()!.replace(/^\d+[a-z]?-/, '').replace(/\.md$/, '')} →
      </Link>
    );
  }

  const route = ref.startsWith('design/')
    ? `/${ref}`
    : ref.startsWith('practice')
      ? `/practice?${ref.split('?')[1] ?? ''}`
      : ref.startsWith('quiz')
        ? `/quiz?${ref.split('?')[1] ?? ''}`
        : ref === 'market'
          ? '/doc/market-analysis'
          : ref.startsWith('playbook')
            ? '/doc/playbook'
            : `/${ref}`;

  return (
    <Link to={route} className="text-[11px] text-accent-soft hover:underline">
      open →
    </Link>
  );
}

export function TaskRow({ task }: { task: PlanTask }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(task.progress?.notes ?? '');
  const status = task.progress?.status ?? 'todo';

  const update = useMutation({
    mutationFn: (body: any) => api.patch(`/plan/task/${task.id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan'] });
      qc.invalidateQueries({ queryKey: ['today'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const cycle = () => {
    const next = status === 'done' ? 'todo' : status === 'doing' ? 'done' : 'doing';
    update.mutate({ status: next, notes });
  };

  return (
    <div
      className={`rounded-lg border px-4 py-3 transition ${
        status === 'done' ? 'border-ink-850 bg-ink-900/40' : 'border-ink-800 bg-ink-900/70'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={cycle}
          aria-label={`${task.title} — ${STATUS_LABEL[status]}`}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] transition ${
            status === 'done'
              ? 'border-good bg-good/20 text-good'
              : status === 'doing'
                ? 'border-warn bg-warn/20 text-warn'
                : 'border-ink-600 hover:border-ink-400'
          }`}
        >
          {status === 'done' ? '✓' : status === 'doing' ? '•' : ''}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={KIND_TONE[task.kind] ?? 'neutral'}>{task.kind}</Chip>
            <span
              className={`text-sm font-medium ${status === 'done' ? 'text-ink-500 line-through' : 'text-ink-100'}`}
            >
              {task.title}
            </span>
            <span className="text-[11px] text-ink-500">{task.minutes}m</span>
            <TaskRef task={task} />
          </div>

          {task.detail && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{task.detail}</p>}

          {update.isError && (
            <p role="alert" className="mt-1.5 text-[11px] text-bad">
              Could not save — the change was not recorded. Is the API running?
            </p>
          )}

          {open ? (
            <div className="mt-3">
              <textarea
                className="input h-20 resize-y font-mono text-xs"
                aria-label={`Notes for "${task.title}"`}
                placeholder="What went well, what did not, what to revisit…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <button
                  className="btn btn-primary py-1 text-xs"
                  onClick={() => {
                    update.mutate({ status, notes });
                    setOpen(false);
                  }}
                >
                  Save note
                </button>
                <button className="btn btn-ghost py-1 text-xs" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="mt-1.5 text-[11px] text-ink-500 hover:text-ink-300"
              onClick={() => setOpen(true)}
            >
              {task.progress?.notes ? `note: ${task.progress.notes.slice(0, 60)}…` : '+ add note'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TaskList({ tasks }: { tasks: PlanTask[] }) {
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}
