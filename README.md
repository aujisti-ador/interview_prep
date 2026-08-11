# Senior / Lead Backend Engineer — Interview Preparation

> Comprehensive interview prep for **Senior/Lead Backend roles** targeting Bangladesh and international remote markets.
> Stack: Node.js, NestJS, TypeScript, AWS Serverless, PostgreSQL, Redis, Kafka, RabbitMQ, Docker, Kubernetes.

**Total Content:** 45 guides + 7 project walkthroughs | 100,000+ lines | 290+ Q&A sections, 34 worked system design problems, 117 solved coding-interview problems, 250+ screening-test MCQs, 52 SQL challenges, 5 full-length timed mocks

---

## Table of Contents

- [Preparation Plan](#preparation-plan)
- [Resume, Profiles & Outreach](#resume-profiles--outreach)
- [Phase 0: Online Assessments & Coding Interviews](#phase-0-online-assessments--coding-interviews-week-0-ongoing)
- [Phase 1: Core Programming & Languages](#phase-1-core-programming--languages-week-12)
- [Phase 2: APIs & Real-Time Systems](#phase-2-apis--real-time-systems-week-23)
- [Phase 3: Databases & Data Management](#phase-3-databases--data-management-week-34)
- [Phase 4: Cloud & Infrastructure](#phase-4-cloud--infrastructure-week-45)
- [Phase 5: System Design & Architecture](#phase-5-system-design--architecture-week-57)
- [Phase 6: Behavioral, Leadership & Market Fit](#phase-6-behavioral-leadership--market-fit-week-68)
- [Hands-On Projects](#hands-on-projects-practice-throughout)

---

## Preparation Plan

| # | Resource | Description |
|---|----------|-------------|
| 0 | [prep.md](prep.md) | Master checklist — timeline, daily split, resources, all phases outlined |
| 1 | [30-DAY-PLAN.md](30-DAY-PLAN.md) | Day-by-day 30-day sprint — 163 scheduled tasks, each linked to the guide it draws on |
| 2 | [job-cracker/](job-cracker/) | **The platform.** Dockerised study + testing + progress tracker built around this repo |
| 3 | [resume/](resume/README.md) | **The artifacts.** Resume system, master template, LinkedIn/GitHub, outreach scripts — the documents that run on every application |

---

## Job Cracker — the interactive platform

```bash
cd job-cracker && make up      # → http://localhost:8080
```

A self-hosted app that turns this repo into a trackable 30-day sprint. Everything below is
still the source material; the app decides what you do today, runs your code, scores you, and
remembers.

| | |
|---|---|
| **Today / Plan** | 30 days, 163 tasks, each with a hiring-manager note on what the round is actually testing |
| **Library** | Every guide in this repo, readable in the app — full-text search across all 59 files, per-document TOC, syntax highlighting, working cross-links |
| **Practice** | 101 coding problems with real test cases executed in-browser — timed, weak-pattern, blind and spaced-review modes |
| **Quiz** | 136 recall questions across 21 topics, scored with explanations |
| **Design** | 18 timed design drills with weighted rubrics you score yourself against |
| **Behavioral** | STAR bank with 14 prompts, each carrying "what good looks like" and "red flags" |
| **Skills** | 32 skills rated against market demand; gap = `(demand − level) × demand` |
| **Pipeline** | Application tracker with funnel conversion rates |
| **Market analysis** | Where you get cut in the funnel, comp bands, channel strategy |

Setup, architecture and how to edit the content: [job-cracker/README.md](job-cracker/README.md).

---

## Resume, Profiles & Outreach

> Everything else in this repo is knowledge you might be asked about. These are the documents a
> stranger actually reads — and they gate all 97,000 lines behind them.

| Guide | Covers |
|---|---|
| [The Resume System](resume/00-resume-system.md) | How resumes are read by ATS, recruiter and hiring manager; the 6-second scan; the `verb + system + scale + outcome` formula; recovering numbers you think you don't have; what separates a Senior resume from a Lead one; layout rules; the seven failure modes; tailoring at volume; BD vs international remote |
| [The Master Resume](resume/01-master-resume.md) | The fill-in template and a worked example; the bullet bank organised by the dimension each bullet proves; summary-line variants per posting type; the Selected Work section; a 90-minute filling session |
| [LinkedIn, GitHub & the Public Surface](resume/02-linkedin-and-profiles.md) | Headline and About that survive recruiter search; the GitHub profile README; making two repos count; the written-English problem and the four cheapest fixes for it |
| [Outreach, Referrals & Follow-ups](resume/03-outreach-and-referrals.md) | The volume arithmetic; the two-sentence note; three referral scripts; cold outreach to hiring managers; the salary question asked early; follow-ups; after the interview; after a rejection; a weekly rhythm |

**Start here if you have one hour:** [the bullet formula](resume/00-resume-system.md#4-the-bullet-formula)
and [the six angles for recovering numbers](resume/00-resume-system.md#5-getting-numbers-when-you-think-you-have-none).

---

## Phase 0: Online Assessments & Coding Interviews (Week 0 / Ongoing)

> **The gate before the gate.** Most candidates are filtered by an automated coding test before a human ever reads their CV. Run this phase in parallel with everything else.

| # | Guide | Topics | Problems |
|---|-------|--------|----------|
| 0 | [Online Assessment Platform Playbook](phase-0-online-assessments/00-platform-playbook.md) | HackerRank, Codility, CodeSignal, TestGorilla, Talview, Mercer Mettl, iMocha, DevSkiller, Karat/CoderPad, Turing/Toptal/Arc/Andela funnels, scoring models, proctoring, time allocation, Node.js submission harness | — |
| 1 | [Coding Interview — Problem Solving in JS (Part 1)](phase-0-online-assessments/03-coding-challenges-dsa-javascript.md) | The 6-step ritual, pattern-recognition table, complexity budget, JS interview toolkit + traps · **Hashing & frequency counting, prefix/running values, two pointers, sliding window, strings & ad-hoc, stack & monotonic stack, binary search (incl. on the answer), linked lists** | 55 (P1–P55) |
| 2 | [Coding Interview — Advanced Patterns (Part 2)](phase-0-online-assessments/03b-coding-challenges-advanced-patterns.md) | **Trees & recursion, heaps & top-K, greedy, intervals, backtracking, dynamic programming, graphs, bit manipulation/math/matrix** · 4-week practice plan, timed-assessment triage, Top 40 must-do list, stuck-recovery script | 62 (P56–P117) |
| 3 | [Node/Async & Simulation Tasks](phase-0-online-assessments/03c-nodejs-async-and-simulation-tasks.md) | The senior discriminators: implement `Promise.all`, concurrency-limited async pool, retry with backoff+jitter, O(1) LRU, debounce/throttle, EventEmitter, deep clone with cycles · log sessionisation, transaction validation, rate-limiter simulation · **the CodeSignal Level 1–4 growing-spec task** · edge-case checklist, complexity cheat sheet | 10 tasks + 1 multi-level |
| 4 | [MCQ Bank — JavaScript & TypeScript](phase-0-online-assessments/01-mcq-bank-javascript-typescript.md) | Output prediction & event loop, coercion/equality, hoisting/TDZ/closures/`this`, arrays & built-ins, prototypes & classes, TypeScript (`unknown` vs `any`, `never`, utility types, `satisfies`, generics, decorator metadata), ESM vs CommonJS | 75 MCQs |
| 5 | [MCQ Bank — Node.js & Backend](phase-0-online-assessments/02-mcq-bank-nodejs-backend.md) | libuv thread pool, streams & backpressure, clustering vs worker threads, npm/packaging, HTTP semantics & REST design, idempotency, auth & security (JWT, bcrypt, OWASP), NestJS pipeline & DI, caching/Kafka/isolation levels, testing | 84 MCQs |
| 6 | [SQL Challenge Bank](phase-0-online-assessments/04-sql-challenge-bank.md) | Select/aggregate/join tiers, NULL & anti-join traps, CTEs & recursion, **window functions** (top-N per group, running totals, LAG, sessionisation, gaps & islands), cohort retention, funnels, EXPLAIN reading, indexing & keyset pagination | 52 + 18 MCQs |
| 7 | [REST API, Debugging & Code Review](phase-0-online-assessments/05-rest-api-and-debugging-challenges.md) | HackerRank's REST API question type + universal paginated-fetch helper, 429/retry/timeout handling · **16 find-the-bug snippets** (races, injection, leaks, mass assignment, cache defects, shutdown) · code-review priority ladder · DevSkiller/take-home playbook & rubric | 6 + 16 |
| 8 | [MCQ Bank — DevOps, Cloud, Linux & Git](phase-0-online-assessments/06-devops-cloud-mcq-bank.md) | Docker layers/multi-stage/exit codes, Kubernetes probes & QoS & zero-downtime, Linux triage, Git recovery & workflows, CI/CD & DORA, AWS (SG vs NACL, SQS, RDS, cost), NGINX/TLS/mTLS, observability & SLOs | 90 MCQs |
| 9 | [Video, Aptitude & Psychometric](phase-0-online-assessments/07-video-interview-and-psychometric.md) | Talview/HireVue one-way video mechanics, the 90-second answer formula, **24 real questions**, situational judgement tests, Big-5/culture-fit inventories, numerical & logical & verbal aptitude, data interpretation, English fluency drills, recording setup | 24 Q + 40 drills |
| 10 | [Timed Mock Assessments](phase-0-online-assessments/08-timed-mock-assessments.md) | Five full-length simulations — HackerRank enterprise (90 min), TestGorilla bundle (45 min), Codility/Toptal (60 min), Talview video (20 min), Mettl BD corporate (120 min) — with answer keys, diagnostic scorecard and a 14-day plan | 5 mocks |
| 11 | [Take-Home Assignments](phase-0-online-assessments/09-take-home-assignments.md) | The rubric you are not shown, scoping discipline, the 4-hour time budget, senior-reading project structure, testing depth, the README and TRADEOFFS documents, commit hygiene, the follow-up call, 7 assignment archetypes, when and how to decline | 2 checklists |
| 12 | [The Reverse Interview](phase-0-online-assessments/10-reverse-interview-bank.md) | Questions *you* ask — by who is in the room (recruiter, hiring manager, engineers, principal, CTO), the diagnostic set that decides whether to accept, remote-specific and lead-level questions, reading the answers, red flags, and the closing question | ~70 questions |

**Every coding problem follows one format:** Question → Signal (how to recognise it) → Strategy (the insight, in plain English) → JavaScript solution (commented) → Trace table → Complexity & Pitfalls. All 117 solutions are verified against 309 test assertions including edge cases.

**Start here:** [phase-0-online-assessments/README.md](phase-0-online-assessments/README.md) — index, platform-by-platform study order, and the "one weekend before a test" plan.

---

## Phase 1: Core Programming & Languages (Week 1–2)

| # | Guide | Topics | Q&As |
|---|-------|--------|------|
| 1 | [JavaScript / TypeScript Deep Dive](phase-1-core-programming/01-javascript-typescript-deep-dive.md) | Event loop, closures, prototypes, async/await, promises, modules, TypeScript generics, utility types, conditional types, discriminated unions, WeakMap, promise concurrency, immutability | 24 |
| 2 | [Node.js Fundamentals](phase-1-core-programming/02-nodejs-fundamentals.md) | Streams, buffers, child processes, clustering, worker threads, memory leaks, GC, event loop phases, graceful shutdown, security, profiling | 19 |
| 3 | [NestJS Mastery](phase-1-core-programming/03-nestjs-mastery.md) | Modules, DI, guards, interceptors, pipes, filters, middleware, decorators, microservices, testing, caching (Redis), transactions, cron/scheduling, Bull queues, config validation, circular deps | 19+ |
| 4 | [Testing & Quality](phase-1-core-programming/04-testing-and-quality.md) | Jest, mocks/stubs/spies, TDD, testing pyramid, integration tests (Supertest, testcontainers), E2E, async/event testing, database testing, code quality, mutation testing | 13 |
| 5 | [Design Patterns in Practice](phase-1-core-programming/05-design-patterns-in-practice.md) | SOLID, Strategy, Observer, Factory, Singleton, Decorator, Adapter, Repository, DTO, Unit of Work, Circuit Breaker, NestJS request pipeline, CQRS, Clean/Hexagonal Architecture | 14 |

---

## Phase 2: APIs & Real-Time Systems (Week 2–3)

| # | Guide | Topics | Q&As |
|---|-------|--------|------|
| 1 | [GraphQL & AWS AppSync](phase-2-apis-realtime-systems/01-graphql-aws-appsync.md) | Schema design, resolvers, subscriptions, DataLoader, AppSync (VTL/JS resolvers), Cognito auth, caching, federation, query security, error handling, cursor pagination | 16 |
| 2 | [REST API Best Practices](phase-2-apis-realtime-systems/02-rest-api-best-practices.md) | HTTP methods, status codes, versioning, pagination, rate limiting, idempotency, JWT/OAuth2, OWASP Top 10, webhooks, API gateway pattern, backward compatibility, OpenAPI/Swagger | 15 |
| 3 | [Real-Time Systems & Agora.io](phase-2-apis-realtime-systems/03-realtime-systems-agora.md) | WebSockets, SSE, long polling, Socket.io rooms/namespaces, Agora tokens/channels, RTMP, live streaming architecture, horizontal scaling (Redis adapter), connection recovery, memory management | 15 |
| 4 | [Event-Driven Architecture](phase-2-apis-realtime-systems/04-event-driven-architecture.md) | Events vs commands, Kafka/RabbitMQ/Redis, event sourcing, CQRS, saga pattern, outbox pattern, idempotency, schema registry (Avro/Protobuf), partition rebalancing, event versioning, DLQ handling, testing EDA | 16 |
| 5 | [gRPC & Protocol Buffers](phase-2-apis-realtime-systems/05-grpc-protocol-buffers.md) | Protobuf schema, 4 RPC patterns, NestJS gRPC, error handling, auth (mTLS/JWT), performance, gRPC-Web, microservices communication, gRPC vs REST decision framework | 11 |
| 6 | [AI & LLM Integrations](phase-2-apis-realtime-systems/06-ai-llm-integrations.md) | Integrating OpenAI/Anthropic APIs, Streaming responses (SSE), Vector Databases (Pinecone, pgvector), Basic RAG architecture | 3 |

---

## Phase 3: Databases & Data Management (Week 3–4)

| # | Guide | Topics | Q&As |
|---|-------|--------|------|
| 1 | [PostgreSQL Deep Dive](phase-3-databases-data/01-postgresql-deep-dive.md) | MVCC, indexing (B-tree, GIN, GiST), EXPLAIN, transactions/ACID, isolation levels, joins, normalization, JSONB, partitioning, replication/HA, CTEs, window functions, full-text search, NestJS integration, security | 15 |
| 2 | [Redis Deep Dive](phase-3-databases-data/02-redis-deep-dive.md) | Data structures, caching patterns, Redlock, Pub/Sub, Streams, Lua scripting, persistence (RDB/AOF), clustering, rate limiting, session management, memory optimization, NestJS integration | 14 |
| 3 | [Apache Kafka Deep Dive](phase-3-databases-data/03-kafka-deep-dive.md) | Architecture, topics/partitions, producers, consumers, exactly-once semantics, Kafka Streams/KSQL, Connect, security, performance tuning, microservices patterns, NestJS integration, operations | 13 |
| 4 | [RabbitMQ Deep Dive](phase-3-databases-data/04-rabbitmq-deep-dive.md) | Exchange types, queues, acknowledgments, DLQs, messaging patterns, clustering/HA, performance tuning, NestJS integration, security, RabbitMQ vs Kafka | 12 |
| 5 | [NoSQL — MongoDB & DynamoDB](phase-3-databases-data/05-nosql-mongodb-dynamodb.md) | CAP theorem, MongoDB schema patterns, indexing (9 types), aggregation pipeline, Mongoose/NestJS, sharding, DynamoDB single-table design, GSI/LSI, Streams, Global Tables, SDK v3 | 14 |
| 6 | [Database Migrations & Schema Evolution](phase-3-databases-data/06-database-migrations-schema-evolution.md) | Prisma/TypeORM/Knex migrations, zero-downtime (expand-contract), safe vs dangerous operations, backfill strategies, schema versioning, CI pipeline | 11 |
| 7 | [ORMs & Query Builders](phase-3-databases-data/07-orms-query-builders.md) | Prisma vs TypeORM vs Knex, N+1 problem, query optimization, cursor pagination, soft delete, multi-tenancy, testing strategies | 10 |
| 8 | [Database Architecture Fundamentals](phase-3-databases-data/08-database-architecture-fundamentals.md) | CAP Theorem, PACELC Theorem, Sharding vs Partitioning, Read Replica lag mitigation, MVCC Concurrency Control | 6 |

---

## Phase 4: Cloud & Infrastructure (Week 4–5)

| # | Guide | Topics | Q&As |
|---|-------|--------|------|
| 1 | [NGINX Deep Dive](phase-4-cloud-infrastructure/01-nginx-deep-dive.md) | Reverse proxy, load balancing (6 algorithms), SSL/TLS, rate limiting, caching, security headers, WebSocket proxy, Docker/K8s ingress, API gateway, performance tuning | 13 |
| 2 | [AWS Serverless Deep Dive](phase-4-cloud-infrastructure/02-aws-serverless-deep-dive.md) | Lambda (cold starts, concurrency, layers), API Gateway, AppSync, Cognito, S3, CloudWatch/X-Ray, Step Functions, EventBridge, cost optimization, CDK/SAM | 11 |
| 3 | [Docker Fundamentals](phase-4-cloud-infrastructure/03-docker-fundamentals.md) | Images/Dockerfile, multi-stage builds, networking, volumes, Compose, security, dev vs prod, ECS/Fargate, CI/CD with ECR, troubleshooting | 10 |
| 4 | [Kubernetes Basics](phase-4-cloud-infrastructure/04-kubernetes-basics.md) | Pods/probes, Deployments, Services, ConfigMaps/Secrets, Namespaces, StatefulSets, HPA/VPA/KEDA, Helm, Ingress, deployment strategies, service mesh (Istio), EKS | 14 |
| 5 | [Observability & Reliability](phase-4-cloud-infrastructure/05-observability-reliability.md) | Three pillars (logs/metrics/traces), structured logging, Prometheus, OpenTelemetry, SLIs/SLOs/SLAs, alerting, incident management, health checks, chaos engineering | 9 |
| 6 | [Security & Compliance](phase-4-cloud-infrastructure/06-security-compliance.md) | OWASP Top 10, JWT/OAuth2/RBAC/ABAC, secrets management, GDPR, SOC 2, BD Digital Security Act, supply chain security, infrastructure security, data protection | 10 |
| 7 | [Performance Engineering](phase-4-cloud-infrastructure/07-performance-engineering.md) | Load testing (k6), Node.js profiling (clinic.js), database optimization, caching, worker threads, auto-scaling, benchmarking, capacity planning | 10 |
| 8 | [CI/CD & DevOps](phase-4-cloud-infrastructure/08-cicd-devops.md) | GitHub Actions, Jenkins, Terraform, Prometheus+Grafana, Git workflows, release management, feature flags, environment management, DORA metrics, GitOps | 9 |
| 9 | [DevOps Operations](phase-4-cloud-infrastructure/09-devops-operations.md) | Autoscaling (HPA/KEDA) in production, connection-pool exhaustion, read replicas, cache failure modes, backup strategy & restore drills, RPO/RTO & region failover, golden signals, cardinality/cost control, on-call & incident command, capacity planning, zero-downtime migrations & rollbacks, scenario drills | 10 |

---

## Phase 5: System Design & Architecture (Week 5–7)

| # | Guide | Topics | Problems |
|---|-------|--------|----------|
| 0 | [Roadmap](phase-5-system-design/00-roadmap.md) | Full learning plan — fundamentals → HLD → LLD → architecture → governance, with book/resource list | — |
| 1 | [System Design Fundamentals](phase-5-system-design/01-system-design-fundamentals.md) | The 7-step framework, requirements, back-of-envelope estimation, API design, data modelling, networking (TCP/UDP, HTTP/1–3, TLS), REST vs GraphQL vs gRPC vs WebSocket vs SSE, DNS/CDN, load balancing, consistent hashing, caching patterns & failure modes, datastore selection, blob storage, search, queues, trade-off framing | 15 Q&A |
| 2 | [Architecture Patterns](phase-5-system-design/02-architecture-patterns.md) | Monolith vs microservices vs SOA, modular monolith, service decomposition, hexagonal/clean architecture, EDA, choreography vs orchestration, CQRS, event sourcing, saga, outbox, API gateway & BFF, service discovery & mesh, resilience patterns, strangler fig, serverless, cell-based | 17 Q&A |
| 3 | [Distributed Systems](phase-5-system-design/03-distributed-systems.md) | Fallacies, CAP & PACELC, consistency models, isolation levels, replication, quorums, Raft, split brain & fencing tokens, Lamport/vector/hybrid clocks, CRDTs, sharding & resharding, distributed locks, rate limiting algorithms, 2PC vs saga, gossip/SWIM, failure modes at scale | 17 Q&A |
| 4 | [DDD & Data Architecture](phase-5-system-design/04-ddd-and-data-architecture.md) | Strategic vs tactical DDD, bounded contexts, context mapping & ACL, ubiquitous language, entities/value objects/aggregates, domain vs integration events, repositories, event storming, OLTP vs OLAP, lakehouse, CDC/Debezium, stream processing & watermarks, Lambda vs Kappa, data mesh, polyglot persistence, governance & GDPR erasure | 17 Q&A |
| 5 | [Reliability, Security & Cost](phase-5-system-design/05-reliability-security-cost.md) | SLIs/SLOs/error budgets, burn-rate alerting, RPO/RTO & DR, multi-region, graceful degradation, chaos engineering, capacity planning, deployment safety, incident management, zero trust, OAuth2/OIDC & PKCE, mTLS/SPIFFE, secrets, STRIDE, envelope encryption, multi-tenancy, FinOps, latency budgets, build vs buy | 19 Q&A |
| 6 | [HLD Practice Problems](phase-5-system-design/06-hld-practice-problems.md) | URL shortener, rate limiter, notification system (41M users), chat, news feed, payments, **MFS (bKash/Nagad)**, video streaming, file storage, autocomplete, web crawler, ride-hailing (Pathao), ticket booking, **live streaming (Agora)**, **voucher system (Daraz)** | 15 designs |
| 7 | [LLD Practice Problems](phase-5-system-design/07-lld-practice-problems.md) | LLD method, Node.js concurrency (async mutex, per-key locking, races across `await`), parking lot, elevator, vending machine, LRU cache, rate limiter, pub/sub, Splitwise, logging framework, task scheduler, file system + 7 rapid-fire designs | 19 designs |
| 8 | [Architect-Level Practice](phase-5-system-design/08-architect-level-practice.md) | ADRs, RFCs, Conway's Law & Team Topologies, tech radar, technical debt, golden paths, code review, RCA/postmortems, compliance architecture — plus multi-tenant SaaS, global e-commerce, real-time bidding, monolith migration, IoT, healthcare, developer platform, multi-cloud | 18 topics |

---

## Phase 6: Behavioral, Leadership & Market Fit (Week 6–8)

| # | Focus | Notes |
|---|-------|-------|
| 1 | Behavioral stories | STAR stories for leadership, incident response, mentoring, trade-offs |
| 2 | BD market fit | Cost optimization, local compliance, telecom/fintech constraints, Bangladeshi salary context |
| 3 | International remote readiness | Remote interview formats, async communication, timezone collaboration, contract negotiation |
| 4 | Mock interview practice | Technical + behavioral mocks, system design drills, English communication |

> Phase 6 prepares you for leadership-level interviews by combining technical depth with communication, decision-making, and market awareness.

---

## Hands-On Projects (Practice Throughout)

Descriptive project walkthroughs with architecture diagrams, pseudo configs, data flows, and interview talking points. No runnable source code — designed for whiteboard-style understanding.

| # | Project | Stack | Maps To | Time |
|---|---------|-------|---------|------|
| 1 | [Real-Time Notification System](hands-on-projects/01-realtime-notification-system.md) | NestJS + Kafka + Redis + Socket.io + Bull | Banglalink BL-Power (41M users) | 10–12h |
| 2 | [Event-Driven Order Processing](hands-on-projects/02-event-driven-order-processing.md) | NestJS + Kafka + PostgreSQL + Redis | Daraz e-commerce, saga pattern | 8–10h |
| 3 | [GraphQL Subscription Chat](hands-on-projects/03-graphql-subscription-chat.md) | NestJS + Apollo + Redis Pub/Sub + PostgreSQL | Common system design question | 6–8h |
| 4 | [Serverless GraphQL API on AWS](hands-on-projects/04-serverless-graphql-api-aws.md) | AppSync + Lambda + DynamoDB + Cognito + CDK | AWS serverless, BD startup cost optimization | 8–10h |
| 5 | [Dockerize NestJS + Deploy to ECS](hands-on-projects/05-dockerize-nestjs-deploy-ecs.md) | Docker + ECR + ECS Fargate + ALB + RDS + GitHub Actions | Production deployment pattern | 6–8h |
| 6 | [K8s Cluster with Minikube + NGINX](hands-on-projects/06-kubernetes-minikube-nginx-ingress.md) | Minikube + kubectl + Helm + NGINX Ingress | K8s fundamentals, EKS readiness | 6–8h |
| 7 | [Production Monitoring & Alerting](hands-on-projects/07-monitoring-alerting-setup.md) | Prometheus + Grafana + Loki + AlertManager | Observability, SLIs/SLOs, on-call | 5–6h |

Each project includes: architecture diagrams, step-by-step flows, database schemas, scaling strategies, failure handling, BD context, and interview talking points.

---

## How to Use This Repo

1. **Follow the phases in order** — each builds on the previous
2. **Read each guide** — Q&A format simulates real interviews
3. **Practice explaining** answers out loud (record yourself)
4. **Check off items** in [prep.md](prep.md) as you complete them
5. **Focus on trade-offs** — senior engineers are judged on "why", not just "how"

## Study Schedule (Suggested)

| Time Block | Activity |
|-----------|----------|
| 40% | Theory — Read guides, understand concepts |
| 30% | Coding — LeetCode, build mini-projects |
| 20% | System Design — Practice on excalidraw/draw.io |
| 10% | Behavioral — STAR stories, mock interviews |

---

*Built for [Fazle Rabbi Ador](https://github.com/fazlerabbiador) — Senior/Lead Backend Engineer interview preparation targeting BD + international remote roles.*
