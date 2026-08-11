# Domain-Driven Design & Data Architecture — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with modelling examples in TypeScript and data pipeline patterns
> **Last Updated:** 2026-08-06

---

## In 60 seconds

1. **DDD's core claim: your code should use the same words the business uses.** If the business
   says "policy lapsed" and your code says `status = 3`, every conversation needs translation,
   and translation is where bugs live.
2. **A bounded context is a boundary where one word means exactly one thing.** "Customer" in
   Billing (an account with a payment method) is not "Customer" in Support (a person with
   tickets). Forcing one shared Customer model across both is a classic mistake.
3. **An aggregate is a cluster of objects you change together, with one entry point.** The
   practical rule: **one transaction should modify one aggregate.** That rule is what makes a
   system splittable into services later.
4. **Entity vs Value Object:** an Entity has an identity that persists as its data changes (a
   User). A Value Object is defined entirely by its values (an Address, a Money amount) and
   should be immutable.
5. **Ubiquitous language is the deliverable, not the diagrams.** If engineers and domain experts
   use the same vocabulary in the same meeting, DDD is working.
6. **You do not need all of DDD.** Bounded contexts, aggregates and ubiquitous language pay for
   themselves in most systems. Full event sourcing usually does not.

**The interview trap to expect:** "how would you split this monolith into services?" The
expected answer runs through bounded contexts — find where the language changes, and cut
there — rather than splitting by technical layer (a "database service", an "API service"),
which is the classic wrong answer.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Domain** | The business problem area you are modelling |
| **Ubiquitous language** | One shared vocabulary used by engineers and business alike |
| **Bounded context** | A boundary inside which each term has exactly one meaning |
| **Context map** | How your bounded contexts relate and integrate |
| **Entity** | Has an identity that survives changes to its data |
| **Value Object** | Defined by its values, has no id, and is immutable |
| **Aggregate** | A group of objects changed together as one unit |
| **Aggregate root** | The single object through which the aggregate is accessed |
| **Invariant** | A rule that must always hold — enforced inside the aggregate |
| **Repository** | The interface for loading and saving aggregates |
| **Domain event** | A record that something meaningful happened in the domain |
| **Anti-corruption layer** | Translation preventing another system's model from leaking into yours |
| **Anemic domain model** | Objects with only getters and setters, all logic elsewhere. Usually a smell |
| **Data warehouse** | A separate store optimised for analytics, not transactions |
| **Data lake** | Raw data stored cheaply, structured later |
| **OLTP / OLAP** | Transaction workloads · analytical workloads. Very different designs |
| **CDC** | Change Data Capture — streaming database changes to other systems |
| **Star schema** | Analytics modelling: one fact table surrounded by dimension tables |
| **Medallion (bronze/silver/gold)** | Raw → cleaned → aggregated stages in a data pipeline |

---

## Table of Contents

