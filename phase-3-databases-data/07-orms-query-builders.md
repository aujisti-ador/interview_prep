# ORMs & Query Builders — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with practical TypeScript and NestJS code examples
> **Goal:** Confidently answer any ORM / query builder question in a senior backend interview

## Table of Contents
1. [What Are ORMs & Why Use Them](#q1-what-are-orms--why-use-them)
2. [Prisma Deep Dive](#q2-prisma-deep-dive)
3. [TypeORM Deep Dive](#q3-typeorm-deep-dive)
4. [Knex.js Deep Dive](#q4-knexjs-deep-dive)
5. [The N+1 Query Problem (Must-Know)](#q5-the-n1-query-problem-must-know)
6. [Query Optimization with ORMs](#q6-query-optimization-with-orms)
7. [Soft Delete Pattern](#q7-soft-delete-pattern)
8. [Multi-Tenancy with ORMs](#q8-multi-tenancy-with-orms)
9. [ORM Testing Strategies](#q9-orm-testing-strategies)
10. [Common Interview Questions](#q10-common-interview-questions)
11. [Quick Reference](#quick-reference)

---

## Q1: What Are ORMs & Why Use Them

### Q: What is an ORM, and what are the trade-offs of using one?

**Answer:**

ORM stands for **Object-Relational Mapping** — it maps database tables to code objects so you interact with the database through your programming language rather than raw SQL.

**Benefits:**

| Benefit | Explanation |
|---------|-------------|
| **Developer Productivity** | Write less boilerplate; CRUD operations are one-liners |
| **Type Safety** | TypeScript ORMs (Prisma, TypeORM) give compile-time checks on queries |
| **Database Portability** | Switch between PostgreSQL, MySQL, SQLite with minimal code changes |
| **SQL Injection Prevention** | Parameterized queries are the default — no manual escaping needed |
| **Schema as Code** | Models/schemas serve as living documentation of database structure |

**Drawbacks:**

| Drawback | Explanation |
|----------|-------------|
| **Performance Overhead** | ORMs generate SQL that may not be optimal; object hydration has cost |
| **N+1 Problem** | Easy to accidentally trigger N+1 queries (see Q5) |
| **Abstraction Leaks** | When the ORM can't express a query, you hit a wall |
| **Complex Queries Are Hard** | Reporting queries, window functions, and CTEs are painful in ORM syntax |
| **Learning Curve** | Each ORM has its own API, quirks, and patterns to learn |

### Q: Compare ORM vs Query Builder vs Raw SQL. When would you choose each?

**Answer:**

```
┌──────────────────┬──────────────┬────────────────┬─────────────┐
│                  │ ORM          │ Query Builder  │ Raw SQL     │
│                  │ (Prisma,     │ (Knex)         │ (pg, mysql2)│
│                  │  TypeORM)    │                │             │
├──────────────────┼──────────────┼────────────────┼─────────────┤
│ Abstraction      │ Highest      │ Medium         │ None        │
│ SQL Knowledge    │ Minimal      │ Moderate       │ Expert      │
│ Type Safety      │ Excellent    │ Good           │ Manual      │
│ Complex Queries  │ Difficult    │ Good           │ Full control│
│ Performance      │ Good*        │ Very Good      │ Best        │
│ Migrations       │ Built-in     │ Built-in       │ Manual      │
│ Learning Curve   │ ORM-specific │ SQL-adjacent   │ SQL itself  │
└──────────────────┴──────────────┴────────────────┴─────────────┘
```

**When to choose each:**

- **ORM** — Standard CRUD apps, REST/GraphQL APIs, rapid prototyping, teams with mixed SQL skills
- **Query Builder** — Complex reporting, data pipelines, when you want SQL control with some safety
- **Raw SQL** — Performance-critical paths, complex analytics, bulk data operations, stored procedures

> **The "ORM trap":** Teams that never learn SQL struggle when ORMs can't express complex queries. The ORM becomes a ceiling instead of a floor.

**Interview tip:** *"I use ORMs for 80% of queries and drop to raw SQL for the complex 20%. The key is knowing when to switch."*

---

## Q2: Prisma Deep Dive

### Q: Explain Prisma's architecture. How does it differ from traditional ORMs?

**Answer:**

Prisma is a **next-generation ORM** that takes a fundamentally different approach:

**Architecture:**

```
┌──────────────────────┐
│   Prisma Schema      │  ← Single source of truth (schema.prisma)
│   (schema.prisma)    │
└─────────┬────────────┘
          │ npx prisma generate
          ▼
┌──────────────────────┐
│   Prisma Client      │  ← Auto-generated, fully typed TypeScript client
│   (node_modules/     │
│    @prisma/client)   │
└─────────┬────────────┘
          │ Node.js calls
          ▼
┌──────────────────────┐
│   Prisma Engine      │  ← Written in Rust, runs as a sidecar process
│   (Query Engine)     │     Translates Prisma queries → optimized SQL
└─────────┬────────────┘
          │ SQL
          ▼
┌──────────────────────┐
│   Database           │
└──────────────────────┘
```

**Key differences from traditional ORMs:**

| Aspect | Prisma | Traditional ORMs (TypeORM, Sequelize) |
|--------|--------|---------------------------------------|
| Schema | Declarative `.prisma` file | Decorator-based classes |
| Client | Auto-generated from schema | Manual repository/model setup |
| Type Safety | 100% generated types — impossible to write invalid query | Type safety depends on decorators |
| Query Engine | Rust binary — optimized at a lower level | JavaScript-based query building |
| Relations | Explicit `include` / `select` | Lazy loading or eager loading decorators |

### Q: Walk me through a real-world Prisma schema with relations.

**Answer:**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  posts     Post[]
  profile   Profile?
  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@map("users") // maps to "users" table name in DB
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String
  tags      Tag[]
  createdAt DateTime @default(now())

  @@index([authorId, published])
  @@map("posts")
}

model Profile {
  id     String  @id @default(uuid())
  bio    String?
  avatar String?
  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String  @unique

  @@map("profiles")
}

model Order {
  id        String      @id @default(uuid())
  total     Decimal     @db.Decimal(10, 2)
  status    OrderStatus @default(PENDING)
  user      User        @relation(fields: [userId], references: [id])
  userId    String
  items     OrderItem[]
  createdAt DateTime    @default(now())

  @@index([userId, status])
  @@map("orders")
}

model OrderItem {
  id       String @id @default(uuid())
  quantity Int
  price    Decimal @db.Decimal(10, 2)
  order    Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderId  String
  product  String

  @@map("order_items")
}

model Tag {
  id    String @id @default(uuid())
  name  String @unique
  posts Post[]

  @@map("tags")
}

enum Role {
  USER
  ADMIN
  MODERATOR
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}
```

**Key things to point out in an interview:**

- `@@map` controls table naming independently of the model name
- `@@index` defines composite indexes for query performance
- `@relation(onDelete: Cascade)` configures referential actions at the database level
- `@updatedAt` auto-updates the timestamp on every write
- Enums are first-class citizens in Prisma schemas

### Q: Show me CRUD operations and complex queries with Prisma in NestJS.

**Answer:**

**PrismaService setup:**

```typescript
// prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**Full service with CRUD and complex queries:**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE with nested relation ─────────────────────────────────
  async createUser(data: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        profile: {
          create: { bio: data.bio }, // Creates profile in the same transaction
        },
      },
      include: { profile: true }, // Include relation in response
    });
  }

  // ─── COMPLEX QUERY: filtering, sorting, pagination ───────────────
  async findUsers(params: {
    search?: string;
    role?: Role;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: Prisma.UserWhereInput = {
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
      ...(params.role && { role: params.role }),
    };

    // Use $transaction to run count and findMany atomically
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: {
          profile: true,
          _count: { select: { orders: true } }, // Count relations without loading them
        },
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder || 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page: params.page,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  // ─── UPSERT ──────────────────────────────────────────────────────
  async upsertUser(email: string, data: UpdateUserDto) {
    return this.prisma.user.upsert({
      where: { email },
      update: { name: data.name },
      create: { email, name: data.name },
    });
  }

  // ─── NESTED WRITES: create order with items ──────────────────────
  async createOrder(userId: string, items: { product: string; quantity: number; price: number }[]) {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return this.prisma.order.create({
      data: {
        userId,
        total,
        items: {
          createMany: {
            data: items.map(item => ({
              product: item.product,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      },
      include: { items: true },
    });
  }

  // ─── INTERACTIVE TRANSACTION (multi-step with business logic) ────
  async transferCredits(fromUserId: string, toUserId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const sender = await tx.user.findUniqueOrThrow({ where: { id: fromUserId } });

      // Business logic inside the transaction
      if (sender.credits < amount) {
        throw new Error('Insufficient credits');
      }

      await tx.user.update({
        where: { id: fromUserId },
        data: { credits: { decrement: amount } },
      });

      await tx.user.update({
        where: { id: toUserId },
        data: { credits: { increment: amount } },
      });

      return { success: true, transferred: amount };
    });
  }
}
```

### Q: When do you drop to raw SQL in Prisma, and how?

**Answer:**

Drop to raw SQL when Prisma can't express the query — complex aggregations, window functions, CTEs, or performance-critical paths.

```typescript
// ─── Raw query with type safety ────────────────────────────────────
interface UserStats {
  id: string;
  name: string;
  order_count: bigint;
  total_spent: number;
  avg_order_value: number;
}

const result = await this.prisma.$queryRaw<UserStats[]>`
  SELECT
    u.id,
    u.name,
    COUNT(o.id) as order_count,
    SUM(o.total) as total_spent,
    AVG(o.total) as avg_order_value
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  WHERE u.created_at >= ${startDate}
  GROUP BY u.id, u.name
  HAVING COUNT(o.id) > ${minOrders}
  ORDER BY total_spent DESC
  LIMIT ${limit}
`;
// Tagged template literal — parameters are automatically escaped (SQL injection safe)

// ─── Raw execute for DML ───────────────────────────────────────────
const affected = await this.prisma.$executeRaw`
  UPDATE orders
  SET status = 'CANCELLED'
  WHERE status = 'PENDING'
    AND created_at < NOW() - INTERVAL '7 days'
`;

// ─── Window functions (not possible in Prisma query API) ───────────
const ranked = await this.prisma.$queryRaw<RankedUser[]>`
  SELECT
    id,
    name,
    total_spent,
    RANK() OVER (ORDER BY total_spent DESC) as spending_rank,
    PERCENT_RANK() OVER (ORDER BY total_spent DESC) as percentile
  FROM (
    SELECT u.id, u.name, COALESCE(SUM(o.total), 0) as total_spent
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.id, u.name
  ) sub
`;
```

> **Warning:** Never interpolate user input directly. Always use the tagged template literal `$queryRaw\`...\`` — Prisma auto-parameterizes it. The unsafe `$queryRawUnsafe(string)` should be avoided unless you have a very specific reason.

### Q: How do you use Prisma middleware?

**Answer:**

Prisma middleware intercepts every query before and after execution — useful for logging, soft delete, audit trails, and multi-tenancy.

```typescript
// ─── Logging middleware ────────────────────────────────────────────
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;

  if (duration > 200) {
    console.warn(`Slow query: ${params.model}.${params.action} took ${duration}ms`);
  }

  return result;
});

// ─── Audit trail middleware ────────────────────────────────────────
prisma.$use(async (params, next) => {
  const result = await next(params);

  if (['create', 'update', 'delete'].includes(params.action)) {
    await prisma.auditLog.create({
      data: {
        model: params.model,
        action: params.action,
        recordId: result?.id,
        data: JSON.stringify(params.args),
        userId: getCurrentUserId(), // from async local storage or context
      },
    });
  }

  return result;
});
```

> **Note:** As of Prisma 5+, middleware is being superseded by **Prisma Client extensions** (`prisma.$extends`), which offer a more composable and type-safe approach.

---

## Q3: TypeORM Deep Dive

### Q: How does TypeORM differ from Prisma? Show the entity-based approach.

**Answer:**

TypeORM uses **decorator-based entity classes** — the entities themselves define the schema, rather than a separate schema file. It follows a more traditional ORM pattern.

**Entity definition:**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, OneToOne, OneToMany,
  ManyToMany, JoinTable, Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true })
  profile: Profile;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @ManyToMany(() => Tag, (tag) => tag.users)
  @JoinTable() // Creates the join table — only on ONE side of the relation
  tags: Tag[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn() // Enables soft delete
  deletedAt: Date;
}

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  avatar: string;

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn() // Foreign key lives here
  user: User;
}

@Entity('orders')
@Index(['userId', 'status']) // Composite index
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @ManyToOne(() => User, (user) => user.orders)
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;
}
```

### Q: Show the Repository pattern and QueryBuilder in TypeORM.

**Answer:**

**Repository pattern (simple queries):**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // ─── Basic CRUD ──────────────────────────────────────────────────
  async findById(id: string) {
    return this.userRepo.findOne({
      where: { id },
      relations: ['profile'],
    });
  }

  async findWithOrders(userId: string) {
    return this.userRepo.findOne({
      where: { id: userId },
      relations: ['orders', 'profile'],
      order: { orders: { createdAt: 'DESC' } },
    });
  }

  async findByEmails(emails: string[]) {
    return this.userRepo.find({
      where: { email: In(emails) },
    });
  }

  // ─── Save (insert or update based on primary key) ────────────────
  async createUser(data: CreateUserDto) {
    const user = this.userRepo.create(data); // Create entity instance (no DB call)
    return this.userRepo.save(user);          // Persist to DB
  }
}
```

**QueryBuilder for complex queries:**

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // ─── Complex query with aggregation ──────────────────────────────
  async findUsersWithStats(minOrders: number) {
    return this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoin('user.orders', 'order')
      .addSelect('COUNT(order.id)', 'orderCount')
      .addSelect('SUM(order.total)', 'totalSpent')
      .groupBy('user.id')
      .addGroupBy('profile.id')
      .having('COUNT(order.id) >= :minOrders', { minOrders })
      .orderBy('totalSpent', 'DESC')
      .getRawAndEntities();
  }

  // ─── Pagination with search ──────────────────────────────────────
  async searchUsers(search: string, page: number, limit: number) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile');

    if (search) {
      qb.where('user.name ILIKE :search OR user.email ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [users, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ─── Subquery ────────────────────────────────────────────────────
  async findInactiveUsers(daysSinceLastOrder: number) {
    const subQuery = this.userRepo
      .createQueryBuilder()
      .subQuery()
      .select('order.userId')
      .from(Order, 'order')
      .where('order.createdAt > NOW() - :interval::INTERVAL', {
        interval: `${daysSinceLastOrder} days`,
      })
      .getQuery();

    return this.userRepo
      .createQueryBuilder('user')
      .where(`user.id NOT IN ${subQuery}`)
      .getMany();
  }
}
```

### Q: What is the difference between Active Record and Data Mapper patterns in TypeORM?

**Answer:**

```typescript
// ─── Active Record: entity has save/find methods on itself ─────────
@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
}

// Usage — the entity manages its own persistence
const user = new User();
user.name = 'Alice';
await user.save();                          // Instance method
const found = await User.findOneBy({ id }); // Static method

// ─── Data Mapper: repository handles persistence ───────────────────
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
}

// Usage — a separate repository manages persistence
const user = userRepo.create({ name: 'Alice' });
await userRepo.save(user);
const found = await userRepo.findOneBy({ id });
```

| Aspect | Active Record | Data Mapper |
|--------|--------------|-------------|
| **Simplicity** | Simpler — less boilerplate | More setup — inject repositories |
| **Testability** | Harder to mock (static methods) | Easy to mock repositories |
| **Separation of Concerns** | Entity knows about DB | Entity is a plain object |
| **NestJS Convention** | Not recommended | Recommended (DI-friendly) |

> **Interview answer:** *"I always use Data Mapper in production NestJS apps because it's compatible with dependency injection and makes unit testing straightforward."*

---

## Q4: Knex.js Deep Dive

### Q: When would you choose Knex over an ORM like Prisma or TypeORM?

**Answer:**

Knex is a **query builder**, not an ORM. It gives you SQL-level control without the overhead of object mapping.

**When Knex shines:**

- Complex reporting queries that would be awkward in ORM syntax
- Data migration scripts and ETL pipelines
- Applications that need multi-database support (PostgreSQL, MySQL, SQLite, MSSQL)
- Teams with strong SQL skills who want safety (parameterized queries) without abstraction
- Performance-critical paths where you need full control over generated SQL

**Core examples:**

```typescript
import Knex from 'knex';

const knex = Knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
});

// ─── Simple queries ────────────────────────────────────────────────
const admins = await knex('users')
  .where({ role: 'admin' })
  .orderBy('name');

// ─── Complex query with joins and aggregation ──────────────────────
const result = await knex('users as u')
  .leftJoin('orders as o', 'u.id', 'o.user_id')
  .select('u.id', 'u.name')
  .count('o.id as order_count')
  .sum('o.total as total_spent')
  .groupBy('u.id', 'u.name')
  .having('order_count', '>', 5)
  .orderBy('total_spent', 'desc')
  .limit(20);

// ─── Subqueries ────────────────────────────────────────────────────
const activeUsers = await knex('users')
  .whereIn('id',
    knex('orders')
      .select('user_id')
      .where('created_at', '>', knex.raw("NOW() - INTERVAL '30 days'"))
      .groupBy('user_id')
  );

// ─── Batch insert (chunks of 1000 for large datasets) ─────────────
await knex.batchInsert('logs', logEntries, 1000);

// ─── Transaction ───────────────────────────────────────────────────
await knex.transaction(async (trx) => {
  await trx('accounts').where({ id: fromId }).decrement('balance', amount);
  await trx('accounts').where({ id: toId }).increment('balance', amount);
  await trx('transaction_log').insert({
    fromId,
    toId,
    amount,
    type: 'transfer',
    createdAt: new Date(),
  });
});
```

**Using Knex with NestJS (custom module):**

```typescript
// knex.module.ts
import { Module, Global } from '@nestjs/common';
import Knex from 'knex';

const KNEX_TOKEN = 'KNEX_CONNECTION';

@Global()
@Module({
  providers: [
    {
      provide: KNEX_TOKEN,
      useFactory: () => {
        return Knex({
          client: 'pg',
          connection: process.env.DATABASE_URL,
          pool: { min: 2, max: 10 },
        });
      },
    },
  ],
  exports: [KNEX_TOKEN],
})
export class KnexModule {}

// Usage in a service
@Injectable()
export class ReportService {
  constructor(@Inject('KNEX_CONNECTION') private knex: Knex) {}

  async getRevenueReport(startDate: Date, endDate: Date) {
    return this.knex('orders')
      .select(this.knex.raw("DATE_TRUNC('month', created_at) as month"))
      .sum('total as revenue')
      .count('id as order_count')
      .whereBetween('created_at', [startDate, endDate])
      .groupByRaw("DATE_TRUNC('month', created_at)")
      .orderBy('month');
  }
}
```

---

## Q5: The N+1 Query Problem (Must-Know)

### Q: What is the N+1 query problem, and how do you detect and prevent it?

**Answer:**

The N+1 problem is the most common ORM performance issue. It occurs when you load a list of entities and then lazily load a relation for each one individually.

**The problem:**

```typescript
// N+1 Problem: 1 query for users + N queries for each user's orders
const users = await userRepo.find(); // Query 1: SELECT * FROM users
for (const user of users) {
  user.orders = await orderRepo.find({ where: { userId: user.id } }); // N queries!
}
// If 100 users → 101 queries!
// If 10,000 users → 10,001 queries! (database melts)
```

**Solutions:**

```typescript
// ─── Solution 1: Eager loading with JOIN (TypeORM) ─────────────────
const users = await userRepo.find({ relations: ['orders'] });
// Generated SQL:
// SELECT * FROM users
// LEFT JOIN orders ON orders.user_id = users.id
// 1 query! But can be large result set for many-to-many.

// ─── Solution 2: Prisma include (separate batched query) ───────────
const users = await prisma.user.findMany({
  include: { orders: true },
});
// Generated SQL (2 optimized queries):
// SELECT * FROM users
// SELECT * FROM orders WHERE user_id IN ('id1', 'id2', 'id3', ...)
// Prisma automatically batches! Avoids JOIN explosion for large datasets.

// ─── Solution 3: DataLoader (essential for GraphQL) ────────────────
import DataLoader from 'dataloader';

// Create a loader that batches loads within a single event loop tick
const orderLoader = new DataLoader<string, Order[]>(async (userIds) => {
  const orders = await orderRepo.find({
    where: { userId: In(userIds as string[]) },
  });

  // DataLoader requires results in the same order as input keys
  const orderMap = new Map<string, Order[]>();
  for (const order of orders) {
    const existing = orderMap.get(order.userId) || [];
    existing.push(order);
    orderMap.set(order.userId, existing);
  }

  return userIds.map((id) => orderMap.get(id) || []);
});

// In GraphQL resolver — even if called 100 times, only 1 batched query
@ResolveField()
async orders(@Parent() user: User) {
  return orderLoader.load(user.id); // All loads in one tick are batched
}
```

**Detection strategies:**

| Method | How |
|--------|-----|
| **Query logging** | Enable ORM query logging; look for repeated similar queries |
| **Prisma logging** | `new PrismaClient({ log: ['query'] })` |
| **TypeORM logging** | `logging: true` in connection options |
| **APM tools** | Datadog, New Relic show query counts per request |
| **Custom middleware** | Count queries per request, alert if > threshold |

```typescript
// Simple N+1 detection middleware
let queryCount = 0;
prisma.$use(async (params, next) => {
  queryCount++;
  const result = await next(params);
  if (queryCount > 20) {
    console.warn(`⚠ ${queryCount} queries in single request — possible N+1`);
  }
  return result;
});
```

**Prevention checklist:**

- Always think: "What queries will this code generate?"
- Use `include` / `relations` for known required relations
- Use DataLoader for GraphQL APIs
- Enable query logging in development
- Set up query count alerts in production

---

## Q6: Query Optimization with ORMs

### Q: How do you optimize ORM queries for performance?

**Answer:**

**1. Select only needed fields:**

```typescript
// Prisma: select specific fields (avoids fetching large columns)
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
  // Does NOT fetch all columns — significantly better for wide tables
});

// TypeORM: select
const users = await userRepo.find({
  select: ['id', 'name', 'email'],
});

// Knex: explicit columns
const users = await knex('users').select('id', 'name', 'email');
```

**2. Pagination — offset vs cursor:**

```typescript
// ─── Offset pagination (simple but slow for large offsets) ─────────
const users = await prisma.user.findMany({
  skip: 10000,
  take: 20,
});
// Problem: the database still scans 10,000 rows to skip them
// Gets slower as the offset increases

// ─── Cursor pagination (efficient for large datasets) ──────────────
const users = await prisma.user.findMany({
  take: 20,
  cursor: { id: lastSeenId },
  skip: 1, // Skip the cursor itself
  orderBy: { createdAt: 'desc' },
});
// Uses an index seek — constant time regardless of position
// Trade-off: no "jump to page 50" — only next/previous
```

**When to use which:**

| Pagination Type | Use When |
|----------------|----------|
| **Offset** | Small datasets (< 10k rows), admin panels, need page numbers |
| **Cursor** | Large datasets, infinite scroll, real-time feeds, APIs |

**3. Batch operations:**

```typescript
// Prisma: createMany (single INSERT with multiple VALUES)
await prisma.user.createMany({
  data: users,
  skipDuplicates: true, // Ignore conflicts instead of throwing
});

// TypeORM: insert vs save
await userRepo.save(users);   // BAD — individual INSERT per entity
await userRepo.insert(users); // GOOD — single INSERT with multiple VALUES

// Knex: batchInsert with configurable chunk size
await knex.batchInsert('users', users, 500); // 500 rows per INSERT statement
```

**4. Use raw queries for aggregations:**

```typescript
// ORM aggregation: multiple round trips, in-memory grouping
const users = await prisma.user.findMany({ include: { orders: true } });
const stats = users.map(u => ({
  name: u.name,
  total: u.orders.reduce((sum, o) => sum + o.total, 0),
}));
// BAD: fetches ALL orders into memory, aggregates in Node.js

// Raw SQL aggregation: single query, database does the math
const stats = await prisma.$queryRaw`
  SELECT u.name, SUM(o.total) as total
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.name
  ORDER BY total DESC
`;
// GOOD: the database does what it's optimized for
```

**5. Lean queries for read-heavy operations:**

```typescript
// Mongoose: lean() returns plain objects, skipping Mongoose document overhead
const users = await UserModel.find().lean();

// TypeORM: getRawMany for pure data (no entity hydration)
const stats = await userRepo
  .createQueryBuilder('user')
  .select('user.role', 'role')
  .addSelect('COUNT(*)', 'count')
  .groupBy('user.role')
  .getRawMany();
```

**6. Check the generated SQL and EXPLAIN:**

```typescript
// Prisma: log queries
const prisma = new PrismaClient({
  log: [{ level: 'query', emit: 'event' }],
});
prisma.$on('query', (e) => {
  if (e.duration > 100) {
    console.log(`Slow query (${e.duration}ms): ${e.query}`);
  }
});

// TypeORM: log queries
const dataSource = new DataSource({
  logging: ['query', 'slow_query'],
  maxQueryExecutionTime: 100, // Log queries slower than 100ms
});

// Then run EXPLAIN on the slow query in psql/pgAdmin
// EXPLAIN ANALYZE SELECT ...
```

---

## Q7: Soft Delete Pattern

### Q: How do you implement soft delete across different ORMs?

**Answer:**

Soft delete marks records as deleted without physically removing them — useful for audit trails, data recovery, and compliance.

**TypeORM (built-in support):**

```typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @DeleteDateColumn() // This single decorator enables soft delete
  deletedAt?: Date;
}

// Soft delete — sets deletedAt = NOW()
await userRepo.softDelete(userId);

// find() automatically filters out soft-deleted records
const activeUsers = await userRepo.find(); // WHERE deleted_at IS NULL

// Restore a soft-deleted record
await userRepo.restore(userId);

// Explicitly include soft-deleted records
const allUsers = await userRepo.find({ withDeleted: true });

// Hard delete (permanently remove, even if soft delete is configured)
await userRepo.delete(userId);
```

**Prisma (middleware approach):**

```typescript
// Prisma doesn't have built-in soft delete — you implement it with middleware
// Add a deletedAt field to your schema:
// model User {
//   ...
//   deletedAt DateTime?
// }

prisma.$use(async (params, next) => {
  // Intercept delete → convert to soft delete
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }

  if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    if (params.args.data !== undefined) {
      params.args.data.deletedAt = new Date();
    } else {
      params.args.data = { deletedAt: new Date() };
    }
  }

  // Intercept reads → filter out soft-deleted records
  if (params.action === 'findMany' || params.action === 'findFirst') {
    if (!params.args) params.args = {};
    if (!params.args.where) params.args.where = {};

    // Don't override if explicitly querying deleted records
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
  }

  return next(params);
});
```

**Prisma Client Extension approach (Prisma 5+, recommended):**

```typescript
const prisma = new PrismaClient().$extends({
  model: {
    $allModels: {
      async softDelete<T>(this: T, where: any) {
        const context = Prisma.getExtensionContext(this);
        return (context as any).update({
          where,
          data: { deletedAt: new Date() },
        });
      },
    },
  },
  query: {
    $allOperations({ operation, args, query }) {
      if (operation === 'findMany' || operation === 'findFirst' || operation === 'count') {
        args.where = { ...args.where, deletedAt: null };
      }
      return query(args);
    },
  },
});

