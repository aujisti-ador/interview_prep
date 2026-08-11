# MCQ Bank — Node.js, NestJS, APIs & Backend

> **Format:** TestGorilla "Node.js", iMocha "Node.js/REST API", HackerRank MCQ section, Mettl technical section, Turing skill tests.
> **Budget:** 45 seconds per question. These are the questions that decide whether a human ever reads your CV.
> **Deep-dive companions:** [Node.js Fundamentals](../phase-1-core-programming/02-nodejs-fundamentals.md) · [NestJS Mastery](../phase-1-core-programming/03-nestjs-mastery.md) · [REST API Best Practices](../phase-2-apis-realtime-systems/02-rest-api-best-practices.md)

## Sections
1. [Node.js Runtime & Event Loop](#1-nodejs-runtime--event-loop) (Q1–Q12)
2. [Streams, Buffers & Files](#2-streams-buffers--files) (Q13–Q20)
3. [Processes, Clustering & Scaling](#3-processes-clustering--scaling) (Q21–Q28)
4. [npm, Modules & Packaging](#4-npm-modules--packaging) (Q29–Q36)
5. [HTTP & REST API Design](#5-http--rest-api-design) (Q37–Q50)
6. [Auth & Security](#6-auth--security) (Q51–Q60)
7. [NestJS](#7-nestjs) (Q61–Q70)
8. [Data, Caching & Messaging](#8-data-caching--messaging) (Q71–Q78)
9. [Testing](#9-testing) (Q79–Q84)
10. [Answer-Speed Drill](#answer-speed-drill)

---

## In 60 seconds — how to use this bank

1. **This is the bank that maps most directly to the job**, and to the HackerRank Node.js
   certification worth putting on your CV.
2. **The recurring theme is: what blocks, and what does not.** Anything CPU-heavy blocks
   everything. File I/O uses a 4-thread pool. Network I/O does not use threads at all.
3. **HTTP semantics questions are free points if you know two things:** which methods are
   idempotent (`GET`, `PUT`, `DELETE` — not `POST`), and what each status code actually means.
4. **Security questions cluster around a few items:** bcrypt not SHA for passwords, JWTs cannot
   be revoked, parameterised queries stop SQL injection, and `helmet` sets the headers.
5. **NestJS questions are almost always about the pipeline order** — Middleware → Guard →
   Interceptor → Pipe → Handler — and which one you should use for a given job.
6. **Isolation levels and caching strategies** show up more than people expect. `READ COMMITTED`
   is the Postgres default, and cache-aside is the default caching pattern.

**Where to spend your time:** the streams and event-loop sections. They are the highest
concentration of questions that a Node-focused test actually asks, and the deep-dive round
follows up on the same material.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **libuv** | The C library giving Node its event loop and async I/O |
| **Thread pool** | 4 background threads used for file I/O, DNS and crypto |
| **Blocking** | Occupying the single thread so nothing else can be served |
| **Stream** | Data handled in pieces instead of all at once |
| **Backpressure** | A slow consumer telling a fast producer to wait |
| **Cluster** | Several copies of your app, one per CPU core |
| **Worker thread** | A real thread for CPU-heavy work |
| **Idempotent** | Doing it twice has the same effect as once |
| **Status code** | `400` malformed · `401` unknown · `403` forbidden · `409` conflict · `422` invalid |
| **JWT** | A signed token. Readable by anyone, cannot be revoked before expiry |
| **bcrypt** | A deliberately slow password hash. Slow is the feature |
| **SQL injection** | Input treated as SQL. Fixed with parameterised queries |
| **CORS** | The browser rule deciding which origins may call your API |
| **Middleware / Guard / Interceptor / Pipe** | The four NestJS pipeline stages, in that order |
| **DI** | Dependency Injection — the framework supplies what your class asks for |
| **Isolation level** | How much of other transactions you can see |
| **Cache-aside** | Check cache → miss → read database → write back to cache |
| **Semver** | `MAJOR.MINOR.PATCH`. `^1.2.3` allows minor updates, `~1.2.3` only patches |

---

## 1. Node.js Runtime & Event Loop

**Q1.** Which is the correct order of Node event loop phases?
A) timers → poll → check → close
B) timers → pending callbacks → idle/prepare → poll → check → close callbacks
C) poll → timers → check → close
D) microtasks → timers → poll

<details><summary>Answer</summary>

**B.** `setTimeout`/`setInterval` fire in **timers**, I/O callbacks in **poll**, `setImmediate` in **check**, `socket.on('close')` in **close callbacks**. `process.nextTick` and promise microtasks drain **between every phase transition**, not in a phase of their own.
</details>

---

**Q2.** Node.js is single-threaded. True or false?
A) True — everything runs on one thread
B) False — JS executes on one thread, but libuv maintains a thread pool and there are additional internal threads

<details><summary>Answer</summary>

**B.** Your JavaScript runs on a single thread; **libuv's thread pool (default 4 threads)** handles `fs`, `dns.lookup`, `crypto` (pbkdf2/scrypt/randomBytes), and `zlib`. Network I/O uses the OS event notification mechanism (epoll/kqueue/IOCP), **not** the thread pool.

Tune with `UV_THREADPOOL_SIZE` (max 1024). Symptom of exhaustion: unrelated `fs` reads queueing behind `bcrypt` hashes.
</details>

---

**Q3.** Which of these runs on the libuv thread pool? *(Select all.)*
`fs.readFile`, `http.get`, `crypto.pbkdf2`, `dns.lookup`, `dns.resolve`, `zlib.gzip`, `net.connect`

<details><summary>Answer</summary>

**Thread pool:** `fs.readFile`, `crypto.pbkdf2`, `dns.lookup`, `zlib.gzip`.
**Kernel async I/O (not the pool):** `http.get`, `net.connect`, `dns.resolve` (uses c-ares directly).

`dns.lookup` vs `dns.resolve` is the classic gotcha — `lookup` calls `getaddrinfo`, which is blocking, hence the pool.
</details>

---

**Q4.** What breaks if you run a 5-second synchronous loop in a request handler?
A) Only that request is slow
B) Every request on that process is blocked, including health checks
C) Node spawns another thread
D) It throws a timeout

