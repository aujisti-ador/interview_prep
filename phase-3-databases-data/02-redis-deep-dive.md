# Redis Deep Dive - Interview Q&A

## Table of Contents
1. [What is Redis & Why Use It?](#q1-what-is-redis--why-use-it)
2. [Redis Data Structures](#q2-redis-data-structures)
3. [Redis Caching Patterns](#q3-redis-caching-patterns)
4. [Distributed Locks (Redlock)](#q4-redis-as-a-distributed-lock-redlock)
5. [Redis Pub/Sub](#q5-redis-pubsub)
6. [Redis Streams](#q6-redis-streams)
7. [Transactions & Lua Scripting](#q7-redis-transactions--lua-scripting)
8. [Persistence & Durability](#q8-redis-persistence--durability)
9. [Redis Cluster & Scaling](#q9-redis-cluster--scaling)
10. [Rate Limiting](#q10-redis-rate-limiting)
11. [Session Management](#q11-redis-session-management)
12. [Memory Management & Optimization](#q12-redis-memory-management--optimization)
13. [Redis with Node.js/NestJS](#q13-redis-with-nodejsnestjs)
14. [Design Patterns for Common Problems](#q14-redis-design-patterns-for-common-problems)
15. [Quick Reference](#quick-reference)

---

## Q1: What is Redis & Why Use It?

### Q1.1: What is Redis? Explain its architecture and why it is fast.

**Answer:**
Redis (Remote Dictionary Server) is an open-source, in-memory data structure store that can function as a **cache**, **message broker**, **database**, and **streaming engine**. It stores data primarily in RAM, which is why it achieves sub-millisecond latency for most operations.

**Why Redis is fast despite being single-threaded:**

1. **In-memory storage** -- RAM access is ~100ns vs ~10ms for disk (100,000x faster)
2. **Single-threaded event loop** -- no context switching, no lock contention, no deadlocks
3. **I/O multiplexing (epoll/kqueue)** -- handles thousands of connections with a single thread
4. **Efficient data structures** -- purpose-built C implementations (skip lists, zip lists, hash tables)
5. **Non-blocking I/O** -- never blocks on network reads/writes
6. **Simple protocol** -- RESP (Redis Serialization Protocol) is lightweight to parse

**Note on threading (Redis 6+):** Redis uses I/O threads for network read/write, but command execution remains single-threaded. This means data operations are still atomic without locks, while network throughput is improved.

```
Client 1 ──┐
Client 2 ──┤  I/O Threads    ──►  Single Command Thread  ──►  I/O Threads  ──► Response
Client 3 ──┤  (read/parse)        (execute sequentially)      (write)
Client N ──┘
```

### Q1.2: When should you use Redis and when should you avoid it?

**Answer:**

| Use Redis For | Avoid Redis For |
|---------------|-----------------|
| Caching (API responses, DB query results) | Primary database for critical data (no full ACID) |
| Session storage | Large datasets that exceed available RAM |
| Rate limiting | Complex queries with joins or aggregations |
| Leaderboards & rankings | Data requiring strong relational integrity |
| Pub/Sub real-time messaging | Long-term archival storage |
| Job/task queues | Binary large objects (BLOBs) |
| Distributed locks | Scenarios requiring multi-key ACID transactions |
| Real-time analytics | When cost of RAM-based infra is prohibitive |

### Q1.3: How does Redis compare to Memcached?

**Answer:**

| Feature | Redis | Memcached |
|---------|-------|-----------|
| Data structures | Strings, Lists, Sets, Sorted Sets, Hashes, Streams, etc. | Strings only |
| Persistence | RDB snapshots, AOF | None |
| Replication | Built-in master-replica | None |
| Clustering | Redis Cluster (auto-sharding) | Client-side sharding only |
| Pub/Sub | Yes | No |
| Lua scripting | Yes | No |
| Transactions | MULTI/EXEC | No |
| Memory efficiency | Slightly lower (overhead for data structures) | Slightly better for simple key-value |
| Threading | Single-threaded execution (I/O threads in v6+) | Multi-threaded |
| Max value size | 512MB | 1MB default |

**Interview tip:** "I choose Redis over Memcached when I need anything beyond simple key-value caching -- data structures, persistence, pub/sub, or Lua scripting. Memcached may be better for extremely simple, high-throughput caching where multi-threaded execution helps."

### Q1.4: Explain Redis persistence options: RDB vs AOF.

**Answer:**

**RDB (Redis Database Backup):**
- Point-in-time snapshots saved to disk via `BGSAVE`
- Redis forks a child process to write the snapshot (copy-on-write)
- Compact single-file backups, fast restarts
- Risk: data loss between snapshots (e.g., last 5 minutes of writes)

**AOF (Append-Only File):**
- Logs every write command sequentially
- Three fsync policies:
  - `always` -- fsync after every write (safest, slowest)
  - `everysec` -- fsync once per second (recommended balance)
  - `no` -- let OS decide when to flush (fastest, riskiest)
- AOF rewriting compacts the log (removes redundant commands)

**Best practice for production:** Use both RDB + AOF. Redis will use AOF for recovery (more complete) while RDB provides compact backups for disaster recovery.

```bash
# redis.conf
save 900 1          # RDB: snapshot if 1+ key changed in 900 seconds
save 300 10         # RDB: snapshot if 10+ keys changed in 300 seconds
save 60 10000       # RDB: snapshot if 10000+ keys changed in 60 seconds

appendonly yes
appendfsync everysec
```

---

## Q2: Redis Data Structures

### Q2.1: Walk me through all Redis data structures with use cases and time complexity.

**Answer:**

Redis provides purpose-built data structures, each optimized for specific access patterns. This is Redis's biggest differentiator.

---

#### Strings

The most basic type. Can hold text, serialized JSON, integers, or binary data (up to 512MB).

```bash
# Basic operations
SET user:1:name "Fazle Rabbi"       # O(1)
GET user:1:name                     # O(1) → "Fazle Rabbi"

# With expiration
SETEX session:abc123 3600 "{\"userId\":1}"   # O(1) - set with 60 min TTL
TTL session:abc123                            # O(1) → 3600

# Atomic counters
SET page:views 0
INCR page:views                     # O(1) → 1
INCRBY page:views 10                # O(1) → 11
DECR page:views                     # O(1) → 10

# Conditional set (distributed lock primitive)
SETNX lock:order:123 "worker-1"    # O(1) - set only if not exists → 1 (success) or 0 (fail)

# Multi-key operations
MSET user:1:name "Alice" user:2:name "Bob"   # O(N)
MGET user:1:name user:2:name                 # O(N) → ["Alice", "Bob"]
```

**Use cases:** Caching, counters, distributed locks, rate limiting (INCR), session tokens.

---

#### Lists

Doubly-linked lists. O(1) push/pop at head/tail, O(N) access by index.

```bash
# Queue pattern (FIFO): push right, pop left
RPUSH queue:emails "email1" "email2" "email3"   # O(N) for N elements
LPOP queue:emails                                # O(1) → "email1"

# Stack pattern (LIFO): push left, pop left
LPUSH stack:undo "action1" "action2"
LPOP stack:undo                                  # → "action2"

# Blocking pop (for worker queues) - blocks until data available or timeout
BRPOP queue:jobs 30                              # Block for 30 seconds

# Range queries
LRANGE queue:emails 0 -1          # O(S+N) → all elements
LRANGE feed:user:1 0 9            # O(S+N) → last 10 items
LLEN queue:emails                 # O(1) → length

# Trim to keep only recent items (capped list)
LTRIM feed:user:1 0 99            # O(N) - keep only first 100 items
```

**Use cases:** Message queues, activity feeds, recent items list, undo history.

---

#### Sets

Unordered collections of unique strings. O(1) add/remove/check membership.

```bash
SADD tags:article:1 "redis" "database" "caching"   # O(N)
SADD tags:article:2 "redis" "performance" "scaling"

SISMEMBER tags:article:1 "redis"     # O(1) → 1 (true)
SMEMBERS tags:article:1              # O(N) → ["redis", "database", "caching"]
SCARD tags:article:1                 # O(1) → 3 (cardinality)

# Set operations
SINTER tags:article:1 tags:article:2     # O(N*M) → ["redis"]
SUNION tags:article:1 tags:article:2     # → ["redis", "database", "caching", "performance", "scaling"]
SDIFF tags:article:1 tags:article:2      # → ["database", "caching"]

# Random member (e.g., random ad selection)
SRANDMEMBER tags:article:1 2             # O(N) → 2 random members
SPOP tags:article:1                      # O(1) → remove and return random member
```

**Use cases:** Tags, unique visitors, social graph (friends, followers), online users, de-duplication.

---

#### Sorted Sets (ZSets)

Like Sets but each member has a score. Ordered by score. Implemented as skip list + hash table.

```bash
# Leaderboard
ZADD leaderboard 1500 "player:alice"    # O(log N)
ZADD leaderboard 2300 "player:bob"
ZADD leaderboard 1800 "player:charlie"

# Top 3 players (highest score first)
ZREVRANGE leaderboard 0 2 WITHSCORES   # O(log N + M)
# → ["player:bob", "2300", "player:charlie", "1800", "player:alice", "1500"]

# Rank (0-based, highest = 0 with ZREVRANK)
ZREVRANK leaderboard "player:alice"     # O(log N) → 2

# Score operations
ZINCRBY leaderboard 500 "player:alice"  # O(log N) → 2000

# Range by score
ZRANGEBYSCORE leaderboard 1500 2000     # O(log N + M) → players with score 1500-2000

# Remove entries
ZREM leaderboard "player:alice"         # O(log N)

# Count in range
ZCOUNT leaderboard 1000 2000            # O(log N)
```

**Use cases:** Leaderboards, priority queues, time-series indexes, sliding window rate limiting, scheduling (score = timestamp).

---

#### Hashes

Field-value pairs under a single key. Think of it as a mini key-value store per key.

```bash
HSET user:1 name "Fazle" email "fazle@example.com" role "lead"   # O(N)
HGET user:1 name                       # O(1) → "Fazle"
HGETALL user:1                         # O(N) → {name: "Fazle", email: "fazle@example.com", role: "lead"}

HMSET product:1 name "Widget" price 29.99 stock 150   # O(N)
HINCRBY product:1 stock -1             # O(1) → 149 (atomic decrement)
HINCRBYFLOAT product:1 price 0.50      # O(1) → 30.49

HDEL user:1 email                      # O(1)
HEXISTS user:1 name                    # O(1) → 1
HKEYS user:1                           # O(N) → ["name", "role"]
HLEN user:1                            # O(1) → 2
```

**Use cases:** User profiles, product details, configuration storage, object caching (more memory-efficient than separate keys for small objects due to ziplist encoding).

**Memory optimization:** When a hash has fewer than `hash-max-ziplist-entries` (default 128) fields and each value is smaller than `hash-max-ziplist-value` (default 64 bytes), Redis stores it as a ziplist (compact, sequential memory) instead of a hash table.

---

#### Bitmaps

Not a separate data type -- strings treated as bit arrays. Extremely memory-efficient for boolean states.

```bash
# Track daily active users (bit position = user ID)
SETBIT dau:2026-03-13 1001 1          # O(1) - user 1001 was active
SETBIT dau:2026-03-13 1002 1
SETBIT dau:2026-03-13 2005 1

GETBIT dau:2026-03-13 1001            # O(1) → 1
GETBIT dau:2026-03-13 9999            # O(1) → 0

BITCOUNT dau:2026-03-13               # O(N) → 3 active users

# Users active on BOTH days
BITOP AND active_both dau:2026-03-12 dau:2026-03-13
BITCOUNT active_both

# Users active on EITHER day
BITOP OR active_either dau:2026-03-12 dau:2026-03-13
```

**Memory:** 1 million users = ~122 KB. 100 million users = ~12 MB. Extremely efficient for boolean flags.

**Use cases:** Feature flags, daily active users, user online status, bloom filter implementation.

---

#### HyperLogLog

Probabilistic data structure for cardinality estimation. Fixed 12 KB per key regardless of the number of elements.

```bash
PFADD visitors:2026-03-13 "user:1" "user:2" "user:3"    # O(1)
PFADD visitors:2026-03-13 "user:1" "user:4"              # user:1 is duplicate, ignored

PFCOUNT visitors:2026-03-13           # O(1) → ~4 (0.81% standard error)

# Merge multiple HLLs (e.g., weekly unique visitors)
PFMERGE visitors:week visitors:2026-03-13 visitors:2026-03-12 visitors:2026-03-11
PFCOUNT visitors:week
```

**Trade-off:** 0.81% standard error in exchange for using only 12 KB regardless of cardinality. Counting 1 billion unique items still uses 12 KB.

**Use cases:** Unique visitor counting, unique search queries, unique event counting -- anywhere approximate counts are acceptable.

---

#### Streams

Append-only log data structure (Redis 5.0+). Closest to Apache Kafka in Redis.

```bash
# Add entries (auto-generated ID: timestamp-sequence)
XADD events:orders * action "created" orderId "ord-123" amount "59.99"
# → "1678700000000-0"

XADD events:orders * action "paid" orderId "ord-123"
# → "1678700000001-0"

# Read entries
XRANGE events:orders - +                # All entries
XRANGE events:orders - + COUNT 10       # First 10 entries
XLEN events:orders                      # Number of entries

# Consumer groups (covered in detail in Q6)
XGROUP CREATE events:orders processors $ MKSTREAM
XREADGROUP GROUP processors worker-1 COUNT 5 BLOCK 2000 STREAMS events:orders >
```

**Use cases:** Event sourcing, audit logs, activity streams, message queues with replay capability.

---

### Data Structure Selection Guide

| Problem | Best Structure | Why |
|---------|---------------|-----|
| Cache API response | String | Simple key-value, TTL support |
| User session | Hash | Multiple fields, partial updates |
| Message queue | List (simple) / Stream (advanced) | BRPOP for blocking, Streams for consumer groups |
| Leaderboard | Sorted Set | Ordered by score, O(log N) rank lookup |
| Unique visitors (exact) | Set | SCARD for count, SISMEMBER for check |
| Unique visitors (approx) | HyperLogLog | 12 KB per key, 0.81% error |
| Daily active users | Bitmap | 1 bit per user, BITCOUNT and BITOP |
| Social graph (mutual friends) | Set | SINTER for mutual friends |
| Rate limiter | String (fixed window) / Sorted Set (sliding) | INCR or ZADD with timestamp scores |
| Real-time event log | Stream | Consumer groups, replay, acknowledgment |
| Object with fields | Hash | Memory-efficient for small objects (ziplist) |
| Tags / categories | Set | Unique, set operations (SINTER, SUNION) |

---

## Q3: Redis Caching Patterns

### Q3.1: Explain the major caching patterns and when to use each.

**Answer:**

#### 1. Cache-Aside (Lazy Loading)

The application manages the cache explicitly. Most common pattern.

```
Read:  App → Cache hit? → Return
              ↓ miss
       App → DB → Write to Cache → Return

Write: App → DB → Invalidate/Delete Cache
```

```typescript
// NestJS Service - Cache-Aside
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class UserService {
  constructor(
    private readonly redis: Redis,
    private readonly userRepository: UserRepository,
  ) {}

  async getUser(userId: string): Promise<User> {
    const cacheKey = `user:${userId}`;

    // 1. Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. Cache miss - query DB
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException();

    // 3. Populate cache with TTL
    await this.redis.setex(cacheKey, 3600, JSON.stringify(user));

    return user;
  }

  async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.update(userId, data);

    // Invalidate cache on write
    await this.redis.del(`user:${userId}`);

    return user;
  }
}
```

**Pros:** Only caches what is requested, cache misses are not fatal (falls back to DB).
**Cons:** Cache miss = 3 round trips (check cache, query DB, write cache). Stale data possible until TTL expires or explicit invalidation.

---

#### 2. Write-Through

Every write goes through the cache to the DB. Cache is always up to date.

```
Write: App → Cache → DB (synchronous)
Read:  App → Cache (always hit after first write)
```

```typescript
async createOrder(data: CreateOrderDto): Promise<Order> {
  const order = await this.orderRepository.create(data);

  // Write-through: update cache immediately
  await this.redis.setex(
    `order:${order.id}`,
    7200,
    JSON.stringify(order),
  );

  return order;
}
```

**Pros:** Cache is always consistent with DB, reads are always fast.
**Cons:** Write latency increases (must write to both), caches data that may never be read.

---

#### 3. Write-Behind (Write-Back)

Write to cache immediately, asynchronously flush to DB in batches.

```
Write: App → Cache → Return immediately
       Background: Cache → DB (batched, async)
```

```typescript
// Simplified write-behind with a flush interval
@Injectable()
export class WriteBackCacheService implements OnModuleInit {
  private writeBuffer: Map<string, any> = new Map();

  onModuleInit() {
    // Flush to DB every 5 seconds
    setInterval(() => this.flushToDb(), 5000);
  }

  async write(key: string, value: any): Promise<void> {
    // Write to Redis immediately
    await this.redis.setex(key, 3600, JSON.stringify(value));

    // Buffer for async DB write
    this.writeBuffer.set(key, value);
  }

  private async flushToDb(): Promise<void> {
    if (this.writeBuffer.size === 0) return;

    const batch = new Map(this.writeBuffer);
    this.writeBuffer.clear();

    // Batch write to database
    await this.repository.bulkUpsert([...batch.values()]);
  }
}
```

**Pros:** Lowest write latency, batch writes reduce DB load.
**Cons:** Risk of data loss if Redis crashes before flush, complex to implement correctly, eventual consistency.

---

#### 4. Read-Through

Cache itself fetches from DB on miss. Requires a cache provider that supports this (e.g., some CDN/proxy caches).

```
Read: App → Cache → (miss) → Cache fetches from DB → Cache stores → Return
```

This is essentially cache-aside, but the logic lives in the cache layer rather than the application. Often implemented with libraries like `cacheable` or custom cache wrappers.

---

#### 5. Refresh-Ahead

Proactively refresh cache entries before they expire. Reduces cache miss latency at the cost of potentially refreshing data that no one reads.

```typescript
async getProduct(productId: string): Promise<Product> {
  const cacheKey = `product:${productId}`;
  const ttl = await this.redis.ttl(cacheKey);
  const cached = await this.redis.get(cacheKey);

  if (cached) {
    // If TTL < 20% of original, refresh asynchronously
    if (ttl > 0 && ttl < 720) { // 720 = 20% of 3600
      this.refreshCache(cacheKey, productId); // fire-and-forget
    }
    return JSON.parse(cached);
  }

  // Cache miss
  return this.loadAndCache(cacheKey, productId);
}

private async refreshCache(key: string, productId: string): Promise<void> {
  const product = await this.productRepository.findById(productId);
  await this.redis.setex(key, 3600, JSON.stringify(product));
}
```

### Q3.2: What is the Cache Stampede (Thundering Herd) problem and how do you solve it?

**Answer:**

Cache stampede occurs when a popular cache key expires and many concurrent requests simultaneously hit the database to recompute the same value.

```
Key expires → 1000 requests arrive → 1000 DB queries for the same data → DB overwhelmed
```

**Solutions:**

#### 1. Mutex / Lock Pattern (SETNX)

Only one request recomputes; others wait or serve stale data.

```typescript
async getWithMutex(key: string, fetchFn: () => Promise<any>, ttl: number): Promise<any> {
  const cached = await this.redis.get(key);
  if (cached) return JSON.parse(cached);

  const lockKey = `lock:${key}`;
  // Try to acquire lock (NX = only if not exists, EX = 10 second timeout)
  const acquired = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');

  if (acquired) {
    try {
      // Winner: fetch from DB and populate cache
      const value = await fetchFn();
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return value;
    } finally {
      await this.redis.del(lockKey);
    }
  } else {
    // Loser: wait and retry from cache
    await new Promise((resolve) => setTimeout(resolve, 100));
    return this.getWithMutex(key, fetchFn, ttl);
  }
}
```

#### 2. Probabilistic Early Recomputation

Randomly refresh before TTL expires. The closer to expiration, the higher the probability of refresh.

```typescript
async getWithEarlyRecompute(
  key: string,
  fetchFn: () => Promise<any>,
  ttl: number,
): Promise<any> {
  const cached = await this.redis.get(key);
  const remainingTtl = await this.redis.ttl(key);

  if (cached) {
    // XFetch algorithm: probabilistically refresh early
    const delta = ttl * 0.1; // recomputation time estimate
    const shouldRefresh = remainingTtl - delta * Math.log(Math.random()) <= 0;

    if (!shouldRefresh) {
      return JSON.parse(cached);
    }
  }

  const value = await fetchFn();
  await this.redis.setex(key, ttl, JSON.stringify(value));
  return value;
}
```

#### 3. Stale-While-Revalidate

Store data with a logical expiry. Serve stale data while refreshing in the background.

```typescript
async getStaleWhileRevalidate(key: string, fetchFn: () => Promise<any>): Promise<any> {
  const raw = await this.redis.get(key);
  if (!raw) {
    // Hard miss - must fetch synchronously
    const value = await fetchFn();
    const wrapped = { data: value, expiresAt: Date.now() + 3600_000 };
    await this.redis.set(key, JSON.stringify(wrapped)); // No TTL or very long TTL
    return value;
  }

  const { data, expiresAt } = JSON.parse(raw);

  if (Date.now() > expiresAt) {
    // Logically expired - return stale, refresh in background
    fetchFn().then(async (freshValue) => {
      const wrapped = { data: freshValue, expiresAt: Date.now() + 3600_000 };
      await this.redis.set(key, JSON.stringify(wrapped));
    });
  }

  return data; // Return current (possibly stale) data immediately
}
```

### Q3.3: What are best practices for cache invalidation?

**Answer:**

Cache invalidation is famously one of the two hardest problems in computer science. Strategies:

1. **TTL-based expiration** -- simplest, tolerates staleness for TTL duration
2. **Event-driven invalidation** -- delete cache on write events (DB triggers, application events, CDC)
3. **Version-based keys** -- `user:1:v3` -- increment version on update, old keys expire naturally
4. **Tag-based invalidation** -- group related cache keys under tags, invalidate all keys for a tag

**TTL best practices:**
- Hot data (frequently accessed): longer TTL (1-24 hours)
- Volatile data (changes often): shorter TTL (30 seconds - 5 minutes)
- Static data (rarely changes): very long TTL (days) + event-driven invalidation
- Never use infinite TTL in production (memory leak risk)
- Jitter: add randomness to TTL to avoid mass expiration (`TTL + random(0, 60)`)

---

## Q4: Redis as a Distributed Lock (Redlock)

### Q4.1: Why do we need distributed locks and how does Redis implement them?

**Answer:**

Distributed locks prevent race conditions when multiple application instances access a shared resource. Example: two instances processing the same order simultaneously could charge a customer twice.

#### Simple Lock (Single Redis Instance)

```bash
# Acquire lock: SET with NX (only if not exists) and EX (expiration)
SET lock:order:123 "worker-a-uuid" NX EX 30
# Returns OK if acquired, nil if already locked
```

```typescript
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DistributedLockService {
  constructor(private readonly redis: Redis) {}

  async acquireLock(
    resource: string,
    ttlSeconds: number = 30,
  ): Promise<string | null> {
    const lockId = uuidv4();
    const result = await this.redis.set(
      `lock:${resource}`,
      lockId,
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK' ? lockId : null;
  }

  async releaseLock(resource: string, lockId: string): Promise<boolean> {
    // CRITICAL: Use Lua script to atomically check + delete
    // Without this, you might delete someone else's lock
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(script, 1, `lock:${resource}`, lockId);
    return result === 1;
  }

  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 30,
  ): Promise<T> {
    const lockId = await this.acquireLock(resource, ttlSeconds);
    if (!lockId) {
      throw new ConflictException('Could not acquire lock');
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(resource, lockId);
    }
  }
}

// Usage in a service
@Injectable()
export class OrderService {
  constructor(
    private readonly lockService: DistributedLockService,
    private readonly orderRepository: OrderRepository,
  ) {}

  async processPayment(orderId: string): Promise<void> {
    await this.lockService.withLock(`order:${orderId}`, async () => {
      const order = await this.orderRepository.findById(orderId);
      if (order.status !== 'pending') return; // Already processed

      await this.paymentGateway.charge(order);
      await this.orderRepository.updateStatus(orderId, 'paid');
    });
  }
}
```

**Why Lua for unlock?** Without atomic check-and-delete:
1. Client A checks lock value -- it matches
2. Client A's lock expires (GC pause, network delay)
3. Client B acquires the lock
4. Client A deletes the lock (thinking it is still its own)
5. Now Client C can acquire -- two clients hold the "lock"

#### Redlock Algorithm (Multi-Instance)

For higher reliability, Redlock acquires locks across N independent Redis instances (typically 5).

```
1. Get current time in milliseconds
2. Try to acquire lock on N instances sequentially with short timeout
3. Lock is acquired if: majority (N/2 + 1) instances grant it AND total time < lock TTL
4. Effective TTL = original TTL - time elapsed acquiring locks
5. If lock fails, release on ALL instances
```

**Pitfalls and controversies:**
- **Clock drift:** Redlock assumes roughly synchronized clocks. Significant clock skew breaks safety.
- **GC pauses:** A long GC pause after acquiring the lock can cause the lock to expire before work completes.
- **Network partitions:** A client might believe it holds a lock while being partitioned from the instance that granted it.
- **Martin Kleppmann's critique:** Argues Redlock is fundamentally unsafe for correctness; use fencing tokens instead.

**When to use Redis locks vs alternatives:**

| Mechanism | Best For |
|-----------|----------|
| Redis simple lock (SET NX) | Single Redis instance, moderate safety needs |
| Redlock | Multi-instance Redis, higher availability needs |
| Database lock (SELECT FOR UPDATE) | When DB is already in the critical path |
| ZooKeeper / etcd | Mission-critical distributed coordination |
| Kafka consumer groups | Message processing (built-in partition assignment) |

---

## Q5: Redis Pub/Sub

### Q5.1: How does Redis Pub/Sub work and what are its limitations?

**Answer:**

Redis Pub/Sub is a fire-and-forget messaging system. Publishers send messages to channels; all subscribers on that channel receive the message in real time.

```bash
# Terminal 1: Subscribe
SUBSCRIBE notifications:user:1
# Waiting for messages...

# Terminal 2: Publish
PUBLISH notifications:user:1 '{"type":"message","from":"user:2","text":"Hello"}'
# → (integer) 1  (number of subscribers that received it)

# Pattern subscribe (wildcard)
PSUBSCRIBE notifications:*
# Receives messages from ALL notification channels
```

**How it works internally:**
1. Subscriber sends `SUBSCRIBE channel` -- Redis adds the client to the channel's subscriber list
2. Publisher sends `PUBLISH channel message` -- Redis iterates over subscribers and pushes the message
3. O(N+M) where N = number of subscribed clients, M = number of patterns to match

**Limitations (critical for interviews):**
1. **No persistence** -- if no subscriber is connected, the message is lost forever
2. **No replay** -- a subscriber that connects late cannot see past messages
3. **No acknowledgment** -- publisher has no idea if the message was processed
4. **No consumer groups** -- every subscriber gets every message (no load balancing)
5. **Subscriber must maintain connection** -- if the connection drops, messages during disconnect are lost
6. **Subscribing client is blocked** -- it cannot execute other Redis commands while subscribed

### Q5.2: Compare Redis Pub/Sub, Redis Streams, Kafka, and RabbitMQ.

**Answer:**

| Feature | Redis Pub/Sub | Redis Streams | Kafka | RabbitMQ |
|---------|--------------|---------------|-------|----------|
| Delivery | At-most-once | At-least-once | At-least-once / Exactly-once | At-least-once |
| Persistence | No | Yes | Yes | Yes (optional) |
| Replay | No | Yes | Yes | No (once consumed) |
| Consumer groups | No | Yes | Yes | Yes (competing consumers) |
| Ordering | Per channel | Per stream | Per partition | Per queue |
| Throughput | High | Medium-High | Very High | Medium |
| Backpressure | No | MAXLEN trim | Partition-based | Prefetch count |
| Use case | Real-time notifications | Event sourcing, job queues | Large-scale event streaming | Task queues, routing |

### Q5.3: Show a NestJS implementation of Redis Pub/Sub.

**Answer:**

```typescript
// redis-pubsub.module.ts
import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_PUBLISHER',
      useFactory: () => new Redis({ host: 'localhost', port: 6379 }),
    },
    {
      provide: 'REDIS_SUBSCRIBER',
      useFactory: () => new Redis({ host: 'localhost', port: 6379 }),
    },
  ],
  exports: ['REDIS_PUBLISHER', 'REDIS_SUBSCRIBER'],
})
export class RedisPubSubModule {}

// notification.service.ts
import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject('REDIS_PUBLISHER') private readonly publisher: Redis,
    @Inject('REDIS_SUBSCRIBER') private readonly subscriber: Redis,
  ) {}

  async onModuleInit() {
    // Subscribe to notification channels
    await this.subscriber.psubscribe('notifications:*');

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      const userId = channel.split(':')[1];
      const payload = JSON.parse(message);
      this.handleNotification(userId, payload);
    });
  }

  async onModuleDestroy() {
    await this.subscriber.punsubscribe('notifications:*');
  }

  async publish(userId: string, notification: any): Promise<void> {
    await this.publisher.publish(
      `notifications:${userId}`,
      JSON.stringify(notification),
    );
  }

  private handleNotification(userId: string, payload: any): void {
    // Forward to WebSocket, SSE, etc.
    console.log(`Notification for user ${userId}:`, payload);
  }
}

// Usage: Cross-instance cache invalidation
@Injectable()
export class CacheInvalidationService implements OnModuleInit {
  constructor(
    @Inject('REDIS_PUBLISHER') private readonly publisher: Redis,
    @Inject('REDIS_SUBSCRIBER') private readonly subscriber: Redis,
    private readonly cacheManager: CacheService,
  ) {}

  async onModuleInit() {
    await this.subscriber.subscribe('cache:invalidate');
    this.subscriber.on('message', async (channel, message) => {
      if (channel === 'cache:invalidate') {
        const { key } = JSON.parse(message);
        await this.cacheManager.del(key); // Clear local cache
      }
    });
  }

  async invalidate(key: string): Promise<void> {
    await this.publisher.publish(
      'cache:invalidate',
      JSON.stringify({ key }),
    );
  }
}
```

**When to use Pub/Sub:** Real-time notifications where message loss is acceptable, cross-instance cache invalidation, chat (with a fallback for missed messages), live dashboards.

**When NOT to use:** Reliable message delivery, job queues, event sourcing -- use Redis Streams or Kafka instead.

---

## Q6: Redis Streams

### Q6.1: Explain Redis Streams and consumer groups in depth.

**Answer:**

Redis Streams (introduced in Redis 5.0) is an append-only log data structure with consumer group support. It is the closest thing Redis has to Apache Kafka.

**Key concepts:**
- **Stream:** An append-only log of entries, each with an auto-generated ID (`<timestamp>-<sequence>`)
- **Entry:** Key-value pairs (like a hash) appended to the stream
- **Consumer Group:** A named group of consumers that share the workload; each entry is delivered to only one consumer in the group
- **PEL (Pending Entries List):** Tracks entries delivered but not yet acknowledged
- **Acknowledgment:** Consumer sends XACK after processing to remove from PEL

```bash
# Create a stream by adding entries
XADD orders:stream * action "created" orderId "ord-1" amount "99.99"
# → "1678700000000-0"

XADD orders:stream * action "created" orderId "ord-2" amount "149.99"
# → "1678700000001-0"

# Create a consumer group starting from the latest entry
XGROUP CREATE orders:stream order-processors $ MKSTREAM
# $ = only new messages; 0 = read from beginning

# Consumer reads from group (blocks for 5000ms if no new messages)
XREADGROUP GROUP order-processors worker-1 COUNT 10 BLOCK 5000 STREAMS orders:stream >
# > means "give me new messages not yet delivered to any consumer in this group"

# After processing, acknowledge
XACK orders:stream order-processors "1678700000000-0"

# Check pending entries (unacknowledged)
XPENDING orders:stream order-processors - + 10

# Claim idle messages (e.g., from a crashed worker)
XCLAIM orders:stream order-processors worker-2 60000 "1678700000000-0"
# Claim entries idle for > 60000ms and assign to worker-2

# Auto-claim (Redis 6.2+): automatically claim and read idle messages
XAUTOCLAIM orders:stream order-processors worker-2 60000 0-0 COUNT 10

# Trim stream to manage memory
XTRIM orders:stream MAXLEN ~ 10000    # Keep approximately 10000 entries
XTRIM orders:stream MINID ~ 1678700000000-0   # Remove entries older than ID
```

### Q6.2: Show a NestJS implementation of a job queue using Redis Streams.

**Answer:**

```typescript
// stream-producer.service.ts
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class StreamProducerService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({ host: 'localhost', port: 6379 });
  }

  async publishEvent(stream: string, data: Record<string, string>): Promise<string> {
    // XADD with auto-generated ID and approximate trimming
    const entryId = await this.redis.xadd(
      stream,
      'MAXLEN', '~', '100000', // Trim to ~100k entries
      '*',                      // Auto-generate ID
      ...Object.entries(data).flat(),
    );
    return entryId;
  }
}

// stream-consumer.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class StreamConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamConsumerService.name);
  private redis: Redis;
  private running = false;
  private readonly stream = 'events:orders';
  private readonly group = 'order-processors';
  private readonly consumer = `worker-${process.pid}`;

  constructor() {
    this.redis = new Redis({ host: 'localhost', port: 6379 });
  }

  async onModuleInit() {
    await this.ensureConsumerGroup();
    this.running = true;
    this.consumeLoop();       // Process new messages
    this.claimIdleLoop();     // Reclaim stuck messages
  }

  async onModuleDestroy() {
    this.running = false;
    this.redis.disconnect();
  }

  private async ensureConsumerGroup(): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', this.stream, this.group, '0', 'MKSTREAM');
      this.logger.log(`Created consumer group: ${this.group}`);
    } catch (err) {
      if (!err.message.includes('BUSYGROUP')) throw err;
      // Group already exists -- fine
    }
  }

  private async consumeLoop(): Promise<void> {
    while (this.running) {
      try {
        const results = await this.redis.xreadgroup(
          'GROUP', this.group, this.consumer,
          'COUNT', '10',
          'BLOCK', '5000',     // Block for 5 seconds if no messages
          'STREAMS', this.stream,
          '>',                 // Only undelivered messages
        );

        if (!results) continue; // Timeout, no messages

        for (const [, entries] of results) {
          for (const [entryId, fields] of entries) {
            await this.processEntry(entryId, fields);
          }
        }
      } catch (err) {
        this.logger.error(`Consumer error: ${err.message}`);
        await new Promise((r) => setTimeout(r, 1000)); // Back off
      }
    }
  }

  private async claimIdleLoop(): Promise<void> {
    while (this.running) {
      try {
        // Claim messages idle for > 60 seconds (from crashed consumers)
        const result = await this.redis.xautoclaim(
          this.stream, this.group, this.consumer,
          60000,    // Min idle time in ms
          '0-0',    // Start ID
          'COUNT', '5',
        );

        if (result && result[1] && result[1].length > 0) {
          for (const [entryId, fields] of result[1]) {
            this.logger.warn(`Reclaiming idle entry: ${entryId}`);
            await this.processEntry(entryId, fields);
          }
        }
      } catch (err) {
        this.logger.error(`Claim error: ${err.message}`);
      }

      await new Promise((r) => setTimeout(r, 10000)); // Check every 10 seconds
    }
  }

  private async processEntry(entryId: string, fields: string[]): Promise<void> {
    // Convert flat array to object: ["action", "created", "orderId", "ord-1"] → { action: "created", orderId: "ord-1" }
    const data: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }

    try {
      this.logger.log(`Processing ${entryId}: ${JSON.stringify(data)}`);

      // Your business logic here
      await this.handleOrderEvent(data);

      // Acknowledge successful processing
      await this.redis.xack(this.stream, this.group, entryId);
    } catch (err) {
      this.logger.error(`Failed to process ${entryId}: ${err.message}`);
      // Do NOT acknowledge -- it will be retried or claimed by another consumer
    }
  }

  private async handleOrderEvent(data: Record<string, string>): Promise<void> {
    // Business logic: process order, send email, etc.
  }
}
```

### Q6.3: Redis Streams vs Apache Kafka

| Aspect | Redis Streams | Apache Kafka |
|--------|--------------|--------------|
| Throughput | ~100K-500K msg/sec | ~1M+ msg/sec |
| Persistence | In-memory + optional disk | Disk-first (append-only log) |
| Message size | Best for small messages (<1MB) | Handles larger messages better |
| Consumer groups | Yes | Yes (more mature) |
| Partitioning | Single stream per node (use multiple streams manually) | Built-in partitioning |
| Replay | XRANGE with ID | Offset-based seek |
| Retention | MAXLEN / MINID trimming (manual) | Time-based / size-based (configurable) |
| Operational complexity | Low (part of Redis) | High (ZooKeeper/KRaft, brokers, topics) |
| Ordering | Total order per stream | Per-partition ordering |
| Best for | Moderate throughput, already using Redis, simpler setups | High throughput, large-scale event-driven architecture |

**Interview tip:** "I use Redis Streams when we already have Redis in the stack and throughput requirements are moderate (under 500K msgs/sec). For large-scale event-driven architectures with strict durability requirements and millions of events per second, I reach for Kafka."

---

## Q7: Redis Transactions & Lua Scripting

### Q7.1: How do Redis transactions work with MULTI/EXEC?

**Answer:**

Redis transactions batch multiple commands that execute atomically (all or nothing, sequentially, without interleaving other client commands).

```bash
MULTI                       # Start transaction
SET user:1:balance 100      # QUEUED
DECRBY user:1:balance 30    # QUEUED
INCRBY user:2:balance 30    # QUEUED
EXEC                        # Execute all at once
# → [OK, 70, 30]
```

**Important:** Redis transactions are NOT like SQL transactions:
- No rollback on error -- if one command fails, others still execute
- No isolation levels -- but commands are serialized (no interleaving)
- Cannot read values mid-transaction (commands are queued, not executed)

#### WATCH for Optimistic Locking (CAS)

```bash
WATCH user:1:balance        # Watch for changes
val = GET user:1:balance    # Read current value → "100"

# If another client modifies user:1:balance here, EXEC will fail

MULTI
DECRBY user:1:balance 30
EXEC
# Returns nil if user:1:balance changed since WATCH (retry needed)
# Returns [70] if unchanged
```

```typescript
// Optimistic locking pattern in ioredis
async transferFunds(from: string, to: string, amount: number): Promise<boolean> {
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await this.redis.watch(`balance:${from}`);

      const balance = parseInt(await this.redis.get(`balance:${from}`), 10);
      if (balance < amount) {
        await this.redis.unwatch();
        throw new BadRequestException('Insufficient funds');
      }

      const result = await this.redis
        .multi()
        .decrby(`balance:${from}`, amount)
        .incrby(`balance:${to}`, amount)
        .exec();

      if (result) return true; // Success - no WATCHed key was modified
      // result is null → WATCHed key was modified, retry
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
    }
  }

  throw new ConflictException('Transfer failed after retries');
}
```

### Q7.2: Why use Lua scripting in Redis and what are common patterns?

**Answer:**

Lua scripts execute atomically on the Redis server. Unlike MULTI/EXEC, you can read values and make decisions within the script. The entire script blocks the Redis event loop, so no other commands run during execution.

```bash
# EVAL script numkeys key1 key2 ... arg1 arg2 ...
EVAL "return redis.call('GET', KEYS[1])" 1 mykey
```

**Common patterns:**

#### 1. Sliding Window Rate Limiter

```typescript
// Rate limiter: 100 requests per 60 seconds per user
private readonly rateLimitScript = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])
  local windowStart = now - window

  -- Remove expired entries
  redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

  -- Count current entries
  local count = redis.call('ZCARD', key)

  if count < limit then
    -- Add current request
    redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
    redis.call('EXPIRE', key, window)
    return 1  -- Allowed
  else
    return 0  -- Denied
  end
`;

async isAllowed(userId: string, limit = 100, windowSec = 60): Promise<boolean> {
  const result = await this.redis.eval(
    this.rateLimitScript,
    1,
    `ratelimit:${userId}`,
    limit,
    windowSec,
    Math.floor(Date.now() / 1000),
  );
  return result === 1;
}
```

#### 2. Atomic Inventory Decrement (Avoid Overselling)

```typescript
private readonly decrementScript = `
  local key = KEYS[1]
  local quantity = tonumber(ARGV[1])
  local current = tonumber(redis.call('GET', key) or '0')

  if current >= quantity then
    return redis.call('DECRBY', key, quantity)
  else
    return -1  -- Insufficient stock
  end
`;

async reserveStock(productId: string, quantity: number): Promise<number> {
  const result = await this.redis.eval(
    this.decrementScript,
    1,
    `stock:${productId}`,
    quantity,
  );

  if (result === -1) {
    throw new BadRequestException('Insufficient stock');
  }
  return result as number;
}
```

#### 3. Conditional Update (Compare and Swap)

```typescript
private readonly casScript = `
  local key = KEYS[1]
  local expected = ARGV[1]
  local newValue = ARGV[2]
  local current = redis.call('GET', key)

  if current == expected then
    redis.call('SET', key, newValue)
    return 1
  else
    return 0
  end
`;
```

**Best practices for Lua in Redis:**
- Keep scripts short -- they block the event loop
- Use `EVALSHA` with script SHA to avoid sending the full script each time
- Use `KEYS[]` and `ARGV[]` properly -- required for Redis Cluster compatibility
- Never do long-running operations (loops over large datasets) in Lua
- Test scripts thoroughly -- no debugger in production

---

## Q8: Redis Persistence & Durability

### Q8.1: Compare RDB and AOF persistence in detail.

**Answer:**

#### RDB (Redis Database Backup)

```bash
# Manual snapshot
SAVE          # Blocking! Don't use in production
BGSAVE        # Background save (forks child process)

# Automatic snapshots (redis.conf)
save 900 1        # Save if 1+ keys changed in 15 minutes
save 300 10       # Save if 10+ keys changed in 5 minutes
save 60 10000     # Save if 10000+ keys changed in 1 minute

# RDB file location
dbfilename dump.rdb
dir /var/lib/redis/
```

**How BGSAVE works:**
1. Redis forks a child process (uses OS copy-on-write)
2. Child writes all data to a temporary RDB file
3. When done, atomically replaces the old RDB file
4. Parent continues serving requests with minimal overhead

**Pros:**
- Compact single-file format, perfect for backups
- Fast restart (loading RDB is faster than replaying AOF)
- Minimal impact on performance (fork + copy-on-write)

**Cons:**
- Data loss between snapshots (last minutes of writes)
- Fork can be slow with large datasets (e.g., 25GB dataset = ~50ms to fork, may cause latency spike)

#### AOF (Append-Only File)

```bash
# redis.conf
appendonly yes
appendfilename "appendonly.aof"

# fsync policies
appendfsync always       # Fsync after every write (safest, ~1/10th throughput)
appendfsync everysec     # Fsync once per second (recommended)
appendfsync no           # Let OS decide (fastest, least safe)
```

**AOF Rewriting:**
Over time, AOF grows large (e.g., 1000 INCRs on the same key). AOF rewrite compacts it:

```bash
# Before rewrite (1000 lines):
SET counter 0
INCR counter
INCR counter
... (998 more INCRs)

# After rewrite (1 line):
SET counter 1000
```

```bash
BGREWRITEAOF                  # Trigger manually
# Or automatic:
auto-aof-rewrite-percentage 100    # Rewrite when AOF is 2x since last rewrite
auto-aof-rewrite-min-size 64mb     # Only rewrite if AOF > 64MB
```

#### Persistence Decision Matrix

| Scenario | Persistence Mode | Config |
|----------|-----------------|--------|
| Pure cache (data loss acceptable) | None | `save ""`, `appendonly no` |
| Cache with warm restart | RDB only | `save 900 1`, `appendonly no` |
| Important data, some loss OK | AOF (everysec) | `appendonly yes`, `appendfsync everysec` |
| Critical data, minimal loss | RDB + AOF | Both enabled (recommended for prod) |
| Maximum durability | AOF (always) | `appendfsync always` (significant performance hit) |

**Redis 7.0+ uses multi-part AOF:** The AOF is split into a base file (RDB format) and incremental files. This makes AOF rewriting more efficient and reduces I/O.

**Interview tip:** "In production, I use both RDB and AOF. AOF with `everysec` fsync gives me at most 1 second of data loss, while RDB provides compact backups for disaster recovery and faster initial loads."

---

## Q9: Redis Cluster & Scaling

### Q9.1: Explain Redis Cluster architecture and how sharding works.

**Answer:**

Redis Cluster provides automatic sharding and high availability across multiple Redis nodes.

**Hash Slots:**
- Redis Cluster divides the keyspace into **16,384 hash slots**
- Each master node is responsible for a subset of slots
- Key-to-slot mapping: `CLUSTER KEYSLOT key` = `CRC16(key) mod 16384`

```
Node A (master): Slots 0-5460      + Replica A'
Node B (master): Slots 5461-10922  + Replica B'
Node C (master): Slots 10923-16383 + Replica C'
```

```bash
# Check which slot a key maps to
CLUSTER KEYSLOT "user:123"        # → 5649 (handled by Node B)
CLUSTER KEYSLOT "user:456"        # → 12311 (handled by Node C)
```

**Hash Tags -- Forcing Related Keys to the Same Slot:**

Multi-key operations (MGET, transactions, Lua scripts) only work when all keys are on the same node. Use hash tags `{...}` to control slot assignment:

```bash
# Without hash tags: these keys may be on different nodes
SET user:1:profile "..."    # Slot X
SET user:1:settings "..."   # Slot Y  ← DIFFERENT!

# With hash tags: only the part in {} determines the slot
SET {user:1}:profile "..."  # CRC16("user:1") → same slot
SET {user:1}:settings "..." # CRC16("user:1") → same slot!

# Now you can use MULTI/EXEC or Lua across these keys
```

**MOVED and ASK Redirections:**

```
Client → Node A: GET user:456
Node A → Client: MOVED 12311 192.168.1.3:6379   (key belongs to Node C permanently)
Client → Node C: GET user:456
Client caches: slot 12311 → Node C

# During resharding:
Client → Node A: GET user:789
Node A → Client: ASK 8999 192.168.1.2:6379     (slot is being migrated, try Node B)
Client → Node B: ASKING                         (one-time redirect, don't cache)
Client → Node B: GET user:789
```

Smart clients (like ioredis) handle redirections automatically and cache the slot-to-node mapping.

### Q9.2: Redis Sentinel vs Redis Cluster -- when to use each?

**Answer:**

| Aspect | Redis Sentinel | Redis Cluster |
|--------|---------------|---------------|
| Purpose | High availability only (failover) | HA + horizontal scaling (sharding) |
| Sharding | No (single master, all data on one node) | Yes (automatic, hash slots) |
| Data capacity | Limited by single node RAM | Scales across nodes |
| Multi-key ops | All keys available | Only within same hash slot |
| Topology | 1 master + N replicas + 3+ sentinels | N masters + N replicas (min 3 masters) |
| Failover | Sentinel promotes replica to master | Replicas auto-promote on master failure |
| Client complexity | Client asks Sentinel for current master | Client handles MOVED/ASK redirections |
| When to use | Dataset < 100GB, simple setup | Dataset > 100GB or high write throughput |

```bash
# Sentinel configuration (sentinel.conf)
sentinel monitor mymaster 192.168.1.1 6379 2    # 2 = quorum (sentinels needed to agree on failover)
sentinel down-after-milliseconds mymaster 5000   # Mark as down after 5s no response
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1

# Cluster creation (Redis CLI)
redis-cli --cluster create \
  192.168.1.1:6379 192.168.1.2:6379 192.168.1.3:6379 \
  192.168.1.4:6379 192.168.1.5:6379 192.168.1.6:6379 \
  --cluster-replicas 1    # 1 replica per master → 3 masters + 3 replicas
```

### Q9.3: How does AWS ElastiCache Redis compare to self-managed?

**Answer:**

| Aspect | AWS ElastiCache | Self-Managed |
|--------|----------------|--------------|
| Operational overhead | Low (managed patching, backups, failover) | High |
| Cluster mode | Supported (similar to Redis Cluster) | Full control |
| Multi-AZ | Built-in with automatic failover | Manual setup |
| Cost | Higher (managed service premium) | Lower (compute cost only) |
| Customization | Limited (some redis.conf params locked) | Full |
| Monitoring | CloudWatch integration | Prometheus/Grafana setup needed |
| Network | VPC only (no public access by default) | Flexible |
| Version upgrades | Managed rolling upgrades | Manual, potential downtime |

**Interview tip:** "In production on AWS, I typically use ElastiCache with cluster mode enabled for sharding and Multi-AZ for HA. The operational overhead reduction is worth the cost premium for most teams."

---

## Q10: Redis Rate Limiting

### Q10.1: Explain the major rate limiting algorithms with Redis implementations.

**Answer:**

#### 1. Fixed Window Counter

Simplest approach. Count requests in a fixed time window.

```bash
# 100 requests per minute
INCR ratelimit:user:1:202603131045    # key = user:minute
EXPIRE ratelimit:user:1:202603131045 60

# Check: if count > 100, deny
```

```typescript
async fixedWindow(userId: string, limit: number, windowSec: number): Promise<boolean> {
  const window = Math.floor(Date.now() / 1000 / windowSec);
  const key = `ratelimit:fw:${userId}:${window}`;

  const count = await this.redis.incr(key);
  if (count === 1) {
    await this.redis.expire(key, windowSec);
  }

  return count <= limit;
}
```

**Drawback:** Boundary problem. A user can send 100 requests at 1:00:59 and 100 at 1:01:00 -- 200 requests in 2 seconds.

---

#### 2. Sliding Window Log

Track each request timestamp in a sorted set. Most accurate but uses more memory.

```bash
# Using Lua script for atomicity
ZADD ratelimit:user:1 1678700000 "1678700000-abc"    # Score = timestamp, member = unique ID
ZREMRANGEBYSCORE ratelimit:user:1 0 1678699940        # Remove entries older than window
ZCARD ratelimit:user:1                                 # Count entries in window
```

```typescript
private readonly slidingWindowScript = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local member = ARGV[4]

  local windowStart = now - window * 1000

  -- Remove expired entries
  redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

  -- Count current requests
  local count = redis.call('ZCARD', key)

  if count < limit then
    redis.call('ZADD', key, now, member)
    redis.call('PEXPIRE', key, window * 1000)
    return 1
  end
  return 0
`;

async slidingWindowLog(userId: string, limit: number, windowSec: number): Promise<boolean> {
  const now = Date.now();
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;

  const result = await this.redis.eval(
    this.slidingWindowScript, 1,
    `ratelimit:sw:${userId}`,
    now, windowSec, limit, member,
  );

  return result === 1;
}
```

**Pros:** No boundary problem, exact count.
**Cons:** O(N) memory per user (stores every request timestamp).

---

#### 3. Sliding Window Counter

Hybrid approach: uses two fixed windows weighted by time position. Good balance of accuracy and memory.

```typescript
async slidingWindowCounter(
  userId: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const currentWindow = Math.floor(now / windowSec);
  const previousWindow = currentWindow - 1;
  const elapsed = (now % windowSec) / windowSec; // Position within current window (0-1)

  const [prevCount, currCount] = await Promise.all([
    this.redis.get(`ratelimit:sc:${userId}:${previousWindow}`),
    this.redis.incr(`ratelimit:sc:${userId}:${currentWindow}`),
  ]);

  // Set TTL on current window key
  if (currCount === 1) {
    await this.redis.expire(`ratelimit:sc:${userId}:${currentWindow}`, windowSec * 2);
  }

  // Weighted count: previous window's remaining weight + current window's count
  const weightedCount = (parseInt(prevCount || '0', 10) * (1 - elapsed)) + currCount;

  return weightedCount <= limit;
}
```

---

#### 4. Token Bucket

Tokens are added at a fixed rate. Each request consumes a token. Allows bursts up to bucket capacity.

```typescript
private readonly tokenBucketScript = `
  local key = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local refillRate = tonumber(ARGV[2])  -- tokens per second
  local now = tonumber(ARGV[3])
  local requested = tonumber(ARGV[4])

  local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
  local tokens = tonumber(bucket[1]) or capacity
  local lastRefill = tonumber(bucket[2]) or now

  -- Calculate tokens to add since last refill
  local elapsed = math.max(0, now - lastRefill)
  tokens = math.min(capacity, tokens + elapsed * refillRate)

  if tokens >= requested then
    tokens = tokens - requested
    redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
    redis.call('EXPIRE', key, math.ceil(capacity / refillRate) * 2)
    return 1
  else
    redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
    redis.call('EXPIRE', key, math.ceil(capacity / refillRate) * 2)
    return 0
  end
`;

async tokenBucket(
  userId: string,
  capacity: number,
  refillRate: number,
  requested: number = 1,
): Promise<boolean> {
  const result = await this.redis.eval(
    this.tokenBucketScript, 1,
    `ratelimit:tb:${userId}`,
    capacity, refillRate, Date.now() / 1000, requested,
  );
  return result === 1;
}
```

---

#### 5. Leaky Bucket

Requests enter a bucket and are processed at a fixed rate. Excess requests are dropped. Smooths out bursts.

```typescript
private readonly leakyBucketScript = `
  local key = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local leakRate = tonumber(ARGV[2])  -- requests drained per second
  local now = tonumber(ARGV[3])

  local bucket = redis.call('HMGET', key, 'water', 'lastLeak')
  local water = tonumber(bucket[1]) or 0
  local lastLeak = tonumber(bucket[2]) or now

  -- Drain water since last check
  local elapsed = math.max(0, now - lastLeak)
  water = math.max(0, water - elapsed * leakRate)

  if water < capacity then
    water = water + 1
    redis.call('HMSET', key, 'water', water, 'lastLeak', now)
    redis.call('EXPIRE', key, math.ceil(capacity / leakRate) * 2)
    return 1
  else
    redis.call('HMSET', key, 'water', water, 'lastLeak', now)
    return 0
  end
`;
```

---

### Rate Limiting Algorithms Comparison

| Algorithm | Accuracy | Memory | Burst Handling | Complexity |
|-----------|----------|--------|----------------|------------|
| Fixed Window | Low (boundary issue) | O(1) per user | Double burst at boundary | Simple |
| Sliding Window Log | Exact | O(N) per user | Smooth | Moderate |
| Sliding Window Counter | Good approximation | O(1) per user | Mostly smooth | Moderate |
| Token Bucket | Good | O(1) per user | Allows controlled bursts | Moderate |
| Leaky Bucket | Good | O(1) per user | Smooths bursts (constant rate) | Moderate |

### Q10.2: NestJS Rate Limiting Middleware

```typescript
// rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';

export const RateLimit = (limit: number, windowSec: number) =>
  SetMetadata('rateLimit', { limit, windowSec });

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly slidingWindowScript = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local windowStart = now - window

    redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
    local count = redis.call('ZCARD', key)

    if count < limit then
      redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
      redis.call('EXPIRE', key, window + 1)
      return {1, limit - count - 1, 0}
    end

    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retryAfter = oldest[2] and (tonumber(oldest[2]) + window - now) or window
    return {0, 0, math.ceil(retryAfter)}
  `;

  constructor(
    private readonly redis: Redis,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get('rateLimit', context.getHandler());
    if (!config) return true;

    const request = context.switchToHttp().getRequest();
    const identifier = request.user?.id || request.ip;
    const key = `ratelimit:${context.getHandler().name}:${identifier}`;

    const [allowed, remaining, retryAfter] = (await this.redis.eval(
      this.slidingWindowScript, 1,
      key,
      Math.floor(Date.now() / 1000),
      config.windowSec,
      config.limit,
    )) as number[];

    const response = context.switchToHttp().getResponse();
    response.header('X-RateLimit-Limit', config.limit);
    response.header('X-RateLimit-Remaining', Math.max(0, remaining));

    if (!allowed) {
      response.header('Retry-After', retryAfter);
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}

// Usage in controller
@Controller('api')
@UseGuards(RateLimitGuard)
export class ApiController {
  @Get('search')
  @RateLimit(30, 60) // 30 requests per 60 seconds
  async search(@Query('q') query: string) {
    // ...
  }

  @Post('orders')
  @RateLimit(5, 60) // 5 orders per minute
  async createOrder(@Body() dto: CreateOrderDto) {
    // ...
  }
}
```

---

## Q11: Redis Session Management

### Q11.1: Why use Redis for session storage and how do you implement it?

**Answer:**

**Why Redis for sessions:**
1. **Speed** -- sub-millisecond reads for every authenticated request
2. **TTL** -- sessions expire automatically (no cleanup jobs)
3. **Shared state** -- all app instances read from the same Redis, enabling horizontal scaling
4. **Atomic operations** -- update session data without race conditions

### Session vs JWT Comparison

| Aspect | Server Sessions (Redis) | JWT |
|--------|------------------------|-----|
| Storage | Server-side (Redis) | Client-side (cookie/header) |
| Size per request | Session ID (small cookie) | Full token (can be large) |
| Revocation | Instant (delete from Redis) | Hard (need blocklist or short expiry) |
| Scalability | Requires shared store (Redis) | Stateless (no shared store needed) |
| Security | Session ID can be stolen (use httpOnly) | Token can be stolen (same) |
| Data freshness | Always current (read from Redis) | Stale until token refresh |
| Cross-service | Need shared Redis or session service | Self-contained, easy to verify |

### Q11.2: NestJS Session Configuration with Redis

```typescript
// session.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import * as session from 'express-session';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';

@Module({})
export class SessionModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: 'sess:',
      // Reconnect strategy
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    consumer
      .apply(
        session({
          store: new RedisStore({ client: redisClient }),
          secret: process.env.SESSION_SECRET,
          resave: false,              // Don't save session if unmodified
          saveUninitialized: false,   // Don't create session until something stored
          rolling: true,              // Reset TTL on every response
          cookie: {
            httpOnly: true,           // Prevents client-side JS access
            secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
            sameSite: 'strict',       // CSRF protection
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
          },
        }),
      )
      .forRoutes('*');
  }
}

// auth.controller.ts
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Req() req: Request, @Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);

    // Store user data in session (stored in Redis as sess:<sessionId>)
    req.session.userId = user.id;
    req.session.role = user.role;

    return { message: 'Logged in' };
  }

  @Post('logout')
  async logout(@Req() req: Request) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) reject(err);
        resolve({ message: 'Logged out' });
      });
    });
  }
}

// session.guard.ts
@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return !!request.session?.userId;
  }
}
```

**Session data in Redis:**
```bash
# What's stored in Redis:
GET sess:abc123def456
# → {"cookie":{"originalMaxAge":86400000,"httpOnly":true,"secure":true,"sameSite":"strict"},
#    "userId":"user-1","role":"admin"}

TTL sess:abc123def456
# → 86400 (resets on each request because rolling: true)
```

**Scaling sessions with Redis Cluster:** Use hash tags in the session key prefix so all session operations for a user go to the same node. Most session stores handle this automatically since each session is a single key.

---

## Q12: Redis Memory Management & Optimization

### Q12.1: Explain Redis eviction policies and how to choose the right one.

**Answer:**

When Redis reaches `maxmemory`, it must decide what to evict. The policy is set via `maxmemory-policy`.

| Policy | Scope | Algorithm | Use Case |
|--------|-------|-----------|----------|
| `noeviction` | -- | Reject writes (return error) | When data loss is unacceptable |
| `allkeys-lru` | All keys | Least Recently Used | General-purpose cache |
| `allkeys-lfu` | All keys | Least Frequently Used | Cache with varying popularity |
| `allkeys-random` | All keys | Random | When access pattern is uniform |
| `volatile-lru` | Keys with TTL | LRU among expiring keys | Mixed: cache + persistent data |
| `volatile-lfu` | Keys with TTL | LFU among expiring keys | Mixed with frequency-based eviction |
| `volatile-random` | Keys with TTL | Random among expiring keys | Mixed workloads, simple |
| `volatile-ttl` | Keys with TTL | Shortest TTL first | Evict soonest-to-expire first |

**Decision guide:**
- **Pure cache (all keys are expendable):** `allkeys-lru` or `allkeys-lfu`
- **Cache + important keys (some keys must persist):** Set TTL on cache keys, use `volatile-lru` -- keys without TTL are never evicted
- **Frequency matters (some items are much hotter):** `allkeys-lfu` (Redis 4.0+)
- **Not a cache (queue, session store):** `noeviction` -- better to get errors than silently lose data

```bash
# redis.conf
maxmemory 4gb
maxmemory-policy allkeys-lfu

# Check current memory
redis-cli INFO memory
# used_memory_human: 3.2G
# maxmemory_human: 4G
# mem_fragmentation_ratio: 1.05  (< 1.5 is healthy)
```

### Q12.2: What are the key memory optimization techniques?

**Answer:**

#### 1. Use Hashes for Small Objects (Ziplist Encoding)

Instead of separate keys, group small values into hashes. When a hash is small, Redis uses a ziplist (compact sequential memory).

```bash
# Bad: 1000 separate keys (each key has ~70 bytes overhead)
SET user:1:name "Alice"
SET user:1:email "alice@example.com"
SET user:1:role "admin"
# Memory: ~3 * (70 + key_len + value_len) = ~300 bytes for 3 fields

# Good: 1 hash (ziplist encoding for small hashes)
HSET user:1 name "Alice" email "alice@example.com" role "admin"
# Memory: ~70 + hash_overhead ≈ ~150 bytes for 3 fields (saves ~50%)

# Check encoding:
OBJECT ENCODING user:1
# → "ziplist" (compact) or "hashtable" (converted when too many/large fields)
```

```bash
# Tune ziplist thresholds (redis.conf)
hash-max-ziplist-entries 128    # Max fields before converting to hashtable
hash-max-ziplist-value 64       # Max field/value size in bytes before converting
```

#### 2. Short Key Names for High-Volume Data

```bash
# Instead of:
SET user:1234567890:last_login_timestamp "2026-03-13T10:00:00Z"

# Use:
SET u:1234567890:llt "2026-03-13T10:00:00Z"
# Saves ~30 bytes per key. At 10M keys = ~300MB saved
```

#### 3. Find and Fix Large Keys

```bash
# Scan for biggest keys
redis-cli --bigkeys
# Output: biggest key of each type

# Check specific key memory usage
MEMORY USAGE user:1             # → 120 (bytes)
MEMORY USAGE big:hash:key       # → 15728640 (15MB!)

# Memory diagnostics
MEMORY DOCTOR
# → "Sam, I have a few things to report..."
```

#### 4. Use Appropriate Data Structures

```bash
# Bad: Storing booleans as strings
SET feature:dark_mode:user:1 "true"        # ~80 bytes per user

# Good: Use bitmaps (1 bit per user)
SETBIT feature:dark_mode 1 1               # 1 bit per user!
# 1M users = ~122 KB vs ~80 MB with strings

# Bad: Storing unique counts with sets
SADD unique_visitors "user:1" "user:2"...  # O(N) memory

# Good: HyperLogLog for approximate counts
PFADD unique_visitors "user:1" "user:2"... # Fixed 12 KB
```

#### 5. Compression for Large Values

```typescript
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

async setCompressed(key: string, value: any, ttl: number): Promise<void> {
  const json = JSON.stringify(value);
  if (json.length > 1024) { // Only compress if > 1KB
    const compressed = await gzip(Buffer.from(json));
    await this.redis.setex(`z:${key}`, ttl, compressed.toString('base64'));
  } else {
    await this.redis.setex(key, ttl, json);
  }
}

async getCompressed(key: string): Promise<any> {
  // Try compressed first
  let data = await this.redis.get(`z:${key}`);
  if (data) {
    const decompressed = await gunzip(Buffer.from(data, 'base64'));
    return JSON.parse(decompressed.toString());
  }
  data = await this.redis.get(key);
  return data ? JSON.parse(data) : null;
}
```

---

## Q13: Redis with Node.js/NestJS

### Q13.1: What Redis client library do you recommend and why?

**Answer:**

**ioredis** is the recommended client for production Node.js/NestJS applications.

| Feature | ioredis | node-redis (v4) |
|---------|---------|------------------|
| Cluster support | Excellent (auto-discovery, MOVED/ASK handling) | Good |
| Sentinel support | Yes | Yes |
| Pipelining | Automatic + manual | Manual |
| Lua scripting | `defineCommand` helper | `scripts` option |
| TypeScript | Good typings | Native TS |
| Reconnection | Configurable strategy | Configurable |
| Streams support | Full | Full |
| Community | Larger, more battle-tested | Official Redis client |

### Q13.2: Show a complete Redis module for NestJS with ioredis.

**Answer:**

```typescript
// redis.module.ts
import { Module, Global, DynamicModule } from '@nestjs/common';
import Redis, { RedisOptions, Cluster } from 'ioredis';

export interface RedisModuleOptions {
  type: 'single' | 'cluster' | 'sentinel';
  options: RedisOptions;
  clusterNodes?: { host: string; port: number }[];
  sentinelOptions?: {
    sentinels: { host: string; port: number }[];
    name: string; // master name
  };
}

@Global()
@Module({})
export class RedisModule {
  static forRoot(config: RedisModuleOptions): DynamicModule {
    const redisProvider = {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        let client: Redis | Cluster;

        switch (config.type) {
          case 'cluster':
            client = new Redis.Cluster(config.clusterNodes!, {
              redisOptions: config.options,
              scaleReads: 'slave', // Read from replicas
              enableReadyCheck: true,
              maxRedirections: 16,
              retryDelayOnClusterDown: 300,
            });
            break;

          case 'sentinel':
            client = new Redis({
              ...config.options,
              sentinels: config.sentinelOptions!.sentinels,
              name: config.sentinelOptions!.name,
              sentinelRetryStrategy: (times) => Math.min(times * 50, 2000),
            });
            break;

          default:
            client = new Redis({
              ...config.options,
              retryStrategy: (times) => Math.min(times * 50, 2000),
              maxRetriesPerRequest: 3,
              enableReadyCheck: true,
              lazyConnect: false,
            });
        }

        client.on('connect', () => console.log('Redis connected'));
        client.on('error', (err) => console.error('Redis error:', err.message));
        client.on('close', () => console.warn('Redis connection closed'));

        return client;
      },
    };

    return {
      module: RedisModule,
      providers: [redisProvider],
      exports: ['REDIS_CLIENT'],
    };
  }
}

// redis.service.ts - Wrapper with common patterns
import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  // Basic cache operations
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(...keys: string[]): Promise<number> {
    return this.redis.del(...keys);
  }

  // Cache-aside helper
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  // Pipeline for batch operations
  async pipeline(commands: [string, ...any[]][]): Promise<any[]> {
    const pipeline = this.redis.pipeline();
    for (const [cmd, ...args] of commands) {
      (pipeline as any)[cmd](...args);
    }
    const results = await pipeline.exec();
    return results!.map(([err, result]) => {
      if (err) throw err;
      return result;
    });
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

// app.module.ts - Usage
@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: 0,
      },
    }),
  ],
})
export class AppModule {}
```

### Q13.3: Explain Redis pipelining and when to use it.

**Answer:**

Pipelining sends multiple commands without waiting for individual responses, dramatically reducing round-trip latency.

```
Without pipelining (6 round trips):
  Client → SET a 1 → Server → OK → Client
  Client → SET b 2 → Server → OK → Client
  Client → SET c 3 → Server → OK → Client
  Total: 6 network round trips, ~6ms at 1ms RTT

