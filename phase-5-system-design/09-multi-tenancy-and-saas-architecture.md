# Multi-Tenancy & SaaS Architecture

> Most remote backend roles you will apply to are SaaS companies. "How do you isolate tenants?"
> is therefore a routine question, and the wrong answer is expensive in a way that is very hard
> to undo later.

## In 60 seconds

1. **Multi-tenancy means many customers sharing one system.** The whole design question is: how
   much do they share, and where is the wall?
2. **Three models, and the choice is mostly economic:** shared database with a `tenant_id`
   column · a schema per tenant · a database per tenant. Cost per tenant rises left to right;
   isolation strength rises with it.
3. **Start with a shared database and a `tenant_id` column.** It is cheapest to run and easiest
   to migrate. Move a tenant out when a specific customer's compliance or scale demands it.
4. **The catastrophic bug is a query missing its tenant filter.** One forgotten `WHERE
   tenant_id = ?` shows customer A customer B's data. **Do not rely on developers remembering** —
   enforce it in one place.
5. **Row-Level Security in Postgres is the strongest enforcement** available in the shared
   model: the database itself refuses to return other tenants' rows, even if your code forgets.
6. **The noisy-neighbour problem is the other half.** One tenant running a huge report should
   not slow everyone else. That is rate limits, query budgets and connection quotas per tenant.

**The interview trap to expect:** *"how do you make sure tenant A never sees tenant B's data?"*
A weak answer says "we filter by tenant_id in every query". A strong one says that is necessary
but insufficient, and describes a mechanism that fails safe — RLS, a repository layer that
cannot construct an unscoped query, or a per-tenant connection.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Tenant** | One customer organisation using your system |
| **Multi-tenant** | Many customers on shared infrastructure |
| **Single-tenant** | One customer per deployment |
| **Tenant isolation** | Preventing one tenant from reaching another's data or capacity |
| **Shared schema** | All tenants in the same tables, separated by a `tenant_id` column |
| **Schema-per-tenant** | One Postgres schema each, one database |
| **Database-per-tenant** | A separate database each |
| **RLS** | Row-Level Security — Postgres enforcing per-row visibility itself |
| **Noisy neighbour** | One tenant consuming shared capacity and degrading others |
| **Tenant context** | Knowing which tenant the current request belongs to |
| **Pooled vs siloed** | Shared resources · dedicated resources |
| **Bridge model** | Mixing: most tenants pooled, large ones siloed |
| **Tenant onboarding** | Everything that must happen to create a new customer |
| **Data residency** | A legal requirement that data stay in a country or region |

---

## Table of Contents

