import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, Stats } from '../lib/api';
import { ErrorBox, Loading, PageHeader, Section, Stat } from '../components/ui';

const AXIS = { stroke: '#4d5b72', fontSize: 11 };
const TOOLTIP = {
  contentStyle: {
    background: '#141922',
    border: '1px solid #252e3c',
    borderRadius: 8,
    fontSize: 12,
    color: '#e6eaf1',
  },
};

export default function Progress() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/stats') });
  const timeline = useQuery({
    queryKey: ['timeline'],
    queryFn: () => api.get<{ date: string; tasks: number; minutes: number; solved: number }[]>('/stats/timeline'),
  });
  const patterns = useQuery({
    queryKey: ['patterns'],
    queryFn: () => api.get<{ pattern: string; mastery: number; total: number; solved: number }[]>('/problems/patterns'),
  });
  const weakTopics = useQuery({
    queryKey: ['quiz-weak'],
    queryFn: () => api.get<{ topic: string; accuracy: number; total: number }[]>('/quiz/weak-topics'),
  });

  if (stats.isLoading) return <Loading />;
  if (stats.error) return <ErrorBox error={stats.error} />;
  const s = stats.data!;

  const radar = [
    { axis: 'Coding / OA', value: s.components.dsa },
    { axis: 'Design', value: s.components.design },
    { axis: 'Recall', value: s.components.recall },
    { axis: 'Narrative', value: s.components.narrative },
    { axis: 'Adherence', value: s.components.plan },
  ];

  const barColor = (v: number) => (v >= 70 ? '#3fb950' : v >= 35 ? '#d29922' : '#f0616d');

  return (
    <>
      <PageHeader
        title="Progress"
        subtitle="Readiness is a coaching signal, not a prediction — but the weighting is the honest one: the online assessment cuts the most people, so it carries the most weight."
        right={
          <div className="text-right">
            <div className="text-3xl font-semibold text-ink-100">{s.readiness}%</div>
            <div className="label">session {s.sessionNumber} of {s.sessionsTotal}</div>
          </div>
        }
      />

      <Section title="Where you stand">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Problems"
            value={`${s.counts.problemsSolved}/${s.counts.problemsTotal}`}
            hint={`${s.counts.problemsMastered} mastered`}
          />
          <Stat label="Quiz accuracy" value={`${s.counts.quizAccuracy}%`} hint={`${s.counts.quizSessions} sessions`} />
          <Stat label="Design attempts" value={s.counts.drillAttempts} hint="Timed and self-scored" />
          <Stat
            label="Plan"
            value={`${s.counts.tasksDone}/${s.counts.tasksTotal}`}
            hint={`${s.counts.applications} applications out`}
          />
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Readiness shape" subtitle="A spiky profile is worse than a lower, even one">
          <div className="card" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="#252e3c" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#9fadc2', fontSize: 11 }} />
                <Radar dataKey="value" stroke="#4f9cf9" fill="#4f9cf9" fillOpacity={0.28} />
                <Tooltip {...TOOLTIP} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Daily output" subtitle="Consistency beats intensity over 30 days">
          <div className="card" style={{ height: 300 }}>
            {timeline.data && timeline.data.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline.data}>
                  <CartesianGrid stroke="#1a212c" />
                  <XAxis dataKey="date" tick={AXIS} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={AXIS} />
                  <Tooltip {...TOOLTIP} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="tasks" name="tasks done" stroke="#4f9cf9" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="solved" name="problems solved" stroke="#3fb950" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-500">
                Two days of activity needed before this chart says anything.
              </div>
            )}
          </div>
        </Section>
      </div>

      <Section title="Pattern mastery" subtitle="Worst first — this is the order to attack them in">
        <div className="card" style={{ height: 380 }}>
          {patterns.data && patterns.data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patterns.data} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid stroke="#1a212c" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={AXIS} />
                <YAxis type="category" dataKey="pattern" tick={{ fill: '#9fadc2', fontSize: 11 }} width={140} />
                <Tooltip {...TOOLTIP} formatter={(v: any) => [`${v}%`, 'mastery']} />
                <Bar dataKey="mastery" radius={[0, 4, 4, 0]}>
                  {patterns.data.map((p) => (
                    <Cell key={p.pattern} fill={barColor(p.mastery)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-500">No data yet.</div>
          )}
        </div>
      </Section>

      {weakTopics.data && weakTopics.data.length > 0 && (
        <Section title="Quiz accuracy by topic" subtitle="Below 60% would hurt you in a deep-dive round">
          <div className="card" style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weakTopics.data} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid stroke="#1a212c" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={AXIS} />
                <YAxis type="category" dataKey="topic" tick={{ fill: '#9fadc2', fontSize: 11 }} width={160} />
                <Tooltip {...TOOLTIP} formatter={(v: any) => [`${v}%`, 'accuracy']} />
                <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                  {weakTopics.data.map((t) => (
                    <Cell key={t.topic} fill={barColor(t.accuracy)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}
    </>
  );
}
