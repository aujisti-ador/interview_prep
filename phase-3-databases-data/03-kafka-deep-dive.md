# Apache Kafka Deep Dive - Interview Q&A

## Table of Contents
1. [What is Kafka & Core Concepts](#q1-what-is-kafka--core-concepts)
2. [Topics & Partitions](#q2-topics--partitions)
3. [Producers Deep Dive](#q3-producers-deep-dive)
4. [Consumers & Consumer Groups](#q4-consumers--consumer-groups)
5. [Exactly-Once Semantics](#q5-exactly-once-semantics-eos)
6. [Kafka Streams & KSQL](#q6-kafka-streams--ksql)
7. [Kafka Connect](#q7-kafka-connect)
8. [Kafka Security](#q8-kafka-security)
9. [Kafka Performance Tuning](#q9-kafka-performance-tuning)
10. [Kafka in Microservices Architecture](#q10-kafka-in-microservices-architecture)
11. [Kafka with NestJS](#q11-kafka-with-nestjs)
12. [Kafka Operations & Troubleshooting](#q12-kafka-operations--troubleshooting)
13. [Kafka Design Interview Questions](#q13-kafka-design-interview-questions)
14. [Quick Reference](#quick-reference)

---

## Q1: What is Kafka & Core Concepts

### Q1.1: What is Apache Kafka and why does it exist?

**Answer:**
Apache Kafka is a distributed event streaming platform originally developed at LinkedIn and open-sourced through the Apache Software Foundation. It is designed for high-throughput, fault-tolerant, and durable handling of real-time data feeds.

Unlike traditional message brokers that delete messages once consumed, Kafka stores messages in an **immutable, append-only log** with configurable retention. This fundamentally changes how you can think about data flow in distributed systems.

**Core Properties:**
- **Distributed:** Runs as a cluster of brokers across multiple servers
- **Fault-tolerant:** Data is replicated across brokers; survives node failures
- **Horizontally scalable:** Add more brokers or partitions to increase throughput
- **Durable:** Messages are persisted to disk with configurable retention
- **High-throughput:** Handles millions of messages per second through batching, zero-copy, sequential I/O
- **Pull-based:** Consumers pull messages at their own pace (unlike push-based systems like RabbitMQ)

### Q1.2: Explain Kafka's core components and how they fit together.

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KAFKA CLUSTER                                │
│                                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│  │  Broker 1    │   │  Broker 2    │   │  Broker 3    │              │
│  │             │   │             │   │             │              │
│  │ Topic-A P0  │   │ Topic-A P1  │   │ Topic-A P2  │              │
│  │ (Leader)    │   │ (Leader)    │   │ (Leader)    │              │
│  │ Topic-A P1  │   │ Topic-A P2  │   │ Topic-A P0  │              │
│  │ (Follower)  │   │ (Follower)  │   │ (Follower)  │              │
│  └──────▲──────┘   └──────▲──────┘   └──────▲──────┘              │
│         │                 │                 │                      │
│         └────────────┬────┴─────────────────┘                      │
│                      │                                              │
│              ┌───────┴────────┐                                     │
│              │  KRaft / ZK    │                                     │
│              │  (Metadata)    │                                     │
│              └────────────────┘                                     │
└──────────────────────▲──────────────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
   ┌──────┴─────┐     │     ┌──────┴──────┐
   │ Producers  │     │     │ Consumers   │
   │            │     │     │ (Group A)   │
   │ App 1 ─────┼─────┘     │ C1 ← P0    │
   │ App 2 ─────┤           │ C2 ← P1    │
   │ App 3 ─────┤           │ C3 ← P2    │
   └────────────┘           └─────────────┘
```

**Core Components:**

| Component | Description |
|-----------|-------------|
| **Broker** | A Kafka server that stores data and serves client requests. A cluster has multiple brokers. |
| **Topic** | A logical category/feed name for messages. Analogous to a database table. |
| **Partition** | A topic is split into partitions. Each partition is an ordered, immutable log. Partitions enable parallelism. |
| **Producer** | Client application that publishes (writes) messages to topics. |
| **Consumer** | Client application that subscribes to and reads messages from topics. |
| **Consumer Group** | A set of consumers that cooperatively consume a topic. Each partition is assigned to exactly one consumer in the group. |
| **Offset** | A sequential ID for each message within a partition. Consumers track their position via offsets. |
| **Replica** | A copy of a partition on another broker for fault tolerance. One replica is the leader, others are followers. |
| **ZooKeeper/KRaft** | Metadata management: broker registration, topic config, leader election. KRaft replaces ZooKeeper in newer versions. |

### Q1.3: How is Kafka different from traditional message queues? Compare Kafka vs RabbitMQ vs Redis Pub/Sub.

**Answer:**

The fundamental difference is that Kafka is a **distributed log**, not a message queue. Traditional queues delete messages after consumption; Kafka retains them.

| Feature | Kafka | RabbitMQ | Redis Pub/Sub |
|---------|-------|----------|---------------|
| **Model** | Distributed log (pull) | Message queue/broker (push) | Pub/Sub (push) |
| **Message Retention** | Configurable (days/forever) | Deleted after ack | No retention (fire & forget) |
| **Ordering** | Per-partition ordering | Per-queue ordering | No ordering guarantee |
| **Throughput** | Millions msg/sec | Tens of thousands msg/sec | Hundreds of thousands msg/sec |
| **Consumer Model** | Pull-based | Push-based (with prefetch) | Push-based |
| **Replay** | Yes (seek to any offset) | No (once consumed, gone) | No |
| **Delivery Guarantee** | At-least-once, exactly-once | At-least-once, at-most-once | At-most-once |
| **Routing** | Topic + partition key | Exchanges, bindings, routing keys | Channel pattern matching |
| **Protocol** | Custom TCP protocol | AMQP 0-9-1 | Redis protocol |
| **Message Priority** | No (offset-based ordering) | Yes (priority queues) | No |
| **Dead Letter** | Manual (DLT topics) | Built-in (DLX) | No |
| **Consumer Groups** | Yes (built-in) | Competing consumers | No |
| **Persistence** | Always (disk-based) | Optional | In-memory only |
| **Scalability** | Horizontal (add brokers/partitions) | Vertical + clustering | Cluster mode |
| **Best For** | Event streaming, CDC, data pipelines | Task queues, RPC, complex routing | Real-time notifications, caching |

**When to Use Kafka:**
- Event streaming and event sourcing
- Log aggregation from many services
- Change Data Capture (CDC)
- Data pipelines (ETL/ELT)
- Microservices event-driven communication
- Real-time analytics feeds
- High-throughput scenarios (>100K msg/sec)
- When you need message replay

**When NOT to Use Kafka:**
- Simple task queues (use RabbitMQ/BullMQ)
- Low-volume applications (<1K msg/sec) -- overhead not justified
- Need for complex routing logic (use RabbitMQ exchanges)
- Need message priority queues
- Request-reply RPC patterns (possible but awkward)
- Small team without Kafka operational expertise

---

## Q2: Topics & Partitions

### Q2.1: Explain Topics and Partitions in Kafka. Why do partitions exist?

**Answer:**

A **topic** is a logical grouping of messages by category -- like `orders`, `payments`, `user-events`. Think of it as a database table.

A **partition** is the physical unit of storage and parallelism within a topic. Each partition is an ordered, immutable, append-only sequence of records. Each record in a partition gets a sequential offset.

```
Topic: "orders" (3 partitions)

  Partition 0: [ 0 | 1 | 2 | 3 | 4 | 5 | 6 ]  → offset 6 is latest
  Partition 1: [ 0 | 1 | 2 | 3 ]                → offset 3 is latest
  Partition 2: [ 0 | 1 | 2 | 3 | 4 ]            → offset 4 is latest
```

**Why partitions exist:**
1. **Parallelism:** Multiple consumers can read different partitions simultaneously
2. **Scalability:** Partitions can be distributed across multiple brokers
3. **Ordering:** Messages within a single partition are strictly ordered
4. **Throughput:** More partitions = higher aggregate throughput

### Q2.2: How are messages distributed across partitions?

**Answer:**

Three strategies:

**1. Key-based partitioning (most common):**
Messages with the same key always go to the same partition. This guarantees ordering for that key.

```typescript
// All events for order "ORD-123" go to the same partition
await producer.send({
  topic: 'order-events',
  messages: [
    { key: 'ORD-123', value: JSON.stringify({ event: 'created', orderId: 'ORD-123' }) },
    { key: 'ORD-123', value: JSON.stringify({ event: 'paid', orderId: 'ORD-123' }) },
    // These two will be in the same partition, in order
  ],
});
```

The default partitioner uses `murmur2(key) % numPartitions`.

**2. Round-robin (no key):**
When no key is provided, messages are distributed evenly across partitions. No ordering guarantee.

```typescript
await producer.send({
  topic: 'logs',
  messages: [
    { value: JSON.stringify({ level: 'info', msg: 'request received' }) },
    // No key → round-robin across partitions
  ],
});
```

**3. Custom partitioner:**

```typescript
import { Kafka, Partitioners } from 'kafkajs';

const kafka = new Kafka({ brokers: ['localhost:9092'] });

const producer = kafka.producer({
  createPartitioner: () => {
    return ({ topic, partitionMetadata, message }) => {
      // Route VIP customers to partition 0 for priority processing
      const payload = JSON.parse(message.value.toString());
      if (payload.customerTier === 'vip') {
        return 0;
      }
      // Default: hash the key
      const numPartitions = partitionMetadata.length;
      const key = message.key;
      if (key) {
        const hash = key.toString().split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        return Math.abs(hash) % numPartitions;
      }
      // No key: round-robin
      return Math.floor(Math.random() * numPartitions);
    };
  },
});
```

### Q2.3: How do you choose the right partition count?

**Answer:**

**Factors to consider:**

| Factor | Impact |
|--------|--------|
| **Target throughput** | More partitions = higher throughput (up to a point) |
| **Consumer parallelism** | Max consumers in a group = number of partitions |
| **Ordering requirements** | Ordering only guaranteed within a partition |
| **Key cardinality** | Low cardinality keys with many partitions = uneven distribution |
| **Broker resources** | Each partition uses memory, file handles, replication overhead |

**Rules of thumb:**
- Start with `max(T/Tp, T/Tc)` where T = target throughput, Tp = throughput per producer partition, Tc = throughput per consumer partition
- For most applications: 6-12 partitions per topic is a good starting point
- Consider future growth (increasing partitions later triggers rebalance and breaks key-based ordering)
- Don't go over ~10K partitions per broker (increases leader election time)
- Each partition adds ~10MB memory overhead on the broker

### Q2.4: Explain replication, ISR, and min.insync.replicas.

**Answer:**

**Replication:**
Every partition has one **leader** and N-1 **follower** replicas. All reads and writes go to the leader. Followers replicate from the leader.

```
Topic: orders, Partition 0, Replication Factor = 3

  Broker 1: Partition 0 (LEADER)     ← Producers write here, consumers read here
  Broker 2: Partition 0 (FOLLOWER)   ← Replicates from leader
  Broker 3: Partition 0 (FOLLOWER)   ← Replicates from leader
```

**ISR (In-Sync Replicas):**
The set of replicas that are fully caught up with the leader. A follower is removed from ISR if it falls behind by more than `replica.lag.time.max.ms` (default 30s).

**min.insync.replicas:**
The minimum number of replicas (including the leader) that must acknowledge a write for it to be considered successful when `acks=all`.

```
replication.factor = 3
min.insync.replicas = 2
acks = all

→ The write succeeds if at least 2 out of 3 replicas acknowledge it.
→ The system tolerates 1 broker failure.
→ If only 1 replica is in ISR, producers get NotEnoughReplicasException.
```

**Common configurations:**

| Config | Durability | Availability | Use Case |
|--------|-----------|--------------|----------|
| RF=3, min.ISR=2, acks=all | High | Tolerates 1 failure | Financial data, orders |
| RF=3, min.ISR=1, acks=all | Medium | Tolerates 2 failures | General purpose |
| RF=2, min.ISR=1, acks=1 | Low | Tolerates 1 failure | Logs, metrics |

**Code example -- creating topics with AdminClient:**

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'admin-client',
  brokers: ['broker1:9092', 'broker2:9092', 'broker3:9092'],
});

const admin = kafka.admin();

async function createTopics(): Promise<void> {
  await admin.connect();

  await admin.createTopics({
    waitForLeaders: true,
    topics: [
      {
        topic: 'order-events',
        numPartitions: 12,
        replicationFactor: 3,
        configEntries: [
          { name: 'retention.ms', value: '604800000' },      // 7 days
          { name: 'min.insync.replicas', value: '2' },
          { name: 'cleanup.policy', value: 'delete' },
        ],
      },
      {
        topic: 'user-profiles',
        numPartitions: 6,
        replicationFactor: 3,
        configEntries: [
          { name: 'cleanup.policy', value: 'compact' },       // Log compaction
          { name: 'min.insync.replicas', value: '2' },
          { name: 'min.compaction.lag.ms', value: '3600000' }, // 1 hour
        ],
      },
    ],
  });

  // List topics
  const topics = await admin.listTopics();
  console.log('Topics:', topics);

  // Describe topic
  const metadata = await admin.fetchTopicMetadata({ topics: ['order-events'] });
  console.log('Partitions:', metadata.topics[0].partitions.length);

  await admin.disconnect();
}
```

---

## Q3: Producers Deep Dive

### Q3.1: Walk through the Kafka producer workflow. What happens when you call `producer.send()`?

**Answer:**

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUCER WORKFLOW                            │
│                                                                  │
│  Application                                                     │
│      │                                                           │
│      ▼                                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐  │
│  │Serializer│───▶│Partitioner│───▶│ Record   │───▶│  Sender   │  │
│  │          │    │          │    │ Batch    │    │  (Network) │  │
│  │ Key →    │    │ Key hash │    │          │    │           │  │
│  │  bytes   │    │ or round │    │ Per-part │    │ acks wait │  │
│  │ Value →  │    │  robin   │    │ batching │    │ + retry   │  │
│  │  bytes   │    │          │    │          │    │           │  │
│  └──────────┘    └──────────┘    └──────────┘    └───────────┘  │
│                                       │                          │
│                                       ▼                          │
│                               linger.ms timer                    │
│                               batch.size check                   │
│                               compression                        │
└─────────────────────────────────────────────────────────────────┘
```

**Step-by-step:**
1. **Serialize:** Key and value are serialized to bytes
2. **Partition:** Determine target partition (by key hash, round-robin, or custom)
3. **Batch:** Message is added to a batch for that partition. The batch is sent when:
   - `batch.size` is reached (default 16KB)
   - `linger.ms` timer expires (default 0ms)
   - Whichever comes first
4. **Compress:** The batch is optionally compressed (gzip, snappy, lz4, zstd)
5. **Send:** Batch is sent to the partition leader broker
6. **Acknowledge:** Broker sends acknowledgment based on `acks` setting
7. **Retry:** If send fails, retry up to `retries` times with `retry.backoff.ms` delay

### Q3.2: Explain the acks setting and its trade-offs.

**Answer:**

| acks | Behavior | Durability | Latency | Use Case |
|------|----------|-----------|---------|----------|
| `0` | Don't wait for any ack | Lowest (messages can be lost) | Lowest | Metrics, logs where loss is acceptable |
| `1` | Wait for leader ack only | Medium (lost if leader fails before replication) | Medium | General purpose |
| `all` / `-1` | Wait for all ISR replicas to ack | Highest (survive broker failures) | Highest | Financial, orders, critical data |

**Important:** `acks=all` only guarantees that `min.insync.replicas` number of replicas acknowledged. If `min.insync.replicas=1`, `acks=all` is effectively the same as `acks=1`.

### Q3.3: Explain batching and compression trade-offs.

**Answer:**

**Batching (`linger.ms` and `batch.size`):**

```
linger.ms = 0 (default):
  → Send immediately when a message is ready
  → Low latency, but lower throughput (many small requests)

linger.ms = 5-100:
  → Wait up to N ms to accumulate more messages in the batch
  → Higher throughput, slightly higher latency
  → Sweet spot for most production systems: 5-20ms

batch.size = 16384 (default, 16KB):
  → Max size of a single batch in bytes
  → Larger batch = better compression, fewer network calls
  → Set based on average message size * expected batch count
```

**Compression comparison:**

| Algorithm | Compression Ratio | CPU Cost | Speed | Best For |
|-----------|------------------|----------|-------|----------|
| `none` | 1x | None | Fastest | CPU-constrained, small messages |
| `gzip` | Best (~70% reduction) | Highest | Slowest | Network-constrained, batch jobs |
| `snappy` | Good (~50% reduction) | Low | Fast | General purpose, balanced |
| `lz4` | Good (~55% reduction) | Lowest | Fastest | Real-time, high throughput |
| `zstd` | Best (~70% reduction) | Medium | Fast | Best overall (Kafka 2.1+) |

**Recommendation:** Use `zstd` for most workloads. Use `lz4` if CPU is a constraint.

### Q3.4: What is an idempotent producer and why does it matter?

**Answer:**

An idempotent producer guarantees that a message is written to a partition **exactly once**, even if the producer retries. Without idempotence, a retry can cause duplicate messages if the first attempt actually succeeded but the ack was lost.

**How it works:**
- Each producer gets a unique **Producer ID (PID)** from the broker
- Each message gets a **sequence number** per partition
- The broker tracks (PID, partition, sequence) and deduplicates

```typescript
const producer = kafka.producer({
  idempotent: true,                    // Enable idempotent producer
  maxInFlightRequests: 5,              // Max 5 with idempotence (was max 1 without)
  // These are automatically set when idempotent=true:
  // acks: -1 (all)
  // retries: MAX_INT
});
```

**Important:** Idempotence only prevents duplicates from producer retries within a single session. It does NOT prevent application-level duplicates (e.g., if your app sends the same message twice intentionally).

### Q3.5: Complete KafkaJS producer example with best practices.

**Answer:**

```typescript
import { Kafka, CompressionTypes, logLevel } from 'kafkajs';

// ── Producer Configuration ──────────────────────────────────────

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['broker1:9092', 'broker2:9092', 'broker3:9092'],
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const producer = kafka.producer({
  idempotent: true,                   // Exactly-once per partition
  maxInFlightRequests: 5,             // Max concurrent requests with idempotence
  transactionTimeout: 30000,          // 30s transaction timeout
});

// ── Connection Management ───────────────────────────────────────

async function initProducer(): Promise<void> {
  await producer.connect();
  console.log('Producer connected');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down producer...');
    await producer.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// ── Sending Messages ────────────────────────────────────────────

interface OrderEvent {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  totalAmount: number;
  timestamp: string;
}

async function publishOrderCreated(order: OrderEvent): Promise<void> {
  const message = {
    key: order.orderId,                // Ensures ordering per order
    value: JSON.stringify({
      eventType: 'ORDER_CREATED',
      payload: order,
      metadata: {
        source: 'order-service',
        version: '1.0',
        correlationId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    }),
    headers: {
      'event-type': 'ORDER_CREATED',
      'content-type': 'application/json',
      'source-service': 'order-service',
    },
  };

  const result = await producer.send({
    topic: 'order-events',
    messages: [message],
    acks: -1,                          // Wait for all ISR
    timeout: 30000,                    // 30s timeout
    compression: CompressionTypes.GZIP,
  });

  console.log(`Published to partition ${result[0].partition}, offset ${result[0].offset}`);
}

// ── Batch Sending (high throughput) ─────────────────────────────

async function publishBatch(orders: OrderEvent[]): Promise<void> {
  const topicMessages = {
    topic: 'order-events',
    messages: orders.map((order) => ({
      key: order.orderId,
      value: JSON.stringify({
        eventType: 'ORDER_CREATED',
        payload: order,
        metadata: {
          source: 'order-service',
          version: '1.0',
          timestamp: new Date().toISOString(),
        },
      }),
    })),
  };

  await producer.sendBatch({
    topicMessages: [topicMessages],
    acks: -1,
    compression: CompressionTypes.GZIP,
  });
}

// ── Error Handling ──────────────────────────────────────────────

producer.on('producer.network.request_timeout', (payload) => {
  console.error('Producer request timeout:', payload);
});

producer.on('producer.disconnect', () => {
  console.warn('Producer disconnected');
});
```

---

## Q4: Consumers & Consumer Groups

### Q4.1: Explain Consumer Groups. Why are they essential?

**Answer:**

A **consumer group** is a set of consumers that cooperatively consume from a topic. Kafka assigns each partition to exactly one consumer within the group. This is the core scalability mechanism.

```
Topic: order-events (6 partitions)

Consumer Group: "order-processor"

  Consumer 1 ← P0, P1    (handles 2 partitions)
  Consumer 2 ← P2, P3    (handles 2 partitions)
  Consumer 3 ← P4, P5    (handles 2 partitions)

If Consumer 3 dies → rebalance:
  Consumer 1 ← P0, P1, P4
  Consumer 2 ← P2, P3, P5

If Consumer 4 added → rebalance:
  Consumer 1 ← P0, P1
  Consumer 2 ← P2, P3
  Consumer 3 ← P4
  Consumer 4 ← P5
```

**Key rules:**
1. Each partition is consumed by exactly ONE consumer in the group
2. A consumer can consume from multiple partitions
3. If consumers > partitions, some consumers sit idle
4. Different consumer groups independently consume the same topic (broadcast)
5. Max effective parallelism = number of partitions

### Q4.2: What are partition assignment strategies?

**Answer:**

| Strategy | How It Works | Pros | Cons |
|----------|-------------|------|------|
| **Range** | Assigns consecutive partitions to each consumer per topic | Simple, predictable | Can be uneven with multiple topics |
| **RoundRobin** | Distributes partitions round-robin across consumers | Even distribution | No locality guarantee |
| **Sticky** | Like RoundRobin but minimizes partition movement during rebalance | Fewer reassignments | Slightly more complex |
| **CooperativeSticky** | Incremental rebalance; consumers keep processing during rebalance | No stop-the-world | Requires cooperative protocol |

**In KafkaJS, the default uses RoundRobin.** CooperativeSticky is the recommended strategy for production.

### Q4.3: Explain offset management -- auto commit vs manual commit.

**Answer:**

**Offsets** are the consumer's position in each partition. Kafka stores committed offsets in a special internal topic `__consumer_offsets`.

**Auto commit:**
```typescript
const consumer = kafka.consumer({
  groupId: 'my-group',
  // Auto commit is enabled by default in KafkaJS
});

await consumer.run({
  autoCommit: true,
  autoCommitInterval: 5000,      // Commit every 5 seconds
  autoCommitThreshold: 100,      // Or after 100 messages
  eachMessage: async ({ topic, partition, message }) => {
    await processMessage(message);
    // Offset is committed automatically based on interval/threshold
  },
});
```

**Risk:** If the consumer crashes after processing but before the auto-commit, it will reprocess messages (at-least-once). If it crashes after auto-commit but before processing, it loses messages (at-most-once).

**Manual commit (recommended for critical workloads):**

```typescript
const consumer = kafka.consumer({ groupId: 'payment-processor' });

await consumer.run({
  autoCommit: false,               // Disable auto commit
  eachMessage: async ({ topic, partition, message, heartbeat }) => {
    try {
      // 1. Process the message
      await processPayment(JSON.parse(message.value.toString()));

      // 2. Commit only after successful processing
      await consumer.commitOffsets([
        {
          topic,
          partition,
          offset: (Number(message.offset) + 1).toString(), // Next offset to read
        },
      ]);

      // 3. Send heartbeat for long-running processing
      await heartbeat();
    } catch (error) {
      console.error('Failed to process message:', error);
      // Don't commit → message will be reprocessed
      // Optionally: send to dead letter topic
      await sendToDeadLetter(topic, partition, message, error);
    }
  },
});
```

**Batch-level commit (higher throughput):**

```typescript
await consumer.run({
  autoCommit: false,
  eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
    for (const message of batch.messages) {
      try {
        await processMessage(message);
        resolveOffset(message.offset);    // Mark as processed
        await heartbeat();                // Keep session alive
      } catch (error) {
        // Stop processing batch; uncommitted messages will be retried
        break;
      }
    }
    // Commit all resolved offsets at once
    await commitOffsetsIfNecessary();
  },
});
```

**When to use which:**

| Scenario | Commit Strategy | Why |
|----------|----------------|-----|
| Logging, analytics | Auto commit | Loss/duplicates are acceptable |
| Order processing | Manual per-message | Need at-least-once guarantee |
| High-throughput ETL | Manual per-batch | Balance between safety and speed |
| Payment processing | Manual per-message + idempotent handler | Cannot lose or duplicate |

### Q4.4: What is consumer lag and how do you monitor it?

**Answer:**

**Consumer lag** = (latest offset in partition) - (consumer's committed offset). It represents how far behind the consumer is from the latest data.

```
Partition 0:
  Latest offset (log end):    1,000,000
  Consumer committed offset:    999,500
  Consumer lag:                     500 messages
```

**Why it matters:**
- High lag means data is getting stale (not processed in real-time)
- Growing lag indicates the consumer can't keep up with the producer
- Can lead to data loss if lag exceeds retention period

**Monitoring approaches:**

```typescript
// In KafkaJS: fetch offsets and compare
const admin = kafka.admin();
await admin.connect();

// Get consumer group offsets
const groupOffsets = await admin.fetchOffsets({
  groupId: 'order-processor',
  topics: ['order-events'],
});

// Get topic end offsets
const topicOffsets = await admin.fetchTopicOffsets('order-events');

// Calculate lag per partition
for (const partition of topicOffsets) {
  const consumerOffset = groupOffsets
    .find(g => g.topic === 'order-events')
    ?.partitions.find(p => p.partition === partition.partition);

  const lag = Number(partition.offset) - Number(consumerOffset?.offset || 0);
  console.log(`Partition ${partition.partition}: lag = ${lag}`);
}
```

**External tools:** Burrow (LinkedIn), Kafka Exporter for Prometheus, Confluent Control Center.

### Q4.5: Explain consumer rebalancing and how to minimize its impact.

**Answer:**

A **rebalance** happens when Kafka reassigns partitions among consumers in a group.

**Triggers:**
- Consumer joins or leaves the group
- Consumer crashes (session timeout)
- Consumer takes too long to process (`max.poll.interval.ms` exceeded)
- Topic partition count changes
- Consumer subscribes to new topic (regex pattern match)

**The problem (stop-the-world):**
During a standard (eager) rebalance, ALL consumers stop processing, give up ALL their partitions, and then get new assignments. This causes a processing pause.

**Solutions:**

1. **CooperativeSticky rebalancing (incremental):**
Only the partitions that need to move are revoked. Other consumers keep processing.

2. **Static group membership:**
```typescript
const consumer = kafka.consumer({
  groupId: 'order-processor',
  sessionTimeout: 60000,              // 60s (longer to avoid false rebalances)
  // KafkaJS doesn't directly support group.instance.id,
  // but in Java/librdkafka-based clients:
  // groupInstanceId: 'consumer-host-1'  // Stable identity
});
```

3. **Tuning timeouts:**
```typescript
const consumer = kafka.consumer({
  groupId: 'order-processor',
  sessionTimeout: 30000,              // 30s before broker considers consumer dead
  heartbeatInterval: 3000,            // Send heartbeat every 3s (1/10 of session timeout)
  maxWaitTimeInMs: 5000,              // Max wait for new data
  rebalanceTimeout: 60000,            // Time to finish rebalance
});
```

4. **max.poll.interval.ms tuning:**
If message processing takes a long time, increase this value. Default is 300s (5 min). If processing exceeds this, the consumer is considered dead.

---

## Q5: Exactly-Once Semantics (EOS)

### Q5.1: Explain the three delivery guarantees in Kafka.

**Answer:**

| Guarantee | Description | How | Data Risk |
|-----------|-------------|-----|-----------|
| **At-most-once** | Messages may be lost, never duplicated | Auto-commit before processing; acks=0 | Data loss |
| **At-least-once** | Messages never lost, may be duplicated | Commit after processing; acks=all; retries | Duplicates |
| **Exactly-once** | Messages never lost, never duplicated | Idempotent producer + transactions | None (in theory) |

**The reality check:** True end-to-end exactly-once is extremely hard. What Kafka calls "exactly-once" is really "effectively once" -- the broker deduplicates producer retries, but your consumer side effects must still be idempotent.

### Q5.2: Explain transactional producers and how they enable exactly-once.

**Answer:**

A transactional producer can atomically write to multiple partitions and commit consumer offsets in a single transaction.

```
Transaction:
  1. Read from input-topic (partition 0, offset 100)
  2. Process the message
  3. Write to output-topic (partition 2)
  4. Commit consumer offset for input-topic (offset 101)
  → All or nothing: either ALL succeed or ALL are rolled back
```

**Code example:**

```typescript
import { Kafka, CompressionTypes } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'payment-processor',
  brokers: ['broker1:9092', 'broker2:9092', 'broker3:9092'],
});

// Transactional producer requires a transactionalId
const producer = kafka.producer({
  transactionalId: 'payment-processor-txn-1',
  idempotent: true,                  // Required for transactions
  maxInFlightRequests: 1,            // Required for transactions in KafkaJS
});

const consumer = kafka.consumer({
  groupId: 'payment-processor-group',
  readUncommitted: false,            // Only read committed messages (read_committed)
});

async function processWithExactlyOnce(): Promise<void> {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'order-events', fromBeginning: false });

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const order = JSON.parse(message.value.toString());

      // Start a transaction
      const transaction = await producer.transaction();

      try {
        // 1. Process: create payment record
        const paymentResult = {
          paymentId: crypto.randomUUID(),
          orderId: order.orderId,
          amount: order.totalAmount,
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
        };

        // 2. Write result to output topic (within transaction)
        await transaction.send({
          topic: 'payment-events',
          messages: [{
            key: order.orderId,
            value: JSON.stringify({
              eventType: 'PAYMENT_COMPLETED',
              payload: paymentResult,
            }),
          }],
        });

        // 3. Commit consumer offset (within same transaction)
        await transaction.sendOffsets({
          consumerGroupId: 'payment-processor-group',
          topics: [{
            topic,
            partitions: [{
              partition,
              offset: (Number(message.offset) + 1).toString(),
            }],
          }],
        });

        // 4. Commit the transaction atomically
        await transaction.commit();

      } catch (error) {
        // 5. Abort on any failure → nothing is committed
        await transaction.abort();
        console.error('Transaction aborted:', error);
      }
    },
  });
}
```

### Q5.3: What is `read_committed` isolation and why does it matter?

**Answer:**

Consumers can read in two isolation levels:

- **`read_uncommitted`** (default): Consumer sees ALL messages, including those from uncommitted transactions. Faster, but may see messages that are later aborted.
- **`read_committed`**: Consumer only sees messages from committed transactions. Uncommitted messages are buffered and only released after commit.

```typescript
// KafkaJS: read_committed is the default when using consumer.run()
// For explicit control:
const consumer = kafka.consumer({
  groupId: 'my-group',
  readUncommitted: false,    // false = read_committed (safe)
});
```

**When exactly-once matters:**
- Financial transactions (payments, transfers)
- Inventory management (stock levels)
- User account balance updates
- Billing and invoicing

**When at-least-once + idempotent consumer is sufficient:**
- Logging and monitoring
- Analytics event ingestion
- Search index updates (idempotent by nature)
- Cache invalidation

### Q5.4: How do you build an idempotent consumer?

**Answer:**

Since "exactly-once" on the consumer side requires idempotency, here are practical patterns:

```typescript
// Pattern 1: Database upsert with unique constraint
async function processPaymentIdempotent(event: PaymentEvent): Promise<void> {
  // Use the Kafka message key + offset as an idempotency key
  const idempotencyKey = `${event.orderId}-${event.eventId}`;

  try {
    await db.query(`
      INSERT INTO payments (idempotency_key, order_id, amount, status, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (idempotency_key) DO NOTHING
    `, [idempotencyKey, event.orderId, event.amount, event.status]);
  } catch (error) {
    // Unique constraint violation = already processed = safe to skip
    if (error.code === '23505') {
      console.log(`Duplicate event ${idempotencyKey}, skipping`);
      return;
    }
    throw error;
  }
}

// Pattern 2: Processed event tracking table
async function processWithTracking(
  topic: string,
  partition: number,
  offset: string,
  handler: () => Promise<void>,
): Promise<void> {
  const eventKey = `${topic}-${partition}-${offset}`;

  // Check if already processed
  const existing = await redis.get(`processed:${eventKey}`);
  if (existing) {
    console.log(`Already processed: ${eventKey}`);
    return;
  }

  // Process
  await handler();

  // Mark as processed (with TTL matching Kafka retention)
  await redis.set(`processed:${eventKey}`, '1', 'EX', 7 * 24 * 3600);
}
```

---

## Q6: Kafka Streams & KSQL

### Q6.1: What is Kafka Streams and why should a Node.js developer know about it?

**Answer:**

**Kafka Streams** is a Java/Scala library for building stream processing applications on top of Kafka. It is NOT a separate cluster -- it runs inside your application JVM.

**Why a Node.js developer should care:**
1. **Architecture decisions:** You may need to decide whether to use Kafka Streams (Java) or build custom processing with KafkaJS
2. **Team collaboration:** Java/Scala teams in your org may use it
3. **Understanding concepts:** KStream, KTable, windowing concepts apply regardless of language
4. **System design interviews:** You'll be asked about stream processing

**Core abstractions:**

| Abstraction | Description | Analogy |
|-------------|-------------|---------|
| **KStream** | Unbounded stream of records; each record is an independent event | Event log |
| **KTable** | Changelog stream; each record is an update (latest value per key) | Database table |
| **GlobalKTable** | Like KTable but fully replicated on every instance | Lookup table |

### Q6.2: Explain windowing in stream processing.

**Answer:**

Windowing groups events by time for aggregation:

| Window Type | Description | Use Case |
|-------------|-------------|----------|
| **Tumbling** | Fixed-size, non-overlapping, time-based | "Count orders per 5-minute interval" |
| **Hopping** | Fixed-size, overlapping (advances by hop interval) | "Average over 10min, updated every 1min" |
| **Sliding** | Fixed-size, triggered by events within the window | "Alert if >100 errors in any 5-min period" |
| **Session** | Dynamic size, based on activity gaps | "Group user clicks by session (30min inactivity gap)" |

```
Tumbling Window (5 min):
  |──────|──────|──────|──────|
  0      5     10     15     20

Hopping Window (10 min window, 5 min hop):
  |────────────|
       |────────────|
            |────────────|
  0    5   10   15   20   25

Session Window (30 min gap):
  ├─click─click──click─┤   30min gap   ├─click─click─┤
       Session 1                            Session 2
```

### Q6.3: How do you do stream processing in Node.js without Kafka Streams?

**Answer:**

Since Kafka Streams is Java-only, Node.js developers build custom stream processors:

```typescript
import { Kafka } from 'kafkajs';

// Custom windowed aggregation in Node.js
class SlidingWindowCounter {
  private windows: Map<string, { count: number; timestamp: number }[]> = new Map();
  private windowSizeMs: number;

  constructor(windowSizeMs: number) {
    this.windowSizeMs = windowSizeMs;
  }

  add(key: string, timestamp: number): number {
    if (!this.windows.has(key)) {
      this.windows.set(key, []);
    }

    const entries = this.windows.get(key)!;
    entries.push({ count: 1, timestamp });

    // Evict old entries outside the window
    const cutoff = timestamp - this.windowSizeMs;
    const active = entries.filter(e => e.timestamp > cutoff);
    this.windows.set(key, active);

    return active.reduce((sum, e) => sum + e.count, 0);
  }
}

// Usage: real-time error rate monitoring
const errorCounter = new SlidingWindowCounter(5 * 60 * 1000); // 5-minute window

const consumer = kafka.consumer({ groupId: 'error-monitor' });
await consumer.subscribe({ topic: 'application-logs' });

await consumer.run({
  eachMessage: async ({ message }) => {
    const log = JSON.parse(message.value.toString());

    if (log.level === 'error') {
      const count = errorCounter.add(log.service, Date.now());

      if (count > 100) {
        // Alert: more than 100 errors in 5 minutes
        await publishAlert({
          service: log.service,
          errorCount: count,
          window: '5m',
        });
      }
    }
  },
});
```

For more complex use cases, consider ksqlDB, Apache Flink, or running a Java Kafka Streams app alongside your Node.js services.

---

## Q7: Kafka Connect

### Q7.1: What is Kafka Connect and why does it matter?

**Answer:**

Kafka Connect is a framework for streaming data between Kafka and external systems without writing custom code. It handles serialization, offset tracking, fault tolerance, and scaling.

```
┌──────────┐    Source     ┌──────────┐    Sink       ┌──────────────┐
│PostgreSQL │──Connector──▶│  KAFKA   │──Connector──▶│Elasticsearch │
│  (CDC)    │              │          │               │  (Search)    │
└──────────┘              │          │               └──────────────┘
                           │          │
┌──────────┐    Source     │          │    Sink       ┌──────────────┐
│  MySQL   │──Connector──▶│          │──Connector──▶│  Amazon S3   │
│  (CDC)    │              │          │               │  (Archive)   │
└──────────┘              └──────────┘               └──────────────┘
```

**Source Connectors:** External system -> Kafka
- Debezium (PostgreSQL, MySQL, MongoDB CDC)
- JDBC source connector
- File source connector

**Sink Connectors:** Kafka -> External system
- Elasticsearch sink
- S3 sink
- JDBC sink
- MongoDB sink

### Q7.2: Explain Debezium and Change Data Capture (CDC). How does the Outbox pattern work?

**Answer:**

**Debezium** is an open-source CDC platform built on Kafka Connect. It captures row-level changes from database transaction logs (PostgreSQL WAL, MySQL binlog) and publishes them to Kafka topics.

**How CDC works with PostgreSQL:**
1. Debezium connects to PostgreSQL's replication slot
2. Reads the Write-Ahead Log (WAL) in real-time
3. Converts each INSERT/UPDATE/DELETE into a Kafka message
4. Publishes to topic: `dbserver.schema.table`

**The Outbox Pattern:**

The problem: In microservices, you need to update a database AND publish an event atomically. But you can't do a distributed transaction across DB + Kafka.

The solution: Write both the business data and the event to the same database (in an outbox table), then use Debezium to publish the outbox to Kafka.

```
┌─────────────────────────────────────────────┐
│              Order Service                   │
│                                              │
│  1. BEGIN TRANSACTION                        │
│  2. INSERT INTO orders (...)                 │
│  3. INSERT INTO outbox (                     │
│       aggregate_type: 'Order',               │
│       aggregate_id: 'ORD-123',               │
│       event_type: 'OrderCreated',            │
│       payload: '{...}'                       │
│     )                                        │
│  4. COMMIT                                   │
│                                              │
└──────────────────┬──────────────────────────┘
                   │ Debezium reads WAL
                   ▼
              ┌─────────┐
              │  KAFKA   │  topic: outbox.events
              └────┬─────┘
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
     Payment   Inventory  Notification
     Service   Service    Service
```

**Database schema for outbox table:**

```sql
CREATE TABLE outbox (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(255) NOT NULL,    -- e.g., 'Order'
  aggregate_id   VARCHAR(255) NOT NULL,    -- e.g., 'ORD-123'
  event_type     VARCHAR(255) NOT NULL,    -- e.g., 'OrderCreated'
  payload        JSONB NOT NULL,           -- Event data
  created_at     TIMESTAMP DEFAULT NOW()
);

-- Debezium reads this table via CDC, then optionally deletes processed rows
```

**TypeScript implementation:**

```typescript
// In your service: atomic write to DB + outbox
async function createOrder(orderData: CreateOrderDto): Promise<Order> {
  return await dataSource.transaction(async (manager) => {
    // 1. Save the order
    const order = manager.create(Order, {
      id: crypto.randomUUID(),
      userId: orderData.userId,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      status: 'CREATED',
    });
    await manager.save(order);

    // 2. Write to outbox (same transaction!)
    const outboxEvent = manager.create(Outbox, {
      aggregateType: 'Order',
      aggregateId: order.id,
      eventType: 'OrderCreated',
      payload: {
        orderId: order.id,
        userId: order.userId,
        items: order.items,
        totalAmount: order.totalAmount,
      },
    });
    await manager.save(outboxEvent);

    return order;
    // Both writes committed atomically
    // Debezium picks up the outbox record and publishes to Kafka
  });
}
```

---

## Q8: Kafka Security

### Q8.1: What are the security mechanisms in Kafka?

**Answer:**

| Layer | Mechanism | Description |
|-------|-----------|-------------|
| **Authentication** | SASL (PLAIN, SCRAM-SHA-256/512, OAUTHBEARER), mTLS | Verify client identity |
| **Authorization** | ACLs (Access Control Lists) | Control who can do what on which resources |
| **Encryption in transit** | TLS/SSL | Encrypt data between clients and brokers |
| **Encryption at rest** | Disk encryption (OS-level) | Encrypt stored data |

### Q8.2: KafkaJS with SASL authentication and TLS.

**Answer:**

```typescript
import { Kafka } from 'kafkajs';
import * as fs from 'fs';

// ── SASL/SCRAM + TLS ───────────────────────────────────────────

const kafka = new Kafka({
  clientId: 'secure-service',
  brokers: ['broker1:9093', 'broker2:9093', 'broker3:9093'],

  // TLS encryption
  ssl: {
    rejectUnauthorized: true,
    ca: [fs.readFileSync('/certs/ca-cert.pem', 'utf-8')],
    key: fs.readFileSync('/certs/client-key.pem', 'utf-8'),
    cert: fs.readFileSync('/certs/client-cert.pem', 'utf-8'),
  },

  // SASL authentication
  sasl: {
    mechanism: 'scram-sha-512',
    username: process.env.KAFKA_USERNAME!,
    password: process.env.KAFKA_PASSWORD!,
  },
});

// ── SASL/OAUTHBEARER (for managed Kafka like Confluent Cloud) ──

const kafkaOAuth = new Kafka({
  clientId: 'cloud-service',
  brokers: ['pkc-xxxxx.us-east-1.aws.confluent.cloud:9092'],
  ssl: true,
  sasl: {
    mechanism: 'plain',              // Confluent Cloud uses PLAIN over TLS
    username: process.env.CONFLUENT_API_KEY!,
    password: process.env.CONFLUENT_API_SECRET!,
  },
});

// ── AWS MSK with IAM Authentication ────────────────────────────

// For AWS MSK, use the kafkajs-msk-iam-auth package
// import { MSKIAMAuth } from 'kafkajs-msk-iam-auth';
//
// const kafka = new Kafka({
//   clientId: 'msk-service',
//   brokers: ['b-1.msk-cluster.xxxxx.kafka.us-east-1.amazonaws.com:9098'],
//   ssl: true,
//   sasl: {
//     mechanism: 'oauthbearer',
//     oauthBearerProvider: () => MSKIAMAuth.generateAuthToken({ region: 'us-east-1' }),
//   },
// });
```

**Topic-level ACLs (configured via kafka-acls CLI):**

```bash
# Allow user "order-service" to produce to "order-events"
kafka-acls --bootstrap-server broker1:9092 \
  --add --allow-principal User:order-service \
  --operation Write \
  --topic order-events

# Allow user "payment-service" to consume from "order-events"
kafka-acls --bootstrap-server broker1:9092 \
  --add --allow-principal User:payment-service \
  --operation Read \
  --topic order-events \
  --group payment-processor

# Deny all other access
kafka-acls --bootstrap-server broker1:9092 \
  --add --deny-principal User:* \
  --operation All \
  --topic order-events
```

---

## Q9: Kafka Performance Tuning

### Q9.1: How do you tune Kafka producers for maximum throughput?

**Answer:**

```typescript
// High-throughput producer configuration
const producer = kafka.producer({
  idempotent: true,
  maxInFlightRequests: 5,
});

// When calling send:
await producer.send({
  topic: 'high-volume-events',
  compression: CompressionTypes.LZ4,   // Best speed/ratio for throughput
  acks: 1,                              // Trade durability for speed (or -1 for safety)
  timeout: 30000,
  messages: batch,                       // Send in batches, not one-by-one
});
```

**Producer tuning parameters:**

| Parameter | Default | Tuning for Throughput | Tuning for Latency |
|-----------|---------|----------------------|-------------------|
| `batch.size` | 16KB | 64KB-256KB | 16KB (small) |
| `linger.ms` | 0 | 10-100ms | 0 (send immediately) |
| `compression.type` | none | lz4 or zstd | none or lz4 |
| `acks` | all | 1 (if loss acceptable) | 1 |
| `buffer.memory` | 32MB | 64-128MB | 32MB |
| `max.in.flight.requests` | 5 | 5 | 1 (strict ordering) |

### Q9.2: How do you tune Kafka consumers?

**Answer:**

| Parameter | Default | Tuning Tip |
|-----------|---------|------------|
| `fetch.min.bytes` | 1 | Increase to 10KB-1MB to reduce fetch requests |
| `fetch.max.wait.ms` | 500 | Increase if higher latency is acceptable |
| `max.poll.records` | 500 | Match to your processing capacity |
| `max.partition.fetch.bytes` | 1MB | Increase for large messages |
| `session.timeout.ms` | 10000 | 30000-60000 for slower consumers |
| `max.poll.interval.ms` | 300000 | Increase for long-running processing |

**Key insight:** If you see high consumer lag, the bottleneck is usually:
1. **Processing time per message** -- optimize your handler or increase parallelism
2. **Too few partitions** -- add partitions and consumers
3. **Network** -- consumer and broker in different regions
4. **Deserialization** -- optimize message format (consider Protobuf over JSON)

### Q9.3: What broker-level tuning should you know about?

**Answer:**

| Parameter | Description | Recommendation |
|-----------|-------------|----------------|
| `num.io.threads` | Threads for disk I/O | Set to number of disks |
| `num.network.threads` | Threads for network requests | Set to number of CPU cores / 2 |
| `num.partitions` | Default partitions for new topics | 6-12 (override per-topic) |
| `log.retention.hours` | How long to keep data | Based on use case (168 = 7 days) |
| `log.segment.bytes` | Size of log segment files | 1GB default is usually fine |
| `log.flush.interval.messages` | Messages before fsync | Don't change (rely on replication) |
| `replica.fetch.max.bytes` | Max bytes fetched per partition for replication | Increase for large messages |

**OS-level tuning:**
- **Page cache:** Kafka relies heavily on OS page cache. Give Kafka brokers plenty of RAM (but don't give it all to JVM heap -- leave ~60% for page cache)
- **File descriptors:** `ulimit -n 100000` (Kafka opens many files)
- **Disk:** Use SSDs or dedicated spinning disks with XFS filesystem
- **Network:** Increase socket buffer sizes (`net.core.rmem_max`, `net.core.wmem_max`)

### Q9.4: What metrics should you monitor?

**Answer:**

| Category | Metric | Alert Threshold |
|----------|--------|----------------|
| **Broker** | UnderReplicatedPartitions | > 0 for > 5 min |
| **Broker** | ActiveControllerCount | != 1 across cluster |
| **Broker** | OfflinePartitionsCount | > 0 |
| **Broker** | ISRShrinkRate | Sustained increase |
| **Broker** | RequestHandlerAvgIdlePercent | < 0.3 (overloaded) |
| **Broker** | NetworkProcessorAvgIdlePercent | < 0.3 |
| **Producer** | record-send-rate | Sudden drop |
| **Producer** | record-error-rate | > 0 |
| **Producer** | request-latency-avg | > 100ms |
| **Consumer** | records-lag-max | Sustained increase |
| **Consumer** | records-consumed-rate | Sudden drop |
| **Consumer** | commit-latency-avg | > 50ms |
| **Disk** | Log directory usage | > 80% |

**Monitoring stack:** Prometheus + JMX Exporter (for broker metrics) + Grafana dashboards.

---

## Q10: Kafka in Microservices Architecture

### Q10.1: How do you implement the Saga pattern with Kafka?

**Answer:**

The **Saga pattern** manages distributed transactions across microservices using a sequence of local transactions, each publishing events to trigger the next step.

**Choreography-based Saga (event-driven):**

```
┌───────────┐   OrderCreated   ┌───────────┐  PaymentCompleted  ┌───────────┐
│  Order    │─────────────────▶│  Payment  │──────────────────▶│ Inventory │
│  Service  │                  │  Service  │                   │  Service  │
│           │◀─────────────────│           │◀──────────────────│           │
│           │  PaymentFailed   │           │  OutOfStock       │           │
│           │  (compensate)    │           │  (compensate)     │           │
└───────────┘                  └───────────┘                   └───────────┘
```

**Implementation:**

```typescript
// ── Order Service ───────────────────────────────────────────────

interface OrderSagaEvent {
  sagaId: string;
  orderId: string;
  eventType: 'ORDER_CREATED' | 'ORDER_CONFIRMED' | 'ORDER_CANCELLED';
  payload: Record<string, unknown>;
  timestamp: string;
}

class OrderService {
  constructor(
    private producer: Producer,
    private consumer: Consumer,
    private orderRepo: OrderRepository,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const sagaId = crypto.randomUUID();

    // 1. Create order in PENDING state
    const order = await this.orderRepo.save({
      id: crypto.randomUUID(),
      sagaId,
      userId: dto.userId,
      items: dto.items,
      totalAmount: dto.totalAmount,
      status: 'PENDING',
    });

    // 2. Publish ORDER_CREATED event
    await this.producer.send({
      topic: 'order-events',
      messages: [{
        key: order.id,
        value: JSON.stringify({
          sagaId,
          orderId: order.id,
          eventType: 'ORDER_CREATED',
          payload: {
            userId: dto.userId,
            items: dto.items,
            totalAmount: dto.totalAmount,
          },
          timestamp: new Date().toISOString(),
        }),
      }],
    });

    return order;
  }

  // Listen for saga completion/failure events
  async startSagaListener(): Promise<void> {
    await this.consumer.subscribe({ topics: ['payment-events', 'inventory-events'] });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const event = JSON.parse(message.value.toString());

        switch (event.eventType) {
          case 'PAYMENT_FAILED':
            await this.orderRepo.updateStatus(event.orderId, 'CANCELLED');
            console.log(`Order ${event.orderId} cancelled: payment failed`);
            break;

          case 'INVENTORY_RESERVED':
            await this.orderRepo.updateStatus(event.orderId, 'CONFIRMED');
            console.log(`Order ${event.orderId} confirmed`);
            break;

          case 'INVENTORY_OUT_OF_STOCK':
            await this.orderRepo.updateStatus(event.orderId, 'CANCELLED');
            // Compensate: refund payment
            await this.producer.send({
              topic: 'payment-events',
              messages: [{
                key: event.orderId,
                value: JSON.stringify({
                  sagaId: event.sagaId,
                  orderId: event.orderId,
                  eventType: 'REFUND_REQUESTED',
                  payload: { amount: event.payload.totalAmount },
                  timestamp: new Date().toISOString(),
                }),
              }],
            });
            break;
        }
      },
    });
  }
}

// ── Payment Service ─────────────────────────────────────────────

class PaymentService {
  async startListener(): Promise<void> {
    await this.consumer.subscribe({ topics: ['order-events'] });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const event = JSON.parse(message.value.toString());

        if (event.eventType === 'ORDER_CREATED') {
          try {
            // Process payment
            const paymentResult = await this.processPayment(
              event.payload.userId,
              event.payload.totalAmount,
            );

            // Publish success
            await this.producer.send({
              topic: 'payment-events',
              messages: [{
                key: event.orderId,
                value: JSON.stringify({
                  sagaId: event.sagaId,
                  orderId: event.orderId,
                  eventType: 'PAYMENT_COMPLETED',
                  payload: { paymentId: paymentResult.id, amount: paymentResult.amount },
                  timestamp: new Date().toISOString(),
                }),
              }],
            });
          } catch (error) {
            // Publish failure
            await this.producer.send({
              topic: 'payment-events',
              messages: [{
                key: event.orderId,
                value: JSON.stringify({
                  sagaId: event.sagaId,
                  orderId: event.orderId,
                  eventType: 'PAYMENT_FAILED',
                  payload: { reason: error.message },
                  timestamp: new Date().toISOString(),
                }),
              }],
            });
          }
        }
      },
    });
  }
}

// ── Inventory Service ───────────────────────────────────────────

class InventoryService {
  async startListener(): Promise<void> {
    await this.consumer.subscribe({ topics: ['payment-events'] });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const event = JSON.parse(message.value.toString());

        if (event.eventType === 'PAYMENT_COMPLETED') {
          try {
            await this.reserveStock(event.payload.items);

            await this.producer.send({
              topic: 'inventory-events',
              messages: [{
                key: event.orderId,
                value: JSON.stringify({
                  sagaId: event.sagaId,
                  orderId: event.orderId,
                  eventType: 'INVENTORY_RESERVED',
                  payload: { items: event.payload.items },
                  timestamp: new Date().toISOString(),
                }),
              }],
            });
          } catch (error) {
            await this.producer.send({
              topic: 'inventory-events',
              messages: [{
                key: event.orderId,
                value: JSON.stringify({
                  sagaId: event.sagaId,
                  orderId: event.orderId,
                  eventType: 'INVENTORY_OUT_OF_STOCK',
                  payload: { reason: error.message, totalAmount: event.payload.amount },
                  timestamp: new Date().toISOString(),
                }),
              }],
            });
          }
        }
      },
    });
  }
}
```

### Q10.2: Explain the Dead Letter Topic pattern.

**Answer:**

A **Dead Letter Topic (DLT)** is where messages that fail processing after multiple retries are sent, instead of blocking the consumer or losing them.

```typescript
class ResilientConsumer {
  private readonly MAX_RETRIES = 3;
  private readonly DLT_TOPIC: string;