1. [The three models](#1-the-three-models)
2. [Choosing between them](#2-choosing-between-them)
3. [Shared schema, done safely](#3-shared-schema-done-safely)
4. [Row-Level Security](#4-row-level-security)
5. [Carrying tenant context through the request](#5-carrying-tenant-context-through-the-request)
6. [Noisy neighbours](#6-noisy-neighbours)
7. [Migrations across tenants](#7-migrations-across-tenants)
8. [Onboarding and offboarding](#8-onboarding-and-offboarding)
9. [The bridge model](#9-the-bridge-model)
10. [Interview questions](#10-interview-questions)

---

## 1. The three models

```
  SHARED SCHEMA                SCHEMA PER TENANT            DATABASE PER TENANT

  ┌──────────────────┐         ┌──────────────────┐         ┌────┐ ┌────┐ ┌────┐
  │  one database    │         │  one database    │         │ db │ │ db │ │ db │
  │ ┌──────────────┐ │         │ ┌────┐┌────┐┌───┐│         │ A  │ │ B  │ │ C  │
  │ │ orders       │ │         │ │sch ││sch ││sch││         └────┘ └────┘ └────┘
  │ │ tenant_id=A  │ │         │ │ A  ││ B  ││ C ││
  │ │ tenant_id=B  │ │         │ └────┘└────┘└───┘│         strongest isolation
  │ │ tenant_id=C  │ │         └──────────────────┘         highest cost
  │ └──────────────┘ │
  └──────────────────┘         middle ground                one backup each
                                                            one migration each
  cheapest to run              schema-level separation
  one migration                
  ONE BUG = LEAK
```

| | Shared schema | Schema per tenant | Database per tenant |
|---|---|---|---|
| Cost per tenant | Lowest | Medium | **Highest** |
| Isolation | Weakest — code enforces it | Medium | **Strongest** |
| Migrations | One, for everyone | N schemas | N databases |
| Noisy neighbour risk | High | Medium | **Low** |
| Per-tenant restore | Painful | Doable | **Trivial** |
| Cross-tenant analytics | Easy | Harder | **Hard** |
| Scales to | Many thousands | Hundreds | Tens–low hundreds |
| Blast radius of a bug | **Every tenant** | Every tenant | One tenant |

---

## 2. Choosing between them

**Default to shared schema.** It is the cheapest to run and the easiest to change your mind
about. You can always move one tenant out; consolidating hundreds of databases back is a
project.

**Move a tenant to its own database when:**

| Trigger | Why |
|---|---|
| **A contractual or regulatory requirement** | Some enterprise and healthcare customers require physical separation |
| **Data residency** | Their data must stay in a specific country |
| **They are enormous** | One tenant that is 40% of your data will distort every query plan |
| **They need a different maintenance window** | Their upgrade timing is negotiated separately |
| **They pay for it** | Dedicated infrastructure as a pricing tier is a legitimate product |

**Say the economics in an interview**, because that is the actual argument: *"database per
tenant costs roughly a database per customer, which is fine at fifty enterprise accounts and
impossible at fifty thousand self-serve ones. So the model follows the business model."*

**Schema-per-tenant is the awkward middle.** It gives you real separation and per-tenant restore,
but migrations become N operations and Postgres degrades with very large schema counts. It is a
reasonable choice in the hundreds, rarely beyond.

---

## 3. Shared schema, done safely

The model is cheap and one mistake leaks customer data. So the entire discipline is **making the
mistake impossible rather than unlikely.**

**Layer 1 — every table carries the tenant.**

```sql
CREATE TABLE orders (
  id         uuid PRIMARY KEY,
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  ...
);

-- tenant_id FIRST in every composite index. Queries always filter by it,
-- so it belongs at the front — same reasoning as any composite index.
CREATE INDEX ON orders (tenant_id, created_at DESC);
```

**Layer 2 — the application cannot construct an unscoped query.**

```ts
// ❌ Relies on every developer remembering, forever, in every query.
const orders = await prisma.order.findMany({ where: { status } });

// ✅ A repository that always injects the tenant. The unscoped call is
//    not reachable from feature code.
@Injectable()
export class OrderRepository {
  constructor(private readonly ctx: TenantContext, private readonly db: PrismaService) {}

  findMany(where: Omit<Prisma.OrderWhereInput, 'tenantId'>) {
    return this.db.order.findMany({ where: { ...where, tenantId: this.ctx.tenantId } });
  }
}
```

**Layer 3 — the database refuses anyway.** That is RLS, below.

**Three layers, because layers one and two are code and code has bugs.** The interview answer
worth giving is that you assume the filter *will* be forgotten once, and design so that when it
is, nothing leaks.

**Test it explicitly:**

```ts
// The test every multi-tenant codebase should have and most do not.
it('cannot read another tenant\'s orders', async () => {
  const a = await createTenantWithOrder();
  const b = await createTenant();

  const ctx = tenantContext(b.id);
  const found = await new OrderRepository(ctx, db).findMany({});

  expect(found).toHaveLength(0);              // not "throws" — returns nothing
});
```

---

## 4. Row-Level Security

Postgres can enforce tenant scoping itself. **Even a query with no `WHERE` clause returns only
the current tenant's rows.**

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Note: the table owner bypasses RLS unless you also FORCE it.
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
```

```ts
// Set the tenant for the duration of the transaction. Everything inside
// is now scoped by the database itself.
await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
  //                                                       ↑ true = transaction-local
  return tx.order.findMany({ where: { status } });   // no tenantId needed
});
```

**Why `true` matters:** it scopes the setting to the transaction. Without it the setting persists
on the *connection*, and since connections are pooled, the next request on that connection
inherits the previous tenant. **That is the exact bug RLS was supposed to prevent**, reintroduced
by connection pooling — and it is a great detail to mention.

**Trade-offs to state:**

| Pro | Con |
|---|---|
| Fails safe — forgetting the filter returns nothing, not everything | Slight query overhead |
| Enforced for every client, including psql and scripts | Migrations and admin tasks need a bypass path |
| One place to audit | Debugging is confusing until you know it is on |

**RLS is the strongest answer available for shared-schema isolation**, and naming it separates
you from candidates who only offer application-level filtering.

---

## 5. Carrying tenant context through the request

The tenant must be established once, early, from a trusted source — **never from a request body
or a client-supplied header.**

```ts
// Resolve from the authenticated principal, not from anything the client
// can set. A `X-Tenant-Id` header the client controls is an authorisation
// bypass wearing a hat.
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.user?.tenantId;          // from the verified JWT
    if (!tenantId) throw new UnauthorizedException();
    tenantStorage.run({ tenantId }, next);        // AsyncLocalStorage
  }
}
```

**`AsyncLocalStorage` is the right tool** — it carries the context through async calls without
threading a parameter through every function signature, which is how the parameter eventually
gets forgotten.

**Where tenancy leaks if you are not careful:**

| Path | Risk |
|---|---|
| **Background jobs** | No request, so no context. The tenant must be *in the job payload* |
| **Queue consumers** | Same. And it must be re-established before any query |
| **Cron jobs** | Iterate tenants explicitly; never run unscoped |
| **Cache keys** | `user:42` collides across tenants. Always `tenant:A:user:42` |
| **File paths / S3 keys** | Prefix with the tenant |
| **Search indexes** | The tenant must be a filter, applied before the query |
| **Logs and traces** | Include the tenant id — you will need it, and it must not include *their* data |

**The cache-key one bites people.** A shared Redis with unprefixed keys is a cross-tenant leak
that no database control will catch.

---

## 6. Noisy neighbours

Isolation is not only about data. One tenant can degrade everyone by consuming shared capacity.

| Resource | Control |
|---|---|
| **API requests** | Rate limit **per tenant**, not only per IP or per user |
| **Database connections** | A per-tenant cap, so one cannot exhaust the pool |
| **Long queries** | `statement_timeout`, set lower for interactive paths |
| **Background jobs** | Per-tenant queue concurrency, or fair-share scheduling |
| **Storage** | Quotas, enforced at write time |
| **Expensive reports** | Route to a replica or a separate analytics store |

```ts
// Per-tenant rate limiting. Without the tenant in the key, a single
// large customer consumes the shared budget and everyone else sees 429s
// they did nothing to earn.
const key = `rate:${tenantId}:${route}`;
const limit = tenant.plan === 'enterprise' ? 10_000 : 1_000;
```

**A fair-share job queue** is the pattern worth naming: instead of one FIFO queue where a tenant
enqueuing 100,000 jobs blocks everyone, use a queue per tenant and round-robin between them.
Latency then depends on how many tenants are active, not on the largest one's backlog.

---

## 7. Migrations across tenants

**Shared schema:** one migration, applied once. This is its biggest operational advantage, and
it is a real one.

**Schema or database per tenant:** the migration is now a distributed operation.

```
  for each tenant:
    apply migration
    verify
    record version
```

**What makes this hard:**

- **Partial failure.** Tenant 47 of 200 fails. Now you have two schema versions in production and
  your code must work against both — which is exactly the
  [expand/contract](../phase-3-databases-data/06-database-migrations-schema-evolution.md)
  discipline, made mandatory.
- **Duration.** 200 databases × 30 seconds is an hour and a half.
- **Version drift.** Track the applied version per tenant explicitly, or you will lose count.
- **Rollout order.** Migrate internal and small tenants first. Your largest customer goes last.

**The rule that keeps this survivable:** every migration must be backward compatible, because
during the rollout old code and new schema coexist by definition.

---

## 8. Onboarding and offboarding

**Onboarding** — what must happen when a customer signs up:

```
  create tenant row
  create the admin user + invite
  seed defaults (roles, settings, sample data)
  provision anything siloed (schema/database/bucket, if applicable)
  register in billing
  configure subdomain / custom domain
  emit tenant.created for downstream systems
```

**Make it idempotent and re-runnable.** Onboarding fails halfway more often than you expect, and
a half-created tenant is a support ticket. Same reasoning as any distributed workflow — this is
a small saga.

**Offboarding is the one people forget, and it has legal teeth:**

| Requirement | Implication |
|---|---|
| **Export their data** | They are entitled to it. Build it before the first customer leaves |
| **Delete on request** | GDPR right to erasure. Must reach backups, caches, search indexes, logs, analytics |
| **Retention window** | Usually soft-delete for N days, then hard delete |
| **Prove it** | Auditors ask. Log the deletion |

**"Delete a tenant" is a genuinely hard problem in the shared model**, because their rows are
interleaved with everyone else's across every table, plus derived stores. In the
database-per-tenant model it is `DROP DATABASE`. **That asymmetry is a legitimate argument for
siloing regulated customers**, and it is a strong point to raise unprompted.

---

## 9. The bridge model

What mature SaaS products actually run: **pooled by default, siloed by exception.**

```
   ┌─────────────────────────────────────────┐
   │  POOLED — thousands of self-serve       │   shared schema + RLS
   │  tenants on shared infrastructure       │   cheapest per tenant
   └─────────────────────────────────────────┘
   ┌────────────┐ ┌────────────┐ ┌──────────┐
   │ Enterprise │ │ Enterprise │ │ EU-only  │   dedicated databases
   │ customer A │ │ customer B │ │ customer │   compliance / scale / residency
   └────────────┘ └────────────┘ └──────────┘
```

**The requirement this places on your code:** the tenant's connection details become *data*, not
configuration. A resolver maps tenant → connection, and the rest of the application is unaware.

```ts
// The application does not know or care which model a tenant is on.
const db = await this.tenantConnections.for(tenantId);
```

**Build the seam early even if every tenant starts pooled.** Retrofitting it once you have a
customer demanding isolation, under contract pressure, is a bad time to discover your data
access layer assumes one database.

---

## 10. Interview questions

**Q: How do you ensure tenant A never sees tenant B's data?**
> Defence in depth. Every table has `tenant_id` with it first in composite indexes; a repository
> layer injects the filter so feature code cannot construct an unscoped query; and Postgres RLS
> enforces it at the database, so a forgotten filter returns nothing rather than everything. Plus
> a test that asserts cross-tenant reads come back empty.

**Q: Shared database or database per tenant?**
> It follows the business model. Thousands of self-serve tenants make per-tenant databases
> economically impossible, so shared schema with RLS. Fifty enterprise customers paying for
> isolation make it easy. Most mature products end up on a bridge — pooled by default, siloed
> for customers with compliance, residency or scale requirements.

**Q: One customer's reports are slowing everyone down.**
> Noisy neighbour. Short term: `statement_timeout` and a per-tenant connection cap so they
> cannot exhaust the pool. Medium term: route reporting to a replica or a columnar store so
> analytical load never touches the transactional path. Long term: if they are consistently
> outsized, they are a candidate for their own database.

**Q: How do you migrate a schema across 200 tenant databases?**
> As a rollout, not an event. Every migration must be backward compatible because old code and
> new schema coexist during it. I'd track the applied version per tenant, run internal and small
> tenants first and the largest customer last, and make the runner resumable — partial failure
> is the normal case at that count.

**Q: A customer invokes their right to be forgotten.**
> Their data is not only in the primary database — it is in the search index, the cache, object
> storage, analytics and logs. So deletion has to be a workflow across all of them, with a
> retention window and an audit record. This is genuinely easier in the siloed model, which is
> one of the honest arguments for it.

**Q: Where does tenant context most often leak?**
> Anywhere there is no request: background jobs, queue consumers and cron. The tenant has to be
> in the job payload and re-established before any query. After that, cache keys — an unprefixed
> Redis key is a cross-tenant leak that no database control catches.

---

## Related

- [02-architecture-patterns.md](02-architecture-patterns.md) — service boundaries and the bridge seam
- [05-reliability-security-cost.md](05-reliability-security-cost.md) — blast radius and cost per tenant
- [../phase-3-databases-data/01-postgresql-deep-dive.md](../phase-3-databases-data/01-postgresql-deep-dive.md) — RLS, composite indexes, `statement_timeout`
- [../phase-3-databases-data/06-database-migrations-schema-evolution.md](../phase-3-databases-data/06-database-migrations-schema-evolution.md) — expand/contract, made mandatory here
- [../phase-4-cloud-infrastructure/06-security-compliance.md](../phase-4-cloud-infrastructure/06-security-compliance.md) — GDPR erasure, residency, SOC 2
- [../phase-3-databases-data/02-redis-deep-dive.md](../phase-3-databases-data/02-redis-deep-dive.md) — cache key namespacing
