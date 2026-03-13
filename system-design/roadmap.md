# System Design Learning Plan (LLD + HLD + Architect)

A comprehensive, topic-wise learning plan covering Low-Level Design, High-Level Design, and System Architecture.

---

## Phase 1: Fundamentals

### Networking & Communication

- HTTP/HTTPS, TCP/UDP, WebSockets, gRPC
- REST vs GraphQL vs RPC
- DNS resolution, CDNs, load balancing algorithms
- Long polling, SSE (Server-Sent Events)

### Data & Storage Basics

- SQL vs NoSQL (when to use which)
- ACID properties, CAP theorem, BASE
- Indexing, sharding, replication, partitioning
- Normalization vs denormalization

---

## Phase 2: High-Level Design (HLD)

### Core Building Blocks

| Building Block | Topics to Cover |
|---|---|
| **Load Balancers** | L4 vs L7, consistent hashing, health checks |
| **Caching** | Cache-aside, write-through, write-back, eviction (LRU, LFU) |
| **Message Queues** | Kafka, RabbitMQ, pub/sub vs point-to-point, dead letter queues |
| **Databases** | Relational, document, columnar, graph, time-series |
| **CDN** | Push vs pull, edge caching, cache invalidation |
| **Blob Storage** | S3-like object stores, pre-signed URLs |
| **Search** | Elasticsearch, inverted indexes, tokenization |

### Architecture Patterns

- Monolith vs Microservices vs SOA
- Event-driven architecture, CQRS, Event Sourcing
- API Gateway pattern
- Service mesh (Istio, Envoy)
- Saga pattern for distributed transactions
- Strangler fig pattern (for migrations)

### Scalability & Reliability

- Horizontal vs vertical scaling
- Database replication (leader-follower, multi-leader)
- Sharding strategies (hash-based, range-based, geo-based)
- Rate limiting (token bucket, sliding window, leaky bucket)
- Circuit breaker, bulkhead, retry with backoff
- Consistency models (strong, eventual, causal)

### Observability

- Logging, metrics, tracing (the three pillars)
- Health checks, alerting, SLOs/SLIs/SLAs
- Distributed tracing (Jaeger, Zipkin)

### HLD Practice Problems (Increasing Difficulty)

1. URL Shortener
2. Paste Bin
3. Rate Limiter
4. Key-Value Store
5. Notification System
6. Chat System (WhatsApp)
7. News Feed (Twitter/Facebook)
8. Web Crawler
9. YouTube / Netflix (video streaming)
10. Google Drive / Dropbox
11. Search Autocomplete
12. Distributed Message Queue
13. Payment System
14. Ticket Booking (BookMyShow)
15. Google Maps / Uber

---

## Phase 3: Low-Level Design (LLD)

### OOP & Design Principles

- SOLID principles (know each one cold)
- DRY, KISS, YAGNI
- Composition over inheritance
- Dependency injection

### Design Patterns (Must-Know)

| Category | Patterns |
|---|---|
| **Creational** | Singleton, Factory, Abstract Factory, Builder, Prototype |
| **Structural** | Adapter, Decorator, Proxy, Facade, Composite |
| **Behavioral** | Strategy, Observer, Command, State, Template Method, Iterator, Chain of Responsibility |

### Concurrency

- Threads, locks, mutexes, semaphores
- Producer-consumer, reader-writer problems
- Thread pools, async/await patterns
- Deadlock detection & prevention

### LLD Practice Problems

1. Parking Lot System
2. Elevator System
3. Library Management System
4. Tic-Tac-Toe
5. Chess Game
6. Hotel Booking System
7. Vending Machine
8. ATM Machine
9. File System (in-memory)
10. LRU Cache
11. Rate Limiter (implementation)
12. Pub/Sub System
13. Splitwise (expense sharing)
14. Logging Framework
15. Task Scheduler / Cron

---

## Phase 4: Infrastructure & DevOps

