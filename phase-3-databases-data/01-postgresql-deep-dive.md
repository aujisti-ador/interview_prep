# PostgreSQL Deep Dive — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with practical SQL, TypeScript, and NestJS code examples
> **Goal:** Confidently answer any PostgreSQL question in a senior backend interview

## Table of Contents
1. [PostgreSQL Architecture & How It Works](#q1-postgresql-architecture--how-it-works)
2. [Indexing Strategies (Most Asked Topic)](#q2-indexing-strategies-most-asked-topic)
3. [EXPLAIN & Query Optimization](#q3-explain--query-optimization)
4. [Transactions, ACID & Isolation Levels](#q4-transactions-acid--isolation-levels)
5. [Joins Deep Dive](#q5-joins-deep-dive)
6. [Normalization vs Denormalization](#q6-normalization-vs-denormalization)
7. [JSONB in PostgreSQL](#q7-jsonb-in-postgresql)
8. [Partitioning](#q8-partitioning)
9. [Replication & High Availability](#q9-replication--high-availability)
10. [Performance Tuning & Configuration](#q10-performance-tuning--configuration)
11. [CTEs & Window Functions](#q11-common-table-expressions-ctes--window-functions)
12. [Full-Text Search](#q12-full-text-search)
13. [PostgreSQL with Node.js/NestJS](#q13-postgresql-with-nodejsnestjs)
14. [Database Design Interview Questions](#q14-database-design-interview-questions)
15. [PostgreSQL Security](#q15-postgresql-security)
16. [Quick Reference](#quick-reference)

---

## Q1: PostgreSQL Architecture & How It Works

### Q: Explain the PostgreSQL process architecture. What happens when a client connects?

**Answer:**

PostgreSQL uses a **process-per-connection** model (not threaded). The main components are:

**Process Model:**

| Process | Role |
|---------|------|
| **Postmaster** | The main daemon. Listens for connections, forks a new backend process for each client. |
| **Backend Process** | One per connection. Parses, plans, and executes queries for that client. |
| **Background Writer** | Periodically flushes dirty pages from shared buffers to disk. |
| **WAL Writer** | Flushes WAL buffers to WAL files on disk. |
| **Checkpointer** | Periodically writes all dirty buffers to disk and records a checkpoint in WAL. |
| **Autovacuum Launcher** | Spawns autovacuum worker processes to reclaim dead tuples. |
| **Stats Collector** | Collects query and table statistics for the planner. |
| **Logical Replication Launcher** | Manages logical replication workers. |

**Shared Memory:**

```
┌────────────────────────────────────────────────┐
│               Shared Memory                     │
│  ┌─────────────────┐  ┌──────────────────────┐ │
│  │  Shared Buffers  │  │    WAL Buffers        │ │
│  │  (cached pages)  │  │  (pending WAL data)   │ │
│  └─────────────────┘  └──────────────────────┘ │
│  ┌─────────────────┐  ┌──────────────────────┐ │
│  │   Lock Tables    │  │  Proc Array           │ │
│  └─────────────────┘  └──────────────────────┘ │
└────────────────────────────────────────────────┘
```

- **Shared Buffers:** In-memory cache of data pages (8KB blocks). When a backend reads a table, it first checks shared buffers before going to disk.
- **WAL Buffers:** Temporary storage for Write-Ahead Log entries before they are flushed to WAL files.

---

### Q: How does MVCC work in PostgreSQL? How does it handle concurrent reads and writes without locking?

**Answer:**

MVCC (Multi-Version Concurrency Control) is the foundation of PostgreSQL's concurrency model. The key insight is: **readers never block writers, and writers never block readers.**

**How it works:**

1. Every row has hidden system columns: `xmin` (the transaction ID that inserted it) and `xmax` (the transaction ID that deleted/updated it, or 0 if still live).
2. When you **UPDATE** a row, Postgres does NOT overwrite it in place. Instead, it:
   - Marks the old row's `xmax` with the current transaction ID (logically deleting it).
   - Inserts a **new copy** of the row with updated values and a new `xmin`.
3. When you **DELETE** a row, Postgres just sets `xmax` on the existing row.
4. Each transaction gets a **snapshot** — a list of which transaction IDs are visible. A row is visible if:
   - `xmin` is committed AND `xmin` < current snapshot
   - `xmax` is either 0, aborted, or not yet visible to this transaction

```sql
-- Transaction A (xid=100) inserts a row
INSERT INTO accounts (id, balance) VALUES (1, 1000);
-- Row stored: (id=1, balance=1000, xmin=100, xmax=0)

-- Transaction B (xid=101) updates it
UPDATE accounts SET balance = 900 WHERE id = 1;
-- Old row: (id=1, balance=1000, xmin=100, xmax=101)  ← marked dead
-- New row: (id=1, balance=900,  xmin=101, xmax=0)    ← new version

-- Transaction C (xid=102) reading concurrently with B still sees balance=1000
-- because B hasn't committed yet, so xmin=101 is not visible to C
```

**Why VACUUM is essential:**
The old row versions (dead tuples) are never automatically removed. **VACUUM** reclaims this space. Without it, tables bloat indefinitely.

---

### Q: Walk me through how PostgreSQL processes a query from SQL text to result.

**Answer:**

```
SQL Text
   │
   ▼
┌──────────┐     ┌───────────┐     ┌─────────────────────┐     ┌───────────┐
│  Parser   │ ──▶ │  Rewriter  │ ──▶ │  Planner/Optimizer   │ ──▶ │  Executor  │
└──────────┘     └───────────┘     └─────────────────────┘     └───────────┘
```

| Stage | What It Does |
|-------|-------------|
| **Parser** | Tokenizes SQL, checks syntax, builds a raw parse tree. Does NOT check if tables/columns exist yet. |
| **Rewriter** | Applies rewrite rules (e.g., expands VIEWs into their underlying queries, applies RLS policies). |
| **Planner/Optimizer** | The most complex stage. Generates multiple possible execution plans, estimates costs using table statistics (`pg_stats`), and picks the cheapest plan. Considers join order, index usage, scan methods. |
| **Executor** | Actually executes the chosen plan node by node. Fetches data from shared buffers or disk, applies filters, joins, sorts, and returns results. |

---

### Q: What is WAL (Write-Ahead Logging) and why does it exist?

**Answer:**

WAL is PostgreSQL's mechanism for ensuring **durability** (the D in ACID). The rule is simple: **before any data page change is written to disk, the corresponding WAL record must be written to the WAL file first.**

**Why it exists:**

1. **Crash Recovery:** If Postgres crashes, it replays WAL records from the last checkpoint to restore the database to a consistent state.
2. **Performance:** Instead of flushing random data pages to disk on every commit (expensive random I/O), Postgres only needs to flush sequential WAL writes (cheap sequential I/O). Data pages are flushed lazily by the background writer or checkpointer.
3. **Replication:** WAL records are streamed to replicas for physical replication.
4. **Point-in-Time Recovery (PITR):** You can replay WAL up to any specific moment.

```
Commit flow:
1. Write changes to WAL buffer (in memory)
2. Flush WAL buffer to WAL file on disk (fsync)  ← commit is durable here
3. Return "COMMIT" to client
4. Data pages flushed to disk LATER (lazily by background writer / checkpointer)
```

> **Interview Tip:** When asked about Postgres internals, structure your answer around: process model, shared memory, MVCC, and WAL. These four concepts explain 90% of how Postgres works under the hood. Mentioning dead tuples and VACUUM shows you understand the operational side.

---

## Q2: Indexing Strategies (Most Asked Topic)

### Q: Explain the different index types in PostgreSQL and when to use each.

**Answer:**

#### 1. B-Tree Index (Default)

The workhorse index. Stores keys in a balanced tree structure. Supports `=`, `<`, `>`, `<=`, `>=`, `BETWEEN`, `IN`, `IS NULL`, and pattern matching with a fixed prefix (`LIKE 'foo%'`).

```sql
-- Automatically created for PRIMARY KEY and UNIQUE constraints
CREATE INDEX idx_users_email ON users (email);

-- Works for:
SELECT * FROM users WHERE email = 'fazle@example.com';       -- equality
SELECT * FROM users WHERE created_at > '2024-01-01';         -- range
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;       -- sorting
```

**How it works internally:** Balanced tree with a root node, internal nodes, and leaf nodes. Leaf nodes form a doubly-linked list for efficient range scans. Each leaf entry points to a heap tuple (ctid = block number + offset).

#### 2. Hash Index

Only supports **equality** (`=`) comparisons. Slightly faster than B-Tree for pure equality lookups, but cannot handle ranges or sorting.

```sql
CREATE INDEX idx_sessions_token ON sessions USING hash (token);

-- Works for:
SELECT * FROM sessions WHERE token = 'abc123';

-- Does NOT work for:
SELECT * FROM sessions WHERE token > 'abc';  -- range scan won't use hash index
```

**When to use:** Rarely. B-Tree handles equality well too. Consider only when you have millions of equality-only lookups on a high-cardinality column and want marginal speedup.

#### 3. GIN (Generalized Inverted Index)

Designed for values that contain multiple elements: arrays, JSONB, full-text search (tsvector). GIN creates an entry for each element pointing back to the rows that contain it.

```sql
-- JSONB containment queries
CREATE INDEX idx_products_attrs ON products USING gin (attributes);
SELECT * FROM products WHERE attributes @> '{"color": "red"}';

-- Array containment
CREATE INDEX idx_posts_tags ON posts USING gin (tags);
SELECT * FROM posts WHERE tags @> ARRAY['postgresql', 'backend'];

-- Full-text search
CREATE INDEX idx_articles_search ON articles USING gin (to_tsvector('english', title || ' ' || body));
SELECT * FROM articles WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('postgresql & indexing');
```

**Trade-off:** Slower to build and update than B-Tree. Best for read-heavy workloads with complex containment queries.

#### 4. GiST (Generalized Search Tree)

Supports geometric data, ranges, full-text search (alternative to GIN), and nearest-neighbor queries. Lossy — may need to recheck results.

```sql
-- Range types (e.g., booking systems)
CREATE INDEX idx_bookings_period ON bookings USING gist (tsrange(check_in, check_out));
SELECT * FROM bookings WHERE tsrange(check_in, check_out) && tsrange('2024-06-01', '2024-06-07');

-- PostGIS geometric queries
CREATE INDEX idx_locations_coords ON locations USING gist (coordinates);
SELECT * FROM locations WHERE ST_DWithin(coordinates, ST_MakePoint(90.4, 23.8)::geography, 5000);
```

**GIN vs GiST for full-text search:**
- **GIN:** Faster reads, slower writes, larger index. Best for mostly-static data.
- **GiST:** Faster writes, slower reads, smaller index. Best for frequently-updated data.

#### 5. BRIN (Block Range Index)

Stores min/max values per range of physical table blocks. Extremely small index — orders of magnitude smaller than B-Tree. Works only when data is **physically correlated** with the indexed column (e.g., time-series data where newer rows are appended at the end).

```sql
-- Perfect for append-only, time-ordered data
CREATE INDEX idx_events_created ON events USING brin (created_at);

-- When querying a date range, Postgres skips entire block ranges
SELECT * FROM events WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31';
```

**When to use:** Tables with 100M+ rows where the column is naturally ordered (timestamps on append-only tables, auto-incrementing IDs). Index size is kilobytes vs gigabytes for B-Tree.

**When NOT to use:** Randomly ordered data (UUIDs as primary key with BRIN on that column would be useless).

---

### Q: Explain partial indexes, expression indexes, composite indexes, and covering indexes.

**Answer:**

#### Partial Index

Indexes only rows that match a WHERE condition. Smaller, faster, and more focused.

```sql
-- Only index active users (if 90% of users are inactive, this is 10x smaller)
CREATE INDEX idx_users_active_email ON users (email) WHERE is_active = true;

-- Only index unprocessed orders (great for job queues)
CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'pending';

-- Queries MUST include the matching WHERE clause to use the index:
SELECT * FROM users WHERE email = 'fazle@example.com' AND is_active = true;  -- uses index
SELECT * FROM users WHERE email = 'fazle@example.com';                        -- does NOT use index
```

#### Expression Index

Index on a computed value rather than a raw column.

```sql
-- Case-insensitive email lookup
CREATE INDEX idx_users_email_lower ON users (lower(email));
SELECT * FROM users WHERE lower(email) = 'fazle@example.com';

-- Extract year from timestamp
CREATE INDEX idx_orders_year ON orders (EXTRACT(YEAR FROM created_at));
SELECT * FROM orders WHERE EXTRACT(YEAR FROM created_at) = 2024;

-- Index on JSONB field
CREATE INDEX idx_products_brand ON products ((attributes->>'brand'));
SELECT * FROM products WHERE attributes->>'brand' = 'Samsung';
```

#### Composite (Multi-Column) Index

Column order matters. Follows the **leftmost prefix rule**: the index can be used for queries that filter on the first column, the first two columns, etc., but NOT for queries that skip the first column.

```sql
CREATE INDEX idx_orders_user_status_date ON orders (user_id, status, created_at);

-- Uses index (all three columns):
SELECT * FROM orders WHERE user_id = 1 AND status = 'completed' AND created_at > '2024-01-01';

-- Uses index (leftmost two columns):
SELECT * FROM orders WHERE user_id = 1 AND status = 'completed';

-- Uses index (leftmost column only):
SELECT * FROM orders WHERE user_id = 1;

-- Does NOT use index efficiently (skips user_id):
SELECT * FROM orders WHERE status = 'completed';

-- Does NOT use index efficiently (skips user_id and status):
SELECT * FROM orders WHERE created_at > '2024-01-01';
```

**Column ordering rule of thumb:** Put **equality** columns first, then **range** columns last.

```sql
-- Good: equality (user_id, status) then range (created_at)
CREATE INDEX idx_orders_optimized ON orders (user_id, status, created_at);

-- For query:
WHERE user_id = 1 AND status = 'completed' AND created_at > '2024-01-01'
-- Postgres can use all 3 columns efficiently: seek to user_id=1+status='completed', then range scan on created_at
```

#### Covering Index (INCLUDE)

Stores extra columns in the index leaf nodes so Postgres can answer the query entirely from the index without visiting the heap (table). This is called an **index-only scan**.

```sql
-- Include balance so we don't need to fetch the heap row
CREATE INDEX idx_accounts_user_balance ON accounts (user_id) INCLUDE (balance, currency);

-- This query is now an index-only scan (no heap fetch):
SELECT balance, currency FROM accounts WHERE user_id = 42;

-- Compare without INCLUDE — requires heap fetch after index lookup:
CREATE INDEX idx_accounts_user ON accounts (user_id);
SELECT balance, currency FROM accounts WHERE user_id = 42;  -- Index Scan + Heap Fetch
```

**INCLUDE vs adding columns to the index key:** INCLUDE columns are NOT part of the B-Tree ordering. They are just stored in the leaf. This means:
- INCLUDE columns cannot be used for sorting or filtering.
- The B-Tree stays smaller and more efficient.

---

### Q: When should you NOT create an index?

**Answer:**

| Scenario | Why Not |
|----------|---------|
| **Small tables** (< 1000 rows) | Seq Scan is faster than index overhead. Postgres will ignore the index anyway. |
| **Low selectivity** (e.g., boolean `is_active` with 50/50 split) | Index scan would read half the table. Seq Scan is cheaper. |
| **Write-heavy tables with few reads** | Every INSERT/UPDATE/DELETE must also update all indexes. |
| **Columns rarely used in WHERE/JOIN/ORDER BY** | The index just wastes space and slows writes. |
| **Already covered by an existing composite index** | If you have `(user_id, status)`, you don't need a separate `(user_id)` index. |

> **Interview Tip — "Walk me through how you'd optimize a slow query":**
> 1. Run `EXPLAIN (ANALYZE, BUFFERS)` to see the actual execution plan
> 2. Look for Seq Scans on large tables — candidate for an index
> 3. Check estimated vs actual rows — if way off, run `ANALYZE` to update statistics
> 4. Look at the most expensive node (highest actual time)
> 5. Consider: correct index? Composite index column order? Partial index?
> 6. Verify with `EXPLAIN (ANALYZE, BUFFERS)` after adding the index
> 7. Check `pg_stat_user_indexes` to confirm the index is actually being used

---

## Q3: EXPLAIN & Query Optimization

### Q: How do you read a PostgreSQL EXPLAIN plan? What is the difference between EXPLAIN and EXPLAIN ANALYZE?

**Answer:**

| Command | What It Shows |
|---------|--------------|
| `EXPLAIN` | Estimated plan only (no execution). Shows what Postgres **plans** to do. |
| `EXPLAIN ANALYZE` | Actually **executes** the query and shows real timing/row counts. **Warning:** This runs the query! Use inside a transaction with ROLLBACK for mutating queries. |
| `EXPLAIN (ANALYZE, BUFFERS)` | Adds buffer usage info (shared hit = from cache, read = from disk). Essential for I/O analysis. |
| `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` | Machine-readable JSON output. Tools like pgMustard and explain.dalibo.com parse this. |

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, o.total, u.name
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'completed' AND o.created_at > '2024-01-01';
```

**Reading the output:**

```
Hash Join  (cost=12.50..345.00 rows=150 width=48) (actual time=0.5..3.2 rows=142 loops=1)
  Hash Cond: (o.user_id = u.id)
  Buffers: shared hit=85 read=12
  ->  Index Scan using idx_orders_status_date on orders o  (cost=0.42..320.00 rows=150 width=24) (actual time=0.1..2.5 rows=142 loops=1)
        Index Cond: ((status = 'completed') AND (created_at > '2024-01-01'))
        Buffers: shared hit=60 read=12
  ->  Hash  (cost=10.00..10.00 rows=200 width=28) (actual time=0.3..0.3 rows=200 loops=1)
        Buckets: 256  Batches: 1
        ->  Seq Scan on users u  (cost=0.00..10.00 rows=200 width=28) (actual time=0.01..0.1 rows=200 loops=1)
              Buffers: shared hit=25
Planning Time: 0.2 ms
Execution Time: 3.5 ms
```

**Key fields:**

| Field | Meaning |
|-------|---------|
| `cost=0.42..320.00` | Estimated startup cost..total cost (in arbitrary units) |
| `rows=150` | Estimated number of rows |
| `actual time=0.1..2.5` | Real wall-clock time in ms (startup..total) |
| `rows=142` | Actual number of rows returned |
| `loops=1` | Number of times this node was executed (multiply actual time by loops!) |
| `shared hit=60` | Pages read from shared buffers (cache) |
| `read=12` | Pages read from disk |

**Scan Types (from best to worst for large tables):**

| Scan Type | How It Works | When Chosen |
|-----------|-------------|-------------|
| **Index Only Scan** | Reads only the index, never touches the heap. Fastest. Requires a covering index + recently vacuumed table. | All needed columns in the index |
| **Index Scan** | Reads the index to find matching rows, then fetches each row from the heap. | Highly selective query (returns few rows) |
| **Bitmap Index Scan** | Reads the index to build a bitmap of matching pages, then fetches pages in order. Avoids random I/O. | Medium selectivity, OR conditions, multiple indexes |
| **Seq Scan** | Reads every row in the table. | Low selectivity, small table, no useful index |

---

### Q: Explain the three join algorithms PostgreSQL uses. When does it choose each one?

**Answer:**

#### 1. Nested Loop Join
```
For each row in outer table:
    For each row in inner table:
        If join condition matches, output row
```
- **When chosen:** Small outer table, inner table has an index on the join column.
- **Cost:** O(N * M) without index, O(N * log M) with index.
- **Best for:** Small result sets, highly selective filters.

#### 2. Hash Join
```
1. Build phase: Scan inner table, build hash table on join key
2. Probe phase: Scan outer table, probe hash table for matches
```
- **When chosen:** No useful index, medium-to-large tables, equality joins only (`=`).
- **Cost:** O(N + M) — linear in both tables.
- **Limitation:** Only works for equality joins. Requires enough `work_mem` to hold the hash table.

#### 3. Merge Join
```
1. Sort both tables on the join key (or use existing index order)
2. Walk through both sorted lists simultaneously, matching rows
```
- **When chosen:** Both tables are already sorted (by index) or need to be sorted, large tables with equality or range joins.
- **Cost:** O(N log N + M log M) if sorting needed, O(N + M) if already sorted.
- **Best for:** Large tables with indexes on join keys.

---

### Q: Walk me through optimizing a slow e-commerce query step by step.

**Answer:**

**Scenario:** "Find the top 10 most recent completed orders with customer name and total, taking 2 seconds."

**Step 1: Get the actual plan**
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, o.total, o.created_at, u.name, u.email
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'completed'
ORDER BY o.created_at DESC
LIMIT 10;
```

**Before optimization (bad plan):**
```
Limit  (actual time=1850..1851 rows=10 loops=1)
  ->  Sort  (actual time=1850..1850 rows=10 loops=1)
        Sort Key: o.created_at DESC
        Sort Method: top-N heapsort  Memory: 25kB
        ->  Hash Join  (actual time=50..1800 rows=500000 loops=1)
              Hash Cond: (o.user_id = u.id)
              ->  Seq Scan on orders o  (actual time=0.01..1200 rows=500000 loops=1)
                    Filter: (status = 'completed')
                    Rows Removed by Filter: 500000
                    Buffers: shared hit=5000 read=40000
              ->  Hash  (actual time=50..50 rows=100000 loops=1)
                    ->  Seq Scan on users u  (...)
```

**Problems identified:**
1. **Seq Scan on orders** — scanning 1M rows to find 500K completed orders
2. **Sorting 500K rows** just to get top 10
3. **40,000 disk reads** — most data not in cache

**Step 2: Add a targeted composite index**
```sql
-- Equality column first (status), then sort column (created_at DESC)
CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);
```

**Step 3: Verify with EXPLAIN again**
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.id, o.total, o.created_at, u.name, u.email
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status = 'completed'
ORDER BY o.created_at DESC
LIMIT 10;
```

**After optimization (good plan):**
```
Limit  (actual time=0.1..0.3 rows=10 loops=1)
  ->  Nested Loop  (actual time=0.1..0.3 rows=10 loops=1)
        ->  Index Scan using idx_orders_status_created on orders o  (actual time=0.05..0.1 rows=10 loops=1)
              Index Cond: (status = 'completed')
              Buffers: shared hit=4
        ->  Index Scan using users_pkey on users u  (actual time=0.01..0.01 rows=1 loops=10)
              Index Cond: (id = o.user_id)
              Buffers: shared hit=30
Planning Time: 0.3 ms
Execution Time: 0.4 ms
```

**What changed:**
- Seq Scan (1.2s) replaced by Index Scan (0.1ms) — the index provides rows already sorted by `created_at DESC`
- Hash Join replaced by Nested Loop — only 10 rows from orders, so nested loop with index on users PK is optimal
- Sort eliminated — index provides the order
- 45,000 buffer reads down to 34

**Result: 1,851ms to 0.4ms — a 4,600x improvement.**

---

## Q4: Transactions, ACID & Isolation Levels

### Q: Explain ACID properties with PostgreSQL-specific examples.

**Answer:**

| Property | Meaning | PostgreSQL Implementation |
|----------|---------|--------------------------|
| **Atomicity** | All operations in a transaction succeed or all fail. No partial commits. | WAL + transaction rollback. If any statement fails, the entire transaction can be rolled back. |
| **Consistency** | Database moves from one valid state to another. Constraints are always satisfied after a transaction. | CHECK constraints, UNIQUE, FOREIGN KEY, NOT NULL — all enforced at commit. |
| **Isolation** | Concurrent transactions don't interfere with each other. | MVCC + snapshot isolation. Each transaction sees a consistent view of data. |
| **Durability** | Once committed, data survives crashes. | WAL is fsynced to disk before commit returns. Crash recovery replays WAL. |

```sql
-- Atomicity example: Transfer money
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;
-- If either UPDATE fails, ROLLBACK undoes both
COMMIT;

-- If Postgres crashes after the first UPDATE but before COMMIT,
-- the WAL replay will NOT apply the partial transaction.
```

---

### Q: Explain PostgreSQL's isolation levels. What anomalies does each prevent?

**Answer:**

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly |
|----------------|-----------|--------------------|--------------|-----------------------|
| **READ UNCOMMITTED** | Prevented* | Possible | Possible | Possible |
| **READ COMMITTED** (default) | Prevented | Possible | Possible | Possible |
| **REPEATABLE READ** | Prevented | Prevented | Prevented** | Possible |
| **SERIALIZABLE** | Prevented | Prevented | Prevented | Prevented |

*PostgreSQL treats READ UNCOMMITTED the same as READ COMMITTED — it never allows dirty reads.
**PostgreSQL's REPEATABLE READ actually prevents phantom reads too (unlike the SQL standard minimum), because it uses snapshot isolation.

**Anomaly definitions:**
- **Dirty Read:** Reading uncommitted data from another transaction.
- **Non-Repeatable Read:** Reading the same row twice in a transaction and getting different values because another transaction committed in between.
- **Phantom Read:** Running the same query twice and getting different rows because another transaction inserted/deleted matching rows.
- **Serialization Anomaly:** The result of concurrent transactions differs from any possible serial execution order.

```sql
-- READ COMMITTED (default): Each statement sees its own snapshot
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- Returns 1000

    -- Meanwhile, another transaction commits: UPDATE accounts SET balance = 900 WHERE id = 1;

SELECT balance FROM accounts WHERE id = 1;  -- Returns 900 (sees committed change!)
COMMIT;

-- REPEATABLE READ: Transaction sees snapshot as of first query
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT balance FROM accounts WHERE id = 1;  -- Returns 1000

    -- Meanwhile, another transaction commits: UPDATE accounts SET balance = 900 WHERE id = 1;

SELECT balance FROM accounts WHERE id = 1;  -- Still returns 1000 (snapshot is frozen)
COMMIT;

-- SERIALIZABLE: Detects and prevents anomalies
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- If Postgres detects that concurrent transactions create a serialization anomaly,
-- it aborts one with: ERROR: could not serialize access due to read/write dependencies
-- Your application MUST retry the aborted transaction.
```

---

### Q: How do deadlocks happen in PostgreSQL and how do you prevent them?

**Answer:**

**How deadlocks occur:**
```sql
-- Transaction A                      -- Transaction B
BEGIN;                                BEGIN;
UPDATE accounts SET balance = 900     UPDATE accounts SET balance = 500
  WHERE id = 1;  -- locks row 1        WHERE id = 2;  -- locks row 2

UPDATE accounts SET balance = 1100    UPDATE accounts SET balance = 1500
  WHERE id = 2;  -- waits for B        WHERE id = 1;  -- waits for A
-- DEADLOCK!
```

**How Postgres handles it:** A background deadlock detector runs every `deadlock_timeout` (default 1s). It checks for cycles in the lock wait graph. If found, it aborts one of the transactions with `ERROR: deadlock detected`.

**Prevention strategies:**
1. **Consistent lock ordering:** Always lock rows in the same order (e.g., by ascending ID).
2. **Keep transactions short:** Less time holding locks = less chance of deadlock.
3. **Use `NOWAIT` or `SET lock_timeout`:** Fail fast instead of waiting.

```sql
-- Strategy 1: Consistent ordering
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = LEAST(1, 2);
UPDATE accounts SET balance = balance + 100 WHERE id = GREATEST(1, 2);
COMMIT;

-- Strategy 2: NOWAIT — fail immediately if lock not available
SELECT * FROM orders WHERE id = 42 FOR UPDATE NOWAIT;
-- ERROR: could not obtain lock on row in relation "orders"

-- Strategy 3: Lock timeout
SET lock_timeout = '5s';
```

---

### Q: Explain advisory locks and SKIP LOCKED. When would you use them?

**Answer:**

#### Advisory Locks — Application-Level Locking

Advisory locks are not tied to any table row. They are arbitrary locks identified by a bigint key that your application defines. PostgreSQL just provides the locking mechanism.

```sql
-- Use case: Ensure only one instance runs a cron job
SELECT pg_advisory_lock(12345);  -- blocks until lock acquired
-- ... run the cron job ...
SELECT pg_advisory_unlock(12345);

-- Non-blocking version:
SELECT pg_try_advisory_lock(12345);  -- returns true/false immediately
```

```typescript
// NestJS example: distributed lock for a scheduled job
@Cron('*/5 * * * *')
async processPayouts() {
  const lockId = 42;
  const result = await this.prisma.$queryRaw<[{ pg_try_advisory_lock: boolean }]>`
    SELECT pg_try_advisory_lock(${lockId})
  `;

  if (!result[0].pg_try_advisory_lock) {
    this.logger.log('Another instance is processing payouts, skipping');
    return;
  }

  try {
    await this.executePayouts();
  } finally {
    await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${lockId})`;
  }
}
```

#### SKIP LOCKED — Job Queue Pattern

`SKIP LOCKED` is the killer feature for building job queues in PostgreSQL. It skips rows already locked by other transactions instead of waiting.

```sql
-- Worker picks up the next unprocessed job, skipping any jobs other workers are processing
BEGIN;
SELECT id, payload FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- Process the job...
UPDATE jobs SET status = 'completed' WHERE id = <selected_id>;
COMMIT;
```

```typescript
// NestJS job queue worker using SKIP LOCKED
async processNextJob(): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    const jobs = await tx.$queryRaw<Job[]>`
      SELECT id, payload FROM jobs
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (jobs.length === 0) return;

    const job = jobs[0];
    await this.handleJob(job);

    await tx.job.update({
      where: { id: job.id },
      data: { status: 'completed', processed_at: new Date() },
    });
  });
}
```

**Why SKIP LOCKED over a separate message queue?**
- Simpler architecture — no need for Redis or RabbitMQ for simple job processing.
- Transactional — the job status update is in the same transaction as the work.
- Good enough for moderate throughput (thousands of jobs/second).
- For massive throughput (millions/second), use a dedicated message queue.

---

### Q: Show transaction handling with TypeORM and Prisma.

**Answer:**

```typescript
// Prisma interactive transaction
async transferMoney(fromId: number, toId: number, amount: number) {
  return this.prisma.$transaction(async (tx) => {
    const from = await tx.account.findUniqueOrThrow({ where: { id: fromId } });

    if (from.balance < amount) {
      throw new Error('Insufficient balance');
    }

    await tx.account.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } },
    });

    await tx.account.update({
      where: { id: toId },
      data: { balance: { increment: amount } },
    });
  }, {
    isolationLevel: 'Serializable',  // optional: set isolation level
    timeout: 10000,                   // 10s timeout
  });
}

// TypeORM transaction using QueryRunner
async transferMoney(fromId: number, toId: number, amount: number) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction('SERIALIZABLE');

  try {
    const from = await queryRunner.manager.findOneBy(Account, { id: fromId });
    if (from.balance < amount) throw new Error('Insufficient balance');

    await queryRunner.manager.decrement(Account, { id: fromId }, 'balance', amount);
    await queryRunner.manager.increment(Account, { id: toId }, 'balance', amount);

    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

---

## Q5: Joins Deep Dive

### Q: Explain all PostgreSQL join types with examples.

**Answer:**

Assume these tables:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  total DECIMAL(10,2)
);

-- Data:
-- users: (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')
-- orders: (1, 1, 100), (2, 1, 200), (3, 2, 150), (4, NULL, 50)
```

#### INNER JOIN — Only matching rows from both sides
```sql
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON o.user_id = u.id;
-- Alice  | 100
-- Alice  | 200
-- Bob    | 150
-- (Charlie excluded — no orders. NULL user_id order excluded — no matching user.)
```

#### LEFT JOIN — All rows from left + matching from right
```sql
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
-- Alice   | 100
-- Alice   | 200
-- Bob     | 150
-- Charlie | NULL   ← included even with no orders
```

#### RIGHT JOIN — All rows from right + matching from left
```sql
SELECT u.name, o.total
FROM users u
RIGHT JOIN orders o ON o.user_id = u.id;
-- Alice | 100
-- Alice | 200
-- Bob   | 150
-- NULL  | 50    ← order with no user included
```

#### FULL OUTER JOIN — All rows from both sides
```sql
SELECT u.name, o.total
FROM users u
FULL OUTER JOIN orders o ON o.user_id = u.id;
-- Alice   | 100
-- Alice   | 200
-- Bob     | 150
-- Charlie | NULL
-- NULL    | 50
```

#### CROSS JOIN — Cartesian product
```sql
SELECT u.name, o.total
FROM users u
CROSS JOIN orders o;
-- 3 users x 4 orders = 12 rows (every combination)
```

#### Self Join — Join a table to itself
```sql
-- Employee-manager hierarchy
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name TEXT,
  manager_id INT REFERENCES employees(id)
);

SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;
```

---

### Q: What is a LATERAL JOIN and when would you use it?

**Answer:**

`LATERAL` allows a subquery in the FROM clause to reference columns from preceding tables — essentially a correlated subquery that can return multiple columns and rows.

**Use case: Top N per group (without window functions)**

```sql
-- Get the 3 most recent orders for each user
SELECT u.name, recent_orders.*
FROM users u
CROSS JOIN LATERAL (
  SELECT o.id, o.total, o.created_at
  FROM orders o
  WHERE o.user_id = u.id
  ORDER BY o.created_at DESC
  LIMIT 3
) recent_orders;
```

**Why LATERAL is powerful:**
- The inner subquery can reference `u.id` from the outer query.
- PostgreSQL can use an index on `orders(user_id, created_at DESC)` for each user.
- More efficient than a window function approach for large datasets when combined with `LIMIT`.

**Use case: Calling a set-returning function per row**
```sql
-- Expand an array column into rows
SELECT u.name, t.tag
FROM users u
CROSS JOIN LATERAL unnest(u.tags) AS t(tag);
```

---

### Q: What is the best anti-join pattern? NOT EXISTS vs NOT IN vs LEFT JOIN WHERE NULL?

**Answer:**

**Goal:** Find users who have NO orders.

```sql
-- Option 1: NOT EXISTS (generally best)
SELECT u.* FROM users u
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- Option 2: LEFT JOIN ... WHERE NULL
SELECT u.* FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;

-- Option 3: NOT IN (avoid!)
SELECT u.* FROM users u
WHERE u.id NOT IN (SELECT user_id FROM orders);
```

| Pattern | Performance | NULL Safety | Recommendation |
|---------|-----------|-------------|----------------|
| `NOT EXISTS` | Excellent — stops at first match | Safe | **Preferred** |
| `LEFT JOIN WHERE NULL` | Excellent — same plan as NOT EXISTS in most cases | Safe | Good alternative |
| `NOT IN` | Can be slow — must check all values | **DANGEROUS** — if any `user_id` is NULL, entire result is empty! | **Avoid** |

**Why NOT IN is dangerous with NULLs:**
```sql
-- If orders has a row with user_id = NULL:
SELECT * FROM users WHERE id NOT IN (1, 2, NULL);
-- Evaluates: id != 1 AND id != 2 AND id != NULL
-- id != NULL is always UNKNOWN, so the entire WHERE is UNKNOWN
-- Result: ZERO ROWS (even for user id=3 who has no orders!)
```

---

## Q6: Normalization vs Denormalization

### Q: Explain normal forms with examples. When would you denormalize?

**Answer:**

#### Normal Forms

**1NF (First Normal Form):** Each column contains atomic (indivisible) values. No repeating groups.

```sql
-- Violates 1NF:
| id | name  | phone_numbers         |
|----|-------|-----------------------|
| 1  | Alice | 123-456, 789-012      |  ← multiple values in one cell

-- 1NF compliant:
CREATE TABLE user_phones (
  user_id INT REFERENCES users(id),
  phone_number TEXT,
  PRIMARY KEY (user_id, phone_number)
);
```

**2NF (Second Normal Form):** 1NF + no partial dependencies. Every non-key column depends on the **entire** primary key (relevant for composite keys).

```sql
-- Violates 2NF (composite PK: order_id + product_id):
| order_id | product_id | product_name | quantity |
|----------|------------|--------------|----------|
-- product_name depends only on product_id, not the full key

-- 2NF compliant: move product_name to products table
```

**3NF (Third Normal Form):** 2NF + no transitive dependencies. Non-key columns depend only on the primary key, not on other non-key columns.

```sql
-- Violates 3NF:
| employee_id | department_id | department_name |
|-------------|---------------|-----------------|
-- department_name depends on department_id, not employee_id

-- 3NF compliant: separate departments table
```

**BCNF (Boyce-Codd Normal Form):** 3NF + every determinant is a candidate key. Rarely needed beyond 3NF in practice.

#### When to Normalize vs Denormalize

| Factor | Normalize | Denormalize |
|--------|-----------|-------------|
| **Use case** | OLTP (transactional systems) | OLAP / reporting / read-heavy |
| **Data integrity** | Excellent — single source of truth | Risk of inconsistency |
| **Write performance** | Better — update one place | Worse — must update multiple places |
| **Read performance** | Worse — requires JOINs | Better — fewer JOINs |
| **Storage** | Less redundancy | More redundancy |
| **Flexibility** | Easier to change schema | Harder to change |

#### Denormalization Techniques

**1. Materialized Views**
```sql
-- Precomputed summary for dashboard
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT
  DATE(created_at) AS sale_date,
  COUNT(*) AS order_count,
  SUM(total) AS revenue,
  AVG(total) AS avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY DATE(created_at);

-- Refresh (can be automated with pg_cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;

-- Query the materialized view (instant, no joins)
CREATE UNIQUE INDEX idx_daily_sales_date ON daily_sales_summary (sale_date);
SELECT * FROM daily_sales_summary WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days';
```

**2. Generated (Computed) Columns (PG12+)**
```sql
ALTER TABLE products ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', name || ' ' || description)) STORED;
```

**3. Summary/Aggregate Tables**
```sql
-- Maintained by triggers or application code
CREATE TABLE user_order_stats (
  user_id INT PRIMARY KEY REFERENCES users(id),
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_order_at TIMESTAMPTZ
);
```

**4. JSONB Columns for Flexible Attributes**
```sql
-- Instead of an EAV (Entity-Attribute-Value) anti-pattern
ALTER TABLE products ADD COLUMN attributes JSONB DEFAULT '{}';
```

> **Interview Context:** "For a notification system serving 41M+ users with multiple channels (SMS, push, email), I would keep the core schema normalized (users, notifications, channels) for data integrity, but denormalize the notification delivery tracking into a partitioned table with pre-computed delivery status. Use a materialized view for analytics dashboards showing delivery rates per channel."

---

## Q7: JSONB in PostgreSQL

### Q: When should you use JSONB vs separate relational tables? What are the operators and indexing strategies?

**Answer:**

#### JSONB vs JSON

| Feature | `JSON` | `JSONB` |
|---------|--------|---------|
| Storage | Exact text copy | Decomposed binary |
| Duplicate keys | Preserved | Last value wins |
| Key ordering | Preserved | Not preserved |
| Indexing | No | Yes (GIN) |
| Query speed | Slow (re-parse each query) | Fast (pre-parsed binary) |
| Write speed | Slightly faster (no parsing) | Slightly slower (must parse) |

**Rule: Always use JSONB unless you need to preserve exact JSON formatting.**

#### JSONB Operators

```sql
-- Sample data
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT,
  attributes JSONB
);

INSERT INTO products (name, attributes) VALUES
('Laptop', '{"brand": "Dell", "specs": {"ram": 16, "storage": 512}, "tags": ["electronics", "computers"], "in_stock": true}'),
('Phone',  '{"brand": "Samsung", "specs": {"ram": 8, "storage": 128}, "tags": ["electronics", "mobile"], "in_stock": false}');

-- -> : Get JSON object field (returns JSONB)
SELECT attributes->'brand' FROM products;          -- "Dell" (with quotes, as JSONB)

-- ->> : Get JSON object field as TEXT
SELECT attributes->>'brand' FROM products;         -- Dell (without quotes, as text)

-- #> : Get nested field by path (returns JSONB)
SELECT attributes#>'{specs,ram}' FROM products;    -- 16

-- #>> : Get nested field by path as TEXT
SELECT attributes#>>'{specs,ram}' FROM products;   -- "16" (text)

-- @> : Contains (left contains right) — THE MOST IMPORTANT OPERATOR
SELECT * FROM products WHERE attributes @> '{"brand": "Dell"}';
SELECT * FROM products WHERE attributes @> '{"specs": {"ram": 16}}';

-- ? : Key exists
SELECT * FROM products WHERE attributes ? 'brand';

-- ?| : Any key exists
SELECT * FROM products WHERE attributes ?| array['color', 'brand'];

-- ?& : All keys exist
SELECT * FROM products WHERE attributes ?& array['brand', 'in_stock'];

-- Nested array queries
SELECT * FROM products WHERE attributes->'tags' ? 'mobile';
```

#### GIN Indexing on JSONB

```sql
-- Default GIN: supports @>, ?, ?|, ?&
CREATE INDEX idx_products_attrs ON products USING gin (attributes);

-- jsonb_path_ops GIN: supports ONLY @> but is smaller and faster
CREATE INDEX idx_products_attrs_path ON products USING gin (attributes jsonb_path_ops);

-- Expression index on a specific key (if you only query one field)
CREATE INDEX idx_products_brand ON products ((attributes->>'brand'));
SELECT * FROM products WHERE attributes->>'brand' = 'Dell';
```

#### When to Use JSONB vs Separate Tables

| Use JSONB When | Use Separate Tables When |
|----------------|--------------------------|
| Schema varies per row (e.g., product attributes across categories) | Schema is fixed and well-known |
| You rarely JOIN on the JSONB data | You frequently JOIN on the data |
| Read-heavy, infrequent writes to JSONB fields | Write-heavy with frequent partial updates |
| Semi-structured data (API responses, configs) | Data has strong referential integrity needs |
| You need schema flexibility without migrations | You need strong constraints (NOT NULL, FK, CHECK) |

```sql
-- Good JSONB use: product attributes vary by category
-- Electronics: {"ram": 16, "storage": 512, "screen_size": 15.6}
-- Clothing:    {"size": "L", "color": "blue", "material": "cotton"}
-- Food:        {"weight": "500g", "calories": 250, "allergens": ["nuts"]}

-- Bad JSONB use: storing order line items as JSONB
-- This should be a separate order_items table with FK, quantity, price columns
```

---

## Q8: Partitioning

### Q: When and how should you partition a table in PostgreSQL?

**Answer:**

**When to partition:**
- Table has **100M+ rows** and growing
- Queries almost always filter by the partition key (e.g., date range queries on time-series data)
- You need to efficiently drop old data (`DROP` a partition is instant vs `DELETE` millions of rows)
- Maintenance operations (VACUUM, REINDEX) on smaller partitions are faster

**Partition types:**

| Type | Use Case | Example |
|------|----------|---------|
| **Range** | Time-series, date-based data | Orders by month |
| **List** | Categorical data with fixed values | Orders by country, status |
| **Hash** | Even distribution when no natural range | Sharding by user_id |

#### Declarative Partitioning Example (PG10+)

```sql
-- Create the partitioned table
CREATE TABLE orders (
  id          BIGSERIAL,
  user_id     INT NOT NULL,
  total       DECIMAL(12,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)  -- partition key MUST be in PK
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE orders_2024_01 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE orders_2024_02 PARTITION OF orders
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE orders_2024_03 PARTITION OF orders
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- Create a default partition to catch rows that don't match any partition
CREATE TABLE orders_default PARTITION OF orders DEFAULT;

-- Indexes are created per-partition (or inherited from the parent)
CREATE INDEX idx_orders_user_id ON orders (user_id);
-- This creates an index on EACH partition automatically

-- Insert goes to the correct partition automatically
INSERT INTO orders (user_id, total, created_at)
VALUES (1, 99.99, '2024-02-15');  -- goes to orders_2024_02
```

#### Partition Pruning

When you query with a filter on the partition key, PostgreSQL skips (prunes) irrelevant partitions.

```sql
EXPLAIN SELECT * FROM orders WHERE created_at BETWEEN '2024-02-01' AND '2024-02-28';

-- Output shows only orders_2024_02 is scanned:
-- Append
--   ->  Seq Scan on orders_2024_02
--         Filter: (created_at >= '2024-02-01' AND created_at <= '2024-02-28')
-- orders_2024_01 and orders_2024_03 are NOT scanned (pruned)
```

#### Managing Partitions with pg_partman

```sql
-- Install pg_partman extension
CREATE EXTENSION pg_partman;

-- Auto-manage monthly partitions: create 3 months ahead, retain 12 months
SELECT partman.create_parent(
  p_parent_table := 'public.orders',
  p_control := 'created_at',
  p_type := 'range',
  p_interval := '1 month',
  p_premake := 3
);

-- Run maintenance (call via pg_cron every hour)
SELECT partman.run_maintenance();
```

#### Archiving Old Partitions

```sql
-- Detach a partition (instant, no data movement)
ALTER TABLE orders DETACH PARTITION orders_2023_01;

-- Now you can:
-- 1. Move it to cheaper storage
-- 2. Export and drop it
-- 3. Keep it as a standalone read-only table
DROP TABLE orders_2023_01;  -- instant deletion of millions of rows
```

#### Partitioning vs Sharding

| Aspect | Partitioning | Sharding |
|--------|-------------|----------|
| **Scope** | Single database server | Multiple database servers |
| **Managed by** | PostgreSQL natively | Application or middleware (Citus, Vitess) |
| **Use case** | Large tables on one server | Horizontal scaling beyond one server |
| **Complexity** | Low | High (distributed transactions, cross-shard queries) |
| **When to use** | Table > 100M rows, queries filter on partition key | Single server can't handle the load |

---

## Q9: Replication & High Availability

### Q: Explain PostgreSQL replication options and high availability strategies.

**Answer:**

#### Streaming Replication (Physical)

The primary server streams WAL records to standby servers. The standbys apply these WAL records to maintain an exact copy.

```
Primary ──WAL stream──▶ Standby 1 (sync)
       └──WAL stream──▶ Standby 2 (async)
```

**Setup on primary (`postgresql.conf`):**
```ini
wal_level = replica
max_wal_senders = 5
synchronous_standby_names = 'standby1'   # for synchronous replication
```

**Async vs Sync Replication:**

| Aspect | Asynchronous | Synchronous |
|--------|-------------|-------------|
| **Commit behavior** | Primary commits immediately, standby applies later | Primary waits for standby to confirm WAL write before commit |
| **Data loss risk** | Possible (lag window) | Zero (if standby is up) |
| **Latency** | Lower (no waiting) | Higher (network round-trip per commit) |
| **Use case** | Read replicas, disaster recovery | Financial systems, zero-RPO requirement |

#### Logical Replication

Replicates at the table level using a publish/subscribe model. More flexible than streaming replication.

```sql
-- On publisher (source)
CREATE PUBLICATION my_pub FOR TABLE users, orders;

-- On subscriber (target)
CREATE SUBSCRIPTION my_sub
  CONNECTION 'host=primary dbname=mydb user=replicator'
  PUBLICATION my_pub;
```

**Advantages over streaming replication:**
- Replicate specific tables (not the entire database)
- Replicate across different PostgreSQL versions
- Replicate to a database with a different schema (e.g., add extra indexes on the replica)
- Can be used for zero-downtime major version upgrades

#### Read Replicas for Scaling Reads

```typescript
// NestJS: Route read queries to replica, writes to primary
// Using Prisma with read replicas
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,  // primary for writes
    },
  },
});

// Prisma read replicas extension
import { readReplicas } from '@prisma/extension-read-replicas';

const prismaWithReplicas = prisma.$extends(
  readReplicas({
    url: process.env.DATABASE_REPLICA_URL,
  })
);

// Reads go to replica, writes go to primary automatically
const users = await prismaWithReplicas.user.findMany();        // → replica
const user = await prismaWithReplicas.user.create({ data }); // → primary
```

#### Failover Strategies

| Tool | Type | Description |
|------|------|-------------|
| **Patroni** | Automatic | Industry standard. Uses etcd/ZooKeeper for leader election. Auto-failover in seconds. |
| **pg_auto_failover** | Automatic | Citus extension. Simpler than Patroni. Built-in monitor node. |
| **Manual** | Manual | Promote standby with `pg_ctl promote` or `SELECT pg_promote()`. |
| **AWS RDS** | Managed | Automatic failover with Multi-AZ deployment. |

#### Connection Pooling with PgBouncer

PostgreSQL forks a process per connection (~10MB RAM each). With 1000 connections, that's 10GB just for connection overhead. PgBouncer solves this.

```ini
# pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_port = 6432
pool_mode = transaction      # <-- the key setting
max_client_conn = 10000      # accept up to 10K app connections
default_pool_size = 50       # but only use 50 real PG connections
```

**Pool modes:**

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Session** | Connection assigned for entire client session | Legacy apps that use session-level features (LISTEN/NOTIFY, prepared statements) |
| **Transaction** | Connection assigned only during a transaction, returned to pool after COMMIT/ROLLBACK | **Recommended for most apps.** Best connection reuse. |
| **Statement** | Connection returned after each statement | Only for simple autocommit workloads. Cannot use multi-statement transactions. |

**When PgBouncer is essential:**
- Serverless (AWS Lambda) — each invocation opens a new connection
- Microservices — many services, each with their own connection pool
- High connection counts — PG default `max_connections = 100` is often too low

---

## Q10: Performance Tuning & Configuration

### Q: What are the most important PostgreSQL configuration parameters for performance?

**Answer:**

#### Key postgresql.conf Settings

| Parameter | Default | Recommended | Purpose |
|-----------|---------|-------------|---------|
| `shared_buffers` | 128MB | **25% of RAM** (e.g., 4GB for 16GB RAM) | In-memory cache for data pages. The most impactful setting. |
| `effective_cache_size` | 4GB | **50-75% of RAM** (e.g., 12GB for 16GB RAM) | Hint to planner about how much memory is available for caching (OS page cache + shared buffers). Does NOT allocate memory. |
| `work_mem` | 4MB | **16-64MB** (be careful!) | Memory per sort/hash operation. Multiply by `max_connections` for worst case. A query with 5 sorts uses 5x this. |
| `maintenance_work_mem` | 64MB | **512MB-1GB** | Memory for VACUUM, CREATE INDEX, ALTER TABLE. Can be set high since few run concurrently. |
| `max_connections` | 100 | **Keep low** (50-200), use PgBouncer | Each connection = ~10MB RAM + a process. 500 connections = wasted resources. |
| `random_page_cost` | 4.0 | **1.1 for SSD** | Tells planner how expensive random I/O is. Lower value makes planner prefer index scans. Critical for SSD. |
| `effective_io_concurrency` | 1 | **200 for SSD** | Number of concurrent I/O operations. Higher for SSD. |
| `wal_buffers` | -1 (auto) | **64MB** for write-heavy workloads | WAL write buffer size. |

```ini
# postgresql.conf for a 16GB RAM server with SSD
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 32MB
maintenance_work_mem = 1GB
max_connections = 100
random_page_cost = 1.1
effective_io_concurrency = 200
wal_buffers = 64MB

# Checkpoint tuning
checkpoint_completion_target = 0.9
max_wal_size = 2GB
min_wal_size = 1GB
```

---

### Q: Explain VACUUM and autovacuum. Why is it critical?

**Answer:**

Due to MVCC, UPDATE and DELETE leave behind **dead tuples** (old row versions). VACUUM reclaims this space.

**What VACUUM does:**
1. Marks dead tuples as reusable (but does NOT return space to the OS)
2. Updates the visibility map (enables index-only scans)
3. Updates the free space map
4. Prevents transaction ID wraparound (XID wraparound — a catastrophic event if neglected)

**VACUUM vs VACUUM FULL:**

| | `VACUUM` | `VACUUM FULL` |
|--|---------|---------------|
| Locks | No exclusive lock | **Exclusive lock on table** (blocks all access) |
| Space | Marks dead tuples as reusable | Actually compacts the table and returns space to OS |
| Speed | Fast | Very slow (rewrites entire table) |
| When | Regular maintenance | Only when table is extremely bloated |

**Autovacuum configuration:**
```ini
autovacuum = on                          # never turn this off!
autovacuum_vacuum_threshold = 50         # minimum dead tuples before vacuum
autovacuum_vacuum_scale_factor = 0.2     # vacuum when 20% of table is dead
autovacuum_analyze_threshold = 50        # minimum changes before analyze
autovacuum_analyze_scale_factor = 0.1    # analyze when 10% of table changed

# For large tables, reduce scale_factor:
ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.01);
-- Vacuum when 1% is dead (instead of 20%) — for a 100M row table:
-- Default: vacuum after 20M dead tuples (too late)
-- Custom:  vacuum after 1M dead tuples (much better)
```

---

### Q: How do you find and fix slow queries?

**Answer:**

#### pg_stat_statements — Find the Slowest Queries

```sql
CREATE EXTENSION pg_stat_statements;

-- Top 10 queries by total execution time
SELECT
  query,
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS pct,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

#### pg_stat_activity — What's Running Right Now

```sql
-- Active queries running longer than 5 seconds
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - pg_stat_activity.query_start > interval '5 seconds'
ORDER BY duration DESC;

-- Kill a long-running query
SELECT pg_cancel_backend(<pid>);   -- graceful (cancels query)
SELECT pg_terminate_backend(<pid>); -- forceful (kills connection)
```

#### pg_stat_user_tables — Table Health

```sql
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;
```

#### pg_stat_user_indexes — Unused Indexes

```sql
-- Find indexes that are never used (candidates for removal)
SELECT
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan AS times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'   -- keep primary keys
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Q11: Common Table Expressions (CTEs) & Window Functions

### Q: Explain CTEs, recursive CTEs, and window functions with practical examples.

**Answer:**

#### CTEs (WITH Clause)

CTEs make complex queries readable by breaking them into named steps.

```sql
-- Find users who spent more than the average
WITH user_spending AS (
  SELECT user_id, SUM(total) AS total_spent
  FROM orders
  WHERE status = 'completed'
  GROUP BY user_id
),
avg_spending AS (
  SELECT AVG(total_spent) AS avg_spent FROM user_spending
)
SELECT u.name, us.total_spent
FROM user_spending us
JOIN users u ON u.id = us.user_id
CROSS JOIN avg_spending
WHERE us.total_spent > avg_spending.avg_spent
ORDER BY us.total_spent DESC;
```

**CTE Materialization (important for optimization):**

| PostgreSQL Version | Behavior |
|-------------------|----------|
| PG11 and below | CTEs are always materialized (optimization fence — planner cannot push filters into the CTE) |
| PG12+ | CTEs are inlined by default if referenced once. Use `MATERIALIZED` / `NOT MATERIALIZED` to control. |

```sql
-- PG12+: Force materialization (useful when CTE is referenced multiple times)
WITH MATERIALIZED expensive_calc AS (
  SELECT ... -- complex calculation
)
SELECT * FROM expensive_calc WHERE ...;

-- Force inlining (let planner push filters into the CTE)
WITH NOT MATERIALIZED my_cte AS (
  SELECT * FROM big_table
)
SELECT * FROM my_cte WHERE id = 42;  -- filter pushed into big_table scan
```

#### Recursive CTEs

Used for tree/graph traversal: org charts, category hierarchies, bill of materials.

```sql
-- Organization hierarchy: find all reports under a manager
WITH RECURSIVE org_tree AS (
  -- Base case: the manager
  SELECT id, name, manager_id, 1 AS depth
  FROM employees
  WHERE id = 1  -- CEO

  UNION ALL

  -- Recursive case: find direct reports of current level
  SELECT e.id, e.name, e.manager_id, ot.depth + 1
  FROM employees e
  JOIN org_tree ot ON ot.id = e.manager_id
)
SELECT * FROM org_tree ORDER BY depth, name;

-- Result:
-- id | name    | manager_id | depth
-- 1  | CEO     | NULL       | 1
-- 2  | VP Eng  | 1          | 2
-- 3  | VP Sales| 1          | 2
-- 4  | Dev Lead| 2          | 3
-- 5  | Dev Sr  | 4          | 4
```

```sql
-- Category tree (e-commerce)
WITH RECURSIVE category_tree AS (
  SELECT id, name, parent_id, name::TEXT AS path
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  SELECT c.id, c.name, c.parent_id, ct.path || ' > ' || c.name
  FROM categories c
  JOIN category_tree ct ON ct.id = c.parent_id
)
SELECT * FROM category_tree;

-- Result:
-- Electronics
-- Electronics > Computers
-- Electronics > Computers > Laptops
-- Electronics > Mobile
-- Electronics > Mobile > Smartphones
```

#### Window Functions

Window functions perform calculations across a set of rows related to the current row, without collapsing them into a single output row (unlike `GROUP BY`).

```sql
-- ROW_NUMBER: assign a unique number within each partition
SELECT
  name,
  department,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rank_in_dept
FROM employees;

-- Top 3 highest-paid employees per department
SELECT * FROM (
  SELECT
    name, department, salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
  FROM employees
) ranked
WHERE rn <= 3;
```

```sql
-- RANK vs DENSE_RANK vs ROW_NUMBER
-- Salary: 100, 100, 90, 80
-- ROW_NUMBER: 1, 2, 3, 4  (always unique)
-- RANK:       1, 1, 3, 4  (ties get same rank, next rank is skipped)
-- DENSE_RANK: 1, 1, 2, 3  (ties get same rank, next rank is NOT skipped)
```

```sql
-- LAG / LEAD: access previous/next rows
SELECT
  date,
  revenue,
  LAG(revenue, 1) OVER (ORDER BY date) AS prev_day_revenue,
  revenue - LAG(revenue, 1) OVER (ORDER BY date) AS daily_change,
  LEAD(revenue, 1) OVER (ORDER BY date) AS next_day_revenue
FROM daily_sales;
```

```sql
-- Running total and moving average
SELECT
  date,
  revenue,
  SUM(revenue) OVER (ORDER BY date) AS running_total,
  AVG(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7d
FROM daily_sales;
```

```sql
-- Percentage of total
SELECT
  product_name,
  revenue,
  ROUND(100.0 * revenue / SUM(revenue) OVER (), 2) AS pct_of_total
FROM product_sales
ORDER BY revenue DESC;
```

**PARTITION BY vs GROUP BY:**
- `GROUP BY` collapses rows — one output row per group.
- `PARTITION BY` (in a window function) keeps all rows — adds a computed column.

---

## Q12: Full-Text Search

### Q: How does PostgreSQL full-text search work? When would you use it over Elasticsearch?

**Answer:**

#### Core Concepts

- **`tsvector`:** A sorted list of distinct lexemes (normalized words) extracted from a document.
- **`tsquery`:** A search query with boolean operators (`&` AND, `|` OR, `!` NOT, `<->` followed by).

```sql
-- Convert text to tsvector
SELECT to_tsvector('english', 'The quick brown foxes jumped over the lazy dogs');
-- Result: 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2

-- Note: 'The', 'over' removed (stop words), 'foxes' → 'fox', 'jumped' → 'jump' (stemming)

-- Search
SELECT to_tsvector('english', 'PostgreSQL is a powerful database')
    @@ to_tsquery('english', 'powerful & database');
-- Result: true
```

#### Full Implementation Example: Product Search

```sql
-- Add a search column
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Populate it
UPDATE products SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(brand, '')), 'C');

-- Index it
CREATE INDEX idx_products_search ON products USING gin (search_vector);

-- Keep it updated with a trigger
CREATE FUNCTION update_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.brand, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Search with ranking
SELECT
  id,
  name,
  ts_rank(search_vector, query) AS rank
FROM products,
     to_tsquery('english', 'wireless & headphone') AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;

-- Phrase search (words adjacent)
SELECT * FROM products
WHERE search_vector @@ to_tsquery('english', 'noise <-> cancelling');

-- Prefix matching (autocomplete)
SELECT * FROM products
WHERE search_vector @@ to_tsquery('english', 'head:*');
```

#### Weights

`setweight` assigns importance levels: A (highest) > B > C > D (lowest). `ts_rank` uses these to score results — a match in the title (A) ranks higher than a match in the description (B).

#### PostgreSQL FTS vs Elasticsearch

| Factor | PostgreSQL FTS | Elasticsearch |
|--------|---------------|---------------|
| **Setup** | Built-in, zero infrastructure | Separate cluster to manage |
| **Consistency** | Transactionally consistent with your data | Eventually consistent (replication lag) |
| **Features** | Basic: stemming, ranking, weights, prefix matching | Advanced: fuzzy search, synonyms, aggregations, "did you mean?", highlighting |
| **Performance** | Good for < 10M documents | Built for billions of documents |
| **Scalability** | Single node | Distributed, horizontally scalable |
| **Typo tolerance** | Limited (trigram with pg_trgm) | Built-in fuzzy matching |
| **Use when** | Search is a secondary feature, < 10M docs, want simplicity | Search is a core feature, need advanced relevance tuning |

> **Interview answer:** "I'd start with PostgreSQL FTS for most projects — it's already in your stack, transactionally consistent, and handles millions of documents well. I'd switch to Elasticsearch when we need fuzzy matching, synonym handling, or when search result quality becomes a core product differentiator."

---

## Q13: PostgreSQL with Node.js/NestJS

### Q: Compare PostgreSQL client libraries for Node.js. How do you handle connections, transactions, and avoid N+1 queries?

**Answer:**

#### Library Comparison

| Library | Type | Pros | Cons |
|---------|------|------|------|
| **pg (node-postgres)** | Raw driver | Full control, lightweight, prepared statements | Manual SQL, no migrations |
| **Prisma** | ORM + Query Builder | Type-safe, great DX, auto migrations, Prisma Studio | Generated client, less control over complex queries |
| **TypeORM** | Traditional ORM | Decorators, Active Record + Data Mapper patterns, migrations | Complex queries require QueryBuilder, performance issues |
| **Knex** | Query Builder | Flexible SQL building, good migrations | No type safety without extra setup |
| **Drizzle** | Type-safe ORM | SQL-like syntax, lightweight, great TypeScript support | Newer, smaller ecosystem |

#### Connection Pooling in Node.js

```typescript
// pg (node-postgres) — manual pool
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: 'mydb',
  user: 'appuser',
  password: process.env.DB_PASSWORD,
  max: 20,                     // max connections in pool
  idleTimeoutMillis: 30000,    // close idle connections after 30s
  connectionTimeoutMillis: 2000, // fail if can't connect in 2s
});

// Use pool.query for simple queries (auto-acquires and releases connection)
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Use pool.connect for transactions
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [100, fromId]);
  await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [100, toId]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();  // ALWAYS release back to pool
}
```

#### Parameterized Queries (SQL Injection Prevention)

```typescript
// VULNERABLE — never do this
const query = `SELECT * FROM users WHERE email = '${email}'`;

// SAFE — parameterized query (pg)
const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

// SAFE — Prisma (parameterized by default)
const user = await prisma.user.findUnique({ where: { email } });

// SAFE — TypeORM
const user = await userRepo.findOneBy({ email });

// SAFE — raw query in Prisma with tagged template (auto-parameterized)
const users = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// UNSAFE — Prisma raw with string interpolation
const users = await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);  // DON'T
```

#### N+1 Query Problem and Solutions

```typescript
// THE PROBLEM: N+1 queries
// 1 query to get 100 users
const users = await prisma.user.findMany({ take: 100 });
// Then 100 queries to get each user's orders
for (const user of users) {
  user.orders = await prisma.order.findMany({ where: { userId: user.id } });
}
// Total: 101 queries!