With pipelining (1 round trip):
  Client → [SET a 1, SET b 2, SET c 3] → Server → [OK, OK, OK] → Client
  Total: 1 network round trip, ~1ms at 1ms RTT
```

```typescript
// ioredis automatic pipelining (enabled by default)
// Commands sent in the same event loop tick are auto-pipelined

// Manual pipeline for explicit batching
async batchUpdateScores(scores: { userId: string; score: number }[]): Promise<void> {
  const pipeline = this.redis.pipeline();

  for (const { userId, score } of scores) {
    pipeline.zadd('leaderboard', score, userId);
    pipeline.hset(`user:${userId}`, 'lastScore', score.toString());
  }

  await pipeline.exec();
  // All commands sent in a single round trip
}

// Pipeline vs MULTI/EXEC:
// - Pipeline: batch commands for performance (no atomicity guarantee)
// - MULTI/EXEC: atomic execution (commands from other clients can't interleave)
// - You can combine both: MULTI inside a pipeline
```

### Q13.4: Error handling and reconnection strategies.

**Answer:**

```typescript
const redis = new Redis({
  host: 'localhost',
  port: 6379,

  // Reconnection strategy
  retryStrategy: (times: number) => {
    if (times > 10) {
      // Stop retrying after 10 attempts
      console.error('Redis: max retries reached, giving up');
      return null; // Stop retrying
    }
    return Math.min(times * 200, 5000); // Exponential backoff, max 5 seconds
  },

  // Per-request retry
  maxRetriesPerRequest: 3,

  // Connection timeout
  connectTimeout: 10000, // 10 seconds

  // Auto-reconnect (default: true)
  reconnectOnError: (err) => {
    // Reconnect on specific errors
    return err.message.includes('READONLY');
  },

  // Enable ready check (PING on connect)
  enableReadyCheck: true,
});