<details><summary>Answer</summary>**B.** The event loop is blocked, so all concurrent requests, timers, and health checks stall — the orchestrator may then kill the pod, causing a cascade. Move CPU work to `worker_threads`, a queue, or a separate service.</details>

---

**Q5.** What is printed?
```javascript
process.nextTick(() => console.log('tick'));
Promise.resolve().then(() => console.log('promise'));
setImmediate(() => console.log('immediate'));
```
<details><summary>Answer</summary>**`tick`, `promise`, `immediate`.** The nextTick queue is drained before the promise microtask queue; both drain before the loop advances to the check phase.</details>

---

**Q6.** What's dangerous about recursive `process.nextTick`?
<details><summary>Answer</summary>**Event loop starvation.** The nextTick queue is fully drained before the loop can advance, so infinite recursion never yields to I/O — the process appears alive but serves nothing. `setImmediate` recursion is safe because it yields one loop turn per call.</details>

---

**Q7.** Default max listeners on an `EventEmitter` before Node warns?
A) 5  B) 10  C) 100  D) Unlimited

<details><summary>Answer</summary>**B) 10** — emits `MaxListenersExceededWarning`, a deliberate memory-leak detector. Raise with `emitter.setMaxListeners(n)` only when the count is genuinely expected; otherwise find the missing `removeListener`.</details>

---

**Q8.** What happens to an `'error'` event on an EventEmitter with no listener?
A) Silently ignored  B) Logged  C) Thrown as an uncaught exception, crashing the process  D) Queued

<details><summary>Answer</summary>**C.** `'error'` is special-cased: with no handler it throws. This is why every stream and socket needs an `.on('error')` handler.</details>

---

**Q9.** Correct order of graceful shutdown steps?
<details><summary>Answer</summary>

1. Trap `SIGTERM`
2. Fail the **readiness** probe so the load balancer stops sending new traffic
3. `server.close()` — stop accepting new connections, let in-flight requests finish
4. Drain queue consumers / stop polling
5. Close DB pools, Redis, Kafka producers (flush!)
6. Force-exit on a timer (e.g. 15–30 s) so a hung connection can't block forever

Missing steps 2 and 6 is the most common production defect this question is probing for.
</details>

---

**Q10.** What is the difference between `uncaughtException` and `unhandledRejection`?
<details><summary>Answer</summary>

`uncaughtException` — a synchronous throw escaped all try/catch. The process is in an **undefined state**; log and exit, don't "recover".
`unhandledRejection` — a promise rejected with no `.catch`. **Since Node 15 this terminates the process by default** (`--unhandled-rejections=throw`).

Both are last-resort telemetry hooks, not error-handling strategies.
</details>

---

**Q11.** Which flag controls V8's old-space heap limit?
A) `--max-heap`  B) `--max-old-space-size`  C) `--memory-limit`  D) `NODE_MEMORY`

<details><summary>Answer</summary>**B) `--max-old-space-size=<MB>`.** Crucially, **Node does not see the container's memory limit by default** — a 512 MB pod running a Node process that thinks it has host RAM gets OOM-killed by the kernel with no V8 heap error. Set it explicitly in containers.</details>

---

**Q12.** Which tools would you use to find a memory leak in production Node? *(Select all.)*
A) Heap snapshots via `--inspect` / `v8.writeHeapSnapshot()`
B) `process.memoryUsage()` trended over time
C) `clinic doctor` / `clinic heapprofiler`
D) `console.log` in every function

<details><summary>Answer</summary>**A, B, C.** The methodology: trend `heapUsed` + `rss`, take **two snapshots at different times under load**, and compare retained size by constructor. Usual culprits: unbounded caches/Maps, listeners never removed, closures held by long-lived timers, and global arrays used as buffers.</details>

---

## 2. Streams, Buffers & Files

**Q13.** The four stream types are:
<details><summary>Answer</summary>**Readable, Writable, Duplex, Transform.** (Transform is a Duplex where output is derived from input — `zlib.createGzip()`, `crypto.createCipheriv()`.)</details>

---

**Q14.** What does `writable.write(chunk)` returning `false` mean?
A) The write failed
B) The internal buffer exceeded `highWaterMark` — you should stop writing until `'drain'`
C) The stream is closed
D) The chunk was invalid