// SOLUTION 1: Prisma include (eager loading) — 2 queries
const users = await prisma.user.findMany({
  take: 100,
  include: { orders: true },  // JOIN or separate IN query
});

// SOLUTION 2: DataLoader pattern (for GraphQL)
import DataLoader from 'dataloader';

const orderLoader = new DataLoader(async (userIds: number[]) => {
  const orders = await prisma.order.findMany({
    where: { userId: { in: userIds } },
  });
  // Group by userId and return in same order as input
  const orderMap = new Map<number, Order[]>();
  orders.forEach(order => {
    const existing = orderMap.get(order.userId) || [];
    existing.push(order);
    orderMap.set(order.userId, existing);
  });
  return userIds.map(id => orderMap.get(id) || []);
});

// Usage in GraphQL resolver:
// orderLoader.load(user.id) — batches multiple calls into one query

// SOLUTION 3: Raw SQL with JOIN
const usersWithOrders = await prisma.$queryRaw`
  SELECT u.*, json_agg(o.*) AS orders
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id
  LIMIT 100
`;
```

#### Full NestJS Service Example with Prisma

```typescript
// prisma/schema.prisma
// model User {
//   id        Int      @id @default(autoincrement())
//   email     String   @unique
//   name      String
//   orders    Order[]
//   createdAt DateTime @default(now()) @map("created_at")
//   @@map("users")
// }
// model Order {
//   id        Int      @id @default(autoincrement())
//   userId    Int      @map("user_id")
//   user      User     @relation(fields: [userId], references: [id])
//   total     Decimal  @db.Decimal(12, 2)
//   status    String   @default("pending")
//   createdAt DateTime @default(now()) @map("created_at")
//   @@map("orders")
// }

