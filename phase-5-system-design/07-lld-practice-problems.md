# Low-Level Design — Practice Problems

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** LLD method, concurrency, and worked designs in TypeScript
> **Last Updated:** 2026-08-06

SOLID and the GoF patterns are covered in [Design Patterns in Practice](../phase-1-core-programming/05-design-patterns-in-practice.md). This guide is about **applying** them under interview conditions.

---

## In 60 seconds

1. **LLD is the opposite altitude from HLD.** HLD asks "how many servers?" LLD asks "what
   classes, what methods, what happens when two threads call this at once?" Both rounds exist
   because they test different things.
2. **You will be asked to actually write code**, usually in 30–45 minutes, usually one of: LRU
   cache, rate limiter, task scheduler, parking lot, elevator, or an in-process pub/sub.
3. **Start with the interface, not the implementation.** Say what the public methods are and
   what each guarantees, *then* fill them in. It gives the interviewer something to react to
   early and it structures the rest of the session.
4. **Ask about concurrency explicitly.** "Is this called from multiple threads?" is a strong
   question — most candidates never ask, and then their design is silently wrong.
5. **Naming and boundaries are being scored.** A class that does one thing, an interface where a
   detail might change, and no god object. This is where your
   [design patterns](../phase-1-core-programming/05-design-patterns-in-practice.md) knowledge
   shows up in practice.
6. **Say your complexity out loud.** "Get and put are both O(1) — hash map for lookup, doubly
   linked list for recency." Interviewers wait for this, and most candidates make them ask.

**The interview trap to expect:** the LRU cache. It is the single most common LLD question, and
the reason is that the naive answer (an array, scanning for the oldest) is O(n) — they want to
see you reach for a hash map **plus** a doubly linked list, and explain why neither alone is
enough.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **LLD** | Low-Level Design — classes, interfaces, methods. Code-level design |
| **OOD** | Object-Oriented Design. Used interchangeably with LLD in interviews |
| **Interface** | The contract: what can be called, without saying how |
| **Encapsulation** | Hiding internal state so it cannot be corrupted from outside |
| **God object** | One class that does everything. The classic LLD failure |
| **Composition over inheritance** | Prefer holding objects to extending classes |
| **Thread safety** | Correct even when several threads call it at the same time |
| **Race condition** | Two operations interleaving and producing a wrong result |
| **Mutex / lock** | Ensuring only one thread is inside a section at a time |
| **Atomic operation** | Happens entirely or not at all; cannot be interrupted halfway |
| **Doubly linked list** | Each node points both ways, so removal is O(1). Half of the LRU answer |
| **Hash map** | Key → value in O(1). The other half |
| **Amortised O(1)** | Usually constant time, occasionally slower — averages out |
| **Sliding window** | A rate-limit approach counting events in a moving time range |
| **Token bucket** | Rate limiting that permits short bursts |
| **Priority queue / heap** | Always gives you the smallest or largest item next. Used in schedulers |
| **Trie** | A tree for prefix lookups — autocomplete, word search |
| **Observer** | Objects register interest and get notified. The basis of pub/sub |
| **Idempotent** | Calling it twice has the same effect as once |
| **Backoff** | Waiting longer between each retry |

---

## Table of Contents

