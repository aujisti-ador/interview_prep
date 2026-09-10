# Functions, Triggers, Procedures & In-Database Jobs

> Server-side programming in PostgreSQL: `FUNCTION`, `PROCEDURE`, `TRIGGER`, savepoints,
> advisory locks, `LISTEN/NOTIFY` and `pg_cron`.
>
> Interviewers use this topic to find out whether you *know* these tools and whether you know
> **when not to reach for them** — which is the harder half.

## In 60 seconds

1. **The interview question underneath all of this is: what belongs in the database?** The
   defensible line is *data integrity* in the database, *business logic* in the application.
   Constraints and triggers protect invariants; a pricing engine does not belong in PL/pgSQL.
2. **Function vs Procedure, in one line: a procedure can `COMMIT`, a function cannot.** A
   function always runs inside the caller's transaction. That single difference decides which
   you need.
3. **Triggers are invisible.** They fire whether or not your ORM knows, which is exactly why
   they are good for `updated_at` and audit logs — and dangerous for anything a developer needs
   to reason about.
4. **Volatility markings are not decoration.** `IMMUTABLE`, `STABLE`, `VOLATILE` change whether
   the planner can cache a result and whether you can build an index on the function. Getting it
   wrong is a correctness bug, not a performance one.
5. **A function is not a transaction boundary, but it can have savepoints.** A `BEGIN ...
   EXCEPTION` block is an implicit savepoint — cheap-looking, and expensive in a loop.
6. **`pg_cron` runs scheduled jobs inside Postgres itself.** Excellent for vacuum, partition
   creation and retention. A poor place for anything that calls an external API.

**The interview trap to expect:** *"you need to keep a `comment_count` on every post — how?"*
The answer is a trade-off, not a technique: a trigger keeps it always-correct but hides work
from the application; a periodic recount is simpler but stale; counting on read is correct but
slow. Naming all three and picking one with a reason is the answer.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **PL/pgSQL** | Postgres's procedural language — variables, loops, exception handling |
| **Function** | Returns a value. Runs *inside* the caller's transaction. Cannot commit |
| **Procedure** | Called with `CALL`. **Can** commit and start new transactions |
| **Trigger** | A function Postgres runs automatically on `INSERT`/`UPDATE`/`DELETE` |
| **BEFORE / AFTER trigger** | Runs before the row is written (can modify it) · after (cannot) |
| **ROW / STATEMENT trigger** | Fires once per affected row · once per statement |
| **`NEW` / `OLD`** | The incoming row · the previous row, inside a trigger |
| **Volatility** | `IMMUTABLE` (same input → same output, always) · `STABLE` (constant within one statement) · `VOLATILE` (anything) |
| **Savepoint** | A checkpoint inside a transaction you can roll back to |
| **Subtransaction** | What a `BEGIN ... EXCEPTION` block creates. Not free |
| **Advisory lock** | An application-defined lock, held by the database, meaning nothing to Postgres itself |
| **`LISTEN` / `NOTIFY`** | Postgres pushing a message to connected clients |
| **`pg_cron`** | Extension that runs scheduled SQL inside the database |
| **`SECURITY DEFINER`** | The function runs with its *owner's* privileges, not the caller's |
| **Generated column** | A column Postgres computes for you — often replaces a trigger |
| **Materialised view** | A stored query result you refresh on a schedule |

---

## Table of Contents