// src/orders/orders.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: number, items: OrderItemDto[]) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verify user exists
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

      // 2. Check inventory and calculate total
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // 3. Create order with items
      const order = await tx.order.create({
        data: {
          userId,
          total,
          status: 'pending',
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: { items: true },
      });

      // 4. Decrement inventory (using raw SQL for atomic update)
      for (const item of items) {
        const result = await tx.$executeRaw`
          UPDATE products
          SET stock = stock - ${item.quantity}
          WHERE id = ${item.productId} AND stock >= ${item.quantity}
        `;
        if (result === 0) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
          // Transaction will automatically rollback
        }
      }

      return order;
    }, {
      timeout: 10000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }

  async getOrdersWithPagination(page: number, limit: number) {
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.order.count(),
    ]);

    return { orders, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
```

---

## Q14: Database Design Interview Questions

### Q: Design a schema for an e-commerce system.

**Answer:**

```sql
-- Users
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE products (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  price         DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  stock         INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id   BIGINT REFERENCES categories(id),
  attributes    JSONB DEFAULT '{}',   -- flexible attributes (color, size, etc.)
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories (hierarchical)
CREATE TABLE categories (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  parent_id     BIGINT REFERENCES categories(id),
  path          LTREE  -- requires ltree extension, e.g., 'electronics.computers.laptops'
);

-- Orders (partitioned by month for large-scale systems)
CREATE TABLE orders (
  id            BIGSERIAL,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  total         DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  shipping_address JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Order Items
CREATE TABLE order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL,
  product_id    BIGINT NOT NULL REFERENCES products(id),
  quantity      INT NOT NULL CHECK (quantity > 0),
  unit_price    DECIMAL(12,2) NOT NULL,  -- snapshot of price at time of order
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE payments (
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL,
  amount          DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  provider        TEXT NOT NULL,          -- 'stripe', 'paypal'
  provider_ref    TEXT,                   -- external reference ID
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews
CREATE TABLE reviews (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  product_id    BIGINT NOT NULL REFERENCES products(id),
  rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)  -- one review per user per product
);

-- Key indexes
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status) WHERE status IN ('pending', 'confirmed', 'shipped');
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_products_category ON products (category_id) WHERE is_active = true;
CREATE INDEX idx_products_attrs ON products USING gin (attributes);
CREATE INDEX idx_reviews_product ON reviews (product_id);
```

---

### Q: Design a notification system for 41M+ users.

**Answer:**

```sql
-- Notification templates
CREATE TABLE notification_templates (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  channel     TEXT NOT NULL CHECK (channel IN ('sms', 'push', 'email', 'in_app')),
  subject     TEXT,          -- for email
  body        TEXT NOT NULL,  -- template with {{placeholders}}
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification jobs (bulk sends)
CREATE TABLE notification_jobs (
  id            BIGSERIAL PRIMARY KEY,
  template_id   BIGINT NOT NULL REFERENCES notification_templates(id),
  target_query  JSONB NOT NULL,     -- {"segment": "all", "filters": {"city": "Dhaka"}}
  status        TEXT NOT NULL DEFAULT 'pending',
  total_targets INT,
  sent_count    INT DEFAULT 0,
  failed_count  INT DEFAULT 0,
  created_by    BIGINT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

-- Individual notification deliveries (PARTITIONED — this is the huge table)
CREATE TABLE notification_deliveries (
  id              BIGSERIAL,
  job_id          BIGINT NOT NULL,
  user_id         BIGINT NOT NULL,
  channel         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed','read')),
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (automated by pg_partman)
-- With 41M users, each campaign = 41M rows. Monthly partitions keep things manageable.

-- Key indexes
CREATE INDEX idx_deliveries_user ON notification_deliveries (user_id, created_at DESC);
CREATE INDEX idx_deliveries_status ON notification_deliveries (status) WHERE status = 'queued';
CREATE INDEX idx_deliveries_job ON notification_deliveries (job_id);
```

**Architecture notes:**
- Partition `notification_deliveries` by month — easy to archive/drop old data.
- Use `SKIP LOCKED` pattern for workers to pick up queued notifications.
- Use partial index on `status = 'queued'` since most rows are delivered.
- The in-app notifications query (user's notification inbox) is served by the `(user_id, created_at DESC)` index.

---

### Q: Multi-tenant database design — shared DB vs separate schemas vs separate DBs?

**Answer:**

| Approach | Isolation | Cost | Complexity | Use When |
|----------|-----------|------|------------|----------|
| **Shared tables** (tenant_id column) | Low — app must filter by tenant_id | Cheapest | Low | SaaS with many small tenants |
| **Separate schemas** (one schema per tenant) | Medium — different namespaces in same DB | Medium | Medium | Need some isolation, moderate tenant count |
| **Separate databases** | Highest — complete isolation | Most expensive | High | Compliance requirements, large enterprise tenants |

**Shared tables with RLS (recommended for most SaaS):**

```sql
-- Add tenant_id to every table
ALTER TABLE orders ADD COLUMN tenant_id BIGINT NOT NULL;

-- Create a composite index (tenant_id always first)
CREATE INDEX idx_orders_tenant ON orders (tenant_id, created_at DESC);

-- Use Row-Level Security for automatic tenant isolation (see Q15)
```

---

### Q: UUID vs SERIAL/BIGSERIAL for primary keys?

**Answer:**

| Aspect | UUID (v4) | BIGSERIAL | UUID v7 / ULID |
|--------|-----------|-----------|----------------|
| **Size** | 16 bytes | 8 bytes | 16 bytes |
| **Index performance** | Poor (random, causes B-Tree page splits) | Excellent (sequential, append-only) | Good (time-ordered prefix) |
| **Predictability** | Not guessable (good for APIs) | Sequential (can be guessed) | Not guessable + time-ordered |
| **Distributed generation** | No coordination needed | Requires sequence (single point) | No coordination needed |
| **B-Tree fragmentation** | High (random inserts) | None | Low (roughly sequential) |
| **Recommendation** | Avoid for PK on large tables | Good for internal tables | **Best of both worlds** |

```sql
-- UUID v7 (PG 17+) or use gen_random_uuid() for v4
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);

-- BIGSERIAL with UUID as public identifier (good pattern)
CREATE TABLE orders (
  id        BIGSERIAL PRIMARY KEY,        -- internal, for JOINs and indexes
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,  -- external, for APIs
  ...
);
```

---

### Q: How do you implement audit logging in PostgreSQL?

**Answer:**

#### Trigger-Based Audit Log

```sql
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   BIGINT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_by  BIGINT,       -- user ID
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_table_record ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_changed_at ON audit_log USING brin (changed_at);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), current_setting('app.current_user_id', true)::BIGINT);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_setting('app.current_user_id', true)::BIGINT);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), current_setting('app.current_user_id', true)::BIGINT);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach to tables
CREATE TRIGGER trg_audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Set the current user in your application (NestJS middleware)
-- await prisma.$executeRaw`SET LOCAL app.current_user_id = ${userId}`;
```

---

## Q15: PostgreSQL Security

### Q: How do you implement Row-Level Security (RLS) for multi-tenant data isolation?

**Answer:**

RLS makes PostgreSQL enforce tenant isolation at the database level — even if application code has a bug, one tenant cannot access another's data.

```sql
-- Enable RLS on the table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (important!)
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Create a policy: users can only see their tenant's rows
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant_id')::BIGINT);

