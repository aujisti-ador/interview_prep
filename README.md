# Senior / Lead Backend Engineer — Interview Preparation

> Comprehensive interview prep for **Senior/Lead Backend roles** targeting Bangladesh and international remote markets.
> Stack: Node.js, NestJS, TypeScript, AWS Serverless, PostgreSQL, Redis, Kafka, RabbitMQ, Docker, Kubernetes.

**Total Content:** 25 guides + 7 project walkthroughs | 80,000+ lines | 200+ Q&A sections with code examples

---

## Table of Contents

- [Preparation Plan](#preparation-plan)
- [Phase 1: Core Programming & Languages](#phase-1-core-programming--languages-week-12)
- [Phase 2: APIs & Real-Time Systems](#phase-2-apis--real-time-systems-week-23)
- [Phase 3: Databases & Data Management](#phase-3-databases--data-management-week-34)
- [Phase 4: Cloud & Infrastructure](#phase-4-cloud--infrastructure-week-45)
- [Hands-On Projects](#hands-on-projects-practice-throughout)
- [Phase 5: System Design & Architecture](#phase-5-system-design--architecture-week-57) *(coming soon)*
- [Phase 6: Behavioral, Leadership & Market Fit](#phase-6-behavioral-leadership--market-fit-week-68) *(coming soon)*

---

## Preparation Plan

| # | Resource | Description |
|---|----------|-------------|
| 0 | [prep.md](prep.md) | Master checklist — timeline, daily split, resources, all phases outlined |

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

## Phase 5: System Design & Architecture (Week 5–7)

*Coming soon — will cover:*
- Microservices architecture deep dive
- 10+ international system design problems (URL shortener, chat, payment system, etc.)
- BD-relevant designs (notification service, MFS, e-commerce)
- Technical leadership (RFCs, ADRs, technical debt management)

---

## Phase 6: Behavioral, Leadership & Market Fit (Week 6–8)

*Coming soon — will cover:*
- STAR stories from real experience
- BD market preparation (bKash/Nagad integration, BTRC, salary benchmarks)
- International remote readiness (interview formats, async communication, salary negotiation)
- Mock interview strategies

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