1. [What belongs in the database?](#1-what-belongs-in-the-database)
2. [Functions](#2-functions)
3. [Volatility, and why it matters](#3-volatility-and-why-it-matters)
4. [Procedures — and the one real difference](#4-procedures--and-the-one-real-difference)
5. [Triggers](#5-triggers)
6. [The trigger patterns worth knowing](#6-the-trigger-patterns-worth-knowing)
7. [When a trigger is the wrong answer](#7-when-a-trigger-is-the-wrong-answer)
8. [Transactions inside functions — savepoints and exceptions](#8-transactions-inside-functions--savepoints-and-exceptions)
9. [Advisory locks](#9-advisory-locks)
10. [LISTEN / NOTIFY](#10-listen--notify)
11. [In-database scheduling with pg_cron](#11-in-database-scheduling-with-pg_cron)
12. [Security: SECURITY DEFINER and search_path](#12-security-security-definer-and-search_path)
13. [Testing, migrating and versioning this code](#13-testing-migrating-and-versioning-this-code)
14. [Interview questions](#14-interview-questions)

---

## 1. What belongs in the database?

### Q1: Should business logic live in the database?

**Answer:**

This is the framing question, and a strong answer draws a line rather than picking a side.

**Put it in the database when the rule must hold no matter who writes the data:**

| Belongs in the DB | Why |
|---|---|
| Constraints — `NOT NULL`, `CHECK`, `UNIQUE`, foreign keys | The only place an invariant is genuinely enforced |
| `updated_at` maintenance | Every writer must do it, and every writer will forget |
| Audit trails | Must capture writes from migrations, psql and scripts too |
| Row-Level Security | Must not depend on the app remembering a filter |
| Referential cleanup — `ON DELETE CASCADE` | Correctness, not logic |

**Keep it in the application when it is a business decision:**

| Belongs in the app | Why |
|---|---|
| Pricing, discounts, eligibility | Changes often, needs tests, needs code review |
| Workflow and orchestration | Needs retries, observability, external calls |
| Anything calling an external service | A database transaction must never wait on a network |
| Anything a product manager will want changed next quarter | Deployment story matters |

**The argument to make out loud:**

> "Constraints and triggers in the database, business logic in the application. My reasoning is
> the deployment and debugging story — database logic is invisible to the ORM, hard to unit
> test, hard to review, and it does not appear in a stack trace. So it earns its place only when
> the rule must hold against writers the application does not control."

**The counter-argument to acknowledge**, because a good interviewer will raise it: if several
services or a legacy admin tool write to the same tables, the application is *not* the only
writer, and the database becomes the only place an invariant can actually live. That is a
legitimate reason to push more into it.

---

## 2. Functions

### Q2: Write a function. What are the choices you are making?

**Answer:**

```sql
-- Language SQL: simple, and the planner can INLINE it into the calling query,
-- which a PL/pgSQL function can never be. Prefer this when it is enough.
CREATE OR REPLACE FUNCTION order_total(p_order_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE                      -- see §3
AS $$
  SELECT COALESCE(SUM(quantity * unit_price), 0)
  FROM order_items
  WHERE order_id = p_order_id;
$$;
```

```sql
-- Language plpgsql: needed when you want variables, branching, loops or
-- exception handling. Cannot be inlined.
CREATE OR REPLACE FUNCTION apply_credit(p_user_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'credit must be positive, got %', p_amount
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE accounts
     SET balance = balance + p_amount
   WHERE user_id = p_user_id
  RETURNING balance INTO v_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no account for user %', p_user_id
      USING ERRCODE = 'no_data_found';
  END IF;

  RETURN v_balance;
END;
$$;
```

**The decisions embedded there, and why each is interview-worthy:**

| Choice | Reasoning |
|---|---|
| `LANGUAGE sql` where possible | It can be **inlined** into the calling query, so the planner sees through it. PL/pgSQL is an opaque box |
| `STABLE` not `VOLATILE` | See [§3](#3-volatility-and-why-it-matters) — it changes what the planner may do |
| `RAISE ... USING ERRCODE` | Gives the application a **stable SQLSTATE** to catch, instead of matching on message text |
| `IF NOT FOUND` | `UPDATE` affecting zero rows is not an error. Silently succeeding is the bug |
| `p_` prefix on parameters | Avoids the classic PL/pgSQL trap where a parameter name shadows a column name |

**That last one is a real bug source.** If a parameter is called `user_id` and the table has a
`user_id` column, `WHERE user_id = user_id` is `true` for every row. Prefixing parameters
prevents it; so does `#variable_conflict error`.

---

## 3. Volatility, and why it matters

### Q3: What do IMMUTABLE, STABLE and VOLATILE actually do?

**Answer:**

They tell the planner what it is allowed to assume. Mislabelling is a **correctness** bug.

| Marking | Promise | Planner may |
|---|---|---|
| `IMMUTABLE` | Same arguments → same result, forever. No table reads | Pre-evaluate at plan time; **use it in an index** |
| `STABLE` | Constant within a single statement. May read tables | Evaluate once per statement rather than per row |
| `VOLATILE` (default) | Anything. May have side effects | Nothing — must call it for every row |

**Where this bites, concretely:**

```sql
-- ❌ Marked IMMUTABLE but reads a table — the value can change underneath.
CREATE FUNCTION current_tax_rate() RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$ SELECT rate FROM tax_config LIMIT 1 $$;
-- Postgres may cache the result at plan time. You update tax_config and
-- some queries keep using the old rate. Nothing errors. Very hard to find.

-- ✅ It reads a table, so it is STABLE at best.
CREATE FUNCTION current_tax_rate() RETURNS numeric
LANGUAGE sql STABLE AS $$ SELECT rate FROM tax_config LIMIT 1 $$;
```

**Why `IMMUTABLE` matters for indexes** — this is the practical payoff:

```sql
-- You can only build an expression index on an IMMUTABLE function.
CREATE INDEX idx_users_lower_email ON users (lower(email));   -- lower() is IMMUTABLE ✓

-- Which then makes this use the index instead of scanning:
SELECT * FROM users WHERE lower(email) = 'a@b.com';
```

**The trap worth naming in an interview:** `to_char(timestamptz, ...)` is **not** immutable,
because its output depends on the session `TimeZone`. Trying to index it fails, and forcing it
with a wrapper marked `IMMUTABLE` produces an index that silently disagrees with reality for
anyone in a different timezone.

---

## 4. Procedures — and the one real difference

### Q4: When would you use a PROCEDURE instead of a FUNCTION?

**Answer:**

**When you need to commit.** That is essentially the whole answer.

| | Function | Procedure |
|---|---|---|
| Called with | `SELECT` | `CALL` |
| Returns | A value | Nothing (or `INOUT` params) |
| Transaction | **Runs inside the caller's** | **Can `COMMIT` / `ROLLBACK`** |
| Use it in a query | Yes | No |

**The case where it genuinely matters — batching a huge backfill:**

```sql
-- A function cannot do this: it would hold ONE transaction open across
-- 50 million rows, bloating the WAL and blocking vacuum the entire time.
CREATE OR REPLACE PROCEDURE backfill_user_region()
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows int;
BEGIN
  LOOP
    UPDATE users
       SET region = derive_region(country_code)
     WHERE region IS NULL
       AND id IN (SELECT id FROM users WHERE region IS NULL LIMIT 10000);

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;

    COMMIT;                      -- ← only a procedure may do this
    RAISE NOTICE 'committed % rows', v_rows;
  END LOOP;
END;
$$;

CALL backfill_user_region();
```

**Each batch commits, so locks are released and vacuum can keep up.** This is the standard
answer to "how do you backfill 50 million rows without taking the database down", alongside
doing it from the application. See
[06-database-migrations-schema-evolution.md](06-database-migrations-schema-evolution.md).

---

## 5. Triggers

### Q5: Explain the trigger dimensions.

**Answer:**

Three independent choices, and the combination decides what you can do.

```
   WHEN            BEFORE  │  AFTER  │  INSTEAD OF (views only)
   GRANULARITY     FOR EACH ROW      │  FOR EACH STATEMENT
   EVENT           INSERT │ UPDATE │ DELETE │ TRUNCATE
```

| Choice | Use it for | Note |
|---|---|---|
| **`BEFORE ... FOR EACH ROW`** | **Modifying the row being written** | Return the modified `NEW`. Returning `NULL` cancels the write |
| **`AFTER ... FOR EACH ROW`** | Reacting — audit rows, counters, notifications | The row is already written; `NEW` is read-only |
| **`FOR EACH STATEMENT`** | One action per statement regardless of row count | Much cheaper for bulk updates |
| **`INSTEAD OF`** | Making a view writable | Only on views |

**The canonical `BEFORE` trigger, and the one almost every schema should have:**

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;                     -- BEFORE triggers must return the row
END;
$$;

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

**Why this one is a good use of a trigger:** every writer must maintain `updated_at`, including
migrations, admin scripts and psql. Putting it in the application means it is correct until the
first time someone bypasses the application — and then it is quietly wrong.

**`WHEN` clauses avoid pointless work:**

```sql
-- Only fire when the status ACTUALLY changed, not on every update.
CREATE TRIGGER trg_order_status_changed
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)   -- IS DISTINCT FROM handles NULLs
  EXECUTE FUNCTION log_status_change();
```

`IS DISTINCT FROM` rather than `<>` is the detail: `NULL <> NULL` is `NULL`, not `true`, so a
`<>` comparison silently skips transitions into and out of `NULL`.

---

## 6. The trigger patterns worth knowing

### 6a. Audit log

Captures every change regardless of who wrote it — the strongest argument for triggers.

```sql
CREATE TABLE audit_log (
  id         bigserial PRIMARY KEY,
  table_name text        NOT NULL,
  row_id     text        NOT NULL,
  action     text        NOT NULL,
  old_data   jsonb,
  new_data   jsonb,
  changed_by text        DEFAULT current_setting('app.user_id', true),
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION audit_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,                                   -- the table that fired it
    COALESCE(NEW.id, OLD.id)::text,
    TG_OP,                                           -- INSERT / UPDATE / DELETE
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN NULL;                                       -- AFTER trigger: ignored
END;
$$;

CREATE TRIGGER trg_orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_changes();
```

**`current_setting('app.user_id', true)`** is how you get application context into the database
— the same mechanism as
[RLS tenant context](../phase-5-system-design/09-multi-tenancy-and-saas-architecture.md#4-row-level-security).
The `true` means "return NULL if unset" rather than erroring.

### 6b. Denormalised counter

```sql
CREATE OR REPLACE FUNCTION bump_comment_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;
```

**Say the cost out loud:** every comment insert now also updates the post row, so **all
concurrent inserts on the same post contend for that one row's lock.** On a hot post that is a
serialisation point. The alternatives are a periodic recount, or an append-only counter table
summed on read, or accepting an approximate count.

### 6c. Prefer a generated column where you can

Often the trigger is unnecessary:

```sql
-- Postgres maintains this. No trigger, no drift, no lock contention.
ALTER TABLE order_items
  ADD COLUMN line_total numeric GENERATED ALWAYS AS (quantity * unit_price) STORED;

-- Same idea for full-text search:
ALTER TABLE articles
  ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;
```

**Reaching for a generated column instead of a trigger is a good instinct to demonstrate** — it
is declarative, cannot drift, and needs no code.

---

## 7. When a trigger is the wrong answer

| Anti-pattern | Why it hurts |
|---|---|
| **Business logic in triggers** | Invisible to the ORM, absent from stack traces, hard to test, and it fires when you did not expect |
| **Triggers calling external services** | The transaction now waits on a network. A slow API becomes a database outage |
| **Chained triggers** | Trigger A updates a table with trigger B, which updates A's table… Recursion, and the order is not obvious |
| **Triggers doing heavy work per row** | A bulk `UPDATE` of 1M rows fires it 1M times. Use a statement-level trigger |
| **Triggers as your only integration** | Nobody reading the application code knows they exist |

**The rule that survives scrutiny:**

> A trigger should maintain data *about* the data — timestamps, audit rows, derived columns. The
> moment it starts making a business decision, it belongs in the application.

**And say this too:** triggers make debugging harder because they are absent from the code a
developer is reading. Document them in the repo. A `docs/DATABASE.md` listing every trigger and
what it does is a cheap fix for a real problem.

---

## 8. Transactions inside functions — savepoints and exceptions

### Q6: Can a function roll back part of its work?

**Answer:**

A function cannot commit, but it **can** roll back to a savepoint — and PL/pgSQL creates one
implicitly for every `BEGIN ... EXCEPTION` block.

```sql
CREATE OR REPLACE FUNCTION import_row(p jsonb)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  BEGIN                                    -- ← implicit SAVEPOINT here
    INSERT INTO customers (email, name)
    VALUES (p->>'email', p->>'name');
    RETURN 'inserted';
  EXCEPTION
    WHEN unique_violation THEN             -- ← rolls back to the savepoint
      RETURN 'duplicate';
  END;
END;
$$;
```

**The performance trap, and it is a good thing to know:** every `EXCEPTION` block is a
subtransaction, and subtransactions are not free. Each one consumes an XID slot; **past 64 per
transaction they spill to disk and can cause a severe, cliff-edged slowdown** across the whole
database. A loop over a million rows with an `EXCEPTION` block inside is a genuine production
hazard.

```sql
-- ❌ One subtransaction per row.
FOR r IN SELECT * FROM staging LOOP
  BEGIN
    INSERT INTO target ...;
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END LOOP;

-- ✅ Let SQL handle the conflict. No subtransaction at all.
INSERT INTO target SELECT * FROM staging
ON CONFLICT (id) DO NOTHING;
```

**`ON CONFLICT` instead of exception handling** is the idiomatic answer and it is dramatically
faster.

**Error handling contract with the application:** raise with an explicit `ERRCODE` so the
application catches a stable `SQLSTATE`, not a message string:

```sql
RAISE EXCEPTION 'insufficient balance' USING ERRCODE = 'P0001',
  DETAIL = format('balance %s, requested %s', v_balance, p_amount),
  HINT   = 'top up the account first';
```

```ts
// Node side — match on the code, never the message
catch (e: any) {
  if (e.code === 'P0001') throw new BadRequestException(e.detail);
  throw e;
}
```

Transaction fundamentals, isolation levels and MVCC are in
[01-postgresql-deep-dive.md](01-postgresql-deep-dive.md#q4-transactions-acid--isolation-levels).

---

## 9. Advisory locks

### Q7: How do you stop two application instances doing the same job?

**Answer:**

**Advisory locks** — application-defined locks the database holds. Postgres attaches no meaning
to them; you do.

```sql
-- Session-level: held until released or the connection drops.
SELECT pg_try_advisory_lock(hashtext('nightly-report'));   -- true if acquired

-- Transaction-level: released automatically at COMMIT/ROLLBACK. Safer —
-- you cannot leak it by forgetting to unlock.
SELECT pg_try_advisory_xact_lock(hashtext('nightly-report'));
```

```ts
// Only one instance runs the job; the others return immediately.
const [{ locked }] = await prisma.$queryRaw<{locked: boolean}[]>`
  SELECT pg_try_advisory_xact_lock(hashtext('nightly-report')) AS locked`;
if (!locked) return;
await runReport();          // lock released when the transaction ends
```

**Why this is worth knowing:** it is a distributed lock you already have, with no extra
infrastructure. Compared with a Redis lock, it has **no expiry problem** — if the process dies,
the connection drops and the lock is gone, so there is no stale-lock window and no need for
fencing tokens.

**The limits, and state them:** it is per-database-cluster, so it does not span a primary and
its replicas or multiple database servers. And a session-level lock leaks if you use a
connection pool and forget to release — which is why the transaction-scoped variant is the safer
default.

Compare with the Redis approach in
[02-redis-deep-dive.md](02-redis-deep-dive.md#q4-redis-as-a-distributed-lock-redlock).

---

## 10. LISTEN / NOTIFY

### Q8: Can the database push an event to the application?

**Answer:**

Yes — `NOTIFY` sends a message to every connection that has issued `LISTEN` on that channel.

```sql
CREATE OR REPLACE FUNCTION notify_order_created()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('order_created', json_build_object(
    'id', NEW.id, 'total', NEW.total
  )::text);
  RETURN NULL;
END;
$$;
```

```ts
const client = new Client(...); await client.connect();
await client.query('LISTEN order_created');
client.on('notification', (msg) => handle(JSON.parse(msg.payload!)));
```

**The properties that decide whether you can use it:**

| Property | Consequence |
|---|---|
| **Delivered on COMMIT** | You never see an event for a rolled-back transaction. Genuinely useful |
| **Fire and forget** | A disconnected listener **misses it permanently**. There is no replay |
| **8 KB payload limit** | Send an id, not the row |
| **Needs a dedicated connection** | It must stay open, so it does not work through most poolers in transaction mode |

**So: use it as a latency optimisation, never as your delivery guarantee.** The pattern that
works is the outbox plus `NOTIFY` as a wake-up:

```
  write row + outbox row  (one transaction)
            │
            ├── NOTIFY  ──▶  worker wakes immediately     ← fast path
            └── worker also polls every N seconds         ← correctness path
```

If the notification is missed, the poll catches it. That combination gives you low latency
*and* at-least-once delivery. Compare with a real broker in
[../phase-2-apis-realtime-systems/04-event-driven-architecture.md](../phase-2-apis-realtime-systems/04-event-driven-architecture.md).

---

## 11. In-database scheduling with pg_cron

### Q9: How do you run scheduled jobs inside Postgres?

**Answer:**

`pg_cron` is an extension that runs SQL on a cron schedule, from inside the database.

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Nightly: drop partitions older than the retention window
SELECT cron.schedule(
  'drop-old-partitions', '0 3 * * *',
  $$ CALL drop_partitions_older_than('90 days') $$
);

-- Every 10 minutes: refresh a dashboard view without blocking readers
SELECT cron.schedule(
  'refresh-daily-stats', '*/10 * * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats $$
);

-- Hourly: create next month's partition before anyone needs it
SELECT cron.schedule('ensure-partitions', '0 * * * *',
  $$ CALL ensure_future_partitions() $$);

SELECT * FROM cron.job;                       -- what is scheduled
SELECT * FROM cron.job_run_details            -- did it work?
 ORDER BY start_time DESC LIMIT 20;
```

**What it is genuinely good for** — all data-local, all failure-tolerant:

| Job | Why in-database |
|---|---|
| Creating and dropping partitions | Pure DDL, must happen regardless of app state |
| `REFRESH MATERIALIZED VIEW CONCURRENTLY` | Data-local; moving it out gains nothing |
| Retention deletes | Big, slow, batched — better near the data |
| `VACUUM`/`ANALYZE` on specific tables | Maintenance |
| Reconciliation queries | Reads a lot, returns little |

**What it is bad for:**

- **Anything calling an external API.** No retries you control, no circuit breaker, no
  observability, and it blocks a database connection.
- **Anything needing a real retry policy or a dead-letter queue.**
- **Long-running work.** It occupies a connection for the duration.

**The comparison to draw**, because the follow-up is always "why not a Kubernetes CronJob?":

| | `pg_cron` | App scheduler (BullMQ) | K8s CronJob / EventBridge |
|---|---|---|---|
| Runs if the app is down | **Yes** | No | Yes |
| Retries, backoff, DLQ | Minimal | **Rich** | Basic |
| Observability | `cron.job_run_details` | Your existing tooling | Cluster logs |
| Can call external services | Badly | **Yes** | **Yes** |
| Survives multiple app replicas | **Yes — single scheduler** | Needs a lock | Yes |
| Managed Postgres support | RDS/Aurora/Cloud SQL: yes | n/a | n/a |

**The line I would give:** *"`pg_cron` for data maintenance that must happen whether or not the
application is running — partitions, retention, materialised views. Application scheduler for
anything with business logic, external calls or a retry policy."*

**One caveat worth knowing:** `pg_cron` jobs run on the **primary** only, and by default in the
database given by `cron.database_name`. After a failover the extension must be configured on the
new primary, or your scheduled jobs silently stop. That silence is the dangerous part — pair it
with an alert on `cron.job_run_details` going quiet.

---

## 12. Security: SECURITY DEFINER and search_path

### Q10: What is `SECURITY DEFINER` and why is it dangerous?

**Answer:**

A function normally runs with the **caller's** privileges. `SECURITY DEFINER` makes it run with
the **owner's** — the SQL equivalent of setuid.

It is genuinely useful: it lets a low-privilege application role perform one specific
high-privilege operation through a controlled entry point.

**The vulnerability is `search_path`.** If the function references an unqualified table, an
attacker who can create objects in a schema earlier on the search path can hijack the call:

```sql
-- ❌ Vulnerable: `accounts` is unqualified
CREATE FUNCTION transfer(...) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE accounts SET ...;    -- WHOSE accounts?
END; $$;

-- attacker: CREATE TABLE evil.accounts (...); SET search_path = evil, public;
-- your privileged function now writes to their table.

-- ✅ Pin the search_path on the function itself
CREATE FUNCTION transfer(...) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp                -- ← the fix
AS $$ ... $$;
```

**Always `SET search_path` on a `SECURITY DEFINER` function**, and include `pg_temp` last so a
temporary table cannot shadow a real one. Knowing this specific fix is a strong security signal
— it is a real CVE class, not a theoretical one.

**Also:** `REVOKE EXECUTE ... FROM PUBLIC` and grant it deliberately, because functions are
executable by everyone by default.

---

## 13. Testing, migrating and versioning this code

The honest weakness of database-side code: **it is code that does not live in your repo by
default, has no unit test framework, and does not appear in a diff unless you make it.**

**Treat it like application code:**

| Practice | How |
|---|---|
| **In version control** | Every function and trigger is created by a migration file. Never `psql` it in by hand |
| **Idempotent** | `CREATE OR REPLACE FUNCTION` always. For triggers, `DROP TRIGGER IF EXISTS` then create |
| **Tested** | Integration tests against a real Postgres — testcontainers. There is no mocking a trigger |
| **Reviewed** | It is in the migration, so it goes through the PR |
| **Documented** | A `docs/DATABASE.md` listing triggers and scheduled jobs, because nobody reading the app will find them |

```sql
-- The idempotent trigger pattern for migrations
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger ...;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

```ts
// The test that matters: prove the trigger fires. You cannot unit test this.
it('sets updated_at on every update', async () => {
  const before = await db.order.findUnique({ where: { id } });
  await db.$executeRaw`UPDATE orders SET status = 'paid' WHERE id = ${id}`;
  const after = await db.order.findUnique({ where: { id } });
  expect(after!.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime());
});
```

**On ORMs:** Prisma and TypeORM do not model triggers or functions. In Prisma you add them via
`prisma migrate dev --create-only` and then hand-edit the SQL. Say this in an interview — it
shows you have actually shipped it rather than read about it.

---

## 14. Interview questions

**Q: Should business logic live in the database?**
> Data integrity yes, business decisions no. Constraints and triggers for invariants that must
> hold against every writer including migrations and scripts; the application for anything that
> changes with the business, needs tests, or calls an external service. The exception is when
> several services write the same tables — then the database is the only place an invariant can
> actually live.

**Q: Function or procedure?**
> A procedure when I need to commit — batched backfills are the real case, so each batch releases
> its locks instead of holding one transaction across 50 million rows. Otherwise a function, and
> `LANGUAGE sql` rather than plpgsql where possible, because the planner can inline it.

**Q: What does marking a function IMMUTABLE do?**
> It promises the same arguments always give the same result, which lets the planner pre-evaluate
> it and lets me build an expression index on it. Mislabelling something that reads a table as
> IMMUTABLE is a correctness bug — the planner may cache a stale value and nothing will error.

**Q: How would you maintain a `comment_count` on posts?**
> Three options with different trade-offs. An `AFTER INSERT/DELETE` trigger keeps it exactly
> correct but serialises concurrent comments on the same post's row. A periodic recount is
> simpler and slightly stale. Counting on read is always right and slow. For a social feed I'd
> take the trigger and accept the contention, or an append-only counter table if a post can be
> genuinely hot.

**Q: Two app instances must not run the same nightly job. How?**
> `pg_try_advisory_xact_lock`. It is a distributed lock I already have, and unlike a Redis lock
> there is no expiry problem — if the process dies the connection drops and the lock goes with
> it, so no stale-lock window and no fencing token needed.

**Q: When would you use `pg_cron` over a Kubernetes CronJob?**
> When the work is data-local and must run whether or not the app is deployed — partition
> management, retention deletes, refreshing materialised views. Not for anything calling an
> external API, because there is no real retry policy or circuit breaker and it holds a database
> connection. And I'd alert on `cron.job_run_details` going quiet, because after a failover
> pg_cron can silently stop.

**Q: Can I use LISTEN/NOTIFY instead of a message queue?**
> Only as a latency optimisation. It is fire-and-forget — a disconnected listener misses the
> event permanently, and there is no replay. The pattern that works is an outbox for correctness
> plus NOTIFY to wake the worker immediately, with polling as the fallback.

**Q: What is the risk with SECURITY DEFINER?**
> `search_path` hijacking. If the function references an unqualified table, someone who can
> create objects in an earlier schema can make the privileged function operate on their table.
> The fix is `SET search_path = public, pg_temp` on the function, and revoking EXECUTE from
> PUBLIC.

---

## Related

- [01-postgresql-deep-dive.md](01-postgresql-deep-dive.md) — transactions, isolation levels, MVCC, indexing
- [06-database-migrations-schema-evolution.md](06-database-migrations-schema-evolution.md) — where this code is deployed from, and batched backfills
- [02-redis-deep-dive.md](02-redis-deep-dive.md) — the alternative distributed lock, and its expiry problem
- [09-choosing-the-right-database.md](09-choosing-the-right-database.md) — when the answer is a different store entirely
- [../phase-2-apis-realtime-systems/04-event-driven-architecture.md](../phase-2-apis-realtime-systems/04-event-driven-architecture.md) — the outbox pattern behind §10
- [../phase-5-system-design/09-multi-tenancy-and-saas-architecture.md](../phase-5-system-design/09-multi-tenancy-and-saas-architecture.md) — RLS, and `current_setting` for request context
- [../phase-1-core-programming/04-testing-and-quality.md](../phase-1-core-programming/04-testing-and-quality.md) — testcontainers, the only way to test this