<details><summary>Answer</summary>**B — backpressure.** Ignoring it lets the buffer grow without bound until the process OOMs. `pipe()`/`pipeline()` handle this for you, which is the main reason to prefer them over manual `write` loops.</details>

---

**Q15.** Why prefer `stream.pipeline()` over `a.pipe(b).pipe(c)`?
<details><summary>Answer</summary>

`pipe()` does **not** forward errors or destroy the remaining streams on failure — a failed source leaves the destination open, leaking file descriptors and sockets. `pipeline()` (and `pipeline` from `node:stream/promises`) propagates errors, destroys every stream, and gives you a single callback/await point.
</details>

---

**Q16.** Reading a 4 GB file: `fs.readFile` vs a read stream?
<details><summary>Answer</summary>**`fs.readFile` buffers the whole file into memory** — it will exceed the Buffer max length and/or OOM the process. Stream it (`createReadStream`) so memory stays at `highWaterMark` (64 KB default). This is a standard senior-screen question, often phrased as "how do you process a large CSV upload".</details>

---

**Q17.** `Buffer.alloc(n)` vs `Buffer.allocUnsafe(n)`?
<details><summary>Answer</summary>**`alloc` zero-fills; `allocUnsafe` doesn't** — it can return memory containing fragments of previously freed data (an information-disclosure risk if you send it anywhere). `allocUnsafe` is faster and safe only if you overwrite the whole buffer immediately.</details>

---

**Q18.** Which encoding is correct for binary-safe transport in JSON?
A) `utf8`  B) `base64`  C) `ascii`  D) `latin1`

<details><summary>Answer</summary>**B) `base64`** (or `base64url` for URLs/JWTs). `utf8` mangles arbitrary bytes because invalid sequences become the replacement character.</details>

---

**Q19.** What's wrong with this?
```javascript
const data = fs.readFileSync('./config.json');
app.get('/x', (req, res) => res.json(JSON.parse(fs.readFileSync('./config.json'))));
```
<details><summary>Answer</summary>**The second one blocks the event loop on every request.** Sync I/O at startup (line 1) is fine and often preferable; sync I/O inside a request handler is not. Use the cached value, or `fs.promises.readFile`.</details>

---

**Q20.** How do you consume an async iterator over a stream?
<details><summary>Answer</summary>

```javascript
for await (const chunk of readable) { /* ... */ }
```
Node streams are async iterables. This gives you natural backpressure and `try/catch` error handling — the cleanest way to process line-by-line with `readline.createInterface({ input })`.
</details>

---

## 3. Processes, Clustering & Scaling

**Q21.** `cluster` vs `worker_threads` — which for CPU-bound work in one service?
<details><summary>Answer</summary>

- **`cluster`**: multiple **processes**, each with its own V8 heap and event loop, sharing a listening socket. Use it to use all CPU cores for *request throughput*. No shared memory; IPC is message-passing.
- **`worker_threads`**: multiple **threads** in one process, sharing memory via `SharedArrayBuffer`/`MessagePort`. Use it for CPU-bound work (image resize, crypto, parsing) without spawning full processes.

In Kubernetes, the usual answer is **neither** — run one process per container and scale pods, so the scheduler owns the resource accounting.
</details>

---

**Q22.** `child_process.spawn` vs `exec` vs `fork`?
<details><summary>Answer</summary>

- `spawn` — streams stdout/stderr, no shell by default, no output size limit. **Default choice.**
- `exec` — runs through a shell and buffers all output (`maxBuffer`, default 1 MB → truncation errors). Shell invocation makes it **command-injection-prone** with user input.
- `fork` — spawns another Node process with an IPC channel (`process.send`).
</details>

---

**Q23.** How does `cluster` distribute connections on Linux by default?
A) OS decides (thundering herd)  B) Round-robin by the primary process  C) Random  D) Least connections

<details><summary>Answer</summary>**B) Round-robin** — the primary accepts and hands off (`SCHED_RR`, the default everywhere except Windows). The alternative, `SCHED_NONE`, lets the OS decide and produces badly skewed distribution.</details>

---

**Q24.** What breaks when you scale a Socket.io app from 1 to 3 instances?
<details><summary>Answer</summary>

In-memory room/socket state is **per-instance**, so a message emitted on instance A never reaches a client connected to instance B. Fixes: the **Redis adapter** (pub/sub fan-out across instances) plus **sticky sessions** at the load balancer for the HTTP long-polling handshake (or force `transports: ['websocket']`).

See [Real-Time Systems & Agora](../phase-2-apis-realtime-systems/03-realtime-systems-agora.md).
</details>

---

**Q25.** Where should you store session state in a horizontally scaled Node service?
A) In-process memory  B) Redis or another shared store  C) In a global variable  D) On the filesystem

<details><summary>Answer</summary>**B.** Anything else breaks the moment there's more than one replica or a pod restarts. Stateless services + externalised state is the whole scaling premise.</details>

---

**Q26.** What is a "cold start" and which of these worsen it? *(Select all.)*
A) Large deployment bundle  B) VPC-attached Lambda (historically)  C) Heavy top-level imports  D) Provisioned concurrency