// Usage
await prisma.user.softDelete({ id: userId });
```

**Considerations:**

- **Indexes:** Add a partial index `WHERE deleted_at IS NULL` for performance
- **Unique constraints:** Soft-deleted records may violate unique constraints — use partial unique indexes
- **Cascading:** Think about what happens to related records when you soft-delete a parent
- **GDPR:** Soft delete is not enough for GDPR "right to erasure" — you may still need hard delete with anonymization

---

## Q8: Multi-Tenancy with ORMs

### Q: How do you implement multi-tenancy? What are the patterns?

**Answer:**

Multi-tenancy allows a single application to serve multiple isolated customers (tenants).

**Three approaches:**

```
┌────────────────────────────────────────────────────────────────────┐
│ Row-Level (shared everything)                                     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Database: app_db                                               │ │
│ │ Table: users                                                   │ │
│ │ ┌──────┬──────────┬───────────────┐                            │ │
│ │ │ id   │ tenant_id│ name          │  ← Every table has         │ │
│ │ │ 1    │ acme     │ Alice         │    tenant_id column        │ │
│ │ │ 2    │ globex   │ Bob           │                            │ │
│ │ └──────┴──────────┴───────────────┘                            │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ Schema-Level (shared database, separate schemas)                  │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Database: app_db                                               │ │
│ │ Schema: acme.users → Alice                                     │ │
│ │ Schema: globex.users → Bob                                     │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ Database-Level (separate databases)                               │
│ ┌────────────────┐  ┌─────────────────┐                          │
│ │ DB: acme_db    │  │ DB: globex_db   │                          │
│ │ users → Alice  │  │ users → Bob     │                          │
│ └────────────────┘  └─────────────────┘                          │
└────────────────────────────────────────────────────────────────────┘
```

| Approach | Isolation | Complexity | Cost | Best For |
|----------|-----------|------------|------|----------|
| **Row-level** | Low (application-enforced) | Low | Lowest | SaaS with many small tenants |
| **Schema-level** | Medium (DB-enforced) | Medium | Medium | Moderate isolation needs |
| **Database-level** | Highest (complete separation) | High | Highest | Enterprise/compliance (HIPAA, SOC2) |

**Row-level implementation with Prisma:**

```typescript
// ─── Tenant context (request-scoped) ───────────────────────────────
@Injectable({ scope: Scope.REQUEST })
export class TenantService {
  constructor(@Inject(REQUEST) private request: Request) {}

