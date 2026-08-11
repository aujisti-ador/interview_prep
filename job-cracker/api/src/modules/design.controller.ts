import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { clamp, num } from '../common/coerce';

@Controller('design')
export class DesignController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('kind') kind?: string) {
    const rows = await this.prisma.drill.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ kind: 'asc' }, { difficulty: 'asc' }],
      include: { attempts: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return rows.map((d) => ({
      id: d.id,
      title: d.title,
      kind: d.kind,
      difficulty: d.difficulty,
      timeboxMin: d.timeboxMin,
      attemptCount: d.attempts.length,
      lastScore: d.attempts[0]
        ? Math.round((d.attempts[0].totalScore / Math.max(1, d.attempts[0].maxScore)) * 100)
        : null,
      lastAttemptAt: d.attempts[0]?.createdAt ?? null,
    }));
  }

  /** Average score per rubric dimension across all attempts — your weakest design habit. */
  @Get('stats/dimensions')
  async dimensions() {
    const attempts = await this.prisma.drillAttempt.findMany({ include: { drill: true } });
    const agg = new Map<string, { id: string; label: string; sum: number; n: number }>();
    for (const a of attempts) {
      const rubric = (a.drill.rubric as any[]) ?? [];
      const scores = (a.scores as Record<string, number>) ?? {};
      for (const item of rubric) {
        if (scores[item.id] === undefined) continue;
        if (!agg.has(item.id)) agg.set(item.id, { id: item.id, label: item.label, sum: 0, n: 0 });
        const e = agg.get(item.id);
        e.sum += Number(scores[item.id]);
        e.n++;
      }
    }
    return [...agg.values()]
      .map((e) => ({ id: e.id, label: e.label, average: e.n ? e.sum / e.n : 0, samples: e.n }))
      .sort((a, b) => a.average - b.average);
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    return this.prisma.drill.findUnique({
      where: { id },
      include: { attempts: { orderBy: { createdAt: 'desc' } } },
    });
  }

  @Post(':id/attempt')
  async attempt(@Param('id') id: string, @Body() body: any) {
    const drill = await this.prisma.drill.findUnique({ where: { id } });
    if (!drill) throw new NotFoundException(`no such drill: ${id}`);

    const rubric = (drill.rubric as any[]) ?? [];
    const scores: Record<string, number> = body?.scores ?? {};

    // Each rubric row is scored 0-3 by the candidate, weighted by its
    // importance. `clamp` rejects a non-numeric score outright rather than
    // letting NaN through into the Int columns, where Prisma would throw.
    let total = 0;
    let max = 0;
    const clean: Record<string, number> = {};
    for (const item of rubric) {
      const given = clamp(scores[item.id], `scores.${item.id}`, 0, 3, 0);
      clean[item.id] = given;
      total += given * item.weight;
      max += 3 * item.weight;
    }

    return this.prisma.drillAttempt.create({
      data: {
        drillId: id,
        notes: String(body?.notes ?? ''),
        scores: clean as any,
        totalScore: total,
        maxScore: max,
        durationMin: Math.max(0, Math.round(num(body?.durationMin, 'durationMin', 0))),
      },
    });
  }
}