<details><summary>Answer</summary>**A, B, C.** D (**provisioned concurrency**) *reduces* cold starts by keeping initialised environments warm. Also relevant: initialise DB clients **outside** the handler so they're reused across invocations.</details>

---

**Q27.** Why is a traditional connection pool a problem with Lambda + RDS?
<details><summary>Answer</summary>**Each concurrent execution environment holds its own pool** — 500 concurrent Lambdas × 10 connections exhausts Postgres's `max_connections` (often ~100–500). Fixes: RDS Proxy, a pool size of 1 per environment, or a serverless-friendly datastore (DynamoDB, Aurora Serverless Data API).</details>

---

**Q28.** Which signal does Kubernetes send first when terminating a pod, and what's your handler's job?
<details><summary>Answer</summary>**`SIGTERM`**, followed by `SIGKILL` after `terminationGracePeriodSeconds` (default 30 s). Your handler must fail readiness, drain, and exit before the grace period — see Q9. `SIGKILL` cannot be trapped.</details>

---

## 4. npm, Modules & Packaging

**Q29.** In `"express": "^4.18.2"`, what does `^` allow?
A) Any version  B) Patch only (4.18.x)  C) Minor and patch (4.x.x, `<5.0.0`)  D) Exactly 4.18.2

<details><summary>Answer</summary>

**C.** `^` = compatible-with-major → `>=4.18.2 <5.0.0`. `~4.18.2` = patch only → `>=4.18.2 <4.19.0`. No prefix = exact.

Caveat: for `0.x` versions, `^0.2.3` only allows `0.2.x` — the major-zero special case.
</details>

---

**Q30.** `npm install` vs `npm ci`?
<details><summary>Answer</summary>

`npm ci` deletes `node_modules`, installs **exactly** from `package-lock.json`, and **fails** if the lock and `package.json` disagree. It's deterministic and faster — the correct command in CI/CD and Docker builds. `npm install` may update the lock file.
</details>

---

**Q31.** Should `package-lock.json` be committed?
A) No, it's generated  B) Yes — it pins the exact dependency tree for reproducible builds  C) Only for libraries  D) Only in monorepos

<details><summary>Answer</summary>**B.** For applications, always. (For published *libraries* the lock file doesn't affect consumers, but committing it still makes your own CI reproducible.)</details>

---

**Q32.** `dependencies` vs `devDependencies` vs `peerDependencies`?
<details><summary>Answer</summary>

- `dependencies` — needed at runtime; installed for consumers.
- `devDependencies` — build/test only (TypeScript, Jest, ESLint); skipped by `npm ci --omit=dev`, which is what your production Docker stage should run.
- `peerDependencies` — "the host app must provide this" (plugins: `@nestjs/common` for a Nest module). Prevents duplicate copies of a singleton library.
</details>

---

**Q33.** What does `npm audit` flag and what's the limitation?
<details><summary>Answer</summary>Known CVEs in the resolved dependency tree, by severity. Limitations: high false-positive rate for transitive dev-only paths, no reachability analysis (it doesn't know whether you call the vulnerable function), and `npm audit fix --force` will happily install breaking majors. Use it as a gate with an allowlist, plus Dependabot/Renovate.</details>

---

**Q34.** What is the `engines` field for?
<details><summary>Answer</summary>Declares the supported Node/npm range. It's a **warning** by default; `engine-strict=true` in `.npmrc` makes it fail. Pair it with a pinned Node version in your Dockerfile and CI matrix — the single cheapest way to prevent "works on my machine".</details>

---

**Q35.** Where does `require('lodash')` look, in order?
<details><summary>Answer</summary>

1. Core modules (`fs`, `path`, …) — always win
2. `./node_modules/lodash` in the current directory
3. `../node_modules/…`, walking up to the filesystem root
4. Global paths (`NODE_PATH`, etc.)

Then resolution inside the package: `exports` map → `main` → `index.js`. Modules are **cached by resolved filename** after first load, so a module's top-level code runs once per process.
</details>

---

**Q36.** How do you make a Docker image for a Node app small and secure? *(Select all.)*
A) Multi-stage build (build with dev deps, copy only `dist` + prod `node_modules`)
B) `node:20-alpine` or distroless base
C) `USER node` instead of root
D) `COPY . .` before `npm ci`

<details><summary>Answer</summary>

**A, B, C.** D is wrong twice: it breaks layer caching (any source change re-runs the install) and it copies secrets/`.git` into the image. Correct order is `COPY package*.json ./` → `RUN npm ci` → `COPY . .`, plus a `.dockerignore`.
</details>

---

## 5. HTTP & REST API Design

**Q37.** Which HTTP methods are **idempotent**? *(Select all.)*
`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`

<details><summary>Answer</summary>

**Idempotent:** `GET`, `PUT`, `DELETE`, `HEAD`, `OPTIONS`.
**Safe (no side effects):** `GET`, `HEAD`, `OPTIONS`.
**Neither:** `POST`, and `PATCH` (a PATCH *can* be written idempotently but isn't required to be).

Why it matters: idempotent methods can be safely retried by proxies, clients, and service meshes.
</details>

---

**Q38.** Correct status code for "request accepted, will be processed asynchronously"?
A) 200  B) 201  C) 202  D) 204

