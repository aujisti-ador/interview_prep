import { PlanDaySeed } from './types';

/**
 * 30-day plan, written from the seat of a technical hiring manager who has run
 * Senior/Lead Backend loops for Node/NestJS/AWS roles.
 *
 * Structural bet: the candidate already has deep written material in this repo
 * (phases 1-5). The gap that kills people at his level is (a) the online
 * assessment filter and (b) turning depth into crisp, metric-backed narrative
 * under a 45-minute clock. So the plan is retrieval + drilling under time,
 * not first-pass learning.
 *
 * Daily shape: DSA block -> depth block -> design block -> narrative block,
 * with a four-session build thread running through weeks 2-4.
 *
 * Load is roughly 3.4-4.7h a day, median 4h. That is a real sprint, not a
 * casual schedule. If you only have 2.5h on a given day, cut in this order:
 * the `read` task first (you wrote most of those guides, you can skim), then
 * the quiz, then halve the DSA set. Never cut the DSA block entirely, never
 * skip the application tasks, and never drop a build session — the artifact is
 * one of the three highest-leverage things in the whole month.
 */
export const plan: PlanDaySeed[] = [
  // ------------------------------------------------------------------ WEEK 1
  {
    id: 1,
    week: 1,
    title: 'Baseline & honest diagnosis',
    theme: 'Measure before you train',
    focus: 'Take a cold timed OA and a cold system design. Whatever hurts is the plan.',
    hiringLens:
      'A recruiter screens you in 6 seconds on the resume and a machine screens you in 70 minutes on the OA. Neither cares how much you know — only what you can produce under a clock.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Cold OA simulation — 70 min, 3 problems, no hints',
        detail:
          'Two Sum, Valid Anagram, Longest Substring Without Repeating Characters. Do not look at hints or solutions. Record your real time per problem. This is your baseline, not a test of worth.',
        ref: 'practice?mode=timed',
        minutes: 70,
      },
      {
        kind: 'design',
        title: 'Cold system design — URL shortener, 45 min, out loud',
        detail:
          'Record yourself. You are grading: did you clarify requirements before drawing? Did you do capacity math? Did you name a trade-off unprompted?',
        ref: 'design/hld-url-shortener',
        minutes: 45,
      },
      {
        kind: 'admin',
        title: 'Read the market analysis end to end',
        detail: 'Understand the funnel you are about to walk into and where candidates at your level get cut.',
        ref: 'market',
        minutes: 25,
      },
      {
        kind: 'read',
        title: 'Platform playbook — how each assessment platform actually scores you',
        detail:
          'HackerRank, Codility, CodeSignal, TestGorilla, Talview, Mettl. Question types, timers, proctoring, and the Node stdin harness. Knowing the format is worth more than one extra pattern.',
        ref: 'phase-0-online-assessments/00-platform-playbook.md',
        minutes: 35,
      },
      {
        kind: 'admin',
        title: 'Set your target list — 15 BD, 15 remote',
        detail:
          'Add them in the Pipeline tab as wishlist. You cannot run a 30-day sprint against an abstract "get a job" goal.',
        ref: 'pipeline',
        minutes: 30,
      },
      {
        kind: 'behavioral',
        title: 'Write your 2-minute "tell me about yourself"',
        detail:
          'Structure: now (role + scale) -> arc (3 moves, each with a number) -> why this role. Under 120 seconds spoken. Time it.',
        ref: 'behavioral',
        minutes: 25,
      },
    ],
  },
  {
    id: 2,
    week: 1,
    title: 'Arrays, hashing & the resume rewrite',
    theme: 'The highest-frequency OA pattern + the highest-leverage document',
    focus: 'Hash-map patterns are ~30% of screening problems. Your resume is the only artifact 100% of interviewers read.',
    hiringLens:
      'I scan for: scale numbers, ownership verbs, and stack keywords in the first third. If I have to hunt for "41M users", you have already lost the fast lane.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Arrays & Hashing — 6 problems',
        detail: 'Contains Duplicate, Valid Anagram, Group Anagrams, Top K Frequent, Product Except Self, Longest Consecutive Sequence.',
        ref: 'practice?pattern=Arrays%20%26%20Hashing',
        minutes: 80,
      },
      {
        kind: 'read',
        title: 'JavaScript / TypeScript deep dive — event loop, closures, types',
        ref: 'phase-1-core-programming/01-javascript-typescript-deep-dive.md',
        minutes: 50,
      },
      { kind: 'quiz', title: 'Quiz: JavaScript / TypeScript (15 questions)', ref: 'quiz?topic=JavaScript%20%2F%20TypeScript', minutes: 15 },
      {
        kind: 'read',
        title: 'MCQ bank — JavaScript & TypeScript (75 questions)',
        detail:
          'The written bank behind the quiz. TestGorilla and iMocha draw from exactly this surface: coercion, hoisting, `this`, prototypes, generics.',
        ref: 'phase-0-online-assessments/01-mcq-bank-javascript-typescript.md',
        minutes: 40,
      },
      {
        kind: 'admin',
        title: 'Resume rewrite pass 1 — metrics on every bullet',
        detail:
          'Every bullet: verb + system + scale + outcome. "Built notification service" -> "Designed Kafka-backed notification service delivering 4M+/day to 41M subscribers, p99 under 2s". No bullet survives without a number or a named trade-off.',
        ref: 'playbook#resume',
        minutes: 45,
      },
    ],
  },
  {
    id: 3,
    week: 1,
    title: 'Two pointers & Node.js internals',
    theme: 'Pointer discipline + the questions that separate Node seniors from Node users',
    focus: 'Two-pointer problems and the event loop phases question that gets asked in almost every Node interview.',
    hiringLens:
      'Anyone can say "Node is single-threaded, non-blocking". A senior explains the phase order, where microtasks drain, and why a CPU-bound handler stalls 10k sockets.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Two Pointers — 5 problems',
        detail: 'Valid Palindrome, Two Sum II, 3Sum, Container With Most Water, Trapping Rain Water.',
        ref: 'practice?pattern=Two%20Pointers',
        minutes: 80,
      },
      {
        kind: 'read',
        title: 'Node.js fundamentals — event loop phases, streams, worker threads',
        ref: 'phase-1-core-programming/02-nodejs-fundamentals.md',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Quiz: Node.js internals', ref: 'quiz?topic=Node.js', minutes: 15 },
      {
        kind: 'read',
        title: 'MCQ bank — Node.js & backend (84 questions)',
        detail: 'libuv, streams, clustering, npm, HTTP semantics, auth, NestJS, caching. Any Node skill test lives here.',
        ref: 'phase-0-online-assessments/02-mcq-bank-nodejs-backend.md',
        minutes: 40,
      },
      {
        kind: 'design',
        title: 'LLD drill — LRU cache (30 min, code it)',
        ref: 'design/lld-lru-cache',
        minutes: 35,
      },
      {
        kind: 'behavioral',
        title: 'STAR story #1 — scaling to 41M users (Banglalink)',
        detail: 'Situation must include the constraint that made it hard. Result must include two numbers.',
        ref: 'behavioral',
        minutes: 25,
      },
    ],
  },
  {
    id: 4,
    week: 1,
    title: 'Sliding window & NestJS depth',
    theme: 'The pattern most people fumble live + your framework of record',
    focus: 'Window expand/contract invariants. And being able to defend NestJS DI, guards vs interceptors, and testing strategy.',
    hiringLens:
      'If NestJS is on your resume I will ask how request-scoped providers interact with performance, and what you put in an interceptor vs a guard vs a pipe. Vague answers here read as "framework user, not framework thinker".',
    tasks: [
      {
        kind: 'dsa',
        title: 'Sliding Window — 5 problems',
        detail: 'Best Time to Buy/Sell, Longest Substring Without Repeating, Longest Repeating Char Replacement, Permutation in String, Minimum Window Substring.',
        ref: 'practice?pattern=Sliding%20Window',
        minutes: 85,
      },
      {
        kind: 'read',
        title: 'NestJS mastery — DI, request pipeline, microservices, queues',
        ref: 'phase-1-core-programming/03-nestjs-mastery.md',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Quiz: NestJS', ref: 'quiz?topic=NestJS', minutes: 15 },
      {
        kind: 'behavioral',
        title: 'One-way video interview setup and the 90-second answer formula',
        detail:
          'Talview, HireVue and TestGorilla screens arrive early in the funnel and get no second take. Set up lighting, framing and audio once, then record two practice answers.',
        ref: 'phase-0-online-assessments/07-video-interview-and-psychometric.md',
        minutes: 45,
      },
      {
        kind: 'admin',
        title: 'LinkedIn rewrite — English-first, keyword dense',
        detail:
          'Headline formula: "Senior Backend Engineer | Node.js · NestJS · AWS · Kafka | Built for 41M users". About section: 4 short paragraphs, first line states scale.',
        ref: 'playbook#linkedin',
        minutes: 40,
      },
    ],
  },
  {
    id: 5,
    week: 1,
    title: 'Stacks & the Node practical round',
    theme: 'Stack patterns + the "implement this utility" round',
    focus: 'Node/backend OAs love "implement promiseAll / debounce / a concurrency pool". These are free points if drilled.',
    hiringLens:
      'The practical JS round is my cheapest high-signal filter. Implementing an async pool correctly tells me more about your Node judgment than any DP problem.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Stack — 4 problems',
        detail: 'Valid Parentheses, Min Stack, Evaluate RPN, Daily Temperatures.',
        ref: 'practice?pattern=Stack',
        minutes: 55,
      },
      {
        kind: 'dsa',
        title: 'Node practicals — 4 problems',
        detail: 'Implement Promise.all, Debounce, Async Pool (concurrency limiter), Retry with Backoff.',
        ref: 'practice?pattern=Node%20Practical',
        minutes: 60,
      },
      {
        kind: 'read',
        title: 'Node async & simulation tasks — the senior discriminators',
        detail:
          'The written companion to the practicals you just coded, including the CodeSignal growing-spec task that trips up experienced engineers.',
        ref: 'phase-0-online-assessments/03c-nodejs-async-and-simulation-tasks.md',
        minutes: 40,
      },
      {
        kind: 'read',
        title: 'Design patterns in practice — SOLID, repository, circuit breaker',
        ref: 'phase-1-core-programming/05-design-patterns-in-practice.md',
        minutes: 45,
      },
      {
        kind: 'behavioral',
        title: 'STAR story #2 — live streaming architecture (Right Tracks / Agora)',
        ref: 'behavioral',
        minutes: 25,
      },
    ],
  },
  {
    id: 6,
    week: 1,
    title: 'System design fundamentals + first real HLD',
    theme: 'The 7-step framework becomes muscle memory',
    focus: 'Requirements -> estimation -> API -> data model -> high level -> deep dive -> trade-offs. Every single time.',
    hiringLens:
      'The candidates who fail design rounds start drawing boxes in minute two. The ones who pass spend five minutes on requirements and scale numbers, and I relax immediately.',
    tasks: [
      {
        kind: 'read',
        title: 'System design fundamentals — framework, estimation, building blocks',
        ref: 'phase-5-system-design/01-system-design-fundamentals.md',
        minutes: 60,
      },
      {
        kind: 'design',
        title: 'HLD drill — Distributed rate limiter (45 min, timed)',
        ref: 'design/hld-rate-limiter',
        minutes: 50,
      },
      {
        kind: 'dsa',
        title: 'Mixed review — 4 problems from days 2-5',
        detail: 'Redo without looking. Anything you cannot re-derive in 20 minutes is not learned yet.',
        ref: 'practice?mode=review',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Quiz: System design fundamentals', ref: 'quiz?topic=System%20Design', minutes: 15 },
      {
        kind: 'admin',
        title: 'Back-of-envelope numbers — memorise the latency table',
        detail: 'L1/RAM/SSD/network round trip, and QPS-per-instance rules of thumb. You should never stall on arithmetic in a design round.',
        ref: 'phase-5-system-design/01-system-design-fundamentals.md',
        minutes: 20,
      },
      {
        kind: 'read',
        title: 'System design roadmap — orient yourself for weeks 2-4',
        detail: 'Skim only. Knowing the shape of what is coming makes each later design day land faster.',
        ref: 'phase-5-system-design/00-roadmap.md',
        minutes: 20,
      },
    ],
  },
  {
    id: 7,
    week: 1,
    title: 'Week 1 checkpoint',
    theme: 'Retrieval under time, then rest',
    focus: 'Timed retest of week 1 patterns + first application batch out the door.',
    hiringLens:
      'Applications are a pipeline with ~4-8% response rates. If you start applying in week 4 you have wasted the sprint. Start now — the early loops are your rehearsals.',
    tasks: [
      {
        kind: 'mock',
        title: 'Timed OA #1 — 70 min, 3 problems from week 1 patterns',
        detail:
          'Full-length simulations with a diagnostic scorecard are in phase-0-online-assessments/08-timed-mock-assessments.md if you want a platform-shaped paper instead.',
        ref: 'practice?mode=timed',
        minutes: 70,
      },
      {
        kind: 'admin',
        title: 'Apply to 8 roles (4 BD, 4 remote)',
        detail: 'Track each in Pipeline. Tailor the first resume bullet to the job description keyword set.',
        ref: 'pipeline',
        minutes: 60,
      },
      { kind: 'quiz', title: 'Mixed quiz — 25 questions, all week 1 topics', ref: 'quiz?mode=mixed', minutes: 25 },
      {
        kind: 'behavioral',
        title: 'Rehearse STAR #1 and #2 out loud, recorded',
        detail: 'Each under 3 minutes. Listen back once. Cut every sentence that has no fact in it.',
        ref: 'behavioral',
        minutes: 30,
      },
      {
        kind: 'read',
        title: 'Timed mock formats + the diagnostic scorecard',
        detail:
          'Five full-length platform simulations and a scorecard that names your weakest bucket. Use it to pick which platform to rehearse before a real invite.',
        ref: 'phase-0-online-assessments/08-timed-mock-assessments.md',
        minutes: 25,
      },
      { kind: 'admin', title: 'Review the week — mark weak patterns, adjust', ref: 'progress', minutes: 20 },
    ],
  },

  // ------------------------------------------------------------------ WEEK 2
  {
    id: 8,
    week: 2,
    title: 'Binary search & PostgreSQL depth',
    theme: 'Search-space thinking + the database round',
    focus: 'Binary search on answer (Koko, rotated arrays) and Postgres internals: MVCC, indexes, EXPLAIN.',
    hiringLens:
      'For a backend senior I will absolutely open a slow query and ask what you would do. "Add an index" is a junior answer. Naming the index type, the selectivity, and the write-amplification cost is a senior answer.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Binary Search — 5 problems',
        detail: 'Binary Search, Search 2D Matrix, Koko Eating Bananas, Search in Rotated Sorted Array, Find Minimum in Rotated Sorted Array.',
        ref: 'practice?pattern=Binary%20Search',
        minutes: 75,
      },
      {
        kind: 'read',
        title: 'PostgreSQL deep dive — MVCC, indexing, isolation, EXPLAIN',
        ref: 'phase-3-databases-data/01-postgresql-deep-dive.md',
        minutes: 60,
      },
      { kind: 'quiz', title: 'Quiz: PostgreSQL', ref: 'quiz?topic=PostgreSQL', minutes: 15 },
      {
        kind: 'dsa',
        title: 'SQL challenge bank — joins, aggregation, CTEs (20 problems)',
        detail:
          'Highest points-per-minute section on any mixed assessment, and the one most backend candidates skip. Write the queries, do not just read them.',
        ref: 'phase-0-online-assessments/04-sql-challenge-bank.md',
        minutes: 55,
      },
      {
        kind: 'design',
        title: 'HLD drill — Design a news feed (45 min)',
        ref: 'design/hld-news-feed',
        minutes: 50,
      },
      { kind: 'admin', title: 'Apply to 3 roles', ref: 'pipeline', minutes: 25 },
    ],
  },
  {
    id: 9,
    week: 2,
    title: 'Linked lists & Redis',
    theme: 'Pointer surgery + the caching round',
    focus: 'Linked list manipulation without leaking, and cache patterns including the failure modes.',
    hiringLens:
      'Cache-aside is table stakes. I am listening for stampede protection, negative caching, and what happens to your database the second Redis fails over.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Linked List — 5 problems',
        detail: 'Reverse Linked List, Merge Two Sorted Lists, Linked List Cycle, Remove Nth From End, Reorder List.',
        ref: 'practice?pattern=Linked%20List',
        minutes: 75,
      },
      {
        kind: 'read',
        title: 'Redis deep dive — structures, patterns, Redlock, persistence',
        ref: 'phase-3-databases-data/02-redis-deep-dive.md',
        minutes: 50,
      },
      { kind: 'quiz', title: 'Quiz: Redis & caching', ref: 'quiz?topic=Redis%20%26%20Caching', minutes: 15 },
      {
        kind: 'dsa',
        title: 'SQL part 2 — window functions, cohort and funnel analytics',
        detail:
          'The half of the SQL bank that actually separates candidates. Window functions come up constantly and almost nobody drills them.',
        ref: 'phase-0-online-assessments/04-sql-challenge-bank.md',
        minutes: 50,
      },
      { kind: 'quiz', title: 'Quiz: SQL under assessment conditions', ref: 'quiz?topic=SQL', minutes: 15 },
      {
        kind: 'read',
        title: 'Cache avalanche, penetration, thundering herd',
        ref: 'phase-4-cloud-infrastructure/07-performance-engineering.md',
        minutes: 30,
      },
      {
        kind: 'behavioral',
        title: 'STAR story #3 — Daraz voucher system + measured impact',
        ref: 'behavioral',
        minutes: 25,
      },
    ],
  },
  {
    id: 10,
    week: 2,
    title: 'Trees I & REST/API design',
    theme: 'Recursion discipline + the API design round',
    focus: 'Tree traversal in all three orders without thinking, plus idempotency and versioning.',
    hiringLens:
      'Ask any backend candidate to design a payment-adjacent endpoint. If idempotency keys do not come up unprompted, that is a real gap for fintech-heavy BD roles.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Trees — 6 problems',
        detail: 'Invert Tree, Max Depth, Same Tree, Subtree of Another Tree, Balanced Binary Tree, Diameter of Binary Tree.',
        ref: 'practice?pattern=Trees',
        minutes: 80,
      },
      {
        kind: 'read',
        title: 'REST API best practices — idempotency, versioning, rate limits, OWASP',
        ref: 'phase-2-apis-realtime-systems/02-rest-api-best-practices.md',
        minutes: 50,
      },
      { kind: 'quiz', title: 'Quiz: REST & API design', ref: 'quiz?topic=API%20Design', minutes: 15 },
      {
        kind: 'dsa',
        title: 'REST API & find-the-bug challenges',
        detail:
          "HackerRank's REST API question type and 16 debugging snippets. A distinct assessment format — you are given working-ish code and scored on the fix.",
        ref: 'phase-0-online-assessments/05-rest-api-and-debugging-challenges.md',
        minutes: 50,
      },
      {
        kind: 'design',
        title: 'LLD drill — Rate limiter class (token bucket + sliding window)',
        ref: 'design/lld-rate-limiter',
        minutes: 40,
      },
      { kind: 'admin', title: 'Apply to 3 roles', ref: 'pipeline', minutes: 25 },
    ],
  },
  {
    id: 11,
    week: 2,
    title: 'Trees II / BFS & event-driven architecture',
    theme: 'Level-order thinking + your strongest differentiator',
    focus: 'BFS on trees, and EDA depth: outbox, saga, idempotent consumers, DLQs.',
    hiringLens:
      'EDA is where your real experience lives. I want to hear about a duplicate you actually had to handle in production, not a definition of at-least-once delivery.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Trees & BFS — 5 problems',
        detail: 'Level Order Traversal, Right Side View, Validate BST, Kth Smallest in BST, LCA of a BST.',
        ref: 'practice?pattern=Trees',
        minutes: 80,
      },
      {
        kind: 'read',
        title: 'Event-driven architecture — outbox, saga, idempotency, schema evolution',
        ref: 'phase-2-apis-realtime-systems/04-event-driven-architecture.md',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Quiz: Event-driven architecture', ref: 'quiz?topic=Event-Driven%20Architecture', minutes: 15 },
      {
        kind: 'design',
        title: 'HLD drill — Notification system at 41M users (your home turf, 45 min)',
        detail: 'Do it timed and cold anyway. Familiar territory is where people ramble.',
        ref: 'design/hld-notification-system',
        minutes: 50,
      },
      {
        kind: 'project',
        title: 'Build 1/4 — walking skeleton, public repo, CI green',
        detail:
          'The artifact is one of the three highest-leverage things in this whole month: it closes the AI gap, the testing gap and the "show me your written work" gap at once. Today: pick the scope (a small RAG service over your own notes is ideal), create the repo, one endpoint, one real test, GitHub Actions running green, and a README that states the problem and the trade-offs. Ship it thin — the link becomes CV-usable today, and the next three sessions deepen it. If you would rather build something you already know cold, the walkthroughs in hands-on-projects/ (notification system, order processing, subscription chat, k8s ingress) are all fair alternatives.',
        ref: 'hands-on-projects/04-serverless-graphql-api-aws.md',
        minutes: 50,
      },
    ],
  },
  {
    id: 12,
    week: 2,
    title: 'Heaps & Kafka',
    theme: 'Top-K thinking + the streaming round',
    focus: 'Priority queue patterns, and Kafka semantics you can defend under pressure.',
    hiringLens:
      '"Exactly-once" is where I probe hardest. If you say Kafka gives exactly-once without qualifying transactions, idempotent producers, and the consumer side, you are quoting marketing.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Heap / Priority Queue — 4 problems',
        detail: 'Kth Largest Element, K Closest Points to Origin, Task Scheduler, Find Median from Data Stream.',
        ref: 'practice?pattern=Heap',
        minutes: 80,
      },
      {
        kind: 'read',
        title: 'Kafka deep dive — partitions, consumer groups, EOS, rebalancing',
        ref: 'phase-3-databases-data/03-kafka-deep-dive.md',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Quiz: Kafka & messaging', ref: 'quiz?topic=Kafka%20%26%20Messaging', minutes: 15 },
      {
        kind: 'read',
        title: 'RabbitMQ deep dive — and when you would pick it over Kafka',
        detail:
          '"Kafka vs RabbitMQ" is asked constantly and answered badly. Log versus smart broker: replay and retention favour Kafka, per-message routing and ack semantics favour Rabbit.',
        ref: 'phase-3-databases-data/04-rabbitmq-deep-dive.md',
        minutes: 35,
      },
      {
        kind: 'behavioral',
        title: 'STAR story #4 — a production incident you owned',
        detail: 'Detection -> mitigation -> root cause -> the systemic fix. Blameless framing. Name your own mistake if there was one; that reads as senior, not weak.',
        ref: 'behavioral',
        minutes: 30,
      },
      { kind: 'admin', title: 'Apply to 3 roles', ref: 'pipeline', minutes: 25 },
    ],
  },
  {
    id: 13,
    week: 2,
    title: 'Backtracking & real-time systems',
    theme: 'Exhaustive search + WebSockets at scale',
    focus: 'Subsets/permutations/combination templates, plus horizontal WebSocket scaling.',
    hiringLens:
      'Real-time is a differentiator on your CV. Expect "how do you scale Socket.io past one box" — the answer is the Redis adapter plus sticky sessions plus what breaks anyway.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Backtracking — 5 problems',
        detail: 'Subsets, Combination Sum, Permutations, Word Search, Palindrome Partitioning.',
        ref: 'practice?pattern=Backtracking',
        minutes: 85,
      },
      {
        kind: 'read',
        title: 'Real-time systems & Agora — WebSockets, SSE, scaling, recovery',
        ref: 'phase-2-apis-realtime-systems/03-realtime-systems-agora.md',
        minutes: 50,
      },
      { kind: 'quiz', title: 'Quiz: Real-time systems', ref: 'quiz?topic=Real-Time%20Systems', minutes: 15 },
      {
        kind: 'read',
        title: 'GraphQL & AWS AppSync — schema, resolvers, subscriptions, DataLoader',
        detail:
          'AppSync is on your CV, so it is fair game in any round. Subscriptions also belong with today\'s real-time theme. Know the N+1 story and how you bound query cost.',
        ref: 'phase-2-apis-realtime-systems/01-graphql-aws-appsync.md',
        minutes: 50,
      },
      {
        kind: 'design',
        title: 'HLD drill — Chat system (WhatsApp-like, 45 min)',
        ref: 'design/hld-chat-system',
        minutes: 50,
      },
    ],
  },
  {
    id: 14,
    week: 2,
    title: 'Week 2 checkpoint + first full mock',
    theme: 'Put it together under pressure',
    focus: 'Timed OA #2, a full 45-minute design mock, and a behavioral block.',
    hiringLens:
      'Halfway point. If your OA time-per-medium is still above 25 minutes, week 3 shifts weight toward DSA and away from reading.',
    tasks: [
      { kind: 'mock', title: 'Timed OA #2 — 75 min, 3 problems (weeks 1-2 patterns)', ref: 'practice?mode=timed', minutes: 75 },
      {
        kind: 'mock',
        title: 'Design mock — Design Instagram/news feed, 45 min, recorded',
        detail: 'Screen-share excalidraw. Grade yourself against the rubric afterwards, honestly.',
        ref: 'design/hld-news-feed',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Mixed quiz — 30 questions, weeks 1-2', ref: 'quiz?mode=mixed', minutes: 30 },
      { kind: 'admin', title: 'Apply to 6 roles + follow up on week 1 batch', ref: 'pipeline', minutes: 45 },
      { kind: 'admin', title: 'Review progress, rebalance week 3', ref: 'progress', minutes: 20 },
    ],
  },

  // ------------------------------------------------------------------ WEEK 3
  {
    id: 15,
    week: 3,
    title: 'Graphs I & MongoDB/DynamoDB',
    theme: 'Grid and adjacency traversal + NoSQL modelling',
    focus: 'Island/matrix BFS-DFS, and DynamoDB single-table design.',
    hiringLens:
      'For AWS-heavy roles, DynamoDB access-pattern-first modelling is a real skill test. If you design a Dynamo table like a relational schema, that is a no from me.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Graphs — 5 problems',
        detail: 'Number of Islands, Clone Graph, Max Area of Island, Rotting Oranges, Pacific Atlantic Water Flow.',
        ref: 'practice?pattern=Graphs',
        minutes: 85,
      },
      {
        kind: 'read',
        title: 'NoSQL — MongoDB & DynamoDB single-table design',
        ref: 'phase-3-databases-data/05-nosql-mongodb-dynamodb.md',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Quiz: NoSQL', ref: 'quiz?topic=NoSQL', minutes: 15 },
      {
        kind: 'read',
        title: 'ORMs & query builders — the N+1 problem and how to prove you fixed it',
        detail:
          'Prisma vs TypeORM vs Knex trade-offs, cursor pagination, soft delete, multi-tenancy. N+1 comes up in almost every backend code review round.',
        ref: 'phase-3-databases-data/07-orms-query-builders.md',
        minutes: 30,
      },
      { kind: 'design', title: 'HLD drill — Design a file storage service (Dropbox-like)', ref: 'design/hld-file-storage', minutes: 50 },
      { kind: 'admin', title: 'Apply to 3 roles', ref: 'pipeline', minutes: 25 },
    ],
  },
  {
    id: 16,
    week: 3,
    title: 'Graphs II / topological sort & AWS serverless',
    theme: 'Dependency ordering + the cloud round',
    focus: 'Course Schedule family and Lambda/API Gateway/AppSync cost and cold-start realities.',
    hiringLens:
      'For BD startups, cost is a first-class design constraint. A candidate who can say "that design costs roughly $X/month and here is the cheaper shape" stands out enormously.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Graphs / topological sort — 4 problems',
        detail: 'Course Schedule, Course Schedule II, Network Delay Time (Dijkstra), Number of Connected Components.',
        ref: 'practice?pattern=Graphs',
        minutes: 80,
      },
      {
        kind: 'read',
        title: 'AWS serverless deep dive — Lambda, API Gateway, AppSync, cost',
        ref: 'phase-4-cloud-infrastructure/02-aws-serverless-deep-dive.md',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Quiz: AWS & serverless', ref: 'quiz?topic=AWS', minutes: 15 },
      { kind: 'design', title: 'HLD drill — Payment processing (Stripe-like) with idempotency', ref: 'design/hld-payment-system', minutes: 50 },
      { kind: 'behavioral', title: 'STAR story #5 — a cost or performance optimisation with numbers', ref: 'behavioral', minutes: 25 },
    ],
  },
  {
    id: 17,
    week: 3,
    title: 'Intervals, greedy & Docker/K8s',
    theme: 'Sorting-first patterns + the infra round',
    focus: 'Interval merging templates, plus containers and orchestration you can defend.',
    hiringLens:
      'I do not need you to be an SRE. I need you to know what a readiness probe does, why your pod got OOMKilled, and how a rolling update can still drop requests.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Intervals & Greedy — 6 problems',
        detail: 'Insert Interval, Merge Intervals, Non-overlapping Intervals, Meeting Rooms II, Maximum Subarray, Jump Game.',
        ref: 'practice?pattern=Intervals',
        minutes: 85,
      },
      {
        kind: 'read',
        title: 'Docker fundamentals + Kubernetes basics',
        ref: 'phase-4-cloud-infrastructure/03-docker-fundamentals.md',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Quiz: Docker & Kubernetes', ref: 'quiz?topic=Docker%20%26%20Kubernetes', minutes: 15 },
      {
        kind: 'read',
        title: 'DevOps / cloud / Linux / Git MCQ bank — 90 questions',
        detail: 'TestGorilla and iMocha infra sections draw almost entirely from this surface. Cheap points if you have seen the format.',
        ref: 'phase-0-online-assessments/06-devops-cloud-mcq-bank.md',
        minutes: 40,
      },
      { kind: 'design', title: 'LLD drill — Task scheduler with retries and backoff', ref: 'design/lld-task-scheduler', minutes: 40 },
      { kind: 'admin', title: 'Apply to 3 roles', ref: 'pipeline', minutes: 25 },
    ],
  },
  {
    id: 18,
    week: 3,
    title: 'Dynamic programming I & observability',
    theme: 'The pattern that decides hard OAs + the round that proves you have run production',
    focus: '1-D DP templates, plus SLIs/SLOs/error budgets and incident response.',
    hiringLens:
      'Nothing separates "built features" from "ran a system" faster than SLO talk. If you can state an SLI, its SLO, and what you did when the error budget burned, you sound like a lead.',
    tasks: [
      {
        kind: 'dsa',
        title: '1-D Dynamic Programming — 6 problems',
        detail: 'Climbing Stairs, House Robber, House Robber II, Coin Change, Longest Increasing Subsequence, Word Break.',
        ref: 'practice?pattern=Dynamic%20Programming',
        minutes: 90,
      },
      {
        kind: 'read',
        title: 'Observability & reliability — logs/metrics/traces, SLOs, incidents',
        ref: 'phase-4-cloud-infrastructure/05-observability-reliability.md',
        minutes: 50,
      },
      { kind: 'quiz', title: 'Quiz: Observability & reliability', ref: 'quiz?topic=Observability', minutes: 15 },
      { kind: 'design', title: 'HLD drill — Distributed job scheduler / task queue', ref: 'design/hld-job-scheduler', minutes: 50 },
      {
        kind: 'project',
        title: 'Build 2/4 — the core feature, with tests that mean something',
        detail:
          'Ingestion + retrieval if you went the RAG route. Integration tests with testcontainers, not just unit tests on pure functions. This is the part reviewers actually read on a take-home.',
        ref: 'phase-1-core-programming/04-testing-and-quality.md',
        minutes: 50,
      },
    ],
  },
  {
    id: 19,
    week: 3,
    title: 'Dynamic programming II & security',
    theme: '2-D DP + the compliance conversation',
    focus: 'Grid and string DP, plus OAuth2/OIDC, secrets, GDPR — the questions international clients ask.',
    hiringLens:
      'For EU/US remote work, one wrong answer about data residency or token handling can end a loop. Know PKCE, know why you never put PII in a JWT.',
    tasks: [
      {
        kind: 'dsa',
        title: '2-D Dynamic Programming — 5 problems',
        detail: 'Unique Paths, Longest Common Subsequence, Edit Distance, Longest Palindromic Substring, Decode Ways.',
        ref: 'practice?pattern=Dynamic%20Programming',
        minutes: 90,
      },
      {
        kind: 'read',
        title: 'Security & compliance — OWASP, OAuth2/OIDC, GDPR, SOC 2, BD DSA',
        ref: 'phase-4-cloud-infrastructure/06-security-compliance.md',
        minutes: 50,
      },
      { kind: 'quiz', title: 'Quiz: Security & compliance', ref: 'quiz?topic=Security', minutes: 15 },
      { kind: 'design', title: 'HLD drill — Mobile financial service (bKash/Nagad-like)', ref: 'design/hld-mfs', minutes: 50 },
      { kind: 'behavioral', title: 'STAR story #6 — mentoring / raising the bar on a team', ref: 'behavioral', minutes: 25 },
    ],
  },
  {
    id: 20,
    week: 3,
    title: 'Tries, bit manipulation & distributed systems theory',
    theme: 'Niche-but-cheap patterns + the theory that anchors design rounds',
    focus: 'Trie implementation, bit tricks, and CAP/PACELC/consensus you can reason with, not recite.',
    hiringLens:
      'I do not ask you to implement Raft. I ask what happens when your leader is network-partitioned but still thinks it is the leader. Fencing tokens are the answer I am fishing for.',
    tasks: [
      {
        kind: 'dsa',
        title: 'Tries & Bit Manipulation — 6 problems',
        detail: 'Implement Trie, Design Add and Search Words, Number of 1 Bits, Counting Bits, Missing Number, Single Number.',
        ref: 'practice?pattern=Tries',
        minutes: 80,
      },
      {
        kind: 'read',
        title: 'Distributed systems — CAP/PACELC, consistency, Raft, clocks, sharding',
        ref: 'phase-5-system-design/03-distributed-systems.md',
        minutes: 60,
      },
      { kind: 'quiz', title: 'Quiz: Distributed systems', ref: 'quiz?topic=Distributed%20Systems', minutes: 15 },
      {
        kind: 'read',
        title: 'NGINX deep dive — reverse proxy, load balancing, TLS, rate limiting',
        detail:
          'Layer 4 vs Layer 7, the six balancing algorithms, WebSocket proxying, and NGINX as an ingress. Cheap, concrete, and disproportionately valued in BD infrastructure rounds.',
        ref: 'phase-4-cloud-infrastructure/01-nginx-deep-dive.md',
        minutes: 35,
      },
      { kind: 'design', title: 'LLD drill — Pub/Sub system with at-least-once delivery', ref: 'design/lld-pubsub', minutes: 40 },
      { kind: 'admin', title: 'Apply to 3 roles + follow-ups', ref: 'pipeline', minutes: 25 },
    ],
  },
  {
    id: 21,
    week: 3,
    title: 'Week 3 checkpoint',
    theme: 'Hard-mode retest',
    focus: 'A harder OA and a design mock with a hostile interviewer mindset.',
    hiringLens:
      'By now the shape of your loop performance is fixed. Week 4 is polish and narrative, not new material.',
    tasks: [
      { kind: 'mock', title: 'Timed OA #3 — 80 min, 3 problems including one hard', ref: 'practice?mode=timed', minutes: 80 },
      {
        kind: 'mock',
        title: 'Design mock — Ride-hailing (Pathao-like), 45 min, adversarial self-questioning',
        detail: 'After each decision, ask yourself "why not the alternative?" out loud and answer it.',
        ref: 'design/hld-ride-hailing',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Mixed quiz — 35 questions, weeks 1-3', ref: 'quiz?mode=mixed', minutes: 35 },
      { kind: 'behavioral', title: 'Rehearse all 6 STAR stories, timed', ref: 'behavioral', minutes: 35 },
      { kind: 'admin', title: 'Progress review + weak-pattern list for week 4', ref: 'progress', minutes: 20 },
    ],
  },

  // ------------------------------------------------------------------ WEEK 4
  {
    id: 22,
    week: 4,
    title: 'Weak-pattern surgery & architecture patterns',
    theme: 'Attack the bottom of your own scoreboard',
    focus: 'The app knows your weakest patterns. Spend the day there. Plus microservices trade-offs.',
    hiringLens:
      'A lead candidate who argues for a modular monolith with good reasons impresses me more than one who reflexively says microservices.',
    tasks: [
      { kind: 'dsa', title: 'Weakest-pattern drill — 6 problems from your lowest-scoring pattern', ref: 'practice?mode=weak', minutes: 90 },
      {
        kind: 'read',
        title: 'Architecture patterns — monolith vs microservices, CQRS, saga, strangler fig',
        ref: 'phase-5-system-design/02-architecture-patterns.md',
        minutes: 60,
      },
      { kind: 'quiz', title: 'Quiz: Architecture patterns', ref: 'quiz?topic=Architecture%20Patterns', minutes: 15 },
      {
        kind: 'read',
        title: 'gRPC & Protocol Buffers — and the REST/GraphQL/gRPC decision framework',
        detail:
          'The service-to-service half of today\'s architecture theme. Four RPC patterns, mTLS, and why gRPC-Web exists. Increasingly asked in international interviews.',
        ref: 'phase-2-apis-realtime-systems/05-grpc-protocol-buffers.md',
        minutes: 40,
      },
      { kind: 'design', title: 'Architecture drill — Monolith to microservices migration plan', ref: 'design/arch-monolith-migration', minutes: 50 },
    ],
  },
  {
    id: 23,
    week: 4,
    title: 'Mixed-pattern speed & DDD / data architecture',
    theme: 'Pattern recognition speed is the real OA skill',
    focus: 'Random-order problems (no pattern label) — that is the actual test condition.',
    hiringLens:
      'In an OA nobody tells you it is a sliding window. Recognition speed is 80% of the score.',
    tasks: [
      { kind: 'dsa', title: 'Blind mixed set — 6 problems, pattern hidden', ref: 'practice?mode=blind', minutes: 90 },
      {
        kind: 'read',
        title: 'DDD & data architecture — bounded contexts, aggregates, CDC, streaming',
        ref: 'phase-5-system-design/04-ddd-and-data-architecture.md',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Quiz: DDD & data architecture', ref: 'quiz?topic=DDD%20%26%20Data', minutes: 15 },
      { kind: 'design', title: 'HLD drill — Video streaming platform (Netflix-like)', ref: 'design/hld-video-streaming', minutes: 50 },
      { kind: 'admin', title: 'Apply to 4 roles', ref: 'pipeline', minutes: 30 },
    ],
  },
  {
    id: 24,
    week: 4,
    title: 'Full OA simulation + reliability/cost architecture',
    theme: 'Dress rehearsal conditions',
    focus: 'A real 90-minute assessment window, then SLO/DR/FinOps depth.',
    hiringLens:
      'Cost architecture is the single most underrated senior skill in the BD market and in bootstrapped remote startups. Bring it up unprompted.',
    tasks: [
      { kind: 'mock', title: 'Timed OA #4 — 90 min, 4 problems, full assessment conditions', ref: 'practice?mode=timed', minutes: 90 },
      {
        kind: 'read',
        title: 'Reliability, security & cost — SLOs, DR, chaos, zero trust, FinOps',
        ref: 'phase-5-system-design/05-reliability-security-cost.md',
        minutes: 55,
      },
      { kind: 'quiz', title: 'Quiz: Reliability & cost', ref: 'quiz?topic=Reliability%20%26%20Cost', minutes: 15 },
      {
        kind: 'project',
        title: 'Build 3/4 — observability and a cost number',
        detail:
          'Structured logs, one metric, one trace, and a stated cost per request or per conversation. This is what turns a demo into evidence you have run something, which is exactly the gap the market analysis flags.',
        ref: 'hands-on-projects/07-monitoring-alerting-setup.md',
        minutes: 50,
      },
      { kind: 'behavioral', title: 'STAR story #7 — disagreeing with a technical decision and how it resolved', ref: 'behavioral', minutes: 30 },
    ],
  },
  {
    id: 25,
    week: 4,
    title: 'Architect-level scenarios & leadership signals',
    theme: 'The lead-title conversation',
    focus: 'ADRs, RFCs, tech debt, Conway\'s law, team topologies.',
    hiringLens:
      'The difference between senior and lead comp is whether you can show decisions that shaped a team, not just a service. Written artifacts are the proof.',
    tasks: [
      {
        kind: 'read',
        title: 'Architect-level practice — ADRs, RFCs, tech radar, golden paths, RCA',
        ref: 'phase-5-system-design/08-architect-level-practice.md',
        minutes: 60,
      },
      {
        kind: 'read',
        title: 'DevOps operations — scaling, backup and production war stories',
        detail:
          'The "run it in production" half: each section is written as situation → numbers → what we did → what we changed permanently. That is exactly the shape an interviewer wants back, so mine it for your incident and scaling stories.',
        ref: 'phase-4-cloud-infrastructure/09-devops-operations.md',
        minutes: 45,
      },
      {
        kind: 'admin',
        title: 'Write one real ADR from your own history',
        detail: 'Pick a decision you actually made (Kafka vs Rabbit, monolith split, Agora vs self-hosted). Context / options / decision / consequences. One page. Bring it to interviews.',
        ref: 'phase-5-system-design/08-architect-level-practice.md',
        minutes: 45,
      },
      { kind: 'design', title: 'Architecture drill — Multi-tenant SaaS platform', ref: 'design/arch-multi-tenant-saas', minutes: 50,},
      { kind: 'dsa', title: 'Spaced review — 5 problems flagged for review', ref: 'practice?mode=review', minutes: 60 },
    ],
  },
  {
    id: 26,
    week: 4,
    title: 'AI/LLM integration & the 2026 differentiator',
    theme: 'The skill that moves you to the front of the remote queue',
    focus: 'RAG architecture, streaming responses, vector stores, cost and eval.',
    hiringLens:
      'In 2026 a huge share of remote backend postings mention LLM integration. A backend engineer who has shipped RAG with real cost controls is scarce and priced accordingly.',
    tasks: [
      {
        kind: 'read',
        title: 'AI & LLM integrations — streaming, vector DBs, RAG',
        ref: 'phase-2-apis-realtime-systems/06-ai-llm-integrations.md',
        minutes: 50,
      },
      {
        kind: 'design',
        title: 'HLD drill — Design a RAG-backed support assistant',
        detail: 'Ingestion, chunking, embedding, retrieval, reranking, streaming, guardrails, eval, and cost per conversation.',
        ref: 'design/hld-rag-assistant',
        minutes: 55,
      },
      { kind: 'dsa', title: 'Blind mixed set — 5 problems', ref: 'practice?mode=blind', minutes: 75 },
      { kind: 'quiz', title: 'Quiz: AI/LLM integration', ref: 'quiz?topic=AI%20%26%20LLM', minutes: 15 },
      { kind: 'admin', title: 'Apply to 4 roles', ref: 'pipeline', minutes: 30 },
    ],
  },
  {
    id: 27,
    week: 4,
    title: 'Full mock loop day',
    theme: 'Simulate an entire onsite',
    focus: 'Back to back: coding, design, behavioral — same day, no breaks between rounds.',
    hiringLens:
      'Onsite fatigue is real. People who never rehearse three rounds in a row fade in round three, which is usually the design or the bar-raiser.',
    tasks: [
      { kind: 'mock', title: 'Round 1 — Live coding, 50 min, narrate every step', ref: 'practice?mode=timed', minutes: 50 },
      { kind: 'mock', title: 'Round 2 — System design, 45 min, recorded', ref: 'design', minutes: 50 },
      { kind: 'mock', title: 'Round 3 — Behavioral, 45 min, 6 questions cold', ref: 'behavioral', minutes: 45 },
      {
        kind: 'read',
        title: 'Pattern-recognition table review (coding bank, part 1)',
        detail:
          'Not solving today — recognising. Read the signal-to-pattern table and the complexity budget. Recognition speed is most of the OA score.',
        ref: 'phase-0-online-assessments/03-coding-challenges-dsa-javascript.md',
        minutes: 45,
      },
      {
        kind: 'admin',
        title: 'Self-grade all three rounds against the rubrics',
        detail: 'Write down the two sentences you wish you had said in each round. Those become your prepared lines.',
        ref: 'progress',
        minutes: 35,
      },
    ],
  },
  {
    id: 28,
    week: 4,
    title: 'Negotiation, positioning & gap closing',
    theme: 'Do not leave money on the table',
    focus: 'Comp benchmarks, contractor vs FTE, and closing the two worst gaps the app has flagged.',
    hiringLens:
      'The single most common mistake BD candidates make in remote loops is naming a number first, anchored to local salary. Never do that.',
    tasks: [
      { kind: 'admin', title: 'Read the compensation & negotiation playbook', ref: 'playbook#negotiation', minutes: 35 },
      {
        kind: 'admin',
        title: 'Script your comp conversation — 3 scenarios',
        detail: 'Recruiter asks first; they lowball anchored to BD rates; they ask for current salary. Write the exact sentences.',
        ref: 'playbook#negotiation',
        minutes: 35,
      },
      { kind: 'dsa', title: 'Weakest-pattern drill — 5 problems', ref: 'practice?mode=weak', minutes: 75 },
      { kind: 'quiz', title: 'Mixed quiz — 40 questions, everything', ref: 'quiz?mode=mixed', minutes: 40 },
      {
        kind: 'project',
        title: 'Build 4/4 — publish it and put it to work',
        detail:
          'Final README pass (problem, design, trade-offs, what you deliberately left out), pin the repo on GitHub, add it to the CV and LinkedIn, and write the two sentences you will say about it in an interview.',
        ref: 'hands-on-projects/05-dockerize-nestjs-deploy-ecs.md',
        minutes: 45,
      },
      { kind: 'behavioral', title: 'Prepare your questions for the interviewer (5 strong ones)', ref: 'behavioral', minutes: 20 },
    ],
  },
  {
    id: 29,
    week: 5,
    title: 'Company-specific preparation',
    theme: 'Tailor, do not repeat',
    focus: 'For your top 5 targets: their stack, their scale, their likely questions.',
    hiringLens:
      'Candidates who reference our actual engineering blog post get remembered. It costs 20 minutes and it works almost every time.',
    tasks: [
      {
        kind: 'admin',
        title: 'Deep-research your top 5 targets',
        detail: 'Stack, funding, engineering blog, recent outages/launches, who interviews there. Write 5 lines per company in the Pipeline notes.',
        ref: 'pipeline',
        minutes: 75,
      },
      {
        kind: 'design',
        title: 'Design the product of your #1 target company',
        detail: 'If it is bKash, design the MFS ledger. If it is Pathao, design dispatch. Expect it to literally come up.',
        ref: 'design',
        minutes: 55,
      },
      { kind: 'dsa', title: 'Spaced review — 6 problems, all previously failed', ref: 'practice?mode=review', minutes: 75 },
      { kind: 'behavioral', title: 'Final STAR polish — all 7 stories under 3 minutes each', ref: 'behavioral', minutes: 35 },
    ],
  },
  {
    id: 30,
    week: 5,
    title: 'Taper & launch',
    theme: 'Light load, high confidence',
    focus: 'Warm up, do not cram. Get the logistics right. Ship the applications.',
    hiringLens:
      'Nobody ever passed a loop because of what they learned on day 30. Plenty have failed because their microphone did not work.',
    tasks: [
      { kind: 'dsa', title: 'Warm-up set — 3 easy problems you have already solved', ref: 'practice?mode=review', minutes: 35 },
      { kind: 'quiz', title: 'Confidence quiz — 20 questions from your strongest topics', ref: 'quiz?mode=mixed', minutes: 20 },
      {
        kind: 'read',
        title: 'Skim the advanced-pattern table (coding bank, part 2)',
        detail: 'Skim only, no solving. You are refreshing recognition, not learning anything new on day 30.',
        ref: 'phase-0-online-assessments/03b-coding-challenges-advanced-patterns.md',
        minutes: 30,
      },
      {
        kind: 'admin',
        title: 'Interview logistics check',
        detail: 'Camera, mic, lighting, backup internet (mobile hotspot), excalidraw account, IDE and screen share tested, water on the desk, phone silenced.',
        ref: 'playbook#logistics',
        minutes: 30,
      },
      { kind: 'admin', title: 'Final application push — 10 roles', ref: 'pipeline', minutes: 60 },
      {
        kind: 'admin',
        title: 'Write your one-page cheat sheet',
        detail: 'Latency numbers, your 3 headline metrics, your 7 STAR titles, your 5 questions for them. One page. Read it before every loop.',
        ref: 'playbook',
        minutes: 30,
      },
    ],
  },
];
