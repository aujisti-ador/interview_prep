# Node/Async & Simulation Coding Tasks

> **The discriminator questions.** [Part 1](03-coding-challenges-dsa-javascript.md) and [Part 2](03b-coding-challenges-advanced-patterns.md) cover the LeetCode-pattern layer. This file covers what those don't: the **Node-flavoured async tasks** and **backend-flavoured simulations** that senior screens use to separate people who've shipped production Node from people who've ground LeetCode.
>
> Almost nobody practises these, and they appear constantly on DevSkiller, Turing, Karat, CodeSignal Task 4, and take-homes.

## Sections
1. [Backend-Flavoured Simulation](#backend-flavoured-simulation) (T1–T3)
2. [Node/Async Implementation Tasks](#nodeasync-implementation-tasks) (T4–T10)
3. [The CodeSignal "Growing Spec" Task](#the-codesignal-growing-spec-task)
4. [Edge-Case Checklist](#edge-case-checklist)
5. [Complexity Cheat Sheet](#complexity-cheat-sheet)

---

## Backend-Flavoured Simulation

HackerRank's senior/lead tests lean heavily on these — they look like real work, not textbook DSA.

### T1. Log Sessionisation
> Given `[{userId, timestampMs, action}]`, group each user's events into sessions where a gap > 30 min starts a new session. Return session count per user.

```javascript
const GAP_MS = 30 * 60 * 1000;

function sessionCounts(events) {
  const byUser = new Map();
  for (const e of events) {
    if (!byUser.has(e.userId)) byUser.set(e.userId, []);
    byUser.get(e.userId).push(e.timestampMs);
  }
  const out = {};
  for (const [user, times] of byUser) {
    times.sort((a, b) => a - b);                 // never assume input is sorted
    let sessions = times.length ? 1 : 0;
    for (let i = 1; i < times.length; i++) {
      if (times[i] - times[i - 1] > GAP_MS) sessions++;
    }
    out[user] = sessions;
  }
  return out;
}
```
**O(n log n) / O(n).** **Traps:** unsorted input, a user with a single event, `>` vs `>=` at exactly 30 minutes (ask), and timezone/epoch units.
The SQL version of this exact problem is [S35](04-sql-challenge-bank.md#tier-5--window-functions) — worth comparing; the SQL is shorter.

---

### T2. Bank Transaction Validation
> Process `[{id, accountId, type: 'DEBIT'|'CREDIT', amount}]` against opening balances. Reject a debit that would overdraw; reject duplicate transaction ids. Return final balances plus rejected ids **in input order**.

```javascript
function process(openingBalances, transactions) {
  const balances = new Map(Object.entries(openingBalances));
  const seen = new Set();
  const rejected = [];

  for (const t of transactions) {
    if (seen.has(t.id)) { rejected.push(t.id); continue; }   // idempotency
    seen.add(t.id);

    if (!balances.has(t.accountId)) { rejected.push(t.id); continue; }
    if (!Number.isFinite(t.amount) || t.amount <= 0) { rejected.push(t.id); continue; }

    const bal = balances.get(t.accountId);
    if (t.type === 'DEBIT') {
      if (bal < t.amount) { rejected.push(t.id); continue; }  // insufficient funds
      balances.set(t.accountId, bal - t.amount);
    } else if (t.type === 'CREDIT') {
      balances.set(t.accountId, bal + t.amount);
    } else {
      rejected.push(t.id);
    }
  }
  return { balances: Object.fromEntries(balances), rejected };
}
```
**What's graded:** ordered rejections, idempotency by id, unknown-account handling, and validating the amount. Mention that in production you'd hold money as **integer minor units** to avoid float drift — that single remark reads as senior.

---

### T3. Rate Limiter Simulation (sliding window log)
> Given requests `[{userId, timestampSec}]` and a limit of `L` per `W` seconds, return which requests are **allowed**.

```javascript
function rateLimit(requests, L, W) {
  const windows = new Map();               // userId -> array of allowed timestamps
  const allowed = [];
  for (const r of requests) {
    if (!windows.has(r.userId)) windows.set(r.userId, []);
    const q = windows.get(r.userId);
    while (q.length && q[0] <= r.timestampSec - W) q.shift();   // evict expired
    if (q.length < L) { q.push(r.timestampSec); allowed.push(true); }
    else allowed.push(false);
  }
  return allowed;
}
```
**Name the trade-off out loud:** `Array.shift()` is O(n) — use a head index or a deque for large windows. Then say the production answer is a Redis sorted set (`ZREMRANGEBYSCORE` + `ZCARD` + `ZADD` in one Lua script) or a token bucket. That connects the puzzle to [REST API best practices](../phase-2-apis-realtime-systems/02-rest-api-best-practices.md) and is what earns the senior mark.

---

## Node/Async Implementation Tasks

### T4. Implement `Promise.all`
```javascript
function promiseAll(items) {
  return new Promise((resolve, reject) => {
    const results = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) return resolve([]);           // must handle empty
    items.forEach((item, i) => {
      Promise.resolve(item).then(                      // non-promise values allowed
        (value) => { results[i] = value; if (--remaining === 0) resolve(results); },
        reject                                          // first rejection wins
      );
    });
  });
}
```
**Graded on:** empty input, preserving **index order** (not completion order), accepting non-promise values, and not resolving twice.
**Follow-up:** now write `allSettled` (never rejects; maps to `{status, value|reason}`) and `any` (first *fulfilled* wins; `AggregateError` only if all reject).

---

### T5. Concurrency-Limited Async Pool
> Run 1,000 async tasks with at most `N` in flight, preserving result order.

```javascript
async function asyncPool(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

// usage: await asyncPool(urls.map(u => () => fetch(u)), 5)
```
**Why it matters:** `Promise.all(urls.map(fetch))` opens 1,000 sockets at once and gets you rate-limited or OOM'd. This is the fix, and it's the single most useful 15 lines in this folder.
**Follow-ups:** collect errors instead of failing fast, add a per-task timeout, add retry.

---

### T6. Retry with Exponential Backoff + Jitter
```javascript
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, { attempts = 3, baseMs = 200, maxMs = 5000, isRetryable = () => true } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();                                   // 'await' inside try is required
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !isRetryable(err)) throw err;
      const backoff = Math.min(maxMs, baseMs * 2 ** i);
      await sleep(Math.random() * backoff);                // full jitter
    }
  }
  throw lastErr;
}
```
**Graded on:** `return await` (a bare `return fn()` escapes the `try` and makes the `catch` dead code), a retry **cap**, **jitter** (without it every client retries in lockstep — a thundering herd), and **not retrying non-idempotent operations or 4xx failures**.

---

### T7. LRU Cache in O(1)
```javascript
class LRUCache {
  constructor(capacity) { this.cap = capacity; this.map = new Map(); }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key);
    this.map.delete(key);                 // re-insert to move to the "most recent" end
    this.map.set(key, val);
    return val;
  }

  set(key, val) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, val);
    if (this.map.size > this.cap) {
      this.map.delete(this.map.keys().next().value);   // oldest key = first key
    }
  }
}
```
**O(1) both operations.** The trick is that JS `Map` **guarantees insertion order** and gives O(1) delete, so you don't need a hand-rolled doubly-linked list as you would in Java/C++. Say that explicitly — it shows you know the language, not just the algorithm. If they insist on the linked-list version, that's [phase-5 LLD practice](../phase-5-system-design/07-lld-practice-problems.md).

---

### T8. Debounce and Throttle
```javascript
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, wait) {
  let last = 0, timer = null, lastArgs;
  return function (...args) {
    const now = Date.now();
    lastArgs = args;
    if (now - last >= wait) { last = now; fn.apply(this, args); }
    else if (!timer) {                                   // trailing call
      timer = setTimeout(() => {
        last = Date.now(); timer = null; fn.apply(this, lastArgs);
      }, wait - (now - last));
    }
  };
}
```
Use `function` (not an arrow) for the returned wrapper so `this` passes through. Add `.cancel()` if asked.
**Debounce** = run once after activity *stops*; **throttle** = at most once per interval *during* activity.

---

### T9. Minimal EventEmitter
```javascript
class Emitter {
  constructor() { this.handlers = new Map(); }

  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(fn);
    return () => this.off(event, fn);          // return an unsubscribe fn
  }

  once(event, fn) {
    const wrap = (...args) => { this.off(event, wrap); fn(...args); };
    return this.on(event, wrap);
  }

  off(event, fn) { this.handlers.get(event)?.delete(fn); }

  emit(event, ...args) {
    const set = this.handlers.get(event);
    if (!set) return false;
    for (const fn of [...set]) fn(...args);     // copy: a handler may unsubscribe mid-emit
    return true;
  }
}
```
**Graded on:** the defensive copy in `emit`, `once` built on `on`, returning an unsubscribe function, and knowing that an unhandled `'error'` event throws in Node's real implementation.

---

### T10. Deep Clone with Cycles
```javascript
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);              // cycle guard

  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (value instanceof Map) {
    const m = new Map(); seen.set(value, m);
    for (const [k, v] of value) m.set(deepClone(k, seen), deepClone(v, seen));
    return m;
  }
  if (value instanceof Set) {
    const s = new Set(); seen.set(value, s);
    for (const v of value) s.add(deepClone(v, seen));
    return s;
  }

  const out = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, out);
  for (const k of Reflect.ownKeys(value)) out[k] = deepClone(value[k], seen);
  return out;
}
```
**`WeakMap` for the cycle guard is the point of the question.**
**Follow-ups:** "why not `JSON.parse(JSON.stringify())`?" → loses `undefined`/functions/Date/Map/Set and throws on cycles. "Why not `structuredClone`?" → you *should* use it (Node 17+) unless you need functions cloned — say that, then show you can still write it.

---

## The CodeSignal "Growing Spec" Task

Task 4 of a CodeSignal GCA is usually one problem revealed in **four levels**, each building on the last. Tests for Level 1 keep running as you add Levels 2–4, so a rewrite that breaks Level 1 costs you everything. **Design for extension from line one.**

**Worked example — an in-memory key-value store:**

- **Level 1:** `set(key, field, value)`, `get(key, field)`, `delete(key, field)`
- **Level 2:** `scan(key)` → all fields sorted, `scanByPrefix(key, prefix)`
- **Level 3:** TTL — every operation takes a `timestamp`, plus `setWithTtl(...)`; expired entries are invisible to all reads
- **Level 4:** `backup(timestamp)` / `restore(timestamp, backupTimestamp)`, where restored TTLs resume with their **remaining** lifetime

```javascript
class KVStore {
  constructor() {
    this.data = new Map();       // key -> Map<field, {value, createdAt, expiresAt|null}>
    this.backups = new Map();    // backupTimestamp -> serialised snapshot
  }

  // ---- Level 3 makes liveness a single shared predicate. Every read goes through it.
  _alive(rec, ts) { return rec.expiresAt === null || rec.expiresAt > ts; }

  _fields(key, ts) {
    const m = this.data.get(key);
    if (!m) return [];
    return [...m.entries()].filter(([, rec]) => this._alive(rec, ts));
  }

  // ---- Level 1 (signatures already carry `ts`, so Level 3 needs no rewrite)
  set(key, field, value, ts = 0) { this.setWithTtl(key, field, value, ts, null); }
  setWithTtl(key, field, value, ts, ttl) {
    if (!this.data.has(key)) this.data.set(key, new Map());
    this.data.get(key).set(field, {
      value, createdAt: ts, expiresAt: ttl === null ? null : ts + ttl,
    });
  }
  get(key, field, ts = 0) {
    const rec = this.data.get(key)?.get(field);
    return rec && this._alive(rec, ts) ? rec.value : null;
  }
  delete(key, field, ts = 0) {
    const rec = this.data.get(key)?.get(field);
    if (!rec || !this._alive(rec, ts)) return false;
    this.data.get(key).delete(field);
    return true;
  }

  // ---- Level 2
  scan(key, ts = 0) {
    return this._fields(key, ts)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([f, rec]) => `${f}(${rec.value})`);
  }
  scanByPrefix(key, prefix, ts = 0) {
    return this.scan(key, ts).filter((s) => s.startsWith(prefix));
  }

  // ---- Level 4
  backup(ts) {
    const snapshot = [];
    let count = 0;
    for (const [key, fields] of this.data) {
      const live = [...fields.entries()].filter(([, rec]) => this._alive(rec, ts));
      if (!live.length) continue;
      count++;
      snapshot.push([key, live.map(([f, rec]) => [f, {
        value: rec.value,
        // store REMAINING ttl, not the absolute expiry
        remaining: rec.expiresAt === null ? null : rec.expiresAt - ts,
      }])]);
    }
    this.backups.set(ts, snapshot);
    return count;
  }
  restore(ts, backupTs) {
    const snapshot = this.backups.get(backupTs) ?? [];
    this.data = new Map();
    for (const [key, fields] of snapshot) {
      const m = new Map();
      for (const [f, rec] of fields) {
        m.set(f, {
          value: rec.value,
          createdAt: ts,
          expiresAt: rec.remaining === null ? null : ts + rec.remaining,  // resume, don't reset
        });
      }
      this.data.set(key, m);
    }
  }
}
```

**The three habits that win this task type:**
1. **Put the timestamp in every signature from Level 1**, even before TTLs exist. Retrofitting it later is what runs candidates out of time.
2. **One liveness predicate** (`_alive`) that every read path funnels through — otherwise Level 3 means editing six methods and you'll miss one.
3. **Store remaining TTL in backups, not absolute expiry.** This is the specific detail Level 4's hidden tests check.

**Other specs that appear in this slot:** a file system (`mkdir`/`ls`/`mv` → then wildcards → then permissions → then snapshots), a bank (accounts → transfers → scheduled payments → merge accounts), and a cloud-storage/billing simulator. The design instinct is identical, and it's the same one trained by [phase-5 LLD practice](../phase-5-system-design/07-lld-practice-problems.md).

---

## Edge-Case Checklist

Run this before every submit. It's worth more points than any algorithm:

- [ ] **Empty** input — `[]`, `""`, `null`, `{}`
- [ ] **Single element**
- [ ] **All identical** elements
- [ ] **All negative** (Kadane, min/max, sums)
- [ ] **Already sorted** and **reverse sorted**
- [ ] **Duplicates** — does the spec want them counted once?
- [ ] **Maximum constraint** — is your complexity good enough for `n = 10⁵`?
- [ ] **Off-by-one** at loop bounds (`< n` vs `<= n`, `n-1` for pair loops)
- [ ] **Integer precision** — sums above 2⁵³ need `BigInt`
- [ ] **`sort()` without a comparator** — the #1 silent bug in JS submissions
- [ ] **Return type** — number vs string vs array; `-1` vs `null` vs `undefined` for "not found"
- [ ] **Mutating the input** when the caller may reuse it
- [ ] **Recursion depth** — n = 10⁵ recursion → `RangeError: Maximum call stack size exceeded`
- [ ] **Unicode** — `s.length` counts UTF-16 units; `[...s]` counts code points
- [ ] **Async only:** unhandled rejections, unbounded concurrency, missing timeouts, `forEach` with an async callback

---

## Complexity Cheat Sheet

| Operation | JS structure | Complexity |
|---|---|---|
| `Map`/`Set` get/set/has/delete | hash table | O(1) average |
| `Object` property access | hidden class / dictionary | O(1) average |
| `arr.push` / `arr.pop` | dynamic array | O(1) amortised |
| `arr.shift` / `arr.unshift` | dynamic array | **O(n)** — use an index pointer or a deque |
| `arr.splice(i, 1)` | dynamic array | O(n) |
| `arr.includes` / `indexOf` | linear scan | O(n) — use a `Set` |
| `arr.sort` | TimSort (V8) | O(n log n) |
| `str + str` in a loop | rope/flat string | fine in V8, but `arr.join('')` is the safe habit |
| Heap push/pop | hand-rolled (see [Part 2](03b-coding-challenges-advanced-patterns.md)) | O(log n) |

**Constraint → required complexity (the number you check first):**

| `n` up to | Your algorithm must be about |
|---|---|
| 10 | anything, even O(n!) |
| 20–25 | O(2ⁿ) bitmask/backtracking |
| 500 | O(n³) |
| 5,000 | O(n²) |
| 10⁵–10⁶ | O(n log n) or O(n) |
| 10⁹ | O(log n) or O(1) — binary search or maths |

**JavaScript has no built-in heap, deque, or sorted map.** Know that going in: `Array.shift()` in a BFS loop is the most common accidental O(n²) in JS submissions.
