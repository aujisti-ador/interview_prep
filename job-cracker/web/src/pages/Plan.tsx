import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, PlanDay, Stats } from '../lib/api';
import TaskList from '../components/TaskList';
import { Chip, ErrorBox, Loading, Meter, PageHeader } from '../components/ui';

const WEEK_THEMES: Record<number, string> = {
  1: 'Foundations, pattern ramp-up, and getting the paperwork out of the way',
  2: 'Data, APIs and event-driven depth — plus the first timed assessment',
  3: 'Graphs, DP, infrastructure and the hard-mode checkpoint',
  4: 'Weak-pattern surgery, architect-level scenarios, full mock loop',
  5: 'Company-specific prep, negotiation, taper and launch',
};

export default function Plan() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['plan'],
    queryFn: () => api.get<PlanDay[]>('/plan'),
  });
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/stats') });
  const [openDay, setOpenDay] = useState<number | null>(stats.data?.dayNumber ?? 1);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const days = data ?? [];
  const weeks = [...new Set(days.map((d) => d.week))].sort();
  const totalDone = days.reduce((a, d) => a + (d.done ?? 0), 0);
  const totalTasks = days.reduce((a, d) => a + (d.total ?? 0), 0);
  const currentDay = stats.data?.dayNumber ?? 1;

  return (
    <>
      <PageHeader
        title="The 30-day plan"
        subtitle="Retrieval and drilling under time, not first-pass learning. Every task links to the material it draws on."
        right={
          <div className="text-right">
            <div className="text-2xl font-semibold text-ink-100">
              {totalDone}/{totalTasks}
            </div>
            <div className="label">tasks complete</div>
          </div>
        }
      />

      <Meter value={totalDone} max={totalTasks} className="mb-8" />

      {weeks.map((week) => {
        const weekDays = days.filter((d) => d.week === week);
        const wDone = weekDays.reduce((a, d) => a + (d.done ?? 0), 0);
        const wTotal = weekDays.reduce((a, d) => a + (d.total ?? 0), 0);

        return (
          <section key={week} className="mb-10">
            <div className="mb-3 flex items-end justify-between gap-4 border-b border-ink-850 pb-2">
              <div>
                <h2 className="text-base font-semibold text-ink-100">
                  Week {week}
                  <span className="ml-3 text-sm font-normal text-ink-500">
                    days {weekDays[0]?.id}–{weekDays[weekDays.length - 1]?.id}
                  </span>
                </h2>
                <p className="mt-0.5 text-sm text-ink-400">{WEEK_THEMES[week]}</p>
              </div>
              <span className="whitespace-nowrap text-sm text-ink-400">
                {wDone}/{wTotal}
              </span>
            </div>

            <div className="space-y-2">
              {weekDays.map((day) => {
                const isOpen = openDay === day.id;
                const complete = (day.done ?? 0) === (day.total ?? 0) && (day.total ?? 0) > 0;
                return (
                  <div
                    key={day.id}
                    className={`overflow-hidden rounded-xl border transition ${
                      isOpen ? 'border-accent-dim/60 bg-ink-900' : 'border-ink-800 bg-ink-900/60'
                    }`}
                  >
                    <button
                      onClick={() => setOpenDay(isOpen ? null : day.id)}
                      className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-ink-850/60"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                          complete
                            ? 'bg-good/20 text-good'
                            : day.id === currentDay
                              ? 'bg-accent/20 text-accent-soft'
                              : 'bg-ink-800 text-ink-400'
                        }`}
                      >
                        {day.id}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-ink-100">{day.title}</span>
                          {day.id === currentDay && <Chip tone="accent">today</Chip>}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-500">{day.theme}</span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-500">
                        {day.done}/{day.total}
                      </span>
                      <span className="w-16 shrink-0">
                        <Meter value={day.done ?? 0} max={day.total ?? 1} tone={complete ? 'good' : 'accent'} />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-ink-850 px-5 py-4">
                        <div className="mb-4 rounded-lg border border-ink-800 bg-ink-950/60 p-4">
                          <div className="label mb-1 text-accent-soft">Hiring lens</div>
                          <p className="text-[13px] leading-relaxed text-ink-300">{day.hiringLens}</p>
                          <div className="label mb-1 mt-3">Focus</div>
                          <p className="text-[13px] leading-relaxed text-ink-300">{day.focus}</p>
                        </div>
                        <TaskList tasks={day.tasks} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
