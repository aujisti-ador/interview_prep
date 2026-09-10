import { ProblemSeed } from './types';

/**
 * The Node/JS practical round.
 *
 * These are the problems that actually appear in Node-backend online
 * assessments and pair-programming screens — far more predictive of the job
 * than another DP problem, and almost nobody drills them. Highest ROI in the
 * whole bank for a Senior/Lead Node role.
 *
 * They use `driver` test mode: a small async script exercises your
 * implementation the way a real reviewer would.
 */
export const nodeProblems: ProblemSeed[] = [
  {
    id: 'implement-promise-all',
    title: 'Implement Promise.all',
    pattern: 'Node Practical',
    difficulty: 'medium',
    week: 1,
    frequency: 5,
    prompt:
      'Implement `myPromiseAll(items)` that behaves like `Promise.all`:\n\n- resolves with an array of results **in input order**, regardless of settle order\n- rejects immediately with the first rejection reason\n- resolves with `[]` for an empty input\n- accepts non-promise values as well as promises',
    functionName: 'myPromiseAll',
    starterCode: 'function myPromiseAll(items) {\n  // your code here\n}',
    hints: [
      'Return a new Promise and resolve it once a counter reaches items.length.',
      'Write results by index — do not push, or the order will follow settle time.',
      'The empty-array case must resolve synchronously-ish, not hang forever. That is the bug interviewers look for.',
    ],
    solution:
      'function myPromiseAll(items) {\n  return new Promise((resolve, reject) => {\n    const results = new Array(items.length);\n    let remaining = items.length;\n    if (remaining === 0) return resolve([]);\n    items.forEach((item, i) => {\n      Promise.resolve(item).then(\n        (value) => {\n          results[i] = value;\n          if (--remaining === 0) resolve(results);\n        },\n        reject,\n      );\n    });\n  });\n}',
    complexity: 'O(n). All promises run concurrently — that is the point of Promise.all.',
    companies: ['Node screens', 'Toptal', 'Proxify'],
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'resolves in input order even when the later promise settles first',
          expected: [1, 2, 3],
          args: [],
          driver: `async (fn) => {
            const slow = new Promise((r) => setTimeout(() => r(1), 30));
            const fast = Promise.resolve(2);
            return await fn([slow, fast, 3]);
          }`,
        },
        {
          note: 'empty input resolves with an empty array',
          expected: [],
          args: [],
          driver: `async (fn) => await fn([])`,
        },
        {
          note: 'rejects with the first rejection reason',
          expected: { __error: 'boom' },
          args: [],
          driver: `async (fn) => {
            const bad = new Promise((_, rej) => setTimeout(() => rej(new Error('boom')), 10));
            return await fn([Promise.resolve(1), bad, 3]);
          }`,
        },
      ],
    },
  },
  {
    id: 'async-pool',
    title: 'Async Pool (concurrency limiter)',
    pattern: 'Node Practical',
    difficulty: 'medium',
    week: 1,
    frequency: 5,
    prompt:
      'Implement `asyncPool(limit, tasks)` where `tasks` is an array of functions returning promises.\n\n- run at most `limit` tasks concurrently\n- resolve with results in the **original task order**\n- start the next task as soon as any slot frees (do not process in fixed batches)\n\nThis is the single most job-relevant problem in the bank: it is exactly what you write when you have to call a rate-limited third-party API 50,000 times.',
    functionName: 'asyncPool',
    starterCode: 'function asyncPool(limit, tasks) {\n  // your code here\n}',
    hints: [
      'Batching with `Promise.all` on chunks of size `limit` is the common wrong answer — a slow task stalls the whole batch.',
      'Spawn `limit` workers that each pull the next index off a shared cursor until the cursor runs out.',
      'Store results by index, not by completion order.',
    ],
    solution:
      'async function asyncPool(limit, tasks) {\n  const results = new Array(tasks.length);\n  let cursor = 0;\n  const worker = async () => {\n    while (cursor < tasks.length) {\n      const i = cursor++;\n      results[i] = await tasks[i]();\n    }\n  };\n  const workers = [];\n  for (let i = 0; i < Math.min(limit, tasks.length); i++) workers.push(worker());\n  await Promise.all(workers);\n  return results;\n}',
    complexity: 'O(n) tasks, never more than `limit` in flight.',
    companies: ['Very common in Node backend screens'],
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'results are in task order and concurrency never exceeds the limit',
          expected: { results: [0, 1, 2, 3, 4, 5], maxConcurrent: 2 },
          args: [],
          driver: `async (fn) => {
            let active = 0, maxConcurrent = 0;
            const delays = [40, 10, 10, 10, 10, 10];
            const tasks = delays.map((d, i) => () => {
              active++;
              maxConcurrent = Math.max(maxConcurrent, active);
              return new Promise((r) => setTimeout(() => { active--; r(i); }, d));
            });
            const results = await fn(2, tasks);
            return { results, maxConcurrent };
          }`,
        },
        {
          note: 'a slow first task must not block later ones from starting',
          expected: { results: ['slow', 'a', 'b'], startedBeforeSlowFinished: true },
          args: [],
          driver: `async (fn) => {
            let slowDone = false;
            let startedBeforeSlowFinished = false;
            const tasks = [
              () => new Promise((r) => setTimeout(() => { slowDone = true; r('slow'); }, 60)),
              () => { if (!slowDone) startedBeforeSlowFinished = true; return Promise.resolve('a'); },
              () => Promise.resolve('b'),
            ];
            const results = await fn(2, tasks);
            return { results, startedBeforeSlowFinished };
          }`,
        },
        {
          note: 'empty task list',
          expected: [],
          args: [],
          driver: `async (fn) => await fn(3, [])`,
        },
      ],
    },
  },
  {
    id: 'retry-with-backoff',
    title: 'Retry with Exponential Backoff',
    pattern: 'Node Practical',
    difficulty: 'medium',
    week: 1,
    frequency: 4,
    prompt:
      'Implement `retry(fn, options)` where `options` is `{ retries, baseMs, factor }`.\n\n- call `fn()`; if it rejects, wait `baseMs * factor^attempt` and try again\n- give up after `retries` retries (so at most `retries + 1` total calls) and reject with the last error\n- resolve immediately on the first success\n\nDefaults: `retries = 3`, `baseMs = 10`, `factor = 2`.',
    functionName: 'retry',
    starterCode: 'function retry(fn, options = {}) {\n  // your code here\n}',
    hints: [
      'A simple loop with `await sleep(delay)` inside a try/catch is cleaner than recursion here.',
      'Off-by-one matters: `retries: 3` means 4 total attempts. State your interpretation out loud.',
      'In production you would add jitter — say so, even if the test does not check it.',
    ],
    solution:
      'function retry(fn, options = {}) {\n  const { retries = 3, baseMs = 10, factor = 2 } = options;\n  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\n  return (async () => {\n    let lastErr;\n    for (let attempt = 0; attempt <= retries; attempt++) {\n      try {\n        return await fn();\n      } catch (err) {\n        lastErr = err;\n        if (attempt === retries) break;\n        await sleep(baseMs * Math.pow(factor, attempt));\n      }\n    }\n    throw lastErr;\n  })();\n}',
    complexity: 'At most retries + 1 calls; total wait is a geometric series.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'succeeds on the third attempt',
          expected: { value: 'ok', calls: 3 },
          args: [],
          driver: `async (fn) => {
            let calls = 0;
            const task = () => {
              calls++;
              return calls < 3 ? Promise.reject(new Error('nope')) : Promise.resolve('ok');
            };
            const value = await fn(task, { retries: 5, baseMs: 1 });
            return { value, calls };
          }`,
        },
        {
          note: 'gives up after retries + 1 total calls and rejects with the last error',
          expected: { calls: 4, message: 'always fails' },
          args: [],
          driver: `async (fn) => {
            let calls = 0;
            const task = () => { calls++; return Promise.reject(new Error('always fails')); };
            try {
              await fn(task, { retries: 3, baseMs: 1 });
              return { calls, message: 'SHOULD HAVE THROWN' };
            } catch (e) {
              return { calls, message: e.message };
            }
          }`,
        },
        {
          note: 'first-try success calls fn exactly once',
          expected: { value: 1, calls: 1 },
          args: [],
          driver: `async (fn) => {
            let calls = 0;
            const value = await fn(() => { calls++; return Promise.resolve(1); }, { retries: 3, baseMs: 1 });
            return { value, calls };
          }`,
        },
      ],
    },
  },
  {
    id: 'debounce',
    title: 'Implement Debounce',
    pattern: 'Node Practical',
    difficulty: 'easy',
    week: 1,
    frequency: 4,
    prompt:
      'Implement `debounce(fn, wait)` returning a function that delays invoking `fn` until `wait` ms have passed since the last call.\n\n- only the last call in a burst should fire\n- the wrapped function must receive the arguments of that last call\n- preserve `this`',
    functionName: 'debounce',
    starterCode: 'function debounce(fn, wait) {\n  // your code here\n}',
    hints: [
      'Store the timer id in a closure and `clearTimeout` it on every call.',
      'Use a regular function (not an arrow) for the returned wrapper so `this` binds correctly.',
      'Know the difference from throttle: debounce fires once after silence; throttle fires at most once per interval.',
    ],
    solution:
      'function debounce(fn, wait) {\n  let timer = null;\n  return function (...args) {\n    if (timer) clearTimeout(timer);\n    timer = setTimeout(() => {\n      timer = null;\n      fn.apply(this, args);\n    }, wait);\n  };\n}',
    complexity: 'O(1) per call.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'a burst of 5 calls fires once, with the last arguments',
          expected: { calls: 1, lastArg: 5 },
          args: [],
          driver: `async (fn) => {
            let calls = 0, lastArg = null;
            const debounced = fn((x) => { calls++; lastArg = x; }, 30);
            for (let i = 1; i <= 5; i++) debounced(i);
            await new Promise((r) => setTimeout(r, 80));
            return { calls, lastArg };
          }`,
        },
        {
          note: 'calls separated by more than the wait each fire',
          expected: { calls: 2 },
          args: [],
          driver: `async (fn) => {
            let calls = 0;
            const debounced = fn(() => { calls++; }, 20);
            debounced();
            await new Promise((r) => setTimeout(r, 60));
            debounced();
            await new Promise((r) => setTimeout(r, 60));
            return { calls };
          }`,
        },
      ],
    },
  },
  {
    id: 'throttle',
    title: 'Implement Throttle',
    pattern: 'Node Practical',
    difficulty: 'easy',
    week: 1,
    frequency: 3,
    prompt:
      'Implement `throttle(fn, interval)` returning a function that invokes `fn` at most once per `interval` ms.\n\n- the first call fires immediately (leading edge)\n- subsequent calls inside the window are dropped',
    functionName: 'throttle',
    starterCode: 'function throttle(fn, interval) {\n  // your code here\n}',
    hints: [
      'Track the timestamp of the last invocation.',
      'Be explicit about leading vs trailing edge behaviour — interviewers will ask which one you implemented and why.',
    ],
    solution:
      'function throttle(fn, interval) {\n  let last = 0;\n  return function (...args) {\n    const now = Date.now();\n    if (now - last >= interval) {\n      last = now;\n      return fn.apply(this, args);\n    }\n  };\n}',
    complexity: 'O(1) per call.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'burst of calls fires once on the leading edge',
          expected: { calls: 1 },
          args: [],
          driver: `async (fn) => {
            let calls = 0;
            const t = fn(() => { calls++; }, 50);
            for (let i = 0; i < 10; i++) t();
            await new Promise((r) => setTimeout(r, 20));
            return { calls };
          }`,
        },
        {
          note: 'fires again after the interval elapses',
          expected: { calls: 2 },
          args: [],
          driver: `async (fn) => {
            let calls = 0;
            const t = fn(() => { calls++; }, 30);
            t();
            await new Promise((r) => setTimeout(r, 60));
            t();
            return { calls };
          }`,
        },
      ],
    },
  },
  {
    id: 'event-emitter',
    title: 'Implement an EventEmitter',
    pattern: 'Node Practical',
    difficulty: 'medium',
    week: 1,
    frequency: 4,
    prompt:
      'Implement a class `EventEmitter` with `on(event, handler)`, `off(event, handler)`, `once(event, handler)` and `emit(event, ...args)`.\n\n- `emit` returns `true` if any handler ran, `false` otherwise\n- `once` handlers fire exactly once and then unsubscribe\n- `off` must remove only the specific handler',
    functionName: 'EventEmitter',
    starterCode:
      'class EventEmitter {\n  constructor() {\n    // your code here\n  }\n  on(event, handler) {}\n  off(event, handler) {}\n  once(event, handler) {}\n  emit(event, ...args) {}\n}',
    hints: [
      'A Map from event name to an array of handlers.',
      'For `once`, wrap the handler and keep a reference to the original so `off` can still find it.',
      'Iterate over a COPY of the handler array in emit — a handler that unsubscribes during emit will otherwise corrupt the iteration.',
    ],
    solution:
      'class EventEmitter {\n  constructor() {\n    this.handlers = new Map();\n  }\n  on(event, handler) {\n    if (!this.handlers.has(event)) this.handlers.set(event, []);\n    this.handlers.get(event).push(handler);\n    return this;\n  }\n  off(event, handler) {\n    const list = this.handlers.get(event);\n    if (!list) return this;\n    const i = list.findIndex((h) => h === handler || h.original === handler);\n    if (i !== -1) list.splice(i, 1);\n    return this;\n  }\n  once(event, handler) {\n    const wrapper = (...args) => {\n      this.off(event, wrapper);\n      handler(...args);\n    };\n    wrapper.original = handler;\n    return this.on(event, wrapper);\n  }\n  emit(event, ...args) {\n    const list = this.handlers.get(event);\n    if (!list || list.length === 0) return false;\n    for (const h of [...list]) h(...args);\n    return true;\n  }\n}',
    complexity: 'O(1) subscribe, O(n) emit and off.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'on / emit / off basics',
          expected: { seen: [1, 2], afterOff: 2, emitted: true, emptyEmit: false },
          args: [],
          driver: `async (Cls) => {
            const em = new Cls();
            const seen = [];
            const h = (x) => seen.push(x);
            em.on('tick', h);
            const emitted = em.emit('tick', 1);
            em.emit('tick', 2);
            em.off('tick', h);
            em.emit('tick', 3);
            const emptyEmit = em.emit('nothing');
            return { seen, afterOff: seen.length, emitted, emptyEmit };
          }`,
        },
        {
          note: 'once fires exactly once and off removes it too',
          expected: { count: 1, removedCount: 0 },
          args: [],
          driver: `async (Cls) => {
            const em = new Cls();
            let count = 0;
            em.once('go', () => { count++; });
            em.emit('go');
            em.emit('go');
            em.emit('go');
            const em2 = new Cls();
            let removedCount = 0;
            const h = () => { removedCount++; };
            em2.once('go', h);
            em2.off('go', h);
            em2.emit('go');
            return { count, removedCount };
          }`,
        },
        {
          note: 'a handler unsubscribing during emit must not break iteration',
          expected: { calls: 2 },
          args: [],
          driver: `async (Cls) => {
            const em = new Cls();
            let calls = 0;
            const a = () => { calls++; em.off('e', a); };
            const b = () => { calls++; };
            em.on('e', a);
            em.on('e', b);
            em.emit('e');
            return { calls };
          }`,
        },
      ],
    },
  },
  {
    id: 'lru-cache',
    title: 'LRU Cache',
    pattern: 'Node Practical',
    difficulty: 'medium',
    week: 2,
    frequency: 5,
    prompt:
      'Implement a class `LRUCache` with `constructor(capacity)`, `get(key)` and `put(key, value)`, both in O(1).\n\n- `get` returns -1 if the key is absent, and marks the key as most recently used\n- `put` evicts the least recently used key when over capacity\n\nAsked constantly, and it is the warm-up before "now design a distributed cache".',
    functionName: 'LRUCache',
    starterCode:
      'class LRUCache {\n  constructor(capacity) {\n    // your code here\n  }\n  get(key) {}\n  put(key, value) {}\n}',
    hints: [
      'Textbook answer: hash map + doubly linked list.',
      'In JavaScript, a `Map` preserves insertion order, so delete-then-set moves a key to the most-recent end. Say you know the linked-list version too.',
      '`map.keys().next().value` gives the least recently used key in O(1).',
    ],
    solution:
      'class LRUCache {\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.map = new Map();\n  }\n  get(key) {\n    if (!this.map.has(key)) return -1;\n    const value = this.map.get(key);\n    this.map.delete(key);\n    this.map.set(key, value);\n    return value;\n  }\n  put(key, value) {\n    if (this.map.has(key)) this.map.delete(key);\n    this.map.set(key, value);\n    if (this.map.size > this.capacity) {\n      this.map.delete(this.map.keys().next().value);\n    }\n  }\n}',
    complexity: 'O(1) get and put, O(capacity) space.',
    companies: ['Extremely common'],
    tests: {
      mode: 'ops',
      cases: [
        {
          ops: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'put', 'get', 'get', 'get'],
          args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]],
          expected: [null, null, null, 1, null, -1, null, -1, 3, 4],
        },
        {
          ops: ['LRUCache', 'put', 'get', 'put', 'get', 'get'],
          args: [[1], [2, 1], [2], [3, 2], [2], [3]],
          expected: [null, null, 1, null, -1, 2],
        },
      ],
    },
  },
  {
    id: 'token-bucket-limiter',
    title: 'Token Bucket Rate Limiter',
    pattern: 'Node Practical',
    difficulty: 'medium',
    week: 2,
    frequency: 4,
    prompt:
      'Implement a class `TokenBucket` with `constructor(capacity, refillPerSecond)` and `tryConsume(tokens = 1, now = Date.now())` returning `true` if the request is allowed.\n\n- the bucket starts full\n- tokens refill continuously at `refillPerSecond`, capped at `capacity`\n- `now` is injectable so the behaviour is testable without sleeping\n\nThis is the exact algorithm behind API rate limiting — expect a follow-up asking how you would make it distributed with Redis.',
    functionName: 'TokenBucket',
    starterCode:
      'class TokenBucket {\n  constructor(capacity, refillPerSecond) {\n    // your code here\n  }\n  tryConsume(tokens = 1, now = Date.now()) {}\n}',
    hints: [
      'Do not run a timer. Lazily compute refill from the elapsed time on each call — that is what makes it cheap and distributable.',
      'Clamp the token count to capacity after refilling, and never let it go negative.',
      'Distributed version: a Lua script in Redis doing this same arithmetic atomically.',
    ],
    solution:
      'class TokenBucket {\n  constructor(capacity, refillPerSecond) {\n    this.capacity = capacity;\n    this.rate = refillPerSecond;\n    this.tokens = capacity;\n    this.last = null;\n  }\n  tryConsume(tokens = 1, now = Date.now()) {\n    if (this.last === null) this.last = now;\n    const elapsed = Math.max(0, now - this.last) / 1000;\n    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);\n    this.last = now;\n    if (this.tokens >= tokens) {\n      this.tokens -= tokens;\n      return true;\n    }\n    return false;\n  }\n}',
    complexity: 'O(1) per request, O(1) state per key.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'burst up to capacity is allowed, then denied',
          expected: [true, true, true, false],
          args: [],
          driver: `async (Cls) => {
            const b = new Cls(3, 1);
            const t = 1000;
            return [b.tryConsume(1, t), b.tryConsume(1, t), b.tryConsume(1, t), b.tryConsume(1, t)];
          }`,
        },
        {
          note: 'refills over time, capped at capacity',
          expected: { afterWait: true, capped: [true, true, false] },
          args: [],
          driver: `async (Cls) => {
            const b = new Cls(2, 2);
            b.tryConsume(2, 0);
            const afterWait = b.tryConsume(1, 1000);
            const b2 = new Cls(2, 100);
            b2.tryConsume(2, 0);
            const capped = [b2.tryConsume(1, 10000), b2.tryConsume(1, 10000), b2.tryConsume(1, 10000)];
            return { afterWait, capped };
          }`,
        },
      ],
    },
  },
  {
    id: 'promise-with-timeout',
    title: 'Promise with Timeout',
    pattern: 'Node Practical',
    difficulty: 'easy',
    week: 2,
    frequency: 4,
    prompt:
      'Implement `withTimeout(promise, ms, message = "Timeout")` that resolves with the promise\'s value if it settles in time, and rejects with `new Error(message)` otherwise.\n\nAlso clear the timer when the promise wins, so the process can exit — the detail that separates a careful answer from a sloppy one.',
    functionName: 'withTimeout',
    starterCode: 'function withTimeout(promise, ms, message = "Timeout") {\n  // your code here\n}',
    hints: [
      '`Promise.race` between the real promise and a rejecting timer.',
      'Keep the timer handle and clear it in a `finally` — a dangling timer keeps the Node event loop alive.',
      'Note out loud that this does not cancel the underlying work; it only stops waiting. Real cancellation needs AbortController.',
    ],
    solution:
      'function withTimeout(promise, ms, message = "Timeout") {\n  let timer;\n  const timeout = new Promise((_, reject) => {\n    timer = setTimeout(() => reject(new Error(message)), ms);\n  });\n  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));\n}',
    complexity: 'O(1).',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'fast promise wins',
          expected: 'fast',
          args: [],
          driver: `async (fn) => await fn(Promise.resolve('fast'), 50)`,
        },
        {
          note: 'slow promise times out with the given message',
          expected: 'too slow',
          args: [],
          driver: `async (fn) => {
            const slow = new Promise((r) => setTimeout(() => r('late'), 200));
            try {
              await fn(slow, 20, 'too slow');
              return 'SHOULD HAVE THROWN';
            } catch (e) {
              return e.message;
            }
          }`,
        },
      ],
    },
  },
  {
    id: 'deep-clone',
    title: 'Deep Clone',
    pattern: 'Node Practical',
    difficulty: 'medium',
    week: 2,
    frequency: 3,
    prompt:
      'Implement `deepClone(value)` producing a deep copy.\n\n- handle plain objects, arrays, `Date`, `Map`, `Set` and primitives\n- handle circular references without blowing the stack',
    functionName: 'deepClone',
    starterCode: 'function deepClone(value) {\n  // your code here\n}',
    hints: [
      '`JSON.parse(JSON.stringify(x))` loses Dates, Maps, Sets, undefined and functions, and dies on cycles. Name those failure modes even if you then use it.',
      'A `WeakMap` from original -> clone handles cycles. Register the clone before recursing into children.',
      'Modern answer: `structuredClone`. Mention it, then implement by hand anyway.',
    ],
    solution:
      'function deepClone(value, seen = new WeakMap()) {\n  if (value === null || typeof value !== "object") return value;\n  if (seen.has(value)) return seen.get(value);\n  if (value instanceof Date) return new Date(value.getTime());\n  if (value instanceof Map) {\n    const out = new Map();\n    seen.set(value, out);\n    for (const [k, v] of value) out.set(deepClone(k, seen), deepClone(v, seen));\n    return out;\n  }\n  if (value instanceof Set) {\n    const out = new Set();\n    seen.set(value, out);\n    for (const v of value) out.add(deepClone(v, seen));\n    return out;\n  }\n  const out = Array.isArray(value) ? [] : {};\n  seen.set(value, out);\n  for (const key of Object.keys(value)) out[key] = deepClone(value[key], seen);\n  return out;\n}',
    complexity: 'O(n) in the number of nodes.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'deep structures are copied, not shared',
          expected: { equal: true, independent: true, dateOk: true },
          args: [],
          driver: `async (fn) => {
            const src = { a: 1, b: { c: [1, 2, { d: 3 }] }, when: new Date(0) };
            const copy = fn(src);
            const equal = JSON.stringify(copy) === JSON.stringify(src);
            copy.b.c[2].d = 99;
            const independent = src.b.c[2].d === 3;
            const dateOk = copy.when instanceof Date && copy.when.getTime() === 0 && copy.when !== src.when;
            return { equal, independent, dateOk };
          }`,
        },
        {
          note: 'Map, Set and circular references',
          expected: { mapOk: true, setOk: true, circularOk: true },
          args: [],
          driver: `async (fn) => {
            const m = new Map([['k', { v: 1 }]]);
            const s = new Set([1, 2, 3]);
            const copyM = fn(m);
            const copyS = fn(s);
            const mapOk = copyM instanceof Map && copyM.get('k').v === 1 && copyM.get('k') !== m.get('k');
            const setOk = copyS instanceof Set && copyS.size === 3;
            const cyc = { name: 'root' };
            cyc.self = cyc;
            const copyC = fn(cyc);
            const circularOk = copyC.self === copyC && copyC !== cyc;
            return { mapOk, setOk, circularOk };
          }`,
        },
      ],
    },
  },
  {
    id: 'deep-equal',
    title: 'Deep Equal',
    pattern: 'Node Practical',
    difficulty: 'medium',
    week: 2,
    frequency: 3,
    prompt:
      'Implement `deepEqual(a, b)` returning `true` if two values are structurally equal.\n\nHandle nested objects and arrays, `NaN === NaN` should be `true`, and `{a: 1}` must not equal `{a: 1, b: 2}`.',
    functionName: 'deepEqual',
    starterCode: 'function deepEqual(a, b) {\n  // your code here\n}',
    hints: [
      'Start with `Object.is` to cover NaN and -0 correctly.',
      'Compare key counts before comparing values, or missing keys slip through.',
      'Arrays and objects need separate handling — an array and an object with numeric keys are not equal.',
    ],
    solution:
      'function deepEqual(a, b) {\n  if (Object.is(a, b)) return true;\n  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;\n  if (Array.isArray(a) !== Array.isArray(b)) return false;\n  const ka = Object.keys(a), kb = Object.keys(b);\n  if (ka.length !== kb.length) return false;\n  for (const k of ka) {\n    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;\n    if (!deepEqual(a[k], b[k])) return false;\n  }\n  return true;\n}',
    complexity: 'O(n) in the number of nodes.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'nested equality, NaN, and extra keys',
          expected: [true, true, false, false, true, false],
          args: [],
          driver: `async (fn) => [
            fn({ a: 1, b: [1, 2, { c: 3 }] }, { a: 1, b: [1, 2, { c: 3 }] }),
            fn(NaN, NaN),
            fn({ a: 1 }, { a: 1, b: 2 }),
            fn([1, 2], [2, 1]),
            fn(null, null),
            fn({ a: 1 }, null),
          ]`,
        },
      ],
    },
  },
  {
    id: 'memoize',
    title: 'Memoize with a Custom Key',
    pattern: 'Node Practical',
    difficulty: 'easy',
    week: 2,
    frequency: 3,
    prompt:
      'Implement `memoize(fn, keyFn)` caching results by key.\n\n- default key is `JSON.stringify(args)`\n- a cached call must not invoke `fn` again\n- expose `cache` on the returned function so it can be inspected or cleared',
    functionName: 'memoize',
    starterCode: 'function memoize(fn, keyFn) {\n  // your code here\n}',
    hints: [
      'A `Map` in a closure, and attach it to the wrapper as `.cache`.',
      'Use `cache.has(key)` rather than truthiness — otherwise cached `undefined`, `0` and `""` re-execute.',
      'Real-world follow-up: unbounded memoisation is a memory leak. Mention TTL or an LRU bound.',
    ],
    solution:
      'function memoize(fn, keyFn) {\n  const cache = new Map();\n  const wrapped = function (...args) {\n    const key = keyFn ? keyFn(...args) : JSON.stringify(args);\n    if (cache.has(key)) return cache.get(key);\n    const value = fn.apply(this, args);\n    cache.set(key, value);\n    return value;\n  };\n  wrapped.cache = cache;\n  return wrapped;\n}',
    complexity: 'O(1) lookup; memory grows with distinct keys.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'caches by argument list and does not re-invoke',
          expected: { results: [3, 3, 7], calls: 2, cacheSize: 2 },
          args: [],
          driver: `async (fn) => {
            let calls = 0;
            const add = (a, b) => { calls++; return a + b; };
            const m = fn(add);
            const results = [m(1, 2), m(1, 2), m(3, 4)];
            return { results, calls, cacheSize: m.cache.size };
          }`,
        },
        {
          note: 'cached falsy values are not recomputed',
          expected: { calls: 1, value: 0 },
          args: [],
          driver: `async (fn) => {
            let calls = 0;
            const m = fn(() => { calls++; return 0; });
            m();
            const value = m();
            return { calls, value };
          }`,
        },
      ],
    },
  },
  {
    id: 'flatten-object',
    title: 'Flatten a Nested Object',
    pattern: 'Node Practical',
    difficulty: 'easy',
    week: 2,
    frequency: 3,
    prompt:
      'Implement `flattenObject(obj, prefix = "")` turning `{ a: { b: { c: 1 } }, d: 2 }` into `{ "a.b.c": 1, "d": 2 }`.\n\nArrays should be indexed: `{ a: [1, 2] }` becomes `{ "a.0": 1, "a.1": 2 }`. Empty objects and `null` values are kept as leaves.',
    functionName: 'flattenObject',
    starterCode: 'function flattenObject(obj, prefix = "") {\n  // your code here\n}',
    hints: [
      'Recurse, building the path as you descend.',
      'Treat `null` as a leaf — `typeof null === "object"` is the classic trap.',
      'Decide explicitly what an empty object should do, and say your choice out loud.',
    ],
    solution:
      'function flattenObject(obj, prefix = "") {\n  const out = {};\n  for (const key of Object.keys(obj)) {\n    const value = obj[key];\n    const path = prefix ? prefix + "." + key : key;\n    if (value !== null && typeof value === "object" && Object.keys(value).length > 0) {\n      Object.assign(out, flattenObject(value, path));\n    } else {\n      out[path] = value;\n    }\n  }\n  return out;\n}',
    complexity: 'O(n) in the number of leaves.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'nested objects, arrays, nulls',
          expected: { 'a.b.c': 1, d: 2, 'e.0': 'x', 'e.1': 'y', f: null },
          args: [],
          driver: `async (fn) => fn({ a: { b: { c: 1 } }, d: 2, e: ['x', 'y'], f: null })`,
        },
        {
          note: 'flat object is unchanged',
          expected: { a: 1, b: 2 },
          args: [],
          driver: `async (fn) => fn({ a: 1, b: 2 })`,
        },
      ],
    },
  },
  {
    id: 'idempotency-store',
    title: 'Idempotent Request Handler',
    pattern: 'Node Practical',
    difficulty: 'medium',
    week: 3,
    frequency: 4,
    prompt:
      'Implement a class `IdempotencyStore` with `async run(key, handler)`:\n\n- the first call for a key executes `handler()` and caches the result\n- repeat calls with the same key return the cached result **without** re-running the handler\n- **concurrent** calls with the same key must share one in-flight execution, not run twice\n- if the handler throws, the key is released so a later retry can succeed\n\nThis is the payment-API idempotency-key pattern in miniature, and a superb thing to have ready for a fintech interview.',
    functionName: 'IdempotencyStore',
    starterCode:
      'class IdempotencyStore {\n  constructor() {\n    // your code here\n  }\n  async run(key, handler) {}\n}',
    hints: [
      'Cache the PROMISE, not the resolved value — that is what makes concurrent callers share one execution.',
      'On rejection, delete the key so the failure is not cached forever.',
      'In production this map is Redis with a TTL, and the "in flight" state is a SET NX lock.',
    ],
    solution:
      'class IdempotencyStore {\n  constructor() {\n    this.inflight = new Map();\n  }\n  async run(key, handler) {\n    if (this.inflight.has(key)) return this.inflight.get(key);\n    const promise = (async () => handler())().catch((err) => {\n      this.inflight.delete(key);\n      throw err;\n    });\n    this.inflight.set(key, promise);\n    return promise;\n  }\n}',
    complexity: 'O(1) per key.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'concurrent calls with the same key run the handler once',
          expected: { calls: 1, results: ['done', 'done', 'done'] },
          args: [],
          driver: `async (Cls) => {
            const store = new Cls();
            let calls = 0;
            const handler = () => {
              calls++;
              return new Promise((r) => setTimeout(() => r('done'), 30));
            };
            const results = await Promise.all([
              store.run('k1', handler),
              store.run('k1', handler),
              store.run('k1', handler),
            ]);
            return { calls, results };
          }`,
        },
        {
          note: 'different keys run independently; a failed key can be retried',
          expected: { calls: 2, second: 'ok', failThenSucceed: 'recovered' },
          args: [],
          driver: `async (Cls) => {
            const store = new Cls();
            let calls = 0;
            const h = () => { calls++; return Promise.resolve('ok'); };
            await store.run('a', h);
            const second = await store.run('b', h);
            let attempt = 0;
            const flaky = () => {
              attempt++;
              return attempt === 1 ? Promise.reject(new Error('nope')) : Promise.resolve('recovered');
            };
            try { await store.run('c', flaky); } catch (e) { /* expected */ }
            const failThenSucceed = await store.run('c', flaky);
            return { calls, second, failThenSucceed };
          }`,
        },
      ],
    },
  },
  {
    id: 'group-by',
    title: 'Group By',
    pattern: 'Node Practical',
    difficulty: 'easy',
    week: 3,
    frequency: 3,
    prompt:
      'Implement `groupBy(items, keySelector)` where `keySelector` is either a property name (string) or a function. Return a plain object mapping key -> array of items, preserving input order within each group.',
    functionName: 'groupBy',
    starterCode: 'function groupBy(items, keySelector) {\n  // your code here\n}',
    hints: ['Normalise the selector to a function first — it removes the branching from the loop.', 'Use `Object.create(null)` if you want to avoid prototype-key collisions like "constructor".'],
    solution:
      'function groupBy(items, keySelector) {\n  const fn = typeof keySelector === "function" ? keySelector : (item) => item[keySelector];\n  const out = {};\n  for (const item of items) {\n    const key = fn(item);\n    if (!out[key]) out[key] = [];\n    out[key].push(item);\n  }\n  return out;\n}',
    complexity: 'O(n) time and space.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'group by property name',
          expected: { bd: [{ id: 1, market: 'bd' }, { id: 3, market: 'bd' }], eu: [{ id: 2, market: 'eu' }] },
          args: [],
          driver: `async (fn) => fn([{ id: 1, market: 'bd' }, { id: 2, market: 'eu' }, { id: 3, market: 'bd' }], 'market')`,
        },
        {
          note: 'group by function',
          expected: { even: [2, 4], odd: [1, 3, 5] },
          args: [],
          driver: `async (fn) => fn([1, 2, 3, 4, 5], (n) => (n % 2 === 0 ? 'even' : 'odd'))`,
        },
      ],
    },
  },
  {
    id: 'batch-processor',
    title: 'Batching Queue',
    pattern: 'Node Practical',
    difficulty: 'medium',
    week: 3,
    frequency: 3,
    prompt:
      'Implement a class `Batcher` with `constructor(flushFn, { maxSize, maxWaitMs })` and `add(item)`.\n\n- flush when `maxSize` items have accumulated\n- flush after `maxWaitMs` since the first item of the current batch, even if not full\n- `flushFn(items)` receives the batch array\n\nThis is the shape of every efficient writer you will build: bulk DB inserts, Kafka producer batching, CloudWatch metric puts.',
    functionName: 'Batcher',
    starterCode:
      'class Batcher {\n  constructor(flushFn, options = {}) {\n    // your code here\n  }\n  add(item) {}\n}',
    hints: [
      'Start the timer when the batch goes from empty to non-empty, not on every add.',
      'Always clear the timer when you flush for size, or you get a spurious empty flush.',
      'Extract the buffer BEFORE calling flushFn so items added during the flush go into the next batch.',
    ],
    solution:
      'class Batcher {\n  constructor(flushFn, options = {}) {\n    this.flushFn = flushFn;\n    this.maxSize = options.maxSize || 10;\n    this.maxWaitMs = options.maxWaitMs || 100;\n    this.buffer = [];\n    this.timer = null;\n  }\n  flush() {\n    if (this.timer) { clearTimeout(this.timer); this.timer = null; }\n    if (this.buffer.length === 0) return;\n    const batch = this.buffer;\n    this.buffer = [];\n    this.flushFn(batch);\n  }\n  add(item) {\n    this.buffer.push(item);\n    if (this.buffer.length >= this.maxSize) {\n      this.flush();\n      return;\n    }\n    if (!this.timer) {\n      this.timer = setTimeout(() => this.flush(), this.maxWaitMs);\n    }\n  }\n}',
    complexity: 'O(1) per add, one timer per batch.',
    tests: {
      mode: 'driver',
      cases: [
        {
          note: 'flushes on size',
          expected: [[1, 2, 3]],
          args: [],
          driver: `async (Cls) => {
            const batches = [];
            const b = new Cls((items) => batches.push(items), { maxSize: 3, maxWaitMs: 1000 });
            b.add(1); b.add(2); b.add(3);
            return batches;
          }`,
        },
        {
          note: 'flushes on time when not full',
          expected: [['a', 'b']],
          args: [],
          driver: `async (Cls) => {
            const batches = [];
            const b = new Cls((items) => batches.push(items), { maxSize: 10, maxWaitMs: 30 });
            b.add('a'); b.add('b');
            await new Promise((r) => setTimeout(r, 80));
            return batches;
          }`,
        },
        {
          note: 'a size flush cancels the pending timer (no empty flush follows)',
          expected: { batches: [[1, 2]], count: 1 },
          args: [],
          driver: `async (Cls) => {
            const batches = [];
            const b = new Cls((items) => batches.push(items), { maxSize: 2, maxWaitMs: 20 });
            b.add(1); b.add(2);
            await new Promise((r) => setTimeout(r, 60));
            return { batches, count: batches.length };
          }`,
        },
      ],
    },
  },
];
