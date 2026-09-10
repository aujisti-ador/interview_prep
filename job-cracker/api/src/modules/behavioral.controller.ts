import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('behavioral')
export class BehavioralController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('prompts')
  async prompts() {
    return this.prisma.starPrompt.findMany({ orderBy: { id: 'asc' } });
  }

  @Get('stories')
  async stories() {
    return this.prisma.starStory.findMany({ orderBy: { createdAt: 'asc' } });
  }

  @Post('stories')
  async create(@Body() body: any) {
    return this.prisma.starStory.create({
      data: {
        promptId: body.promptId ?? null,
        title: body.title ?? 'Untitled story',
        competency: body.competency ?? '',
        situation: body.situation ?? '',
        task: body.task ?? '',
        action: body.action ?? '',
        result: body.result ?? '',
        metrics: body.metrics ?? '',
        tags: body.tags ?? [],
      },
    });
  }

  @Patch('stories/:id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data: any = {};
    for (const key of ['title', 'competency', 'situation', 'task', 'action', 'result', 'metrics']) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.tags !== undefined) data.tags = body.tags;
    if (body.confidence !== undefined) data.confidence = body.confidence;
    if (body.rehearsals !== undefined) data.rehearsals = body.rehearsals;
    return this.prisma.starStory.update({ where: { id }, data });
  }

  @Post('stories/:id/rehearse')
  async rehearse(@Param('id') id: string) {
    return this.prisma.starStory.update({
      where: { id },
      data: { rehearsals: { increment: 1 } },
    });
  }

  @Delete('stories/:id')
  async remove(@Param('id') id: string) {
    await this.prisma.starStory.delete({ where: { id } });
    return { ok: true };
  }
}
