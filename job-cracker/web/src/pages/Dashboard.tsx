import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, PlanDay, Skill, Stats } from '../lib/api';
import TaskList from '../components/TaskList';
import { Chip, ErrorBox, Loading, Meter, PageHeader, Section, Stat } from '../components/ui';

const COMPONENT_LABELS: Record<string, { label: string; weight: string; why: string }> = {
  dsa: { label: 'Coding / OA', weight: '30%', why: 'The gate you cannot talk your way through' },
  design: { label: 'System design', weight: '25%', why: 'Decides senior vs lead' },
  recall: { label: 'Rapid recall', weight: '15%', why: 'Deep-dive rounds' },
  narrative: { label: 'Narrative', weight: '15%', why: 'Behavioral and bar raiser' },
  plan: { label: 'Plan adherence', weight: '15%', why: 'Consistency compounds' },
};

export default function Dashboard() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/stats') });
  const today = useQuery({
    queryKey: ['today'],
    queryFn: () => api.get<{ dayId: number; elapsedDays: number; day: PlanDay }>('/plan/today'),
  });
  const due = useQuery({ queryKey: ['due'], queryFn: () => api.get<any[]>('/problems/due') });
  const skills = useQuery({ queryKey: ['skills'], queryFn: () => api.get<Skill[]>('/skills') });

  if (today.isLoading || stats.isLoading) return <Loading />;
  if (today.error) return <ErrorBox error={today.error} />;

  const day = today.data?.day;
  const s = stats.data;
  const done = day?.tasks.filter((t) => t.progress?.status === 'done').length ?? 0;
  const totalMins = day?.tasks.reduce((a, t) => a + t.minutes, 0) ?? 0;

  return (
    <>
      <PageHeader
        title={day ? `Day ${day.id} — ${day.title}` : 'Today'}
        subtitle={day?.theme}
        right={
          s && (
            <div className="text-right">
              <div className="text-3xl font-semibold text-ink-100">{s.readiness}%</div>
              <div className="label">readiness</div>
            </div>
          )
        }
      />

      {day && (
        <>
          <div className="mb-6 rounded-xl border border-accent-dim/40 bg-accent/[0.07] p-5">
            <div className="label mb-1.5 text-accent-soft">What a hiring manager is testing here</div>
            <p className="text-[15px] leading-relaxed text-ink-200">{day.hiringLens}</p>
          </div>

          <Section
            title={`Today's block — ${done}/${day.tasks.length} done`}
            subtitle={`${day.focus} · about ${Math.round(totalMins / 60)}h ${totalMins % 60}m`}
            right={
              <Link to="/plan" className="btn btn-ghost text-xs">
                Full 30-day plan →
              </Link>
            }
          >
            <Meter value={done} max={day.tasks.length} tone={done === day.tasks.length ? 'good' : 'accent'} className="mb-4" />
            <TaskList tasks={day.tasks} />
          </Section>
        </>
      )}

      {s && (
        <Section title="Readiness breakdown" subtitle="Weighted the way the funnel actually cuts people">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(s.components).map(([key, value]) => {
              const meta = COMPONENT_LABELS[key];
              return (
                <div key={key} className="card-tight">
                  <div className="flex items-baseline justify-between">
                    <span className="label">{meta?.label ?? key}</span>
                    <span className="text-[10px] text-ink-500">{meta?.weight}</span>
                  </div>
                  <div className="mt-1 text-xl font-semibold text-ink-100">{value}%</div>
                  <Meter
                    value={value}
                    tone={value >= 70 ? 'good' : value >= 40 ? 'warn' : 'bad'}
                    className="mt-2"
                  />
                  <div className="mt-2 text-[11px] leading-snug text-ink-500">{meta?.why}</div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Due for review"
          subtitle="Spaced repetition — solving once is not learning"
          right={
            <Link to="/practice?mode=review" className="btn btn-ghost text-xs">
              Review →
            </Link>
          }
        >
          {due.data && due.data.length > 0 ? (
            <div className="space-y-1.5">
              {due.data.slice(0, 6).map((p) => (
                <Link
                  key={p.id}
                  to={`/practice/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-900/70 px-4 py-2.5 transition hover:border-ink-600"
                >
                  <span className="text-sm text-ink-100">{p.title}</span>
                  <Chip tone="warn">{p.pattern}</Chip>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-ink-800 bg-ink-900/50 px-4 py-6 text-center text-sm text-ink-500">
              Nothing due. Solve some problems and they will come back on a schedule.
            </div>
          )}
        </Section>

        <Section
          title="Biggest skill gaps"
          subtitle="(market demand − your level) × demand"
          right={
            <Link to="/skills" className="btn btn-ghost text-xs">
              Skills matrix →
            </Link>
          }
        >
          <div className="space-y-1.5">
            {(skills.data ?? []).slice(0, 6).map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-900/70 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink-100">{skill.name}</div>
                  <div className="text-[11px] text-ink-500">
                    demand {skill.demand}/5 · you {skill.level}/5
                    {!skill.rated && ' (assumed)'}
                  </div>
                </div>
                <Chip
                  tone={skill.priority === 'critical' ? 'bad' : skill.priority === 'high' ? 'warn' : 'neutral'}
                >
                  {skill.priority}
                </Chip>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {s && (
        <Section title="At a glance">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Problems solved"
              value={`${s.counts.problemsSolved}/${s.counts.problemsTotal}`}
              hint={`${s.counts.problemsMastered} mastered (3+ clean solves)`}
            />
            <Stat
              label="Quiz accuracy"
              value={`${s.counts.quizAccuracy}%`}
              hint={`${s.counts.quizSessions} sessions`}
            />
            <Stat
              label="Design drills"
              value={s.counts.drillAttempts}
              hint="Timed attempts, self-scored"
            />
            <Stat
              label="Applications out"
              value={s.counts.applications}
              hint={`${s.counts.storiesRehearsed}/7 STAR stories rehearsed`}
            />
          </div>
        </Section>
      )}
    </>
  );
}
