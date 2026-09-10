# 30-Day Interview Sprint — Senior / Lead Backend Engineer

> Generated from the Job Cracker platform (`job-cracker/`). Run `cd job-cracker && make up` and open
> http://localhost:8080 to work through this with progress tracking, a code runner, and scoring.

**Contents:** 30 days · 176 tasks · 101 coding problems · 136 recall questions · 18 design drills · 32 tracked skills · 14 behavioral prompts

## The bet behind this plan

You already have deep written material in this repo. What kills candidates at your level is not knowledge — it is (a) the online assessment filter and (b) turning depth into crisp, metric-backed narrative under a 45-minute clock. So this is retrieval and drilling under time, not first-pass learning.

**Daily shape (~3.5h):** coding block → depth block → design block → narrative block. Coding comes first, while you are fresh.

---

## Index

| Day | Week | Title | Theme |
|---|---|---|---|
| 1 | 1 | [Baseline & honest diagnosis](#day-1) | Measure before you train |
| 2 | 1 | [Arrays, hashing & the resume rewrite](#day-2) | The highest-frequency OA pattern + the highest-leverage document |
| 3 | 1 | [Two pointers & Node.js internals](#day-3) | Pointer discipline + the questions that separate Node seniors from Node users |
| 4 | 1 | [Sliding window & NestJS depth](#day-4) | The pattern most people fumble live + your framework of record |
| 5 | 1 | [Stacks & the Node practical round](#day-5) | Stack patterns + the "implement this utility" round |
| 6 | 1 | [System design fundamentals + first real HLD](#day-6) | The 7-step framework becomes muscle memory |
| 7 | 1 | [Week 1 checkpoint](#day-7) | Retrieval under time, then rest |
| 8 | 2 | [Binary search & PostgreSQL depth](#day-8) | Search-space thinking + the database round |
| 9 | 2 | [Linked lists & Redis](#day-9) | Pointer surgery + the caching round |
| 10 | 2 | [Trees I & REST/API design](#day-10) | Recursion discipline + the API design round |
| 11 | 2 | [Trees II / BFS & event-driven architecture](#day-11) | Level-order thinking + your strongest differentiator |
| 12 | 2 | [Heaps & Kafka](#day-12) | Top-K thinking + the streaming round |
| 13 | 2 | [Backtracking & real-time systems](#day-13) | Exhaustive search + the one thing on your CV nobody else has |
| 14 | 2 | [Week 2 checkpoint + first full mock](#day-14) | Put it together under pressure |
| 15 | 3 | [Graphs I & MongoDB/DynamoDB](#day-15) | Grid and adjacency traversal + NoSQL modelling |
| 16 | 3 | [Graphs II / topological sort & AWS serverless](#day-16) | Dependency ordering + the cloud round |
| 17 | 3 | [Intervals, greedy & Docker/K8s](#day-17) | Sorting-first patterns + the infra round |
| 18 | 3 | [Dynamic programming I & observability](#day-18) | The pattern that decides hard OAs + the round that proves you have run production |
| 19 | 3 | [Dynamic programming II & security](#day-19) | 2-D DP + the compliance conversation |
| 20 | 3 | [Tries, bit manipulation & distributed systems theory](#day-20) | Niche-but-cheap patterns + the theory that anchors design rounds |
| 21 | 3 | [Week 3 checkpoint](#day-21) | Hard-mode retest |
| 22 | 4 | [Weak-pattern surgery & architecture patterns](#day-22) | Attack the bottom of your own scoreboard |
| 23 | 4 | [Mixed-pattern speed & DDD / data architecture](#day-23) | Pattern recognition speed is the real OA skill |
| 24 | 4 | [Full OA simulation + reliability/cost architecture](#day-24) | Dress rehearsal conditions |
| 25 | 4 | [Architect-level scenarios & leadership signals](#day-25) | The lead-title conversation |
| 26 | 4 | [AI/LLM integration & the 2026 differentiator](#day-26) | The skill that moves you to the front of the remote queue |
| 27 | 4 | [Full mock loop day](#day-27) | Simulate an entire onsite |
| 28 | 4 | [Negotiation, positioning & gap closing](#day-28) | Do not leave money on the table |
| 29 | 5 | [Company-specific preparation](#day-29) | Tailor, do not repeat |
| 30 | 5 | [Taper & launch](#day-30) | Light load, high confidence |

---

## Week 1

<a id="day-1"></a>
### Day 1 — Baseline & honest diagnosis

*Measure before you train* · ~4h 10m

**Focus.** Take a cold timed OA and a cold system design. Whatever hurts is the plan.

> **What a hiring manager is testing here.** A recruiter screens you in 6 seconds on the resume and a machine screens you in 70 minutes on the OA. Neither cares how much you know — only what you can produce under a clock.

- [ ] **Coding · 70m** — Cold OA simulation — 70 min, 3 problems, no hints
      Two Sum, Valid Anagram, Longest Substring Without Repeating Characters. Do not look at hints or solutions. Record your real time per problem. This is your baseline, not a test of worth.
- [ ] **Design · 45m** — Cold system design — URL shortener, 45 min, out loud
      Record yourself. You are grading: did you clarify requirements before drawing? Did you do capacity math? Did you name a trade-off unprompted?
- [ ] **Admin · 25m** — Read the market analysis end to end
      Understand the funnel you are about to walk into and where candidates at your level get cut.
- [ ] **Read · 35m** — Platform playbook — how each assessment platform actually scores you
      HackerRank, Codility, CodeSignal, TestGorilla, Talview, Mettl. Question types, timers, proctoring, and the Node stdin harness. Knowing the format is worth more than one extra pattern.
      `phase-0-online-assessments/00-platform-playbook.md`
- [ ] **Read · 20m** — The interview loop — what you are actually walking into
      Read before anything else. Four to six stages over three to six weeks, and each one filters for something different — so preparing evenly across them is the wrong strategy. It also names where your profile is most likely to be cut, which is what the weighting of this whole plan is built on. The offer and first-90-days material is at the end of it, for later.
      `phase-0-online-assessments/12-the-interview-loop.md`
- [ ] **Admin · 30m** — Set your target list — 15 BD, 15 remote
      Add them in the Pipeline tab as wishlist. You cannot run a 30-day sprint against an abstract "get a job" goal.
- [ ] **Story · 25m** — Write your 2-minute "tell me about yourself"
      Structure: now (role + scale) -> arc (3 moves, each with a number) -> why this role. Under 120 seconds spoken. Time it.

<a id="day-2"></a>
### Day 2 — Arrays, hashing & the resume rewrite

*The highest-frequency OA pattern + the highest-leverage document* · ~4h 10m

**Focus.** Hash-map patterns are ~30% of screening problems. Your resume is the only artifact 100% of interviewers read.

> **What a hiring manager is testing here.** I scan for: scale numbers, ownership verbs, and stack keywords in the first third. If I have to hunt for "41M users", you have already lost the fast lane.

- [ ] **Coding · 80m** — Arrays & Hashing — 6 problems
      Contains Duplicate, Valid Anagram, Group Anagrams, Top K Frequent, Product Except Self, Longest Consecutive Sequence.
- [ ] **Read · 50m** — JavaScript / TypeScript deep dive — event loop, closures, types
      `phase-1-core-programming/01-javascript-typescript-deep-dive.md`
- [ ] **Quiz · 15m** — Quiz: JavaScript / TypeScript (15 questions)
- [ ] **Read · 40m** — MCQ bank — JavaScript & TypeScript (75 questions)
      The written bank behind the quiz. TestGorilla and iMocha draw from exactly this surface: coercion, hoisting, `this`, prototypes, generics.
      `phase-0-online-assessments/01-mcq-bank-javascript-typescript.md`
- [ ] **Read · 20m** — The resume system — how it is actually read
      Twenty minutes that decide whether the next forty-five are worth anything. The ATS parsing rules, the six-second scan order, the bullet formula, and the three bullets that separate a Senior resume from a Lead one.
      `resume/00-resume-system.md`
- [ ] **Admin · 45m** — Resume rewrite pass 1 — fill the bullet bank
      One sitting, no splitting it across days. Dump every project, then recover a number for each using the six angles (scale, time, money, reliability, breadth, risk removed), then convert the best into verb + system + scale + outcome. Write more bullets than fit — selection comes after. Include the three lead signals: a decision with a rejected alternative, a standard you set, people you levelled.
      `resume/01-master-resume.md`

<a id="day-3"></a>
### Day 3 — Two pointers & Node.js internals

*Pointer discipline + the questions that separate Node seniors from Node users* · ~4h 10m

**Focus.** Two-pointer problems and the event loop phases question that gets asked in almost every Node interview.

> **What a hiring manager is testing here.** Anyone can say "Node is single-threaded, non-blocking". A senior explains the phase order, where microtasks drain, and why a CPU-bound handler stalls 10k sockets.

- [ ] **Coding · 80m** — Two Pointers — 5 problems
      Valid Palindrome, Two Sum II, 3Sum, Container With Most Water, Trapping Rain Water.
- [ ] **Read · 55m** — Node.js fundamentals — event loop phases, streams, worker threads
      `phase-1-core-programming/02-nodejs-fundamentals.md`
- [ ] **Quiz · 15m** — Quiz: Node.js internals
- [ ] **Read · 40m** — MCQ bank — Node.js & backend (84 questions)
      libuv, streams, clustering, npm, HTTP semantics, auth, NestJS, caching. Any Node skill test lives here.
      `phase-0-online-assessments/02-mcq-bank-nodejs-backend.md`
- [ ] **Design · 35m** — LLD drill — LRU cache (30 min, code it)
- [ ] **Story · 25m** — STAR story #1 — scaling to 41M users (Banglalink)
      Situation must include the constraint that made it hard. Result must include two numbers.

<a id="day-4"></a>
### Day 4 — Sliding window & NestJS depth

*The pattern most people fumble live + your framework of record* · ~4h 0m

**Focus.** Window expand/contract invariants. And being able to defend NestJS DI, guards vs interceptors, and testing strategy.

> **What a hiring manager is testing here.** If NestJS is on your resume I will ask how request-scoped providers interact with performance, and what you put in an interceptor vs a guard vs a pipe. Vague answers here read as "framework user, not framework thinker".

- [ ] **Coding · 85m** — Sliding Window — 5 problems
      Best Time to Buy/Sell, Longest Substring Without Repeating, Longest Repeating Char Replacement, Permutation in String, Minimum Window Substring.
- [ ] **Read · 55m** — NestJS mastery — DI, request pipeline, microservices, queues
      `phase-1-core-programming/03-nestjs-mastery.md`
- [ ] **Quiz · 15m** — Quiz: NestJS
- [ ] **Story · 45m** — One-way video interview setup and the 90-second answer formula
      Talview, HireVue and TestGorilla screens arrive early in the funnel and get no second take. Set up lighting, framing and audio once, then record two practice answers.
      `phase-0-online-assessments/07-video-interview-and-psychometric.md`
- [ ] **Admin · 40m** — LinkedIn + GitHub rewrite — English-first, keyword dense
      Headline formula: "Senior Backend Engineer | Node.js · NestJS · AWS · Kafka | Built for 41M users". About section: 4 short paragraphs, first line states scale, written in first person. Then the GitHub profile README and two pinned repos — that pair is your written-English evidence, which is the thing a remote hiring manager is currently guessing about.
      `resume/02-linkedin-and-profiles.md`

<a id="day-5"></a>
### Day 5 — Stacks & the Node practical round

*Stack patterns + the "implement this utility" round* · ~4h 10m

**Focus.** Node/backend OAs love "implement promiseAll / debounce / a concurrency pool". These are free points if drilled.

> **What a hiring manager is testing here.** The practical JS round is my cheapest high-signal filter. Implementing an async pool correctly tells me more about your Node judgment than any DP problem.

- [ ] **Coding · 55m** — Stack — 4 problems
      Valid Parentheses, Min Stack, Evaluate RPN, Daily Temperatures.
- [ ] **Coding · 60m** — Node practicals — 4 problems
      Implement Promise.all, Debounce, Async Pool (concurrency limiter), Retry with Backoff.
- [ ] **Read · 40m** — Node async & simulation tasks — the senior discriminators
      The written companion to the practicals you just coded, including the CodeSignal growing-spec task that trips up experienced engineers.
      `phase-0-online-assessments/03c-nodejs-async-and-simulation-tasks.md`
- [ ] **Read · 45m** — Design patterns in practice — SOLID, repository, circuit breaker
      `phase-1-core-programming/05-design-patterns-in-practice.md`
- [ ] **Story · 25m** — STAR story #2 — live streaming architecture (Right Tracks / Agora)
- [ ] **Admin · 25m** — Set the outreach rhythm — referrals beat volume
      A referred application converts roughly five times better than a cold one, and the ask costs one message. Write the three referral scripts against real names from your network, and put the weekly rhythm on your calendar: source Monday, apply Tuesday and Thursday, two warm touches Wednesday, follow-ups Friday. Applying is not studying — both get scheduled or neither happens.
      `resume/03-outreach-and-referrals.md`

<a id="day-6"></a>
### Day 6 — System design fundamentals + first real HLD

*The 7-step framework becomes muscle memory* · ~3h 40m

**Focus.** Requirements -> estimation -> API -> data model -> high level -> deep dive -> trade-offs. Every single time.

> **What a hiring manager is testing here.** The candidates who fail design rounds start drawing boxes in minute two. The ones who pass spend five minutes on requirements and scale numbers, and I relax immediately.

- [ ] **Read · 60m** — System design fundamentals — framework, estimation, building blocks
      `phase-5-system-design/01-system-design-fundamentals.md`
- [ ] **Design · 50m** — HLD drill — Distributed rate limiter (45 min, timed)
- [ ] **Coding · 55m** — Mixed review — 4 problems from days 2-5
      Redo without looking. Anything you cannot re-derive in 20 minutes is not learned yet.
- [ ] **Quiz · 15m** — Quiz: System design fundamentals
- [ ] **Admin · 20m** — Back-of-envelope numbers — memorise the latency table
      L1/RAM/SSD/network round trip, and QPS-per-instance rules of thumb. You should never stall on arithmetic in a design round.
      `phase-5-system-design/01-system-design-fundamentals.md`
- [ ] **Read · 20m** — System design roadmap — orient yourself for weeks 2-4
      Skim only. Knowing the shape of what is coming makes each later design day land faster.
      `phase-5-system-design/00-roadmap.md`

<a id="day-7"></a>
### Day 7 — Week 1 checkpoint

*Retrieval under time, then rest* · ~4h 20m

**Focus.** Timed retest of week 1 patterns + first application batch out the door.

> **What a hiring manager is testing here.** Applications are a pipeline with ~4-8% response rates. If you start applying in week 4 you have wasted the sprint. Start now — the early loops are your rehearsals.

- [ ] **Mock · 70m** — Timed OA #1 — 70 min, 3 problems from week 1 patterns
      Full-length simulations with a diagnostic scorecard are in phase-0-online-assessments/08-timed-mock-assessments.md if you want a platform-shaped paper instead.
- [ ] **Admin · 60m** — Apply to 8 roles (4 BD, 4 remote)
      Track each in Pipeline. Tailor the first resume bullet to the job description keyword set.
- [ ] **Quiz · 25m** — Mixed quiz — 25 questions, all week 1 topics
- [ ] **Story · 30m** — Rehearse STAR #1 and #2 out loud, recorded
      Each under 3 minutes. Listen back once. Cut every sentence that has no fact in it.
- [ ] **Read · 25m** — Timed mock formats + the diagnostic scorecard
      Five full-length platform simulations and a scorecard that names your weakest bucket. Use it to pick which platform to rehearse before a real invite.
      `phase-0-online-assessments/08-timed-mock-assessments.md`
- [ ] **Read · 30m** — Reading unfamiliar code — the method
      A real senior interview format ("here is our repo, add this feature") and literally your first month on whatever job you win. Do not read top-to-bottom: orient in ten minutes, trace one behaviour end to end, sketch it. The AI-assisted development guide is linked at the end and is worth the same sitting — "how do you use AI in your workflow" is now a routine question with no safe default answer.
      `phase-1-core-programming/06-reading-unfamiliar-code.md`
- [ ] **Admin · 20m** — Review the week — mark weak patterns, adjust

## Week 2

<a id="day-8"></a>
### Day 8 — Binary search & PostgreSQL depth

*Search-space thinking + the database round* · ~5h 20m

**Focus.** Binary search on answer (Koko, rotated arrays) and Postgres internals: MVCC, indexes, EXPLAIN.

> **What a hiring manager is testing here.** For a backend senior I will absolutely open a slow query and ask what you would do. "Add an index" is a junior answer. Naming the index type, the selectivity, and the write-amplification cost is a senior answer.

- [ ] **Coding · 75m** — Binary Search — 5 problems
      Binary Search, Search 2D Matrix, Koko Eating Bananas, Search in Rotated Sorted Array, Find Minimum in Rotated Sorted Array.
- [ ] **Read · 60m** — PostgreSQL deep dive — MVCC, indexing, isolation, EXPLAIN
      `phase-3-databases-data/01-postgresql-deep-dive.md`
- [ ] **Read · 40m** — Functions, triggers & in-database jobs
      The other half of Postgres: PL/pgSQL functions, procedures (the only thing that can COMMIT, which is how you backfill 50M rows safely), triggers, advisory locks, LISTEN/NOTIFY and pg_cron. The question underneath all of it is what belongs in the database — data integrity yes, business decisions no. Know the volatility markings: labelling a table-reading function IMMUTABLE is a correctness bug the planner will hide from you.
      `phase-3-databases-data/10-functions-triggers-and-in-database-jobs.md`
- [ ] **Quiz · 15m** — Quiz: PostgreSQL
- [ ] **Coding · 55m** — SQL challenge bank — joins, aggregation, CTEs (20 problems)
      Highest points-per-minute section on any mixed assessment, and the one most backend candidates skip. Write the queries, do not just read them.
      `phase-0-online-assessments/04-sql-challenge-bank.md`
- [ ] **Design · 50m** — HLD drill — Design a news feed (45 min)
- [ ] **Admin · 25m** — Apply to 3 roles

<a id="day-9"></a>
### Day 9 — Linked lists & Redis

*Pointer surgery + the caching round* · ~4h 20m

**Focus.** Linked list manipulation without leaking, and cache patterns including the failure modes.

> **What a hiring manager is testing here.** Cache-aside is table stakes. I am listening for stampede protection, negative caching, and what happens to your database the second Redis fails over.

- [ ] **Coding · 75m** — Linked List — 5 problems
      Reverse Linked List, Merge Two Sorted Lists, Linked List Cycle, Remove Nth From End, Reorder List.
- [ ] **Read · 50m** — Redis deep dive — structures, patterns, Redlock, persistence
      `phase-3-databases-data/02-redis-deep-dive.md`
- [ ] **Quiz · 15m** — Quiz: Redis & caching
- [ ] **Coding · 50m** — SQL part 2 — window functions, cohort and funnel analytics
      The half of the SQL bank that actually separates candidates. Window functions come up constantly and almost nobody drills them.
      `phase-0-online-assessments/04-sql-challenge-bank.md`
- [ ] **Quiz · 15m** — Quiz: SQL under assessment conditions
- [ ] **Read · 30m** — Cache avalanche, penetration, thundering herd
      `phase-4-cloud-infrastructure/07-performance-engineering.md`
- [ ] **Story · 25m** — STAR story #3 — Daraz voucher system + measured impact

<a id="day-10"></a>
### Day 10 — Trees I & REST/API design

*Recursion discipline + the API design round* · ~4h 55m

**Focus.** Tree traversal in all three orders without thinking, plus idempotency and versioning.

> **What a hiring manager is testing here.** Ask any backend candidate to design a payment-adjacent endpoint. If idempotency keys do not come up unprompted, that is a real gap for fintech-heavy BD roles.

- [ ] **Coding · 80m** — Trees — 6 problems
      Invert Tree, Max Depth, Same Tree, Subtree of Another Tree, Balanced Binary Tree, Diameter of Binary Tree.
- [ ] **Read · 50m** — REST API best practices — idempotency, versioning, rate limits, OWASP
      `phase-2-apis-realtime-systems/02-rest-api-best-practices.md`
- [ ] **Quiz · 15m** — Quiz: REST & API design
- [ ] **Coding · 50m** — REST API & find-the-bug challenges
      HackerRank's REST API question type and 16 debugging snippets. A distinct assessment format — you are given working-ish code and scored on the fix.
      `phase-0-online-assessments/05-rest-api-and-debugging-challenges.md`
- [ ] **Read · 35m** — Webhooks & third-party integration reliability
      Ubiquitous backend work, and a small surface that exposes everything you know about idempotency, security and failure handling. The canonical question: a payment webhook arrived twice and the customer was charged twice. The answer is a unique constraint doing the deduplication, because a check-then-write has a race window. Also reconciliation — what makes the system correct when webhooks silently never arrive at all.
      `phase-2-apis-realtime-systems/08-webhooks-and-integrations.md`
- [ ] **Design · 40m** — LLD drill — Rate limiter class (token bucket + sliding window)
- [ ] **Admin · 25m** — Apply to 3 roles

<a id="day-11"></a>
### Day 11 — Trees II / BFS & event-driven architecture

*Level-order thinking + your strongest differentiator* · ~4h 10m

**Focus.** BFS on trees, and EDA depth: outbox, saga, idempotent consumers, DLQs.

> **What a hiring manager is testing here.** EDA is where your real experience lives. I want to hear about a duplicate you actually had to handle in production, not a definition of at-least-once delivery.

- [ ] **Coding · 80m** — Trees & BFS — 5 problems
      Level Order Traversal, Right Side View, Validate BST, Kth Smallest in BST, LCA of a BST.
- [ ] **Read · 55m** — Event-driven architecture — outbox, saga, idempotency, schema evolution
      `phase-2-apis-realtime-systems/04-event-driven-architecture.md`
- [ ] **Quiz · 15m** — Quiz: Event-driven architecture
- [ ] **Design · 50m** — HLD drill — Notification system at 41M users (your home turf, 45 min)
      Do it timed and cold anyway. Familiar territory is where people ramble.
- [ ] **Build · 50m** — Build 1/4 — walking skeleton, public repo, CI green
      The artifact is one of the three highest-leverage things in this whole month: it closes the AI gap, the testing gap and the "show me your written work" gap at once. Start at the chooser — it maps each project to the gap it closes, and the default (a small RAG service over your own notes) is the default because your AI/LLM bullet bank is empty. Today: pick one, create the repo, one endpoint, one real test, GitHub Actions running green, and a README that states the problem and the trade-offs. Ship it thin — the link becomes CV-usable today, and the next three sessions deepen it.
      `hands-on-projects/README.md`

<a id="day-12"></a>
### Day 12 — Heaps & Kafka

*Top-K thinking + the streaming round* · ~4h 30m

**Focus.** Priority queue patterns, and Kafka semantics you can defend under pressure.

> **What a hiring manager is testing here.** "Exactly-once" is where I probe hardest. If you say Kafka gives exactly-once without qualifying transactions, idempotent producers, and the consumer side, you are quoting marketing.

- [ ] **Coding · 80m** — Heap / Priority Queue — 4 problems
      Kth Largest Element, K Closest Points to Origin, Task Scheduler, Find Median from Data Stream.
- [ ] **Read · 55m** — Kafka deep dive — partitions, consumer groups, EOS, rebalancing
      `phase-3-databases-data/03-kafka-deep-dive.md`
- [ ] **Quiz · 15m** — Quiz: Kafka & messaging
- [ ] **Read · 35m** — RabbitMQ deep dive — and when you would pick it over Kafka
      "Kafka vs RabbitMQ" is asked constantly and answered badly. Log versus smart broker: replay and retention favour Kafka, per-message routing and ack semantics favour Rabbit.
      `phase-3-databases-data/04-rabbitmq-deep-dive.md`
- [ ] **Read · 30m** — Live coding & pairing — the round a human scores
      Everything else in this repo is scored by a machine or by you. This is different, and being strong at automated tests does not make you strong here — silence is the failure mode. Then book two mock interviews for weeks 3 and 4. Self-scoring has a known inflation problem and a human is the only fix; give them the rubric at the end of the guide.
      `phase-0-online-assessments/11-live-coding-and-pairing.md`
- [ ] **Story · 30m** — STAR story #4 — a production incident you owned
      Detection -> mitigation -> root cause -> the systemic fix. Blameless framing. Name your own mistake if there was one; that reads as senior, not weak.
- [ ] **Admin · 25m** — Apply to 3 roles

<a id="day-13"></a>
### Day 13 — Backtracking & real-time systems

*Exhaustive search + the one thing on your CV nobody else has* · ~4h 40m

**Focus.** Subsets/permutations/combination templates, plus WebSocket scaling and the WebRTC media layer.

> **What a hiring manager is testing here.** Real-time is THE differentiator on your CV. Expect "how do you scale Socket.io past one box" — Redis adapter, sticky sessions, and what breaks anyway. If the role touches video, expect "why does a mesh call die at five people" and "your call works in the office and fails at home, why". Most candidates cannot answer either.

- [ ] **Coding · 85m** — Backtracking — 5 problems
      Subsets, Combination Sum, Permutations, Word Search, Palindrome Partitioning.
- [ ] **Read · 50m** — Real-time systems & Agora — WebSockets, SSE, scaling, recovery
      `phase-2-apis-realtime-systems/03-realtime-systems-agora.md`
- [ ] **Quiz · 15m** — Quiz: Real-time systems
- [ ] **Read · 45m** — WebRTC & media infrastructure — the differentiator round
      Agora and live streaming is the rarest thing on your CV, and until now the repo armed you for WebSockets but not the media layer. Learn cold: the mesh arithmetic (why five people breaks), SFU vs MCU, why ~15% of users need TURN, and why you would put a million viewers on HLS rather than WebRTC. Do the numbers out loud — the capacity maths in section 10 is the estimation skill the design round tests.
      `phase-2-apis-realtime-systems/07-webrtc-and-media-infrastructure.md`
- [ ] **Read · 35m** — GraphQL — subscriptions, DataLoader and query cost
      Scoped deliberately: today read only the subscriptions, N+1/DataLoader, and depth/complexity-limiting sections — those are what the real-time theme and the API round actually test. AppSync is on your CV so the rest of the guide is fair game, but it reads better on its own day than stacked behind two other reads.
      `phase-2-apis-realtime-systems/01-graphql-aws-appsync.md`
- [ ] **Design · 50m** — HLD drill — Chat system (WhatsApp-like, 45 min)

<a id="day-14"></a>
### Day 14 — Week 2 checkpoint + first full mock

*Put it together under pressure* · ~4h 5m

**Focus.** Timed OA #2, a full 45-minute design mock, and a behavioral block.

> **What a hiring manager is testing here.** Halfway point. If your OA time-per-medium is still above 25 minutes, week 3 shifts weight toward DSA and away from reading.

- [ ] **Mock · 75m** — Timed OA #2 — 75 min, 3 problems (weeks 1-2 patterns)
- [ ] **Mock · 55m** — Design mock — Design Instagram/news feed, 45 min, recorded
      Screen-share excalidraw. Grade yourself against the rubric afterwards, honestly.
- [ ] **Quiz · 30m** — Mixed quiz — 30 questions, weeks 1-2
- [ ] **Admin · 45m** — Apply to 6 roles + follow up on week 1 batch
- [ ] **Admin · 20m** — Build your reverse-interview shortlist
      Week 1 applications start converting to screens about now, and "do you have any questions for us?" is scored. Pick ten from the bank and write them down: three universal, three that decide whether you would accept, two remote-specific, and the closing question about hesitations. Ask from notes — it reads as preparation, not weakness.
      `phase-0-online-assessments/10-reverse-interview-bank.md`
- [ ] **Admin · 20m** — Review progress, rebalance week 3

## Week 3

<a id="day-15"></a>
### Day 15 — Graphs I & MongoDB/DynamoDB

*Grid and adjacency traversal + NoSQL modelling* · ~4h 55m

**Focus.** Island/matrix BFS-DFS, and DynamoDB single-table design.

> **What a hiring manager is testing here.** For AWS-heavy roles, DynamoDB access-pattern-first modelling is a real skill test. If you design a Dynamo table like a relational schema, that is a no from me.

- [ ] **Coding · 85m** — Graphs — 5 problems
      Number of Islands, Clone Graph, Max Area of Island, Rotting Oranges, Pacific Atlantic Water Flow.
- [ ] **Read · 55m** — NoSQL — MongoDB & DynamoDB single-table design
      `phase-3-databases-data/05-nosql-mongodb-dynamodb.md`
- [ ] **Quiz · 15m** — Quiz: NoSQL
- [ ] **Read · 35m** — Choosing the right database — the synthesis read
      You have now seen Postgres, Redis, Kafka, RabbitMQ, Mongo and DynamoDB individually. This ties them together and adds the categories the deep dives skip — search, time-series, graph, columnar and vector. Learn the 30-second decision path and the five worked systems; in a design round the reasoning is scored, not the product name.
      `phase-3-databases-data/09-choosing-the-right-database.md`
- [ ] **Read · 30m** — ORMs & query builders — the N+1 problem and how to prove you fixed it
      Prisma vs TypeORM vs Knex trade-offs, cursor pagination, soft delete, multi-tenancy. N+1 comes up in almost every backend code review round.
      `phase-3-databases-data/07-orms-query-builders.md`
- [ ] **Design · 50m** — HLD drill — Design a file storage service (Dropbox-like)
- [ ] **Admin · 25m** — Apply to 3 roles

<a id="day-16"></a>
### Day 16 — Graphs II / topological sort & AWS serverless

*Dependency ordering + the cloud round* · ~4h 15m

**Focus.** Course Schedule family and Lambda/API Gateway/AppSync cost and cold-start realities.

> **What a hiring manager is testing here.** For BD startups, cost is a first-class design constraint. A candidate who can say "that design costs roughly $X/month and here is the cheaper shape" stands out enormously.

- [ ] **Coding · 80m** — Graphs / topological sort — 4 problems
      Course Schedule, Course Schedule II, Network Delay Time (Dijkstra), Number of Connected Components.
- [ ] **Read · 55m** — AWS serverless deep dive — Lambda, API Gateway, AppSync, cost
      `phase-4-cloud-infrastructure/02-aws-serverless-deep-dive.md`
- [ ] **Quiz · 15m** — Quiz: AWS & serverless
- [ ] **Design · 50m** — HLD drill — Payment processing (Stripe-like) with idempotency
- [ ] **Read · 30m** — Take-home assignments — the rubric you are not shown
      At senior level this has largely replaced the timed test for remote roles, and the failure is almost never "the code did not work" — it is scope, structure or silence. Read it before one lands, because the decisions that lose it are made in the first thirty minutes. The project you are building this week is the rehearsal.
      `phase-0-online-assessments/09-take-home-assignments.md`
- [ ] **Story · 25m** — STAR story #5 — a cost or performance optimisation with numbers

<a id="day-17"></a>
### Day 17 — Intervals, greedy & Docker/K8s

*Sorting-first patterns + the infra round* · ~4h 20m

**Focus.** Interval merging templates, plus containers and orchestration you can defend.

> **What a hiring manager is testing here.** I do not need you to be an SRE. I need you to know what a readiness probe does, why your pod got OOMKilled, and how a rolling update can still drop requests.

- [ ] **Coding · 85m** — Intervals & Greedy — 6 problems
      Insert Interval, Merge Intervals, Non-overlapping Intervals, Meeting Rooms II, Maximum Subarray, Jump Game.
- [ ] **Read · 55m** — Docker fundamentals + Kubernetes basics
      `phase-4-cloud-infrastructure/03-docker-fundamentals.md`
- [ ] **Quiz · 15m** — Quiz: Docker & Kubernetes
- [ ] **Read · 40m** — DevOps / cloud / Linux / Git MCQ bank — 90 questions
      TestGorilla and iMocha infra sections draw almost entirely from this surface. Cheap points if you have seen the format.
      `phase-0-online-assessments/06-devops-cloud-mcq-bank.md`
- [ ] **Design · 40m** — LLD drill — Task scheduler with retries and backoff
- [ ] **Admin · 25m** — Apply to 3 roles

<a id="day-18"></a>
### Day 18 — Dynamic programming I & observability

*The pattern that decides hard OAs + the round that proves you have run production* · ~4h 15m

**Focus.** 1-D DP templates, plus SLIs/SLOs/error budgets and incident response.

> **What a hiring manager is testing here.** Nothing separates "built features" from "ran a system" faster than SLO talk. If you can state an SLI, its SLO, and what you did when the error budget burned, you sound like a lead.

- [ ] **Coding · 90m** — 1-D Dynamic Programming — 6 problems
      Climbing Stairs, House Robber, House Robber II, Coin Change, Longest Increasing Subsequence, Word Break.
- [ ] **Read · 50m** — Observability & reliability — logs/metrics/traces, SLOs, incidents
      `phase-4-cloud-infrastructure/05-observability-reliability.md`
- [ ] **Quiz · 15m** — Quiz: Observability & reliability
- [ ] **Design · 50m** — HLD drill — Distributed job scheduler / task queue
- [ ] **Build · 50m** — Build 2/4 — the core feature, with tests that mean something
      Ingestion + retrieval if you went the RAG route. Integration tests with testcontainers, not just unit tests on pure functions. This is the part reviewers actually read on a take-home.
      `phase-1-core-programming/04-testing-and-quality.md`

<a id="day-19"></a>
### Day 19 — Dynamic programming II & security

*2-D DP + the compliance conversation* · ~3h 50m

**Focus.** Grid and string DP, plus OAuth2/OIDC, secrets, GDPR — the questions international clients ask.

> **What a hiring manager is testing here.** For EU/US remote work, one wrong answer about data residency or token handling can end a loop. Know PKCE, know why you never put PII in a JWT.

- [ ] **Coding · 90m** — 2-D Dynamic Programming — 5 problems
      Unique Paths, Longest Common Subsequence, Edit Distance, Longest Palindromic Substring, Decode Ways.
- [ ] **Read · 50m** — Security & compliance — OWASP, OAuth2/OIDC, GDPR, SOC 2, BD DSA
      `phase-4-cloud-infrastructure/06-security-compliance.md`
- [ ] **Quiz · 15m** — Quiz: Security & compliance
- [ ] **Design · 50m** — HLD drill — Mobile financial service (bKash/Nagad-like)
- [ ] **Story · 25m** — STAR story #6 — mentoring / raising the bar on a team

<a id="day-20"></a>
### Day 20 — Tries, bit manipulation & distributed systems theory

*Niche-but-cheap patterns + the theory that anchors design rounds* · ~4h 50m

**Focus.** Trie implementation, bit tricks, and CAP/PACELC/consensus you can reason with, not recite.

> **What a hiring manager is testing here.** I do not ask you to implement Raft. I ask what happens when your leader is network-partitioned but still thinks it is the leader. Fencing tokens are the answer I am fishing for.

- [ ] **Coding · 80m** — Tries & Bit Manipulation — 6 problems
      Implement Trie, Design Add and Search Words, Number of 1 Bits, Counting Bits, Missing Number, Single Number.
- [ ] **Read · 60m** — Distributed systems — CAP/PACELC, consistency, Raft, clocks, sharding
      `phase-5-system-design/03-distributed-systems.md`
- [ ] **Quiz · 15m** — Quiz: Distributed systems
- [ ] **Read · 35m** — NGINX deep dive — reverse proxy, load balancing, TLS, rate limiting
      Layer 4 vs Layer 7, the six balancing algorithms, WebSocket proxying, and NGINX as an ingress. Cheap, concrete, and disproportionately valued in BD infrastructure rounds.
      `phase-4-cloud-infrastructure/01-nginx-deep-dive.md`
- [ ] **Read · 35m** — Networking fundamentals — where the time actually goes
      The layer under everything in phase 4. The question to be able to answer cold: a request takes 900ms and your handler logs 12ms — where did the rest go? DNS, TCP handshake, TLS handshake, load-balancer queueing, connection-pool wait. Naming the layers is the answer. Also read the error table; knowing that ECONNRESET usually means a keep-alive mismatch turns a mystery into a diagnosis.
      `phase-4-cloud-infrastructure/10-networking-fundamentals.md`
- [ ] **Design · 40m** — LLD drill — Pub/Sub system with at-least-once delivery
- [ ] **Admin · 25m** — Apply to 3 roles + follow-ups

<a id="day-21"></a>
### Day 21 — Week 3 checkpoint

*Hard-mode retest* · ~3h 45m

**Focus.** A harder OA and a design mock with a hostile interviewer mindset.

> **What a hiring manager is testing here.** By now the shape of your loop performance is fixed. Week 4 is polish and narrative, not new material.

- [ ] **Mock · 80m** — Timed OA #3 — 80 min, 3 problems including one hard
- [ ] **Mock · 55m** — Design mock — Ride-hailing (Pathao-like), 45 min, adversarial self-questioning
      After each decision, ask yourself "why not the alternative?" out loud and answer it.
- [ ] **Quiz · 35m** — Mixed quiz — 35 questions, weeks 1-3
- [ ] **Story · 35m** — Rehearse all 6 STAR stories, timed
- [ ] **Admin · 20m** — Progress review + weak-pattern list for week 4

## Week 4

<a id="day-22"></a>
### Day 22 — Weak-pattern surgery & architecture patterns

*Attack the bottom of your own scoreboard* · ~4h 15m

**Focus.** The app knows your weakest patterns. Spend the day there. Plus microservices trade-offs.

> **What a hiring manager is testing here.** A lead candidate who argues for a modular monolith with good reasons impresses me more than one who reflexively says microservices.

- [ ] **Coding · 90m** — Weakest-pattern drill — 6 problems from your lowest-scoring pattern
- [ ] **Read · 60m** — Architecture patterns — monolith vs microservices, CQRS, saga, strangler fig
      `phase-5-system-design/02-architecture-patterns.md`
- [ ] **Quiz · 15m** — Quiz: Architecture patterns
- [ ] **Read · 40m** — gRPC & Protocol Buffers — and the REST/GraphQL/gRPC decision framework
      The service-to-service half of today's architecture theme. Four RPC patterns, mTLS, and why gRPC-Web exists. Increasingly asked in international interviews.
      `phase-2-apis-realtime-systems/05-grpc-protocol-buffers.md`
- [ ] **Design · 50m** — Architecture drill — Monolith to microservices migration plan

<a id="day-23"></a>
### Day 23 — Mixed-pattern speed & DDD / data architecture

*Pattern recognition speed is the real OA skill* · ~4h 35m

**Focus.** Random-order problems (no pattern label) — that is the actual test condition.

> **What a hiring manager is testing here.** In an OA nobody tells you it is a sliding window. Recognition speed is 80% of the score.

- [ ] **Coding · 90m** — Blind mixed set — 6 problems, pattern hidden
- [ ] **Read · 55m** — DDD & data architecture — bounded contexts, aggregates, CDC, streaming
      `phase-5-system-design/04-ddd-and-data-architecture.md`
- [ ] **Quiz · 15m** — Quiz: DDD & data architecture
- [ ] **Read · 35m** — Multi-tenancy & SaaS architecture
      Most remote backend roles you will apply to are SaaS, so "how do you isolate tenants?" is routine. The weak answer is "we filter by tenant_id in every query". The strong one is that this is necessary but insufficient, and names a mechanism that fails safe — Postgres Row-Level Security, so a forgotten filter returns nothing rather than everything. Note the connection-pool trap: set_config without the transaction-local flag leaks one tenant's context into the next request.
      `phase-5-system-design/09-multi-tenancy-and-saas-architecture.md`
- [ ] **Design · 50m** — HLD drill — Video streaming platform (Netflix-like)
- [ ] **Admin · 30m** — Apply to 4 roles

<a id="day-24"></a>
### Day 24 — Full OA simulation + reliability/cost architecture

*Dress rehearsal conditions* · ~4h 0m

**Focus.** A real 90-minute assessment window, then SLO/DR/FinOps depth.

> **What a hiring manager is testing here.** Cost architecture is the single most underrated senior skill in the BD market and in bootstrapped remote startups. Bring it up unprompted.

- [ ] **Mock · 90m** — Timed OA #4 — 90 min, 4 problems, full assessment conditions
- [ ] **Read · 55m** — Reliability, security & cost — SLOs, DR, chaos, zero trust, FinOps
      `phase-5-system-design/05-reliability-security-cost.md`
- [ ] **Quiz · 15m** — Quiz: Reliability & cost
- [ ] **Build · 50m** — Build 3/4 — observability and a cost number
      Structured logs, one metric, one trace, and a stated cost per request or per conversation. This is what turns a demo into evidence you have run something, which is exactly the gap the market analysis flags.
      `hands-on-projects/07-monitoring-alerting-setup.md`
- [ ] **Story · 30m** — STAR story #7 — disagreeing with a technical decision and how it resolved

<a id="day-25"></a>
### Day 25 — Architect-level scenarios & leadership signals

*The lead-title conversation* · ~4h 20m

**Focus.** ADRs, RFCs, tech debt, Conway's law, team topologies.

> **What a hiring manager is testing here.** The difference between senior and lead comp is whether you can show decisions that shaped a team, not just a service. Written artifacts are the proof.

- [ ] **Read · 60m** — Architect-level practice — ADRs, RFCs, tech radar, golden paths, RCA
      `phase-5-system-design/08-architect-level-practice.md`
- [ ] **Read · 45m** — DevOps operations — scaling, backup and production war stories
      The "run it in production" half: each section is written as situation → numbers → what we did → what we changed permanently. That is exactly the shape an interviewer wants back, so mine it for your incident and scaling stories.
      `phase-4-cloud-infrastructure/09-devops-operations.md`
- [ ] **Admin · 45m** — Write one real ADR from your own history
      Pick a decision you actually made (Kafka vs Rabbit, monolith split, Agora vs self-hosted). Context / options / decision / consequences. One page. Bring it to interviews.
      `phase-5-system-design/08-architect-level-practice.md`
- [ ] **Design · 50m** — Architecture drill — Multi-tenant SaaS platform
- [ ] **Coding · 60m** — Spaced review — 5 problems flagged for review

<a id="day-26"></a>
### Day 26 — AI/LLM integration & the 2026 differentiator

*The skill that moves you to the front of the remote queue* · ~3h 45m

**Focus.** RAG architecture, streaming responses, vector stores, cost and eval.

> **What a hiring manager is testing here.** In 2026 a huge share of remote backend postings mention LLM integration. A backend engineer who has shipped RAG with real cost controls is scarce and priced accordingly.

- [ ] **Read · 50m** — AI & LLM integrations — streaming, vector DBs, RAG
      `phase-2-apis-realtime-systems/06-ai-llm-integrations.md`
- [ ] **Design · 55m** — HLD drill — Design a RAG-backed support assistant
      Ingestion, chunking, embedding, retrieval, reranking, streaming, guardrails, eval, and cost per conversation.
- [ ] **Coding · 75m** — Blind mixed set — 5 problems
- [ ] **Quiz · 15m** — Quiz: AI/LLM integration
- [ ] **Admin · 30m** — Apply to 4 roles

<a id="day-27"></a>
### Day 27 — Full mock loop day

*Simulate an entire onsite* · ~3h 45m

**Focus.** Back to back: coding, design, behavioral — same day, no breaks between rounds.

> **What a hiring manager is testing here.** Onsite fatigue is real. People who never rehearse three rounds in a row fade in round three, which is usually the design or the bar-raiser.

- [ ] **Mock · 50m** — Round 1 — Live coding, 50 min, narrate every step
- [ ] **Mock · 50m** — Round 2 — System design, 45 min, recorded
- [ ] **Mock · 45m** — Round 3 — Behavioral, 45 min, 6 questions cold
- [ ] **Read · 45m** — Pattern-recognition table review (coding bank, part 1)
      Not solving today — recognising. Read the signal-to-pattern table and the complexity budget. Recognition speed is most of the OA score.
      `phase-0-online-assessments/03-coding-challenges-dsa-javascript.md`
- [ ] **Admin · 35m** — Self-grade all three rounds against the rubrics
      Write down the two sentences you wish you had said in each round. Those become your prepared lines.

<a id="day-28"></a>
### Day 28 — Negotiation, positioning & gap closing

*Do not leave money on the table* · ~4h 10m

**Focus.** Comp benchmarks, contractor vs FTE, and closing the two worst gaps the app has flagged.

> **What a hiring manager is testing here.** The single most common mistake BD candidates make in remote loops is naming a number first, anchored to local salary. Never do that.

- [ ] **Admin · 35m** — Read the compensation & negotiation playbook
- [ ] **Admin · 35m** — Script your comp conversation — 3 scenarios
      Recruiter asks first; they lowball anchored to BD rates; they ask for current salary. Write the exact sentences.
- [ ] **Coding · 75m** — Weakest-pattern drill — 5 problems
- [ ] **Quiz · 40m** — Mixed quiz — 40 questions, everything
- [ ] **Build · 45m** — Build 4/4 — publish it and put it to work
      Final README pass (problem, design, trade-offs, what you deliberately left out), pin the repo on GitHub, add it to the CV and LinkedIn, and write the two sentences you will say about it in an interview.
      `hands-on-projects/05-dockerize-nestjs-deploy-ecs.md`
- [ ] **Story · 20m** — Prepare your questions for the interviewer (5 strong ones)

## Week 5

<a id="day-29"></a>
### Day 29 — Company-specific preparation

*Tailor, do not repeat* · ~4h 0m

**Focus.** For your top 5 targets: their stack, their scale, their likely questions.

> **What a hiring manager is testing here.** Candidates who reference our actual engineering blog post get remembered. It costs 20 minutes and it works almost every time.

- [ ] **Admin · 75m** — Deep-research your top 5 targets
      Stack, funding, engineering blog, recent outages/launches, who interviews there. Write 5 lines per company in the Pipeline notes.
- [ ] **Design · 55m** — Design the product of your #1 target company
      If it is bKash, design the MFS ledger. If it is Pathao, design dispatch. Expect it to literally come up.
- [ ] **Coding · 75m** — Spaced review — 6 problems, all previously failed
- [ ] **Story · 35m** — Final STAR polish — all 7 stories under 3 minutes each

<a id="day-30"></a>
### Day 30 — Taper & launch

*Light load, high confidence* · ~3h 25m

**Focus.** Warm up, do not cram. Get the logistics right. Ship the applications.

> **What a hiring manager is testing here.** Nobody ever passed a loop because of what they learned on day 30. Plenty have failed because their microphone did not work.

- [ ] **Coding · 35m** — Warm-up set — 3 easy problems you have already solved
- [ ] **Quiz · 20m** — Confidence quiz — 20 questions from your strongest topics
- [ ] **Read · 30m** — Skim the advanced-pattern table (coding bank, part 2)
      Skim only, no solving. You are refreshing recognition, not learning anything new on day 30.
      `phase-0-online-assessments/03b-coding-challenges-advanced-patterns.md`
- [ ] **Admin · 30m** — Interview logistics check
      Camera, mic, lighting, backup internet (mobile hotspot), excalidraw account, IDE and screen share tested, water on the desk, phone silenced.
- [ ] **Admin · 60m** — Final application push — 10 roles
- [ ] **Admin · 30m** — Write your one-page cheat sheet
      Latency numbers, your 3 headline metrics, your 7 STAR titles, your 5 questions for them. One page. Read it before every loop.

---

## Coding bank by pattern

**Arrays & Hashing** (7)

- Two Sum — *easy*, frequency 5/5
- Contains Duplicate — *easy*, frequency 4/5
- Valid Anagram — *easy*, frequency 4/5
- Group Anagrams — *medium*, frequency 4/5
- Top K Frequent Elements — *medium*, frequency 4/5
- Product of Array Except Self — *medium*, frequency 4/5
- Longest Consecutive Sequence — *medium*, frequency 3/5

**Backtracking** (5)

- Subsets — *medium*, frequency 4/5
- Combination Sum — *medium*, frequency 4/5
- Permutations — *medium*, frequency 4/5
- Word Search — *medium*, frequency 4/5
- Palindrome Partitioning — *medium*, frequency 2/5

**Binary Search** (5)

- Search in Rotated Sorted Array — *medium*, frequency 5/5
- Binary Search — *easy*, frequency 4/5
- Koko Eating Bananas — *medium*, frequency 4/5
- Find Minimum in Rotated Sorted Array — *medium*, frequency 4/5
- Search a 2D Matrix — *medium*, frequency 3/5

**Bit Manipulation** (4)

- Missing Number — *easy*, frequency 3/5
- Single Number — *easy*, frequency 3/5
- Number of 1 Bits — *easy*, frequency 2/5
- Counting Bits — *easy*, frequency 2/5

**Dynamic Programming** (11)

- Coin Change — *medium*, frequency 5/5
- Climbing Stairs — *easy*, frequency 4/5
- House Robber — *medium*, frequency 4/5
- Longest Increasing Subsequence — *medium*, frequency 4/5
- Word Break — *medium*, frequency 4/5
- Longest Palindromic Substring — *medium*, frequency 4/5
- Longest Common Subsequence — *medium*, frequency 4/5
- House Robber II — *medium*, frequency 3/5
- Decode Ways — *medium*, frequency 3/5
- Unique Paths — *medium*, frequency 3/5
- Edit Distance — *hard*, frequency 3/5

**Graphs** (9)

- Number of Islands — *medium*, frequency 5/5
- Course Schedule — *medium*, frequency 5/5
- Rotting Oranges — *medium*, frequency 4/5
- Course Schedule II — *medium*, frequency 4/5
- Max Area of Island — *medium*, frequency 3/5
- Clone Graph — *medium*, frequency 3/5
- Pacific Atlantic Water Flow — *medium*, frequency 3/5
- Network Delay Time — *medium*, frequency 3/5
- Number of Connected Components — *medium*, frequency 3/5

**Greedy** (3)

- Maximum Subarray — *medium*, frequency 5/5
- Jump Game — *medium*, frequency 4/5
- Gas Station — *medium*, frequency 3/5

**Heap** (4)

- Kth Largest Element in an Array — *medium*, frequency 4/5
- K Closest Points to Origin — *medium*, frequency 3/5
- Task Scheduler — *medium*, frequency 3/5
- Find Median from Data Stream — *hard*, frequency 3/5

**Intervals** (4)

- Merge Intervals — *medium*, frequency 5/5
- Meeting Rooms II — *medium*, frequency 4/5
- Insert Interval — *medium*, frequency 3/5
- Non-overlapping Intervals — *medium*, frequency 3/5

**Linked List** (6)

- Reverse Linked List — *easy*, frequency 5/5
- Merge Two Sorted Lists — *easy*, frequency 4/5
- Linked List Cycle — *easy*, frequency 4/5
- Remove Nth Node From End of List — *medium*, frequency 4/5
- Reorder List — *medium*, frequency 3/5
- Merge k Sorted Lists — *hard*, frequency 3/5

**Node Practical** (16)

- Implement Promise.all — *medium*, frequency 5/5
- Async Pool (concurrency limiter) — *medium*, frequency 5/5
- LRU Cache — *medium*, frequency 5/5
- Retry with Exponential Backoff — *medium*, frequency 4/5
- Implement Debounce — *easy*, frequency 4/5
- Implement an EventEmitter — *medium*, frequency 4/5
- Token Bucket Rate Limiter — *medium*, frequency 4/5
- Promise with Timeout — *easy*, frequency 4/5
- Idempotent Request Handler — *medium*, frequency 4/5
- Implement Throttle — *easy*, frequency 3/5
- Deep Clone — *medium*, frequency 3/5
- Deep Equal — *medium*, frequency 3/5
- Memoize with a Custom Key — *easy*, frequency 3/5
- Flatten a Nested Object — *easy*, frequency 3/5
- Group By — *easy*, frequency 3/5
- Batching Queue — *medium*, frequency 3/5

**Sliding Window** (5)

- Longest Substring Without Repeating Characters — *medium*, frequency 5/5
- Best Time to Buy and Sell Stock — *easy*, frequency 4/5
- Longest Repeating Character Replacement — *medium*, frequency 3/5
- Permutation in String — *medium*, frequency 3/5
- Minimum Window Substring — *hard*, frequency 3/5

**Stack** (4)

- Valid Parentheses — *easy*, frequency 5/5
- Min Stack — *medium*, frequency 4/5
- Evaluate Reverse Polish Notation — *medium*, frequency 3/5
- Daily Temperatures — *medium*, frequency 3/5

**Trees** (11)

- Validate Binary Search Tree — *medium*, frequency 5/5
- Invert Binary Tree — *easy*, frequency 4/5
- Maximum Depth of Binary Tree — *easy*, frequency 4/5
- Binary Tree Level Order Traversal — *medium*, frequency 4/5
- Same Tree — *easy*, frequency 3/5
- Subtree of Another Tree — *easy*, frequency 3/5
- Balanced Binary Tree — *easy*, frequency 3/5
- Diameter of Binary Tree — *easy*, frequency 3/5
- Binary Tree Right Side View — *medium*, frequency 3/5
- Kth Smallest Element in a BST — *medium*, frequency 3/5
- Lowest Common Ancestor of a BST — *medium*, frequency 3/5

**Tries** (2)

- Implement Trie (Prefix Tree) — *medium*, frequency 3/5
- Design Add and Search Words — *medium*, frequency 3/5

**Two Pointers** (5)

- 3Sum — *medium*, frequency 5/5
- Valid Palindrome — *easy*, frequency 4/5
- Container With Most Water — *medium*, frequency 4/5
- Two Sum II — Sorted Input — *medium*, frequency 3/5
- Trapping Rain Water — *hard*, frequency 3/5

---

## Design drills

**HLD**

- URL Shortener (TinyURL) — easy, 45 min timebox
- Distributed Rate Limiter — medium, 45 min timebox
- News Feed / Timeline — medium, 45 min timebox
- Notification System at 41M Users — medium, 45 min timebox
- Chat System (WhatsApp-like) — medium, 45 min timebox
- File Storage & Sync (Dropbox-like) — medium, 45 min timebox
- Payment Processing (Stripe-like) — hard, 50 min timebox
- Mobile Financial Service (bKash / Nagad-like) — hard, 50 min timebox
- Distributed Job Scheduler — medium, 45 min timebox
- Video Streaming Platform (Netflix-like) — hard, 50 min timebox
- Ride Hailing / Dispatch (Pathao-like) — hard, 50 min timebox
- RAG-Backed Support Assistant — medium, 50 min timebox

**LLD**

- LLD — LRU Cache — easy, 30 min timebox
- LLD — Rate Limiter Class — medium, 35 min timebox
- LLD — Task Scheduler with Retries — medium, 35 min timebox
- LLD — In-Process Pub/Sub with At-Least-Once Delivery — medium, 35 min timebox

**ARCHITECTURE**

- Architecture — Monolith to Services Migration Plan — hard, 45 min timebox
- Architecture — Multi-Tenant SaaS Platform — hard, 45 min timebox

---

## Skills tracked

| Skill | Category | BD demand | Remote demand |
|---|---|---|---|
| TypeScript (advanced types) | Language & Runtime | 4/5 | 5/5 |
| Node.js internals (event loop, streams, workers) | Language & Runtime | 5/5 | 5/5 |
| NestJS (DI, pipeline, microservices) | Language & Runtime | 4/5 | 3/5 |
| Testing strategy (unit, integration, contract) | Language & Runtime | 3/5 | 5/5 |
| DSA pattern recognition under time | Problem Solving | 3/5 | 5/5 |
| SQL under assessment conditions | Problem Solving | 4/5 | 4/5 |
| Assessment platform fluency | Problem Solving | 3/5 | 5/5 |
| One-way video screens (Talview / HireVue) | Leadership | 2/5 | 4/5 |
| JS/Node practical implementations | Problem Solving | 4/5 | 5/5 |
| PostgreSQL (indexing, MVCC, query plans) | Data | 5/5 | 5/5 |
| Redis & caching failure modes | Data | 5/5 | 4/5 |
| Kafka / event streaming | Data | 3/5 | 4/5 |
| DynamoDB / MongoDB modelling | Data | 3/5 | 4/5 |
| Zero-downtime schema evolution | Data | 3/5 | 4/5 |
| System design (HLD) under a 45-min clock | Architecture | 4/5 | 5/5 |
| Low-level design / OOD | Architecture | 3/5 | 4/5 |
| Event-driven architecture (outbox, saga, idempotency) | Architecture | 4/5 | 5/5 |
| Distributed systems theory | Architecture | 2/5 | 4/5 |
| API design (REST, GraphQL, gRPC) | Architecture | 4/5 | 5/5 |
| Real-time systems (WebSockets, streaming) | Architecture | 3/5 | 3/5 |
| AWS (Lambda, API Gateway, AppSync, cost) | Platform | 4/5 | 5/5 |
| Docker & Kubernetes | Platform | 4/5 | 4/5 |
| Observability & SLOs | Platform | 3/5 | 5/5 |
| CI/CD & IaC | Platform | 4/5 | 4/5 |
| Security & compliance (OAuth2, GDPR, SOC 2) | Platform | 3/5 | 5/5 |
| LLM integration & RAG backends | 2026 Edge | 3/5 | 5/5 |
| Cost engineering / FinOps | 2026 Edge | 4/5 | 4/5 |
| ADRs, RFCs & technical writing | Leadership | 2/5 | 5/5 |
| Spoken English under technical pressure | Leadership | 2/5 | 5/5 |
| Mentoring & code review leadership | Leadership | 4/5 | 4/5 |
| Incident response & postmortems | Leadership | 3/5 | 5/5 |
| Compensation negotiation | Leadership | 3/5 | 5/5 |