<details><summary>Answer</summary>**C) 202 Accepted** — the canonical response for enqueuing work. Return a status URL (`Location`) the client can poll.</details>

---

**Q39.** Match: 400, 401, 403, 404, 409, 422, 429.
<details><summary>Answer</summary>

| Code | Meaning |
|---|---|
| **400** Bad Request | Malformed syntax the server can't parse |
| **401** Unauthorized | *Unauthenticated* — no/invalid credentials (misnamed in the spec) |
| **403** Forbidden | Authenticated but **not permitted** |
| **404** Not Found | Resource doesn't exist (also used to hide existence from unauthorised users) |
| **409** Conflict | State conflict — duplicate key, optimistic-lock version mismatch |
| **422** Unprocessable Entity | Syntactically valid but semantically invalid (validation failures) |
| **429** Too Many Requests | Rate limited — include `Retry-After` |
</details>

---

**Q40.** 502 vs 503 vs 504?
<details><summary>Answer</summary>

- **502 Bad Gateway** — upstream returned an invalid/garbled response (app crashed, wrong port).
- **503 Service Unavailable** — the server itself is unavailable/overloaded, or no healthy upstreams. Should carry `Retry-After`.
- **504 Gateway Timeout** — upstream didn't respond in time (the classic NGINX `proxy_read_timeout` or ALB idle-timeout answer).
</details>

---

**Q41.** Which is the correct REST resource design?
A) `POST /getUserById?id=5`
B) `GET /users/5`
C) `GET /user/get/5`
D) `POST /users/5/delete`

<details><summary>Answer</summary>**B.** Nouns not verbs, plural collections, hierarchy for relationships (`GET /users/5/orders`), HTTP methods carry the action. Actions that genuinely aren't CRUD get a sub-resource: `POST /orders/5/refunds`.</details>

---

**Q42.** Offset pagination vs cursor pagination — when does offset break?
<details><summary>Answer</summary>

`LIMIT 20 OFFSET 100000` forces the DB to scan and discard 100,000 rows — latency grows linearly with page depth. It also **skips or duplicates rows** when items are inserted/deleted between pages.

Cursor (keyset) pagination — `WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 20` — is O(log n) with an index and stable under concurrent writes. Trade-off: no random page jumps, no total count.
</details>

---

**Q43.** How do you make `POST /payments` safe to retry?
<details><summary>Answer</summary>

**Idempotency keys.** The client sends `Idempotency-Key: <uuid>`; the server stores the key with a unique constraint plus the recorded response. A repeat with the same key returns the stored response instead of charging twice. Include an in-progress state so concurrent duplicates get 409 rather than racing.
</details>

---

**Q44.** Which API-versioning approaches are used in practice? *(Select all.)*
A) URI path `/v1/users`  B) Header `Accept: application/vnd.api.v1+json`  C) Query param `?version=1`  D) Never version

<details><summary>Answer</summary>**A, B, and C exist**, with A dominant (visible, cacheable, trivially routable) and B "purest" (a resource has one URI). The senior answer names the trade-off and then says the real goal is **additive, backwards-compatible change** so you rarely cut a version at all.</details>

---

**Q45.** Which requests trigger a CORS **preflight**?
<details><summary>Answer</summary>

Anything non-"simple": methods other than `GET`/`HEAD`/`POST`, a `Content-Type` other than `application/x-www-form-urlencoded`/`multipart/form-data`/`text/plain`, or custom headers (`Authorization`, `X-Request-Id`).

So a normal JSON API call (`Content-Type: application/json`) **always** preflights with `OPTIONS`. Server must answer with `Access-Control-Allow-{Origin,Methods,Headers}` and can cache it via `Access-Control-Max-Age`.
</details>

---

**Q46.** Rate limiting algorithms — which allows a burst at a window boundary?
A) Token bucket  B) Fixed window counter  C) Sliding window log  D) Leaky bucket

<details><summary>Answer</summary>**B) Fixed window** — 100 requests at 11:59:59 plus 100 at 12:00:00 gives 200 in one second. Sliding window (log or weighted counter) fixes it; **token bucket** is usually the best production choice because it allows a *controlled* burst plus a steady refill rate.</details>

---