1. [The LLD Interview Method](#1-the-lld-interview-method)
2. [Concurrency for LLD](#2-concurrency-for-lld)
3. [Parking Lot](#3-parking-lot)
4. [Elevator System](#4-elevator-system)
5. [Vending Machine](#5-vending-machine)
6. [LRU Cache](#6-lru-cache)
7. [Rate Limiter](#7-rate-limiter)
8. [In-Memory Pub/Sub](#8-in-memory-pubsub)
9. [Splitwise](#9-splitwise-expense-sharing)
10. [Logging Framework](#10-logging-framework)
11. [Task Scheduler](#11-task-scheduler--cron)
12. [In-Memory File System](#12-in-memory-file-system)
13. [Rapid-Fire Designs](#13-rapid-fire-designs)
14. [Quick Reference](#quick-reference)

---

## 1. The LLD Interview Method

### Q: How is an LLD interview different from HLD?

**A:** HLD asks "what are the boxes and how do they talk?" LLD asks "show me the classes inside one box." You're scored on object modelling, extensibility, correctness under concurrency, and whether you can resist over-engineering.

**The five-step method:**

| Step | Time (45 min) | Output |
|---|---|---|
| 1. Clarify requirements & scope | 5 min | 5–8 bullet use cases; explicit exclusions |
| 2. Identify entities & relationships | 5 min | Nouns → classes; verbs → methods |
| 3. Define the core interfaces | 5 min | The abstractions that make it extensible |
| 4. Write the key classes | 20 min | Working code for the interesting parts |
| 5. Concurrency, edge cases, extensibility | 10 min | "How would this handle X?" |

**Rules that separate strong candidates:**

- **Find the nouns and verbs.** "A *customer* parks a *vehicle* in a *spot* at a *parking lot* and receives a *ticket*." Every italicised word is a candidate class; "parks" is a method on some coordinator.
- **Start with interfaces where variation is expected.** The interviewer *will* ask "now support electric vehicles" or "now add a different pricing model." If your design needs an `if` added to five places, you failed the extensibility test. If it needs one new class, you passed.
- **Enums over booleans, and never over magic strings.** `VehicleType.MOTORCYCLE`, not `type === 2`.
- **Don't build a database.** In-memory collections are correct for LLD. Mention where persistence would plug in (a repository interface) and move on.
- **Do state the concurrency story**, even if the interviewer doesn't ask. "Two threads assigning the same spot" is the single most common follow-up.
- **Resist over-engineering.** A parking lot does not need an abstract factory, a visitor, and an event bus. Use a pattern when it removes a conditional you'd otherwise have to keep editing; otherwise write plain code.

**The patterns that actually come up in LLD interviews**, and what triggers each:

| Trigger | Pattern |
|---|---|
| "Support a different pricing/matching/notification rule" | **Strategy** |
| "Notify several components when X happens" | **Observer** |
| "Create the right subclass based on input" | **Factory** |
| "One shared instance" | **Singleton** (mention thread safety, and that DI is usually better) |
| "Behaviour changes as the object's state changes" | **State** |
| "Undo/redo, queue of operations" | **Command** |
| "Add behaviour without subclassing" | **Decorator** |
| "Chain of handlers, each may handle or pass on" | **Chain of Responsibility** |
| "Complex object with many optional fields" | **Builder** |

---

## 2. Concurrency for LLD

### Q: How do you discuss concurrency in a Node.js context?

**A:** Be precise about the model, because it changes the answer entirely. **Node.js runs JavaScript on a single thread**, so there are no data races on plain object mutation between two lines of synchronous code — that block is atomic with respect to other JS. But there absolutely *are* interleaving bugs across `await` boundaries, because the event loop can run other work while you're suspended.

```ts
// BUGGY: a race across the await boundary, even in single-threaded Node
async function reserveSpot(lotId: string): Promise<Spot> {
  const spot = await this.repo.findFreeSpot(lotId);   // ← suspends here
  // Another request can run this same line and get the SAME spot
  spot.status = 'OCCUPIED';
  await this.repo.save(spot);                          // both save; one overwrites
  return spot;
}

// CORRECT: make the check-and-claim a single atomic operation
async function reserveSpot(lotId: string): Promise<Spot> {
  const spot = await this.repo.claimFreeSpotAtomically(lotId);
  //   UPDATE spots SET status='OCCUPIED', ... WHERE lot_id=$1 AND status='FREE'
  //   ORDER BY id LIMIT 1 RETURNING *      ← one statement, no race
  if (!spot) throw new LotFullError(lotId);
  return spot;
}
```

**The three tools, in order of preference:**

1. **Atomic operations** — an atomic conditional update, `SPOP`, `INCR`, or a compare-and-swap. No lock to hold, no lock to leak. Always prefer this.
2. **Optimistic concurrency** — read a version, write with `WHERE version = ?`, retry on conflict. Good when conflicts are rare.
3. **Pessimistic locking** — `SELECT … FOR UPDATE`, a mutex, a distributed lock. Correct but serialises, and introduces deadlock and lock-leak risk.

**In-process mutual exclusion in Node** (for coordinating async operations within one process):

```ts
// A minimal async mutex — an ordered queue of waiters
class Mutex {
  private tail: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const next = new Promise<void>(res => (release = res));
    const previous = this.tail;
    this.tail = this.tail.then(() => next);
    await previous;                    // wait for our turn
    try { return await fn(); }
    finally { release(); }             // let the next waiter proceed
  }
}

// Per-key locking: serialise per entity, stay parallel across entities
class KeyedMutex {
  private locks = new Map<string, Mutex>();
  runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    let m = this.locks.get(key);
    if (!m) { m = new Mutex(); this.locks.set(key, m); }
    return m.runExclusive(fn).finally(() => { /* GC idle locks periodically */ });
  }
}
```
Per-key locking is the pattern to reach for: it gives you correctness for a single entity without serialising unrelated work — the same idea as partitioning a Kafka topic by entity ID.

**Multi-process / multi-instance:** once you have more than one Node process (cluster, multiple pods), in-process locks are useless. You need a shared atomic primitive — a database constraint, a Redis Lua script, or a distributed lock with fencing. Say this explicitly; it's the follow-up that catches people.

**The classic problems, for when they're asked directly:**

| Problem | Node.js answer |
|---|---|
| **Producer–consumer** | A bounded async queue; producers `await` when full (backpressure), consumers `await` when empty |
| **Reader–writer** | A counter of active readers plus a writer flag, guarded by a mutex; or just accept that reads don't block in a single-threaded runtime |
| **Deadlock** | Requires two locks held in different orders. Prevent with a **global lock ordering**, timeouts on acquisition, or by never holding two locks |
| **Thread pool** | `worker_threads` with a fixed pool for CPU-bound work (crypto, image processing, parsing); the pool size should be ~CPU count |
| **Starvation** | FIFO queues for waiters (as in the `Mutex` above) rather than "whoever wakes first" |

---

## 3. Parking Lot

**The canonical LLD question.** Clarify aggressively: multiple floors? vehicle types? pricing model? reservations? Assume: multi-floor, three vehicle types, hourly pricing, no reservations.

### Design

```ts
enum VehicleType { MOTORCYCLE, CAR, TRUCK }
enum SpotType    { SMALL, MEDIUM, LARGE }

abstract class Vehicle {
  constructor(readonly licensePlate: string, readonly type: VehicleType) {}
}
class Motorcycle extends Vehicle {
  constructor(plate: string) { super(plate, VehicleType.MOTORCYCLE); }
}
class Car extends Vehicle { /* … */ }
class Truck extends Vehicle { /* … */ }

class ParkingSpot {
  private vehicle: Vehicle | null = null;
  constructor(
    readonly id: string,
    readonly floor: number,
    readonly type: SpotType,
  ) {}

  isFree(): boolean { return this.vehicle === null; }

  canFit(v: Vehicle): boolean {
    switch (v.type) {
      case VehicleType.MOTORCYCLE: return true;                  // fits anywhere
      case VehicleType.CAR:        return this.type !== SpotType.SMALL;
      case VehicleType.TRUCK:      return this.type === SpotType.LARGE;
    }
  }

  park(v: Vehicle): void {
    if (!this.isFree()) throw new SpotOccupiedError(this.id);
    if (!this.canFit(v)) throw new SpotTooSmallError(this.id, v.type);
    this.vehicle = v;
  }

  vacate(): Vehicle {
    if (!this.vehicle) throw new SpotAlreadyFreeError(this.id);
    const v = this.vehicle;
    this.vehicle = null;
    return v;
  }
}
```

**The extensibility seams — two Strategy interfaces:**

```ts
// "Now allocate the nearest spot to the entrance instead of the first free one."
interface SpotAllocationStrategy {
  findSpot(spots: ParkingSpot[], vehicle: Vehicle): ParkingSpot | null;
}

class FirstAvailableStrategy implements SpotAllocationStrategy {
  findSpot(spots: ParkingSpot[], v: Vehicle) {
    return spots.find(s => s.isFree() && s.canFit(v)) ?? null;
  }
}

class NearestToEntranceStrategy implements SpotAllocationStrategy {
  constructor(private readonly entranceFloor: number) {}
  findSpot(spots: ParkingSpot[], v: Vehicle) {
    return spots
      .filter(s => s.isFree() && s.canFit(v))
      .sort((a, b) => Math.abs(a.floor - this.entranceFloor)
                    - Math.abs(b.floor - this.entranceFloor))[0] ?? null;
  }
}

// "Now charge a flat day rate for trucks and free parking for the first 15 minutes."
interface PricingStrategy {
  calculate(ticket: Ticket, exitAt: Date): Money;
}

class HourlyPricing implements PricingStrategy {
  constructor(private readonly ratePerHour: Record<VehicleType, number>) {}
  calculate(ticket: Ticket, exitAt: Date): Money {
    const ms = exitAt.getTime() - ticket.entryAt.getTime();
    const hours = Math.ceil(ms / 3_600_000);          // round up to the hour
    const free = ms <= 15 * 60_000 ? 0 : hours;       // 15-min grace
    return Money.of(free * this.ratePerHour[ticket.vehicle.type], 'BDT');
  }
}
```

**The coordinator:**

```ts
class ParkingLot {
  private readonly spots: ParkingSpot[] = [];
  private readonly activeTickets = new Map<string, Ticket>();
  private readonly mutex = new Mutex();

  constructor(
    private readonly allocation: SpotAllocationStrategy,
    private readonly pricing: PricingStrategy,
    private readonly display: DisplayBoard,          // Observer
  ) {}

  async park(vehicle: Vehicle): Promise<Ticket> {
    // The find-then-claim must be atomic, or two vehicles get the same spot
    return this.mutex.runExclusive(async () => {
      const spot = this.allocation.findSpot(this.spots, vehicle);
      if (!spot) throw new LotFullError(vehicle.type);
      spot.park(vehicle);
      const ticket = new Ticket(randomUUID(), vehicle, spot, new Date());
      this.activeTickets.set(ticket.id, ticket);
      this.display.onSpotTaken(spot);                 // notify observers
      return ticket;
    });
  }

  async unpark(ticketId: string, paidWith: PaymentMethod): Promise<Receipt> {
    const ticket = this.activeTickets.get(ticketId);
    if (!ticket) throw new InvalidTicketError(ticketId);
    const fee = this.pricing.calculate(ticket, new Date());
    const payment = await paidWith.pay(fee);          // Strategy again
    ticket.spot.vacate();
    this.activeTickets.delete(ticketId);
    this.display.onSpotFreed(ticket.spot);
    return new Receipt(ticket, fee, payment.reference);
  }
}
```

### Discussion points to raise unprompted

- **Concurrency:** the `find → park` sequence is a check-then-act race; it's guarded by a mutex here, and in a real multi-instance system it would be an atomic conditional `UPDATE` in the database (shown in [§2](#2-concurrency-for-lld)). Fine-grain it per floor if the single mutex becomes a bottleneck.
- **Scaling the search:** scanning all spots is O(n). Keep a free-spot queue *per (floor, spot type)* so allocation is O(1).
- **Extensions and how they land:** EV charging spots → a new `SpotType` plus a `canFit` rule; reservations → a `Reservation` entity and an allocation strategy that respects holds; multiple entrances → the allocation strategy takes an entrance parameter. Note that each extension touches one place — that's the design working.

---

## 4. Elevator System

The interesting part is the **scheduling algorithm**, so get to it fast.

```ts
enum Direction { UP, DOWN, IDLE }

class Elevator {
  private currentFloor = 0;
  private direction = Direction.IDLE;
  private readonly up   = new MinHeap<number>();     // stops above, ascending
  private readonly down = new MaxHeap<number>();     // stops below, descending

  constructor(readonly id: string, readonly maxFloor: number) {}

  addStop(floor: number): void {
    if (floor > this.currentFloor) this.up.push(floor);
    else if (floor < this.currentFloor) this.down.push(floor);
    if (this.direction === Direction.IDLE) {
      this.direction = floor > this.currentFloor ? Direction.UP : Direction.DOWN;
    }
  }

  // One tick of movement — the SCAN ("elevator") algorithm
  step(): void {
    if (this.direction === Direction.UP) {
      if (!this.up.isEmpty()) { this.currentFloor = this.up.pop()!; this.openDoors(); }
      else if (!this.down.isEmpty()) this.direction = Direction.DOWN;   // reverse
      else this.direction = Direction.IDLE;
    } else if (this.direction === Direction.DOWN) {
      if (!this.down.isEmpty()) { this.currentFloor = this.down.pop()!; this.openDoors(); }
      else if (!this.up.isEmpty()) this.direction = Direction.UP;
      else this.direction = Direction.IDLE;
    }
  }

  /** Cost of serving this request — lower is better. Used by the dispatcher. */
  costFor(floor: number, dir: Direction): number {
    const distance = Math.abs(this.currentFloor - floor);
    if (this.direction === Direction.IDLE) return distance;
    const movingToward =
      (this.direction === Direction.UP && floor > this.currentFloor) ||
      (this.direction === Direction.DOWN && floor < this.currentFloor);
    // Same direction and on the way: cheap. Otherwise it must finish and come back.
    if (movingToward && dir === this.direction) return distance;
    return distance + 2 * this.maxFloor;              // penalty for a reversal
  }
}
```

**The dispatcher is where the Strategy pattern lives** — the interviewer's follow-up is always "now optimise for something else":

```ts
interface DispatchStrategy {
  select(elevators: Elevator[], floor: number, dir: Direction): Elevator;
}

class NearestCarStrategy implements DispatchStrategy {
  select(elevators: Elevator[], floor: number, dir: Direction) {
    return elevators.reduce((best, e) =>
      e.costFor(floor, dir) < best.costFor(floor, dir) ? e : best);
  }
}
// Alternatives worth naming: FCFS (bad), SCAN/LOOK (the classic),
// destination dispatch (riders enter their floor in the lobby — modern buildings),
// and energy-optimised (minimise total travel, at the cost of wait time).
```

**Points to raise:** distinguish the **hall call** (a button on a floor, with a direction) from the **car call** (a button inside, no direction) — they're scheduled differently, and conflating them is the common mistake. Also mention capacity limits (a full car should skip hall calls), door timing as a state machine (`CLOSED → OPENING → OPEN → CLOSING`), and emergency/maintenance modes that override the scheduler.

---

## 5. Vending Machine

**The point of this question is the State pattern.** Recognise it and say so.

```ts
interface VendingState {
  insertCoin(m: VendingMachine, coin: Coin): void;
  selectItem(m: VendingMachine, code: string): void;
  dispense(m: VendingMachine): void;
  refund(m: VendingMachine): void;
}

class IdleState implements VendingState {
  insertCoin(m: VendingMachine, coin: Coin) {
    m.addCredit(coin.value);
    m.setState(new HasMoneyState());
  }
  selectItem() { throw new InsufficientFundsError('Insert coins first'); }
  dispense()   { throw new NoSelectionError(); }
  refund()     { /* nothing to refund */ }
}

class HasMoneyState implements VendingState {
  insertCoin(m: VendingMachine, coin: Coin) { m.addCredit(coin.value); }

  selectItem(m: VendingMachine, code: string) {
    const item = m.inventory.get(code);
    if (!item)            throw new InvalidSelectionError(code);
    if (item.stock === 0) throw new OutOfStockError(code);
    if (m.credit < item.price)
      throw new InsufficientFundsError(`Need ${item.price - m.credit} more`);
    m.setSelection(code);
    m.setState(new DispensingState());
    m.dispense();                                   // transition drives the action
  }
  dispense() { throw new NoSelectionError(); }
  refund(m: VendingMachine) { m.returnCredit(); m.setState(new IdleState()); }
}

class DispensingState implements VendingState {
  insertCoin(m: VendingMachine, c: Coin) { m.returnCoin(c); }   // reject mid-dispense
  selectItem() { throw new BusyError(); }
  dispense(m: VendingMachine) {
    const item = m.inventory.get(m.selection!)!;
    item.stock--;
    const change = m.credit - item.price;
    m.dispenseItem(item);
    if (change > 0) m.dispenseChange(change);       // may fail → see below
    m.reset();
    m.setState(new IdleState());
  }
  refund() { throw new BusyError('Cannot refund mid-dispense'); }
}
```

**Why State beats a switch:** without it, every method is a `switch (this.status)` with a case per state, and adding a `MaintenanceState` means editing every method. With it, adding a state is adding one class — the Open/Closed Principle made concrete. Say that sentence; it's the reason the pattern exists.

**The change-making sub-problem** is a genuine follow-up: greedy (largest coin first) is optimal for standard denominations but **not for arbitrary ones** — with coins {1, 3, 4} making 6, greedy gives 4+1+1 (three coins) while the optimum is 3+3 (two). If asked for correctness, use dynamic programming. And handle "cannot make exact change" by refusing the sale *before* taking the money, not after.

---

## 6. LRU Cache

The classic. O(1) `get` and `put` requires **hash map + doubly-linked list**: the map gives O(1) lookup, the list gives O(1) reordering and eviction.

```ts
class Node<K, V> {
  prev: Node<K, V> | null = null;
  next: Node<K, V> | null = null;
  constructor(public key: K, public value: V) {}
}

export class LRUCache<K, V> {
  private readonly map = new Map<K, Node<K, V>>();
  private readonly head: Node<K, V>;   // sentinel: most-recently-used side
  private readonly tail: Node<K, V>;   // sentinel: least-recently-used side

  constructor(private readonly capacity: number) {
    if (capacity <= 0) throw new Error('capacity must be > 0');
    this.head = new Node(null as any, null as any);
    this.tail = new Node(null as any, null as any);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.moveToFront(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) { existing.value = value; this.moveToFront(existing); return; }

    if (this.map.size >= this.capacity) {
      const lru = this.tail.prev!;                  // sentinel makes this branch-free
      this.remove(lru);
      this.map.delete(lru.key);
    }
    const node = new Node(key, value);
    this.map.set(key, node);
    this.addToFront(node);
  }

  private moveToFront(n: Node<K, V>) { this.remove(n); this.addToFront(n); }

  private addToFront(n: Node<K, V>) {
    n.next = this.head.next;  n.prev = this.head;
    this.head.next!.prev = n; this.head.next = n;
  }

  private remove(n: Node<K, V>) {
    n.prev!.next = n.next;  n.next!.prev = n.prev;
    n.prev = n.next = null;
  }
}
```

**The two details that earn credit:** sentinel head/tail nodes eliminate every null check in the pointer manipulation (the source of most bugs in this problem), and it must be a *doubly*-linked list — with a singly-linked list, removing a node found via the map is O(n) because you can't reach its predecessor.

**Follow-ups:**
- **Thread safety:** in Node this is safe as written because every method is fully synchronous — the event loop can't interleave. Say that explicitly; then add that with `worker_threads` and `SharedArrayBuffer`, or in a multi-threaded runtime, you'd need a lock, and a sharded/striped design (N independent caches keyed by `hash(key) % N`) to avoid one global lock.
- **TTL:** store `expiresAt` per node, check on `get`, and lazily evict. A background sweeper only matters if expired entries are pinning memory.
- **LFU instead:** frequency counters plus a min-frequency pointer with a list per frequency — the O(1) LFU construction. LFU resists a one-off scan flushing the working set, which LRU doesn't.
- **JavaScript shortcut worth mentioning:** `Map` preserves insertion order, so a `Map`-only LRU is possible (`delete` then `set` to move to the end, evict `map.keys().next().value`). It's shorter, and the interviewer usually wants the linked list anyway to see you understand the mechanism.

---

## 7. Rate Limiter

The LLD version — implement the algorithms, not the distributed architecture (that's in [HLD problem 2](06-hld-practice-problems.md#2-distributed-rate-limiter)).

```ts
interface RateLimiter {
  allow(key: string, cost?: number): boolean;
}

class TokenBucketLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; last: number }>();

  constructor(
    private readonly ratePerSec: number,
    private readonly capacity: number,
    private readonly now: () => number = () => Date.now(),   // injected for testing
  ) {}

  allow(key: string, cost = 1): boolean {
    const t = this.now();
    const b = this.buckets.get(key) ?? { tokens: this.capacity, last: t };

    // Lazy refill: compute what has accrued since we last looked.
    // No timer, no background job — this is the trick worth explaining.
    b.tokens = Math.min(this.capacity, b.tokens + ((t - b.last) / 1000) * this.ratePerSec);
    b.last = t;

    if (b.tokens >= cost) { b.tokens -= cost; this.buckets.set(key, b); return true; }
    this.buckets.set(key, b);
    return false;
  }
}

class SlidingWindowLogLimiter implements RateLimiter {
  private readonly log = new Map<string, number[]>();
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  allow(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const times = (this.log.get(key) ?? []).filter(t => t > cutoff);   // evict old
    if (times.length >= this.limit) { this.log.set(key, times); return false; }
    times.push(now);
    this.log.set(key, times);
    return true;                       // exact, but O(requests) memory per key
  }
}

class SlidingWindowCounterLimiter implements RateLimiter {
  private readonly windows = new Map<string, { cur: number; prev: number; start: number }>();
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  allow(key: string): boolean {
    const now = Date.now();
    const w = this.windows.get(key) ?? { cur: 0, prev: 0, start: now };

    const elapsed = now - w.start;
    if (elapsed >= this.windowMs) {
      const skipped = Math.floor(elapsed / this.windowMs);
      w.prev  = skipped === 1 ? w.cur : 0;         // more than one window idle → reset
      w.cur   = 0;
      w.start = now - (elapsed % this.windowMs);
    }
    // Weight the previous window by how much of it is still inside the sliding window
    const overlap = 1 - (now - w.start) / this.windowMs;
    const estimate = w.prev * overlap + w.cur;

    if (estimate >= this.limit) { this.windows.set(key, w); return false; }
    w.cur++;
    this.windows.set(key, w);
    return true;                       // 2 counters, no boundary burst — the best default
  }
}
```

**Points to make:** lazy refill (compute elapsed time on access) avoids any background timer, which matters when you have millions of keys. Inject the clock so the tests are deterministic. And the maps need eviction — unbounded key growth is a memory leak; use an LRU or a TTL sweep over idle keys.

---

## 8. In-Memory Pub/Sub

Tests the Observer pattern plus real thinking about delivery semantics.

```ts
type Handler<T> = (msg: T, meta: MessageMeta) => Promise<void> | void;

interface Subscription { unsubscribe(): void; }

class PubSub {
  private readonly topics = new Map<string, Set<Subscriber>>();

  subscribe<T>(topic: string, handler: Handler<T>, opts: SubOpts = {}): Subscription {
    const sub = new Subscriber(handler, opts);
    if (!this.topics.has(topic)) this.topics.set(topic, new Set());
    this.topics.get(topic)!.add(sub);
    return { unsubscribe: () => this.topics.get(topic)?.delete(sub) };
  }

  async publish<T>(topic: string, msg: T): Promise<void> {
    const subs = this.topics.get(topic);
    if (!subs) return;
    const meta = { messageId: randomUUID(), publishedAt: Date.now(), topic };

    // Snapshot the set: a handler may subscribe/unsubscribe during dispatch
    await Promise.allSettled([...subs].map(s => s.deliver(msg, meta)));
    //  ^ allSettled, not all: one failing subscriber must not block the others
  }
}

class Subscriber {
  private readonly queue: (() => Promise<void>)[] = [];
  private draining = false;

  constructor(private readonly handler: Handler<any>, private readonly opts: SubOpts) {}

  async deliver(msg: any, meta: MessageMeta): Promise<void> {
    if (this.opts.ordered) {
      // Serialise per subscriber so messages are processed in publish order
      return new Promise((resolve, reject) => {
        this.queue.push(() => this.invoke(msg, meta).then(resolve, reject));
        void this.drain();
      });
    }
    return this.invoke(msg, meta);
  }

  private async drain() {
    if (this.draining) return;
    this.draining = true;
    while (this.queue.length) await this.queue.shift()!();
    this.draining = false;
  }

  private async invoke(msg: any, meta: MessageMeta, attempt = 1): Promise<void> {
    try { await this.handler(msg, meta); }
    catch (err) {
      if (attempt < (this.opts.maxRetries ?? 3)) {
        await sleep(Math.random() * 2 ** attempt * 100);        // backoff + jitter
        return this.invoke(msg, meta, attempt + 1);
      }
      this.opts.onDeadLetter?.(msg, meta, err);                 // DLQ hook
    }
  }
}
```

**The design decisions worth narrating** — these are what turn a 15-line answer into a senior one:
- **Wildcards** (`orders.*`): store topics in a trie or match with a compiled regex, cached per pattern.
- **Sync vs async dispatch:** synchronous is simpler but a slow subscriber blocks the publisher. Async with per-subscriber queues gives isolation, which is the right default.
- **Ordering** is per-subscriber, achieved by serialising that subscriber's queue. Global ordering across subscribers is not offered — and saying you *deliberately* don't offer it is better than pretending you do.
- **Backpressure:** an unbounded per-subscriber queue is a memory leak when a subscriber is slower than the publisher. Bound it and choose a policy: block the publisher, drop oldest, or drop newest.
- **Delivery semantics:** this is at-most-once for in-memory (a crash loses queued messages). Persisting the queue makes it at-least-once, which then requires idempotent handlers. Name where you sit.

---

## 9. Splitwise (Expense Sharing)

Deceptively interesting: the modelling is easy, the **debt simplification** is a real algorithm.

```ts
type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

interface SplitStrategy {
  split(total: Money, participants: UserId[], config: unknown): Map<UserId, Money>;
}

class EqualSplit implements SplitStrategy {
  split(total: Money, participants: UserId[]) {
    const share = total.divide(participants.length);
    const m = new Map(participants.map(p => [p, share]));
    // Remainder handling: 100/3 = 33.33 × 3 = 99.99. Assign the last paisa somewhere.
    const remainder = total.subtract(share.multiply(participants.length));
    if (!remainder.isZero()) m.set(participants[0], share.add(remainder));
    return m;
  }
}

class PercentageSplit implements SplitStrategy {
  split(total: Money, participants: UserId[], pct: Record<UserId, number>) {
    const sum = Object.values(pct).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 1e-9) throw new InvalidSplitError('must total 100%');
    return new Map(participants.map(p => [p, total.multiply(pct[p] / 100)]));
  }
}

class Expense {
  constructor(
    readonly id: string,
    readonly description: string,
    readonly amount: Money,
    readonly paidBy: UserId,
    readonly shares: Map<UserId, Money>,      // who owes what portion
    readonly createdAt: Date,
  ) {
    const total = [...shares.values()].reduce((a, b) => a.add(b), Money.zero(amount.currency));
    if (!total.equals(amount)) throw new SplitMismatchError();    // invariant
  }
}
```

**Balances as a net position per user** — the key modelling insight is that you don't store pairwise debts, you store each person's net balance and derive settlements:

```ts
class BalanceSheet {
  private readonly net = new Map<UserId, Money>();   // >0 is owed to them, <0 they owe

  apply(e: Expense): void {
    this.add(e.paidBy, e.amount);                    // they fronted the money
    for (const [user, share] of e.shares) this.add(user, share.negate());
  }
  private add(u: UserId, m: Money) {
    this.net.set(u, (this.net.get(u) ?? Money.zero(m.currency)).add(m));
  }

  /**
   * Debt simplification: minimise the NUMBER of transactions.
   * Greedy — repeatedly settle the largest creditor against the largest debtor.
   * Not provably minimal (that's NP-hard), but near-optimal and O(n log n) per step.
   */
  simplify(): Settlement[] {
    const creditors = new MaxHeap<[UserId, Money]>((a, b) => a[1].compare(b[1]));
    const debtors   = new MaxHeap<[UserId, Money]>((a, b) => a[1].compare(b[1]));
    for (const [u, bal] of this.net) {
      if (bal.isPositive()) creditors.push([u, bal]);
      else if (bal.isNegative()) debtors.push([u, bal.negate()]);
    }

    const out: Settlement[] = [];
    while (!creditors.isEmpty() && !debtors.isEmpty()) {
      const [cu, ca] = creditors.pop()!;
      const [du, da] = debtors.pop()!;
      const amount = ca.min(da);
      out.push({ from: du, to: cu, amount });
      if (ca.greaterThan(amount)) creditors.push([cu, ca.subtract(amount)]);
      if (da.greaterThan(amount)) debtors.push([du, da.subtract(amount)]);
    }
    return out;
  }
}
```

**Points to raise:** the simplification is a greedy approximation and the exact minimum-transaction problem is NP-hard — knowing that boundary is the signal. Also mention integer minor units throughout (never floats for money), remainder assignment rules that must be deterministic and auditable, multi-currency (either forbid mixing within a group, or fix an exchange rate at expense time and store it), and that expenses should be immutable with corrections modelled as reversals rather than edits — the same ledger discipline as the payments problem.

---

## 10. Logging Framework

Tests Chain of Responsibility, Strategy and Decorator all at once, and it's a domain everyone understands.

```ts
enum Level { TRACE, DEBUG, INFO, WARN, ERROR, FATAL }

interface LogRecord {
  level: Level; message: string; timestamp: Date;
  context: Record<string, unknown>; logger: string; error?: Error;
}

// Strategy: where it goes
interface Appender { append(r: LogRecord): void | Promise<void>; }
// Strategy: how it looks
interface Formatter { format(r: LogRecord): string; }
// Chain: whether it proceeds
interface Filter { shouldLog(r: LogRecord): boolean; }

class JsonFormatter implements Formatter {
  format(r: LogRecord): string {
    return JSON.stringify({
      ts: r.timestamp.toISOString(), level: Level[r.level], logger: r.logger,
      msg: r.message, ...r.context,
      ...(r.error && { err: { name: r.error.name, msg: r.error.message,
                              stack: r.error.stack } }),
    });
  }
}

class ConsoleAppender implements Appender {
  constructor(private readonly fmt: Formatter) {}
  append(r: LogRecord) {
    (r.level >= Level.ERROR ? process.stderr : process.stdout)
      .write(this.fmt.format(r) + '\n');
  }
}

/** Decorator: adds batching to ANY appender without changing it. */
class BufferedAppender implements Appender {
  private buf: LogRecord[] = [];
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly inner: Appender,
    private readonly size = 100,
    private readonly flushMs = 1000,
  ) {}

  append(r: LogRecord): void {
    this.buf.push(r);
    if (r.level >= Level.ERROR || this.buf.length >= this.size) return void this.flush();
    this.timer ??= setTimeout(() => this.flush(), this.flushMs);
  }

  flush(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
    const batch = this.buf; this.buf = [];
    for (const r of batch) void this.inner.append(r);
  }
}

class Logger {
  constructor(
    private readonly name: string,
    private readonly level: Level,
    private readonly appenders: Appender[],
    private readonly filters: Filter[] = [],
    private readonly parent?: Logger,               // hierarchical, like log4j
  ) {}

  log(level: Level, message: string, context: Record<string, unknown> = {}, err?: Error) {
    if (level < this.level) return;                 // cheapest check first
    const record: LogRecord = {
      level, message, timestamp: new Date(), logger: this.name,
      context: { ...this.ambientContext(), ...context }, error: err,
    };
    if (!this.filters.every(f => f.shouldLog(record))) return;
    for (const a of this.appenders) void a.append(record);
    this.parent?.log(level, message, context, err);  // propagate up the hierarchy
  }

  /** Correlation ID and request context, without threading it through every call. */
  private ambientContext(): Record<string, unknown> {
    return requestContext.getStore() ?? {};          // AsyncLocalStorage
  }

  error(msg: string, err?: Error, ctx?: Record<string, unknown>) {
    this.log(Level.ERROR, msg, ctx, err);
  }
}
```

**The design points to volunteer:**
- **Check the level before building the record.** Constructing a `LogRecord` and serialising context for a `DEBUG` call that will be discarded is the most common performance bug in logging. Lazy message evaluation (`log.debug(() => expensive())`) takes it further.
- **Async appenders must not lose logs on shutdown** — register a flush on `SIGTERM`/`beforeExit`.
- **Never log secrets.** Redact by an allowlist of loggable fields rather than a denylist of forbidden ones — a denylist misses the field someone added last week.
- **Correlation IDs via `AsyncLocalStorage`** so every log line in a request carries the trace ID without being passed as a parameter. This is the single most useful feature of a real logging setup.
- **Structured (JSON) over string interpolation**, always, so logs are queryable.

---

## 11. Task Scheduler / Cron

```ts
interface Job {
  id: string;
  run(): Promise<void>;
}

interface Trigger {
  /** Next run strictly after `after`, or null if the trigger is exhausted. */
  nextRunAfter(after: Date): Date | null;
}

class OneTimeTrigger implements Trigger {
  constructor(private readonly at: Date) {}
  nextRunAfter(after: Date) { return this.at > after ? this.at : null; }
}

class FixedIntervalTrigger implements Trigger {
  constructor(private readonly everyMs: number, private readonly from: Date) {}
  nextRunAfter(after: Date) {
    const elapsed = after.getTime() - this.from.getTime();
    const n = Math.floor(elapsed / this.everyMs) + 1;
    return new Date(this.from.getTime() + n * this.everyMs);
  }
}

class CronTrigger implements Trigger {
  constructor(private readonly expr: string, private readonly tz = 'Asia/Dhaka') {}
  nextRunAfter(after: Date): Date { /* parse 5 fields, step forward to next match */ }
}

class Scheduler {
  // Min-heap ordered by next run time — O(log n) insert, O(1) peek at the next job
  private readonly queue = new MinHeap<ScheduledJob>((a, b) => +a.nextRun - +b.nextRun);
  private timer?: NodeJS.Timeout;
  private readonly running = new Set<string>();

  schedule(job: Job, trigger: Trigger): void {
    const next = trigger.nextRunAfter(new Date());
    if (!next) return;
    this.queue.push({ job, trigger, nextRun: next });
    this.rearm();
  }

  /** Single timer set to the SOONEST job — not one timer per job. */
  private rearm(): void {
    if (this.timer) clearTimeout(this.timer);
    const head = this.queue.peek();
    if (!head) return;
    const delay = Math.max(0, +head.nextRun - Date.now());
    this.timer = setTimeout(() => this.tick(), Math.min(delay, 2 ** 31 - 1));
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    while (this.queue.peek() && +this.queue.peek()!.nextRun <= now) {
      const entry = this.queue.pop()!;

      // Reschedule BEFORE running, so a long job doesn't delay its own next run
      const next = entry.trigger.nextRunAfter(new Date());
      if (next) this.queue.push({ ...entry, nextRun: next });

      if (this.running.has(entry.job.id)) continue;   // no overlapping execution
      this.running.add(entry.job.id);
      void entry.job.run()
        .catch(err => this.onError(entry.job, err))
        .finally(() => this.running.delete(entry.job.id));
    }
    this.rearm();
  }
}
```

**The follow-ups that matter — and where most candidates stop too early:**

- **Distributed execution.** With N instances, every instance would fire the same job. Fixes: leader election (only the leader schedules), or a shared store where each instance atomically claims the job (`UPDATE jobs SET locked_by=$1, locked_until=now()+interval '5 min' WHERE id=$2 AND (locked_until IS NULL OR locked_until < now())` — 1 row means you won). The lock needs a lease so a crashed worker's job is reclaimed.
- **Missed runs after downtime.** If the service was down for 3 hours, do you run the hourly job 3 times, once, or not at all? This is a policy decision the interviewer wants you to *ask about*, not assume. Cron semantics (skip) differ from at-least-once semantics (catch up).
- **Exactly-once.** You can't have it — a worker can crash after running the job and before recording it. Make jobs **idempotent** and record execution with a unique constraint on `(job_id, scheduled_for)`.
- **Timezones and DST.** "Run at 2 a.m. daily" is ambiguous on a DST transition day (2 a.m. may not exist, or exist twice). Bangladesh has no DST currently, which simplifies local scheduling — but any international system needs an explicit policy, and storing the timezone with the trigger rather than converting to UTC is the correct modelling.
- **Long jobs vs interval.** If a job takes longer than its interval, do you skip, queue, or run concurrently? The `running` set above chooses "skip", which should be configurable.

---

## 12. In-Memory File System

Tests the Composite pattern and tree traversal.

```ts
abstract class FsNode {
  constructor(
    readonly name: string,
    public parent: Directory | null,
    readonly createdAt = new Date(),
  ) {}
  abstract size(): number;
  path(): string {
    return this.parent ? `${this.parent.path()}/${this.name}`.replace('//', '/') : '';
  }
}

class File extends FsNode {
  private content = Buffer.alloc(0);
  size(): number { return this.content.length; }
  write(data: Buffer): void { this.content = data; }
  append(data: Buffer): void { this.content = Buffer.concat([this.content, data]); }
  read(): Buffer { return this.content; }
}

class Directory extends FsNode {                        // ← Composite
  private readonly children = new Map<string, FsNode>();

  size(): number {                                       // recursive over children
    return [...this.children.values()].reduce((sum, c) => sum + c.size(), 0);
  }

  add(node: FsNode): void {
    if (this.children.has(node.name)) throw new AlreadyExistsError(node.name);
    this.children.set(node.name, node);
    node.parent = this;
  }

  find(name: string): FsNode | undefined { return this.children.get(name); }
  list(): string[] { return [...this.children.keys()].sort(); }

  remove(name: string, recursive = false): void {
    const node = this.children.get(name);
    if (!node) throw new NotFoundError(name);
    if (node instanceof Directory && node.children.size > 0 && !recursive)
      throw new DirectoryNotEmptyError(name);
    this.children.delete(name);
  }
}

class FileSystem {
  private readonly root = new Directory('', null);

  private resolve(path: string, createDirs = false): FsNode {
    const parts = path.split('/').filter(Boolean);
    let cur: FsNode = this.root;
    for (const part of parts) {
      if (!(cur instanceof Directory)) throw new NotADirectoryError(cur.path());
      let next = cur.find(part);
      if (!next) {
        if (!createDirs) throw new NotFoundError(path);
        next = new Directory(part, cur);
        cur.add(next);
      }
      cur = next;
    }
    return cur;
  }

  mkdirp(path: string): Directory { return this.resolve(path, true) as Directory; }

  writeFile(path: string, data: Buffer): void {
    const idx = path.lastIndexOf('/');
    const dir = this.mkdirp(path.slice(0, idx));
    const name = path.slice(idx + 1);
    const existing = dir.find(name);
    if (existing instanceof File) existing.write(data);
    else { const f = new File(name, dir); f.write(data); dir.add(f); }
  }

  /** Glob search — the extension interviewers ask for next. */
  *search(pattern: RegExp, from: Directory = this.root): Generator<FsNode> {
    for (const child of from.list().map(n => from.find(n)!)) {
      if (pattern.test(child.name)) yield child;
      if (child instanceof Directory) yield* this.search(pattern, child);
    }
  }
}
```

**Points to raise:** the Composite pattern is what lets `size()` work uniformly on files and directories — that's the pattern's whole purpose and worth naming. Then: symlinks introduce cycles, so traversal needs a visited set; permissions belong as a value object on `FsNode` checked in `resolve()`; and for a real filesystem the content wouldn't be one Buffer but a list of fixed-size blocks, which is what makes sparse files, partial writes and the [Dropbox chunking design](06-hld-practice-problems.md#9-file-storage-dropboxgoogle-drive) possible.

---

## 13. Rapid-Fire Designs

Shorter treatments — know the key insight for each.

### Tic-Tac-Toe / Chess

**Tic-Tac-Toe key insight:** don't scan the whole board to check for a win — maintain running counters per row, column and diagonal. A move increments its row/col/diag counter by ±1; a counter reaching ±n means a win. O(1) per move instead of O(n²).

**Chess key insight:** the Strategy pattern per piece type — `interface MoveValidator { isLegal(board, from, to): boolean }` with one implementation per piece, so adding a variant piece is a new class. Then the interesting parts are the special rules that don't fit the per-piece model (castling, en passant, promotion, and check/checkmate detection which requires simulating the move and testing whether your own king is attacked). Use the Memento pattern for undo, and represent the board as an 8×8 array (or bitboards if asked about performance).

### Library Management System

Entities: `Book` (the title/ISBN, a catalogue concept) vs `BookItem` (a physical copy with a barcode) — **separating these two is the whole question**, because you lend copies, not titles. Then `Member`, `Loan`, `Reservation`, `Fine`. Business rules as policy objects: max loans per member tier, loan period, fine per overdue day, reservation queue (FIFO, with a hold expiry). The state machine on `BookItem`: `AVAILABLE → LOANED → AVAILABLE`, plus `RESERVED`, `LOST`.

### ATM Machine

State pattern again: `Idle → CardInserted → PinEntered → TransactionSelected → Dispensing → Idle`. The interesting sub-problems: the **cash dispensing algorithm** (which denominations to dispense — greedy works for standard notes; must fail *before* debiting if it can't make the amount), a **two-phase transaction with the bank** (reserve the funds, dispense, confirm; if dispensing fails mechanically, reverse the reservation — a real saga with a physical compensating action), and hardware failure handling where the money is half-dispensed.

### Hotel Booking System

The core is **overlapping-interval availability**: a room is available for `[checkIn, checkOut)` if no existing booking for that room overlaps. `WHERE room_id = ? AND check_in < $checkOut AND check_out > $checkIn` — get the strict/non-strict inequalities right, they're the bug. Prevent double-booking with an atomic conditional insert, or in Postgres an **exclusion constraint** on a `tstzrange`, which enforces non-overlap at the database level:
```sql
ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (room_id WITH =, tstzrange(check_in, check_out) WITH &&);
```
Then: pricing by season/occupancy (Strategy), room *types* vs specific rooms (allocate the specific room at check-in, not at booking — this dramatically improves inventory utilisation and is the insight to offer), and cancellation policies as a policy object.

### Snake & Ladder / Board Games

A `Board` with a `Map<position, jumpTarget>` handles both snakes and ladders with the same mechanism — recognising they're the same thing is the point. Then a turn queue, dice as an injectable interface (so tests are deterministic), and a game-loop state machine.

### Notification Sender (LLD version)

Strategy per channel plus Chain of Responsibility for fallback: try push → if it fails, SMS → if that fails, email. Each handler decides to handle or pass on. Add Decorator for retry and rate limiting so those concerns aren't duplicated in every channel implementation. This is the LLD counterpart of [HLD problem 3](06-hld-practice-problems.md#3-notification-system-41m-users--bd-context).

### Text Editor / Undo-Redo

Command pattern: every edit is a `Command` with `execute()` and `undo()`, pushed onto an undo stack; undoing pops to a redo stack; a new edit clears the redo stack. For efficiency at scale, store the *delta*, not a full document snapshot per command. Mention the rope data structure for large-document editing if pushed on performance.

---

## Quick Reference

**The method:** clarify → nouns to classes, verbs to methods → interfaces where variation is expected → code the interesting parts → concurrency and extensibility.

**Pattern triggers:**
```
"support another kind of X"       → Strategy (+ Factory to create them)
"tell several things about Y"     → Observer
"behaviour depends on status"     → State  (kills the switch statement)
"undo / queue of operations"      → Command
"add behaviour without editing"   → Decorator
"tree of things treated alike"    → Composite
"try handlers in order"           → Chain of Responsibility
```

**Concurrency answers, in order of preference:** atomic conditional operation → optimistic version check → per-key lock → global lock. In Node, remember that synchronous blocks are atomic but `await` boundaries are interleaving points, and that in-process locks are worthless once you have more than one instance.

**Always mention, unprompted:**
- Where the concurrency race is and how you closed it.
- What happens when the collection grows unbounded (eviction, TTL).
- Money as integer minor units in a value object — never floats.
- One extension the design absorbs without modification, and name the principle (Open/Closed).
- Where persistence would plug in (a repository interface), without actually building it.

**Losing moves:** applying four patterns to a problem that needs none; a god class named `Manager` that does everything; public setters that let callers bypass invariants; ignoring the check-then-act race; and building a database when the interviewer asked for classes.
