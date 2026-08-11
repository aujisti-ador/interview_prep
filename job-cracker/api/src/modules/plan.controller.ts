import { Body, Controller, Get, NotFoundException, Param, Patch, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { intParam, num, oneOf } from '../common/coerce';

const TASK_STATUSES = ['todo', 'doing', 'done'] as const;

@Controller('plan')
export class PlanController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async all() {
    const days = await this.prisma.planDay.findMany({
      orderBy: { id: 'asc' },
      include: { tasks: { orderBy: { order: 'asc' }, include: { progress: true } } },
    });
    return days.map((d) => ({
      ...d,
      done: d.tasks.filter((t) => t.progress?.status === 'done').length,
      total: d.tasks.length,
    }));
  }

  @Get('today')
  async today() {
    const profile = await this.prisma.profile.findUnique({ where: { id: 1 } });
    const start = profile?.startDate ?? new Date();
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const elapsed = Math.floor((now.getTime() - startDay.getTime()) / 86400000);
    const dayId = Math.min(30, Math.max(1, elapsed + 1));

    const day = await this.prisma.planDay.findUnique({
      where: { id: dayId },
      include: { tasks: { orderBy: { order: 'asc' }, include: { progress: true } } },
    });
    return { dayId, elapsedDays: elapsed, day };
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const day = await this.prisma.planDay.findUnique({
      where: { id: intParam(id, 'day id') },
      include: { tasks: { orderBy: { order: 'asc' }, include: { progress: true } } },
    });
    if (!day) throw new NotFoundException(`no such plan day: ${id}`);
    return day;
  }

  @Patch('task/:taskId')
  async updateTask(@Param('taskId') taskId: string, @Body() body: any) {
    // The task must exist: upsert on a bogus id would otherwise fail on the
    // foreign key and surface as a 500 rather than a 404.
    const task = await this.prisma.planTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`no such task: ${taskId}`);

    const status = oneOf(body?.status, 'status', TASK_STATUSES, 'todo');
    const notes = body?.notes === undefined ? undefined : String(body.notes);
    const minutesSpent =
      body?.minutesSpent === undefined
        ? undefined
        : Math.max(0, Math.round(num(body.minutesSpent, 'minutesSpent', 0)));

    const data = {
      status,
      notes,
      minutesSpent,
      completedAt: status === 'done' ? new Date() : null,
    };
    return this.prisma.taskProgress.upsert({
      where: { taskId },
      create: { taskId, ...data, notes: notes ?? '', minutesSpent: minutesSpent ?? 0 },
      update: data,
    });
  }

  @Get('search/tasks')
  async search(@Query('kind') kind?: string) {
    return this.prisma.planTask.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ dayId: 'asc' }, { order: 'asc' }],
      include: { progress: true },
    });
  }
}
