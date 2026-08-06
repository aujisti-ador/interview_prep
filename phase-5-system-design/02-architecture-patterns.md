# Architecture Patterns & Styles — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with decision frameworks, diagrams, and NestJS/TypeScript examples
> **Last Updated:** 2026-08-06

---

## Table of Contents

1. [Monolith vs Microservices vs SOA](#q1-monolith-vs-microservices-vs-soa)
2. [The Modular Monolith](#q2-the-modular-monolith)
3. [Decomposing a System into Services](#q3-decomposing-a-system-into-services)
4. [Layered, Hexagonal & Clean Architecture](#q4-layered-hexagonal--clean-architecture)
5. [Event-Driven Architecture](#q5-event-driven-architecture)
6. [Choreography vs Orchestration](#q6-choreography-vs-orchestration)
7. [CQRS](#q7-cqrs)
8. [Event Sourcing](#q8-event-sourcing)
9. [Saga Pattern](#q9-saga-pattern)
10. [Outbox Pattern & Dual-Write](#q10-outbox-pattern--dual-write)
11. [API Gateway & BFF](#q11-api-gateway--bff)
12. [Service Discovery & Service Mesh](#q12-service-discovery--service-mesh)
13. [Resilience Patterns](#q13-resilience-patterns)
14. [Strangler Fig — Migrating a Monolith](#q14-strangler-fig--migrating-a-monolith)
15. [Serverless Architecture](#q15-serverless-architecture)
16. [Cell-Based Architecture](#q16-cell-based-architecture)
17. [Quick Reference](#quick-reference)

---

## Q1: Monolith vs Microservices vs SOA

### Q: When do you choose microservices, and when is it the wrong call?

**A:** The honest senior answer: **microservices are an organisational solution to an organisational problem, priced in technical complexity.** They exist so that N teams can deploy independently. If you have one team, you are paying the entire bill and receiving none of the benefit.

| | Monolith | Microservices |
|---|---|---|
| Deployment | One artefact, one pipeline | N artefacts, N pipelines |
| Team scaling | Contention on one codebase | Independent ownership |
| Technology | One stack | Per-service choice (and per-service ops burden) |
| Transactions | Local ACID transactions | Sagas, eventual consistency |
| Refactoring across boundaries | Compiler-assisted rename | Coordinated multi-repo release |
| Latency | In-process function call (~ns) | Network hop (~0.5–5 ms) |
| Debugging | One stack trace | Distributed tracing required |
| Availability math | Single availability figure | **Multiplies down the call chain** |
| Testing | Fast, local, deterministic | Contract tests + integration environments |
| Infra cost | Low | High (per-service redundancy, mesh, observability) |
| Failure blast radius | Whole app | One service (if bulkheaded correctly) |

**Choose microservices when at least two of these are true:**
- More than ~3–4 teams contending on one codebase, and release coordination is the bottleneck.
- Parts of the system have genuinely different scaling profiles (a video transcoder vs a settings CRUD).
- Parts have different availability or compliance requirements (payments needs PCI isolation).
- Different domains need genuinely different technology (an ML service in Python next to a Node API).
- You already have the platform: CI/CD, centralised logging, tracing, service discovery, on-call rotation.

**Choose a monolith when:**
- Under ~20 engineers.
- The domain boundaries are still moving (they always are, early on — and getting boundaries wrong in microservices is 10× more expensive to fix than in a monolith).
- You need strong transactional consistency across most operations.
- Cost matters (a very real constraint for a BD startup: one ECS service + one RDS instance versus twelve services, a mesh, and a Kafka cluster).

**SOA vs microservices** — the distinction interviewers occasionally ask: classic SOA centred on an **Enterprise Service Bus** that owned routing, transformation and orchestration, with services often sharing a database. Microservices push that logic into the services themselves ("smart endpoints, dumb pipes") and insist on a database per service. SOA services were typically coarse-grained and organisation-wide; microservices are bounded-context-sized.

**The line to deliver:** *"I'd start with a modular monolith with clear internal boundaries, and extract services when a specific boundary shows a specific pressure — a scaling profile that differs by 10×, a team that's blocked on release coordination, or a compliance boundary. Extracting from a well-modularised monolith is straightforward; un-distributing a bad microservice split is not."*

### Q: What is a "distributed monolith" and how do you spot one?

**A:** The worst of both worlds: the operational complexity of microservices with the coupling of a monolith. Symptoms:

- Services must be **deployed together** in a specific order, or nothing works.
- Services **share a database** — so a schema change breaks three teams at once.
- A single user action makes a **synchronous chain of 6+ service calls**.
- Every feature requires changes in four repos.
- There's a "common"/"shared-models" library that every service depends on, and bumping it is a coordinated release.

The root cause is almost always decomposing by **technical layer** (a "controller service", a "database service") instead of by **business capability**. Each business change then cuts across every layer, so nothing can move independently.

---

## Q2: The Modular Monolith

### Q: What is a modular monolith and why is it the right default?

**A:** A single deployable artefact, internally partitioned into modules with enforced boundaries — each module owning its own domain logic, its own tables, and a public interface. Cross-module calls go through that interface, never directly into another module's repository or tables.

```
apps/api/                       ← one deployable
  src/modules/
    orders/
      orders.module.ts
      api/                      ← the PUBLIC contract other modules may import
        orders.facade.ts
        orders.events.ts        ← domain events published
      domain/                   ← entities, value objects (private)
      infrastructure/           ← repositories, order_* tables (private)
    payments/
      api/ domain/ infrastructure/
    notifications/
      api/ domain/ infrastructure/
  src/shared/kernel/            ← genuinely shared primitives only (Money, Result)
```

**How you enforce the boundaries** — without enforcement this decays into a big ball of mud within two quarters:

```jsonc
// .eslintrc — boundaries are checked in CI, not in code review
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        {
          "group": ["**/modules/*/domain/**", "**/modules/*/infrastructure/**"],
          "message": "Import from a module's api/ folder only."
        }
      ]
    }]
  }
}
```

In NestJS the module system gives you a second layer of enforcement — only what's in `exports` is reachable:

```ts
@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, OrderLineEntity])],
  providers: [OrdersFacade, OrderRepository, PlaceOrderHandler],
  exports: [OrdersFacade],   // ← the ONLY thing other modules can inject
})
export class OrdersModule {}
```

And cross-module communication uses in-process events, which is the seam you later replace with a real broker:

```ts
// payments module reacts to an orders domain event — no direct dependency
@Injectable()
export class OrderPlacedHandler {
  @OnEvent('order.placed')                 // in-process today...
  async handle(event: OrderPlacedEvent) {  // ...Kafka tomorrow, same handler
    await this.paymentsFacade.authorize(event.orderId, event.total);
  }
}
```

**Why this is the strongest answer in an interview:** it gives you the modularity benefit immediately, keeps local ACID transactions and a single deploy, and leaves every module extraction-ready. When a module needs its own scaling or its own team, you lift it out — the interface and the event contract already exist. Shopify, GitHub and Stack Overflow all run enormous modular monoliths, which is a useful counter to "everyone does microservices."

---

## Q3: Decomposing a System into Services

### Q: How do you decide where the service boundaries go?

**A:** In priority order:

1. **By business capability / bounded context** — Orders, Payments, Inventory, Identity, Notifications. This is the default and it's right most of the time, because business changes tend to be contained within a capability.
2. **By volatility** — split the part that changes weekly from the part that changes yearly, so the stable part isn't dragged through the fast part's release cadence.
3. **By scaling profile** — a video transcoder needs GPU instances and scales on queue depth; a settings API needs two small pods. Fusing them wastes money and complicates autoscaling.
4. **By compliance/security boundary** — a PCI-scoped payments service kept small deliberately, so the audit scope stays small.
5. **By team** (Conway's Law, applied deliberately) — align services to team boundaries you actually want, because the architecture will end up mirroring communication structure whether you plan it or not.

**Anti-patterns, named:**
- **By technical layer** — a "database service", an "API service". Every feature cuts across all of them.
- **Entity services** — a "UserService" that does nothing but CRUD on the user table. That's a distributed database access layer, not a service. Real services own *behaviour*, not tables.
- **Nano-services** — so fine-grained that the coordination overhead exceeds the work being done.

### Q: What are the tests for a good service boundary?

**A:** Four practical checks:

| Test | Question | Failure signal |
|---|---|---|
| **Independent deployability** | Can I deploy this alone, at 3pm on a Friday? | Needs a coordinated release |
| **Data ownership** | Does it exclusively own its data? | Another service writes to its tables |
| **Business coherence** | Can I describe what it does in one sentence without "and"? | "It manages users and sends emails and…" |
| **Chattiness** | Does a typical use case require ≤2 calls to it? | 8 round trips for one user action |

If a proposed split fails these, the boundary is in the wrong place — usually it needs to be *coarser*, not finer. Start coarse. It is far easier to split a service later than to merge two that have grown separate schemas, separate deploy pipelines and separate teams.

---

## Q4: Layered, Hexagonal & Clean Architecture

### Q: Explain hexagonal (ports & adapters) architecture.

**A:** The core idea is the **dependency inversion of infrastructure**: business logic defines the interfaces it needs (**ports**), and infrastructure implements them (**adapters**). The domain never imports a database driver, an HTTP framework, or an SDK.

```
                    ┌─────────── driving/primary adapters ───────────┐
                    │  REST controller   GraphQL resolver   CLI      │
                    │  Kafka consumer    Cron job                    │
                    └────────────────────┬───────────────────────────┘
                                         │ calls inbound ports
                    ┌────────────────────▼───────────────────────────┐
                    │              APPLICATION CORE                  │
                    │   Use cases  ·  Domain entities  ·  Rules      │
                    │   Depends on NOTHING external                  │
                    └────────────────────┬───────────────────────────┘
                                         │ calls outbound ports (interfaces)
                    ┌────────────────────▼───────────────────────────┐
                    │  driven/secondary adapters                     │
                    │  PostgresOrderRepository   StripeGateway       │
                    │  S3FileStore               SesEmailSender      │
                    └────────────────────────────────────────────────┘
```

```ts
// ── domain/ports — owned by the core, no framework imports ──────────────
export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
}
export interface PaymentGateway {
  charge(amount: Money, token: string): Promise<PaymentResult>;
}

// ── application/use-cases — pure orchestration of domain rules ──────────
export class PlaceOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,   // interface, not Postgres
    private readonly payments: PaymentGateway,  // interface, not Stripe
    private readonly events: EventPublisher,
  ) {}

  async execute(cmd: PlaceOrderCommand): Promise<OrderId> {
    const order = Order.create(cmd.customerId, cmd.lines);  // domain invariants
    const result = await this.payments.charge(order.total(), cmd.paymentToken);
    if (!result.approved) throw new PaymentDeclinedError(result.reason);
    order.markPaid(result.transactionId);
    await this.orders.save(order);
    await this.events.publish(new OrderPlacedEvent(order.id, order.total()));
    return order.id;
  }
}

// ── infrastructure/adapters — the replaceable outer ring ────────────────
@Injectable()
export class TypeOrmOrderRepository implements OrderRepository { /* ... */ }
@Injectable()
export class StripePaymentGateway implements PaymentGateway { /* ... */ }

// ── wiring: NestJS DI is the composition root ───────────────────────────
@Module({
  providers: [
    PlaceOrderUseCase,
    { provide: 'OrderRepository', useClass: TypeOrmOrderRepository },
    { provide: 'PaymentGateway',  useClass: StripePaymentGateway },
  ],
})
export class OrdersModule {}
```

**The payoff you should state:** `PlaceOrderUseCase` is testable with two in-memory fakes and zero infrastructure — no database container, no HTTP mock server, milliseconds per test. And swapping Stripe for SSLCommerz (a genuinely likely BD requirement) is one new adapter class and one line of DI wiring; the domain doesn't change.

**Clean Architecture** is the same idea with named concentric rings — Entities → Use Cases → Interface Adapters → Frameworks & Drivers — governed by the **dependency rule**: source-code dependencies point only inward. Onion Architecture is again the same shape. Don't get lost in the taxonomy; they are one idea with three brand names.

**The honest trade-off:** this costs indirection. For a CRUD service with no interesting business rules it's ceremony. Apply it where the domain logic is genuinely complex and long-lived, and use plain layered services elsewhere. Saying that unprompted signals judgement rather than dogma.

---

## Q5: Event-Driven Architecture

### Q: What is EDA and what are the real trade-offs?

**A:** Services communicate by publishing facts about what happened rather than calling each other directly. The producer doesn't know who consumes; the consumer doesn't know who produced.

**Events vs commands — a distinction worth getting right:**

| | Command | Event |
|---|---|---|
| Intent | "Do this" | "This happened" |
| Naming | Imperative — `ChargePayment` | Past tense — `PaymentCharged` |
| Recipients | Exactly one | Zero to many |
| Coupling | Sender knows the receiver | Publisher knows nobody |
| Can be rejected? | Yes | No — it's already a fact |
| Failure semantics | Caller learns it failed | Consumer's problem |

**Gains:** temporal decoupling (the consumer can be down and catch up later), independent scaling per consumer, trivially adding consumer #4 without touching the producer, natural audit trail, and replay for recovery or backfill.

**Costs — state these, they're where the senior signal is:**
- **Eventual consistency** becomes a UX problem, not just a technical one. "Order placed" but the inventory count hasn't moved yet needs a product answer.
- **Debugging** requires distributed tracing with correlation IDs; there is no single stack trace.
- **No global ordering.** Only per-partition ordering. Design for out-of-order arrival.
- **At-least-once delivery** means duplicates are guaranteed, so every consumer must be idempotent.
- **Schema evolution** becomes a distributed contract problem — you can't just change a field.
- **Testing** needs contract tests plus a broker in integration tests.

### Q: How do you version events without breaking consumers?

**A:** Treat the event schema as a public API with a compatibility policy.

**Rules for backward-compatible change (the ones you can make freely):**
- Add optional fields with defaults.
- Never remove or rename a field that's in use.
- Never change a field's type or its semantic meaning.
- Never repurpose a field ("`status` used to mean X, now it means Y" is the worst bug class in EDA).

**When you must break:** publish a new topic/version (`orders.placed.v2`), have the producer **dual-publish** v1 and v2 during a migration window, move consumers one at a time, then retire v1 once the metrics show zero v1 consumers.

**Enforce it mechanically with a schema registry** — Avro or Protobuf with Confluent Schema Registry set to `BACKWARD` compatibility. The producer literally cannot publish an incompatible schema; the build fails. This is the difference between a policy and a guarantee.

Include an envelope on every event so consumers can route, trace and dedupe:

```ts
interface EventEnvelope<T> {
  eventId: string;         // ULID — the idempotency key for consumers
  eventType: string;       // 'order.placed'
  eventVersion: number;    // 2
  occurredAt: string;      // ISO 8601, when the fact happened (not when published)
  producer: string;        // 'orders-service@1.4.2'
  correlationId: string;   // ties the whole user journey together in traces
  causationId: string;     // the event/command that caused this one
  partitionKey: string;    // 'order:88f3' — guarantees per-entity ordering
  payload: T;
}
```

### Q: Thin events or fat events?

**A:** A real design decision with a name.

| | Event-notification (thin) | Event-carried state transfer (fat) |
|---|---|---|
| Payload | `{ orderId: "88f3" }` | The full order snapshot |
| Consumer then | Calls back to the producer for details | Has everything it needs |
| Coupling | Runtime coupling — producer must be up | Schema coupling only |
| Data volume | Tiny | Large |
| Staleness | Always current (fetches now) | Snapshot at publish time |

Fat events give you true temporal decoupling — the consumer works even if the producer is down — at the cost of bigger payloads and duplicated data. That's usually the right trade, and it's what makes read-model projections possible. Use thin events when the payload would be huge or contains data the consumer isn't authorised to see.

---

## Q6: Choreography vs Orchestration

### Q: Compare them.

**A:**

**Choreography** — each service reacts to events and emits its own. No central brain.

```
OrderService ──OrderPlaced──▶ PaymentService ──PaymentCaptured──▶ InventoryService
                                                                        │
                                                            StockReserved
                                                                        ▼
                                                                ShippingService
```

**Orchestration** — a coordinator explicitly drives each step and holds the process state.

```
                    ┌──────────── OrderSaga (state machine) ────────────┐
                    │  1. ReservePayment  → PaymentService              │
                    │  2. ReserveStock    → InventoryService            │
                    │  3. CreateShipment  → ShippingService             │
                    │  on failure at step N → compensate N-1 … 1        │
                    └──────────────────────────────────────────────────┘
```

| | Choreography | Orchestration |
|---|---|---|
| Coupling | Lowest | Coordinator knows all participants |
| Visibility of the flow | **Poor** — it exists only in the aggregate of everyone's handlers | **Excellent** — one place, readable |
| Adding a step | New consumer subscribes; nobody changes | Modify the orchestrator |
| Debugging | Hard — trace across N services | Easy — inspect the saga's state |
| Cyclic dependency risk | Real | None |
| Single point of failure | None | The orchestrator (mitigate: make it stateless + durable state) |
| Good for | 2–4 steps, loosely related reactions | 5+ steps, compensation logic, business-visible processes |

**The practical rule:** choreography for simple reactive fan-out ("when an order is placed, also send an email, also update analytics, also index for search" — those three consumers have nothing to do with each other). Orchestration when there is a genuine *business process* with ordering, compensation and a state that someone will one day ask you to report on. Most real systems use both: orchestrated core transactions, choreographed side effects.

**Implementation options for orchestration:** AWS Step Functions (managed, visual, durable), Temporal (durable execution — you write the saga as ordinary async code and the runtime handles crashes and retries), or a hand-rolled state machine persisted in Postgres. Naming Temporal or Step Functions signals current practice.

---

## Q7: CQRS

### Q: What is CQRS and when is it worth it?

**A:** **Command Query Responsibility Segregation** — separate the model you write through from the model you read through. In its full form, separate stores kept in sync asynchronously.

```
                       ┌──── Command side ────┐
   POST /orders ──────▶│ Validate → Domain    │──▶ Write DB (normalised, ACID)
                       │ invariants → Save    │           │
                       └──────────────────────┘           │ event / CDC
                                                          ▼
                       ┌──── Query side ─────┐    ┌───────────────┐
   GET /orders/:id ───▶│ Read model (dumb)   │◀───│  Projector    │
                       │ No business logic   │    └───────────────┘
                       └─────────────────────┘
                              Read DB (denormalised, per-view, replicated)
```

**Why:** reads and writes usually have opposite requirements. Writes need normalisation, constraints and transactions. Reads need denormalisation, wide rows and aggressive caching — and there are typically 10–100× more of them. One model serving both means every read joins six tables and every write fights read locks.

**The levels — pick the lowest one that solves the problem:**

| Level | What it means | Cost |
|---|---|---|
| 1. Separate methods | `OrderCommandService` / `OrderQueryService` | Nearly free — do this always |
| 2. Separate models, same DB | Commands via ORM entities; queries via raw SQL/views into DTOs | Low. **Solves most problems.** |
| 3. Separate read replicas | Writes → primary, reads → replicas | Moderate; replica lag becomes visible |
| 4. Separate stores | Postgres for writes, Elasticsearch/Redis read models updated via events | High: projections, rebuild tooling, consistency handling |

**Only levels 3–4 are "real" CQRS**, and they buy independent scaling and purpose-built read stores in exchange for eventual consistency and a projection pipeline you now operate.

```ts
// Level 2 CQRS in NestJS — the pragmatic sweet spot
@Injectable()
export class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  async execute(cmd: PlaceOrderCommand): Promise<void> {
    const order = Order.create(cmd.customerId, cmd.lines);   // rich domain model
    await this.repo.save(order);
    order.pullEvents().forEach(e => this.eventBus.publish(e));
  }
}

@Injectable()
export class GetOrderSummaryHandler implements IQueryHandler<GetOrderSummary> {
  // No domain model, no ORM entities — one purpose-built query into a flat DTO
  async execute(q: GetOrderSummary): Promise<OrderSummaryDto> {
    return this.db.query<OrderSummaryDto>(`
      SELECT o.id, o.status, o.total_cents, c.name AS customer_name,
             COUNT(l.id) AS line_count
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_lines l ON l.order_id = o.id
      WHERE o.id = $1
      GROUP BY o.id, c.name
    `, [q.orderId]);
  }
}
```

**Handling eventual consistency in the UI** — the question that separates people who've shipped CQRS from people who've read about it: after a write, the read model may lag 50–500 ms, so a naive redirect-to-detail shows stale data. Options: return the projected result directly from the command response; have the client hold the version it wrote and poll/subscribe until the read model catches up; or update optimistically on the client. Say which one you'd pick and why.

---

## Q8: Event Sourcing

### Q: Explain event sourcing and its costs.

**A:** Instead of storing current state, store the **immutable, ordered sequence of events** that produced it. Current state is a left fold over the event stream.

```
Traditional:  accounts { id: 42, balance: 150 }        ← the history is gone

Event-sourced stream "account-42":
  seq 1  AccountOpened      { owner: "u_9" }
  seq 2  MoneyDeposited     { amount: 100 }
  seq 3  MoneyDeposited     { amount: 200 }
  seq 4  MoneyWithdrawn     { amount: 150 }
  ────────────────────────────────────────
  state = fold(events) → balance 150, and you can answer
          "what was the balance last Tuesday?" by folding a prefix
```

**What you gain:** a complete audit log for free (regulators love this), time-travel debugging, the ability to build a brand-new read model retroactively over all of history, and the ability to answer questions you hadn't thought of when you designed the schema.

**What it costs — be direct about these:**
- **Querying is hard.** "All accounts with balance > 1000" requires a projection; you cannot query the event log that way. Event sourcing essentially requires CQRS.
- **Schema evolution of events is forever.** Events are immutable and you must still be able to replay a five-year-old event. You need upcasters.
- **Deleting data conflicts with GDPR** (right to erasure) in an append-only log. The standard answer is **crypto-shredding**: encrypt personal data per subject and delete the key, rendering the events unreadable without mutating the log.
- **Replay time grows.** Mitigate with **snapshots** every N events (fold from the snapshot forward, not from event 1).
- **Concurrency** requires optimistic locking on the expected stream version.

```ts
class BankAccount {
  private version = 0;
  private balance = 0;
  private readonly uncommitted: DomainEvent[] = [];

  static rehydrate(events: DomainEvent[], snapshot?: Snapshot): BankAccount {
    const acc = new BankAccount();
    if (snapshot) { acc.balance = snapshot.balance; acc.version = snapshot.version; }
    for (const e of events) acc.apply(e);   // fold
    return acc;
  }

  withdraw(amount: number) {
    if (amount > this.balance) throw new InsufficientFundsError();  // invariant
    this.raise(new MoneyWithdrawn({ amount }));
  }

  private raise(e: DomainEvent) { this.apply(e); this.uncommitted.push(e); }

  private apply(e: DomainEvent) {           // pure state transition, no validation
    switch (e.type) {
      case 'MoneyDeposited': this.balance += e.amount; break;
      case 'MoneyWithdrawn': this.balance -= e.amount; break;
    }
    this.version++;
  }
}

// Optimistic concurrency on append — this is what makes it safe
await eventStore.append('account-42', account.uncommitted, {
  expectedVersion: loadedVersion,   // conflict → 409, client retries the command
});
```

**Where it's genuinely worth it:** finance and accounting (ledgers are naturally event-sourced — a ledger is an append-only log with derived balances), anything with a hard audit requirement, order/workflow lifecycles, and collaborative editing. **Where it isn't:** CRUD, reference data, or anywhere the team hasn't done it before and the deadline is short. A good interview answer names one aggregate in the design worth event-sourcing rather than event-sourcing the entire system — partial adoption is the mature choice.

---

## Q9: Saga Pattern

### Q: How do you maintain consistency across services without distributed transactions?

**A:** Break the distributed transaction into a sequence of **local transactions**, each publishing an event that triggers the next. If step N fails, run **compensating transactions** for steps N-1 … 1 to semantically undo the work.

**Why not 2PC?** Two-phase commit gives you atomicity but takes locks held across the network for the duration of the transaction. If the coordinator dies after prepare, participants are blocked holding locks indefinitely. It sacrifices availability (it's a CP protocol) and doesn't work across heterogeneous systems or third-party APIs. Nobody runs 2PC across microservices at scale.

**Compensations are semantic, not literal rollbacks.** You can't un-send an email; you send an apology. You can't un-ship; you issue a return label. You can't un-charge; you refund — which is a *new* ledger entry, not a deletion.

```ts
// Orchestrated saga with explicit compensation stack
type Step = {
  name: string;
  invoke: (ctx: SagaContext) => Promise<void>;
  compensate: (ctx: SagaContext) => Promise<void>;
};

const placeOrderSaga: Step[] = [
  {
    name: 'reserve-inventory',
    invoke:     ctx => inventory.reserve(ctx.orderId, ctx.lines),
    compensate: ctx => inventory.release(ctx.orderId),
  },
  {
    name: 'authorize-payment',
    invoke:     ctx => payments.authorize(ctx.orderId, ctx.total),
    compensate: ctx => payments.void(ctx.orderId),
  },
  {
    name: 'create-shipment',
    invoke:     ctx => shipping.create(ctx.orderId, ctx.address),
    compensate: ctx => shipping.cancel(ctx.orderId),
  },
];

async function runSaga(ctx: SagaContext) {
  const done: Step[] = [];
  try {
    for (const step of placeOrderSaga) {
      await withRetry(() => step.invoke(ctx));      // retries: steps are idempotent
      done.push(step);
      await sagaStore.persist(ctx.sagaId, step.name, 'completed'); // crash-safe
    }
    await sagaStore.persist(ctx.sagaId, 'saga', 'completed');
  } catch (err) {
    for (const step of done.reverse()) {
      await withRetry(() => step.compensate(ctx));  // compensations MUST succeed
    }
    await sagaStore.persist(ctx.sagaId, 'saga', 'compensated');
    throw err;
  }
}
```

**The hard parts to raise unprompted:**

- **Compensations can fail too.** They must be retried forever with backoff, and escalate to a human queue after N attempts. A failed compensation is a data-integrity incident, not an error to swallow.
- **Sagas are not isolated (the I in ACID is missing).** Another transaction can read the intermediate state — the money is deducted but the order isn't confirmed yet. Countermeasures: **semantic locks** (a `PENDING` status flag that other operations respect), **commutative updates** (use increments rather than absolute sets so ordering doesn't matter), and **re-reading values** before compensating.
- **Idempotency everywhere.** Every step and every compensation will be invoked more than once. Key them by `sagaId + stepName`.
- **Saga state must be durable.** If the orchestrator pod dies mid-saga, a new one must resume from the persisted step. This is exactly the argument for Temporal or Step Functions over a hand-rolled loop.
- **Timeouts.** A step that never returns must eventually trigger compensation, or you leak inventory reservations forever.

---

## Q10: Outbox Pattern & Dual-Write

### Q: What is the dual-write problem?

**A:** You need to update your database *and* publish an event. There is no atomic operation spanning both.

```ts
// BROKEN — the classic bug
await orderRepo.save(order);          // ✅ committed
await kafka.publish('order.placed');  // ❌ broker down / pod killed here
// Order exists; nobody was told. Inventory never reserved. Silent inconsistency.

// ALSO BROKEN — reversed
await kafka.publish('order.placed');  // ✅ published
await orderRepo.save(order);          // ❌ constraint violation
// Downstream services react to an order that doesn't exist.
```

**The transactional outbox** fixes it by making the event part of the same local ACID transaction as the state change:

```sql
CREATE TABLE outbox (
  id             BIGSERIAL PRIMARY KEY,
  aggregate_type TEXT        NOT NULL,
  aggregate_id   TEXT        NOT NULL,
  event_type     TEXT        NOT NULL,
  payload        JSONB       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at   TIMESTAMPTZ                      -- NULL = not yet published
);
CREATE INDEX ON outbox (id) WHERE published_at IS NULL;   -- partial index: tiny
```

```ts
await dataSource.transaction(async (tx) => {
  await tx.save(order);                         // business state
  await tx.insert(Outbox, {                     // event — same transaction
    aggregateType: 'order', aggregateId: order.id,
    eventType: 'order.placed', payload: toEvent(order),
  });
});   // both commit or neither does — atomicity restored
```

**Then a relay publishes from the outbox**, two options:

| | Polling publisher | **CDC (log tailing)** |
|---|---|---|
| How | `SELECT … WHERE published_at IS NULL … FOR UPDATE SKIP LOCKED` on a timer | Debezium reads the Postgres WAL / MySQL binlog |
| Latency | Poll interval (100 ms–1 s) | Milliseconds |
| DB load | Constant query load | Near zero |
| Ops | Trivial — it's just code | Kafka Connect + Debezium to operate |
| Ordering | Per poll batch | Strict, from the log |

Start with polling and `FOR UPDATE SKIP LOCKED` (which lets multiple relay instances run without stepping on each other); move to Debezium when latency or DB load justifies the operational cost.

**Delivery semantics:** the outbox gives **at-least-once**, not exactly-once — the relay can crash after publishing but before marking `published_at`. That is fine and expected; it's why consumers must be idempotent. Say this explicitly, because claiming exactly-once delivery is a red flag.

**The inbox pattern** is the mirror image on the consumer side: record processed `event_id`s in a table inside the same transaction as the side effect, so a redelivered event is detected and skipped atomically.

---

## Q11: API Gateway & BFF

### Q: What does an API gateway do, and what should it not do?

**A:** A single entry point in front of your services handling cross-cutting concerns so each service doesn't reimplement them.

**Should do:** TLS termination, authentication (validate the JWT once, pass identity downstream), coarse rate limiting and quotas, request routing, request/response logging and trace initiation, IP allow/deny, request size limits, CORS, response compression, API key management, and canary/blue-green traffic splitting.

**Should not do:** business logic, request orchestration across many services (that belongs in a BFF or an orchestrator), data transformation that encodes domain rules, or anything that turns it into a deployment bottleneck every team must queue behind. The classic failure is the gateway becoming a new ESB — a single shared component that every change must pass through, owned by a team that becomes everyone's blocker.

**Watch the availability math:** the gateway is now on the critical path for 100% of traffic. It must be multi-AZ, stateless, autoscaled, and have a lower p99 than anything behind it.

### Q: API gateway vs BFF?

**A:** A **Backend for Frontend** is a gateway specialised per client, owned by the team that owns that client.

```
   iOS app ──▶ Mobile BFF ──┐
   Web app ──▶  Web BFF  ───┼──▶ Orders  Payments  Catalog  Identity
 Partner API ▶ Public API ──┘
```

The mobile BFF returns small, aggregated payloads tuned for a 3G connection in Dhaka and stitches six service calls into one round trip. The web BFF returns richer data for a desktop screen. Each evolves at the pace of its own client without cross-client coordination.

**GraphQL is a natural BFF implementation** — the client asks for exactly the fields it needs, one round trip, one typed schema. Add DataLoader to batch the resulting N+1 fan-out into the downstream services, and depth/complexity limits so a malicious query can't fan out to a million resolver calls.

**Cost:** N BFFs mean N codebases and duplicated aggregation logic. Worth it when clients genuinely diverge; overkill when web and mobile want the same data.

---

## Q12: Service Discovery & Service Mesh

### Q: How do services find each other?

**A:**

| Approach | Mechanism | Where you see it |
|---|---|---|
| **DNS** | Service name resolves to a stable virtual IP | Kubernetes `orders.default.svc.cluster.local`; simplest, but DNS caching hides failures |
| **Client-side discovery** | Client queries a registry (Consul, Eureka), picks an instance, load balances itself | Efficient (no extra hop); logic must exist in every language |
| **Server-side discovery** | Client hits a load balancer that knows the instances | Kubernetes Services, AWS ALB; simple clients, one extra hop |
| **Service mesh** | A sidecar proxy handles discovery, LB, retries, mTLS transparently | Istio, Linkerd; most capable, most operational weight |

Registration is either **self-registration** (the instance announces itself and heartbeats) or **third-party registration** (the platform registers it — what Kubernetes does via the kubelet and endpoints controller). Third-party is preferable: an instance that has crashed can't deregister itself.

### Q: What does a service mesh actually give you, and when is it not worth it?

**A:** A sidecar proxy (Envoy) is injected next to every pod, and all traffic flows through it. The application code becomes network-unaware.

**Data plane** (the sidecars) provides: mTLS between every pod with automatic certificate rotation and identity (SPIFFE), L7 load balancing, retries with budgets, timeouts, circuit breaking, outlier detection (eject a misbehaving instance), traffic splitting for canaries, fault injection for chaos testing, and uniform golden-signal metrics + trace propagation for every service — in any language, with no library.

**Control plane** (istiod) distributes configuration and certificates.

**The costs, which you should name:** an extra network hop each way (~0.5–2 ms p99 added), 50–150 MB memory and some CPU per pod, a steep operational learning curve, and a new failure domain — a control-plane misconfiguration can break every service simultaneously.

**Verdict:** below ~15–20 services, use libraries (an HTTP client with retry + circuit breaker, OpenTelemetry SDK) and skip the mesh. Adopt a mesh when you have polyglot services, a hard mTLS/zero-trust requirement, or enough services that per-language libraries have become unmaintainable. Consider Linkerd before Istio if you want most of the value at a fraction of the complexity.

---

## Q13: Resilience Patterns

### Q: Walk through the resilience patterns you'd apply to a service-to-service call.

**A:** They compose in a specific order — that ordering is itself a good answer.

```
Request ─▶ [Bulkhead] ─▶ [Circuit breaker] ─▶ [Timeout] ─▶ [Retry+jitter] ─▶ Remote
                │                │                                   │
                └── reject fast  └── fail fast when open              └── fallback
```

**1. Timeout** — the foundation. A call with no timeout is a resource leak waiting for a slow dependency. Set it from the dependency's p99, not from a round number: if p99 is 200 ms, a 500 ms timeout is generous; a 30 s default is negligent. Budget timeouts down the chain (if the gateway allows 3 s, the service must allow less, and its downstream less again) so an inner call can't outlive the outer request.

**2. Retry with exponential backoff + full jitter** — for transient failures only.

```ts
async function withRetry<T>(fn: () => Promise<T>, max = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < max; attempt++) {
    try { return await fn(); }
    catch (err) {
      if (!isRetryable(err)) throw err;         // 4xx: never retry. 5xx/timeout: yes
      lastErr = err;
      const base = Math.min(1000 * 2 ** attempt, 20_000);
      await sleep(Math.random() * base);         // FULL jitter — not base + jitter
    }
  }
  throw lastErr;
}
```
The critical details: **only retry idempotent operations** (or send an idempotency key), **never retry 4xx**, use **full jitter** (`random(0, base)`) because synchronised retries after an outage are how a recovering service gets knocked over again, and cap total attempts. Retrying at every layer of a five-layer stack turns one user request into 3⁵ = 243 backend requests — a **retry storm**. Retry at *one* layer, and consider a **retry budget** (abort retries when they exceed ~10% of total requests).

**3. Circuit breaker** — stop calling a dependency that is clearly down.

```
CLOSED ──(failure rate > 50% over 20 requests)──▶ OPEN
   ▲                                               │
   │                                        (after 30s cool-down)
   │                                               ▼
   └───(N consecutive successes)────────────── HALF-OPEN
                                          (allow a few trial requests;
                                           any failure → back to OPEN)
```
Without it, a dead dependency consumes all your threads/sockets waiting for timeouts, and your service dies too — **cascading failure**. With it, calls fail in microseconds and you serve a fallback.

**4. Bulkhead** — isolate resource pools per dependency so one slow dependency can't consume the whole connection pool or worker pool. Named after ship compartments: a flooded compartment doesn't sink the ship.

**5. Fallback / graceful degradation** — a cached-but-stale value, a default, a reduced feature set, or an explicit "recommendations unavailable" rather than a 500. Decide per-feature what "degraded" means; that's a product conversation worth having before the incident.

**6. Load shedding & rate limiting** — under overload, reject a fraction of requests *fast* to keep the rest healthy. Serving 70% of traffic well beats serving 100% at a 30-second latency. Prioritise: shed anonymous/batch traffic before authenticated interactive traffic.

**7. Idempotency** — the precondition that makes retries safe at all.

---

## Q14: Strangler Fig — Migrating a Monolith

### Q: How would you migrate a monolith to microservices without a big-bang rewrite?

**A:** The **strangler fig pattern**: put a facade in front of the monolith, route one capability at a time to a new service, and let the monolith shrink until it can be removed. Named after a vine that grows around a tree and eventually replaces it.

```
Phase 0:  Client ──────────────────────────────▶ Monolith

Phase 1:  Client ──▶ Proxy/Gateway ────────────▶ Monolith        (no behaviour change,
                                                                  but now interceptable)

Phase 2:  Client ──▶ Proxy ──┬── /notifications ▶ New Service ──┐
                             └── everything else ▶ Monolith     │
                                                        shared DB (temporarily)

Phase 3:  New Service gets its OWN database; sync via CDC/events during cutover

Phase 4:  Repeat per capability; monolith becomes a small legacy core, then retires
```

**The sequence that actually works:**

1. **Put the seam in first.** A proxy or gateway in front of the monolith with zero routing changes. Now you can move traffic without touching clients. This alone is a useful, low-risk deliverable.
2. **Pick the first capability by risk-adjusted value** — high business value, clear boundary, low coupling, ideally a different scaling profile. Notifications, search, reporting and file processing are classic first extractions. **Never start with the hardest, most coupled core domain.**
3. **Extract behaviour before data.** The new service initially reads the monolith's database (or calls back into it). Ugly but reversible, and it de-risks the step.
4. **Then split the data** — the genuinely hard part. Options: CDC to keep a copy in sync during transition, dual-write with reconciliation, or a scheduled cutover with a short freeze. Expect foreign keys across the boundary to become application-level joins or denormalised copies.
5. **Migrate traffic gradually.** Shadow traffic first (send a copy of production reads to the new service and diff the responses — this catches behavioural drift with zero user risk), then 1% → 10% → 50% → 100% with an instant rollback path.
6. **Delete the old code.** The step everyone skips. If the monolith path stays alive "just in case", you now maintain two implementations forever and the migration never actually completes. Set a date and enforce it.

**What to say about the organisational side (this is what makes it a Lead answer):** the migration must ship business value continuously or it will be cancelled at month six when priorities shift. Never propose a 12-month migration with no user-visible output. Also: the team structure has to move with the architecture — if one team still owns everything, you've built microservices with monolith release coordination.

**Anti-corruption layer:** while both exist, the new service should not adopt the monolith's data model. Put a translation layer at the boundary that maps legacy concepts into the new domain model, so the legacy design doesn't leak forward and contaminate the new one.

---

## Q15: Serverless Architecture

### Q: When is serverless the right architecture?

**A:**

**Strong fit:** spiky or unpredictable traffic (you pay zero at idle), event processing (S3 upload → transcode, DynamoDB stream → projection), scheduled jobs, glue between managed services, and early-stage products where engineering time is the scarcest resource. For a BD startup, "no servers to patch, no cluster to run, and a $0 bill at 3 a.m." is a genuinely strong argument.

**Poor fit:** sustained high throughput (at constant load, EC2/ECS is several times cheaper per request), latency-critical paths where cold starts are unacceptable, long-running jobs (>15 min Lambda ceiling), workloads needing large memory or GPU, WebSocket-heavy stateful connections (possible via API Gateway WebSocket, but awkward), and anything where vendor lock-in is a stated risk.

**Cold starts — the number one interview topic here:**

| Lever | Effect |
|---|---|
| Runtime choice | Node.js/Python ~100–300 ms; JVM/.NET ~1–3 s; Rust/Go ~50 ms |
| Bundle size | Smaller = faster. Bundle with esbuild, tree-shake, avoid the full AWS SDK |
| Memory allocation | More memory = proportionally more CPU = faster init **and often lower total cost** |
| VPC attachment | Historically brutal; now ~sub-second via Hyperplane ENIs, but still non-zero |
| **Provisioned concurrency** | Eliminates cold starts for a fixed pre-warmed count — you pay for idle |
| SnapStart / Lambda snapshots | Restores from a pre-initialised snapshot |
| Init-phase work | Open connections and load config **outside** the handler so it's reused across invocations |

**The other serverless-specific concerns:** connection exhaustion against a relational database (1,000 concurrent Lambdas each opening a Postgres connection will kill an RDS instance — use RDS Proxy or a data API), no in-process caching across invocations you can rely on, per-invocation cost that becomes worse than containers above a crossover point (compute the crossover — it's typically around 30–50% sustained utilisation), and observability that requires distributed tracing from day one because there's no server to SSH into.

**Hybrid is usually the right answer:** ECS/EKS for the steady-state API, Lambda for spiky async work, scheduled jobs and event glue.

---

## Q16: Cell-Based Architecture

### Q: What is cell-based architecture?

**A:** Partition the entire stack — not just the database — into independent **cells**, each a complete, self-sufficient copy of the system serving a subset of users. A thin routing layer maps each user to a cell.

```
                         ┌──── Cell Router (thin, highly available) ────┐
                         │   user → cell mapping (hash / assignment)     │
                         └───┬──────────────┬──────────────┬────────────┘
                    ┌────────▼──────┐ ┌─────▼─────────┐ ┌──▼────────────┐
                    │    CELL 1     │ │    CELL 2     │ │    CELL 3     │
                    │ LB→API→cache  │ │ LB→API→cache  │ │ LB→API→cache  │
                    │ →DB →queue    │ │ →DB →queue    │ │ →DB →queue    │
                    │ users 0–1M    │ │ users 1–2M    │ │ users 2–3M    │
                    └───────────────┘ └───────────────┘ └───────────────┘
```

**Why:** it converts availability from a binary into a percentage. A bad deploy, a poison message, a hot tenant or a corrupted cache takes down *one* cell — 1/N of users — instead of everyone. It also gives you a natural deployment unit: roll out to cell 1, watch it, then proceed. And it caps the scale any single component must reach, since each cell is sized to a known maximum.

**Costs:** significant operational complexity (N of everything to monitor and deploy), cross-cell operations become hard (a user in cell 1 messaging a user in cell 3 needs a cross-cell path), higher baseline cost from lost economies of scale, and the router itself is a critical shared component that must be extremely simple and extremely available.

Used by AWS internally, Slack, Salesforce, DoorDash. **This is an architect-level answer** — reach for it when the question is explicitly about blast radius, multi-tenancy at scale, or "how do you get past four nines", not as a default.

---

## Quick Reference

**Choosing a style:**

| Situation | Style |
|---|---|
| < 20 engineers, evolving domain | **Modular monolith** |
| Multiple teams blocked on release coordination | Microservices by bounded context |
| Complex, long-lived domain logic | Hexagonal / Clean inside each service |
| Many independent reactions to one fact | Event-driven, choreographed |
| Multi-step business process with compensation | Orchestrated saga (Temporal / Step Functions) |
| Reads and writes with opposite requirements | CQRS (start at level 2) |
| Hard audit / regulatory history requirement | Event sourcing on the relevant aggregates only |
| Spiky traffic, event glue, small team | Serverless |
| Blast radius is the top concern at scale | Cell-based |

**Pattern → problem it solves:**

| Pattern | Solves |
|---|---|
| Outbox | Dual-write between DB and broker |
| Inbox / dedupe table | Duplicate delivery |
| Saga | Consistency without distributed transactions |
| Circuit breaker | Cascading failure from a dead dependency |
| Bulkhead | One slow dependency exhausting shared resources |
| Retry + full jitter | Transient faults, without causing a retry storm |
| API gateway | Duplicated cross-cutting concerns |
| BFF | One-size-fits-none client payloads |
| Service mesh | Per-language resilience/mTLS/observability libraries |
| Strangler fig | Migrating without a big-bang rewrite |
| Anti-corruption layer | Legacy model leaking into new design |
| Cell-based | Blast radius / noisy neighbour at scale |

**Red flags to avoid saying:** "microservices scale better" (they scale *teams*, not throughput); "we'll use exactly-once delivery" (you'll use at-least-once + idempotency); "event sourcing gives us an audit log so we should use it everywhere"; "the service mesh handles resilience so we don't need timeouts."