  constructor(
    private consumer: Consumer,
    private producer: Producer,
    private topic: string,
  ) {
    this.DLT_TOPIC = `${topic}.DLT`;
  }

  async start(): Promise<void> {
    await this.consumer.subscribe({ topic: this.topic });

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message, heartbeat }) => {
        const retryCount = Number(message.headers?.['retry-count']?.toString() || '0');

        try {
          await this.processMessage(message);

          // Commit on success
          await this.consumer.commitOffsets([{
            topic,
            partition,
            offset: (Number(message.offset) + 1).toString(),
          }]);
        } catch (error) {
          if (retryCount < this.MAX_RETRIES) {
            // Retry: publish back to the same topic with incremented retry count
            await this.producer.send({
              topic: `${this.topic}.retry`,
              messages: [{
                key: message.key,
                value: message.value,
                headers: {
                  ...message.headers,
                  'retry-count': (retryCount + 1).toString(),
                  'original-topic': topic,
                  'error-message': error.message,
                  'failed-at': new Date().toISOString(),
                },
              }],
            });
          } else {
            // Max retries exceeded: send to DLT
            await this.producer.send({
              topic: this.DLT_TOPIC,
              messages: [{
                key: message.key,
                value: message.value,
                headers: {
                  ...message.headers,
                  'original-topic': topic,
                  'error-message': error.message,
                  'exhausted-retries': 'true',
                  'dead-lettered-at': new Date().toISOString(),
                },
              }],
            });
            console.error(`Message sent to DLT after ${this.MAX_RETRIES} retries:`, error);
          }

          // Commit either way -- message is either in retry topic or DLT
          await this.consumer.commitOffsets([{
            topic,
            partition,
            offset: (Number(message.offset) + 1).toString(),
          }]);
        }

        await heartbeat();
      },
    });
  }
}
```

### Q10.3: What is Schema Registry and why is schema evolution important?

**Answer:**

**Schema Registry** (from Confluent) stores and validates message schemas (Avro, Protobuf, JSON Schema). It ensures that producers and consumers agree on message format and that changes are backward/forward compatible.

**Why it matters:**
- Without a schema, a producer can break consumers by changing message format
- Schema Registry enforces compatibility rules before allowing schema changes
- Enables schema evolution without breaking existing consumers

**Compatibility modes:**

| Mode | Rule | Example |
|------|------|---------|
| **BACKWARD** | New schema can read old data | Adding optional field |
| **FORWARD** | Old schema can read new data | Removing optional field |
| **FULL** | Both backward and forward | Only adding/removing optional fields with defaults |
| **NONE** | No compatibility check | Anything goes (dangerous) |

**Best practice:** Use `BACKWARD` compatibility (default) -- consumers with the new schema can still read messages produced with the old schema.

### Q10.4: Should you use Kafka as an event store?

**Answer:**

Kafka can serve as an event store for event sourcing, but there are trade-offs:

| Aspect | Kafka as Event Store | Dedicated Event Store (EventStoreDB) |
|--------|---------------------|-------------------------------------|
| **Append-only log** | Yes | Yes |
| **Event replay** | Yes (seek to offset) | Yes (read stream from start) |
| **Per-entity streams** | No (partition = multiple entities) | Yes (stream per aggregate) |
| **Retention** | Configurable (can be infinite) | Infinite by default |
| **Snapshots** | Manual implementation | Built-in |
| **Projections** | External (Kafka Streams, custom) | Built-in server-side projections |
| **Querying events** | Limited (offset-based) | Rich (by stream, by event type, etc.) |
| **Throughput** | Very high | Moderate |
| **Operational maturity** | High | Lower |

**Recommendation:** Use Kafka for event-driven communication between services. Use a dedicated event store (EventStoreDB) if you need true event sourcing with per-aggregate streams and projections. You can combine both: EventStoreDB for the write model, publishing to Kafka for downstream consumers.

---

## Q11: Kafka with NestJS

### Q11.1: How do you integrate Kafka with NestJS?

**Answer:**

NestJS has built-in Kafka support via `@nestjs/microservices`.

**Complete NestJS Kafka microservice:**

```typescript
// ── main.ts ─────────────────────────────────────────────────────

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // HTTP server (REST/GraphQL)
  const app = await NestFactory.create(AppModule);

  // Kafka microservice transport
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'order-service',
        brokers: ['broker1:9092', 'broker2:9092', 'broker3:9092'],
        ssl: true,
        sasl: {
          mechanism: 'scram-sha-512',
          username: process.env.KAFKA_USERNAME,
          password: process.env.KAFKA_PASSWORD,
        },
      },
      consumer: {
        groupId: 'order-service-consumer',
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxWaitTimeInMs: 5000,
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
      },
      producer: {
        idempotent: true,
        maxInFlightRequests: 5,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);
  console.log('Order service running on port 3000 with Kafka transport');
}

