# Timed Mock Assessments

> Five full-length simulations, one per platform archetype. **Take them under real conditions** — timer running, one tab, no notes, no AI, phone away. A mock you cheat on tells you nothing.
> Score yourself with the [Diagnostic Scorecard](#diagnostic-scorecard) at the end, then follow the [14-Day Plan](#the-14-day-plan) targeting your weakest bucket.

## Contents
1. [Mock A — HackerRank Enterprise Screen (90 min)](#mock-a--hackerrank-enterprise-screen-90-min)
2. [Mock B — TestGorilla Bundle (45 min)](#mock-b--testgorilla-bundle-45-min)
3. [Mock C — Codility / Toptal Timed Test (60 min)](#mock-c--codility--toptal-timed-test-60-min)
4. [Mock D — Talview One-Way Video (20 min)](#mock-d--talview-one-way-video-20-min)
5. [Mock E — Mettl BD Corporate Test (120 min)](#mock-e--mettl-bd-corporate-test-120-min)
6. [Diagnostic Scorecard](#diagnostic-scorecard)
7. [The 14-Day Plan](#the-14-day-plan)

---

## In 60 seconds — how to use these mocks

1. **Take them cold, under a real timer, before you feel ready.** That is the entire point. A
   mock taken when you are prepared measures nothing; a mock taken cold tells you where to
   spend the next two weeks.
2. **No hints, no lookups, no pausing.** If you would not be allowed it in the real test, do not
   allow it here. A comfortable mock produces a comfortable illusion.
3. **Fill in the diagnostic scorecard immediately afterwards**, while you still remember where
   you got stuck. "I lost 20 minutes on the DP problem and never opened the SQL section" is the
   information you came for.
4. **The result you want is a weakest bucket, not a score.** Most people are uneven — strong on
   coding, weak on SQL; or strong technically and out of time. The uneven part is what to train.
5. **Re-take the same mock two weeks later.** Comparing two scores on the same test is far more
   informative than one score on a harder one.
6. **Time management is usually the real finding.** Most candidates who fail these had the
   knowledge and spent it badly — 40 minutes on one problem, nothing left for three easy ones.

**Do Mock A today, on day one of your plan, before studying anything.** A baseline taken after
two weeks of study cannot tell you what the two weeks were worth.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Cold mock** | Taken with no preparation or warm-up, to get a true baseline |
| **Diagnostic scorecard** | The per-section breakdown showing where points were lost |
| **Weakest bucket** | The section costing you the most. Where to train next |
| **Time allocation** | Deciding in advance how long each section gets |
| **Triage** | Scanning all questions first, then choosing an order |
| **Partial credit** | Score per passing test case rather than all-or-nothing |
| **TLE** | Time Limit Exceeded — correct but too slow |
| **Bundle test** | Several short tests combined into one score (TestGorilla's format) |
| **Enterprise screen** | A longer, mixed assessment: coding plus MCQs plus SQL |
| **Percentile ranking** | Your position relative to other candidates |
| **Cutoff score** | The threshold below which you are auto-rejected. Rarely published |

---

## Mock A — HackerRank Enterprise Screen (90 min)

**Format:** 10 MCQ (20 pts) + 2 coding (50 pts) + 1 SQL (30 pts). Navigation between questions allowed. Partial test-case credit on coding.
**Time plan:** 3 min triage · 12 min MCQ · 20 min coding 1 · 15 min SQL · 30 min coding 2 · 10 min sweep.

### Section 1 — MCQ (2 points each)

**A1.** What does this print?
```javascript
const obj = { a: 1 };
const copy = { ...obj, b: { c: 2 } };
const clone = { ...copy };
clone.b.c = 99;
console.log(copy.b.c);
```
A) 2  B) 99  C) undefined  D) TypeError

**A2.** In Node, which is drained first after synchronous code completes?
A) setTimeout callbacks  B) setImmediate callbacks  C) process.nextTick queue  D) I/O callbacks

**A3.** `SELECT COUNT(*) FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id` returns 1 for a user with no orders. Which change makes it return 0?
A) Use `INNER JOIN`  B) Use `COUNT(o.id)`  C) Add `HAVING COUNT(*) > 0`  D) Use `COUNT(DISTINCT u.id)`

