import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('skills')
export class SkillsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `market` picks which demand column drives the gap score.
   * gap = (demand - level) * demand, so a weak high-demand skill outranks a
   * weak niche one. That ordering IS the study priority.
   */
  @Get()
  async list(@Query('market') market = 'remote') {
    const rows = await this.prisma.skill.findMany({ orderBy: { category: 'asc' } });
    return rows.map((s) => {
      const demand = market === 'bd' ? s.demandBD : s.demandRemote;
      const level = s.level >= 0 ? s.level : s.assumed;
      const gap = Math.max(0, demand - level) * demand;
      return {
        ...s,
        demand,
        level,
        rated: s.level >= 0,
        gap,
        priority: gap >= 12 ? 'critical' : gap >= 6 ? 'high' : gap > 0 ? 'medium' : 'ok',
      };
    }).sort((a, b) => b.gap - a.gap);
  }

  @Get('summary')
  async summary(@Query('market') market = 'remote') {
    const rows = await this.list(market);
    const byCategory = new Map<string, { category: string; demand: number; level: number; n: number }>();
    for (const r of rows) {
      if (!byCategory.has(r.category)) {
        byCategory.set(r.category, { category: r.category, demand: 0, level: 0, n: 0 });
      }
      const e = byCategory.get(r.category);
      e.demand += r.demand;
      e.level += r.level;
      e.n++;
    }
    const categories = [...byCategory.values()].map((e) => ({
      category: e.category,
      avgDemand: +(e.demand / e.n).toFixed(2),
      avgLevel: +(e.level / e.n).toFixed(2),
    }));
    return {
      categories,
      topGaps: rows.slice(0, 5).map((r) => ({ id: r.id, name: r.name, gap: r.gap, priority: r.priority })),
      ratedCount: rows.filter((r) => r.rated).length,
      total: rows.length,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data: any = {};
    if (body.level !== undefined) data.level = Math.max(0, Math.min(5, Number(body.level)));
    if (body.note !== undefined) data.note = body.note;
    return this.prisma.skill.update({ where: { id }, data });
  }
}