bootstrap();
```

```typescript
// ── app.module.ts ───────────────────────────────────────────────

import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { KafkaHealthIndicator } from './health/kafka.health';

@Module({
  imports: [
    // Register Kafka client for producing messages
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'order-service-producer',
            brokers: ['broker1:9092', 'broker2:9092', 'broker3:9092'],
          },
          producer: {
            idempotent: true,
          },
        },
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, KafkaHealthIndicator],
})
export class AppModule {}
```

```typescript
// ── order.controller.ts ─────────────────────────────────────────

import { Controller, Post, Body, Inject, OnModuleInit } from '@nestjs/common';
import {
  ClientKafka,
  MessagePattern,
  EventPattern,
  Payload,
  Ctx,
  KafkaContext,
} from '@nestjs/microservices';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly orderService: OrderService,
  ) {}

  async onModuleInit() {
    // Subscribe to response topics (for request-reply pattern)
    this.kafkaClient.subscribeToResponseOf('payment.process');
    await this.kafkaClient.connect();
  }

  // ── REST endpoint that produces Kafka events ──────────────────

  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    const order = await this.orderService.create(dto);

    // Fire-and-forget event (no response expected)
    this.kafkaClient.emit('order.created', {
      key: order.id,
      value: {
        orderId: order.id,
        userId: dto.userId,
        items: dto.items,
        totalAmount: dto.totalAmount,
        timestamp: new Date().toISOString(),
      },
    });

    return order;
  }

  // ── Request-Reply: send to Kafka and wait for response ────────

  @Post(':id/pay')
  async processPayment(@Param('id') orderId: string) {
    const order = await this.orderService.findById(orderId);

    // Send message and wait for reply from payment service
    const result = await firstValueFrom(
      this.kafkaClient.send('payment.process', {
        key: orderId,
        value: {
          orderId: order.id,
          amount: order.totalAmount,
          userId: order.userId,
        },
      }),
    );

    return result;
  }

  // ── Event handler: consume Kafka events ───────────────────────

  @EventPattern('payment.completed')
  async handlePaymentCompleted(
    @Payload() data: PaymentCompletedEvent,
    @Ctx() context: KafkaContext,
  ) {
    const topic = context.getTopic();
    const partition = context.getPartition();
    const offset = context.getMessage().offset;

    console.log(`Received ${topic}[${partition}] @ offset ${offset}`);

    await this.orderService.updateStatus(data.orderId, 'PAID');
  }

  // ── Message handler: request-reply pattern ────────────────────

  @MessagePattern('order.get-details')
  async getOrderDetails(
    @Payload() data: { orderId: string },
    @Ctx() context: KafkaContext,
  ) {
    const order = await this.orderService.findById(data.orderId);
    // Return value is sent back as reply
    return {
      orderId: order.id,
      status: order.status,
      items: order.items,
      totalAmount: order.totalAmount,
    };
  }
}
```

```typescript
// ── order.service.ts ────────────────────────────────────────────