  get tenantId(): string {
    const tenantId = this.request.headers['x-tenant-id'] as string;
    if (!tenantId) throw new UnauthorizedException('Missing tenant ID');
    return tenantId;
  }
}

// ─── Prisma middleware for automatic tenant filtering ──────────────
// Every query is automatically scoped to the current tenant
@Injectable()
export class TenantPrismaService extends PrismaService {
  constructor(private tenantService: TenantService) {
    super();

    this.$use(async (params, next) => {
      const tenantId = this.tenantService.tenantId;
      const tenantModels = ['User', 'Order', 'Post']; // Models with tenantId

      if (!tenantModels.includes(params.model)) return next(params);

      // Inject tenantId into reads
      if (['findMany', 'findFirst', 'findUnique', 'count'].includes(params.action)) {
        if (!params.args.where) params.args.where = {};
        params.args.where.tenantId = tenantId;
      }

      // Inject tenantId into writes
      if (params.action === 'create') {
        params.args.data.tenantId = tenantId;
      }

      if (params.action === 'createMany') {
        params.args.data = params.args.data.map((d: any) => ({
          ...d,
          tenantId,
        }));
      }

      // Inject tenantId into updates/deletes
      if (['update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
        if (!params.args.where) params.args.where = {};
        params.args.where.tenantId = tenantId;
      }

      return next(params);
    });
  }
}
```

**Database-level with dynamic connection switching:**

```typescript
@Injectable({ scope: Scope.REQUEST })
export class TenantDatabaseService {
  private prisma: PrismaClient;

