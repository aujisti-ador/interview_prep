# SQL Challenge Bank

> **Format:** HackerRank "Database" questions & SQL certification, TestGorilla SQL test, CodeSignal SQL, Mettl, plus the live SQL pad in CoderPad/CodeSignal interviews.
> **Why this file matters most:** for a backend engineer, SQL is the **highest points-per-minute** section on any mixed test. It's also the section most Node developers quietly fail.
> **Dialect:** PostgreSQL syntax, with MySQL differences called out. **Deep dive:** [phase-3-databases-data/01-postgresql-deep-dive.md](../phase-3-databases-data/01-postgresql-deep-dive.md)

## Working Schema

Every question below uses this schema unless stated otherwise.

```sql
CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT NOT NULL,
  name        TEXT,
  country     TEXT,
  manager_id  BIGINT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE orders (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL,      -- 'pending' | 'paid' | 'shipped' | 'cancelled' | 'refunded'
  total_cents BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE order_items (
  id         BIGSERIAL PRIMARY KEY,
  order_id   BIGINT NOT NULL REFERENCES orders(id),
  product_id BIGINT NOT NULL,
  qty        INT NOT NULL,
  unit_cents BIGINT NOT NULL
);

CREATE TABLE products (
  id       BIGSERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  category TEXT NOT NULL,
  price_cents BIGINT NOT NULL
);

CREATE TABLE events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL,
  event_type TEXT NOT NULL,       -- 'view' | 'add_to_cart' | 'checkout' | 'purchase'
  occurred_at TIMESTAMPTZ NOT NULL
);
```