### Part A — Domain-Driven Design
1. [Strategic vs Tactical DDD](#q1-strategic-vs-tactical-ddd)
2. [Bounded Contexts](#q2-bounded-contexts)
3. [Context Mapping](#q3-context-mapping)
4. [Ubiquitous Language](#q4-ubiquitous-language)
5. [Entities, Value Objects & Aggregates](#q5-entities-value-objects--aggregates)
6. [Designing Aggregate Boundaries](#q6-designing-aggregate-boundaries)
7. [Domain Events vs Integration Events](#q7-domain-events-vs-integration-events)
8. [Repositories & Domain Services](#q8-repositories--domain-services)
9. [Event Storming](#q9-event-storming)

### Part B — Data Architecture
10. [OLTP vs OLAP](#q10-oltp-vs-olap)
11. [Data Lake, Warehouse & Lakehouse](#q11-data-lake-warehouse--lakehouse)
12. [Change Data Capture](#q12-change-data-capture)
13. [Stream Processing & Windowing](#q13-stream-processing--windowing)
14. [The Lambda & Kappa Architectures](#q14-the-lambda--kappa-architectures)
15. [Data Mesh](#q15-data-mesh)
16. [Polyglot Persistence & Data Ownership](#q16-polyglot-persistence--data-ownership)
17. [Data Governance, Lineage & Retention](#q17-data-governance-lineage--retention)
18. [Quick Reference](#quick-reference)

---

# Part A — Domain-Driven Design

## Q1: Strategic vs Tactical DDD

### Q: What is DDD and which parts actually matter?

**A:** DDD is a set of techniques for building software whose structure mirrors the business domain, so that changes in the business map to localised changes in code. It splits into two layers, and they are not equally valuable.

**Strategic DDD — the high-value half:**
- **Bounded contexts** — where one model ends and another begins.
- **Context maps** — how contexts relate and integrate.
- **Ubiquitous language** — one vocabulary shared by engineers and domain experts, per context.
- **Subdomain classification** — core, supporting, generic.

**Tactical DDD — the implementation patterns:**
- Entities, value objects, aggregates, repositories, domain services, factories, domain events.

**The senior take:** strategic DDD is where the money is — it tells you where your service boundaries go, which is the most expensive decision in the system. Tactical DDD is a set of coding patterns that pay off in complex domains and become ceremony in simple ones. Many teams do tactical DDD (lots of value objects and aggregates) inside badly-drawn bounded contexts and get nothing for it.

**Subdomain classification drives investment**, and it's a great answer to "how do you decide build vs buy":

| Subdomain | Definition | Strategy |
|---|---|---|
| **Core** | Your competitive differentiator — why customers choose you | Best engineers, in-house, rich domain model, invest heavily |
| **Supporting** | Necessary, specific to you, not differentiating | Build simply, or outsource; keep it boring |
| **Generic** | Everyone needs it, nobody differentiates on it | **Buy.** Auth0, Stripe, SendGrid, Twilio |

For a mobile financial service, the ledger and fraud engine are core; merchant onboarding is supporting; SMS delivery and identity verification are generic. Writing your own OAuth server is a classic misclassification of a generic subdomain as core.

---

## Q2: Bounded Contexts

### Q: What is a bounded context and why does it matter?

**A:** A boundary within which a particular model and its terms have a single, precise meaning. **The same word means different things in different contexts, and trying to force one model across all of them is the root cause of the "god object."**

Take "Customer" in an e-commerce business:

| Context | What "Customer" means | Fields that matter |
|---|---|---|
| **Sales** | A prospect with a pipeline stage | lead source, deal size, owner |
| **Ordering** | Someone with a cart and a shipping address | addresses, payment methods, cart |
| **Billing** | An account with a balance and payment terms | tax ID, credit limit, invoices |
| **Support** | A person with a ticket history and entitlement | tier, open tickets, SLA |
| **Shipping** | A delivery destination | address, delivery instructions, phone |

The unified `Customer` table that satisfies all five has 80 columns, half of them null for any given row, and every team is blocked on every other team's schema change. Five bounded contexts each own a small, coherent model, linked by a shared identity (`customer_id`) — and nothing else.

**How to find the boundaries:**
- Listen for **the same word used differently** — that's a boundary. Also **different words for the same thing** ("shipment" vs "delivery" vs "consignment").
- Look for where the **business processes are independent** — sales can change its pipeline stages without ordering caring.
- Notice **where the data changes at different rates and for different reasons**.
- Look at **who the domain experts are.** Different experts usually means different contexts.
- Run an **event storming session** (Q9) — the natural pivot points in the event flow are candidate boundaries.

**Bounded context ≠ microservice**, though they align well. A bounded context can be a module in a monolith. The rule is one context per service *at most* — never split one context across two services (you'd split a model that must stay consistent), and it's fine for one service to host two small contexts early on.

---

## Q3: Context Mapping

### Q: What are the context mapping patterns?

**A:** They describe the *relationship and power dynamic* between two contexts — which is as much organisational as technical.

| Pattern | Relationship | When |
|---|---|---|
| **Shared Kernel** | Two contexts share a small subset of the model and code | Two closely-collaborating teams; **use sparingly** — it's a coordination cost forever |
| **Customer–Supplier** | Downstream's needs influence upstream's roadmap | Normal internal relationship with a functioning planning process |
| **Conformist** | Downstream accepts the upstream model as-is, no translation | The upstream is a third party (Stripe) or a powerful internal team with no incentive to accommodate you |
| **Anti-Corruption Layer (ACL)** | Downstream translates the upstream model into its own | **The default when integrating with legacy or external systems** |
| **Open Host Service** | Upstream publishes a well-defined protocol for many consumers | A widely-used internal platform service |
| **Published Language** | A shared, documented interchange format (JSON Schema, protobuf, an industry standard like FHIR) | Many-to-many integration |
| **Separate Ways** | No integration at all; duplicate the small bit you need | Integration cost exceeds the benefit — a legitimate, underused choice |
| **Big Ball of Mud** | No boundaries; a mess | Name it honestly; contain it behind an ACL |

**The anti-corruption layer is the pattern to know cold**, because it's the answer to half of all legacy-integration questions:

```ts
// The legacy monolith's model — 40 fields, cryptic codes, nullable everything
interface LegacyCustomerRecord {
  CUST_NO: string;  CUST_TYP: 'I' | 'C' | null;  STAT_CD: string;
  ADDR_LN_1: string | null;  /* … 35 more … */
}

// Our context's model — small, precise, always valid
export class Customer {
  constructor(
    readonly id: CustomerId,
    readonly type: 'individual' | 'company',
    readonly status: CustomerStatus,
    readonly billingAddress: Address,
  ) {}
}

// The ACL: the ONLY place that knows the legacy shape exists
@Injectable()
export class LegacyCustomerTranslator {
  toDomain(rec: LegacyCustomerRecord): Customer {
    return new Customer(
      CustomerId.from(rec.CUST_NO.trim()),
      rec.CUST_TYP === 'C' ? 'company' : 'individual',
      this.mapStatus(rec.STAT_CD),           // 'A'|'S'|'X' → active|suspended|closed
      Address.fromLegacy(rec),               // handles the nulls, once
    );
  }
  private mapStatus(code: string): CustomerStatus { /* ... */ }
}
```

The value: legacy weirdness is quarantined in one class. When the legacy system is finally retired, you delete one file. Without an ACL, `CUST_TYP === 'C'` checks metastasise through your entire codebase and the legacy model outlives the legacy system by a decade.

---

## Q4: Ubiquitous Language

### Q: Why does vocabulary matter enough to be a named practice?

**A:** Because translation loses information, and every translation step is a place for bugs to enter. If the business says "a policy lapses" and the code says `subscription.status = 3`, then every conversation between an engineer and a domain expert requires a mental mapping, and every mapping is an opportunity to get it wrong.

**The rules:**
- The language is **per bounded context**, not global. "Order" meaning something different in Fulfilment than in Sales is correct, not a problem to fix.
- The language appears **in the code**: class names, method names, event names. `policy.lapse()`, not `updateStatus(3)`.
- It appears in **tests as specifications**: `it('lapses the policy when a premium is 30 days overdue')`.
- When the business changes a term, **the code changes too**. A stale name is technical debt with compounding interest.
- **Domain experts must recognise their own words** when you read the code aloud to them. That's the acceptance test for the practice.

**Where it pays off in an interview:** when asked to model something, use the domain's words and define them explicitly. "In this context a *settlement* is the transfer of the net position to the merchant's bank account, which is distinct from a *capture*, which is the debit from the cardholder." That single sentence demonstrates domain thinking more than any diagram.

---

## Q5: Entities, Value Objects & Aggregates

### Q: Distinguish entity, value object and aggregate.

**A:**

| | Entity | Value Object |
|---|---|---|
| Identity | Has an ID; two entities with identical fields are still different | **No ID** — defined entirely by its values |
| Equality | By ID | By value |
| Mutability | Mutable (state changes over time) | **Immutable** — "change" means create a new one |
| Examples | `Customer`, `Order`, `Account` | `Money`, `Address`, `EmailAddress`, `DateRange`, `OrderId` |

**Value objects are the most under-used and highest-value tactical pattern.** They eliminate a whole class of bugs by making invalid states unrepresentable:

```ts
export class Money {
  private constructor(
    private readonly amountMinor: number,   // integer minor units — never floats
    private readonly currency: Currency,
  ) {}

  static of(amountMinor: number, currency: Currency): Money {
    if (!Number.isInteger(amountMinor)) throw new Error('Use minor units');
    return new Money(amountMinor, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);          // BDT + USD is now a compile-time-ish error
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.amountMinor * factor), this.currency);
  }

  equals(other: Money): boolean {
    return this.amountMinor === other.amountMinor && this.currency === other.currency;
  }

  private assertSameCurrency(other: Money) {
    if (this.currency !== other.currency)
      throw new CurrencyMismatchError(this.currency, other.currency);
  }
}

// Also: typed IDs stop you passing a userId where an orderId belongs
export class OrderId {
  private readonly _brand = Symbol('OrderId');    // nominal typing in TS
  private constructor(readonly value: string) {}
  static from(v: string): OrderId {
    if (!/^ord_[0-9a-z]{12}$/.test(v)) throw new InvalidOrderIdError(v);
    return new OrderId(v);
  }
}
```
Three bug classes disappear: floating-point money errors, currency mixing, and passing the wrong ID to a function that takes two strings.

**Aggregate** — a cluster of entities and value objects treated as a **single unit for data changes**, with one entity designated the **aggregate root**. The root is the only entry point: external code holds a reference to the root and never to internal members.

The aggregate's job is to be a **consistency boundary**: everything inside it is transactionally consistent; anything outside is eventually consistent.

```ts
export class Order {                         // ← aggregate root
  private constructor(
    readonly id: OrderId,
    readonly customerId: CustomerId,
    private status: OrderStatus,
    private readonly lines: OrderLine[],     // ← internal entities, never exposed raw
    private readonly events: DomainEvent[] = [],
  ) {}

  addLine(sku: Sku, qty: number, unitPrice: Money): void {
    if (this.status !== OrderStatus.Draft)
      throw new OrderNotModifiableError(this.id);
    if (this.lines.length >= 100)
      throw new TooManyLinesError();                          // invariant enforced here
    const existing = this.lines.find(l => l.sku.equals(sku));
    existing ? existing.increaseQuantity(qty)
             : this.lines.push(OrderLine.create(sku, qty, unitPrice));
  }

  submit(): void {
    if (this.lines.length === 0) throw new EmptyOrderError(this.id);
    if (this.total().isZero()) throw new ZeroValueOrderError(this.id);
    this.status = OrderStatus.Submitted;
    this.events.push(new OrderSubmitted(this.id, this.customerId, this.total()));
  }

  total(): Money {
    return this.lines.reduce((sum, l) => sum.add(l.subtotal()),
                             Money.of(0, Currency.BDT));
  }

  pullEvents(): DomainEvent[] { return this.events.splice(0); }
}
```

Notice there is no `order.setStatus()` and no `order.getLines()` returning a mutable array. Every state change goes through a method that enforces the invariants. That's the whole point — **an aggregate that exposes setters is just a data bag with extra classes.**

---

## Q6: Designing Aggregate Boundaries

### Q: How do you decide what belongs in an aggregate?

**A:** The four rules, in priority order:

**1. Protect true invariants.** Put things in the same aggregate only if a business rule requires them to be consistent *at every instant*. "An order's total must equal the sum of its lines" is a true invariant → lines belong inside `Order`. "A customer's lifetime value must reflect all their orders" is *not* a true invariant — nobody is harmed if it's 200 ms stale → orders don't belong inside `Customer`.

**2. Keep aggregates small.** Large aggregates mean loading a lot of data to change one field, and they become concurrency bottlenecks — every update to any part of a 10,000-line aggregate contends with every other. The default should be a root plus a handful of value objects.

**3. Reference other aggregates by identity only.** `Order` holds a `CustomerId`, not a `Customer` object. This keeps the aggregate small, prevents accidental lazy-loading of half the database, and makes the transaction boundary obvious.

**4. One aggregate per transaction.** Modify exactly one aggregate per transaction; propagate to others via domain events and eventual consistency. If you find yourself needing to modify three aggregates atomically, your boundaries are wrong — or the rule you're protecting isn't actually an invariant.

**The classic worked example — an order and inventory:**

Tempting: put stock inside the order aggregate so "never oversell" is transactionally enforced. But that means every order touching the same SKU serialises on that SKU's row, and on a flash sale you get a lock convoy.

Correct: `Order` and `StockItem` are separate aggregates. Ordering *reserves* stock via a command; the reservation is a separate aggregate with a TTL; oversell is prevented by an atomic conditional decrement (`UPDATE stock SET available = available - 1 WHERE sku = ? AND available >= 1`) which either succeeds or doesn't. If it fails, the saga compensates. You accept a small window where two customers both see "1 left" — and you solve that with product design (show "low stock", confirm at checkout), not with a giant transaction.

**Concurrency:** aggregates use optimistic locking on a version column. Two concurrent modifications → the second gets a version conflict → retry with fresh state. Attach the version to every write:

```sql
UPDATE orders SET status = $1, version = version + 1
WHERE id = $2 AND version = $3;     -- 0 rows affected → OptimisticLockError → retry
```

---

## Q7: Domain Events vs Integration Events

### Q: What's the difference and why does it matter?

**A:**

| | Domain event | Integration event |
|---|---|---|
| Scope | Inside one bounded context | Crosses context/service boundaries |
| Audience | Other aggregates and handlers in the same context | Other services |
| Coupling | Free to change with the context | **A public contract — versioned, backward compatible** |
| Payload | Rich domain objects | Serialised primitives, deliberately shaped for consumers |
| Transport | In-process event bus | Kafka / RabbitMQ / EventBridge |
| Naming | `OrderSubmitted` | `orders.order-submitted.v1` |

**Why you shouldn't publish domain events directly to Kafka:** your internal model becomes your public API. Rename an internal field and you break three teams. Instead, translate at the boundary:

```ts
// Internal domain event — rich, contextual, free to evolve
class OrderSubmitted {
  constructor(readonly orderId: OrderId, readonly customerId: CustomerId,
              readonly total: Money, readonly lines: OrderLine[]) {}
}

// Boundary translator → stable public contract written to the outbox
@Injectable()
export class OrderIntegrationEventPublisher {
  @OnEvent('order.submitted')
  async onOrderSubmitted(e: OrderSubmitted) {
    await this.outbox.enqueue({
      eventType: 'orders.order-submitted',
      eventVersion: 1,
      partitionKey: e.orderId.value,
      payload: {
        orderId:     e.orderId.value,
        customerId:  e.customerId.value,
        totalMinor:  e.total.toMinorUnits(),   // primitives, not value objects
        currency:    e.total.currencyCode(),
        lineCount:   e.lines.length,
      },
    });
  }
}
```

The internal event can change freely; the integration event is versioned and governed. And it goes through the **outbox** so publication is atomic with the state change.

**Where to raise domain events:** inside the aggregate, collected in a list, and dispatched by the application layer *after* the transaction commits. Raising them inside the aggregate keeps the domain rule and its consequence together; dispatching after commit means you never publish "OrderSubmitted" for a transaction that rolled back.

---

## Q8: Repositories & Domain Services

### Q: What is a repository, and how is it different from a DAO?

**A:** A repository provides a **collection-like interface for aggregates**: you get and save whole aggregates, in the domain's language. A DAO is a table-oriented data access object — one per table, with CRUD methods.

```ts
// Repository — aggregate-oriented, domain vocabulary, defined by the DOMAIN layer
export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  findPendingOlderThan(cutoff: Date): Promise<Order[]>;   // a domain concept
  save(order: Order): Promise<void>;                      // persists the whole aggregate
}
```

Key properties: **one repository per aggregate root** (not per table — order lines have no repository, they're reached through `Order`); the interface lives in the domain layer and the implementation in infrastructure (dependency inversion); and it returns fully-constructed, always-valid domain objects, never raw rows.

**What repositories are *not* for:** complex read queries for the UI. `findOrdersWithCustomerNameAndShippingStatusForDashboard()` is not a repository method — that's the query side of CQRS and should be a purpose-built read query returning a DTO. Trying to serve reporting through repositories is how repositories grow 40 methods and become unmaintainable.

### Q: When do you need a domain service?

**A:** When a piece of domain logic doesn't naturally belong to any single entity or value object — typically because it involves several aggregates or an external policy.

```ts
// Doesn't belong to Account A or Account B — it's about the relationship
export class FundsTransferService {
  transfer(from: Account, to: Account, amount: Money, rate: ExchangeRate): void {
    from.debit(amount);                       // each aggregate enforces its own rules
    to.credit(rate.convert(amount, to.currency));
  }
}
```

**Keep them rare.** A codebase where all the logic sits in `*Service` classes and entities are anaemic data holders is the **anaemic domain model** anti-pattern — you've written procedural code with object syntax and paid for the object ceremony without getting encapsulation. The test: if `Order` has only getters and setters and `OrderService` has all the rules, the model is anaemic. Push behaviour into the aggregate; use a domain service only for genuinely cross-aggregate logic.

---

## Q9: Event Storming

### Q: What is event storming and how do you run one?

**A:** A collaborative modelling workshop — domain experts and engineers in one room with a very long wall and sticky notes — used to discover the domain and its boundaries fast. It's the most practical way to *find* bounded contexts rather than guessing.

**The colour convention:**

| Colour | Element |
|---|---|
| 🟠 Orange | **Domain event** — past tense: "Order Submitted" |
| 🔵 Blue | **Command** — what caused it: "Submit Order" |
| 🟡 Yellow | **Actor** — who issued the command |
| 🟣 Purple | **Policy** — "whenever X, then Y" |
| 🟢 Green | **Read model** — what the actor looked at to decide |
| 🔴 Red | **Hot spot** — a disagreement, unknown, or risk. **The most valuable notes on the wall.** |
| 🩷 Pink | **External system** |

**The sequence:**
1. **Chaotic exploration** — everyone writes domain events on orange stickies, no ordering. Just get them out.
2. **Enforce the timeline** — arrange left to right; duplicates merge, gaps become obvious.
3. **Add commands and actors** — what triggered each event, and who.
4. **Add policies and read models** — the "whenever… then…" rules that connect events to new commands.
5. **Identify aggregates** — cluster commands and events that share a consistency boundary.
6. **Draw bounded contexts** — the clusters with high internal cohesion and thin connections between them are your contexts. **These are your candidate service boundaries.**

**Why to mention it in an interview:** when asked "how would you decide the microservice boundaries for this system?", answering "I'd run an event storming session with the domain experts, then draw contexts around the clusters where the event flow naturally pinches" is a process answer, and process answers are what distinguish leads from seniors.

---

# Part B — Data Architecture

## Q10: OLTP vs OLAP

### Q: Why can't one database serve both?

**A:** They have opposite physical requirements.

| | OLTP | OLAP |
|---|---|---|
| Query shape | Point lookups, small ranges by key | Full scans, aggregations over billions of rows |
| Rows touched | 1–100 | 10⁶–10¹¹ |
| Writes | High-frequency, small, transactional | Bulk load / append |
| Storage layout | **Row-oriented** — the whole row is contiguous | **Column-oriented** — each column contiguous |
| Indexes | Many B-trees | Few; zone maps / min-max, sort keys |
| Normalisation | Normalised | Star/snowflake schema, denormalised |
| Latency target | Single-digit ms | Seconds to minutes is fine |
| Concurrency | Thousands of users | Tens of analysts |

**Why columnar wins for analytics** — this is the mechanism to explain: `SELECT AVG(amount) FROM transactions WHERE year = 2026` over a 50-column table reads *two* columns in a column store and *all fifty* in a row store, because a row store must load whole rows off disk. That's a 25× I/O reduction before you count compression — and columnar data compresses far better because adjacent values in a column are similar (run-length encoding on a `country` column, delta encoding on timestamps, dictionary encoding on low-cardinality strings). 10× compression on top of 25× less I/O is why ClickHouse answers in a second what Postgres takes ten minutes to do.

**Vectorised execution** adds more: process a batch of column values per CPU instruction (SIMD) rather than a row at a time through an iterator.

**The practical architecture:** OLTP database as the source of truth → CDC or a batch ETL → warehouse/lakehouse for analytics. Never let analysts run ad-hoc queries against the production OLTP primary; at minimum give them a dedicated replica, and preferably a warehouse. A single unindexed analytical query on the primary can lock up the checkout path.

**HTAP** systems (TiDB, SingleStore, CockroachDB with columnar replicas, Postgres + Citus columnar) try to serve both by keeping a row store for writes and a column-store replica for analytics. Useful, but the specialised stack still wins at either extreme.

---

## Q11: Data Lake, Warehouse & Lakehouse

### Q: Compare them.

**A:**

| | Data warehouse | Data lake | Lakehouse |
|---|---|---|---|
| Schema | **Schema-on-write** — defined before load | **Schema-on-read** — raw files, interpret later | Schema-on-write over open files |
| Storage | Proprietary columnar | Object storage (S3), any format | Object storage + open table format |
| Format | Internal | Parquet, JSON, CSV, images, logs | **Parquet + Delta Lake / Iceberg / Hudi** |
| Cost | High | Very low | Low |
| Governance | Strong | Weak — becomes a "data swamp" without discipline | Strong (ACID, schema enforcement, time travel) |
| Users | Analysts, BI | Data scientists, ML | Both |
| Examples | Redshift, Snowflake, BigQuery | S3 + Glue + Athena | Databricks, Iceberg on S3 + Trino |

**The lakehouse is the current consensus** because open table formats added the warehouse's missing guarantees to cheap object storage: **ACID transactions** (a reader never sees a half-written commit), **schema enforcement and evolution**, **time travel** (query the table as of last Tuesday — invaluable for debugging and reproducible ML training), **upserts and deletes** (which raw Parquet cannot do, and which GDPR requires), and **compaction** of small files.

**The failure mode to name:** a data lake with no catalogue, no ownership and no schema contract becomes a **data swamp** — petabytes nobody can interpret or trust. The fix is governance (Q17), not more storage.

**Modelling in the warehouse:** the **star schema** — a central fact table (one row per business event: an order line, a payment) surrounded by dimension tables (customer, product, date, store). Facts are numeric and additive; dimensions are descriptive and wide. **Slowly changing dimensions** matter: when a customer moves city, do you overwrite (Type 1, losing history) or add a new row with validity dates (Type 2, preserving "what was true at the time")? Type 2 is usually right for anything that appears in a historical report — otherwise last year's regional sales numbers change every time someone relocates.

---

## Q12: Change Data Capture

### Q: What is CDC and why is it better than polling?

**A:** CDC streams row-level changes out of a database by reading its **replication log** — Postgres WAL, MySQL binlog, MongoDB oplog — rather than querying tables.

| | Polling (`WHERE updated_at > ?`) | **CDC (log-based)** |
|---|---|---|
| Latency | Poll interval | Milliseconds |
| DB load | A repeated query, forever | Near zero — reads the log the DB already writes |
| **Captures deletes** | **No** — the row is gone | **Yes** |
| Captures intermediate states | No — only the final value between polls | Yes — every change |
| Requires schema support | An `updated_at` column, reliably maintained | Nothing |
| Ordering | Approximate | Exact, transactional order |

The missed-deletes problem is the killer argument: a polling sync leaves deleted rows in the downstream system forever unless you add soft deletes everywhere.

**Debezium** is the standard implementation — a Kafka Connect source connector per database, emitting one message per row change:

```json
{
  "op": "u",                                  // c=create, u=update, d=delete, r=snapshot
  "ts_ms": 1754481600000,
  "source": { "db": "shop", "table": "orders", "lsn": 24023456, "txId": 9912 },
  "before": { "id": "ord_1", "status": "PENDING", "total_minor": 250000 },
  "after":  { "id": "ord_1", "status": "PAID",    "total_minor": 250000 }
}
```

**What CDC unlocks:**
- **Replicating to a search index / cache / warehouse** without dual-writes.
- **The outbox pattern at low latency** — tail the outbox table instead of polling it.
- **Zero-downtime migrations** — CDC keeps the new database in sync with the old while you cut over incrementally.
- **Materialised views across services** — a read model built from another service's changes (with an ACL translating the foreign schema).
- **Audit trails** derived from the log rather than hand-maintained.

**The operational details that show experience:**
- **Snapshot then stream.** On first start Debezium takes a consistent snapshot of existing rows, then switches to the log. The snapshot of a large table is expensive; incremental snapshots (signal-based) avoid a long lock/read.
- **Replication slots must be consumed.** An abandoned Postgres slot causes WAL to accumulate until the disk fills and the database stops. **Alert on `pg_replication_slots.restart_lsn` lag** — this is a real production outage cause.
- **Schema changes** propagate; downstream consumers need a compatibility policy.
- **Don't CDC another service's tables without an ACL.** Otherwise you've coupled to their internal schema and they can't refactor. This is the main criticism of CDC-based integration and the reason the *outbox* table (a deliberate public contract) is preferable to tailing domain tables directly.

---

## Q13: Stream Processing & Windowing

### Q: What are the windowing strategies?

**A:**

| Window | Shape | Use |
|---|---|---|
| **Tumbling** | Fixed size, non-overlapping (every 5 min) | Periodic aggregates — "orders per 5 minutes" |
| **Hopping/sliding** | Fixed size, advances by a smaller step (5 min, every 1 min) | Moving averages, smoother alerting |
| **Session** | Grouped by activity, closed after an inactivity gap | User sessions, per-device activity bursts |
| **Global** | All time | Running totals |

```
Tumbling (5m):  |--w1--|--w2--|--w3--|
Hopping (5m/1m):|--w1--|
                   |--w2--|
                      |--w3--|
Session (gap 30m): |-user active-|   gap   |-user active-|
```

### Q: Event time vs processing time?

**A:** The single most important concept in stream processing.

- **Event time** — when the thing actually happened (embedded in the record).
- **Processing time** — when your system got around to handling it.

They diverge because of network delay, mobile devices buffering while offline, consumer restarts and backfills. If you aggregate by processing time, replaying yesterday's data today puts it all in today's buckets and every historical report is wrong. **Always aggregate by event time.**

Which creates the **late data problem**: you closed the 10:00–10:05 window at 10:05, and at 10:09 an event timestamped 10:03 arrives from a phone that was in a tunnel.

**Watermarks** are the answer: a watermark of `T` asserts "I believe I've seen all events with event time ≤ T." Windows close when the watermark passes their end, with a configured allowed lateness. Records later than that go to a side output for reprocessing rather than being silently dropped.

```
allowed lateness = 5 min:
  window [10:00–10:05) closes when watermark ≥ 10:10
  event @10:03 arriving at 10:09 → still accepted, window result updated
  event @10:03 arriving at 10:20 → too late → side output / dead-letter
```

This is the classic **completeness vs latency** trade-off: wait longer and your results are more complete but staler. State it explicitly — there is no correct universal answer, it's a product decision.

### Q: Kafka Streams vs Flink vs Spark Streaming?

**A:**

| | Kafka Streams | Flink | Spark Structured Streaming |
|---|---|---|---|
| Model | A library in your app | A distributed cluster | Micro-batch (and continuous mode) |
| Deployment | Just another JVM service — scales with consumer groups | Its own cluster/JobManager | Its own cluster |
| Latency | ms | **ms — true record-at-a-time** | 100 ms–seconds (micro-batch) |
| State | RocksDB local + changelog topic | Managed, with rich checkpointing | Managed |
| Windowing | Good | **Best-in-class — event time, watermarks, complex triggers** | Good |
| Ops burden | Lowest | Highest | High |
| Best for | Kafka-native transformations, joins, aggregations | Complex event processing, CEP, huge stateful jobs | Teams already on Spark, unified batch+stream |

For a Node.js shop, note that Kafka Streams is JVM-only. The Node equivalents are consuming with KafkaJS and doing stateful aggregation yourself (fine for simple cases), or using **ksqlDB**/**Flink SQL** to express the streaming logic declaratively without writing a JVM app — which is usually the pragmatic answer.

---

## Q14: The Lambda & Kappa Architectures

### Q: Explain Lambda architecture and why Kappa replaced it.

**A:**

**Lambda** runs two parallel paths:
```
                 ┌──▶ BATCH layer (Spark over the full history) ──┐
raw events ──────┤                                                 ├──▶ SERVING layer
                 └──▶ SPEED layer (stream, approximate, recent) ──┘     (merged view)
```
The batch layer recomputes accurate results over all history (slow, correct); the speed layer covers the gap since the last batch run (fast, approximate); the serving layer merges them.

**Why it fell out of favour:** you implement and maintain **the same business logic twice**, in two different frameworks, and they inevitably drift. Debugging a discrepancy between the batch and speed paths is miserable.

**Kappa** removes the batch layer entirely: one stream-processing path, with the event log retained long enough that a **replay from offset zero** *is* the batch recompute.
```
raw events ──▶ LOG (Kafka, long retention / tiered to S3) ──▶ stream processor ──▶ serving
                                                                      ▲
                                              reprocess = replay from the beginning
                                              into a NEW output table, then swap
```
One codebase, one framework, and "fixing a bug in the aggregation" means replaying into a fresh output and atomically swapping. Kafka's tiered storage (offloading old segments to S3) makes indefinite retention affordable, which is what made Kappa practical.

**When Lambda is still defensible:** when the batch computation is genuinely different in kind (a heavy ML training job over the full corpus) rather than the same logic at a different cadence.

---

## Q15: Data Mesh

### Q: What is data mesh and what problem does it solve?

**A:** The problem: a **centralised data team** becomes a bottleneck. They own the warehouse but don't understand the source domains; source teams don't feel responsible for data quality once it leaves their database; every new dataset queues behind the central team's backlog; and nobody can fix a broken pipeline because the people who know the data and the people who own the pipeline are different.

Data mesh applies the microservices insight to analytical data: decentralise ownership to the domains, with a platform and governance to keep it coherent. Four principles:

1. **Domain ownership** — the team that produces the operational data also owns its analytical data. The orders team publishes the orders dataset.
2. **Data as a product** — the dataset has an owner, an SLA, documentation, a schema contract, quality metrics and a version. It is discoverable and self-describing. Consumers are customers, not ticket-filers.
3. **Self-serve data platform** — a central platform team provides the infrastructure (storage, pipeline tooling, catalogue, access control, lineage) so domain teams can publish without building plumbing. The platform team builds capability, not pipelines.
4. **Federated computational governance** — global standards (naming, PII classification, interoperability, retention) enforced **automatically in the platform**, decided by a federation of domain representatives rather than by a central authority.

**The honest assessment to give in an interview:** data mesh is an organisational solution requiring real platform investment and mature domain teams. Below a certain size — say, under 50 engineers or a handful of domains — a centralised data team is faster and cheaper, and adopting mesh principles prematurely just means every team badly reinvents pipelines. The transferable idea even at small scale is **"data as a product with an owner and a contract"**, which you can apply without any of the rest.

---

## Q16: Polyglot Persistence & Data Ownership

### Q: How do you decide when to add another datastore?

**A:** Each additional datastore costs: operational expertise, backup and restore procedures, monitoring, an on-call runbook, a consistency story with everything else, and a new failure mode. The bar should be high.

**Add one when the access pattern is fundamentally mismatched** with what you have, not when it's merely inconvenient:

| Symptom | Justified addition |
|---|---|
| Full-text relevance ranking that Postgres FTS can't tune | Elasticsearch, populated by CDC |
| Sub-millisecond reads at 100K QPS | Redis |
| Petabytes of append-only time series | Cassandra / Timescale / S3+Parquet |
| Multi-hop graph traversal ("friends of friends who bought X") | Neo4j |
| Analytical scans killing the OLTP primary | Warehouse / lakehouse |
| Media files in the database | S3 (always, immediately) |

**The rule that ties it together: exactly one system is the source of truth for any given piece of data.** Everything else is a derived view, rebuildable from the source. Say this explicitly — it's what keeps polyglot persistence from becoming an unresolvable consistency mess. And then verify it: can you actually rebuild the search index from scratch? If not, it's a second source of truth pretending to be a cache.

**Data ownership across services:** a service owns its data exclusively — no other service reads its tables directly. Other services get data via API, via published events, or via a read model they maintain from those events. Shared databases across services are the single most common cause of the distributed monolith.

**When another service needs your data:**
1. **Synchronous API call** — simple, but adds a runtime dependency and its availability multiplies with yours.
2. **A local read model** built from your published events — no runtime coupling, eventually consistent, and the consumer owns the shape they need. Usually the best answer.
3. **Data replication via CDC** with an ACL — for bulk needs; couples to schema unless you publish an outbox.

---

## Q17: Data Governance, Lineage & Retention

### Q: What does data governance actually involve?

**A:** Four concrete things, not a committee:

**1. Catalogue and discovery.** A searchable inventory: what datasets exist, who owns them, what each column means, freshness, and quality metrics. (DataHub, Amundsen, AWS Glue Data Catalog, Unity Catalog.) Without it, the most common data-team question is "does this number already exist somewhere?"

**2. Lineage.** A graph of where each dataset came from and what depends on it, ideally column-level. It answers the two questions that matter: *"if I change this column, what breaks?"* (impact analysis) and *"this dashboard number looks wrong — where did it come from?"* (root cause). Captured automatically from query logs and pipeline metadata (OpenLineage is the emerging standard), never maintained by hand — hand-maintained lineage is stale within a month.

**3. Classification and access control.** Tag columns as public / internal / confidential / PII, then enforce mechanically: column-level masking, row-level security by tenant or region, and audited access to sensitive data. Classification without enforcement is a spreadsheet.

**4. Quality contracts.** Automated tests on data, running as part of the pipeline: freshness (updated within N hours), volume (row count within an expected band — catches silent pipeline failures), uniqueness, null rates, referential integrity, and distribution drift. A failing check should block downstream consumption rather than silently propagate bad data into every dashboard. (Great Expectations, dbt tests, Soda.)

### Q: How do you handle retention and the right to be forgotten?

**A:**

**Retention** is driven by three competing forces — legal minimums (financial records often 5–7 years; Bangladesh Bank has its own requirements for fintech), legal maximums (GDPR's storage limitation: keep personal data no longer than necessary for the stated purpose), and cost. Implement as an automated policy per dataset, with tiering (hot → warm → cold → delete) rather than a manual annual cleanup nobody performs.

**Right to erasure** across a modern data stack is genuinely hard, because the data has been copied into a warehouse, a search index, caches, backups, logs and event streams. The techniques:

- **Crypto-shredding** — encrypt each subject's personal data with a per-subject key; deletion means destroying the key. This is the only practical answer for immutable stores (event logs, append-only Parquet, WORM backups) and for backups you cannot selectively rewrite.
- **Pseudonymisation at ingestion** — keep personal identifiers in one small, deletable "vault" table and use surrogate IDs everywhere else. Then erasure touches one place and everything downstream degrades to anonymous.
- **Deletion propagation** — publish a `subject.erasure-requested` event that every system consumes and acts on, with an audit record proving each one completed. You need the audit trail as much as the deletion.
- **Table formats that support deletes** — Iceberg/Delta make row-level deletion in a lake feasible, which raw Parquet does not.
- **Explicitly scope backups** — document the backup retention window and that erasure completes when the last backup containing the subject rolls off. Regulators generally accept a documented, bounded window; they do not accept "we can't."

**Data residency** — GDPR restricts transfer outside the EEA; some jurisdictions require citizen data to stay in-country. Architecturally this means region-pinned storage, region-aware routing at the edge (route by the user's home region, not their current location), and being able to prove where each byte lives. For a BD fintech context, Bangladesh Bank guidance on where financial data may be hosted is a concrete example worth naming.

---

## Quick Reference

**DDD in one page:**
```
Strategic (high value):     bounded context → context map → ubiquitous language
                            subdomain: core (build) / supporting (build simply) / generic (buy)
Tactical (use where complex): value object → entity → aggregate (consistency boundary)
                              → repository (one per aggregate root) → domain event
Rules:  one aggregate per transaction · reference other aggregates by ID
        invariants inside the aggregate · everything else eventually consistent
```

**Data architecture defaults:**

| Need | Default |
|---|---|
| Get operational data into analytics | CDC (Debezium) → Kafka → lakehouse |
| Publish state changes to other services | Outbox table → relay → Kafka (not raw table CDC) |
| Analytics store | Iceberg/Delta on S3 + Trino, or Snowflake/BigQuery if you'd rather buy |
| Streaming aggregation | Event time + watermarks + allowed lateness, always |
| Reprocessing | Kappa — replay the log into a new output and swap |
| Deleting a person from an immutable log | Crypto-shredding |
| Historical accuracy in dimensions | Type 2 slowly changing dimensions |

**Anti-patterns to name:** anaemic domain model; the god `Customer` table spanning five contexts; publishing internal domain events as public contracts; sharing a database between services; a data lake with no catalogue (swamp); polling for changes instead of CDC (and silently missing deletes); aggregating streams by processing time; two systems both claiming to be the source of truth.