-- Policy for INSERT (check new rows have correct tenant_id)
CREATE POLICY tenant_insert ON orders
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::BIGINT);
```

```typescript
// NestJS middleware: set tenant context per request
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) throw new UnauthorizedException('Tenant ID required');

    // Set the tenant context for RLS
    await this.prisma.$executeRawUnsafe(
      `SET LOCAL app.current_tenant_id = '${parseInt(tenantId)}'`
    );

    next();
  }
}

// Alternative: Use Prisma middleware to automatically set tenant context
this.prisma.$use(async (params, next) => {
  await this.prisma.$executeRaw`
    SET LOCAL app.current_tenant_id = ${this.cls.get('tenantId')}
  `;
  return next(params);
});
```

#### Roles and Privileges

```sql
-- Create an application role with minimal privileges
CREATE ROLE app_user LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE mydb TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Read-only role for analytics
CREATE ROLE analyst LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE mydb TO analyst;
GRANT USAGE ON SCHEMA public TO analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE mydb FROM PUBLIC;
```

#### pg_hba.conf — Connection Authentication

```ini
# TYPE  DATABASE  USER       ADDRESS         METHOD
local   all       postgres                   peer           # local unix socket: OS user must match
host    mydb      app_user   10.0.0.0/8      scram-sha-256  # password auth from private network
host    mydb      app_user   0.0.0.0/0       reject         # reject from public internet
hostssl mydb      analyst    10.0.0.0/8      scram-sha-256  # require SSL for analysts
```

---

## Quick Reference

### Most-Used PostgreSQL Commands

```sql
-- Database info
\l                          -- list databases
\dt                         -- list tables
\d+ table_name              -- describe table with details
\di                         -- list indexes
\dn                         -- list schemas
SELECT version();           -- PostgreSQL version
SELECT pg_size_pretty(pg_database_size('mydb'));  -- database size
SELECT pg_size_pretty(pg_total_relation_size('orders'));  -- table + indexes size

