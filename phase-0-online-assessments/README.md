# Phase 0 — Online Assessments (The Screening Gate)

> **The round nobody prepares for, that eliminates the most people.**
> Before any human reads your CV or joins a call, most senior/lead backend applications pass through an automated test on HackerRank, Codility, CodeSignal, **TestGorilla**, **Talview**, Mercer Mettl, iMocha, or DevSkiller. This phase decodes how those platforms ask questions, and drills the exact formats.

**Why it's Phase 0:** chronologically it comes *before* everything else in this repo. The rest of the repo makes you a strong engineer; this phase makes sure a machine lets you prove it.

---

## Files

| # | File | What it covers | Use it for |
|---|---|---|---|
| 0 | [Platform Playbook](00-platform-playbook.md) | How each platform works — question types, scoring models, timers, proctoring, plagiarism/AI detection, the Node stdin harness, time-allocation strategy | **Read first.** Decides what you study for a specific test |
| 1 | [MCQ Bank — JavaScript & TypeScript](01-mcq-bank-javascript-typescript.md) | 75 questions: event loop, coercion, hoisting/`this`, arrays/objects, prototypes, TS types & generics, ESM vs CJS | TestGorilla, iMocha, HackerRank MCQ, Karat rapid-fire |
| 2 | [MCQ Bank — Node.js & Backend](02-mcq-bank-nodejs-backend.md) | 84 questions: runtime & libuv, streams, clustering, npm, HTTP/REST design, auth & security, NestJS, caching/messaging, testing | Any Node-focused skill test |
| 3 | [Coding — Patterns Part 1](03-coding-challenges-dsa-javascript.md) · [Part 2](03b-coding-challenges-advanced-patterns.md) | 117 problems across 13 patterns, each with signal → strategy → code → trace → pitfalls | HackerRank, Codility, CodeSignal, live coding |
| 3c | [Node/Async & Simulation Tasks](03c-nodejs-async-and-simulation-tasks.md) | The senior discriminators: async pool, retry+jitter, LRU, EventEmitter, deep clone, log sessionisation, rate limiter, the **CodeSignal Level 1–4 growing-spec task** | DevSkiller, Turing, Karat, CodeSignal Task 4, take-homes |
| 4 | [SQL Challenge Bank](04-sql-challenge-bank.md) | 52 problems + 18 rapid-fire MCQs: joins, aggregation, CTEs, window functions, cohort/funnel analytics, EXPLAIN & indexing | **Highest points-per-minute section on any mixed test** |
| 5 | [REST API, Debugging & Code Review](05-rest-api-and-debugging-challenges.md) | HackerRank's REST API question type, the paginated-fetch helper, 16 find-the-bug snippets, the code-review round, take-home rubric | HackerRank REST API, TestGorilla debugging, DevSkiller |
| 6 | [MCQ Bank — DevOps, Cloud, Linux & Git](06-devops-cloud-mcq-bank.md) | 90 questions: Docker, Kubernetes, Linux/shell, Git, CI/CD, AWS, NGINX/TLS, observability | TestGorilla/iMocha infra tests, Mettl technical section |
| 7 | [Video, Aptitude & Psychometric](07-video-interview-and-psychometric.md) | One-way video mechanics, the 90-second answer formula, 24 real questions, SJTs, Big-5 tests, numerical/logical/verbal aptitude, English drills, recording setup | **Talview, HireVue, TestGorilla cognitive, Mettl aptitude** |
| 8 | [Timed Mock Assessments](08-timed-mock-assessments.md) | Five full-length simulations (HackerRank / TestGorilla / Codility / Talview / Mettl), diagnostic scorecard, 14-day plan | Find your weakest bucket before a real test does |
| 9 | [Take-Home Assignments](09-take-home-assignments.md) | The hidden rubric, scoping discipline, project structure, the README and TRADEOFFS docs, commit hygiene, the follow-up call, when to decline | **Proxify, Toptal, European product companies** — at senior level this has largely replaced the timed test |
| 10 | [The Reverse Interview](10-reverse-interview-bank.md) | Questions *you* ask, by who is in the room; the diagnostic set that tells you whether to accept; red flags; the closing question | Every round from the recruiter screen onward |

> **9 and 10 are the human-facing filters that bracket the automated ones.** Files 0–8 get you
> past a machine. A take-home is what replaces that machine at senior level, and your own
> questions are scored in every round that follows.

---

## Start Here

**You have a test scheduled.** → [00-platform-playbook.md](00-platform-playbook.md), find your platform, follow its study order.