  constructor(@Inject(REQUEST) private request: Request) {
    const tenantId = request.headers['x-tenant-id'] as string;
    const databaseUrl = this.getDatabaseUrl(tenantId);

    this.prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
  }

  private getDatabaseUrl(tenantId: string): string {
    // Look up the connection string for this tenant
    // In production, this would come from a config service or secrets manager
    return `postgresql://user:pass@host:5432/tenant_${tenantId}`;
  }

  get client(): PrismaClient {
    return this.prisma;
  }
}
```

> **Interview tip:** Always mention the **risk of data leaks** with row-level tenancy — a missing WHERE clause exposes all tenants' data. Middleware/global scopes are essential.

---

## Q9: ORM Testing Strategies

### Q: How do you test code that uses ORMs?

**Answer:**

**1. Unit testing with mocked repositories:**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(UserService);
  });

  it('should find user by email', async () => {
    const expectedUser = { id: '1', email: 'test@test.com', name: 'Test' };
    mockPrisma.user.findUnique.mockResolvedValue(expectedUser as any);

    const result = await service.findByEmail('test@test.com');

    expect(result).toEqual(expectedUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@test.com' },
    });
  });

  it('should handle user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findByEmail('nope@test.com'))
      .rejects.toThrow(NotFoundException);
  });

  it('should create user with profile', async () => {
    const input = { email: 'new@test.com', name: 'New', bio: 'Hello' };
    const expected = { id: '1', ...input, profile: { bio: 'Hello' } };
    mockPrisma.user.create.mockResolvedValue(expected as any);

    const result = await service.createUser(input);

    expect(result.profile.bio).toBe('Hello');
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: input.email,
        name: input.name,
        profile: { create: { bio: input.bio } },
      },
      include: { profile: true },
    });
  });
});
```

**2. Integration testing with a real database (testcontainers):**

```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

describe('UserService (Integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Start a real PostgreSQL container
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .start();

    const databaseUrl = container.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;

    // Run migrations
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
  }, 60000); // Container startup can take time

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  beforeEach(async () => {
    // Clean all tables between tests
    await prisma.$transaction([
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.profile.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  });

  it('should create and find a user with orders', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'alice@test.com',
        name: 'Alice',
        orders: {
          create: [
            { total: 100, status: 'CONFIRMED' },
            { total: 200, status: 'PENDING' },
          ],
        },
      },
      include: { orders: true },
    });

    expect(user.orders).toHaveLength(2);

    const found = await prisma.user.findUnique({
      where: { email: 'alice@test.com' },
      include: { orders: { orderBy: { total: 'desc' } } },
    });

    expect(found!.orders[0].total).toBe(200);
  });
});
```

**3. Test fixtures and factories:**

```typescript
// test/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import { PrismaClient, Role } from '@prisma/client';

export class UserFactory {
  constructor(private prisma: PrismaClient) {}

  async create(overrides: Partial<Parameters<typeof this.prisma.user.create>[0]['data']> = {}) {
    return this.prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.person.fullName(),
        role: Role.USER,
        ...overrides,
      },
    });
  }

  async createWithOrders(orderCount: number) {
    return this.prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.person.fullName(),
        orders: {
          create: Array.from({ length: orderCount }, () => ({
            total: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
            status: 'CONFIRMED',
          })),
        },
      },
      include: { orders: true },
    });
  }
}

// Usage in tests
const factory = new UserFactory(prisma);
const user = await factory.create({ role: Role.ADMIN });
const userWithOrders = await factory.createWithOrders(5);
```

**Testing strategy summary:**

| Layer | What | How |
|-------|------|-----|
| **Unit tests** | Service business logic | Mock the ORM/repository |
| **Integration tests** | ORM queries + DB interaction | Real DB (testcontainers) |
| **E2E tests** | Full request lifecycle | Real DB + HTTP requests |

---

## Q10: Common Interview Questions

### Q: "When would you NOT use an ORM?"

**Answer:**

- **Complex reporting / analytics** — Window functions, recursive CTEs, and pivots are painful in ORM syntax. Write raw SQL.
- **Data warehousing / ETL** — Bulk loading millions of rows with COPY, temporary tables, or complex transforms. ORMs add overhead.
- **Performance-critical hot paths** — When you need to squeeze every millisecond, the ORM abstraction layer is measurable overhead.
- **Bulk operations** — Importing 1M rows via ORM `.save()` is orders of magnitude slower than a raw `COPY` or `INSERT ... SELECT`.
- **Existing legacy database** — If the schema doesn't map cleanly to objects (composite keys, no conventions), ORMs fight you.

### Q: "How do you handle database schema changes in a team?"

**Answer:**

- **Migrations are mandatory** — Never modify production schemas by hand
- **Prisma:** `prisma migrate dev` (development), `prisma migrate deploy` (production)
- **TypeORM:** migration generation and running via CLI
- **Code review migrations** like any other code — check for data loss, index creation, lock-time on large tables
- **CI pipeline** runs migrations against a test database before merge
- **Backward-compatible migrations** — add columns as nullable first, then backfill, then add constraints
- **Zero-downtime migrations** — avoid `ALTER TABLE ... ADD COLUMN ... NOT NULL` on large tables without a default

### Q: "Your ORM query is slow. How do you debug it?"

**Answer:**

Step-by-step debugging process:

1. **Enable query logging** — see the actual SQL being generated
2. **Copy the SQL** and run `EXPLAIN ANALYZE` in psql/pgAdmin
3. **Check the query plan** — look for sequential scans on large tables, nested loops, high row estimates
4. **Check indexes** — is the WHERE clause using indexed columns?
5. **Check for N+1** — are there many similar queries being fired?
6. **Optimize** — add indexes, rewrite as raw SQL, use select/projection, add cursor pagination
7. **Measure again** — verify the improvement with EXPLAIN ANALYZE

### Q: "How do you prevent SQL injection with ORMs?"

**Answer:**

All modern ORMs use **parameterized queries** by default — user input is never interpolated into the SQL string.

```typescript
// SAFE — parameterized (all ORMs do this)
await prisma.user.findMany({ where: { name: userInput } });
// Generated: SELECT * FROM users WHERE name = $1  (with parameter binding)

// SAFE — Prisma tagged template
await prisma.$queryRaw`SELECT * FROM users WHERE name = ${userInput}`;
// Parameterized via tagged template literal

// DANGEROUS — string interpolation in raw queries
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE name = '${userInput}'`);
// NEVER do this — classic SQL injection vector
```

### Q: "Prisma vs TypeORM — which would you choose for a new project?"

**Answer:**

*"It depends on the team and project requirements. Here's how I'd decide:"*

| Factor | Prisma | TypeORM |
|--------|--------|---------|
| **Type safety** | Superior — auto-generated from schema | Good but relies on decorators |
| **Schema definition** | Separate `.prisma` file | Co-located with entity classes |
| **Relations** | Explicit `include` — no lazy loading surprises | Supports eager/lazy loading |
| **Raw SQL** | `$queryRaw` tagged templates | `query()` method or QueryBuilder |
| **Migrations** | Excellent — declarative, auto-generated | Good but can be fragile with `synchronize` |
| **Complex queries** | Weak — drop to raw SQL often | Strong — QueryBuilder is powerful |
| **Performance** | Rust engine — good for simple queries | JS-based — more overhead per query |
| **Community** | Growing rapidly, modern docs | Mature, large ecosystem |
| **Mongo support** | Yes (Prisma 4+) | Yes (via separate package) |

*"For a new greenfield NestJS project, I'd lean toward Prisma for its type safety and developer experience. For projects with complex queries and reporting, TypeORM's QueryBuilder is stronger. For pure performance or complex SQL, I'd use Knex or raw SQL."*

---

## Quick Reference

### ORM Comparison Matrix

```
Feature              │ Prisma         │ TypeORM        │ Knex           │ Raw SQL
─────────────────────┼────────────────┼────────────────┼────────────────┼──────────
Type Safety          │ ★★★★★         │ ★★★★          │ ★★★           │ ★
Query Complexity     │ ★★★           │ ★★★★          │ ★★★★★        │ ★★★★★
Performance          │ ★★★★          │ ★★★           │ ★★★★         │ ★★★★★
Learning Curve       │ ★★★★          │ ★★★           │ ★★★★         │ ★★
Migrations           │ ★★★★★         │ ★★★           │ ★★★★         │ ★
NestJS Integration   │ ★★★★          │ ★★★★★        │ ★★★           │ ★★
```

### N+1 Detection & Prevention Checklist

- [ ] Query logging enabled in development
- [ ] Check generated SQL for repeated patterns
- [ ] Use `include` / `relations` for known required relations
- [ ] Implement DataLoader for GraphQL resolvers
- [ ] Set up query count alerts (> 20 queries per request = investigate)
- [ ] Review new PRs for loop-based database access

### Query Optimization Checklist

- [ ] Select only needed columns (`select` / projection)
- [ ] Use cursor pagination for large datasets
- [ ] Use `createMany` / `insert` for bulk writes (not `save` in a loop)
- [ ] Drop to raw SQL for complex aggregations
- [ ] Run `EXPLAIN ANALYZE` on slow queries
- [ ] Add indexes for frequently filtered/sorted columns
- [ ] Use connection pooling (PgBouncer for PostgreSQL)
- [ ] Consider read replicas for heavy read workloads

### Common Patterns Side-by-Side

**Find with filter:**

```typescript
// Prisma
await prisma.user.findMany({ where: { role: 'ADMIN' } });