// Graceful degradation pattern
@Injectable()
export class ResilientCacheService {
  constructor(private readonly redis: Redis) {}

  async getWithFallback<T>(key: string, fallback: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      // Redis is down - log but don't crash
      console.warn(`Redis unavailable, falling back to source: ${err.message}`);
    }

    // Cache miss or Redis error - use fallback
    const value = await fallback();

    // Try to cache, but don't fail if Redis is down
    try {
      await this.redis.setex(key, 3600, JSON.stringify(value));
    } catch {
      // Silently fail - we already have the value
    }

    return value;
  }
}
```

---

## Q14: Redis Design Patterns for Common Problems

### Q14.1: Leaderboard with Sorted Sets

```typescript
@Injectable()
export class LeaderboardService {
  constructor(private readonly redis: Redis) {}

  async addScore(leaderboard: string, userId: string, score: number): Promise<void> {
    await this.redis.zadd(leaderboard, score, userId);
  }

  async incrementScore(leaderboard: string, userId: string, delta: number): Promise<number> {
    return this.redis.zincrby(leaderboard, delta, userId);
  }

  async getTopN(leaderboard: string, n: number): Promise<{ userId: string; score: number; rank: number }[]> {
    const results = await this.redis.zrevrange(leaderboard, 0, n - 1, 'WITHSCORES');

    const entries = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
        rank: i / 2 + 1,
      });
    }
    return entries;
  }

  async getUserRank(leaderboard: string, userId: string): Promise<{ rank: number; score: number } | null> {
    const [rank, score] = await Promise.all([
      this.redis.zrevrank(leaderboard, userId),
      this.redis.zscore(leaderboard, userId),
    ]);

    if (rank === null) return null;
    return { rank: rank + 1, score: parseFloat(score!) };
  }

  async getAroundUser(leaderboard: string, userId: string, range: number = 5): Promise<any[]> {
    const rank = await this.redis.zrevrank(leaderboard, userId);
    if (rank === null) return [];

    const start = Math.max(0, rank - range);
    const end = rank + range;

    return this.redis.zrevrange(leaderboard, start, end, 'WITHSCORES');
  }
}
```

### Q14.2: Job Queue with Lists (Simple) and Streams (Advanced)

```typescript
// Simple queue with Lists
@Injectable()
export class SimpleJobQueue {
  constructor(private readonly redis: Redis) {}