**Q47.** Which headers should a rate-limited API return?
<details><summary>Answer</summary>`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (or the `X-` prefixed legacy variants), and `Retry-After` on a 429.</details>

---

**Q48.** WebSocket vs SSE vs long polling — pick one for a server-push-only notification feed and defend it.
<details><summary>Answer</summary>

**SSE.** Unidirectional server→client is exactly the requirement; it runs over plain HTTP/1.1 or HTTP/2 (proxy- and firewall-friendly), auto-reconnects with `Last-Event-ID`, and needs no separate protocol upgrade. Limitations: text only, and HTTP/1.1 per-domain connection limits.

Choose **WebSocket** when you need bidirectional/low-latency (chat, collaborative editing, trading), accepting sticky sessions and a pub/sub adapter for horizontal scale.
</details>

---

**Q49.** What does `ETag` + `If-None-Match` accomplish?
<details><summary>Answer</summary>**Conditional GET** — the server returns `304 Not Modified` with no body when the representation is unchanged, saving bandwidth. The same header pair enables **optimistic concurrency** on writes via `If-Match`, returning `412 Precondition Failed` on a stale update.</details>

---

**Q50.** In GraphQL, what is the N+1 problem and how is it solved?
<details><summary>Answer</summary>

One query for a list of N parents triggers N additional resolver queries for the children (`posts` → `author` per post).

**DataLoader** batches the per-resolver key requests within a single tick and caches per request, turning N queries into one `WHERE id IN (...)`. Create a **new DataLoader per request** — a shared one leaks data across users.
</details>

---

## 6. Auth & Security

**Q51.** A JWT consists of:
A) header.payload.signature, base64url-encoded, dot-separated
B) An encrypted blob
C) A random session id
D) header.body, base64-encoded

<details><summary>Answer</summary>**A.** Critically, a signed JWT (JWS) is **encoded, not encrypted** — anyone can read the payload. Never put PII or secrets in it.</details>

---

**Q52.** What is the `alg: none` attack?
<details><summary>Answer</summary>An attacker rewrites the header to `{"alg":"none"}`, strips the signature, and a naive library accepts it. Mitigation: **always specify the expected algorithm** on verification (`jwt.verify(token, key, { algorithms: ['RS256'] })`). The related attack is algorithm confusion — signing with an RS256 public key as if it were an HS256 secret.</details>

---

**Q53.** HS256 vs RS256 — when do you need RS256?
<details><summary>Answer</summary>

HS256 is symmetric — every verifier needs the signing secret, so any service that validates tokens could also mint them.
RS256 (or ES256) is asymmetric — the auth service holds the private key, all other services verify with the public key (via JWKS). **Required for multi-service, multi-party, or third-party verification.**
</details>

---

**Q54.** Why use short-lived access tokens with refresh tokens?
<details><summary>Answer</summary>Stateless JWTs can't be revoked before expiry, so you minimise the blast radius (5–15 min access tokens) and put revocability in the long-lived **refresh token**, which is stored server-side, rotated on each use, and invalidated on reuse detection (indicating theft).</details>

---

**Q55.** Where should a browser-facing refresh token live?
A) `localStorage`  B) An `HttpOnly; Secure; SameSite` cookie  C) A JS variable  D) sessionStorage

<details><summary>Answer</summary>**B.** `localStorage` is readable by any XSS payload. `HttpOnly` cookies are not JS-readable; add `SameSite=Lax/Strict` (plus a CSRF token for cross-site flows) and `Secure`.</details>

---

**Q56.** Why bcrypt/argon2 instead of SHA-256 for passwords?
<details><summary>Answer</summary>SHA-256 is designed to be **fast** — billions of guesses/second on a GPU. bcrypt/scrypt/argon2 are deliberately slow, tunable (cost factor / memory-hard), and **salted per user**, so rainbow tables and cross-account reuse fail. Argon2id is the current recommendation; bcrypt with cost ≥ 12 remains acceptable.</details>

---

**Q57.** Which prevents SQL injection?
A) Escaping quotes manually  B) Parameterised queries / prepared statements  C) A WAF  D) Input length limits

<details><summary>Answer</summary>**B** — the only real fix, because the query plan is fixed before data is bound. ORMs give this by default, but raw-SQL escape hatches (`$queryRawUnsafe`, string-concatenated `WHERE`) reintroduce it. **Identifiers** (table/column names) can't be parameterised — allowlist them.</details>

---

**Q58.** OWASP Top 10 — what is "Broken Access Control" in an API, concretely?
<details><summary>Answer</summary>

**IDOR / BOLA**: `GET /orders/1234` returns another tenant's order because the handler checks *authentication* but not *ownership*. The #1 API vulnerability class. Fix: scope every query by the authenticated principal (`WHERE tenant_id = $ctx.tenantId`), enforce it at the repository layer, and test it.
</details>

---

**Q59.** What does `helmet` actually do?
<details><summary>Answer</summary>Sets defensive HTTP response headers: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`/frame-ancestors, `Referrer-Policy`, and removes `X-Powered-By`. It's defence-in-depth for browser clients — no help for a machine-to-machine API beyond HSTS.</details>

---

**Q60.** Where do you store database credentials in production? *(Select all acceptable.)*
A) `.env` committed to git  B) AWS Secrets Manager / SSM Parameter Store  C) Kubernetes Secret backed by an external secret operator  D) Hardcoded in the image

<details><summary>Answer</summary>**B and C.** Bonus points for automatic **rotation**, IAM-based auth (RDS IAM tokens) removing the static password entirely, and noting that a plain K8s Secret is only base64-encoded — enable encryption at rest / use an external store.</details>

---

## 7. NestJS

**Q61.** What is the execution order of the NestJS request pipeline?
<details><summary>Answer</summary>

**Middleware → Guards → Interceptors (pre) → Pipes → Route handler → Interceptors (post) → Exception filters**

Knowing that **pipes run after guards** matters: a guard sees the raw, unvalidated payload.
</details>

---

**Q62.** Which construct do you use for each job?

| Job | Construct |
|---|---|
| Reject unauthenticated requests | ? |
| Transform/validate the request body | ? |
| Wrap the response in `{data, meta}` | ? |
| Map a `QueryFailedError` to a 409 | ? |
| Attach a request id to every log | ? |