**A4.** Which HTTP status best fits "the request body is valid JSON but the email field is not a valid email"?
A) 400  B) 401  C) 422  D) 500

**A5.** A Kubernetes pod is `CrashLoopBackOff` with exit code 137. Most likely cause?
A) Bad environment variable  B) OOMKilled — memory limit exceeded  C) Image pull failure  D) Readiness probe failing

**A6.** Which TypeScript snippet compiles?
```typescript
// A
function f(x: unknown) { return x.length; }
// B
function f(x: unknown) { return typeof x === 'string' ? x.length : 0; }
// C
interface P { n: string }
const p: P = { n: 'a', extra: 1 };
// D
catch (e: Error) {}
```

**A7.** Which index best serves `WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 50`?
A) `(created_at)`  B) `(status, tenant_id)`  C) `(tenant_id, status, created_at DESC)`  D) `(created_at, tenant_id, status)`

**A8.** Kafka guarantees message ordering:
A) Across the whole topic  B) Within a partition  C) Per consumer group  D) Never

**A9.** Which is true of `Promise.race`?
A) Resolves with the first fulfilled promise, ignoring rejections
B) Settles with the first promise to settle, whether fulfilled or rejected
C) Waits for all promises
D) Cancels the losing promises

**A10.** Docker: which instruction invalidates the build cache for all subsequent layers when any source file changes?
A) `ENV NODE_ENV=production`  B) `EXPOSE 3000`  C) `COPY . .`  D) `WORKDIR /app`

<details><summary>Answer key — Section 1</summary>

| Q | Answer | Note |
|---|---|---|
| A1 | **B) 99** | Spread is shallow — `copy.b` and `clone.b` are the same object |
| A2 | **C) nextTick** | nextTick queue outranks promise microtasks, both outrank any phase |
| A3 | **B) `COUNT(o.id)`** | `COUNT(*)` counts the LEFT JOIN's NULL-padded row |
| A4 | **C) 422** | Syntactically valid, semantically invalid |
| A5 | **B) OOMKilled** | 137 = 128 + 9 (SIGKILL) |
| A6 | **B** | A needs narrowing; C fails excess-property checking; D is illegal (catch types must be `any`/`unknown`) |
| A7 | **C** | Equality columns first, then the sort column — eliminates the sort |
| A8 | **B) Within a partition** | Ordering needs a partition key |
| A9 | **B** | A describes `Promise.any` |
| A10 | **C) `COPY . .`** | Metadata instructions don't create layers |

**Score:** ___ / 20
</details>

---

### Section 2 — Coding Question 1 (25 points, ~20 min)

> **Deploy Window Overlap.** Given `deploys` — an array of `{ service, startMin, endMin }` (minutes since midnight, half-open interval) — return the **maximum number of deploys running simultaneously**, and the minute at which that peak begins. If several minutes tie, return the earliest.
>
> Constraints: `1 ≤ deploys.length ≤ 100_000`, `0 ≤ startMin < endMin ≤ 1440`.

<details><summary>Reference solution</summary>

```javascript
function peakConcurrency(deploys) {
  const events = [];
  for (const d of deploys) {
    events.push([d.startMin, 1]);
    events.push([d.endMin, -1]);
  }
  // ends before starts at the same minute (half-open interval)
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  let cur = 0, best = 0, bestAt = 0;
  for (const [t, delta] of events) {
    cur += delta;
    if (cur > best) { best = cur; bestAt = t; }
  }
  return { peak: best, at: bestAt };
}
```
**O(n log n) / O(n).** The graded details: half-open intervals mean an event ending at minute 10 must be processed **before** one starting at minute 10 (hence `|| a[1] - b[1]`, since `-1 < 1`); `best` is updated only on a **strict** increase, which naturally returns the earliest tie; and the O(n²) pairwise-overlap approach times out at n = 100,000.

