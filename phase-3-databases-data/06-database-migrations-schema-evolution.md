# Database Migrations & Schema Evolution — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with practical TypeScript, Node.js, and NestJS code examples
> **Goal:** Confidently answer any database migration or schema evolution question in a senior backend interview

## Table of Contents
1. [What Are Database Migrations & Why They Matter](#q1-what-are-database-migrations--why-they-matter)
2. [Prisma Migrate](#q2-prisma-migrate)
3. [TypeORM Migrations](#q3-typeorm-migrations)
4. [Knex.js Migrations](#q4-knexjs-migrations)
5. [Zero-Downtime Migrations (Critical for Senior/Lead)](#q5-zero-downtime-migrations-critical-for-seniorlead)
6. [Schema Versioning & Change Management](#q6-schema-versioning--change-management)
7. [Data Backfill Strategies](#q7-data-backfill-strategies)
8. [Handling Breaking Schema Changes](#q8-handling-breaking-schema-changes)
9. [Migration Testing](#q9-migration-testing)
10. [Prisma vs TypeORM vs Knex — Comparison](#q10-prisma-vs-typeorm-vs-knex--comparison)
11. [Common Interview Scenarios](#q11-common-interview-scenarios)
12. [Quick Reference](#quick-reference)

---

## Q1: What Are Database Migrations & Why They Matter

### Q: What are database migrations, and why are they critical in a production environment?

**Answer:**

Database migrations are **version-controlled changes to your database schema**. They allow you to evolve your database structure over time in a predictable, repeatable, and auditable way — just like version control for your application code.

**Why migrations matter for teams:**

| Benefit | Explanation |
|---------|-------------|
| **Reproducible environments** | Dev, staging, and production all stay in sync — anyone can spin up a database that matches production schema |
| **Rollback capability** | If a schema change causes issues, you can revert to the previous state |
| **Audit trail** | Every schema change is tracked with a timestamp, author, and description |
| **CI/CD integration** | Migrations run automatically as part of your deployment pipeline |
| **Team collaboration** | No more "Hey, can you run this SQL on production?" — schema changes go through code review |

**The golden rule:** "If it's not in a migration file, it didn't happen."

### Q: What is the structure of a migration file?

**Answer:**

Every migration consists of two operations:

- **Up migration (apply):** Defines the schema change to apply (e.g., create a table, add a column)
- **Down migration (rollback):** Reverses the up migration (e.g., drop the table, remove the column)

**Migration file naming conventions** use timestamps to ensure uniqueness and ordering:

```
20260313_001_create_users.sql
20260313_002_add_orders_table.sql
20260314_001_add_username_to_users.sql
```

The timestamp-based approach prevents conflicts when multiple developers create migrations on different branches — unlike sequential numbering (001, 002, 003) which would cause collisions.

### Q: Interview tip — "Have you ever dealt with a production migration that went wrong?"

**Answer:**

> "Yes. We had a migration that added a NOT NULL column to a table with 50 million rows. The ALTER TABLE acquired an ACCESS EXCLUSIVE lock and blocked all reads and writes for several minutes. We learned the hard way to always use the expand-contract pattern: first add the column as nullable, backfill in batches, then add the NOT NULL constraint with NOT VALID to avoid scanning the entire table under a lock. Now every migration PR requires a downtime risk assessment."

This shows real experience. Interviewers love hearing about production incidents and what you learned.

---

## Q2: Prisma Migrate

### Q: How do Prisma migrations work? Walk me through the workflow.

**Answer:**

Prisma uses a **schema-first** approach. You edit `schema.prisma`, and Prisma generates the corresponding SQL migration files. The key insight is that migration files are plain SQL — you can review and edit them before applying.

**Migration history** is tracked in the `_prisma_migrations` table in your database.

**Step 1: Define your schema**

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Order {
  id        String      @id @default(uuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  total     Decimal     @db.Decimal(10, 2)
  status    OrderStatus @default(PENDING)
  createdAt DateTime    @default(now())
}

enum Role {
  USER
  ADMIN
  MODERATOR
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

**Step 2: Generate and apply migration**

```bash
# Create and apply a new migration (development)
npx prisma migrate dev --name add_users_and_orders

# This generates: prisma/migrations/20260313120000_add_users_and_orders/migration.sql
```

The generated SQL looks like:

```sql
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'MODERATOR');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### Q: What are the key Prisma migration commands?

**Answer:**

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npx prisma migrate dev --name <name>` | Create & apply migration | **Development only** — also regenerates Prisma Client |
| `npx prisma migrate deploy` | Apply pending migrations | **Production / CI** — does not regenerate client |
| `npx prisma migrate reset` | Drop DB, re-apply all migrations, run seed | **Development only** — destroys all data! |
| `npx prisma migrate diff` | Show SQL diff between two schema states | Reviewing changes before creating migration |
| `npx prisma db push` | Push schema without creating a migration file | **Prototyping only** — no migration history |
| `npx prisma migrate status` | Show migration status | Check which migrations are pending |

### Q: How do you handle data migrations in Prisma?

**Answer:**

Prisma migration files are SQL, so you can add custom data migration statements directly:

```sql
-- prisma/migrations/20260313_add_username/migration.sql

-- Step 1: Add nullable column (safe, no lock)
ALTER TABLE "User" ADD COLUMN "username" VARCHAR(100);

-- Step 2: Backfill data
UPDATE "User" SET "username" = LOWER(REPLACE("name", ' ', '_')) WHERE "username" IS NULL;

-- Step 3: Add unique constraint
ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE ("username");
```

### Q: How do you integrate Prisma migrations in CI/CD?

**Answer:**

```yaml
# .github/workflows/deploy.yml
- name: Run database migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Seeding** is handled via `prisma/seed.ts`:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

```json
// package.json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## Q3: TypeORM Migrations

### Q: How do TypeORM migrations work? What approaches are available?

**Answer:**

TypeORM supports two approaches:

- **Code-first:** Define entities with decorators, auto-generate migration from entity diff
- **Migration-first:** Write migration classes manually

Migration files are TypeScript/JavaScript classes that implement `MigrationInterface` and use `QueryRunner` for SQL execution.

### Q: Show me a complete TypeORM migration example.

**Answer:**

```typescript
// Generate migration from entity changes:
// npx typeorm migration:generate -n CreateUsersTable -d src/data-source.ts

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateUsersTable1709300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for PostgreSQL
    await queryRunner.query(`
      CREATE TYPE "user_role" AS ENUM ('user', 'admin', 'moderator')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['user', 'admin', 'moderator'],
            default: "'user'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
      true, // ifNotExists
    );

    // Create index for faster email lookups
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_email',
        columnNames: ['email'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_users_email');
    await queryRunner.dropTable('users');
    await queryRunner.query(`DROP TYPE "user_role"`);
  }
}
```

### Q: What are the key TypeORM migration commands?

**Answer:**

| Command | Purpose |
|---------|---------|
| `typeorm migration:create -n MigrationName` | Create an empty migration file |
| `typeorm migration:generate -n MigrationName -d src/data-source.ts` | Auto-generate migration from entity diff |
| `typeorm migration:run -d src/data-source.ts` | Apply all pending migrations |
| `typeorm migration:revert -d src/data-source.ts` | Rollback the last executed migration |
| `typeorm migration:show -d src/data-source.ts` | Show all migrations and their status |

### Q: Why should you never use `synchronize: true` in production?

**Answer:**

`synchronize: true` automatically applies schema changes by comparing entities to the current database schema. This is **extremely dangerous in production** because:

1. It can **drop columns** if you remove a field from an entity — data loss!
2. It can **drop tables** if you remove an entity — catastrophic data loss!
3. There is **no rollback** — changes are applied immediately with no migration history
4. There is **no review process** — schema changes bypass code review

```typescript
// data-source.ts
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Order],
  migrations: ['src/migrations/*.ts'],

  // NEVER in production!
  synchronize: process.env.NODE_ENV === 'development',

  // Production: use migrations
  migrationsRun: process.env.NODE_ENV === 'production',
});
```

### Q: How do you safely add a column with a default value in TypeORM?

**Answer:**

```typescript
export class AddUsernameToUsers1709400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add nullable column (no table lock on PostgreSQL)
    await queryRunner.addColumn('users', new TableColumn({
      name: 'username',
      type: 'varchar',
      length: '100',
      isNullable: true,  // Start nullable to avoid locking
    }));

    // Step 2: Backfill existing rows in batches
    await queryRunner.query(`
      UPDATE users SET username = LOWER(REPLACE(name, ' ', '_'))
      WHERE username IS NULL
    `);

    // Step 3: Now make it NOT NULL (only if all rows have a value)
    await queryRunner.changeColumn('users', 'username', new TableColumn({
      name: 'username',
      type: 'varchar',
      length: '100',
      isNullable: false,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'username');
  }
}
```

---

## Q4: Knex.js Migrations

### Q: How does Knex handle migrations? Show me the full workflow.

**Answer:**

Knex is a SQL query builder with built-in migration support. Unlike Prisma (schema-first) or TypeORM (entity-first), Knex migrations are **hand-written** — giving you full control over the SQL.

**Configuration:**

```typescript
// knexfile.ts
import type { Knex } from 'knex';

const config: Record<string, Knex.Config> = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
    },
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
  },
};

export default config;
```

**Migration file:**

```typescript
// migrations/20260313_create_orders.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.decimal('total', 10, 2).notNullable();
    table
      .enu('status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
      .defaultTo('pending');
    table.timestamps(true, true); // created_at and updated_at with defaults
    table.index(['user_id', 'status']); // Composite index for common query pattern
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('orders');
}
```

### Q: What are the key Knex migration commands?

**Answer:**

| Command | Purpose |
|---------|---------|
| `knex migrate:make migration_name` | Create a new migration file |
| `knex migrate:latest` | Apply all pending migrations |
| `knex migrate:rollback` | Revert the last **batch** of migrations |
| `knex migrate:rollback --all` | Revert all migrations |
| `knex migrate:up` | Apply the next pending migration only |
| `knex migrate:down` | Revert the last applied migration only |
| `knex migrate:status` | Show which migrations are pending |
| `knex migrate:list` | List completed and pending migrations |

### Q: What is the Knex batch system?

**Answer:**

When you run `knex migrate:latest`, all pending migrations are applied together as a single **batch**. When you run `knex migrate:rollback`, it reverts the **entire last batch** — not just one migration.

This is useful because related migrations (e.g., create users table + create orders table) are rolled back together, maintaining consistency.

```
Batch 1: create_users, create_orders      (applied together)
Batch 2: add_username_to_users            (applied later)

knex migrate:rollback → reverts Batch 2 only (add_username_to_users)
knex migrate:rollback → reverts Batch 1 (create_users + create_orders)
```

### Q: How do you handle seeding in Knex?

**Answer:**

```typescript
// seeds/01_users.ts
import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Idempotent: delete existing entries, then insert
  await knex('users').del();
  await knex('users').insert([
    { id: knex.fn.uuid(), email: 'admin@example.com', name: 'Admin', role: 'admin' },
    { id: knex.fn.uuid(), email: 'user@example.com', name: 'Test User', role: 'user' },
  ]);
}
```

```bash
knex seed:make seed_name   # Create seed file
knex seed:run              # Run all seeds
```

---

## Q5: Zero-Downtime Migrations (Critical for Senior/Lead)

### Q: What is the biggest risk of running migrations in production?

**Answer:**

The biggest risk is **table locking**. When you run `ALTER TABLE`, PostgreSQL may acquire an **ACCESS EXCLUSIVE** lock on the table, which blocks ALL reads and writes. On a large table, this can take minutes — causing downtime.

### Q: What is the Expand-Contract Pattern?

**Answer:**

The expand-contract pattern (also called parallel change) is the **gold standard** for zero-downtime schema changes. It breaks a dangerous migration into safe, incremental steps:

```
Phase 1 — EXPAND: Add new column (nullable or with default)
  ALTER TABLE users ADD COLUMN username VARCHAR(100);
  -- PostgreSQL adds nullable columns instantly (no table rewrite)

Phase 2 — MIGRATE DATA: Backfill new column in batches
  UPDATE users SET username = LOWER(REPLACE(name, ' ', '_'))
  WHERE username IS NULL
  LIMIT 1000;
  -- Repeat until all rows are updated

Phase 3 — TRANSITION: Deploy code that writes to BOTH old and new columns
  -- Application reads from new column, writes to both
  -- This ensures no data is lost during the transition

Phase 4 — CONTRACT: Remove old column
  ALTER TABLE users DROP COLUMN old_column;
  -- Only after all reads use the new column
```

### Q: Which PostgreSQL operations are safe vs dangerous?

**Answer:**

**Safe operations (no lock or minimal lock):**

| Operation | Why It's Safe |
|-----------|---------------|
| `ADD COLUMN` (nullable, no default) | No table rewrite needed |
| `ADD COLUMN` with `DEFAULT` (PostgreSQL 11+) | Default stored in catalog, not written to rows |
| `CREATE INDEX CONCURRENTLY` | Builds index without blocking writes |
| `ADD CONSTRAINT ... NOT VALID` | Validates new rows only, no table scan |
| `DROP COLUMN` | Marks column invisible; VACUUM reclaims later |
| `RENAME TABLE` | Metadata change only |

**Dangerous operations (locks table, causes downtime):**

| Operation | Why It's Dangerous |
|-----------|-------------------|
| `ADD COLUMN` with `DEFAULT` (PostgreSQL < 11) | Rewrites entire table |
| `ALTER COLUMN TYPE` | Rewrites entire table to convert data |
| `CREATE INDEX` (without `CONCURRENTLY`) | Acquires `SHARE` lock, blocks writes |
| `ADD NOT NULL` constraint | Scans entire table to verify no nulls |
| `RENAME COLUMN` | Safe for DB, but breaks app if not coordinated |
| `ALTER COLUMN SET NOT NULL` | Full table scan under lock |

### Q: How do you batch a data backfill to avoid locking?

**Answer:**

```typescript
// Batch backfill to avoid long transactions and excessive locking
async function backfillUsernames(
  knex: Knex,
  batchSize = 1000,
): Promise<number> {
  let totalUpdated = 0;

  while (true) {
    const result = await knex.raw(`
      WITH batch AS (
        SELECT id
        FROM users
        WHERE username IS NULL
        ORDER BY id
        LIMIT ?
        FOR UPDATE SKIP LOCKED
      )
      UPDATE users u
      SET username = LOWER(REPLACE(u.name, ' ', '_'))
      FROM batch
      WHERE u.id = batch.id
    `, [batchSize]);

    const updated = result.rowCount ?? 0;
    if (updated === 0) break;

    totalUpdated += updated;
    console.log(`Backfilled ${totalUpdated} rows so far...`);

    // Throttle to avoid hammering the database
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`Backfill complete: ${totalUpdated} rows updated`);
  return totalUpdated;
}
```

**Key techniques:**
- **Small batches** prevent long-running transactions
- **`FOR UPDATE SKIP LOCKED`** avoids blocking concurrent operations
- **Sleep between batches** gives the database breathing room
- **Progress logging** so you can monitor the backfill

### Q: How would you add a NOT NULL column to a table with 100M rows without downtime?

**Answer:**

This is a classic senior/lead interview question. Here is the step-by-step approach:

```sql
-- Step 1: Add nullable column (instant, no lock)
ALTER TABLE users ADD COLUMN username VARCHAR(100);

-- Step 2: Backfill in batches (see backfill function above)
-- Run as a background job, not in the migration itself

-- Step 3: Add NOT NULL constraint without validating existing rows
ALTER TABLE users ADD CONSTRAINT users_username_not_null
  CHECK (username IS NOT NULL) NOT VALID;
-- This only validates NEW rows — no table scan

-- Step 4: Validate the constraint in the background (after backfill is complete)
ALTER TABLE users VALIDATE CONSTRAINT users_username_not_null;
-- This acquires a SHARE UPDATE EXCLUSIVE lock (allows reads and writes)
-- but does scan the table — run during low traffic
```

**Use feature flags** to deploy code that supports both old and new schema. Toggle the feature flag to switch reads from the old column to the new column once backfill is verified.

---

## Q6: Schema Versioning & Change Management

### Q: How is schema version tracking handled across different tools?

**Answer:**

All major migration tools track applied migrations in a database table:

| Tool | Tracking Table | What's Stored |
|------|----------------|---------------|
| Prisma | `_prisma_migrations` | Migration name, checksum, timestamp, applied status |
| TypeORM | `migrations` | Migration name, timestamp |
| Knex | `knex_migrations` | Migration name, batch number, timestamp |
| Flyway | `flyway_schema_history` | Version, description, checksum, execution time |

Flyway-style naming uses version prefixes: `V1__create_users.sql`, `V2__add_orders.sql`. Most Node.js tools use timestamps instead.

### Q: Two developers created migrations on different branches. How do you handle conflicts?

**Answer:**

**Problem:** Developer A creates `20260313_100000_add_email_verification.ts` on branch `feature-a`, and Developer B creates `20260313_100001_add_phone_number.ts` on branch `feature-b`. Both get merged to main.

**Solutions:**

1. **Timestamp-based naming** (default in Prisma, Knex, TypeORM) prevents naming collisions
2. **CI check:** Add a pipeline step that detects conflicting migrations that modify the same table
3. **Migration ordering:** Since both tools and databases apply migrations in chronological order, timestamp naming naturally resolves ordering
4. **If conflicts exist:** Merge the migrations on a staging environment, test thoroughly, then merge to main

```yaml
# CI: Detect migration conflicts
- name: Check for migration conflicts
  run: |
    MIGRATION_COUNT=$(ls migrations/ | wc -l)
    npx knex migrate:latest
    APPLIED=$(npx knex migrate:status | grep 'up' | wc -l)
    if [ "$MIGRATION_COUNT" != "$APPLIED" ]; then
      echo "Migration conflict detected!"
      exit 1
    fi
```

### Q: What should the schema change review process look like?

**Answer:**

Every migration should be reviewed in a PR, just like application code. The review checklist:

1. **Lock analysis:** Will this migration acquire dangerous locks? How long will they be held?
2. **Data loss risk:** Could this migration lose data? Is there a backup plan?
3. **Backward compatibility:** Can the old application code still work with the new schema? (Important for blue-green deployments)
4. **Rollback plan:** Is the down migration correct? Has it been tested?
5. **Performance impact:** On a table with N million rows, how long will this take?
6. **Index impact:** Are new indexes needed? Are they created with `CONCURRENTLY`?

**Documentation for major schema changes:**

- Include an **ADR (Architecture Decision Record)** for significant schema changes
- **ERD diagrams** auto-generated from the schema (tools like `prisma-erd-generator`)
- Migration **rollback plan** in the PR description

---

## Q7: Data Backfill Strategies

### Q: When do you need data backfills?

**Answer:**

Common scenarios requiring backfills:

- **Adding computed columns** (e.g., `full_name` derived from `first_name` + `last_name`)
- **Splitting or merging tables** (e.g., extracting `addresses` from `users`)
- **Changing data formats** (e.g., storing phone numbers with country code)
- **Populating new required fields** (e.g., adding `username` to existing users)
- **Denormalization** (e.g., caching `order_count` on the users table)

### Q: What is a safe pattern for backfilling data?

**Answer:**

```typescript
// Pattern: Batch update with cursor-based pagination and progress tracking
async function backfillInBatches(
  knex: Knex,
  tableName: string,
  updateExpression: string,
  batchSize = 500,
): Promise<number> {
  let totalUpdated = 0;
  let lastId = '';

  while (true) {
    const result = await knex.raw(`
      WITH batch AS (
        SELECT id FROM "${tableName}"
        WHERE needs_backfill = true AND id > ?
        ORDER BY id
        LIMIT ?
      )
      UPDATE "${tableName}" t
      SET ${updateExpression}, needs_backfill = false
      FROM batch
      WHERE t.id = batch.id
      RETURNING t.id
    `, [lastId, batchSize]);

    if (result.rows.length === 0) break;

    totalUpdated += result.rows.length;
    lastId = result.rows[result.rows.length - 1].id;

    const remaining = await knex(tableName)
      .where('needs_backfill', true)
      .count('* as count')
      .first();
    console.log(
      `Backfilled ${totalUpdated} rows. ~${remaining?.count} remaining.`,
    );

    // Throttle to reduce DB pressure
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return totalUpdated;
}

// Usage:
// await backfillInBatches(knex, 'users', "username = LOWER(REPLACE(name, ' ', '_'))");
```

**Key rules for safe backfills:**

| Rule | Reason |
|------|--------|
| Process in small batches (500-5000 rows) | Avoids long-running transactions |
| Use cursor-based pagination (`id > lastId`) | More efficient than OFFSET on large tables |
| Add throttle/sleep between batches | Prevents overwhelming the database |
| Track progress | So you can monitor and estimate completion time |
| Keep old data until backfill is verified | Rollback strategy if something goes wrong |
| Never run entire backfill in one transaction | Long transactions hold locks and consume memory |
| Use `FOR UPDATE SKIP LOCKED` when applicable | Avoids blocking concurrent operations |

---

## Q8: Handling Breaking Schema Changes

### Q: How do you safely rename a column in production?

**Answer:**

Renaming a column is a **breaking change** because application code references the column name. The safe approach takes 5 steps:

```
Step 1: Add new column
  ALTER TABLE users ADD COLUMN full_name VARCHAR(200);

Step 2: Backfill data
  UPDATE users SET full_name = name;  -- in batches

Step 3: Deploy dual-write code
  -- App reads from full_name, writes to BOTH name AND full_name
  -- This ensures consistency during the transition

Step 4: Stop writing old column
  -- Deploy code that only reads/writes full_name
  -- Verify no queries reference the old column

Step 5: Drop old column
  ALTER TABLE users DROP COLUMN name;
```

In NestJS with TypeORM, the dual-write phase looks like:

```typescript
// During transition: write to both columns
@Injectable()
export class UsersService {
  async updateName(userId: string, newName: string): Promise<User> {
    await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({
        name: newName,       // old column
        fullName: newName,   // new column
      })
      .where('id = :id', { id: userId })
      .execute();

    return this.usersRepository.findOneBy({ id: userId });
  }
}
```

### Q: How do you safely change a column type?

**Answer:**

The same expand-contract pattern applies:

```
Step 1: Add new column with new type
  ALTER TABLE orders ADD COLUMN total_bigint BIGINT;

Step 2: Backfill with type conversion (in batches)
  UPDATE orders SET total_bigint = (total * 100)::BIGINT;  -- cents

Step 3: Dual-write in application code

Step 4: Switch reads to new column

Step 5: Drop old column
  ALTER TABLE orders DROP COLUMN total;
  ALTER TABLE orders RENAME COLUMN total_bigint TO total;
```

### Q: How do you use views as transition aliases?

**Answer:**

When renaming a table, you can create a **view** with the old name that points to the new table. This way, old code that still references the old table name continues to work:

```sql
-- Rename the table
ALTER TABLE user_profiles RENAME TO profiles;

-- Create a view with the old name for backward compatibility
CREATE VIEW user_profiles AS SELECT * FROM profiles;

-- Later, when all code is updated to use 'profiles':
DROP VIEW user_profiles;
```

This is also useful for **splitting tables:**

```sql
-- Original: users table has address columns
-- After split: addresses in separate table

CREATE VIEW users_with_address AS
  SELECT u.*, a.street, a.city, a.country
  FROM users u
  LEFT JOIN addresses a ON a.user_id = u.id;

-- Old queries using users table with address columns still work via the view
```

---

## Q9: Migration Testing

### Q: How do you test database migrations?

**Answer:**

```typescript
// __tests__/migrations/add-username-column.test.ts
import knex, { Knex } from 'knex';
import config from '../../knexfile';

describe('Migration: AddUsernameColumn', () => {
  let db: Knex;

  beforeAll(async () => {
    db = knex(config.test);
    // Start from clean slate
    await db.migrate.rollback(undefined, true); // Rollback all
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('should apply all migrations up to the target', async () => {
    await db.migrate.latest();

    const hasColumn = await db.schema.hasColumn('users', 'username');
    expect(hasColumn).toBe(true);
  });

  it('should have the correct column type', async () => {
    const columnInfo = await db('users').columnInfo('username');
    expect(columnInfo.type).toBe('character varying');
    expect(columnInfo.maxLength).toBe(100);
  });

  it('should rollback cleanly', async () => {
    await db.migrate.rollback();

    const hasColumn = await db.schema.hasColumn('users', 'username');
    expect(hasColumn).toBe(false);
  });

  it('should re-apply after rollback', async () => {
    await db.migrate.latest();

    const hasColumn = await db.schema.hasColumn('users', 'username');
    expect(hasColumn).toBe(true);
  });
});
```

### Q: What does a CI pipeline for migrations look like?

**Answer:**

```yaml
# .github/workflows/migration-test.yml
name: Migration Tests

on:
  pull_request:
    paths:
      - 'migrations/**'
      - 'prisma/migrations/**'
      - 'src/entities/**'

services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test_db
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

jobs:
  test-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Run all migrations from scratch
        run: npx knex migrate:latest
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test_db

      - name: Run migration tests
        run: npm test -- --testPathPattern=migrations

      - name: Rollback latest migration
        run: npx knex migrate:rollback

      - name: Re-apply and verify
        run: npx knex migrate:latest

      - name: Run application tests against migrated schema
        run: npm test -- --testPathPattern=integration
```

### Q: How do you test with production-like data volume?

**Answer:**

Testing on an empty database is not enough. Production tables have millions of rows, and a migration that takes 1ms on an empty table may take 30 minutes on a production-sized table.

**Approach:**
1. Use a **staging environment** with a snapshot of production data (anonymized)
2. **Time the migration** — if it takes more than a few seconds, consider the expand-contract pattern
3. **Monitor lock duration** using `pg_stat_activity`:

```sql
-- Check for long-running locks during migration
SELECT pid, now() - pg_stat_activity.query_start AS duration,
       query, state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

4. **Check for missing indexes** after migration:

```sql
-- Find sequential scans on large tables (potential missing index)
SELECT schemaname, relname, seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC;
```

---

## Q10: Prisma vs TypeORM vs Knex — Comparison

### Q: Compare Prisma, TypeORM, and Knex for migrations and general usage.

**Answer:**

| Feature | Prisma | TypeORM | Knex |
|---------|--------|---------|------|
| **Approach** | Schema-first (`.prisma` file) | Code-first (decorators) / Schema-first | Query builder (hand-written) |
| **Type safety** | Excellent (auto-generated client) | Good (decorators + generics) | Manual (or use with typed ORM) |
| **Migration format** | SQL files (generated from schema diff) | TypeScript/JavaScript classes | TypeScript/JavaScript functions |
| **Migration generation** | Automatic from schema changes | Automatic from entity diff | Manual only |
| **Query building** | Prisma Client (ORM abstraction) | Repository pattern / QueryBuilder | SQL query builder |
| **Raw SQL** | `$queryRaw`, `$executeRaw` | `query()`, `createQueryBuilder()` | `.raw()` (native) |
| **Performance** | Good (Rust query engine) | Moderate (JS-based) | Good (thin SQL layer) |
| **Learning curve** | Low | Medium | Low |
| **Flexibility** | Moderate (opinionated) | High (many patterns) | Very high (full SQL control) |
| **Active development** | Very active | Active but slower release cycle | Stable, mature |
| **Best for** | Rapid development, type safety | Complex enterprise apps, legacy DBs | Full SQL control, complex queries |
| **Community** | Growing fast | Largest Node.js ORM community | Stable, widely used |
| **NestJS integration** | `@nestjs/prisma` or manual | `@nestjs/typeorm` (official) | Manual or `nestjs-knex` |

### Q: When would you choose each tool?

**Answer:**

**Choose Prisma when:**
- Starting a new NestJS/Node.js project from scratch
- Team values developer experience and type safety
- Schema is relatively straightforward
- You want auto-generated, fully typed database client
- Rapid iteration is more important than SQL fine-tuning

**Choose TypeORM when:**
- Enterprise project with complex entity relationships
- Working with an existing TypeORM codebase
- Need decorator-based entity definitions (familiar to Java/C# developers)
- Working with multiple database types simultaneously
- Need the Active Record or Data Mapper pattern

**Choose Knex when:**
- Need full control over SQL queries
- Complex queries that ORMs struggle with (CTEs, window functions, lateral joins)
- Using Knex as a foundation for another ORM (e.g., Objection.js)
- Team has strong SQL skills and prefers writing queries directly
- Performance-critical application where ORM overhead matters

**Interview tip:**

> "I've used Prisma for greenfield projects because of the excellent developer experience and type safety — the auto-generated client catches schema mismatches at compile time. For complex queries that the ORM can't express cleanly, I drop to raw SQL via `$queryRaw`. In my current role, we use Knex for our analytics service because it involves heavy CTEs and window functions that are more naturally expressed as SQL."

---

## Q11: Common Interview Scenarios

### Q: "Your migration takes 30 minutes on production. What do you do?"

**Answer:**

> "First, I would never run a migration that takes 30 minutes in a single operation. Here's my approach:
>
> 1. **Break it into smaller migrations** — if it's creating an index, use `CREATE INDEX CONCURRENTLY` which doesn't block writes
> 2. **Batch data updates** — instead of one massive UPDATE, process 1000–5000 rows at a time with a throttle between batches
> 3. **Run during low traffic** — schedule for off-peak hours (but this is a safety net, not a strategy)
> 4. **Monitor locks** — use `pg_stat_activity` to check for blocked queries during the migration
> 5. **Use the expand-contract pattern** — never modify existing columns in-place. Add new, backfill, switch, drop old
> 6. **Set a statement timeout** — `SET statement_timeout = '5s'` so a single statement can't hold a lock indefinitely"

### Q: "Two developers created conflicting migrations. How do you resolve it?"

**Answer:**

> "Timestamp-based naming (which Prisma, TypeORM, and Knex all use by default) prevents naming collisions. But logical conflicts — like both migrations altering the same table or column — still need to be caught.
>
> We have a CI step that runs all migrations on a fresh database. If there's a conflict, the pipeline fails. The resolution is:
> 1. Pull both branches into a single branch
> 2. Test the combined migrations on staging
> 3. If they conflict logically, merge them into a single migration
> 4. If they're independent, ensure ordering doesn't matter"

### Q: "How do you handle migrations in a microservices architecture?"

**Answer:**

> "Each microservice owns its database and its migrations independently. Key principles:
>
> 1. **Database per service** — no shared databases between services
> 2. **Independent deployment** — each service's migration runs as part of its own deployment pipeline
> 3. **Backward-compatible changes** — since services deploy independently, the database schema must support both the old and new version of the application simultaneously (expand-contract pattern)
> 4. **No cross-service foreign keys** — relationships between services are maintained at the application level, not the database level
> 5. **Event-driven data synchronization** — if Service B needs data from Service A, it subscribes to events, not queries the database directly"

### Q: "How do you rollback a bad migration in production?"

**Answer:**

> "It depends on the type of migration:
>
> - **Schema-only change (e.g., added a column):** Run the down migration to revert. This is safe because no data was modified.
> - **Data migration (e.g., backfilled a column):** Never rollback destructively. Instead, apply a **corrective migration** (forward-fix). For example, if a backfill wrote incorrect values, create a new migration that fixes the data.
> - **Dropped a column/table:** This is why down migrations are critical — and why you should always keep a backup before running destructive migrations. If you don't have a down migration, restore from backup.
>
> The key insight: **always prefer forward-fixing over rollback** for data changes. Rollback is for schema changes. For data, a corrective migration is safer because it's explicit, auditable, and won't cause additional data loss."

---

## Quick Reference

### Migration Commands Cheat Sheet

```bash
# ═══════════════════════════════════════
# PRISMA
# ═══════════════════════════════════════
npx prisma migrate dev --name <name>     # Create & apply (dev)
npx prisma migrate deploy                # Apply pending (prod)
npx prisma migrate reset                 # Reset DB (dev only!)
npx prisma migrate status                # Show pending migrations
npx prisma db push                       # Push without migration (prototype)
npx prisma db seed                       # Run seed script

# ═══════════════════════════════════════
# TYPEORM
# ═══════════════════════════════════════
typeorm migration:create -n Name         # Empty migration
typeorm migration:generate -n Name       # Generate from entities
typeorm migration:run                    # Apply migrations
typeorm migration:revert                 # Rollback last migration
typeorm migration:show                   # Show migration status

# ═══════════════════════════════════════
# KNEX
# ═══════════════════════════════════════
knex migrate:make name                   # Create migration
knex migrate:latest                      # Apply all pending
knex migrate:rollback                    # Revert last batch
knex migrate:up                          # Apply next one
knex migrate:down                        # Revert last one
knex migrate:status                      # Show pending
knex seed:make name                      # Create seed
knex seed:run                            # Run seeds
```

### Safe vs Dangerous PostgreSQL Operations

```
✅ SAFE (no lock or minimal lock):
  ADD COLUMN (nullable, no default)
  ADD COLUMN with DEFAULT (PostgreSQL 11+)
  CREATE INDEX CONCURRENTLY
  ADD CONSTRAINT ... NOT VALID
  DROP COLUMN
  RENAME TABLE

❌ DANGEROUS (locks table, may cause downtime):
  ADD COLUMN with DEFAULT (PostgreSQL < 11)
  ALTER COLUMN TYPE (rewrites table)
  CREATE INDEX (without CONCURRENTLY)
  ADD NOT NULL constraint (full table scan)
  ALTER COLUMN SET NOT NULL (full table scan)
```

### Zero-Downtime Migration Checklist

```
Before writing the migration:
  [ ] Does this migration lock the table? For how long?
  [ ] Is the table large enough to cause issues? (> 1M rows = be careful)
  [ ] Can this be broken into expand-contract phases?
  [ ] Is the down migration correct and tested?

Before deploying:
  [ ] Migration tested on staging with production-like data volume
  [ ] Migration timed — completes in acceptable window
  [ ] Rollback plan documented in PR
  [ ] Application code supports both old and new schema
  [ ] Feature flag ready (if needed)
  [ ] Backup taken (for destructive changes)

After deploying:
  [ ] Verify migration applied successfully
  [ ] Monitor database performance (locks, slow queries)
  [ ] Verify application health
  [ ] Run backfill if needed (as separate step)
  [ ] Schedule contract phase (drop old columns) for later
```

### Migration Review Checklist for PRs

```
Schema Safety:
  [ ] No ALTER COLUMN TYPE on large tables
  [ ] Indexes created with CONCURRENTLY
  [ ] New NOT NULL columns added safely (nullable → backfill → constraint)
  [ ] No synchronize: true in production config

Data Safety:
  [ ] No data loss from column drops or type changes
  [ ] Backfills done in batches (not one massive UPDATE)
  [ ] Old data preserved until new schema verified

Backward Compatibility:
  [ ] Old app version works with new schema (for rolling deployments)
  [ ] Dual-write code deployed before contract phase

Rollback:
  [ ] Down migration exists and is correct
  [ ] Down migration tested locally
  [ ] Rollback plan documented in PR description
```