  async enqueue(queue: string, job: any): Promise<void> {
    await this.redis.rpush(queue, JSON.stringify(job));
  }

  async dequeue(queue: string, timeoutSec: number = 0): Promise<any | null> {
    // BRPOP blocks until a job is available (or timeout)
    const result = await this.redis.brpop(queue, timeoutSec);
    if (!result) return null;
    return JSON.parse(result[1]);
  }

  async length(queue: string): Promise<number> {
    return this.redis.llen(queue);
  }
}

// Reliable queue: move to processing list (prevents loss on crash)
async dequeueReliable(source: string, processing: string): Promise<any | null> {
  // Atomically move from source to processing list
  const job = await this.redis.rpoplpush(source, processing);
  if (!job) return null;
  return JSON.parse(job);
}

async acknowledge(processing: string, job: string): Promise<void> {
  await this.redis.lrem(processing, 1, job);
}
```

### Q14.3: Real-Time Analytics with HyperLogLog + Bitmaps

```typescript
@Injectable()
export class AnalyticsService {
  constructor(private readonly redis: Redis) {}

  async trackPageView(page: string, userId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10); // "2026-03-13"

    const pipeline = this.redis.pipeline();

    // Total page views (counter)
    pipeline.incr(`pv:${page}:${today}`);

    // Unique visitors (HyperLogLog -- approximate, 12 KB)
    pipeline.pfadd(`uv:${page}:${today}`, userId);

