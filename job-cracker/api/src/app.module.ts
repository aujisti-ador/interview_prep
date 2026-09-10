import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SeedService } from './seed.service';
import { PlanController } from './modules/plan.controller';
import { ProblemsController } from './modules/problems.controller';
import { QuizController } from './modules/quiz.controller';
import { DesignController } from './modules/design.controller';
import { BehavioralController } from './modules/behavioral.controller';
import { SkillsController } from './modules/skills.controller';
import { PipelineController } from './modules/pipeline.controller';
import { LibraryController } from './modules/library.controller';
import { MetaController } from './modules/meta.controller';

@Module({
  controllers: [
    PlanController,
    ProblemsController,
    QuizController,
    DesignController,
    BehavioralController,
    SkillsController,
    PipelineController,
    LibraryController,
    MetaController,
  ],
  providers: [PrismaService, SeedService],
})
export class AppModule {}
