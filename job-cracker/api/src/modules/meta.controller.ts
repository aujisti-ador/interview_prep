import { Body, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { date, num } from '../common/coerce';

@Controller()
export class MetaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  health() {
    return { ok: true, ts: new Date().toISOString() };
  }

  @Get('profile')
  async profile() {
    return this.prisma.profile.findUnique({ where: { id: 1 } });
  }

  @Patch('profile')
  async updateProfile(@Body() body: any) {
    const data: any = {};
    for (const key of ['name', 'headline', 'notes']) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    for (const key of ['targetRoles', 'targetMarkets', 'primaryStack']) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.yearsExperience !== undefined) {
      data.yearsExperience = num(body.yearsExperience, 'yearsExperience');
    }
    if (body.dailyMinutesTarget !== undefined) {
      data.dailyMinutesTarget = num(body.dailyMinutesTarget, 'dailyMinutesTarget');
    }
    // `new Date("nonsense")` is an Invalid Date, which Prisma rejects with an
    // opaque error — reject it here instead, naming the field.
    if (body.startDate !== undefined) data.startDate = date(body.startDate, 'startDate');
    return this.prisma.profile.update({ where: { id: 1 }, data });
  }

  @Get('docs')
  async docs() {
    return this.prisma.doc.findMany({ select: { id: true, title: true } });
  }

  @Get('docs/:id')
  async doc(@Param('id') id: string) {
    const doc = await this.prisma.doc.findUnique({ where: { id } });
    // Returning null here made the client render "Not found." with a 200; a
    // real 404 lets react-query treat it as an error like every other page.
    if (!doc) throw new NotFoundException(`no such doc: ${id}`);
    return doc;
  }

  @Post('log')
  async log(@Body() body: any) {
    return this.prisma.studyLog.create({
      data: {
        date: date(body?.date, 'date', new Date()),
        minutes: Math.max(0, Math.round(num(body?.minutes, 'minutes', 0))),
        category: String(body?.category ?? 'theory'),
        note: String(body?.note ?? ''),
      },
    });
  }

  /**
   * The readiness score.
   *
   * Weighted the way the funnel actually cuts people: the online assessment is
   * the biggest single gate, so DSA carries the most weight, then design, then
   * recall, then narrative, then the plan itself. It is a coaching signal, not
   * a prediction — but the weighting is the honest one.
   */
  @Get('stats')
  async stats() {
    const [tasks, problems, quizSessions, drillAttempts, stories, apps, skills, profile] =
      await Promise.all([
        this.prisma.planTask.findMany({ include: { progress: true } }),
        this.prisma.problem.findMany({ include: { status: true } }),
        this.prisma.quizSession.findMany(),
        this.prisma.drillAttempt.findMany(),
        this.prisma.starStory.findMany(),
        this.prisma.application.findMany(),
        this.prisma.skill.findMany(),
        this.prisma.profile.findUnique({ where: { id: 1 } }),
      ]);

    const tasksDone = tasks.filter((t) => t.progress?.status === 'done').length;
    const planPct = tasks.length ? (tasksDone / tasks.length) * 100 : 0;

    const solved = problems.filter((p) => ['solved', 'mastered'].includes(p.status?.status ?? '')).length;
    const mastered = problems.filter((p) => p.status?.status === 'mastered').length;
    // Solving each problem once is the bar; mastery (3x) is worth a bonus.
    const dsaPct = problems.length
      ? Math.min(100, ((solved + mastered * 0.4) / problems.length) * 100)
      : 0;

    const quizAccuracy = quizSessions.length
      ? (quizSessions.reduce((a, s) => a + s.score, 0) /
          Math.max(1, quizSessions.reduce((a, s) => a + s.total, 0))) *
        100
      : 0;
    // Accuracy only counts once you have answered enough to be meaningful.
    const quizVolume = Math.min(1, quizSessions.reduce((a, s) => a + s.total, 0) / 150);
    const quizPct = quizAccuracy * quizVolume;

    const designAvg = drillAttempts.length
      ? (drillAttempts.reduce((a, d) => a + d.totalScore / Math.max(1, d.maxScore), 0) /
          drillAttempts.length) *
        100
      : 0;
    const designVolume = Math.min(1, drillAttempts.length / 12);
    const designPct = designAvg * designVolume;

    const rehearsed = stories.filter((s) => s.rehearsals >= 2).length;
    const narrativePct = Math.min(100, (rehearsed / 7) * 100);

    const readiness = Math.round(
      dsaPct * 0.3 + designPct * 0.25 + quizPct * 0.15 + narrativePct * 0.15 + planPct * 0.15,
    );

    // Position in the plan is measured by what is finished, not by the
    // calendar. A day off should not move you forward past work you have
    // not done. Grouped from `tasks`, which is already loaded with progress.
    const bySession = new Map<number, { total: number; done: number }>();
    for (const t of tasks) {
      const e = bySession.get(t.dayId) ?? { total: 0, done: 0 };
      e.total += 1;
      if (t.progress?.status === 'done') e.done += 1;
      bySession.set(t.dayId, e);
    }
    const sessionsTotal = bySession.size;
    const sessionsDone = [...bySession.values()].filter((e) => e.total > 0 && e.done === e.total).length;
    const currentSession = Math.min(sessionsTotal, sessionsDone + 1);

    const unratedSkills = skills.filter((s) => s.level < 0).length;

    return {
      readiness,
      sessionNumber: currentSession,
      sessionsTotal,
      sessionsDone,
      components: {
        dsa: Math.round(dsaPct),
        design: Math.round(designPct),
        recall: Math.round(quizPct),
        narrative: Math.round(narrativePct),
        plan: Math.round(planPct),
      },
      counts: {
        tasksDone,
        tasksTotal: tasks.length,
        problemsSolved: solved,
        problemsTotal: problems.length,
        problemsMastered: mastered,
        quizSessions: quizSessions.length,
        quizAccuracy: Math.round(quizAccuracy),
        drillAttempts: drillAttempts.length,
        stories: stories.length,
        storiesRehearsed: rehearsed,
        applications: apps.filter((a) => a.status !== 'wishlist').length,
        unratedSkills,
      },
    };
  }

  /** Daily completion series for the progress chart. */
  @Get('stats/timeline')
  async timeline() {
    const progress = await this.prisma.taskProgress.findMany({
      where: { completedAt: { not: null } },
      include: { task: true },
    });
    const byDate = new Map<string, { date: string; tasks: number; minutes: number }>();
    for (const p of progress) {
      const key = p.completedAt.toISOString().slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, { date: key, tasks: 0, minutes: 0 });
      const e = byDate.get(key);
      e.tasks++;
      e.minutes += p.minutesSpent || p.task.minutes;
    }

    const attempts = await this.prisma.problemAttempt.findMany({ where: { passed: true } });
    const solvedByDate = new Map<string, number>();
    for (const a of attempts) {
      const key = a.createdAt.toISOString().slice(0, 10);
      solvedByDate.set(key, (solvedByDate.get(key) ?? 0) + 1);
    }

    const dates = new Set([...byDate.keys(), ...solvedByDate.keys()]);
    return [...dates]
      .sort()
      .map((date) => ({
        date,
        tasks: byDate.get(date)?.tasks ?? 0,
        minutes: byDate.get(date)?.minutes ?? 0,
        solved: solvedByDate.get(date) ?? 0,
      }));
  }
}