-- Maintenance
VACUUM ANALYZE orders;      -- vacuum and update statistics
REINDEX INDEX idx_name;     -- rebuild an index
ANALYZE orders;             -- update planner statistics only
```

### Index Type Decision Tree

```
What kind of query?
│
├─ Equality (=) on a single column?
│  └─ B-Tree (default) or Hash (marginal benefit)
│
├─ Range (<, >, BETWEEN) or ORDER BY?
│  └─ B-Tree
│
├─ JSONB containment (@>), array (&&, @>), full-text (@@)?
│  └─ GIN
│
├─ Geometric / range type / nearest-neighbor?
│  └─ GiST
│
├─ Large, naturally ordered table (time-series)?
│  └─ BRIN (tiny index, big savings)
│
├─ Only need to index a subset of rows?
│  └─ Add WHERE clause → Partial Index
│
├─ Query filters on a computed expression?
│  └─ Expression Index
│
├─ Multiple columns in WHERE?
│  └─ Composite Index (equality columns first, range columns last)
│
└─ Query needs columns not in WHERE (for index-only scan)?
   └─ Add INCLUDE clause → Covering Index
```

### Isolation Level Comparison

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly | Performance |
|-------|-----------|--------------------|--------------|-----------------------|-------------|
| READ COMMITTED | No | Yes | Yes | Yes | Best |
| REPEATABLE READ | No | No | No* | Yes | Good |
| SERIALIZABLE | No | No | No | No | Lowest (retries needed) |

*PostgreSQL's REPEATABLE READ prevents phantoms (unlike SQL standard minimum).

### Performance Tuning Checklist

```
[ ] Set shared_buffers = 25% of RAM
[ ] Set effective_cache_size = 50-75% of RAM
[ ] Set random_page_cost = 1.1 for SSD
[ ] Enable pg_stat_statements
[ ] Review autovacuum settings for large tables
[ ] Use PgBouncer for connection pooling
[ ] Check for unused indexes (pg_stat_user_indexes)
[ ] Check for missing indexes (pg_stat_user_tables → seq_scan count)
[ ] Monitor dead tuple count (bloat)
[ ] Set work_mem appropriately (16-64MB, test with EXPLAIN ANALYZE)
[ ] Keep max_connections low (use pooler)
[ ] Use EXPLAIN (ANALYZE, BUFFERS) for slow queries
[ ] Partition tables over 100M rows
[ ] Use partial indexes for queries with common filters
```

### Common Senior Interview Questions — Quick Answers

| Question | Key Points |
|----------|-----------|
| "How does Postgres handle concurrent access?" | MVCC — multiple row versions, no read locks, snapshot isolation |
| "Your query is slow. What do you do?" | EXPLAIN ANALYZE → identify scan type → add/fix index → verify |
| "When would you use SERIALIZABLE?" | Financial transactions, inventory — when correctness > throughput. Must handle retries. |
| "How do you scale PostgreSQL reads?" | Read replicas (streaming replication) + PgBouncer + connection pooling |
| "How do you scale PostgreSQL writes?" | Partitioning, batch operations, async writes, or sharding (Citus) as last resort |
| "JSONB or separate tables?" | JSONB for variable schema, separate tables for structured/relational data |
| "How do you prevent data loss?" | WAL + streaming replication (sync mode) + PITR with WAL archiving |
| "How do you handle database migrations safely?" | Small, backward-compatible changes. Never lock tables in migration. Add columns as nullable, backfill, then add constraint. |
| "UUID or SERIAL for PKs?" | BIGSERIAL for internal, UUID for public APIs. Or UUID v7 for both. |
| "How do you implement a job queue in Postgres?" | `SELECT ... FOR UPDATE SKIP LOCKED` pattern |
