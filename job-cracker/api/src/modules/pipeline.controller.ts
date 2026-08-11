import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export const PIPELINE_STAGES = [
  'wishlist',
  'applied',
  'screen',
  'oa',
  'tech',
  'design',
  'final',
  'offer',
  'rejected',
] as const;

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.application.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  @Get('funnel')
  async funnel() {
    const rows = await this.prisma.application.findMany();
    const counts: Record<string, number> = {};
    for (const stage of PIPELINE_STAGES) counts[stage] = 0;
    for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;

    const applied = rows.filter((r) => r.status !== 'wishlist').length;
    const reachedTech = rows.filter((r) => ['tech', 'design', 'final', 'offer'].includes(r.status)).length;
    return {
      counts,
      total: rows.length,
      applied,
      active: rows.filter((r) => !['rejected', 'offer', 'wishlist'].includes(r.status)).length,
      responseRate: applied ? Math.round((rows.filter((r) => r.status !== 'applied' && r.status !== 'wishlist').length / applied) * 100) : 0,
      techRate: applied ? Math.round((reachedTech / applied) * 100) : 0,
    };
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.application.create({
      data: {
        company: body.company ?? 'Unknown',
        role: body.role ?? 'Senior Backend Engineer',
        market: body.market ?? 'remote',
        source: body.source ?? '',
        status: body.status ?? 'wishlist',
        compNote: body.compNote ?? '',
        nextAction: body.nextAction ?? '',
        link: body.link ?? '',
        appliedAt: body.status && body.status !== 'wishlist' ? new Date() : null,
      },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data: any = {};
    for (const key of ['company', 'role', 'market', 'source', 'status', 'compNote', 'nextAction', 'link']) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.status && body.status !== 'wishlist') {
      const existing = await this.prisma.application.findUnique({ where: { id } });
      if (!existing?.appliedAt) data.appliedAt = new Date();
    }
    return this.prisma.application.update({ where: { id }, data });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.application.delete({ where: { id } });
    return { ok: true };
  }
}