**Scoring:** 25 pts full · 18 pts correct but O(n²) · 12 pts correct peak but wrong tie/boundary handling.
</details>

---

### Section 3 — SQL (30 points, ~15 min)

> Using the schema in [04-sql-challenge-bank.md](04-sql-challenge-bank.md#working-schema): return, for each country, the **number of users who placed their first paid order within 7 days of signing up**, and that number as a percentage of the country's total users. Include countries with zero such users. Order by percentage descending, then country ascending.

<details><summary>Reference solution</summary>

```sql
WITH first_paid AS (
  SELECT o.user_id, MIN(o.created_at) AS first_order_at
  FROM orders o
  WHERE o.status IN ('paid', 'shipped')
  GROUP BY o.user_id
),
flagged AS (
  SELECT u.id, u.country,
         CASE WHEN f.first_order_at IS NOT NULL
               AND f.first_order_at < u.created_at + INTERVAL '7 days'
              THEN 1 ELSE 0 END AS activated
  FROM users u
  LEFT JOIN first_paid f ON f.user_id = u.id
)
SELECT country,
       SUM(activated)                                              AS activated_users,
       COUNT(*)                                                    AS total_users,
       ROUND(100.0 * SUM(activated) / NULLIF(COUNT(*), 0), 2)      AS activation_pct
FROM flagged
GROUP BY country
ORDER BY activation_pct DESC, country ASC;
```
**Graded on:** `LEFT JOIN` so zero-activation countries survive · `MIN()` for the *first* order · filtering to paid statuses · `NULLIF` on the divisor · `100.0` to avoid integer division · the two-key `ORDER BY`.

**Scoring:** 30 pts full · −6 for INNER JOIN (drops zero countries) · −6 for missing the 7-day window logic · −4 for integer division · −3 for a missing tiebreaker.
</details>

---

### Section 4 — Coding Question 2 (25 points, ~30 min)

> **Idempotent Webhook Processor.** Implement `processWebhooks(events)` where each event is `{ id, type, payload, receivedAt }`.
> Rules: (1) an `id` seen before is a duplicate and must be **skipped**; (2) events of type `'order.updated'` must be applied in `receivedAt` order **per orderId**, and a later-arriving older event must be **discarded** (last-write-wins by timestamp); (3) return `{ applied, duplicates, stale }` counts plus the final state map `orderId -> payload`.

<details><summary>Reference solution</summary>

```javascript
function processWebhooks(events) {
  const seenIds = new Set();
  const state = new Map();        // orderId -> { payload, ts }
  let applied = 0, duplicates = 0, stale = 0;

  for (const e of events) {
    if (seenIds.has(e.id)) { duplicates++; continue; }   // rule 1: dedupe by event id
    seenIds.add(e.id);

    if (e.type !== 'order.updated') { applied++; continue; }

    const orderId = e.payload.orderId;
    const prev = state.get(orderId);
    if (prev && prev.ts >= e.receivedAt) { stale++; continue; }  // rule 2: LWW

    state.set(orderId, { payload: e.payload, ts: e.receivedAt });
    applied++;
  }

  return {
    applied, duplicates, stale,
    state: Object.fromEntries([...state].map(([k, v]) => [k, v.payload])),
  };
}
```
**O(n) / O(n).** The graded subtleties: dedupe happens **before** the staleness check (a duplicate is a duplicate regardless of timestamp); `>=` rather than `>` so an equal timestamp doesn't overwrite; and events don't arrive sorted, so you cannot rely on input order.

**Say out loud what you'd add in production:** the `seenIds` set needs a TTL and must live in Redis/Postgres (not process memory) so it survives restarts and works across replicas — this exact question is testing whether you understand at-least-once delivery. See [phase-2 event-driven architecture](../phase-2-apis-realtime-systems/04-event-driven-architecture.md).

**Scoring:** 25 pts full · 18 pts if dedup and LWW both work but state shape is wrong · 10 pts if only dedup works.
</details>

**Mock A total: ___ / 100.** Pass bar at most enterprises: **60–70**.

---

## Mock B — TestGorilla Bundle (45 min)

Five mini-tests. **Per-question timers — you cannot go back.** Answer everything; there's no negative marking.

### B-1. Node.js (10 min, 10 questions)
1. Which does **not** use the libuv thread pool: `fs.readFile`, `crypto.pbkdf2`, `http.get`, `zlib.gzip`?
2. `writable.write()` returns `false`. What should you do?
3. What is the default `EventEmitter` max-listener warning threshold?
4. Which npm command is deterministic in CI?
5. What does `--max-old-space-size` control?
6. `stream.pipeline()` vs `.pipe()` — one advantage?
7. Which signal does Kubernetes send before killing a pod?
8. `Buffer.allocUnsafe` — what's the risk?
9. What happens to an `'error'` event with no listener?
10. `dns.lookup` vs `dns.resolve` — which blocks a pool thread?

<details><summary>Answers</summary>1. `http.get` · 2. Stop writing until `'drain'` (backpressure) · 3. 10 · 4. `npm ci` · 5. V8 old-space heap limit in MB · 6. It forwards errors and destroys all streams · 7. `SIGTERM` · 8. Returns uninitialised memory that may contain old data · 9. Thrown as an uncaught exception, crashing the process · 10. `dns.lookup`</details>

### B-2. JavaScript Debugging (10 min, 3 snippets)
Fix each:
```javascript
// 1
const ids = [1, 2, 3];
ids.forEach(async (id) => { await save(id); });
console.log('saved all');

// 2
function getConfig(env) {
  const cfg = { port: process.env.PORT || 3000, debug: env.debug };
  return cfg;
}
// called as getConfig() -> crashes

// 3
async function total(orderIds) {
  let sum = 0;
  for (const id of orderIds) sum += await fetchAmount(id);
  return sum;
}
// works but takes 40 seconds for 200 orders
```
<details><summary>Answers</summary>

1. `forEach` ignores promises → `for (const id of ids) await save(id)` or `await Promise.all(ids.map(save))`. Also unhandled rejections.
2. No default parameter → `function getConfig(env = {})`, or `env?.debug`. Bonus: `PORT || 3000` breaks on `PORT=0`; use `??`.
3. Sequential awaits on independent calls → `const amounts = await Promise.all(orderIds.map(fetchAmount)); return amounts.reduce((a,b)=>a+b,0)` — with a concurrency limit if 200 is really 20,000.
</details>

### B-3. SQL (10 min)
Using the [standard schema](04-sql-challenge-bank.md#working-schema): *"Return the top 3 users by total paid spend in each country."*
<details><summary>Answer</summary>

```sql
WITH spend AS (
  SELECT u.id, u.email, u.country, SUM(o.total_cents) AS total
  FROM users u JOIN orders o ON o.user_id = u.id
  WHERE o.status IN ('paid', 'shipped')
  GROUP BY u.id, u.email, u.country
)
SELECT * FROM (
  SELECT s.*, ROW_NUMBER() OVER (PARTITION BY country ORDER BY total DESC, id) AS rn
  FROM spend s
) t WHERE rn <= 3
ORDER BY country, rn;
```
Key marks: window function partitioned by country, the deterministic tiebreaker, and filtering `rn` **outside** the window (you can't filter a window function in `WHERE`).
</details>

### B-4. Problem Solving (8 min, non-technical logic)
1. Five services deploy in sequence. Payments is not first. Auth deploys immediately before Payments. Search is last. Notifications is second. Where is Auth?
2. A task takes 6 engineers 10 days. Halfway through (day 5), 2 engineers leave. When does it finish?
3. If every failed deploy costs 40 minutes of engineer time and you deploy 30 times a week with a 12% failure rate, how many hours per week are lost?

<details><summary>Answers</summary>

1. Slots: 5 = Search, 2 = Notifications. Payments ≠ 1, and Auth is immediately before Payments, so Auth–Payments must be 3–4. **Auth is third.** (Slot 1 is the remaining service.)
2. 6 × 10 = 60 engineer-days total; 6 × 5 = 30 done by day 5; 30 remaining at 4/day = 7.5 more days → **finishes on day 12.5**.
3. 30 × 0.12 = 3.6 failures × 40 min = 144 min = **2.4 hours/week**.
</details>

### B-5. Attention to Detail (7 min)
Which record pairs differ?
```
1) ORD-2026-0041882 | ORD-2026-0041882
2) 8f14e45f-ceea-467a-9e8b-7c33d1a2b0f5 | 8f14e45f-ceaa-467a-9e8b-7c33d1a2b0f5
3) rabbi.ador@doodlei.net | rabbi.ador@doodlei.net
4) 2026-03-11T09:45:00Z | 2026-03-11T09:54:00Z
5) BDT 1,240,500.00 | BDT 1,240,500.00
```
<details><summary>Answers</summary>**2 differs** (`ceea` → `ceaa`) and **4 differs** (`09:45` → `09:54`). 1, 3, 5 are identical. Technique: compare in 4-character chunks, and check digit *transpositions* specifically — they're the hardest to see.</details>

**Mock B total: ___ / 26 items.** TestGorilla-style pass bar: **~75%** on each individual test — the weakest test in the bundle is what sinks candidates.

---

## Mock C — Codility / Toptal Timed Test (60 min)

Two tasks, 30 minutes each. **You are scored separately on correctness and performance.** Write your own edge cases before submitting.

### C-1. Consistent Rebalance
> A hash ring has `N` virtual nodes numbered `0..N-1`, currently assigned to servers by `node % S` where `S` is the server count. When you scale from `S` to `S+1` servers, **how many virtual nodes change server**?
> Return that count. `1 ≤ N ≤ 1_000_000`, `1 ≤ S ≤ 1000`.

<details><summary>Reference solution & the trap</summary>

```javascript
function reassignedCount(N, S) {
  let moved = 0;
  for (let node = 0; node < N; node++) {
    if (node % S !== node % (S + 1)) moved++;
  }
  return moved;
}
```
**O(N).** Correct and fast enough at N = 10⁶.

**The interview point** (say it even if not asked): this is exactly why **modulo hashing is a bad sharding strategy** — adding one server remaps a huge fraction of keys, invalidating the entire cache. Consistent hashing with virtual nodes moves only ~1/(S+1) of keys. That observation is worth more than the code. See [phase-5 distributed systems](../phase-5-system-design/03-distributed-systems.md).

**Edge cases:** `S = 1` (every node with `node % 2 === 1` moves), `N < S`, `N = 1`.
</details>

### C-2. Log Burst Detection
> Given a sorted array `times` of request timestamps in milliseconds and a window `W` ms, return the **maximum number of requests in any window of length W** (half-open: `[t, t+W)`).
> `1 ≤ times.length ≤ 200_000`.

<details><summary>Reference solution & the trap</summary>

```javascript
function maxBurst(times, W) {
  let start = 0, best = 0;
  for (let end = 0; end < times.length; end++) {
    while (times[end] - times[start] >= W) start++;   // shrink to keep the window valid
    best = Math.max(best, end - start + 1);
  }
  return best;
}
```
**O(n) / O(1)** — the two-pointer sliding window. The trap is the O(n²) nested loop, which passes correctness at 100% and **fails performance**, halving your score. Second trap: `>=` vs `>` decides whether the window is half-open; the prompt says half-open, so `>=` is correct.

**Edge cases:** single timestamp · all timestamps identical (answer = length) · `W = 1` · timestamps spread far wider than `W` (answer = 1).
</details>

**Mock C scoring:** each task 50 pts (correctness 30 / performance 20). Toptal-tier bar: **≥ 80/100**.

---

## Mock D — Talview One-Way Video (20 min)

**Rules:** record for real. 30 s prep, 90 s answer, **one take each**. Then watch the recordings back — that playback is where the actual learning happens.

| # | Question | What's being scored |
|---|---|---|
| 1 | Tell me about yourself and your current role. | Structure, concision, scale signalled in numbers |
| 2 | Describe the most complex system you've designed or owned. Why were the key decisions right? | Depth, trade-off reasoning, ownership language |
| 3 | Tell me about a production incident you led. | Detection → mitigation → root cause → **prevention** |
| 4 | Describe a time you disagreed with a technical decision and what happened. | Evidence-based influence, disagree-and-commit |
| 5 | How would you design a notification system for tens of millions of users? (90 s) | Requirement framing, queue/fan-out, idempotency, rate limits |
| 6 | Why are you interested in a remote role with an international team, and how do you work across time zones? | Async communication, self-direction, specificity |

<details><summary>Self-scoring rubric — mark each 1–5</summary>

| Dimension | 1 | 5 |
|---|---|---|
| **Structure** | Rambles, no shape | Headline → situation → action → result, lands inside the time |
| **Ownership** | "We" throughout | "I decided X because Y" |
| **Specificity** | Generic claims | Real numbers, real names, real constraints |
| **Trade-offs** | One option presented | Names the alternative and why it was rejected |
| **Delivery** | Fillers, reading, eyes off camera | Steady pace, eye contact, finished sentences |
| **Time use** | < 40 s or cut off mid-sentence | 75–90 s with a clean landing |

**36/36 possible. Below 24 → rebuild your five stories from [07](07-video-interview-and-psychometric.md) before applying anywhere.**
</details>

---

## Mock E — Mettl BD Corporate Test (120 min)

**Sections are time-locked — you cannot go back.** Aptitude often carries an independent cut-off.

### E-1. Aptitude (30 min, 20 questions — sample of 8)
1. A project budget of BDT 4,800,000 is split between infrastructure, salaries, and licences in the ratio 3 : 8 : 1. How much goes to licences?
2. A server's utilisation rose from 45% to 63%. What is the percentage increase?
3. 8 engineers complete a migration in 15 days. How many engineers to finish in 10 days?
4. After a 25% discount, a licence costs $1,350. What was the original price?
5. Series: 5, 11, 23, 47, ?
6. If `all incidents require a postmortem` and `some postmortems are automated`, what follows about incidents?
7. A cache serves 88% of 12.5M daily requests. How many reach the origin?
8. Traffic grows 5% per month. Approximately what is the annual growth?

<details><summary>Answers</summary>

1. **BDT 400,000** (12 parts → 400,000 per part × 1).
2. **40%** — (63 − 45)/45 = 0.4. *(Not 18% — that's percentage *points*.)*
3. **12** — 8 × 15 = 120 engineer-days; 120/10 = 12.
4. **$1,800** — 1,350/0.75. *(The reverse-percentage trap: not 1,350 × 1.25 = 1,687.50.)*
5. **95** — each term is `2n + 1`.
6. **Nothing.** The automated postmortems need not correspond to any particular incident set; "some incidents have automated postmortems" does not follow.
7. **1.5M** — 12% of 12.5M.
8. **~79.6%** — 1.05¹² = 1.7959. *(Not 60%.)*
</details>

### E-2. Technical MCQ (30 min, 25 questions)
Draw from [01](01-mcq-bank-javascript-typescript.md), [02](02-mcq-bank-nodejs-backend.md), and [06](06-devops-cloud-mcq-bank.md). Pick 25 at random, 72 seconds each, no notes.
**Target: 20/25.**

### E-3. Coding (45 min, 2 problems)
Use **P12 (MaxCounters)** and **P25 (Log Sessionisation)** from [03](03-coding-challenges-dsa-javascript.md) — one performance-trap problem and one messy-real-data problem. Write them from scratch, in a plain editor with no autocomplete.
**Target: both correct, MaxCounters in O(N+M).**

### E-4. Psychometric (15 min)
Any Big-5 inventory. **Target:** finish inside the time with no long hesitations. The measure here is consistency, not score — see [07](07-video-interview-and-psychometric.md#personality--culture-fit-inventories).

---

## Diagnostic Scorecard

Fill this in after all five mocks. The point is to find your **weakest bucket**, not your average.

| Bucket | Source | Your score | Bar | Gap? |
|---|---|---|---|---|
| JS/TS fundamentals | Mock A §1, Mock B-1/B-2 | ___ | 80% | |
| Node/backend knowledge | Mock B-1, Mock E-2 | ___ | 80% | |
| DSA coding | Mock A §2/§4, Mock C | ___ | 70% | |
| Algorithmic performance | Mock C performance score | ___ | 80% | |
| SQL | Mock A §3, Mock B-3 | ___ | 80% | |
| Debugging / code review | Mock B-2 | ___ | 100% | |
| DevOps / cloud | Mock A §1, Mock E-2 | ___ | 70% | |
| Cognitive aptitude | Mock B-4/B-5, Mock E-1 | ___ | 75% | |
| Video / communication | Mock D rubric | ___ | 24/36 | |

**Interpretation:**
- **One bucket far below the rest** → that's your entire study plan for the next two weeks. Nothing else moves your pass rate as much.
- **DSA fine but performance low** → you're not checking constraints before choosing an approach. Re-read the [complexity cheat sheet](03c-nodejs-async-and-simulation-tasks.md#complexity-cheat-sheet).
- **Knowledge fine but timing bad** → the problem is triage, not knowledge. Re-drill with a hard timer and practise abandoning questions.
- **Everything decent, video weak** → you're being filtered *after* passing the technical bar, which is the most expensive place to fail.

---

## The 14-Day Plan

Two hours a day. Adjust the weighting toward whatever the scorecard flagged.

| Day | Focus | Deliverable |
|---|---|---|
| 1 | Diagnostic: Mock A | Scorecard filled in |
| 2 | [01 — JS/TS MCQ](01-mcq-bank-javascript-typescript.md), all 75 | Flashcards for every miss |
| 3 | [02 — Node/backend MCQ](02-mcq-bank-nodejs-backend.md), all 84 | Flashcards; run the speed drill aloud |
| 4 | [03 — DSA](03-coding-challenges-dsa-javascript.md) Tiers 1–2 | P1–P13 typed from scratch |
| 5 | [03 — DSA](03-coding-challenges-dsa-javascript.md) Tiers 3–4 | P14–P24; heap implemented from memory |
| 6 | [04 — SQL](04-sql-challenge-bank.md) Tiers 1–4 | S1–S26 written without looking |
| 7 | [04 — SQL](04-sql-challenge-bank.md) Tiers 5–7 | Window functions + one `EXPLAIN` read |
| 8 | Mock C (Codility) | Correctness **and** performance recorded |
| 9 | [03c — Node/async tasks](03c-nodejs-async-and-simulation-tasks.md) + the CodeSignal growing-spec task | Async pool, retry, LRU, KV store from memory |
| 10 | [05 — debugging](05-rest-api-and-debugging-challenges.md) B1–B16 + REST API problems | Diagnose each aloud in under 60 s |
| 11 | [06 — DevOps MCQ](06-devops-cloud-mcq-bank.md) + speed drill | 16/18 on the drill |
| 12 | [07 — video](07-video-interview-and-psychometric.md): write and record the five STAR stories | Five recordings you'd actually send |
| 13 | Mock D + Mock E-1 (aptitude) | Rubric ≥ 24/36; aptitude ≥ 75% |
| 14 | Re-take Mock A cold | Compare against day 1 |

**If you only have one weekend before a test:**
Day 1 — [00 playbook](00-platform-playbook.md) + all of [01](01-mcq-bank-javascript-typescript.md) and [02](02-mcq-bank-nodejs-backend.md) + the [SQL Tier 5 window functions](04-sql-challenge-bank.md#tier-5--window-functions).
Day 2 — [DSA Tiers 1–3](03-coding-challenges-dsa-javascript.md) + [03c async tasks](03c-nodejs-async-and-simulation-tasks.md) + Mock A under a timer.