    // Daily active users (Bitmap -- 1 bit per user ID)
    const userIdNum = parseInt(userId.replace('user:', ''), 10);
    pipeline.setbit(`dau:${today}`, userIdNum, 1);

    // Set TTL (7 days)
    pipeline.expire(`pv:${page}:${today}`, 604800);
    pipeline.expire(`uv:${page}:${today}`, 604800);
    pipeline.expire(`dau:${today}`, 604800);

    await pipeline.exec();
  }

  async getStats(page: string, date: string): Promise<{
    totalViews: number;
    uniqueVisitors: number;
    dailyActiveUsers: number;
  }> {
    const [totalViews, uniqueVisitors, dailyActiveUsers] = await Promise.all([
      this.redis.get(`pv:${page}:${date}`),
      this.redis.pfcount(`uv:${page}:${date}`),
      this.redis.bitcount(`dau:${date}`),
    ]);

    return {
      totalViews: parseInt(totalViews || '0', 10),
      uniqueVisitors: uniqueVisitors,
      dailyActiveUsers: dailyActiveUsers,
    };
  }

  async getWeeklyUniqueVisitors(page: string): Promise<number> {
    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      keys.push(`uv:${page}:${date}`);
    }

    // Merge HyperLogLogs for weekly count
    await this.redis.pfmerge(`uv:${page}:weekly`, ...keys);
    return this.redis.pfcount(`uv:${page}:weekly`);
  }
}
```

### Q14.4: Feature Flags with Hashes

```typescript
@Injectable()
export class FeatureFlagService {
  private readonly key = 'feature_flags';