- Containers & orchestration (Docker, Kubernetes)
- CI/CD pipelines
- Infrastructure as Code (Terraform)
- DNS, TLS/SSL, OAuth2/OIDC
- Blue-green / canary deployments
- GitOps (ArgoCD, Flux)

---

## Phase 5: System Architecture

### Architectural Styles (Deep Understanding)

- **Monolithic** — modular monolith, layered architecture
- **Microservices** — decomposition strategies (by domain, by subdomain)
- **Event-Driven** — choreography vs orchestration
- **Serverless** — FaaS, BaaS, cold start trade-offs
- **Space-Based Architecture** — in-memory data grids, processing units
- **Hexagonal / Ports & Adapters** — decoupling business logic from infrastructure
- **Clean Architecture** — dependency rule, use cases as first-class citizens
- **Cell-Based Architecture** — blast radius isolation (used by AWS, Slack)

### Domain-Driven Design (DDD)

- Bounded contexts & context mapping
- Aggregates, entities, value objects
- Domain events & integration events
- Ubiquitous language
- Strategic vs tactical DDD
- Anti-corruption layer
- Shared kernel, customer-supplier, conformist patterns

### Distributed Systems Theory

- **Consensus** — Paxos, Raft (know at least one deeply)
- **Clocks** — Lamport clocks, vector clocks, hybrid logical clocks
- **Conflict resolution** — CRDTs, last-writer-wins, merge functions
- **Failure modes** — Byzantine faults, partial failures, split-brain
- **Consistency models** — linearizability, serializability, snapshot isolation
- **Distributed transactions** — 2PC, 3PC, Saga (orchestration vs choreography)
- **Gossip protocols** — membership, failure detection

### Data Architecture

- **Data mesh** — domain ownership, data as a product, federated governance
- **Data lake vs data warehouse vs lakehouse**
- **Change Data Capture (CDC)** — Debezium, outbox pattern
- **Stream processing** — Kafka Streams, Flink, windowing strategies
- **Polyglot persistence** — right database for each bounded context
- **Data lineage & cataloging**
- **OLTP vs OLAP** — column stores, materialized views

---

## Phase 6: Non-Functional Architecture

### Security Architecture

- Zero-trust architecture
- OAuth2 / OIDC / SAML — token flows in depth
- mTLS, service identity (SPIFFE/SPIRE)
- Secret management (Vault, sealed secrets)
- Threat modeling (STRIDE)
- API security — OWASP API Top 10
- Data encryption at rest, in transit, in use

### Reliability Engineering

- **SLOs / SLIs / SLAs** — error budgets, burn rate alerting
- **Chaos engineering** — failure injection, game days
- **Disaster recovery** — RPO, RTO, active-active, active-passive, pilot light
- **Multi-region architecture** — data sovereignty, regional failover
- **Graceful degradation** — feature flags, circuit breakers, fallback responses
- **Capacity planning** — load testing, benchmarking, headroom

### Performance Architecture

- Latency budgets across the call chain
- Connection pooling, keep-alive tuning
- Async processing — where to use queues vs sync calls
- Database query optimization, read replicas, materialized views
- Hot/warm/cold data tiering
- Edge computing — move compute closer to users

### Cost Architecture

- Cloud cost modeling (compute, storage, network egress)
- Reserved vs spot vs on-demand trade-offs
- Right-sizing, autoscaling policies
- Build vs buy decisions with TCO analysis
- FinOps principles

---

## Phase 7: Organizational & Governance

### Architecture Decision Records (ADRs)

- When to write one, format, lifecycle
- Lightweight ADR templates (status, context, decision, consequences)

### Team Topology Alignment

- Conway's Law — aligning architecture to team boundaries
- Team Topologies: stream-aligned, platform, enabling, complicated-subsystem
- API contracts & interface ownership between teams

### Technology Radar & Standards

