import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  CONTENT_VERSION,
  docs,
  drills,
  plan,
  problems,
  profileSeed,
  quiz,
  skills,
  starPrompts,
} from './content';

/**
 * Idempotent content import, run at boot.
 *
 * Everything the user produces — task progress, attempts, saved code, STAR
 * stories, skill self-ratings, pipeline entries — lives in separate tables and
 * is never written here. Re-seeding is always safe.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly log = new Logger('Seed');

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const force = process.env.RESEED === 'true';
    const meta = await this.prisma.seedMeta.findUnique({ where: { key: 'content' } });
    if (meta?.version === CONTENT_VERSION && !force) {
      this.log.log(`content v${CONTENT_VERSION} already imported`);
      return;
    }

    this.log.log(`importing content v${CONTENT_VERSION}${force ? ' (forced)' : ''}...`);

    await this.seedProfile();
    await this.seedPlan();
    await this.seedProblems();
    await this.seedQuiz();
    await this.seedDrills();
    await this.seedStarPrompts();
    await this.seedSkills();
    await this.seedDocs();

    await this.prisma.seedMeta.upsert({
      where: { key: 'content' },
      create: { key: 'content', version: CONTENT_VERSION },
      update: { version: CONTENT_VERSION, appliedAt: new Date() },
    });

    this.log.log(
      `done — ${plan.length} days, ${problems.length} problems, ${quiz.length} questions, ` +
        `${drills.length} drills, ${skills.length} skills`,
    );
  }

  private async seedProfile() {
    // Create once; never overwrite, because the user edits this.
    const existing = await this.prisma.profile.findUnique({ where: { id: 1 } });
    if (existing) return;
    await this.prisma.profile.create({ data: { id: 1, ...profileSeed } });
  }

  private async seedPlan() {
    for (const day of plan) {
      await this.prisma.planDay.upsert({
        where: { id: day.id },
        create: {
          id: day.id,
          week: day.week,
          title: day.title,
          theme: day.theme,
          focus: day.focus,
          hiringLens: day.hiringLens,
          targetMins: day.targetMins ?? day.tasks.reduce((a, t) => a + t.minutes, 0),
        },
        update: {
          week: day.week,
          title: day.title,
          theme: day.theme,
          focus: day.focus,
          hiringLens: day.hiringLens,
          targetMins: day.targetMins ?? day.tasks.reduce((a, t) => a + t.minutes, 0),
        },
      });

      const keep: string[] = [];
      for (let i = 0; i < day.tasks.length; i++) {
        const task = day.tasks[i];
        const id = `d${day.id}-t${i + 1}`;
        keep.push(id);
        const data = {
          dayId: day.id,
          order: i,
          kind: task.kind,
          title: task.title,
          detail: task.detail ?? '',
          ref: task.ref ?? '',
          minutes: task.minutes,
        };
        await this.prisma.planTask.upsert({ where: { id }, create: { id, ...data }, update: data });
      }

      // A day that lost tasks would otherwise keep orphan rows forever, which
      // both inflates the denominator and shows tasks that no longer exist.
      await this.prisma.planTask.deleteMany({
        where: { dayId: day.id, id: { notIn: keep } },
      });
    }

    await this.prisma.planDay.deleteMany({ where: { id: { notIn: plan.map((d) => d.id) } } });
  }

  private async seedProblems() {
    for (const p of problems) {
      const data = {
        title: p.title,
        pattern: p.pattern,
        difficulty: p.difficulty,
        week: p.week,
        frequency: p.frequency,
        prompt: p.prompt,
        functionName: p.functionName,
        starterCode: p.starterCode,
        hints: p.hints,
        solution: p.solution,
        complexity: p.complexity ?? '',
        companies: p.companies ?? [],
        leetcode: p.leetcode ?? '',
        tests: p.tests as any,
      };
      await this.prisma.problem.upsert({ where: { id: p.id }, create: { id: p.id, ...data }, update: data });
    }
    // Content removed by the author should disappear, along with its attempts.
    await this.prisma.problem.deleteMany({ where: { id: { notIn: problems.map((p) => p.id) } } });
  }

  private async seedQuiz() {
    for (const q of quiz) {
      const data = {
        topic: q.topic,
        phase: q.phase ?? '',
        difficulty: q.difficulty ?? 'medium',
        question: q.question,
        options: q.options,
        answerIndex: q.answerIndex,
        explanation: q.explanation,
        ref: q.ref ?? '',
      };
      await this.prisma.quizQuestion.upsert({ where: { id: q.id }, create: { id: q.id, ...data }, update: data });
    }
    await this.prisma.quizQuestion.deleteMany({ where: { id: { notIn: quiz.map((q) => q.id) } } });
  }

  private async seedDrills() {
    for (const d of drills) {
      const data = {
        title: d.title,
        kind: d.kind,
        difficulty: d.difficulty,
        timeboxMin: d.timeboxMin,
        prompt: d.prompt,
        constraints: d.constraints ?? '',
        rubric: d.rubric as any,
        ref: d.ref ?? '',
      };
      await this.prisma.drill.upsert({ where: { id: d.id }, create: { id: d.id, ...data }, update: data });
    }
    await this.prisma.drill.deleteMany({ where: { id: { notIn: drills.map((d) => d.id) } } });
  }

  private async seedStarPrompts() {
    for (const s of starPrompts) {
      const data = {
        competency: s.competency,
        prompt: s.prompt,
        whatGoodLooksLike: s.whatGoodLooksLike,
        redFlags: s.redFlags,
      };
      await this.prisma.starPrompt.upsert({ where: { id: s.id }, create: { id: s.id, ...data }, update: data });
    }
    await this.prisma.starPrompt.deleteMany({ where: { id: { notIn: starPrompts.map((s) => s.id) } } });
  }

  private async seedSkills() {
    for (const s of skills) {
      // `level` and `note` are the user's, so they are only set on create.
      await this.prisma.skill.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          name: s.name,
          category: s.category,
          demandBD: s.demandBD,
          demandRemote: s.demandRemote,
          assumed: s.assumed,
          why: s.why,
          proveIt: s.proveIt,
          ref: s.ref,
        },
        update: {
          name: s.name,
          category: s.category,
          demandBD: s.demandBD,
          demandRemote: s.demandRemote,
          assumed: s.assumed,
          why: s.why,
          proveIt: s.proveIt,
          ref: s.ref,
        },
      });
    }
    await this.prisma.skill.deleteMany({ where: { id: { notIn: skills.map((s) => s.id) } } });
  }

  private async seedDocs() {
    for (const d of docs) {
      await this.prisma.doc.upsert({
        where: { id: d.id },
        create: { id: d.id, title: d.title, body: d.body },
        update: { title: d.title, body: d.body },
      });
    }
    // Prune like every other seed routine does. Without this, renaming or
    // removing a doc left the old row behind forever — still listed by
    // GET /docs, still readable, permanently stale.
    await this.prisma.doc.deleteMany({ where: { id: { notIn: docs.map((d) => d.id) } } });
  }
}