**You have two weeks.** → Take [Mock A](08-timed-mock-assessments.md#mock-a--hackerrank-enterprise-screen-90-min) cold today, fill in the [scorecard](08-timed-mock-assessments.md#diagnostic-scorecard), then follow the [14-day plan](08-timed-mock-assessments.md#the-14-day-plan).

**You have one weekend.**
- Day 1: [00](00-platform-playbook.md) + all of [01](01-mcq-bank-javascript-typescript.md) and [02](02-mcq-bank-nodejs-backend.md) + [SQL window functions](04-sql-challenge-bank.md#tier-5--window-functions)
- Day 2: [coding patterns 1–6](03-coding-challenges-dsa-javascript.md) + [03c async tasks](03c-nodejs-async-and-simulation-tasks.md) + [Mock A](08-timed-mock-assessments.md) under a timer

**Highest-ROI single action:** earn the free HackerRank certifications — **Node.js (Intermediate)**, **SQL (Advanced)**, **Problem Solving (Intermediate)**. Recruiters filter candidate searches by those badges, and [02](02-mcq-bank-nodejs-backend.md), [04](04-sql-challenge-bank.md), and [03](03-coding-challenges-dsa-javascript.md) map directly onto them.

---

## How This Connects to the Rest of the Repo

| Phase 0 file | Deepens into |
|---|---|
| [01 JS/TS MCQ](01-mcq-bank-javascript-typescript.md) | [Phase 1 — JavaScript/TypeScript Deep Dive](../phase-1-core-programming/01-javascript-typescript-deep-dive.md) |
| [02 Node MCQ](02-mcq-bank-nodejs-backend.md) | [Phase 1 — Node.js Fundamentals](../phase-1-core-programming/02-nodejs-fundamentals.md), [NestJS Mastery](../phase-1-core-programming/03-nestjs-mastery.md) |
| [03c growing-spec / LRU](03c-nodejs-async-and-simulation-tasks.md) | [Phase 5 — LLD Practice Problems](../phase-5-system-design/07-lld-practice-problems.md) |
| [04 SQL](04-sql-challenge-bank.md) | [Phase 3 — PostgreSQL Deep Dive](../phase-3-databases-data/01-postgresql-deep-dive.md), [Migrations](../phase-3-databases-data/06-database-migrations-schema-evolution.md) |
| [05 REST/debugging](05-rest-api-and-debugging-challenges.md) | [Phase 2 — REST API Best Practices](../phase-2-apis-realtime-systems/02-rest-api-best-practices.md), [Event-Driven Architecture](../phase-2-apis-realtime-systems/04-event-driven-architecture.md) |
| [06 DevOps MCQ](06-devops-cloud-mcq-bank.md) | [Phase 4 — Docker](../phase-4-cloud-infrastructure/03-docker-fundamentals.md), [Kubernetes](../phase-4-cloud-infrastructure/04-kubernetes-basics.md), [Observability](../phase-4-cloud-infrastructure/05-observability-reliability.md) |
| [07 video/behavioural](07-video-interview-and-psychometric.md) | Phase 6 — Behavioural & Market Fit ([prep.md](../prep.md)) |
| [08 mocks — design questions](08-timed-mock-assessments.md) | [Phase 5 — HLD Practice Problems](../phase-5-system-design/06-hld-practice-problems.md) |
| [09 take-home](09-take-home-assignments.md) | [Phase 1 — Testing & Quality](../phase-1-core-programming/04-testing-and-quality.md), [Design Patterns](../phase-1-core-programming/05-design-patterns-in-practice.md); the finished repo becomes [Selected Work](../resume/02-linkedin-and-profiles.md#7-making-two-repos-count) |
| [10 reverse interview](10-reverse-interview-bank.md) | [Resume — Outreach & the salary question](../resume/03-outreach-and-referrals.md) |

---

## Rules That Beat Technique

1. **Never leave a blank.** Partial credit plus no negative marking makes guessing strictly positive EV.
2. **Brute force is a score.** An elegant-but-unfinished solution is zero.
3. **Read the constraint (`n ≤ ?`) before choosing an algorithm.** It tells you the required complexity.
4. **Submit early, optimise after.** "Run" is not "Submit".
5. **Assume proctoring is on.** No tab switching, no pasting, no AI in a proctored test — plagiarism and AI-code detection are standard now, and a flag ends the process.
6. **The weakest test in a bundle is what sinks you.** For most engineers that's the cognitive/aptitude section, not the code.