import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    // Save to database
    const order = await this.orderRepo.save({
      id: crypto.randomUUID(),
      ...dto,
      status: 'CREATED',
    });

    this.logger.log(`Order created: ${order.id}`);
    return order;
  }

  async updateStatus(orderId: string, status: string): Promise<void> {
    await this.orderRepo.update(orderId, { status });

    // Emit status change event
    this.kafkaClient.emit('order.status-changed', {
      key: orderId,
      value: { orderId, status, timestamp: new Date().toISOString() },
    });

    this.logger.log(`Order ${orderId} status updated to ${status}`);
  }

  async findById(orderId: string): Promise<Order> {
    return this.orderRepo.findOneOrFail({ where: { id: orderId } });
  }
}
```

```typescript
// ── health/kafka.health.ts ──────────────────────────────────────

import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Kafka } from 'kafkajs';

@Injectable()
export class KafkaHealthIndicator extends HealthIndicator {
  private admin;

  constructor() {
    super();
    const kafka = new Kafka({
      clientId: 'health-check',
      brokers: ['broker1:9092'],
    });
    this.admin = kafka.admin();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.admin.connect();
      const cluster = await this.admin.describeCluster();
      await this.admin.disconnect();

      return this.getStatus(key, true, {
        brokers: cluster.brokers.length,
        controller: cluster.controller,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Kafka health check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }
}
```

### Q11.2: How do you handle errors and retries with NestJS Kafka?

**Answer:**

```typescript
import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';

@Controller()
export class EventHandlerController {

  // ── Retry with exponential backoff ────────────────────────────

  @EventPattern('order.process')
  async handleOrderProcess(
    @Payload() data: OrderEvent,
    @Ctx() context: KafkaContext,
  ) {
    const message = context.getMessage();
    const retryCount = Number(message.headers?.['x-retry-count']?.toString() || '0');
    const maxRetries = 3;

    try {
      await this.processOrder(data);
    } catch (error) {
      if (retryCount < maxRetries) {
        // Exponential backoff delay
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Republish with incremented retry count
        this.kafkaClient.emit('order.process', {
          key: data.orderId,
          value: data,
          headers: {
            'x-retry-count': (retryCount + 1).toString(),
            'x-original-timestamp': message.headers?.['x-original-timestamp']
              || message.timestamp,
          },
        });
      } else {
        // Send to Dead Letter Topic
        this.kafkaClient.emit('order.process.DLT', {
          key: data.orderId,
          value: {
            originalMessage: data,
            error: {
              message: error.message,
              stack: error.stack,
              retryCount,
            },
            metadata: {
              originalTopic: context.getTopic(),
              originalPartition: context.getPartition(),
              originalOffset: message.offset,
              deadLetteredAt: new Date().toISOString(),
            },
          },
        });

        this.logger.error(
          `Order ${data.orderId} sent to DLT after ${maxRetries} retries`,
          error.stack,
        );
      }
    }
  }
}
```

---

## Q12: Kafka Operations & Troubleshooting

### Q12.1: What is log compaction and when do you use it?

**Answer:**

**Log compaction** keeps only the latest value for each key in a topic, deleting older records with the same key. Unlike time-based retention (which deletes by age), compaction retains the most recent state.

```
Before compaction:
  Offset:  0   1   2   3   4   5   6   7   8
  Key:     A   B   A   C   B   A   C   A   B
  Value:   v1  v1  v2  v1  v2  v3  v2  v4  v3

After compaction:
  Offset:  5   7   8
  Key:     A   A   B      (actually keeps: offset 6→C:v2, offset 7→A:v4, offset 8→B:v3)
  Value:   v3  v4  v3
```

**Configuration:**
```
cleanup.policy=compact              # Enable compaction
min.compaction.lag.ms=3600000       # Don't compact messages younger than 1 hour
delete.retention.ms=86400000        # Keep tombstones for 24 hours
min.cleanable.dirty.ratio=0.5      # Compact when 50% of log is "dirty"
```

**Use cases:**
- User profile/settings topics (latest state per user)
- Configuration/feature flag topics
- KTable changelog topics in Kafka Streams
- Cache sync topics

**Tombstones:** A message with a key and `null` value marks that key for deletion during compaction.

### Q12.2: Explain KRaft mode. Why is Kafka moving away from ZooKeeper?

**Answer:**

**KRaft (Kafka Raft)** replaces ZooKeeper with a built-in Raft-based consensus protocol for metadata management.

| Aspect | ZooKeeper Mode | KRaft Mode |
|--------|---------------|------------|
| **Metadata storage** | External ZooKeeper ensemble | Internal Raft quorum controllers |
| **Operational complexity** | Two systems to manage | Single system |
| **Scaling** | ZooKeeper becomes bottleneck at ~200K partitions | Supports millions of partitions |
| **Controller failover** | Seconds to minutes | Sub-second |
| **Deployment** | ZK + Kafka brokers | Just Kafka brokers (some act as controllers) |
| **Status** | Deprecated (Kafka 3.5+) | Production-ready (Kafka 3.3+) |

**Key improvement:** With ZooKeeper, metadata (partition assignments, broker list, configs) was stored externally. On controller failover, the new controller had to reload ALL metadata from ZooKeeper, which could take minutes for large clusters. KRaft stores metadata in a replicated log within Kafka itself, making failover nearly instant.

### Q12.3: What are common Kafka operational issues and how do you troubleshoot them?

**Answer:**

| Issue | Symptoms | Root Cause | Solution |
|-------|----------|-----------|----------|
| **Consumer lag growing** | Delayed processing | Slow consumer, too few partitions | Optimize processing, add partitions + consumers |
| **Under-replicated partitions** | URP metric > 0 | Broker overloaded, network issues, disk full | Check broker logs, disk space, network |
| **Rebalance storms** | Frequent consumer group rebalances | Consumers timing out, unstable network | Increase session timeout, use static membership |
| **Disk full** | Broker stops accepting writes | Retention too long, high throughput | Reduce retention, add disks, add brokers |
| **Producer timeouts** | `TimeoutException` | Broker overloaded, network, min.ISR not met | Check broker load, ISR health, increase timeout |
| **Message too large** | `MessageSizeTooLargeException` | Message exceeds max.message.bytes | Increase limit or compress/split messages |
| **Offset out of range** | `OffsetOutOfRangeException` | Consumer offset points to deleted segment | Set auto.offset.reset=earliest/latest |
| **Duplicate messages** | Consumers process same message twice | Rebalance during processing, no idempotency | Implement idempotent consumers |

### Q12.4: How do you handle disaster recovery and cross-cluster replication?

**Answer:**

**MirrorMaker 2 (MM2):** Kafka's built-in tool for replicating data across clusters.

```
┌─────────────┐    MirrorMaker 2    ┌─────────────┐
│  Primary DC  │───────────────────▶│  DR Cluster  │
│  Cluster A   │    (Kafka Connect) │  Cluster B   │
│              │                    │              │
│  orders      │ ──replicates──▶   │  A.orders    │
│  payments    │ ──replicates──▶   │  A.payments  │
└─────────────┘                    └─────────────┘
```

**Key features of MM2:**
- Automatic topic and consumer group offset sync
- Preserves topic names with prefix (e.g., `A.orders`)
- Supports active-active and active-passive topologies
- Built on Kafka Connect framework

**Capacity planning formula:**

```
Storage per broker = (messages/sec * avg_message_size * retention_seconds * replication_factor)
                     / number_of_brokers

Example:
  10,000 msg/sec * 1KB * 604,800 sec (7 days) * 3 (RF) / 3 (brokers)
  = ~6 TB per broker
```

---

## Q13: Kafka Design Interview Questions

### Q13.1: Design a real-time notification system with Kafka (for 41M+ users).

**Answer:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐
│   Services   │     │    KAFKA     │     │   Notification Router     │
│              │     │              │     │                           │
│ Order Svc ───┼────▶│ notification │────▶│ Consumer Group (24 inst) │
│ Payment Svc ─┼────▶│   -events   │     │                           │
│ Social Svc ──┼────▶│ (48 parts)  │     │ ┌─ Push (FCM/APNs) ─────▶│ Mobile
│ Chat Svc ────┼────▶│             │     │ ├─ Email (SES/SendGrid) ─▶│ Email
│              │     │             │     │ ├─ SMS (Twilio) ─────────▶│ SMS
│              │     │             │     │ └─ WebSocket ────────────▶│ In-app
└──────────────┘     └──────────────┘     └──────────────────────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │ notification-status │ (Kafka topic)
                                          │ (delivery tracking) │
                                          └─────────────────────┘
```

**Key design decisions:**

1. **Partition by userId** -- all notifications for a user go to the same partition for ordering
2. **48 partitions** -- allows up to 48 consumer instances for parallelism
3. **Priority routing** -- high-priority (payment, security) vs low-priority (social, marketing) as separate topics or headers
4. **User preferences** -- lookup from Redis cache to determine channels (push, email, SMS)
5. **Rate limiting** -- per-user rate limit to avoid notification fatigue
6. **Deduplication** -- idempotency key to prevent duplicate notifications
7. **Dead letter** -- failed notifications go to DLT for retry/investigation

**Throughput estimation:**
- 41M users, 10% DAU = 4.1M active users
- Average 5 notifications/day = ~20M notifications/day
- Peak: 3x average = ~700 notifications/sec
- With 48 partitions and 24 consumers: ~30 msgs/sec per consumer (easily manageable)

### Q13.2: Design an event-driven order processing pipeline.

**Answer:**

```
┌──────┐  order.   ┌─────────┐ payment.  ┌───────────┐ inventory. ┌──────────┐
│ API  │──created──▶│ Payment │──success──▶│ Inventory │──reserved──▶│ Shipping │
│ GW   │           │ Service │           │  Service  │            │ Service  │
└──────┘           └────┬────┘           └─────┬─────┘            └────┬─────┘
                        │                       │                       │
                   payment.              inventory.              shipping.
                    failed                out_of_stock            dispatched
                        │                       │                       │
                        ▼                       ▼                       ▼
                  ┌──────────────────────────────────────────────────────────┐
                  │                  Order Saga Orchestrator                 │
                  │  Listens to all events, manages order state machine     │
                  │  Triggers compensating transactions on failure           │
                  └──────────────────────────────────────────────────────────┘
```

**Topics:**
- `order-events` (12 partitions, RF=3, min.ISR=2) -- critical, exactly-once
- `payment-events` (6 partitions, RF=3) -- financial
- `inventory-events` (6 partitions, RF=3)
- `shipping-events` (6 partitions, RF=3)
- `notification-events` (12 partitions, RF=2) -- less critical
- `*.DLT` -- dead letter topics for each

### Q13.3: How would you handle exactly-once payment processing?

**Answer:**

```typescript
// 1. Idempotent producer + transactions on Kafka side
// 2. Idempotency key in the database (most important!)

class PaymentProcessor {
  async processPayment(event: OrderCreatedEvent): Promise<void> {
    const idempotencyKey = `payment-${event.orderId}-${event.sagaId}`;

    // Use database transaction with idempotency
    await this.db.transaction(async (tx) => {
      // Check if already processed
      const existing = await tx.query(
        'SELECT id FROM processed_events WHERE idempotency_key = $1 FOR UPDATE',
        [idempotencyKey],
      );

      if (existing.rows.length > 0) {
        console.log(`Payment already processed for ${event.orderId}`);
        return;
      }

      // Process payment
      const payment = await tx.query(
        'INSERT INTO payments (id, order_id, amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [crypto.randomUUID(), event.orderId, event.amount, 'COMPLETED'],
      );

      // Record as processed
      await tx.query(
        'INSERT INTO processed_events (idempotency_key, processed_at) VALUES ($1, NOW())',
        [idempotencyKey],
      );

      // Write to outbox (same transaction!)
      await tx.query(
        `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
         VALUES ($1, $2, $3, $4)`,
        ['Payment', payment.rows[0].id, 'PAYMENT_COMPLETED', JSON.stringify({
          paymentId: payment.rows[0].id,
          orderId: event.orderId,
          amount: event.amount,
        })],
      );
    });
    // Debezium publishes outbox entry to Kafka
  }
}
```

### Q13.4: How would you migrate from RabbitMQ to Kafka?

**Answer:**

**Phase 1: Dual-write (2-4 weeks)**
- Continue using RabbitMQ for existing consumers
- Producers write to both RabbitMQ and Kafka
- Build new Kafka consumers in parallel

**Phase 2: Shadow consumption (2-4 weeks)**
- Kafka consumers process messages but don't trigger side effects
- Compare results with RabbitMQ consumers
- Validate correctness and performance

**Phase 3: Gradual cutover (2-4 weeks)**
- Route traffic topic-by-topic from RabbitMQ to Kafka
- Start with low-risk topics (logs, analytics)
- Move critical topics last (orders, payments)
- Keep RabbitMQ as fallback

**Phase 4: Decommission (1-2 weeks)**
- Stop producing to RabbitMQ
- Drain remaining messages
- Decommission RabbitMQ

**Key considerations:**
- RabbitMQ routing logic must be mapped to Kafka topics/partitions
- Dead letter exchanges become dead letter topics
- Message TTL becomes retention policy
- Request-reply patterns need redesign

### Q13.5: How many partitions do you need for X throughput?

**Answer:**

**Formula:**
```
Partitions = max(Tp, Tc)

Where:
  Tp = Target throughput / Throughput per producer partition
  Tc = Target throughput / Throughput per consumer partition
```

**Example:**
```
Target: 100,000 messages/sec
Producer throughput per partition: ~50,000 msg/sec (benchmarked)
Consumer throughput per partition: ~10,000 msg/sec (depends on processing)

Tp = 100,000 / 50,000 = 2
Tc = 100,000 / 10,000 = 10

Partitions needed: max(2, 10) = 10 partitions
Add 20-50% buffer: 12-15 partitions
```

**Rules of thumb:**
- If consumer processing is the bottleneck, add more partitions and consumers
- Each partition should handle ~10MB/s on average
- Don't exceed ~4,000 partitions per broker
- More partitions = longer leader election on broker failure
- Start conservatively; increasing partitions is easy, decreasing is not

---

## Quick Reference

### Kafka CLI Commands Cheat Sheet

```bash
# ── Topic Management ────────────────────────────────────────────

# List topics
kafka-topics --bootstrap-server localhost:9092 --list

# Create topic
kafka-topics --bootstrap-server localhost:9092 \
  --create --topic order-events \
  --partitions 12 --replication-factor 3 \
  --config retention.ms=604800000 \
  --config min.insync.replicas=2

# Describe topic
kafka-topics --bootstrap-server localhost:9092 \
  --describe --topic order-events

# Alter topic (add partitions)
kafka-topics --bootstrap-server localhost:9092 \
  --alter --topic order-events --partitions 24

# Delete topic
kafka-topics --bootstrap-server localhost:9092 \
  --delete --topic order-events

# ── Producer ────────────────────────────────────────────────────

# Console producer
kafka-console-producer --bootstrap-server localhost:9092 \
  --topic order-events \
  --property "key.separator=:" \
  --property "parse.key=true"

# Performance test
kafka-producer-perf-test --topic perf-test \
  --num-records 1000000 \
  --record-size 1024 \
  --throughput -1 \
  --producer-props bootstrap.servers=localhost:9092 \
  acks=all compression.type=lz4

# ── Consumer ────────────────────────────────────────────────────

# Console consumer
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic order-events \
  --from-beginning \
  --group test-consumer

# Consumer group management
kafka-consumer-groups --bootstrap-server localhost:9092 --list

kafka-consumer-groups --bootstrap-server localhost:9092 \
  --describe --group order-processor

# Reset offsets (dry run first!)
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group order-processor \
  --topic order-events \
  --reset-offsets --to-earliest --dry-run

kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group order-processor \
  --topic order-events \
  --reset-offsets --to-earliest --execute

# ── Cluster ─────────────────────────────────────────────────────

# Describe cluster
kafka-metadata --snapshot /var/kafka-logs/__cluster_metadata-0/00000000000000000000.log \
  --cluster-id

# Check under-replicated partitions
kafka-topics --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions

# Log dirs
kafka-log-dirs --bootstrap-server localhost:9092 --describe
```

### Configuration Parameters Table

**Producer:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `acks` | `all` | Acknowledgment level (0, 1, all) |
| `retries` | `2147483647` | Number of retries |
| `batch.size` | `16384` | Batch size in bytes |
| `linger.ms` | `0` | Delay to accumulate batch |
| `compression.type` | `none` | Compression algorithm |
| `max.in.flight.requests.per.connection` | `5` | Max unacknowledged requests |
| `enable.idempotence` | `true` (Kafka 3.0+) | Idempotent producer |
| `transactional.id` | `null` | Enables transactions |
| `buffer.memory` | `33554432` | Total memory for buffering |

**Consumer:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `group.id` | - | Consumer group ID |
| `auto.offset.reset` | `latest` | Where to start if no offset (earliest/latest) |
| `enable.auto.commit` | `true` | Auto commit offsets |
| `auto.commit.interval.ms` | `5000` | Auto commit interval |
| `session.timeout.ms` | `45000` | Consumer session timeout |
| `heartbeat.interval.ms` | `3000` | Heartbeat frequency |
| `max.poll.records` | `500` | Max records per poll |
| `max.poll.interval.ms` | `300000` | Max time between polls |
| `fetch.min.bytes` | `1` | Min data for fetch response |
| `fetch.max.wait.ms` | `500` | Max wait for fetch.min.bytes |
| `isolation.level` | `read_uncommitted` | Transaction isolation |

**Broker:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `num.partitions` | `1` | Default partitions per topic |
| `default.replication.factor` | `1` | Default replication factor |
| `min.insync.replicas` | `1` | Min ISR for acks=all |
| `log.retention.hours` | `168` (7 days) | Retention period |
| `log.retention.bytes` | `-1` (unlimited) | Retention by size |
| `log.segment.bytes` | `1073741824` (1GB) | Segment file size |
| `num.io.threads` | `8` | I/O threads |
| `num.network.threads` | `3` | Network threads |
| `message.max.bytes` | `1048588` (~1MB) | Max message size |

### Kafka vs RabbitMQ vs Redis Decision Matrix

| Scenario | Best Choice | Why |
|----------|-------------|-----|
| Event streaming | Kafka | Log-based, replay, retention |
| Simple task queue | RabbitMQ | Built-in ack, DLX, priorities |
| Pub/sub with persistence | Kafka | Consumer groups, retention |
| Complex routing | RabbitMQ | Exchanges, bindings, headers |
| High throughput (>100K/s) | Kafka | Partitioned, batched, compressed |
| Real-time cache invalidation | Redis Pub/Sub | Fastest, in-memory |
| CDC / data pipelines | Kafka | Kafka Connect, Debezium |
| Microservice events | Kafka | Durable, replayable events |
| Background jobs | RabbitMQ or BullMQ | Retries, delays, priorities |
| Chat/presence | Redis Pub/Sub | Low latency, ephemeral |

### Common Interview Questions (Quick-Fire)

1. **How does Kafka achieve high throughput?**
   Sequential disk I/O, zero-copy transfer, batching, compression, partitioned parallelism.

2. **Can Kafka guarantee message ordering?**
   Yes, within a single partition. Use message keys to route related messages to the same partition.

3. **What happens when a broker goes down?**
   Partition leaders on that broker fail over to ISR followers on other brokers. Producers/consumers automatically reconnect to new leaders.

4. **How does Kafka handle backpressure?**
   Pull-based model: consumers read at their own pace. If consumer is slow, lag increases but the system remains stable. Producer buffering and `buffer.memory` provide producer-side backpressure.

5. **What is the difference between `@EventPattern` and `@MessagePattern` in NestJS?**
   `@EventPattern`: fire-and-forget, no response (event-driven). `@MessagePattern`: request-reply, returns a response to the sender.

6. **How do you ensure no data loss in Kafka?**
   `acks=all` + `min.insync.replicas=2` + `replication.factor=3` + manual offset commit after processing.

7. **What is the `__consumer_offsets` topic?**
   Internal Kafka topic that stores committed offsets for all consumer groups. Compacted topic, 50 partitions by default.

8. **How do you handle schema changes?**
   Use Schema Registry (Avro/Protobuf) with backward compatibility mode. Always add optional fields with defaults.

9. **When would you NOT use Kafka?**
   Simple task queues, low-volume apps, need for message priorities, complex routing patterns, request-reply RPC.

10. **How do you calculate the number of brokers needed?**
    Based on: storage requirements (throughput * retention * replication / brokers), CPU (compression/decompression), network bandwidth, and partition count limits (~4K partitions per broker).

### Monitoring Checklist

- [ ] Consumer lag per group/topic/partition (Burrow or Prometheus)
- [ ] Under-replicated partitions (should be 0)
- [ ] Offline partitions (should be 0)
- [ ] Active controller count (exactly 1 in cluster)
- [ ] ISR shrink/expand rate (should be stable)
- [ ] Request handler idle ratio (>0.3)
- [ ] Network processor idle ratio (>0.3)
- [ ] Disk usage per broker (<80%)
- [ ] Producer error rate (should be ~0)
- [ ] Producer latency p99 (<500ms)
- [ ] Consumer commit latency
- [ ] JVM heap usage per broker
- [ ] Network throughput per broker
- [ ] Replication lag between leader and followers