  constructor(private readonly redis: Redis) {}

  async setFlag(feature: string, enabled: boolean, percentage?: number): Promise<void> {
    const value = JSON.stringify({ enabled, percentage: percentage || 100 });
    await this.redis.hset(this.key, feature, value);
  }

  async isEnabled(feature: string, userId?: string): Promise<boolean> {
    const raw = await this.redis.hget(this.key, feature);
    if (!raw) return false;

    const { enabled, percentage } = JSON.parse(raw);
    if (!enabled) return false;
    if (percentage >= 100) return true;

    if (userId) {
      // Deterministic rollout based on user ID hash
      const hash = this.simpleHash(userId + feature);
      return (hash % 100) < percentage;
    }

    return Math.random() * 100 < percentage;
  }

  async getAllFlags(): Promise<Record<string, any>> {
    const all = await this.redis.hgetall(this.key);
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(all)) {
      result[key] = JSON.parse(value);
    }
    return result;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}
```

### Q14.5: Distributed Counter with INCR

```typescript
@Injectable()
export class DistributedCounterService {
  constructor(private readonly redis: Redis) {}

  // Simple atomic counter
  async increment(key: string, by: number = 1): Promise<number> {
    return this.redis.incrby(key, by);
  }

  // Counter with ceiling (Lua for atomicity)
  private readonly incrWithCeilingScript = `
    local key = KEYS[1]
    local increment = tonumber(ARGV[1])
    local ceiling = tonumber(ARGV[2])
    local current = tonumber(redis.call('GET', key) or '0')

    if current + increment > ceiling then
      return -1
    end

    return redis.call('INCRBY', key, increment)
  `;

