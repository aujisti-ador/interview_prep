# REST API, Debugging & Code-Review Challenges

> **Format:** HackerRank "REST API" question type, TestGorilla "JavaScript (coding: debugging)", DevSkiller RealLifeTesting, Codility "fix the bug" tasks, take-home projects, and the live code-review round.
> **Why this file exists:** these formats reward *engineering judgement*, not algorithm recall — which is exactly what a senior/lead screen is trying to measure, and exactly what LeetCode practice doesn't cover.

## Sections
1. [The HackerRank REST API Question Type](#the-hackerrank-rest-api-question-type)
2. [The Universal Paginated-Fetch Helper](#the-universal-paginated-fetch-helper)
3. [Worked REST API Problems](#worked-rest-api-problems) (R1–R6)
4. [Find-the-Bug Bank](#find-the-bug-bank) (B1–B16)
5. [The Code-Review Round](#the-code-review-round)
6. [DevSkiller / Take-Home Playbook](#devskiller--take-home-playbook)
7. [The 10-Minute Take-Home Rubric](#the-10-minute-take-home-rubric)

---

## In 60 seconds

1. **The REST API question type is not about API design.** You are given a URL and asked to
   fetch paginated data, combine it, and return an answer. It tests whether you can loop over
   pages and handle failures — nothing more.
2. **Write the paginated-fetch helper once, memorise it, reuse it.** Every variant of this
   question is the same helper with a different filter afterwards. That is a solved problem you
   should never solve twice.
3. **Handle `429` and timeouts even when the question does not mention them.** Retrying with
   backoff costs you four lines and is exactly the judgement being assessed.
4. **For find-the-bug questions, scan in a fixed order** rather than reading top to bottom:
   ```
   1. async/await missing on a promise call     ← most common
   2. off-by-one in a loop bound
   3. mutating an array while iterating it
   4. == where === was meant
   5. error swallowed by an empty catch
   6. resource never closed / listener never removed
   7. race condition between read and write
   ```
5. **The code-review round scores your priorities, not your thoroughness.** Lead with security
   and correctness, then performance, then readability. Opening with "the variable naming is
   inconsistent" when there is an SQL injection reads as junior.
6. **Say what you would *not* change.** Restraint is a senior signal, and it takes one sentence.

**The trap in find-the-bug questions:** there is usually more than one bug, and one of them is
subtle (a race, a leak) while the others are obvious. Candidates find the obvious one and stop.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Pagination** | Results split across pages. You must loop until done |
| **`page` / `per_page` / `total_pages`** | The usual pagination fields in these questions |
| **Rate limit (`429`)** | "Too many requests." Wait and retry, honouring `Retry-After` |
| **Exponential backoff** | Waiting longer after each failed attempt |
| **Timeout** | Giving up on a request that takes too long. Always set one |
| **Idempotent** | Safe to repeat. Determines whether a retry is safe |
| **Race condition** | Two operations interleaving with a wrong result |
| **Mass assignment** | Letting a client set fields you never intended, e.g. `isAdmin` |
| **Memory leak** | Holding references so memory is never released |
| **Unhandled rejection** | A promise that failed with nobody catching it |
| **N+1 query** | One query, then one more per result |
| **Off-by-one** | `<` where `<=` was needed, or starting from 1 instead of 0 |
| **Swallowed error** | `catch {}` with nothing inside. Hides the failure |
| **Code review priority** | Security → correctness → performance → readability → style |

---

## The HackerRank REST API Question Type

**What you're given:** a base URL to a live mock API, a description of its response shape, and a function stub. **No test cases are visible.** You must call the API over HTTP and return a computed answer.

**A typical response envelope** (this exact shape recurs across HackerRank's REST API questions):
```json
{
  "page": 1,
  "per_page": 10,
  "total": 47,
  "total_pages": 5,
  "data": [ { "id": 1, "name": "...", "..." : "..." } ]
}
```

**The four things that fail candidates:**
1. **Not paginating** — they read page 1 only and return a wrong answer with no error.
2. **Fetching pages sequentially** and timing out on the platform's execution limit.
3. **Not handling `total_pages` being discovered only after the first request.**
4. **Using a library that isn't installed.** `axios` may or may not be available. **`fetch` is global from Node 18** and `https` is always there — use one of those.

**Ground rules:** network access is allowed *only* to the given host, there is a hard execution timeout (usually 10–30 s), and `console.log` output does not affect grading (so log freely while debugging).

---

## The Universal Paginated-Fetch Helper

Memorise this. It solves most of the question type on its own.

```javascript
// Node 18+: fetch is global. No dependencies.
async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/**
 * Fetches every page and returns the concatenated `data` arrays.
 * Page 1 is fetched first to learn total_pages, then pages 2..N run concurrently.
 */
async function fetchAll(baseUrl, { concurrency = 5 } = {}) {
  const sep = baseUrl.includes('?') ? '&' : '?';
  const first = await getJson(`${baseUrl}${sep}page=1`);
  const totalPages = first.total_pages ?? 1;

  const rest = [];
  for (let p = 2; p <= totalPages; p++) rest.push(p);

  const results = [];
  // simple concurrency-limited pool — see T5 in 03c
  let cursor = 0;
  async function worker() {
    while (cursor < rest.length) {
      const p = rest[cursor++];
      results.push(await getJson(`${baseUrl}${sep}page=${p}`));
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, rest.length) }, worker),
  );

  return [first, ...results].flatMap((r) => r.data ?? []);
}
```

**Fallback if `fetch` is unavailable (older Node on the platform):**
```javascript
const https = require('https');
function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}
```

---

## Worked REST API Problems

### R1. Total goals scored by a team
> `GET {base}/football_matches?year=2011&team1={name}&page=N` and `…&team2={name}&page=N`.
> Each record has `team1`, `team2`, `team1goals`, `team2goals`. Return the total goals scored **by** `team` in `year`.

```javascript
async function getTotalGoals(team, year) {
  const base = 'https://jsonmock.hackerrank.com/api/football_matches';
  const enc = encodeURIComponent(team);

  const [home, away] = await Promise.all([
    fetchAll(`${base}?year=${year}&team1=${enc}`),
    fetchAll(`${base}?year=${year}&team2=${enc}`),
  ]);

  const homeGoals = home.reduce((sum, m) => sum + Number(m.team1goals), 0);
  const awayGoals = away.reduce((sum, m) => sum + Number(m.team2goals), 0);
  return homeGoals + awayGoals;
}
```
**Three traps:** the team can be `team1` *or* `team2` (two queries — most candidates only do one); goals arrive as **strings** so `+` would concatenate; and the team name needs URL encoding.

---

### R2. Count drawn matches with a given score
> Return the number of matches in `year` where both teams scored `goals`.

```javascript
async function getNumDraws(year, goals) {
  const base = 'https://jsonmock.hackerrank.com/api/football_matches';
  const matches = await fetchAll(`${base}?year=${year}&team1goals=${goals}&team2goals=${goals}`);
  return matches.length;
}
```
**The senior move is pushing the filter to the server.** Fetching every match for the year and filtering client-side works but is slower and may hit the execution timeout — say which you chose and why.

---

### R3. Aggregate across pages with grouping
> `GET {base}/transactions?page=N` returns records `{ id, userName, txnType, amount: "$1,000.50", location: { city } }`.
> Return the city with the highest total `debit` amount.

```javascript
async function topDebitCity() {
  const all = await fetchAll('https://example.test/api/transactions');

  const totals = new Map();
  for (const t of all) {
    if (t.txnType !== 'debit') continue;
    const amount = Number(String(t.amount).replace(/[$,]/g, ''));   // "$1,000.50" -> 1000.5
    const city = t.location?.city ?? 'unknown';
    totals.set(city, (totals.get(city) ?? 0) + amount);
  }

  let best = null, bestVal = -Infinity;
  for (const [city, val] of totals) {
    if (val > bestVal || (val === bestVal && city < best)) { best = city; bestVal = val; }
  }
  return best;
}
```
**Traps:** currency strings with `$` and thousands separators, optional nested fields (`location?.city`), and **deterministic tie-breaking** (hidden tests often include a tie — break it alphabetically and say so).

---

### R4. Resolve nested resources without N+1
> `GET /users?page=N` returns users; `GET /users/{id}/orders` returns that user's orders. Return the top 3 users by order count.

```javascript
async function topUsersByOrders(base) {
  const users = await fetchAll(`${base}/users`);

  // Concurrency-limited: sequential is too slow, unbounded gets you rate-limited.
  const counts = [];
  const limit = 8;
  let i = 0;
  async function worker() {
    while (i < users.length) {
      const u = users[i++];
      const r = await getJson(`${base}/users/${u.id}/orders`);
      counts.push({ id: u.id, name: u.name, n: (r.data ?? r).length });
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, users.length) }, worker));

  return counts.sort((a, b) => b.n - a.n || a.id - b.id).slice(0, 3);
}
```
**This is the whole question:** they want to see that you neither do it sequentially (timeout) nor fire 500 concurrent requests (rate limit / socket exhaustion). Mention that in a real system you'd ask the API team for a batch endpoint or an `include=orders` parameter — that's the GraphQL/BFF answer and it lands well.

---

### R5. Handle 429s and transient failures
```javascript
async function getJsonResilient(url, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || i === attempts - 1) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    const retryAfter = Number(res.headers.get('retry-after'));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(5000, 250 * 2 ** i) * Math.random();       // full jitter
    await new Promise((r) => setTimeout(r, backoff));
  }
}
```
**Graded on:** respecting `Retry-After`, retrying only 429/5xx (**never** a 400 or 404 — it will never succeed), capping the backoff, and adding jitter.

---

### R6. Client-side timeout
```javascript
async function getWithTimeout(url, ms = 3000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);                  // always clear, or the process won't exit
  }
}
```
**"Every outbound call needs a timeout"** is one of the highest-value sentences you can say in a backend interview. A call with no timeout inherits the OS default (often minutes) and is how one slow dependency takes down an entire service. Pair it with a circuit breaker for the full answer.

---

## Find-the-Bug Bank

The instruction is always some version of *"this code doesn't behave as intended — fix it."* Diagnose out loud: **symptom → root cause → fix → how you'd prevent it.**

---

### B1
```javascript
app.post('/orders', async (req, res) => {
  const order = await createOrder(req.body);
  res.status(201).json(order);
});
```
<details><summary>Bug & fix</summary>

**No error handling.** In Express 4, a rejected promise in an async handler is **not** passed to the error middleware — the request hangs until the client times out, and Node logs an unhandled rejection.

```javascript
app.post('/orders', async (req, res, next) => {
  try {
    const order = await createOrder(req.body);
    res.status(201).json(order);
  } catch (err) { next(err); }
});
```
Better: an `asyncHandler` wrapper, `express-async-errors`, Express 5 (which handles it natively), or NestJS (which does too). Also missing: input validation before `createOrder`.
</details>

---

### B2
```javascript
async function processAll(ids) {
  ids.forEach(async (id) => {
    await process(id);
  });
  console.log('all done');
}
```
<details><summary>Bug & fix</summary>

**`forEach` ignores the returned promises.** `'all done'` prints immediately, everything runs concurrently and unbounded, and any rejection is unhandled (fatal in Node ≥ 15).

```javascript
// sequential
for (const id of ids) await process(id);
// or bounded concurrency
await asyncPool(ids.map((id) => () => process(id)), 10);
```
</details>

---

### B3
```javascript
async function getUserProfile(id) {
  const user = await db.getUser(id);
  const orders = await db.getOrders(id);
  const prefs = await db.getPreferences(id);
  return { user, orders, prefs };
}
```
<details><summary>Bug & fix</summary>

**Not a bug, a latency defect** — three independent queries run sequentially, so latency is the sum rather than the max.

```javascript
const [user, orders, prefs] = await Promise.all([
  db.getUser(id), db.getOrders(id), db.getPreferences(id),
]);
```
Only valid because they're independent. If `orders` needed `user.tenantId`, sequencing is correct — say that, because the follow-up question is exactly that.
</details>

---

### B4
```javascript
async function transfer(fromId, toId, amount) {
  const from = await db.getAccount(fromId);
  if (from.balance < amount) throw new Error('Insufficient funds');
  await db.updateBalance(fromId, from.balance - amount);
  await db.updateBalance(toId, (await db.getAccount(toId)).balance + amount);
}
```
<details><summary>Bug & fix</summary>

**Two critical bugs:**
1. **Lost update / TOCTOU race.** Two concurrent transfers both read `balance = 100`, both pass the check, both write `100 - 60`. The account goes to −20 or the second write clobbers the first. `await` is a yield point — state can change across it.
2. **No transaction.** A crash between the two updates destroys money.

```javascript
await db.transaction(async (tx) => {
  // atomic conditional update; no read-then-write window
  const { rowCount } = await tx.query(
    `UPDATE accounts SET balance = balance - $1
      WHERE id = $2 AND balance >= $1`, [amount, fromId]);
  if (rowCount === 0) throw new InsufficientFundsError();

  await tx.query(`UPDATE accounts SET balance = balance + $1 WHERE id = $2`, [amount, toId]);
});
```
Bonus points: lock rows in a **consistent order** (by id) to avoid deadlocks, and add an idempotency key so a retried transfer doesn't double-debit.
</details>

---

### B5
```javascript
const q = `SELECT * FROM users WHERE email = '${req.query.email}'`;
const rows = await db.query(q);
```
<details><summary>Bug & fix</summary>

**SQL injection.** `?email=' OR '1'='1` dumps the table; `'; DROP TABLE users; --` is worse.

```javascript
const rows = await db.query('SELECT * FROM users WHERE email = $1', [req.query.email]);
```
Add: `SELECT` explicit columns (not `*` — this is leaking `password_hash`), and validate the input shape. Note that **identifiers** (table/column names) can't be parameterised — allowlist them.
</details>

---

### B6
```javascript
app.get('/report', (req, res) => {
  const stream = fs.createReadStream(req.query.file);
  stream.pipe(res);
});
```
<details><summary>Bug & fix</summary>

**Two bugs:**
1. **Path traversal** — `?file=../../.env`. Resolve and confirm the path stays inside an allowed root: `const p = path.resolve(ROOT, path.normalize(name)); if (!p.startsWith(ROOT + path.sep)) return res.sendStatus(400);`
2. **No error handling** — `pipe` doesn't forward errors, so a missing file leaves the response hanging and leaks a file descriptor. Use `stream.pipeline(readable, res, cb)`.
</details>

---

### B7
```javascript
app.get('/events', (req, res) => {
  eventBus.on('update', (data) => res.write(`data: ${JSON.stringify(data)}\n\n`));
});
```
<details><summary>Bug & fix</summary>

**Memory leak + write-after-end.** A listener is added on every request and **never removed**, so each disconnected client keeps a closure over its `res` object forever. After ~10 requests you also get `MaxListenersExceededWarning`.

```javascript
app.get('/events', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const onUpdate = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  eventBus.on('update', onUpdate);
  req.on('close', () => eventBus.off('update', onUpdate));   // the missing line
});
```
</details>

---

### B8
```javascript
function handler(req, res) {
  if (!req.body.name) res.status(400).json({ error: 'name required' });
  res.status(201).json(create(req.body));
}
```
<details><summary>Bug & fix</summary>

**Missing `return`.** After sending the 400, execution continues and `res.json` is called twice → `ERR_HTTP_HEADERS_SENT`, plus the invalid record still gets created.

```javascript
if (!req.body.name) return res.status(400).json({ error: 'name required' });
```
</details>

---

### B9
```javascript
const page = req.query.page || 1;
const limit = req.query.limit || 20;
const offset = page * limit;
const rows = await db.query('SELECT * FROM items LIMIT $1 OFFSET $2', [limit, offset]);
```
<details><summary>Bug & fix</summary>

**Three bugs:**
1. **Off-by-one:** `offset` should be `(page - 1) * limit`. As written, page 1 skips the first 20 items.
2. **Type:** query params are **strings**, so `'2' * '20'` happens to work but `'2' + 1` wouldn't; `LIMIT '20'` may error depending on the driver. Parse with a radix and validate.
3. **No upper bound on `limit`** — `?limit=1000000` is a trivial DoS.

```javascript
const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
const offset = (page - 1) * limit;
```
</details>

---

### B10
```javascript
const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
const withVat = total * 1.15;
await db.saveOrder({ total: withVat.toFixed(2) });
```
<details><summary>Bug & fix</summary>

**Floating-point money.** `0.1 + 0.2 = 0.30000000000000004`; over thousands of orders the ledger drifts and reconciliation fails. `toFixed` rounds for display but the arithmetic was already wrong, and it returns a **string**, which may silently store as `0` in a numeric column.

Fix: hold money as **integer minor units** (paisa/cents) end-to-end, or use a decimal library; store as `NUMERIC`/`BIGINT`, never `FLOAT`/`DOUBLE`. Also: apply VAT as a `NUMERIC` rate with an explicit rounding rule agreed with finance.
</details>

---

### B11
```javascript
const payload = jwt.verify(token, process.env.JWT_SECRET);
req.user = payload;
```
<details><summary>Bug & fix</summary>

**No algorithm pinning** → `alg: none` and algorithm-confusion attacks. Also no issuer/audience check, no expiry policy assertion, and no error handling (a malformed token throws and 500s instead of 401).

```javascript
try {
  req.user = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'https://auth.example.com',
    audience: 'api://orders',
    clockTolerance: 5,
  });
} catch { return res.status(401).json({ error: 'invalid_token' }); }
```
</details>

---

### B12
```javascript
@Patch(':id')
async update(@Param('id') id: string, @Body() body: any) {
  return this.repo.save({ id, ...body });
}
```
<details><summary>Bug & fix</summary>

**Mass assignment.** A client can send `{"role":"admin","isVerified":true,"balance":99999}` and it goes straight into the entity. Also missing: ownership check (IDOR — can user A patch user B's record?), and `body: any` disables all typing.

Fix: a typed `UpdateXDto` with `class-validator`, a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, an explicit field allowlist, and an authorization guard that scopes the update to the caller.
</details>

---

### B13
```javascript
async function getUser(id) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);
  const user = await db.getUser(id);
  await redis.set(`user:${id}`, JSON.stringify(user));
  return user;
}
```
<details><summary>Bug & fix</summary>

**Four defects:**
1. **No TTL** — `redis.set` without `EX` caches forever; stale data never expires and memory grows unbounded.
2. **No negative-result handling** — if `db.getUser` returns `null`, you cache `"null"`, and `if (cached)` is truthy for the string `"null"`, so you return `null` forever (or worse, cache nothing and hammer the DB on every miss — **cache penetration**).
3. **No multi-tenant scoping** — if this is a tenant-scoped app, `user:${id}` can collide across tenants and leak data.
4. **No stampede protection** — when a hot key expires, every concurrent request hits the DB.

```javascript
const key = `t:${tenantId}:user:${id}`;
const cached = await redis.get(key);
if (cached !== null) return cached === 'NULL' ? null : JSON.parse(cached);
const user = await db.getUser(id);
await redis.set(key, user ? JSON.stringify(user) : 'NULL',
                'EX', user ? 300 + Math.floor(Math.random() * 60) : 30);  // jittered TTL
return user;
```
</details>

---

### B14
```javascript
process.on('SIGTERM', () => {
  console.log('shutting down');
  process.exit(0);
});
```
<details><summary>Bug & fix</summary>

**Immediate exit kills in-flight requests**, drops un-acked queue messages, and leaves DB transactions to time out. In Kubernetes this shows up as a burst of 502s on every deploy.

```javascript
process.on('SIGTERM', async () => {
  isShuttingDown = true;                       // readiness probe now returns 503
  await new Promise((r) => setTimeout(r, 5000)); // let the LB notice
  server.close(async () => {
    await consumer.disconnect();
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 25000).unref();   // hard cap
});
```
</details>

---

### B15
```javascript
const results = await Promise.all(userIds.map((id) => fetchProfile(id)));
```
<details><summary>Bug & fix</summary>

**Unbounded concurrency.** With 50,000 ids this opens 50,000 sockets at once — file-descriptor exhaustion, upstream rate limiting, and (because `Promise.all` is fail-fast) one failure discards all the completed work.

Fix: a concurrency-limited pool (T5 in [03c](03c-nodejs-async-and-simulation-tasks.md)) plus `allSettled` semantics so partial success is preserved.
</details>

---

### B16
```javascript
const user = await db.findUser(email);
if (user && user.password === password) return signToken(user);
return null;
```
<details><summary>Bug & fix</summary>

**Passwords stored in plaintext** and compared with `===` (which also leaks timing information).

```javascript
const user = await db.findUser(email);
const hash = user?.passwordHash ?? DUMMY_HASH;      // always hash, even on unknown user
const ok = await bcrypt.compare(password, hash);    // constant-ish time, salted, slow
if (!user || !ok) return null;                      // identical response either way
return signToken(user);
```
Comparing against a dummy hash for unknown users prevents **user enumeration** via response timing. Add rate limiting and account lockout on repeated failures.
</details>

---

## The Code-Review Round

Some screens (and most Karat/Toptal live rounds) hand you a PR and ask "what would you comment?". Work the list in this order — it's also the order of severity a reviewer expects:

| Priority | Look for |
|---|---|
| **1. Correctness** | Race conditions across `await`, missing transactions, off-by-one, wrong null handling, unhandled rejections |
| **2. Security** | Injection, missing authz (not just authn), mass assignment, secrets in code, PII in logs, missing rate limits |
| **3. Data integrity** | Missing constraints/indexes, non-idempotent writes, money as float, missing migrations |
| **4. Failure modes** | No timeout, no retry (or retry without jitter/cap), no circuit breaker, unbounded concurrency, no backpressure |
| **5. Observability** | No structured logs, no correlation id, no metric for the new path, errors swallowed |
| **6. Testability** | Hidden dependencies (`new Date()`, `Math.random()`, direct `fetch`), no test for the failure path |
| **7. Design** | Leaked domain logic into the controller, God service, missing boundary, premature abstraction |
| **8. Readability** | Naming, dead code, magic numbers, comment/code mismatch |

**How to phrase comments** (this is being assessed too): describe the *impact*, not the taste. "This will double-charge on a client retry because there's no idempotency key" beats "please add idempotency". Separate **blocking** issues from **nits** explicitly.

---

## DevSkiller / Take-Home Playbook

**Minutes 0–10 — orient before writing anything.**
- `npm ci && npm test` — read the failing test **names**; they are the spec.
- Skim the repo tree, the README, and any `TODO` comments.
- Find the seams: where is the DB accessed, where is config read, where do requests enter?

**Minutes 10–70 — implement.**
- Make the smallest failing test pass first; commit.
- Follow the existing conventions exactly, even if you'd choose differently — deviating reads as not-reading-the-code.
- Prefer boring, explicit code over clever code you can't finish.

**Last 20 minutes — the part that actually differentiates you.**
- Run the full suite and the linter.
- **Add tests for the failure paths**, not just the happy path.
- Write a short `NOTES.md`: what you built, what you'd do with more time, and one explicit trade-off you made. Reviewers read this first and it converts an average submission into a strong one.

**What take-home reviewers score (in observed order of weight):** does it run · does it do what was asked · tests · error handling · structure/naming · README · git history (small, meaningful commits — not one "final" commit).

---

## The 10-Minute Take-Home Rubric

Grade your own submission before you send it:

- [ ] `git clone && npm ci && npm start` works from a clean checkout on a machine that isn't yours
- [ ] `.env.example` exists; no real secrets committed
- [ ] Tests pass, and there is at least one test per failure path
- [ ] Every external call has a **timeout**
- [ ] Every write endpoint is **idempotent** or explicitly documents why it isn't
- [ ] Input validated at the boundary; no `any` reaching the domain
- [ ] Errors return correct status codes with a stable error shape — and never leak stack traces
- [ ] Money/time handled correctly (minor units, UTC, timezone-aware)
- [ ] Structured logs with a correlation id; no PII or tokens logged
- [ ] Database has the indexes the queries actually need
- [ ] Graceful shutdown implemented
- [ ] README states how to run it, the design decisions, and the known limitations
- [ ] Commit history tells a story