<details><summary>Answer</summary>Guard · Pipe (`ValidationPipe`) · Interceptor · Exception filter · Middleware (or an interceptor + AsyncLocalStorage).</details>

---

**Q63.** Default provider scope in NestJS?
A) REQUEST  B) TRANSIENT  C) DEFAULT (singleton)  D) MODULE

<details><summary>Answer</summary>

**C — singleton**, shared across the whole application. `Scope.REQUEST` creates an instance per request (enables injecting `REQUEST`, but **bubbles up**: every consumer of a request-scoped provider also becomes request-scoped, hurting performance). `Scope.TRANSIENT` gives each consumer its own instance.

Modern alternative for per-request context: `AsyncLocalStorage` with a singleton service.
</details>

---

**Q64.** Why won't this inject?
```typescript
constructor(private readonly repo: IUserRepository) {}   // IUserRepository is an interface
```
<details><summary>Answer</summary>**Interfaces are erased at compile time**, so there's no runtime token for the DI container. Use a string/symbol token with `@Inject('USER_REPOSITORY')` and a custom provider, or make the contract an `abstract class` (which survives as a value).</details>

---

**Q65.** How do you resolve a circular dependency between two Nest modules/services?
<details><summary>Answer</summary>`forwardRef(() => OtherModule)` on both sides (and `@Inject(forwardRef(() => OtherService))` for providers). But the *correct* senior answer is that a circular dependency is a design smell — extract the shared logic into a third module or invert the direction with an event.</details>

---

**Q66.** What does `@Global()` do, and why is it discouraged?
<details><summary>Answer</summary>Registers the module's exported providers once, app-wide, so other modules don't need to import it. Discouraged because it hides the dependency graph and defeats module encapsulation; acceptable for genuinely cross-cutting infrastructure (config, logger, database).</details>

---

**Q67.** Which lifecycle hooks does Nest offer, in order?
<details><summary>Answer</summary>`onModuleInit` → `onApplicationBootstrap` → (running) → `onModuleDestroy` → `beforeApplicationShutdown` → `onApplicationShutdown`. Shutdown hooks only fire if you call `app.enableShutdownHooks()` — a frequent cause of connections not draining in Kubernetes.</details>

---