// TypeORM
await userRepo.find({ where: { role: Role.ADMIN } });

// Knex
await knex('users').where({ role: 'admin' });
```

**Create with relation:**

```typescript
// Prisma
await prisma.user.create({
  data: { name: 'Alice', profile: { create: { bio: 'Hi' } } },
});

// TypeORM
const user = userRepo.create({ name: 'Alice', profile: { bio: 'Hi' } });
await userRepo.save(user); // cascade: true required on relation

// Knex (manual — no relation concept)
const [userId] = await knex('users').insert({ name: 'Alice' }).returning('id');
await knex('profiles').insert({ bio: 'Hi', userId });
```

**Transaction:**

```typescript
// Prisma
await prisma.$transaction(async (tx) => {
  await tx.user.update({ where: { id }, data: { credits: { decrement: 100 } } });
  await tx.order.create({ data: { userId: id, total: 100 } });
});

// TypeORM
await dataSource.transaction(async (manager) => {
  await manager.decrement(User, { id }, 'credits', 100);
  await manager.save(Order, { userId: id, total: 100 });
});

// Knex
await knex.transaction(async (trx) => {
  await trx('users').where({ id }).decrement('credits', 100);
  await trx('orders').insert({ userId: id, total: 100 });
});
```

---

> **Final interview tip:** Demonstrate that you understand ORMs are tools, not religions. The best engineers pick the right tool for each query — ORM for CRUD, query builder for reports, raw SQL for performance. Show you can move fluidly between all three.
