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

  /**
   * The session to work on now.
   *
   * Progress-driven, not calendar-driven: this is the first session with
   * unfinished tasks, wherever you happen to be. Missing a day used to shove
   * you forward past work you had not done, which made the plan a source of
   * guilt rather than a queue. Now the sequence simply waits for you.
   */
  @Get('today')
  async today() {
    const days = await this.prisma.planDay.findMany({
      orderBy: { id: 'asc' },
      include: { tasks: { orderBy: { order: 'asc' }, include: { progress: true } } },
    });

    const isDone = (d: (typeof days)[number]) =>
      d.tasks.length > 0 && d.tasks.every((t) => t.progress?.status === 'done');

    const current = days.find((d) => !isDone(d)) ?? days[days.length - 1];
    const completedSessions = days.filter(isDone).length;

    return {
      dayId: current?.id ?? 1,
      sessionNumber: current?.id ?? 1,
      totalSessions: days.length,
      completedSessions,
      allComplete: completedSessions === days.length,
      day: current,
    };
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