## Sections
1. [Tier 1 — Select, Filter, Sort](#tier-1--select-filter-sort) (S1–S7)
2. [Tier 2 — Aggregation](#tier-2--aggregation) (S8–S14)
3. [Tier 3 — Joins](#tier-3--joins) (S15–S21)
4. [Tier 4 — Subqueries & CTEs](#tier-4--subqueries--ctes) (S22–S26)
5. [Tier 5 — Window Functions](#tier-5--window-functions) (S27–S36)
6. [Tier 6 — Classic Interview Queries](#tier-6--classic-interview-queries) (S37–S44)
7. [Tier 7 — Performance & EXPLAIN](#tier-7--performance--explain) (S45–S52)
8. [SQL MCQ Rapid Fire](#sql-mcq-rapid-fire)
9. [Traps That Cost Marks](#traps-that-cost-marks)

---

## In 60 seconds — the highest-value file in Phase 0

1. **SQL is the best points-per-minute section on any mixed assessment.** It is finite,
   learnable in days, and most backend candidates are mediocre at it. This is free score.
2. **Window functions are the dividing line between junior and senior SQL.** If you can write
   `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC)`, you are past most
   candidates.
3. **The single most-asked pattern: "top N per group."** Not top N overall — top N *within each*
   category. `ROW_NUMBER()` in a subquery, then filter `WHERE rn <= 3`. Learn this one cold.
4. **`WHERE` filters rows before grouping; `HAVING` filters after.** You cannot use an aggregate
   in `WHERE`. This appears constantly.
5. **NULL breaks intuition and that is deliberate.** `NULL = NULL` is not true. `NOT IN` with a
   NULL in the list returns nothing at all. Use `IS NULL` and prefer `NOT EXISTS`.
6. **`LEFT JOIN` + `WHERE right.col = x` silently becomes an INNER JOIN.** The condition belongs
   in the `ON` clause. This is the most common join bug there is.

**Learn to read `EXPLAIN`.** `Seq Scan` on a large table means no index is being used. That
single observation answers most "why is this query slow?" questions.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **INNER JOIN** | Only rows matching on both sides |
| **LEFT JOIN** | All rows from the left, NULLs where the right has no match |
| **Anti-join** | Finding rows with *no* match — `NOT EXISTS` or `LEFT JOIN ... IS NULL` |
| **`WHERE` vs `HAVING`** | Filter rows before grouping · filter groups after |
| **Aggregate** | `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` — collapse many rows into one |
| **`GROUP BY`** | Collapse rows sharing a value into one row per value |
| **CTE** | `WITH name AS (...)` — a named subquery, readable and reusable |
| **Recursive CTE** | A CTE referring to itself. For hierarchies and trees |
| **Window function** | Calculates across related rows *while keeping every row* |
| **`PARTITION BY`** | Restarts the window calculation per group |
| **`ROW_NUMBER` / `RANK` / `DENSE_RANK`** | 1,2,3 · 1,2,2,4 (gaps) · 1,2,2,3 (no gaps) |
| **`LAG` / `LEAD`** | The previous · next row's value. For diffs and gaps |
| **Running total** | `SUM(x) OVER (ORDER BY date)` — cumulative sum |
| **Cohort analysis** | Grouping users by when they joined, then tracking each group over time |
| **Funnel analysis** | Counting how many users reach each step in a sequence |
| **Sessionisation** | Splitting a stream of events into sessions using time gaps |
| **Gaps and islands** | Finding runs of consecutive values, and the breaks between them |
| **`EXPLAIN`** | Shows how the database plans to run your query |
| **Seq Scan** | Reading the whole table. Fine when small, a problem when not |
| **Keyset pagination** | `WHERE id > last_seen` instead of `OFFSET`. Fast at any depth |
| **Correlated subquery** | A subquery referencing the outer query. Often slow — usually rewritable as a JOIN |

---

## Tier 1 — Select, Filter, Sort

### S1. Users from Bangladesh or India created in 2026, newest first.
<details><summary>Solution</summary>

```sql
SELECT id, email, country, created_at
FROM users
WHERE country IN ('BD', 'IN')
  AND created_at >= '2026-01-01' AND created_at < '2027-01-01'
ORDER BY created_at DESC;
```
**Why half-open ranges (`>= … < …`) beat `BETWEEN`:** `BETWEEN '2026-01-01' AND '2026-12-31'` silently excludes everything on 31 Dec after midnight, and `EXTRACT(YEAR FROM created_at) = 2026` is **not SARGable** — it prevents index use on `created_at`. Graders check for both.
</details>

---

### S2. Emails containing `gmail`, case-insensitive.
<details><summary>Solution</summary>

```sql
SELECT email FROM users WHERE email ILIKE '%gmail%';       -- Postgres
SELECT email FROM users WHERE LOWER(email) LIKE '%gmail%'; -- portable
```
Note: a leading `%` makes any B-tree index useless. For real search use a trigram index (`pg_trgm` + GIN) or full-text search.
</details>

---

### S3. Users with no name recorded.
<details><summary>Solution</summary>

```sql
SELECT id FROM users WHERE name IS NULL;
```
**`name = NULL` returns zero rows, always.** `NULL` is unknown, and `unknown = unknown` is unknown, not true. This appears as an MCQ on essentially every SQL test.
</details>

---

### S4. Distinct countries, alphabetical, with NULLs last.
<details><summary>Solution</summary>

```sql
SELECT DISTINCT country
FROM users
ORDER BY country ASC NULLS LAST;
```
In Postgres, `NULL`s sort **last** for `ASC` by default and first for `DESC`. MySQL is the opposite. Being explicit is free.
</details>

---

### S5. Page 3 of users, 20 per page.
<details><summary>Solution</summary>

```sql
SELECT id, email FROM users
ORDER BY created_at DESC, id DESC        -- tiebreaker is mandatory
LIMIT 20 OFFSET 40;
```
**Without a unique tiebreaker the ordering is non-deterministic** across pages, so rows repeat or vanish. See S48 for why you'd use keyset pagination in production.
</details>

---

### S6. Show each order's total in taka with 2 decimals, labelled `total_bdt`.
<details><summary>Solution</summary>

```sql
SELECT id, ROUND(total_cents / 100.0, 2) AS total_bdt
FROM orders;
```
`total_cents / 100` would use **integer division** and truncate. Multiplying by `100.0` (or casting to `NUMERIC`) forces exact decimal arithmetic — never use `FLOAT` for money.
</details>

---

### S7. Classify each order as `small` (<1000), `medium` (<10000), `large`.
<details><summary>Solution</summary>

```sql
SELECT id, total_cents,
       CASE WHEN total_cents < 1000  THEN 'small'
            WHEN total_cents < 10000 THEN 'medium'
            ELSE 'large' END AS bucket
FROM orders;
```
`CASE` evaluates top-down and stops at the first match — so the conditions do **not** need `AND total_cents >= 1000`. Adding it isn't wrong, but the ordered form is the expected answer.
</details>

---

## Tier 2 — Aggregation

### S8. `COUNT(*)` vs `COUNT(name)` vs `COUNT(DISTINCT country)` — what's the difference?
<details><summary>Answer</summary>

- `COUNT(*)` — all rows, including those with NULLs.
- `COUNT(name)` — rows where `name IS NOT NULL`.
- `COUNT(DISTINCT country)` — distinct non-NULL values.

Corollary: `SELECT COUNT(*) - COUNT(name) FROM users` gives the NULL count. This is a top-5 SQL MCQ.
</details>

---

### S9. Number of orders and total revenue per status, highest revenue first.
<details><summary>Solution</summary>

```sql
SELECT status,
       COUNT(*)              AS order_count,
       SUM(total_cents)      AS revenue_cents
FROM orders
GROUP BY status
ORDER BY revenue_cents DESC;
```
</details>

---

### S10. Countries with more than 100 users.
<details><summary>Solution</summary>

```sql
SELECT country, COUNT(*) AS user_count
FROM users
GROUP BY country
HAVING COUNT(*) > 100
ORDER BY user_count DESC;
```
**`WHERE` filters rows before grouping; `HAVING` filters groups after.** You cannot put an aggregate in `WHERE`. Logical order of evaluation: `FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT` — which is also why you can't reference a `SELECT` alias in `WHERE` (but can in `ORDER BY`).
</details>

---

### S11. Average order value per country, rounded to 2 dp, only where ≥ 10 orders.
<details><summary>Solution</summary>

```sql
SELECT u.country,
       ROUND(AVG(o.total_cents)::NUMERIC / 100, 2) AS avg_order_bdt,
       COUNT(*) AS order_count
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status IN ('paid', 'shipped')
GROUP BY u.country
HAVING COUNT(*) >= 10
ORDER BY avg_order_bdt DESC;
```
`AVG` ignores NULLs — `AVG` of a column with NULLs divides by the **non-NULL count**, not the row count. If you need NULL-as-zero, use `AVG(COALESCE(x, 0))`.
</details>

---

### S12. Pivot: orders per status as columns, one row per month.
<details><summary>Solution</summary>

```sql
SELECT DATE_TRUNC('month', created_at) AS month,
       COUNT(*) FILTER (WHERE status = 'paid')      AS paid,
       COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
       COUNT(*) FILTER (WHERE status = 'refunded')  AS refunded
FROM orders
GROUP BY 1
ORDER BY 1;
```
Portable form (works in MySQL too):
```sql
SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid
```
The `FILTER` clause is Postgres-specific and reads better; conditional aggregation is *the* standard pivot technique and shows up constantly.
</details>

---

### S13. Top 5 products by revenue.
<details><summary>Solution</summary>

```sql
SELECT p.id, p.name,
       SUM(oi.qty * oi.unit_cents) AS revenue_cents,
       SUM(oi.qty)                 AS units
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders   o ON o.id = oi.order_id
WHERE o.status IN ('paid', 'shipped')
GROUP BY p.id, p.name
ORDER BY revenue_cents DESC
LIMIT 5;
```
Note `unit_cents` on the line item, not `p.price_cents` — historical prices must come from the order, not the catalogue. Interviewers plant this.
</details>

---

### S14. Why does `SELECT country, name, COUNT(*) FROM users GROUP BY country` fail in Postgres but work in MySQL?
<details><summary>Answer</summary>

Postgres requires every non-aggregated select column to appear in `GROUP BY` (or be functionally dependent on the grouped primary key). MySQL historically allowed it and returned an **arbitrary** `name` — a silent-wrong-answer generator, now disabled by the `ONLY_FULL_GROUP_BY` sql_mode default.

Fix: aggregate it (`MIN(name)`), group by it, or use `DISTINCT ON`/window functions if you want a specific row.
</details>

---

## Tier 3 — Joins

### S15. Every user with their order count, **including users with zero orders**.
<details><summary>Solution</summary>

```sql
SELECT u.id, u.email, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.email
ORDER BY order_count DESC;
```
**`COUNT(o.id)` not `COUNT(*)`** — with a LEFT JOIN, a user with no orders still produces one row, so `COUNT(*)` returns 1 instead of 0. This is the single most common LEFT JOIN mistake, and graders test for exactly it.
</details>

---

### S16. Users who have **never** placed an order — three ways.
<details><summary>Solution</summary>

```sql
-- 1. Anti-join (usually fastest in Postgres)
SELECT u.id FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;

-- 2. NOT EXISTS (correlated; NULL-safe; also excellent plans)
SELECT u.id FROM users u
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- 3. NOT IN -- DANGEROUS
SELECT u.id FROM users u
WHERE u.id NOT IN (SELECT user_id FROM orders);
```

**The `NOT IN` trap:** if the subquery returns even one `NULL`, the whole predicate becomes `UNKNOWN` and the query returns **zero rows**. Since `orders.user_id` is `NOT NULL` here it happens to be safe, but change the schema and it silently breaks. **Prefer `NOT EXISTS`.** Being able to explain this is a reliable senior signal.
</details>

---

### S17. Each employee with their manager's name (self-join).
<details><summary>Solution</summary>

```sql
SELECT e.name AS employee, m.name AS manager
FROM users e
LEFT JOIN users m ON m.id = e.manager_id
ORDER BY manager NULLS FIRST, employee;
```
`LEFT`, not `INNER` — otherwise the CEO (no manager) disappears.
</details>

---

### S18. Difference between `INNER`, `LEFT`, `RIGHT`, `FULL OUTER`, and `CROSS` join.
<details><summary>Answer</summary>

| Join | Returns |
|---|---|
| `INNER` | Only matching pairs |
| `LEFT` | All left rows; NULLs where no match |
| `RIGHT` | All right rows; NULLs where no match |
| `FULL OUTER` | All rows from both; NULLs on both sides |
| `CROSS` | Cartesian product (n × m) — used deliberately with `generate_series` for date spines |

Trap: putting a right-table condition in `WHERE` after a `LEFT JOIN` silently converts it to an inner join. `WHERE o.status = 'paid'` drops the NULL rows; the fix is `LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid'`.
</details>

---

### S19. Revenue per category — with categories that sold nothing shown as 0.
<details><summary>Solution</summary>

```sql
SELECT p.category,
       COALESCE(SUM(oi.qty * oi.unit_cents), 0) AS revenue_cents
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.category
ORDER BY revenue_cents DESC;
```
`SUM` over zero rows returns `NULL`, not `0` — hence `COALESCE`.
</details>

---

### S20. Users who bought **both** product 10 and product 20.
<details><summary>Solution</summary>

```sql
SELECT o.user_id
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE oi.product_id IN (10, 20)
GROUP BY o.user_id
HAVING COUNT(DISTINCT oi.product_id) = 2;
```
The "relational division" pattern: filter to the set, group, and require the distinct count to equal the set size. `WHERE product_id = 10 AND product_id = 20` matches nothing — a row can't be both.
</details>

---

### S21. A daily revenue series with **no gaps**, including zero-revenue days.
<details><summary>Solution</summary>

```sql
SELECT d::DATE AS day,
       COALESCE(SUM(o.total_cents), 0) AS revenue_cents
FROM generate_series('2026-01-01'::DATE, '2026-01-31'::DATE, INTERVAL '1 day') AS d
LEFT JOIN orders o
       ON o.created_at >= d AND o.created_at < d + INTERVAL '1 day'
      AND o.status = 'paid'
GROUP BY d
ORDER BY d;
```
The **date spine** technique. Grouping `orders` alone gives you gaps on zero days, which breaks every chart and every moving average downstream. MySQL has no `generate_series` — use a numbers/calendar table.
</details>

---

## Tier 4 — Subqueries & CTEs

### S22. Orders larger than the overall average.
<details><summary>Solution</summary>

```sql
SELECT id, total_cents
FROM orders
WHERE total_cents > (SELECT AVG(total_cents) FROM orders);
```
An uncorrelated scalar subquery — evaluated once.
</details>

---

### S23. Orders larger than the average **for that user** (correlated).
<details><summary>Solution</summary>

```sql
SELECT o.id, o.user_id, o.total_cents
FROM orders o
WHERE o.total_cents > (
  SELECT AVG(o2.total_cents) FROM orders o2 WHERE o2.user_id = o.user_id
);
```
Correlated = re-evaluated per outer row (conceptually). The window-function version is usually faster and is the answer they're steering you toward:
```sql
SELECT id, user_id, total_cents FROM (
  SELECT id, user_id, total_cents,
         AVG(total_cents) OVER (PARTITION BY user_id) AS user_avg
  FROM orders
) t WHERE total_cents > user_avg;
```
</details>

---

### S24. Rewrite a nested mess as a readable CTE chain.
<details><summary>Solution</summary>

```sql
WITH paid AS (
  SELECT * FROM orders WHERE status IN ('paid', 'shipped')
),
per_user AS (
  SELECT user_id, COUNT(*) AS n, SUM(total_cents) AS spend
  FROM paid GROUP BY user_id
)
SELECT u.email, p.n, p.spend
FROM per_user p
JOIN users u ON u.id = p.user_id
WHERE p.spend > 500000
ORDER BY p.spend DESC;
```
**Postgres ≥ 12 inlines CTEs by default** (they used to be an optimisation fence); add `MATERIALIZED` if you *want* the fence for an expensive sub-result reused several times.
</details>

---

### S25. Full management chain under user 1 (recursive CTE).
<details><summary>Solution</summary>

```sql
WITH RECURSIVE chain AS (
  SELECT id, name, manager_id, 1 AS depth
  FROM users WHERE id = 1                       -- anchor
  UNION ALL
  SELECT u.id, u.name, u.manager_id, c.depth + 1
  FROM users u
  JOIN chain c ON u.manager_id = c.id           -- recursive term
  WHERE c.depth < 20                            -- cycle guard
)
SELECT * FROM chain ORDER BY depth, name;
```
Anchor + `UNION ALL` + self-reference + a termination guard. Also the answer to "traverse a category tree / comment thread / org chart". `UNION` (without `ALL`) dedupes and can mask an infinite cycle — always keep a depth guard.
</details>

---

### S26. `EXISTS` vs `IN` vs `JOIN` for "users who ordered in January".
<details><summary>Answer</summary>

```sql
-- EXISTS: stops at the first match; no duplicate rows; NULL-safe
SELECT u.* FROM users u
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.user_id = u.id AND o.created_at >= '2026-01-01' AND o.created_at < '2026-02-01'
);
```
- `JOIN` **duplicates** the user row per matching order unless you add `DISTINCT` (which then costs a sort).
- `IN` with a subquery is usually planned identically to `EXISTS` in Postgres, but has the NULL semantics problem in its negated form.
- Rule of thumb: **`EXISTS` for "does any exist", `JOIN` when you need columns from the other table.**
</details>

---

## Tier 5 — Window Functions

Window functions are where SQL tests separate mid-level from senior. Learn these ten.

### S27. `ROW_NUMBER` vs `RANK` vs `DENSE_RANK`.
<details><summary>Answer</summary>

For values `100, 90, 90, 80`:

| Function | Result |
|---|---|
| `ROW_NUMBER()` | 1, 2, 3, 4 — always unique |
| `RANK()` | 1, 2, 2, **4** — ties share, then skip |
| `DENSE_RANK()` | 1, 2, 2, **3** — ties share, no gap |

Use `ROW_NUMBER` for dedup and pagination, `DENSE_RANK` for "top N distinct values".
</details>

---

### S28. Each user's most recent order (top-1 per group).
<details><summary>Solution</summary>

```sql
SELECT user_id, id, total_cents, created_at FROM (
  SELECT o.*, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM orders o
) t WHERE rn = 1;
```
Postgres shorthand:
```sql
SELECT DISTINCT ON (user_id) user_id, id, total_cents, created_at
FROM orders
ORDER BY user_id, created_at DESC, id DESC;
```
**The single most-asked window question in existence.** The `ORDER BY` tiebreaker is mandatory for determinism.
</details>

---

### S29. Top 3 products per category by revenue.
<details><summary>Solution</summary>

```sql
WITH revenue AS (
  SELECT p.category, p.id, p.name, SUM(oi.qty * oi.unit_cents) AS rev
  FROM order_items oi JOIN products p ON p.id = oi.product_id
  GROUP BY p.category, p.id, p.name
)
SELECT * FROM (
  SELECT r.*, DENSE_RANK() OVER (PARTITION BY category ORDER BY rev DESC) AS rnk
  FROM revenue r
) t WHERE rnk <= 3
ORDER BY category, rnk;
```
You cannot filter on a window function in `WHERE` — windows are computed **after** `WHERE`. Hence the subquery/CTE wrapper. That restriction itself is a common MCQ.
</details>

---

### S30. Running total of daily revenue.
<details><summary>Solution</summary>

```sql
SELECT day, revenue,
       SUM(revenue) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM (
  SELECT DATE_TRUNC('day', created_at) AS day, SUM(total_cents) AS revenue
  FROM orders WHERE status = 'paid' GROUP BY 1
) d
ORDER BY day;
```
**`ROWS` vs `RANGE` matters:** the default frame is `RANGE UNBOUNDED PRECEDING`, which lumps **all peer rows with the same ORDER BY value** into the same frame. With duplicate days that silently gives wrong running totals. Being explicit with `ROWS` is the correct habit.
</details>

---

### S31. Month-over-month growth.
<details><summary>Solution</summary>

```sql
WITH m AS (
  SELECT DATE_TRUNC('month', created_at) AS month, SUM(total_cents) AS rev
  FROM orders WHERE status = 'paid' GROUP BY 1
)
SELECT month, rev,
       LAG(rev) OVER (ORDER BY month) AS prev_rev,
       ROUND(100.0 * (rev - LAG(rev) OVER (ORDER BY month))
             / NULLIF(LAG(rev) OVER (ORDER BY month), 0), 2) AS growth_pct
FROM m
ORDER BY month;
```
**`NULLIF(x, 0)` is the division-by-zero guard** — the detail graders look for. `LEAD` is the forward-looking twin.
</details>

---

### S32. 7-day moving average.
<details><summary>Solution</summary>

```sql
SELECT day, revenue,
       ROUND(AVG(revenue) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS ma7
FROM daily_revenue
ORDER BY day;
```
This only means "7 days" if the series has **no gaps** — combine with the date spine from S21.
</details>

---

### S33. Delete duplicate users by email, keeping the oldest.
<details><summary>Solution</summary>

```sql
-- find them
SELECT id, email FROM (
  SELECT id, email, ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at, id) AS rn
  FROM users
) t WHERE rn > 1;

-- delete them
DELETE FROM users u
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at, id) AS rn
  FROM users
) d
WHERE u.id = d.id AND d.rn > 1;
```
Then add the constraint that should have existed: `CREATE UNIQUE INDEX ON users (LOWER(email));`. Say that out loud — deduping without preventing recurrence is a half answer.
</details>

---

### S34. Each user's share of total revenue.
<details><summary>Solution</summary>

```sql
SELECT user_id,
       SUM(total_cents) AS spend,
       ROUND(100.0 * SUM(total_cents) / SUM(SUM(total_cents)) OVER (), 2) AS pct_of_total
FROM orders WHERE status = 'paid'
GROUP BY user_id
ORDER BY pct_of_total DESC;
```
`SUM(SUM(x)) OVER ()` looks wrong but is correct — the window runs **after** aggregation, so it sums the per-group sums. Sharp interviewers love this one.
</details>

---

### S35. Sessionise events: a new session starts after 30 minutes of inactivity.
<details><summary>Solution</summary>

```sql
WITH gapped AS (
  SELECT user_id, occurred_at,
         CASE WHEN occurred_at - LAG(occurred_at) OVER (PARTITION BY user_id ORDER BY occurred_at)
                   > INTERVAL '30 minutes'
              OR LAG(occurred_at) OVER (PARTITION BY user_id ORDER BY occurred_at) IS NULL
              THEN 1 ELSE 0 END AS is_new_session
  FROM events
),
sessions AS (
  SELECT user_id, occurred_at,
         SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY occurred_at
                                   ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS session_id
  FROM gapped
)
SELECT user_id, session_id, MIN(occurred_at) AS started, MAX(occurred_at) AS ended, COUNT(*) AS events
FROM sessions
GROUP BY user_id, session_id
ORDER BY user_id, started;
```
The **flag-then-running-sum** idiom. Same code as T1 in [03c](03c-nodejs-async-and-simulation-tasks.md) — worth noticing that the SQL version is shorter.
</details>

---

### S36. Gaps and islands: find consecutive-day login streaks.
<details><summary>Solution</summary>

```sql
WITH days AS (
  SELECT DISTINCT user_id, occurred_at::DATE AS d FROM events
),
grouped AS (
  SELECT user_id, d,
         d - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d))::INT AS grp
  FROM days
)
SELECT user_id, MIN(d) AS streak_start, MAX(d) AS streak_end, COUNT(*) AS streak_len
FROM grouped
GROUP BY user_id, grp
ORDER BY streak_len DESC;
```
**The trick:** for consecutive dates, `date − row_number` is constant, so it becomes a group key. Once you've seen it you never forget it, and it shows up in HackerRank's advanced SQL set and in analytics interviews.
</details>

---

## Tier 6 — Classic Interview Queries

### S37. Second-highest order total.
<details><summary>Solution</summary>

```sql
-- Handles ties correctly (second distinct value) and returns NULL if none
SELECT MAX(total_cents) AS second_highest
FROM orders
WHERE total_cents < (SELECT MAX(total_cents) FROM orders);

-- Or, N-th generalisable
SELECT DISTINCT total_cents FROM orders ORDER BY total_cents DESC OFFSET 1 LIMIT 1;
```
`LIMIT 1 OFFSET 1` **without `DISTINCT`** returns the same value again when the top is tied — that's the hidden test case.
</details>

---

### S38. Duplicate emails.
<details><summary>Solution</summary>

```sql
SELECT LOWER(email) AS email, COUNT(*) AS n
FROM users GROUP BY LOWER(email) HAVING COUNT(*) > 1;
```
</details>

---

### S39. Median order value.
<details><summary>Solution</summary>

```sql
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_cents) AS median_cents FROM orders;
```
`PERCENTILE_CONT` interpolates; `PERCENTILE_DISC` returns an actual existing value. For latency SLOs you'd use `PERCENTILE_CONT(0.95)`. MySQL < 8 has no ordered-set aggregates — you'd do it with `ROW_NUMBER` + `COUNT`.
</details>

---

### S40. Monthly cohort retention (month 0 → month 3).
<details><summary>Solution</summary>

```sql
WITH cohort AS (
  SELECT id AS user_id, DATE_TRUNC('month', created_at) AS cohort_month FROM users
),
activity AS (
  SELECT DISTINCT o.user_id, DATE_TRUNC('month', o.created_at) AS active_month
  FROM orders o WHERE o.status = 'paid'
)
SELECT c.cohort_month,
       COUNT(DISTINCT c.user_id) AS cohort_size,
       EXTRACT(YEAR FROM AGE(a.active_month, c.cohort_month)) * 12
         + EXTRACT(MONTH FROM AGE(a.active_month, c.cohort_month)) AS month_number,
       COUNT(DISTINCT a.user_id) AS retained
FROM cohort c
LEFT JOIN activity a ON a.user_id = c.user_id AND a.active_month >= c.cohort_month
GROUP BY c.cohort_month, month_number
ORDER BY c.cohort_month, month_number;
```
The pattern: **cohort assignment → activity table → month offset → count distinct**. Any product-analytics interview asks for a version of this.
</details>

---

### S41. Funnel conversion: view → add_to_cart → checkout → purchase.
<details><summary>Solution</summary>

```sql
WITH per_user AS (
  SELECT user_id,
         MAX(CASE WHEN event_type = 'view'        THEN 1 ELSE 0 END) AS viewed,
         MAX(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) AS carted,
         MAX(CASE WHEN event_type = 'checkout'    THEN 1 ELSE 0 END) AS checked_out,
         MAX(CASE WHEN event_type = 'purchase'    THEN 1 ELSE 0 END) AS purchased
  FROM events GROUP BY user_id
)
SELECT SUM(viewed) AS viewed,
       SUM(carted) AS carted,
       SUM(checked_out) AS checked_out,
       SUM(purchased) AS purchased,
       ROUND(100.0 * SUM(purchased) / NULLIF(SUM(viewed), 0), 2) AS conversion_pct
FROM per_user;
```
Strictly, a real funnel requires the steps to be **ordered in time** per user — mention that; the `MAX(CASE…)` version counts anyone who did each step in any order.
</details>

---

### S42. DAU / MAU stickiness for a given month.
<details><summary>Solution</summary>

```sql
WITH dau AS (
  SELECT occurred_at::DATE AS d, COUNT(DISTINCT user_id) AS users
  FROM events WHERE occurred_at >= '2026-01-01' AND occurred_at < '2026-02-01'
  GROUP BY 1
),
mau AS (
  SELECT COUNT(DISTINCT user_id) AS users
  FROM events WHERE occurred_at >= '2026-01-01' AND occurred_at < '2026-02-01'
)
SELECT ROUND(AVG(dau.users)::NUMERIC / NULLIF((SELECT users FROM mau), 0), 3) AS stickiness
FROM dau;
```
</details>

---

### S43. Users whose **last** order was cancelled.
<details><summary>Solution</summary>

```sql
SELECT user_id, id, status, created_at FROM (
  SELECT o.*, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM orders o
) t WHERE rn = 1 AND status = 'cancelled';
```
Filtering `status` **inside** the subquery would give "users whose last *cancelled* order…" — a different question. Read the prompt twice.
</details>

---

### S44. Detect overlapping bookings for the same resource.
```sql
CREATE TABLE bookings (id BIGINT, room_id BIGINT, starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ);
```
<details><summary>Solution</summary>

```sql
SELECT a.id, b.id, a.room_id
FROM bookings a
JOIN bookings b
  ON a.room_id = b.room_id
 AND a.id < b.id                          -- avoid self-pairs and duplicates
 AND a.starts_at < b.ends_at
 AND b.starts_at < a.ends_at;             -- the overlap condition
```
**Two intervals overlap iff `a.start < b.end AND b.start < a.end`.** Memorise it. The production fix is a Postgres exclusion constraint:
```sql
ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING GIST (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&);
```
Naming that constraint is a strong senior signal — it moves correctness from application code into the database.
</details>

---

## Tier 7 — Performance & EXPLAIN

### S45. Which index would you add?
```sql
SELECT * FROM orders WHERE user_id = $1 AND status = 'paid' ORDER BY created_at DESC LIMIT 20;
```
<details><summary>Answer</summary>

```sql
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);
```
**Column order rule: equality columns first, then the range/sort column.** With `(user_id, status)` leading, the index seeks straight to the matching rows and returns them already in `created_at DESC` order, so the sort is eliminated entirely. Add `INCLUDE (total_cents)` if you can make it a covering index (index-only scan).
</details>

---

### S46. Why is this query slow, and how do you fix it?
```sql
SELECT * FROM orders WHERE DATE(created_at) = '2026-01-15';
```
<details><summary>Answer</summary>

Wrapping the column in a function makes the predicate **non-SARGable** — the index on `created_at` can't be used, so it's a sequential scan.

```sql
SELECT * FROM orders
WHERE created_at >= '2026-01-15' AND created_at < '2026-01-16';
```
Alternative if you must keep the expression: an **expression index** `CREATE INDEX ON orders (DATE(created_at))`. Same family of mistakes: `WHERE UPPER(email) = …`, `WHERE id::TEXT = …`, `WHERE col + 0 = 5`, and implicit casts from a mismatched parameter type.
</details>

---

### S47. Read this plan. What's wrong?
```
Seq Scan on orders  (cost=0.00..184230.00 rows=1 width=64)
                    (actual time=0.312..1893.221 rows=482913 loops=1)
  Filter: (status = 'paid'::text)
  Rows Removed by Filter: 4517087
Planning Time: 0.15 ms
Execution Time: 2104.7 ms
```
<details><summary>Answer</summary>

1. **`Seq Scan` over 5M rows** with a filter removing 4.5M — a partial index on `status` (or a composite index) would help.
2. **The estimate is catastrophically wrong**: `rows=1` estimated vs `rows=482913` actual. That means **stale statistics** (`ANALYZE orders;`) or a correlation the planner can't see. A bad estimate poisons every join choice above it.
3. Fix path: `ANALYZE`, then `CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status) WHERE status = 'paid';` (a partial index if 'paid' is a small fraction).

**How to read a plan:** always use `EXPLAIN (ANALYZE, BUFFERS)`, read **inside-out/bottom-up**, and compare `estimated rows` vs `actual rows` at every node — the first node where they diverge by 10× or more is your problem. Watch for `Seq Scan` on big tables, `Nested Loop` with a large outer, external `Sort` (spilling to disk), and high `Rows Removed by Filter`.
</details>

---

### S48. Rewrite deep pagination.
<details><summary>Answer</summary>

```sql
-- Slow: scans and discards 100,000 rows
SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 100000;

-- Keyset / cursor pagination: O(log n)
SELECT * FROM orders
WHERE (created_at, id) < ($1, $2)          -- last row of the previous page
ORDER BY created_at DESC, id DESC
LIMIT 20;
```
The **row-value comparison** `(a, b) < ($1, $2)` is the clean way to express a composite cursor. Trade-off: no jump-to-page-N and no cheap total count.
</details>

---

### S49. `COUNT(*)` on a 50M-row table takes 40 seconds. Options?
<details><summary>Answer</summary>

- Exact counts require a full scan in Postgres (MVCC — no stored row count).
- **Approximate:** `SELECT reltuples::BIGINT FROM pg_class WHERE relname = 'orders';` — instant, accurate to the last `ANALYZE`.
- **Estimated for a filtered query:** parse `EXPLAIN` output's row estimate.
- **Maintained counter:** a summary table updated by trigger or by the application (adds write contention — consider a sharded counter).
- **Product answer:** most UIs don't need an exact total; "showing 1–20 of many" plus keyset pagination removes the requirement.
</details>

---

### S50. `SELECT *` — why avoid it in application code?
<details><summary>Answer</summary>

More bytes over the wire, prevents **index-only scans** (covering indexes), breaks when a column is added/reordered, drags in large `TEXT`/`JSONB`/`BYTEA` you didn't want, and hides which fields the code actually depends on (making schema evolution risky). Fine for ad-hoc exploration, not for shipped queries.
</details>

---

### S51. Two transactions deadlocked. Root cause and fix?
<details><summary>Answer</summary>

**Cause:** two transactions acquire the same locks in **opposite order** (T1 locks A then B; T2 locks B then A).

**Fixes:**
1. **Consistent lock ordering** — always update rows sorted by primary key (e.g. `ORDER BY id` before a multi-row update, or sort the ids in the application).
2. Keep transactions **short**; never do network I/O or user interaction inside one.
3. Use lower-granularity approaches: single-statement updates, `SELECT … FOR UPDATE` on a well-defined set, or optimistic concurrency with a `version` column.
4. Catch the deadlock error code (`40P01`) and **retry** — deadlocks are normal at scale, not a bug to be eliminated.
</details>

---

### S52. Zero-downtime way to add a `NOT NULL` column with a default to a 100M-row table?
<details><summary>Answer</summary>

**Postgres 11+**: `ALTER TABLE … ADD COLUMN x INT NOT NULL DEFAULT 0` is instant — the default is stored in catalog metadata, not written to every row.

**Older Postgres / other engines / non-constant defaults** — the **expand–contract** pattern:
1. Add the column **nullable**, no default (instant)
2. Backfill in **batches** with a `LIMIT` loop and a sleep between batches, to keep replication lag and vacuum pressure down
3. Add a `NOT VALID` check constraint, then `VALIDATE CONSTRAINT` (takes only a `SHARE UPDATE EXCLUSIVE` lock)
4. Set `NOT NULL` / swap the constraint
5. Deploy the code that reads it, then the code that requires it

Also: always `CREATE INDEX CONCURRENTLY` on a live table, and set `lock_timeout` before DDL so a blocked `ALTER` doesn't queue behind and block every subsequent query. See [phase-3 migrations](../phase-3-databases-data/06-database-migrations-schema-evolution.md).
</details>

---

## SQL MCQ Rapid Fire

| # | Question | Answer |
|---|---|---|
| 1 | `WHERE` vs `HAVING` | `WHERE` filters rows pre-aggregation; `HAVING` filters groups post-aggregation |
| 2 | `UNION` vs `UNION ALL` | `UNION` dedupes (costs a sort); `UNION ALL` doesn't — use it unless you need dedup |
| 3 | `DELETE` vs `TRUNCATE` vs `DROP` | row-by-row + WHERE + triggers + rollback-able · fast whole-table reset (no WHERE, resets identity) · removes the table |
| 4 | `CHAR` vs `VARCHAR` vs `TEXT` | fixed-pad · variable with limit · unlimited; in Postgres all three perform identically — use `TEXT` |
| 5 | Clustered vs non-clustered index | clustered defines physical row order (one per table); Postgres has no true clustered index — the heap is unordered |
| 6 | What does an index cost? | slower `INSERT`/`UPDATE`/`DELETE`, more disk, more WAL, vacuum overhead |
| 7 | ACID | Atomicity, Consistency, Isolation, Durability |
| 8 | Isolation levels weakest→strongest | Read Uncommitted, Read Committed, Repeatable Read, Serializable |
| 9 | Anomalies | dirty read, non-repeatable read, phantom read, write skew (only Serializable prevents write skew) |
| 10 | Optimistic vs pessimistic locking | version-column compare-and-set + retry · `SELECT … FOR UPDATE` holds a lock |
| 11 | Normal forms 1NF/2NF/3NF | atomic values · no partial dependency on part of a composite key · no transitive dependency |
| 12 | When denormalise? | read-heavy hot paths, expensive joins, reporting — pay with write complexity and staleness |
| 13 | `INNER JOIN` on a NULL column | never matches; NULL = NULL is unknown |
| 14 | `NOT IN` with a NULL in the subquery | returns **zero rows** — use `NOT EXISTS` |
| 15 | `COALESCE` vs `NULLIF` | first non-NULL argument · returns NULL when the two args are equal (division guard) |
| 16 | Composite index `(a, b)` — usable for `WHERE b = ?` | **No** (leftmost-prefix rule); usable for `WHERE a = ?` and `WHERE a = ? AND b = ?` |
| 17 | View vs materialised view | stored query, always fresh, no storage · stored **result**, fast, needs `REFRESH` |
| 18 | Primary key vs unique constraint | one per table, implicitly `NOT NULL` · many allowed, permits NULLs (multiple in Postgres) |

---

## Traps That Cost Marks

1. **`COUNT(*)` after a LEFT JOIN** → counts 1 instead of 0. Use `COUNT(right_table.id)`.
2. **`NOT IN` + NULL** → zero rows.
3. **`WHERE` on the right table after a LEFT JOIN** → silently becomes an INNER JOIN.
4. **Integer division** → `total/100` truncates. Use `100.0` or `::NUMERIC`.
5. **`BETWEEN` on timestamps** → drops the last day's rows after midnight.
6. **Missing `ORDER BY` tiebreaker** → non-deterministic pagination.
7. **Function on an indexed column** → sequential scan.
8. **Filtering a window function in `WHERE`** → syntax error; wrap it in a subquery/CTE.
9. **Default `RANGE` frame in a running total** → wrong sums with duplicate ORDER BY values.
10. **Forgetting `NULLIF` on a divisor** → division-by-zero error kills the whole query.
11. **`SUM` over zero rows returns NULL**, not 0 → wrap in `COALESCE`.
12. **Row order isn't guaranteed without `ORDER BY`** — not even for a small table, not even if it "always works locally".
