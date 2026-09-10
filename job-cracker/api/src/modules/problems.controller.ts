import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const REVIEW_INTERVALS_DAYS = [1, 3, 7, 16, 35];

@Controller('problems')
export class ProblemsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('pattern') pattern?: string,
    @Query('difficulty') difficulty?: string,
    @Query('week') week?: string,
    @Query('status') status?: string,
  ) {
    const rows = await this.prisma.problem.findMany({
      where: {
        pattern: pattern || undefined,
        difficulty: difficulty || undefined,
        week: week ? Number(week) : undefined,
      },
      orderBy: [{ week: 'asc' }, { pattern: 'asc' }, { difficulty: 'asc' }],
      include: { status: true },
    });
    const filtered = status
      ? rows.filter((r) => (r.status?.status ?? 'todo') === status)
      : rows;
    // Keep the payload small — the list view does not need prompts or solutions.
    return filtered.map((r) => ({
      id: r.id,
      title: r.title,
      pattern: r.pattern,
      difficulty: r.difficulty,
      week: r.week,
      frequency: r.frequency,
      companies: r.companies,
      status: r.status?.status ?? 'todo',
      confidence: r.status?.confidence ?? 0,
      timesSolved: r.status?.timesSolved ?? 0,
      nextReviewAt: r.status?.nextReviewAt ?? null,
    }));
  }

  @Get('patterns')
  async patterns() {
    const rows = await this.prisma.problem.findMany({ include: { status: true } });
    const map = new Map<string, { pattern: string; total: number; solved: number; attempted: number }>();
    for (const r of rows) {
      if (!map.has(r.pattern)) {
        map.set(r.pattern, { pattern: r.pattern, total: 0, solved: 0, attempted: 0 });
      }
      const entry = map.get(r.pattern);
      entry.total++;
      const s = r.status?.status ?? 'todo';
      if (s === 'solved' || s === 'mastered') entry.solved++;
      if (s === 'attempted') entry.attempted++;
    }
    return [...map.values()]
      .map((e) => ({ ...e, mastery: e.total ? Math.round((e.solved / e.total) * 100) : 0 }))
      .sort((a, b) => a.mastery - b.mastery);
  }

  /** Problems whose spaced-repetition review is due (or overdue). */
  @Get('due')
  async due() {
    const rows = await this.prisma.problemStatus.findMany({
      where: { nextReviewAt: { lte: new Date() } },
      include: { problem: true },
      orderBy: { nextReviewAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.problemId,
      title: r.problem.title,
      pattern: r.problem.pattern,
      difficulty: r.problem.difficulty,
      nextReviewAt: r.nextReviewAt,
      confidence: r.confidence,
    }));
  }

  /**
   * A generated assessment set. `mode=timed` mixes difficulties the way a real
   * OA does; `mode=weak` pulls from your lowest-mastery patterns.
   */
  @Get('session')
  async session(@Query('mode') mode = 'timed', @Query('count') count = '3') {
    const n = Math.max(1, Math.min(6, Number(count)));
    const all = await this.prisma.problem.findMany({ include: { status: true } });

    const pick = (pool: typeof all, k: number) => {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, k);
    };

    let chosen: typeof all = [];
    if (mode === 'weak') {
      const patterns = await this.patterns();
      const weakest = patterns.slice(0, 3).map((p) => p.pattern);
      chosen = pick(all.filter((p) => weakest.includes(p.pattern)), n);
    } else if (mode === 'review') {
      const dueIds = (await this.due()).map((d) => d.id);
      const pool = all.filter((p) => dueIds.includes(p.id));
      chosen = pick(pool.length ? pool : all.filter((p) => p.status), n);
    } else if (mode === 'blind') {
      chosen = pick(all, n);
    } else {
      // timed: mirror a real assessment — one easy, then mediums.
      const easy = pick(all.filter((p) => p.difficulty === 'easy'), 1);
      const medium = pick(all.filter((p) => p.difficulty === 'medium'), n - 1);
      chosen = [...easy, ...medium];
    }
    if (chosen.length === 0) chosen = pick(all, n);

    return chosen.map((p) => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      pattern: mode === 'blind' ? 'hidden' : p.pattern,
    }));
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    return this.prisma.problem.findUnique({ where: { id }, include: { status: true } });
  }

  @Post(':id/attempt')
  async attempt(@Param('id') id: string, @Body() body: any) {
    const passed = !!body.passed;
    const attempt = await this.prisma.problemAttempt.create({
      data: {
        problemId: id,
        passed,
        passedCount: body.passedCount ?? 0,
        totalCount: body.totalCount ?? 0,
        durationSec: body.durationSec ?? 0,
        code: body.code ?? '',
      },
    });

    const current = await this.prisma.problemStatus.findUnique({ where: { problemId: id } });
    const timesSolved = (current?.timesSolved ?? 0) + (passed ? 1 : 0);

    let status = current?.status ?? 'todo';
    if (passed) status = timesSolved >= 3 ? 'mastered' : 'solved';
    else if (status === 'todo') status = 'attempted';

    let nextReviewAt = current?.nextReviewAt ?? null;
    if (passed) {
      const step = Math.min(timesSolved - 1, REVIEW_INTERVALS_DAYS.length - 1);
      nextReviewAt = new Date(Date.now() + REVIEW_INTERVALS_DAYS[step] * 86400000);
    }

    await this.prisma.problemStatus.upsert({
      where: { problemId: id },
      create: {
        problemId: id,
        status,
        timesSolved,
        confidence: body.confidence ?? (passed ? 3 : 1),
        bestRuntimeMs: body.runtimeMs ?? null,
        lastSolvedAt: passed ? new Date() : null,
        nextReviewAt,
        savedCode: body.code ?? '',
      },
      update: {
        status,
        timesSolved,
        confidence: body.confidence ?? current?.confidence ?? (passed ? 3 : 1),
        bestRuntimeMs:
          body.runtimeMs && (!current?.bestRuntimeMs || body.runtimeMs < current.bestRuntimeMs)
            ? body.runtimeMs
            : current?.bestRuntimeMs ?? null,
        lastSolvedAt: passed ? new Date() : current?.lastSolvedAt ?? null,
        nextReviewAt,
        savedCode: body.code ?? current?.savedCode ?? '',
      },
    });

    return attempt;
  }

  @Post(':id/save')
  async save(@Param('id') id: string, @Body() body: any) {
    return this.prisma.problemStatus.upsert({
      where: { problemId: id },
      create: { problemId: id, savedCode: body.code ?? '' },
      update: { savedCode: body.code ?? '' },
    });
  }

  @Post(':id/status')
  async setStatus(@Param('id') id: string, @Body() body: any) {
    const data: any = {};
    if (body.status) data.status = body.status;
    if (body.confidence !== undefined) data.confidence = body.confidence;
    return this.prisma.problemStatus.upsert({
      where: { problemId: id },
      create: { problemId: id, ...data },
      update: data,
    });
  }
}