**Q68.** How do you enable DTO validation globally, and what option prevents mass assignment?
<details><summary>Answer</summary>

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // strip unknown props
  forbidNonWhitelisted: true, // 400 on unknown props
  transform: true,            // instantiate the DTO class, coerce primitives
}));
```
`whitelist: true` is the mass-assignment defence — without it, `{ isAdmin: true }` in the body can reach your entity.
</details>

---

**Q69.** How do you unit-test a Nest service without touching the database?
<details><summary>Answer</summary>

`Test.createTestingModule({ providers: [Svc, { provide: getRepositoryToken(User), useValue: mockRepo }] }).compile()` — override the repository/dependency token with a mock. Use `overrideProvider(X).useValue(mock)` for e2e modules, and **testcontainers** when you actually need real Postgres behaviour.
</details>

---

**Q70.** Which transport strategies does `@nestjs/microservices` support out of the box? *(Select all.)*
TCP, Redis, NATS, MQTT, gRPC, Kafka, RabbitMQ, GraphQL

<details><summary>Answer</summary>**TCP, Redis, NATS, MQTT, gRPC, Kafka, RabbitMQ.** GraphQL is not a microservice transport — it's an API layer (`@nestjs/graphql`).</details>

---

## 8. Data, Caching & Messaging

**Q71.** Cache-aside (lazy loading) — what's the read and write sequence?
<details><summary>Answer</summary>

**Read:** check cache → hit? return : read DB → write cache with TTL → return.
**Write:** write DB → **invalidate** (don't update) the cache key.

Invalidate rather than update to avoid writing a stale value under concurrency. Trade-off: the first read after invalidation is slow.
</details>

---

**Q72.** What is a cache stampede (dogpile) and how do you prevent it?
<details><summary>Answer</summary>A popular key expires and thousands of concurrent requests all miss and hit the DB simultaneously. Prevention: a **distributed lock / single-flight** so one request rebuilds while others wait or serve stale, **jittered TTLs** so keys don't expire together, and **probabilistic early expiry** (refresh slightly before the TTL).</details>

---

**Q73.** Redis is single-threaded for command execution. What follows from that?
<details><summary>Answer</summary>Commands are **atomic** individually (and `MULTI`/Lua blocks are atomic as a unit), so `INCR` needs no locking — but a single slow command (`KEYS *`, a big `SORT`, an O(N) `HGETALL` on a huge hash) **blocks every other client**. Use `SCAN` instead of `KEYS` in production. (Networking I/O is multi-threaded in Redis 6+; command execution is not.)</details>

---

**Q74.** Kafka vs RabbitMQ — one-line decision rule?
<details><summary>Answer</summary>

**Kafka** = durable, replayable, ordered-per-partition **log**; high throughput; consumers track their own offsets. Choose it for event streaming, analytics, event sourcing, and multiple independent consumer groups over the same data.
**RabbitMQ** = smart **broker** with flexible routing, per-message ack/nack, priorities, delays, and DLQs. Choose it for task queues, RPC, and complex routing where messages are consumed once and discarded.
</details>

---

**Q75.** What guarantees does Kafka give about ordering?
A) Global ordering across the topic
B) Ordering within a partition only
C) No ordering
D) Ordering per consumer group

<details><summary>Answer</summary>**B.** Ordering is per-partition, so entity-scoped ordering requires a partition **key** (e.g. `userId`). Global ordering requires a single partition — and therefore no parallelism.</details>

---

**Q76.** What is the transactional outbox pattern for?
<details><summary>Answer</summary>Atomically committing a state change **and** its event. You write the domain row and an `outbox` row in **one DB transaction**; a relay (poller or CDC/Debezium) publishes from the outbox to the broker. It eliminates the dual-write problem where the DB commits but the broker publish fails (or vice versa). Delivery becomes at-least-once, so consumers must be idempotent.</details>

---

**Q77.** Which isolation level is PostgreSQL's default, and what anomaly does it still allow?
A) Read Uncommitted  B) Read Committed — allows non-repeatable reads and phantoms  C) Repeatable Read  D) Serializable

<details><summary>Answer</summary>**B) Read Committed.** Each *statement* sees a fresh snapshot, so two reads in one transaction can differ. Postgres never allows dirty reads (Read Uncommitted behaves as Read Committed). Its Repeatable Read is snapshot isolation and *does* prevent phantoms; Serializable adds SSI with serialization failures you must retry.</details>

---

**Q78.** You see `SELECT` latency spike while writes are fine. Which do you check first? *(Rank.)*
A) Missing index / plan change  B) Replica lag  C) Connection pool saturation  D) Table bloat / vacuum

<details><summary>Answer</summary>

Practical order: **C** (are you waiting for a connection or for the DB?) → **A** (`EXPLAIN ANALYZE`, `pg_stat_statements` for the regressed query) → **B** (if reads are routed to replicas) → **D** (bloat from a long-running transaction blocking autovacuum).

The meta-point interviewers want: *distinguish waiting-in-queue from slow-execution before you touch anything.*
</details>

---

## 9. Testing

**Q79.** Mock vs stub vs spy?
<details><summary>Answer</summary>

- **Stub** — returns canned values; no assertions about calls.
- **Spy** — wraps the real thing and records calls; the original still runs.
- **Mock** — a pre-programmed double with **expectations** you assert on (`toHaveBeenCalledWith`).

`jest.fn()` is a mock/stub; `jest.spyOn(obj, 'm')` is a spy (add `.mockImplementation()` to make it a stub).
</details>

---

**Q80.** The testing pyramid, bottom to top?
<details><summary>Answer</summary>Many **unit** tests (fast, isolated) → fewer **integration** tests (real DB/broker via testcontainers) → fewest **E2E** tests (whole system). The inverted version ("ice cream cone") gives slow, flaky suites nobody trusts. For a backend service, the integration layer is where most of the real value sits.</details>

---

**Q81.** How do you test code that depends on `Date.now()` or timers?
<details><summary>Answer</summary>`jest.useFakeTimers()` + `jest.setSystemTime()` / `jest.advanceTimersByTime()`. Better still, **inject a clock** (`constructor(private clock: Clock)`) so the dependency is explicit and no global patching is needed.</details>

---

**Q82.** Your test suite passes locally and fails in CI intermittently. Top three causes?
<details><summary>Answer</summary>Shared mutable state / test-order dependence (no DB reset between tests), real time and timezones (`TZ` differs in CI), and unawaited async work leaking between tests. Fixes: transactional rollback or truncation per test, pin `TZ=UTC`, `--detectOpenHandles`, and `--runInBand` to confirm parallelism is the culprit.</details>

---

**Q83.** What is contract testing and when do you need it?
<details><summary>Answer</summary>Consumer and provider each verify against a shared **contract** (Pact) instead of running the full stack together. It catches breaking API changes in CI without maintaining a fragile end-to-end environment — valuable once you have several services owned by different teams.</details>

---

**Q84.** Is 100% code coverage a good goal?
<details><summary>Answer</summary>

No — coverage measures **execution**, not assertion quality; you can reach 100% with zero meaningful assertions. Aim for high coverage on domain/business logic, meaningful integration coverage on the risky paths, and use **mutation testing** (Stryker) if you want to measure test *strength*. Say this out loud in interviews; "100%" is a junior answer.
</details>

---

## Answer-Speed Drill

Ten minutes, out loud, one or two sentences each:

1. Six event loop phases, in order.
2. What runs on the libuv thread pool?
3. Backpressure — what is it and how do streams signal it?
4. `cluster` vs `worker_threads` vs more pods.
5. `npm ci` vs `npm install`.
6. Which HTTP methods are idempotent and why does it matter?
7. 401 vs 403 vs 422.
8. How do you make a payment endpoint retry-safe?
9. Why isn't a JWT payload secret?
10. HS256 vs RS256.
11. NestJS pipeline order.
12. Why can't you inject an interface in NestJS?
13. Cache-aside read/write sequence + stampede prevention.
14. Kafka ordering guarantee.
15. Outbox pattern — what problem does it solve?
16. Postgres default isolation level and the anomaly it allows.
17. Mock vs stub vs spy.
18. Graceful shutdown checklist.

**Target: 16/18 in ten minutes.**
