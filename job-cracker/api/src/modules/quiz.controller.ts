import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('quiz')
export class QuizController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('topics')
  async topics() {
    const rows = await this.prisma.quizQuestion.findMany({ select: { topic: true } });
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.topic, (counts.get(r.topic) ?? 0) + 1);
    return [...counts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => a.topic.localeCompare(b.topic));
  }

  /** Returns questions WITHOUT the answer — scoring happens server-side on submit. */
  @Get('session')
  async session(@Query('topic') topic?: string, @Query('count') count = '15') {
    const n = Math.max(1, Math.min(60, Number(count)));
    const pool = await this.prisma.quizQuestion.findMany({
      where: topic ? { topic } : undefined,
    });
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
    return shuffled.map((q) => ({
      id: q.id,
      topic: q.topic,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options,
    }));
  }

  @Post('submit')
  async submit(@Body() body: any) {
    const answers: Record<string, number> = body.answers ?? {};
    const ids = Object.keys(answers);
    const questions = await this.prisma.quizQuestion.findMany({ where: { id: { in: ids } } });

    const detail = questions.map((q) => ({
      id: q.id,
      topic: q.topic,
      question: q.question,
      options: q.options,
      given: answers[q.id],
      correct: q.answerIndex,
      right: answers[q.id] === q.answerIndex,
      explanation: q.explanation,
      ref: q.ref,
    }));
    const score = detail.filter((d) => d.right).length;

    const session = await this.prisma.quizSession.create({
      data: {
        mode: body.mode ?? 'mixed',
        topics: body.topics ?? [],
        total: questions.length,
        score,
        durationSec: body.durationSec ?? 0,
        detail: detail as any,
      },
    });

    return { sessionId: session.id, score, total: questions.length, detail };
  }

  @Get('history')
  async history() {
    return this.prisma.quizSession.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });
  }

  /** Per-topic accuracy across every session — drives the weak-topic list. */
  @Get('weak-topics')
  async weakTopics() {
    const sessions = await this.prisma.quizSession.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    const stats = new Map<string, { topic: string; right: number; total: number }>();
    for (const s of sessions) {
      for (const d of (s.detail as any[]) ?? []) {
        if (!stats.has(d.topic)) stats.set(d.topic, { topic: d.topic, right: 0, total: 0 });
        const e = stats.get(d.topic);
        e.total++;
        if (d.right) e.right++;
      }
    }
    return [...stats.values()]
      .map((e) => ({ ...e, accuracy: e.total ? Math.round((e.right / e.total) * 100) : 0 }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }
}
