# Distributed Systems — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A covering consistency, consensus, time, replication, sharding and failure
> **Last Updated:** 2026-08-06

---

## Table of Contents

1. [The Fallacies & Why Distribution Is Hard](#q1-the-fallacies--why-distribution-is-hard)
2. [CAP and PACELC](#q2-cap-and-pacelc)
3. [Consistency Models](#q3-consistency-models)
4. [Isolation Levels vs Consistency](#q4-isolation-levels-vs-consistency)
5. [Replication Strategies](#q5-replication-strategies)
6. [Quorums](#q6-quorums)
7. [Consensus: Raft](#q7-consensus-raft)
8. [Leader Election & Split Brain](#q8-leader-election--split-brain)
9. [Time, Clocks & Ordering](#q9-time-clocks--ordering)
10. [Conflict Resolution & CRDTs](#q10-conflict-resolution--crdts)
11. [Sharding & Partitioning](#q11-sharding--partitioning)
12. [Distributed Locks](#q12-distributed-locks)
13. [Rate Limiting Algorithms](#q13-rate-limiting-algorithms)
14. [Distributed Transactions](#q14-distributed-transactions)
15. [Failure Detection & Gossip](#q15-failure-detection--gossip)
16. [Failure Modes at Scale](#q16-failure-modes-at-scale)
17. [Quick Reference](#quick-reference)

---

## Q1: The Fallacies & Why Distribution Is Hard

### Q: What makes distributed systems fundamentally harder than single-node systems?

**A:** Three things a single process gets for free disappear:

1. **Partial failure.** In one process, either it runs or it crashes. In a distributed system, *some* of it fails while the rest keeps going — and the surviving parts cannot tell the difference between "the peer crashed", "the peer is slow", and "the network dropped my message." This is the root of nearly every hard problem below.
2. **No shared clock.** There is no global "now". Two events on two machines cannot be reliably ordered by timestamp.
3. **No shared memory.** All state coordination costs a network round trip, which can be lost, duplicated, reordered or delayed arbitrarily.

**The eight fallacies of distributed computing** (Deutsch/Gosling) — each one is a bug class:

| Fallacy | The bug it causes |
|---|---|
| The network is reliable | No retry, no idempotency → lost writes |
| Latency is zero | Chatty N+1 service calls; serial fan-out |
| Bandwidth is infinite | Fat payloads; no pagination; no compression |
| The network is secure | No mTLS, no authz between services |
| Topology doesn't change | Hard-coded IPs; no service discovery |
| There is one administrator | No coordinated change management |
| Transport cost is zero | Ignoring serialisation and egress costs |
| The network is homogeneous | Assuming uniform latency; ignoring cross-region |

Add a ninth that matters most in practice: **you cannot distinguish a slow node from a dead one.** Every failure detector is a timeout, and every timeout is a guess.

---

## Q2: CAP and PACELC

### Q: State CAP correctly.

**A:** During a **network partition**, a distributed system must choose between **consistency** (every read reflects the latest write, or errors) and **availability** (every request gets a non-error response, possibly stale). Partition tolerance isn't optional — networks partition — so the real choice is CP or AP, *and only during a partition*.

**The common misstatements to avoid:**
- "Pick two of three" — misleading. P is mandatory; you pick between C and A when P happens.
- "PostgreSQL is CA" — a single node isn't a distributed system, so CAP doesn't classify it. A Postgres primary with synchronous replicas is CP; with async replicas it's closer to AP for reads.
- Treating it as a system-wide property. It's per-operation. DynamoDB gives you eventually consistent reads (AP) *and* strongly consistent reads (CP) on the same table, chosen per call.

| Choice | Behaviour during partition | Systems |
|---|---|---|
| **CP** | Minority side rejects requests to avoid stale/conflicting data | ZooKeeper, etcd, Spanner, HBase, MongoDB (majority writes), Kafka (min.insync.replicas) |
| **AP** | All sides accept, reconcile afterwards | Cassandra, DynamoDB, Riak, CouchDB, DNS |

### Q: PACELC?

**A:** CAP only describes behaviour during a partition, which is rare. PACELC covers the other 99.9% of the time:

> **if (P)** artition, trade **A**vailability vs **C**onsistency; **E**lse, trade **L**atency vs **C**onsistency.

The "else" branch is the one you live with daily. Consistency requires coordination; coordination requires round trips; round trips cost latency. A synchronous cross-region write is ~100–250 ms of physics you cannot optimise away.

| System | Classification | Meaning |
|---|---|---|
| Cassandra, DynamoDB (default) | **PA/EL** | Available under partition; fast but eventually consistent normally |
| MongoDB (majority concerns) | **PC/EC** | Consistent under partition; pays latency for consistency normally |
| Spanner | **PC/EC** | Consistency always — bought with atomic clocks and commit-wait |
| MySQL/Postgres async replica | **PA/EL** for reads | Replica serves stale data rather than blocking |

**The useful interview line:** *"The interesting trade-off isn't CAP — partitions are rare. It's PACELC's else-branch: every synchronous replication acknowledgement I require is latency I add to every single write, forever."*

---

## Q3: Consistency Models

### Q: Walk through the consistency models from strongest to weakest.

**A:**

| Model | Guarantee | Cost | Where you see it |
|---|---|---|---|
| **Linearizable** (strong) | Every operation appears to take effect atomically at a single point between invocation and response; reads see the most recent write globally | Consensus round trip per operation | etcd, ZooKeeper, Spanner, DynamoDB strongly-consistent read |
| **Sequential** | All nodes see operations in the same order, which respects each client's own program order — but not necessarily real time | Cheaper than linearizable | Some replicated logs |
| **Causal** | Operations that are causally related are seen in the same order everywhere; concurrent ops may be seen differently | Vector clocks / dependency tracking | MongoDB causal sessions, COPS |
| **Read-your-writes** | A client always sees its own prior writes | Sticky routing or write-version tracking | Session guarantees |
| **Monotonic reads** | A client never sees time go backwards | Pin to one replica | Session guarantees |
| **Eventual** | If writes stop, replicas converge — eventually | Cheapest | DNS, S3 listings historically, Cassandra ONE |

**The one people miss:** **causal consistency is usually what users actually want.** The classic example — a comment thread where reply "I agree!" appears before the comment it replies to — is a causal violation, and it looks broken to users even though eventual consistency permits it. Eventual consistency without causality is rarely acceptable in a UI.

**The four session guarantees** are worth naming individually because they're cheap and they solve most perceived "consistency bugs":
- **Read your writes** — after I post, I see my post.
- **Monotonic reads** — I never see a message disappear and reappear.
- **Monotonic writes** — my writes apply in the order I made them.
- **Writes follow reads** — if I read X then write Y, anyone who sees Y also sees X.

**How to implement read-your-writes over async replicas** (a very common follow-up):
1. **Sticky routing** — route this user to the primary for N seconds after a write. Simple; wastes primary capacity.
2. **Write-version tracking** — the write returns an LSN/version; the client sends it on subsequent reads; the router picks a replica that has caught up to that LSN, else the primary. Precise; needs replica lag tracking.
3. **Write-through cache** — read from the cache, which was updated synchronously. Sidesteps the problem for the hot path.

---

## Q4: Isolation Levels vs Consistency

### Q: How are transaction isolation levels different from consistency models?

**A:** They answer different questions and people conflate them constantly:
- **Isolation** (the I in ACID) is about *concurrent transactions on one logical database* — what anomalies can two overlapping transactions observe?
- **Consistency models** are about *replicas* — what does a read on replica B see after a write on replica A?

You can have serializable isolation on a database with eventually-consistent replicas: single-node correctness, stale reads.

| Level | Prevents | Still allows |
|---|---|---|
| Read Uncommitted | — | Dirty reads |
| Read Committed | Dirty reads | Non-repeatable reads, phantoms, lost updates |
| Repeatable Read / Snapshot | + non-repeatable reads | Phantoms (in the standard), **write skew** |
| Serializable | Everything | — (but with aborts/retries or reduced concurrency) |

**The anomalies, with concrete examples:**
- **Dirty read** — reading another transaction's uncommitted change that later rolls back.
- **Non-repeatable read** — reading a row twice in one transaction and getting different values.
- **Phantom read** — re-running a range query and finding new rows.
- **Lost update** — two transactions read 10, both write 11; one increment vanishes. Fix with `SELECT … FOR UPDATE`, an atomic `UPDATE … SET n = n + 1`, or optimistic version checks.
- **Write skew** — the subtle one. Two doctors are on call; each transaction reads "2 doctors on call, so I may go off call", and both go off call. No row was updated twice, so snapshot isolation permits it, yet the invariant ("at least one on call") is violated. Fix with `SERIALIZABLE`, a materialised conflict row, or `SELECT … FOR UPDATE` on the predicate's rows.

**PostgreSQL specifics worth knowing:** its Repeatable Read is snapshot isolation (and it *does* prevent phantoms, unlike the SQL standard's minimum), and its Serializable uses **SSI** (Serializable Snapshot Isolation) — optimistic, so transactions can fail with a serialization error at commit and the application must retry. That retry loop is a real requirement, not an optional nicety.

---

## Q5: Replication Strategies

### Q: Compare replication topologies.

**A:**

| | Single-leader | Multi-leader | Leaderless |
|---|---|---|---|
| Writes go to | One node | Any leader (usually one per region) | Any replica (quorum) |
| Conflicts | Impossible | **Guaranteed — must be resolved** | Possible — resolved by version/LWW |
| Write availability | Lost until failover | Survives a leader loss | High |
| Complexity | Low | High | Medium |
| Examples | Postgres, MySQL, MongoDB | Multi-region MySQL, CouchDB, CRDT stores | Cassandra, DynamoDB, Riak |

**Single-leader (primary-replica)** is the default and correct answer most of the time. The decisions inside it:

**Synchronous vs asynchronous replication:**
- **Async** — the leader acks immediately. Fast; a leader crash loses the un-replicated tail. This is data loss, and you should say so.
- **Sync** — the leader waits for the replica. No data loss; every write pays the replica round trip, and a stalled replica blocks all writes.
- **Semi-synchronous** — wait for *one* replica out of N. The standard compromise: bounded data loss, bounded latency, tolerant of one slow replica. Postgres: `synchronous_standby_names = 'ANY 1 (r1, r2, r3)'`.

**Replication mechanisms:** statement-based (replays SQL — dangerous with `NOW()`, `RANDOM()`, triggers), **WAL/physical** (byte-level log shipping — exact, but replica must run the same major version), **logical/row-based** (replicates row changes — version-flexible, supports partial replication and is what CDC tools tap into). Logical replication is what enables zero-downtime major version upgrades and Debezium-style CDC.

**Replication lag is the operational reality.** Monitor `pg_stat_replication.replay_lag` (or `Seconds_Behind_Master`), alert on it, and design the read path knowing it exists. Lag spikes come from long-running queries on the replica blocking replay, a burst of writes, or vacuum activity.

**Multi-leader** exists for multi-region write locality and offline clients (a mobile app is effectively a leader). The price is conflict resolution, which is genuinely hard — see Q10.

---

## Q6: Quorums

### Q: Explain quorum reads and writes.

**A:** With N replicas, require W acknowledgements to write and R responses to read. If **W + R > N**, the read and write sets must overlap by at least one node, so a read is guaranteed to see the latest acknowledged write.

```
N = 3 replicas
W = 2, R = 2   →  W + R = 4 > 3  ✅ strong-ish consistency, tolerates 1 node down
W = 3, R = 1   →  4 > 3  ✅ fast reads, writes fail if ANY node is down
W = 1, R = 1   →  2 < 3  ❌ eventual consistency, fastest, most available
W = 2, R = 1   →  3 = 3  ❌ no overlap guarantee
```

**Also require W > N/2** for write quorums if you want to prevent two concurrent conflicting writes both succeeding — that's why majority (`N/2 + 1`) is the usual choice.

**Tuning it is a real lever:** `N=3, W=2, R=2` is the safe default. For a write-heavy telemetry pipeline where losing a point is fine, `W=1` is defensible. For a read-heavy config store, `W=N, R=1` makes reads free at the cost of write availability.

**What quorums do NOT give you:** linearizability, on their own. Sloppy quorums (Dynamo-style, where writes go to *any* N reachable nodes during a partition, not the "right" N) explicitly trade this away for availability, with **hinted handoff** to deliver the data later. Concurrent writes to the same key can still produce siblings that need resolution. Anti-entropy processes — **read repair** (fix stale replicas detected during a read) and **Merkle tree comparison** (periodic background sync that efficiently finds diverged key ranges by comparing hash trees) — are what actually make replicas converge.

---

## Q7: Consensus: Raft

### Q: Explain Raft.

**A:** Raft solves: get N nodes to agree on an ordered log of entries, tolerating up to `⌊N/2⌋` failures. It was designed to be understandable, decomposing consensus into leader election, log replication and safety.

**Node states:** Follower → Candidate → Leader.

**1. Leader election.**
- Every node has a randomised election timeout (e.g. 150–300 ms). Randomisation is essential — it prevents all nodes becoming candidates simultaneously and splitting the vote forever.
- A follower that hears no heartbeat before the timeout increments the **term** (a logical clock), becomes a candidate, votes for itself, and requests votes.
- A node grants its vote if the candidate's term is ≥ its own, it hasn't voted this term, and **the candidate's log is at least as up to date as its own** (this last check is the safety property that prevents electing a leader missing committed entries).
- A majority of votes makes a leader. The leader sends heartbeats to suppress further elections.

**2. Log replication.**
- All client writes go to the leader, which appends to its log and sends `AppendEntries` to followers.
- Once a **majority** have persisted the entry, the leader marks it **committed**, applies it to the state machine, and replies to the client.
- The leader tracks a `nextIndex` per follower and walks backwards on mismatch until logs converge — followers' conflicting entries are overwritten. The leader's log is authoritative.

**3. Safety.** A leader never overwrites its own entries, only appends. An entry committed in a term stays committed. Only entries from the leader's current term are committed by counting replicas (the subtle rule that prevents a committed entry from being lost).

**Why an odd number of nodes:** 3 nodes tolerate 1 failure; 4 nodes *also* tolerate only 1 (majority of 4 is 3). The fourth node adds cost and latency without adding fault tolerance. 5 nodes tolerate 2 — the usual choice for critical control planes.

**Where you meet Raft in real systems:** etcd (hence Kubernetes' entire control plane), Consul, CockroachDB, TiKV, MongoDB's replica set election protocol, Kafka's KRaft mode (which replaced ZooKeeper).

**Paxos vs Raft:** same guarantees; Paxos is older, harder to reason about, and Multi-Paxos underpins Chubby and Spanner. If asked to pick one to know deeply, know Raft. **ZAB** (ZooKeeper Atomic Broadcast) is a third variant in the same family.

**The cost to state:** every consensus write is at least one round trip to a majority. Within a datacenter that's ~1–2 ms; across regions it's 100 ms+. This is exactly why you put *coordination* in a consensus system (leases, config, membership, locks) and *data* somewhere cheaper.

---

## Q8: Leader Election & Split Brain

### Q: What is split brain and how do you prevent it?

**A:** Two nodes both believe they are the leader — typically because a network partition isolated the leader, the remaining nodes elected a new one, and the old leader never realised it was deposed. Both accept writes; the data diverges; reconciliation is manual and lossy.

**Prevention:**

1. **Quorum/majority requirement.** A leader must hold a majority. In a partition, at most one side can have a majority, so at most one leader exists. The minority side must stop accepting writes — this is the CP choice, made explicitly.
2. **Fencing tokens.** Every leadership term gets a monotonically increasing number. Downstream resources (the storage layer, the lock service) reject any request carrying a token lower than the highest they've seen. This is what makes a *stale* leader harmless even if it doesn't know it's stale.

```
t=0   Leader A holds lease, token = 33
t=1   A pauses (long GC, 20s). Lease expires.
t=2   B elected leader, token = 34. Writes with token 34. Storage records 34.
t=3   A resumes, believes it's still leader, writes with token 33.
t=4   Storage: 33 < 34 → REJECT.  ← split brain neutralised
```
Without fencing, step 4 silently corrupts data. Fencing tokens are the single most important detail in this topic and most candidates don't mention them.

3. **Leases with clock-skew margin.** A leader holds a time-bounded lease and must renew it. Set the lease duration comfortably longer than the worst-case pause (GC, VM migration) and have the leader *self-demote* if it can't renew.
4. **STONITH / fencing at the infrastructure layer** — the new leader forcibly kills or isolates the old one (power off, revoke network access, detach the storage volume). Common in traditional HA clusters.
5. **Witness / tiebreaker node** in a two-datacenter setup, placed in a third location, so a DC-to-DC partition still yields a majority on one side.

---

## Q9: Time, Clocks & Ordering

### Q: Why can't you order events by timestamp?

**A:** Because wall clocks on different machines disagree. NTP typically keeps them within ~1–100 ms, but skew spikes, leap seconds and VM pauses happen — and clocks can jump *backwards* when NTP corrects them. Ordering events across machines by `Date.now()` is a race condition with extra steps, and using it for conflict resolution silently discards writes.

**Practical rule:** for measuring elapsed time inside one process, use a **monotonic clock** (`process.hrtime.bigint()`, `performance.now()`) which never goes backwards. Use wall-clock time only for display and for human-facing timestamps.

### Q: Lamport clocks vs vector clocks.

**A:**

**Lamport clock** — one integer per node.
```
on local event:        counter++
on send:               counter++;  attach counter
on receive(ts):        counter = max(counter, ts) + 1
```
Guarantees: if A causally happened-before B, then `L(A) < L(B)`. **The converse does not hold** — `L(A) < L(B)` doesn't prove causality; they may be concurrent. So Lamport clocks give you a *total order* (with node ID as tiebreaker) but can't *detect* concurrency.

**Vector clock** — one integer per node, per node. `V = [n1: 3, n2: 7, n3: 2]`.
```
on local event:        V[self]++
on send:               V[self]++;  attach V
on receive(Vmsg):      V = elementwise max(V, Vmsg);  V[self]++

A → B  (A happened-before B)  iff  V(A)[i] ≤ V(B)[i] for all i, and < for some i
A ∥ B  (concurrent)           iff  neither dominates
```
Vector clocks **can** detect concurrency, which is what you need to identify conflicts that require resolution. The cost is O(N) size, which grows with cluster membership — mitigated by pruning, or by using **dotted version vectors** (Riak) to keep them bounded.

**Hybrid Logical Clocks (HLC)** combine a physical timestamp with a logical counter, giving you timestamps that are close to wall-clock time (so they're human-meaningful and can be compared with real time) *and* respect causality. Used by CockroachDB and YugabyteDB. This is the modern practical answer.

**TrueTime (Spanner)** takes the opposite approach: use GPS and atomic clocks to bound the uncertainty interval to a few milliseconds, then **wait out the uncertainty** before committing (`commit-wait`). This buys externally consistent (linearizable) global transactions at the cost of a few ms added to every commit and a hardware dependency. It's the clearest demonstration that consistency is bought with latency.

---

## Q10: Conflict Resolution & CRDTs

### Q: Two replicas accepted conflicting writes. Now what?

**A:** Options in increasing order of sophistication:

1. **Last-Writer-Wins (LWW).** Keep the write with the highest timestamp. Simple, and **silently loses data** — plus it depends on clock sync, which we just established is unreliable. Acceptable for caches or "last seen" fields; unacceptable for anything a user typed.
2. **Highest version wins / reject on conflict.** Optimistic concurrency: the client sends the version it read; a mismatch returns 409 and the client re-reads and retries. Correct and simple; pushes the problem to the client, which is often the right place.
3. **Store siblings and resolve on read.** Riak/Dynamo style: keep both versions, hand them to the application on read, let domain logic merge. The Amazon shopping-cart example — merge by union, so a removed item may reappear, which they judged better than losing an addition.
4. **Application-specific merge.** Text: operational transformation or CRDT. Counters: sum the deltas. Sets: union with tombstones.
5. **CRDTs** — data types that merge automatically and correctly by construction.

### Q: What is a CRDT?

**A:** A **Conflict-free Replicated Data Type**: a structure whose merge operation is **commutative, associative and idempotent**. Because of those three properties, replicas that have seen the same set of updates converge to the same state regardless of the order or duplication of delivery. No coordination, no conflicts, no consensus.

| CRDT | Semantics | Use |
|---|---|---|
| **G-Counter** | Grow-only; per-node counters, merge = elementwise max, value = sum | View counts, likes |
| **PN-Counter** | Two G-Counters (increments, decrements) | Counters that can decrease |
| **G-Set** | Add-only set, merge = union | Append-only tags |
| **2P-Set** | Add-set + remove-set (tombstones); once removed, never re-addable | Simple membership |
| **OR-Set** | Each add carries a unique tag; remove deletes the observed tags | **Shopping carts, collaborative lists** |
| **LWW-Register** | Value + timestamp, highest wins | Single-field settings |
| **RGA / Yjs / Automerge sequences** | Ordered sequence with stable identifiers | **Collaborative text editing** |

```ts
// G-Counter: the canonical minimal example
class GCounter {
  private counts = new Map<string, number>();   // nodeId → count
  constructor(private nodeId: string) {}

  increment(by = 1) {
    this.counts.set(this.nodeId, (this.counts.get(this.nodeId) ?? 0) + by);
  }
  value(): number {
    return [...this.counts.values()].reduce((a, b) => a + b, 0);
  }
  merge(other: GCounter): void {
    for (const [node, count] of other.counts) {
      this.counts.set(node, Math.max(this.counts.get(node) ?? 0, count)); // idempotent
    }
  }
}
// merge is commutative, associative, idempotent → replicas converge, order-independent
```

**Where CRDTs are the right tool:** offline-first mobile apps, collaborative editing (Figma, Linear, Notion all use CRDT-family approaches), multi-region counters, presence and shopping carts. **The cost:** metadata growth (tombstones must be garbage collected, and the GC itself needs coordination or a stability threshold), and the semantics are fixed by the type — "the merge always converges" doesn't mean "the merge is what the user wanted." A concurrent add and remove of the same item has to resolve *somehow*, and the CRDT picks; make sure that pick matches your product.

---

## Q11: Sharding & Partitioning

### Q: Compare sharding strategies.

**A:**

| Strategy | Mapping | Pros | Cons |
|---|---|---|---|
| **Range** | Key ranges → shards (`a–f`, `g–m`, …) | Efficient range scans | **Hotspots** — sequential keys (timestamps, auto-IDs) all hit the newest shard |
| **Hash** | `hash(key) % N` | Even distribution | No range queries; **resharding remaps almost everything** |
| **Consistent hash** | Hash ring + virtual nodes | Even, and adding a node moves only ~1/N of keys | More complex; still no range queries |
| **Directory / lookup** | Explicit `key → shard` table | Maximum flexibility; move individual tenants | The lookup service is a bottleneck and SPOF (mitigate: cache it aggressively) |
| **Geo / by tenant** | By region or customer | Data residency, isolation, easy per-tenant ops | Skew if one tenant or region dominates |

**Composite is common in practice:** hash within a range, or `tenant_id` for the top-level split with hashing inside a large tenant.

### Q: How do you handle a hot partition?

**A:** First identify it — per-partition metrics for QPS, latency and throttles. Then, in order of preference:

1. **Change the partition key.** The root fix. If sharding by `date` hotspots today's partition, shard by `hash(user_id)` and keep date as the clustering key.
2. **Key salting.** Append a bounded random suffix: `celebrity_id#0` … `celebrity_id#9` spreads one hot key across 10 partitions. Reads must now fan out to all 10 and merge — a deliberate trade of read cost for write distribution.
3. **Cache in front.** For hot *reads*, a cache absorbs the traffic before it ever reaches the partition. Often the cheapest fix.
4. **Split the hot key out.** Give the celebrity account its own dedicated infrastructure. Inelegant, extremely effective — and effectively what "fan-out on read for celebrities" is doing.
5. **Write coalescing.** Batch increments in memory and flush aggregates periodically instead of writing every event.

### Q: How do you reshard a live system?

**A:** The hard operational question. The playbook:

1. **Double the shard count rather than incrementing** (`N → 2N`), so each old shard splits cleanly into two and only half of each shard's keys move.
2. **Use consistent hashing from day one** so adding capacity moves ~1/N of keys rather than ~all of them.
3. **Over-partition upfront** (the Kafka/Elasticsearch approach): create, say, 1024 logical partitions on day one and map many logical partitions to each physical node. Scaling then means reassigning logical partitions — moving whole units, no key-level rehashing. **This is the best answer** — plan for it at design time.
4. **Live migration protocol:** dual-write to old and new shard → backfill historical data → verify with a checksum/row-count reconciliation → flip reads with a feature flag → monitor → stop dual-writing → drop old data. Every step must be individually reversible.

---

## Q12: Distributed Locks

### Q: How do you implement a distributed lock, and what are the pitfalls?

**A:** The naive Redis version:

```ts
// Acquire: atomic set-if-not-exists with an expiry
const token = randomUUID();
const ok = await redis.set(`lock:${resource}`, token, 'NX', 'PX', 30_000);
if (!ok) throw new LockNotAcquiredError();

try {
  await doWork();
} finally {
  // Release MUST be atomic + ownership-checked, or you release someone else's lock
  await redis.eval(`
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end`, 1, `lock:${resource}`, token);
}
```

**The pitfalls, in order of how often they bite:**

1. **Releasing another holder's lock.** Without the token check, a slow holder whose lock expired will delete the *new* holder's lock. Always store a unique token and verify it in a Lua script (atomically).
2. **The TTL expiring mid-work.** Your process GC-pauses for 40 s with a 30 s TTL; another process takes the lock; now two run concurrently. Mitigations: TTL comfortably above worst-case duration, a **watchdog** that extends the TTL while work proceeds, and — the only real fix — **fencing tokens** validated by the resource being protected (see Q8).
3. **No TTL at all** — a crashed holder locks the resource forever.
4. **Assuming the lock guarantees correctness.** It doesn't, on its own. Martin Kleppmann's critique of Redlock is the standard reference: a lock service without fencing cannot provide mutual exclusion in the presence of arbitrary pauses. **If correctness depends on it, you need fencing or a consensus-backed lock (etcd/ZooKeeper) with leases and fencing tokens.**

**Redlock** (locking across N independent Redis masters, requiring a majority) improves availability but remains contested for correctness because it still depends on bounded clock drift and process pauses.

**The pragmatic framing to give:** *"For efficiency — avoiding duplicate work, like two workers processing the same job — a Redis lock is fine and the worst case is wasted CPU. For correctness — where two concurrent holders corrupt data or double-charge a customer — I wouldn't rely on a lock at all. I'd use a database constraint, an idempotency key, an atomic conditional update, or a consensus-backed lease with fencing."*

Often the best answer is to remove the need for the lock: a unique index makes duplicate inserts impossible, an `UPDATE … WHERE version = ?` makes lost updates impossible, and partitioning work by key means only one consumer ever handles a given key.

---

## Q13: Rate Limiting Algorithms

### Q: Compare rate limiting algorithms.

**A:**

| Algorithm | How | Bursts | Memory | Accuracy |
|---|---|---|---|---|
| **Fixed window** | Count per clock interval | **Allows 2× at the boundary** | 1 counter | Poor |
| **Sliding window log** | Store every request timestamp | Exact | O(requests) | Perfect |
| **Sliding window counter** | Weighted blend of current + previous window | Smooth | 2 counters | Very good |
| **Token bucket** | Tokens refill at rate R, capacity B; each request takes one | **Allows a burst up to B** | 2 numbers | Good |
| **Leaky bucket** | Queue drains at a constant rate | None — smooths output | Queue size | Good |

**The fixed-window boundary flaw**, which is the thing to mention: with a limit of 100/minute, a client can send 100 requests at 11:00:59 and 100 more at 11:01:00 — 200 requests in one second, all within limits.

**Token bucket is the usual production default** because bursts are usually *desirable* (a page load firing 8 API calls shouldn't be throttled) while the sustained rate stays bounded.

```lua
-- Token bucket in Redis Lua: atomic, no race between read and write
-- KEYS[1]=key  ARGV[1]=rate/sec  ARGV[2]=capacity  ARGV[3]=now_ms  ARGV[4]=cost
local state    = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local rate     = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local now      = tonumber(ARGV[3])
local cost     = tonumber(ARGV[4])

local tokens = tonumber(state[1]) or capacity
local ts     = tonumber(state[2]) or now

-- refill based on elapsed time
tokens = math.min(capacity, tokens + (now - ts) / 1000 * rate)

local allowed = tokens >= cost
if allowed then tokens = tokens - cost end

redis.call('HMSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], math.ceil(capacity / rate) * 2)
return { allowed and 1 or 0, tokens }
```

### Q: How do you rate limit across a fleet of servers?

**A:** Three approaches:

1. **Centralised counter (Redis).** Accurate, and every request pays a network round trip plus Redis becomes a dependency on the critical path. Mitigate with pipelining, a local circuit breaker (fail *open* if Redis is down — a rate limiter should never take down the service), and Lua for atomicity.
2. **Local limits with divided quota.** Each of 10 instances enforces 1/10 of the limit locally, zero coordination. Inaccurate under uneven load balancing and wrong during scaling events, but free and fast.
3. **Hybrid / probabilistic sync.** Enforce locally, reconcile with a central store every N requests or every T ms. Good accuracy at a fraction of the round trips — what most large-scale limiters actually do.

**Response details that matter:** return `429 Too Many Requests` with `Retry-After`, plus `X-RateLimit-Limit`, `-Remaining` and `-Reset` headers so well-behaved clients can self-regulate. Rate limit by a key that's hard to rotate — API key or user ID, not raw IP (mobile carriers NAT thousands of users behind one IP, which matters a lot in Bangladesh). Apply **tiered limits**: per-user, per-IP, per-endpoint and global, with the strictest winning.

---

## Q14: Distributed Transactions

### Q: Why is 2PC avoided, and what replaced it?

**A:** **Two-phase commit:** a coordinator asks all participants to *prepare* (do the work, hold locks, promise to commit); if all vote yes, it tells them to *commit*.

The failure that kills it: if the coordinator crashes after participants have prepared, every participant sits holding locks, unable to commit or abort, until the coordinator returns. This is a **blocking protocol** — it sacrifices availability, and it does so precisely when things are already going wrong. Add cross-service network latency to lock hold times and throughput collapses. It also doesn't work with third-party APIs (you can't ask Stripe to prepare).

**3PC** adds a pre-commit phase to make it non-blocking, but it's unsafe under network partitions and essentially unused.

**What replaced it:**
- **Sagas** — a sequence of local transactions with compensations. The dominant pattern. (See the architecture patterns guide.)
- **The outbox pattern** — atomicity between a database write and an event publish, which covers the most common "distributed transaction" people actually need.
- **Idempotency + retries + eventual consistency** — often the whole answer. If every step is idempotent and retried until it succeeds, you get eventual atomicity without coordination.
- **Deterministic/partitioned transactions** — Calvin, VoltDB: agree on the order first, then execute deterministically everywhere.
- **Spanner-style distributed transactions** — real 2PC over Paxos groups, made viable by TrueTime and by keeping lock hold times tiny. This is the exception that proves the rule: it works because Google built atomic clocks into their datacenters.

**When 2PC is still fine:** within one database across shards (managed by the database, not your application), or across two resources in the same datacenter with a highly available coordinator. Modern message brokers use variants — Kafka's transactional producer implements exactly-once *within Kafka* via a two-phase protocol over the transaction log.

---

## Q15: Failure Detection & Gossip

### Q: How do nodes detect that a peer has failed?

**A:** Every failure detector is fundamentally a timeout, so it's a trade-off between **detection latency** and **false positives**. Declare failure too fast and a GC pause triggers an unnecessary failover; too slow and you serve errors for a minute.

- **Heartbeats to a central monitor** — simple, but the monitor is a bottleneck and a SPOF.
- **Phi Accrual failure detector** (Cassandra, Akka) — instead of a boolean, output a suspicion level φ based on the statistical distribution of recent heartbeat inter-arrival times. Adapts automatically to a network that's normally 5 ms but occasionally 50 ms, and lets different subsystems act at different thresholds.
- **Gossip / SWIM** — the scalable answer.

### Q: How does gossip work?

**A:** Each node periodically picks a few random peers and exchanges state (membership, versions, metadata). Information spreads epidemically: after `O(log N)` rounds, everyone knows. It's decentralised, needs no coordinator, tolerates node churn, and has bounded per-node bandwidth regardless of cluster size — a node talks to 3 peers per round whether the cluster has 10 nodes or 10,000.

**SWIM** refines failure detection specifically:
1. Node A pings node B directly.
2. No response → A asks K other nodes to ping B **on its behalf** (indirect probing). This distinguishes "B is dead" from "the A↔B network path is broken" — a genuinely important distinction that direct heartbeats miss.
3. If all indirect probes also fail, B is marked *suspect*, gossiped as suspect, and after a timeout marked *dead*.
4. B can refute the suspicion by gossiping a higher incarnation number for itself.

Used by Consul (Serf), Cassandra, Hashicorp's stack, and Redis Cluster's bus. **Trade-off:** eventual consistency of membership — during convergence, different nodes disagree about who's alive, which the rest of the system must tolerate.

---

## Q16: Failure Modes at Scale

### Q: What failure modes appear only at scale?

**A:** These have names, and using them signals real operational experience.

| Failure mode | Mechanism | Mitigation |
|---|---|---|
| **Cascading failure** | Service A slows → B's threads block on A → B slows → C blocks on B → everything down | Timeouts, circuit breakers, bulkheads, load shedding |
| **Retry storm** | Every layer retries 3× → one request becomes 3ⁿ | Retry at one layer only; retry budgets; full jitter |
| **Thundering herd** | Many clients retry/reconnect/expire simultaneously | Jitter everywhere; exponential backoff; staggered TTLs |
| **Metastable failure** | The system stays broken after the trigger is gone, because the recovery load itself sustains the overload | Load shedding, admission control, cold-start throttling |
| **Gray failure** | A node is slow or partially broken but passes health checks — worse than a clean crash | Client-side outlier detection; latency-based ejection; deep health checks for alerting |
| **Hot partition / hot key** | Skewed access lands on one node | Salting, caching, dedicated capacity |
| **Head-of-line blocking** | One slow item blocks everything behind it | Per-key concurrency; separate queues by priority; HTTP/2+ |
| **Poison message** | One malformed message crashes the consumer, which restarts and re-reads it forever | Bounded retries → DLQ; parse defensively |
| **Coordinated omission** | Your load test under-reports latency because it stops sending when the system stalls | Use open-model load generators (k6, wrk2); measure from the client's arrival schedule |
| **Death spiral / dogpile** | An unhealthy instance is removed, its load shifts to the rest, which then also become unhealthy | Minimum healthy targets; slow-start on newly added instances; capacity headroom |

**Metastable failure deserves a sentence** because it's the one people haven't heard of and it explains a lot of real outages: a system under a triggering overload enters a state where the work generated by recovery attempts (retries, cache misses, reconnections) is enough to keep it overloaded even after the original trigger disappears. Restarting doesn't help because the herd immediately re-overloads it. You escape only by *shedding load* — turning users away — which is emotionally hard to do during an incident and is why it should be automated in advance.

### Q: How do you reason about blast radius?

**A:** Ask "if this component fails badly, how many users notice?" then structure the system so the answer is small:
- **Cells / shards** — a failure affects 1/N of users.
- **Availability zones** — an AZ failure affects nothing if you're spread across three.
- **Bulkheads** — one dependency's failure doesn't consume shared resources.
- **Feature flags** — turn off the broken feature, not the whole service.
- **Staged rollouts** — a bad deploy reaches 1% before it reaches 100%. Most outages are caused by changes, so deployment strategy *is* reliability strategy.
- **Separate control plane from data plane** — the data plane should keep serving with its last known configuration even if the control plane is entirely down. This is why a well-built system keeps serving traffic when its config service dies.

---

## Quick Reference

**The numbers:**
```
Quorum:            W + R > N  (and W > N/2)
Raft/Paxos:        tolerates ⌊N/2⌋ failures → use odd N (3 or 5)
Gossip spread:     O(log N) rounds
Availability chain: 0.999^5 ≈ 99.5%   ← serial dependencies multiply
```

**Model → guarantee → cost:**

| You need | Use | You pay |
|---|---|---|
| Global order, latest read always | Linearizability (consensus) | A majority round trip per op |
| Users never see effects before causes | Causal consistency | Version/dependency tracking |
| A user sees their own writes | Session guarantees | Sticky routing or version tracking |
| Max availability & throughput | Eventual consistency | Conflicts you must resolve |
| Automatic conflict-free merge | CRDTs | Metadata growth; fixed merge semantics |
| Mutual exclusion for *correctness* | Consensus lease + **fencing token** | Latency and a hard dependency |
| Mutual exclusion for *efficiency* | Redis lock with TTL + token | Occasional duplicate work |

**Things to say unprompted:** fencing tokens with distributed locks; full jitter with retries; "at-least-once plus idempotency, not exactly-once"; monotonic clocks for durations; per-partition ordering rather than global ordering; and naming which side of PACELC's else-branch you're choosing.