- Evaluating new technology (ADOPT, TRIAL, ASSESS, HOLD)
- Managing tech debt — quantifying, prioritizing, communicating
- Creating reference architectures & golden paths
- Platform engineering — internal developer platforms

### Compliance & Governance

- GDPR, CCPA — data residency, right to deletion
- Audit logging, immutable trails
- Regulatory architecture (PCI-DSS, HIPAA, SOC2)

---

## Phase 8: Architect-Level Practice Problems

These require combining HLD + LLD + organizational thinking:

| # | Problem | Key Architect Concerns |
|---|---|---|
| 1 | Multi-tenant SaaS platform | Isolation models, noisy neighbor, billing |
| 2 | Global e-commerce (Amazon-scale) | Multi-region, eventual consistency, inventory |
| 3 | Real-time bidding (ad-tech) | P99 < 100ms, data pipeline, fraud detection |
| 4 | Banking / payments platform | Strong consistency, audit, regulatory |
| 5 | IoT platform (millions of devices) | Protocol selection, edge compute, time-series |
| 6 | Healthcare data platform | HIPAA, HL7/FHIR, consent management |
| 7 | Migration: monolith to microservices | Strangler fig, data decomposition, team reorg |
| 8 | Multi-cloud strategy | Abstraction layers, vendor lock-in, blast radius |
| 9 | Developer platform (internal) | Golden paths, self-service, guardrails |
| 10 | Event-driven order management | Saga, compensation, idempotency, dead letters |

---

## The Framework for Any Design Interview

1. **Clarify requirements** — functional + non-functional (latency, throughput, availability)
2. **Back-of-envelope estimation** — QPS, storage, bandwidth
3. **API design** — define the contract
4. **Data model** — schema, access patterns
5. **High-level architecture** — draw the boxes
6. **Deep dive** — pick 1-2 components, go deep
7. **Trade-offs** — discuss what you'd change at 10x/100x scale

---

## Recommended Resources

### Core Books

| Book | Focus Area |
|---|---|
| "Designing Data-Intensive Applications" — Kleppmann | The single best resource for distributed systems & data |
| "System Design Interview" Vol 1 & 2 — Alex Xu | HLD practice with structured walkthroughs |
| "Head First Design Patterns" | LLD, design patterns with clear examples |
| "Fundamentals of Software Architecture" — Richards & Ford | Architecture styles, trade-off analysis, soft skills |
| "Building Evolutionary Architectures" — Ford, Parsons, Kua | Fitness functions, incremental change |
| "Designing Distributed Systems" — Burns | Patterns with real container/k8s examples |
| "Software Architecture: The Hard Parts" — Richards & Ford | Service decomposition, data ownership |
| "Building Microservices" 2nd ed — Sam Newman | Practical microservices architecture |
| "Implementing DDD" — Vaughn Vernon | Tactical + strategic DDD |
| "Team Topologies" — Skelton & Pais | Org design and architecture alignment |

### Online Resources

- Martin Fowler's blog (martinfowler.com) — evergreen architecture writing
- Engineering blogs: Netflix, Uber, Stripe, Cloudflare, Discord
- ByteByteGo (Alex Xu) — visual system design explanations
- Open-source projects — study real architectures

---

## Learning Progression Summary

```
Weeks 1-12:   Fundamentals -> HLD -> LLD -> Patterns        (Senior Engineer)
Weeks 13-18:  Distributed Systems -> DDD -> Data Arch       (Staff Engineer)
Weeks 19-24:  Security -> Reliability -> Cost -> Governance  (Architect)
Ongoing:      ADRs, tech radar, practice problems, reading
```

### Key Mindset Shift at Each Level

| Level | Focus |
|---|---|
| **Senior Engineer** | "How do I build this correctly?" |
| **Staff Engineer** | "What are the trade-offs between approaches?" |
| **Architect** | "What are the trade-offs, constraints, team impacts, and long-term consequences?" |

Every decision at the architect level is evaluated across **technical**, **organizational**, and **business** dimensions.
