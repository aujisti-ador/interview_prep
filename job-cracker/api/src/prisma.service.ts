import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    let attempts = 0;
    // Postgres can still be finishing startup when the api boots.
    for (;;) {
      try {
        await this.$connect();
        return;
      } catch (err) {
        if (++attempts > 20) throw err;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