  async incrementWithCeiling(key: string, increment: number, ceiling: number): Promise<number> {
    const result = await this.redis.eval(this.incrWithCeilingScript, 1, key, increment, ceiling);
    if (result === -1) throw new Error('Ceiling reached');
    return result as number;
  }

  // Time-windowed counter (e.g., daily signups)
  async incrementDaily(metric: string): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const key = `counter:${metric}:${today}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 172800); // 48 hours
    }
    return count;
  }
}
```

---

## Quick Reference

### Redis Commands Cheat Sheet

```bash
# ── Strings ──
SET key value [EX seconds] [NX|XX]    GET key
MSET k1 v1 k2 v2                      MGET k1 k2
INCR key    INCRBY key n               DECR key    DECRBY key n
SETNX key value                        SETEX key seconds value
APPEND key value                       STRLEN key

# ── Lists ──
LPUSH key v1 v2        RPUSH key v1 v2
LPOP key               RPOP key
BRPOP key timeout      BLPOP key timeout    # Blocking
LRANGE key start stop  LLEN key
LINDEX key index       LTRIM key start stop
RPOPLPUSH src dst

# ── Sets ──
SADD key m1 m2         SREM key m1
SMEMBERS key           SISMEMBER key member
SCARD key              SRANDMEMBER key [count]
SINTER k1 k2          SUNION k1 k2          SDIFF k1 k2

# ── Sorted Sets ──
ZADD key score member  ZREM key member
ZRANGE key start stop [WITHSCORES]     ZREVRANGE key start stop [WITHSCORES]
ZRANGEBYSCORE key min max              ZRANK key member    ZREVRANK key member
ZINCRBY key increment member           ZCARD key
ZCOUNT key min max                     ZSCORE key member

# ── Hashes ──
HSET key f1 v1 f2 v2  HGET key field
HGETALL key            HMGET key f1 f2
HDEL key field         HEXISTS key field
HINCRBY key field n    HKEYS key    HVALS key    HLEN key

# ── Bitmaps ──
SETBIT key offset 1    GETBIT key offset
BITCOUNT key           BITOP AND|OR|XOR|NOT destkey k1 k2

# ── HyperLogLog ──
PFADD key elem1 elem2  PFCOUNT key    PFMERGE dest k1 k2

# ── Streams ──
XADD stream * field value             XLEN stream
XRANGE stream start end [COUNT n]     XREVRANGE stream end start
XREAD COUNT n BLOCK ms STREAMS s1 id  XTRIM stream MAXLEN ~ n
XGROUP CREATE stream group id         XREADGROUP GROUP g consumer ...
XACK stream group id                  XPENDING stream group
XCLAIM stream group consumer min-idle id
XAUTOCLAIM stream group consumer min-idle start

# ── Keys & Server ──
DEL key1 key2          EXISTS key
EXPIRE key seconds     TTL key    PTTL key
KEYS pattern           SCAN cursor [MATCH pattern] [COUNT n]
TYPE key               OBJECT ENCODING key
INFO [section]         MEMORY USAGE key
DBSIZE                 FLUSHDB    FLUSHALL
```

### Data Structure Selection Guide

```
Need to store...
├── Simple value / JSON blob ────────── String (SET/GET)
├── Object with fields ─────────────── Hash (memory-efficient for small objects)
├── Ordered collection ──────────────── List (insertion order) or Sorted Set (by score)
├── Unique items ────────────────────── Set (unordered) or Sorted Set (ordered)
├── Ranking / priority ──────────────── Sorted Set (ZADD with scores)
├── Boolean flags per user ──────────── Bitmap (1 bit per user)
├── Approximate unique count ────────── HyperLogLog (12 KB fixed)
├── Event log with replay ──────────── Stream (consumer groups)
└── Counter ─────────────────────────── String (INCR/DECR)
```

### Eviction Policy Decision Tree

```
Is all data expendable (pure cache)?
├── Yes → Do items have different popularity?
│         ├── Yes → allkeys-lfu
│         └── No  → allkeys-lru
└── No  → Do you have a mix of cache + persistent data?
          ├── Yes → Are cache keys set with TTL?
          │         ├── Yes → volatile-lru or volatile-lfu
          │         └── No  → volatile-ttl
          └── No  → noeviction (fail on writes when full)
```

### Performance Tips

1. **Use pipelining** -- batch commands to reduce round trips (10x+ throughput improvement)
2. **Avoid large keys** -- a single 10MB value blocks the event loop; break into chunks
3. **Use SCAN instead of KEYS** -- KEYS blocks the server (O(N)); SCAN iterates incrementally
4. **Set TTLs on everything** -- prevent memory leaks, add jitter to avoid thundering herd
5. **Monitor slow queries** -- `SLOWLOG GET 10` to find commands taking > 10ms
6. **Use hash tags in Cluster** -- `{user:1}:profile` to co-locate related keys
7. **Compress large values** -- gzip values > 1KB before storing
8. **Prefer UNLINK over DEL** -- UNLINK is non-blocking (async free in background thread)
9. **Use Lua for atomic multi-step** -- avoid WATCH/MULTI race conditions
10. **Connection pooling** -- ioredis handles this, but ensure maxRetriesPerRequest is set

### Common Interview Questions Checklist

- [ ] What is Redis and why is it fast?
- [ ] Name all Redis data structures and their use cases.
- [ ] Explain cache-aside vs write-through vs write-behind patterns.
- [ ] What is cache stampede and how do you prevent it?
- [ ] How do you implement a distributed lock with Redis?
- [ ] What is the Redlock algorithm? What are its criticisms?
- [ ] Compare Redis Pub/Sub vs Streams vs Kafka.
- [ ] How do Redis transactions (MULTI/EXEC) differ from SQL transactions?
- [ ] When would you use Lua scripting in Redis?
- [ ] Explain RDB vs AOF persistence.
- [ ] How does Redis Cluster sharding work (hash slots)?
- [ ] What is the difference between Redis Sentinel and Redis Cluster?
- [ ] Implement a rate limiter with Redis (sliding window).
- [ ] How do you handle Redis memory pressure? Explain eviction policies.
- [ ] How would you design a leaderboard with Redis?
- [ ] How do you handle Redis connection failures gracefully?
- [ ] What is the difference between DEL and UNLINK?
- [ ] How would you count unique visitors efficiently?
- [ ] Explain Redis Streams consumer groups and acknowledgment.
- [ ] How do you optimize Redis memory usage?
