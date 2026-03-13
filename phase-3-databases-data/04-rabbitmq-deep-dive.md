# RabbitMQ Deep Dive — Interview Preparation Guide

> **Target Role:** Senior/Lead Backend Engineer
> **Focus:** Architecture decisions, reliability patterns, production experience

## Table of Contents
1. [Core Concepts & Architecture](#q1-what-is-rabbitmq--core-concepts)
2. [Exchange Types](#q2-exchange-types)
3. [Queues & Queue Properties](#q3-queues--queue-properties)
4. [Message Acknowledgment & Reliability](#q4-message-acknowledgment--reliability)
5. [Dead Letter Queues & Error Handling](#q5-dead-letter-queues-dlq--error-handling)
6. [RabbitMQ Patterns](#q6-rabbitmq-patterns)
7. [Clustering & High Availability](#q7-rabbitmq-clustering--high-availability)
8. [Performance Tuning](#q8-rabbitmq-performance-tuning)
9. [RabbitMQ with NestJS](#q9-rabbitmq-with-nestjs)
10. [Security](#q10-rabbitmq-security)
11. [RabbitMQ vs Kafka](#q11-rabbitmq-vs-kafka--interview-decision-framework)
12. [Design Interview Questions](#q12-rabbitmq-design-interview-questions)
13. [Quick Reference](#quick-reference)

---

## Q1: What is RabbitMQ & Core Concepts

### Q: Explain RabbitMQ and its core architecture. Why would you choose it over alternatives?

**Answer:**

RabbitMQ is an open-source message broker implementing the AMQP 0-9-1 (Advanced Message Queuing Protocol) protocol. It acts as an intermediary for messaging, enabling asynchronous communication between services through a publish/subscribe model with sophisticated routing capabilities.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        RabbitMQ Architecture                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐    ┌──────────┐   Binding   ┌─────────┐   ┌──────────┐   │
│  │ Producer │───→│ Exchange │────────────→│  Queue  │──→│ Consumer │   │
│  │  (App)   │    │          │   (Rules)   │         │   │  (App)   │   │
│  └──────────┘    └──────────┘             └─────────┘   └──────────┘   │
│       │               │                       │              │          │
│       │          ┌────┴────┐             ┌────┴────┐         │          │
│       │          │ Routing │             │ Message │         │          │
│       │          │  Rules  │             │ Buffer  │         │          │
│       │          └─────────┘             └─────────┘         │          │
│       │                                                      │          │
│       └───── Publishes with ──────────── Consumes with ──────┘          │
│              routing key                 acknowledgment                  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                        Virtual Host (vhost)                        │  │
│  │  Logical grouping of exchanges, queues, bindings, permissions      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Connection ──→ Channel ──→ Channel ──→ Channel                         │
│  (TCP)         (Virtual)   (Virtual)   (Virtual)                        │
│                                                                          │
│  One TCP connection, many lightweight channels (multiplexed)             │
└──────────────────────────────────────────────────────────────────────────┘
```

**Core Components:**

| Component | Role | Key Detail |
|-----------|------|------------|
| **Producer** | Publishes messages to an exchange | Never sends directly to a queue |
| **Exchange** | Routes messages to queues based on rules | 4 types: direct, fanout, topic, headers |
| **Binding** | Rule linking exchange to queue | Can include routing key pattern |
| **Queue** | Buffer that stores messages | FIFO by default, supports priority |
| **Consumer** | Receives messages from a queue | Can ack/nack/reject messages |
| **Channel** | Virtual connection inside a TCP connection | Lightweight, multiplexed |
| **vhost** | Logical namespace | Isolates exchanges, queues, users |

**Message Flow:**
```
Producer                           Broker                              Consumer
   │                                 │                                    │
   │ 1. Publish(exchange, routingKey,│                                    │
   │    message, properties)         │                                    │
   │────────────────────────────────→│                                    │
   │                                 │ 2. Exchange evaluates              │
   │                                 │    routing rules                   │
   │                                 │ 3. Message copied to               │
   │                                 │    matching queue(s)               │
   │                                 │                                    │
   │                                 │ 4. Deliver/Push or                 │
   │                                 │    Consumer polls                  │
   │                                 │───────────────────────────────────→│
   │                                 │                                    │
   │                                 │ 5. Consumer processes              │
   │                                 │    and acknowledges                │
   │                                 │←───────────────────────────────────│
   │                                 │                                    │
   │ 6. Publisher confirm (optional) │                                    │
   │←────────────────────────────────│                                    │
```

**AMQP 0-9-1 Protocol Basics:**
- Binary protocol (efficient, not human-readable like HTTP)
- Connection-oriented over TCP (default port 5672, TLS on 5671)
- Multiplexed channels over a single connection
- Built-in authentication (SASL) and virtual hosting
- Defines exact semantics for exchanges, queues, bindings, and message delivery

### RabbitMQ vs Kafka vs Redis Pub/Sub

| Feature | RabbitMQ | Kafka | Redis Pub/Sub |
|---------|----------|-------|---------------|
| **Protocol** | AMQP 0-9-1 | Custom binary | RESP |
| **Model** | Smart broker, dumb consumer | Dumb broker, smart consumer | Fire-and-forget |
| **Message Retention** | Until consumed/expired | Configurable retention (days/size) | No retention |
| **Ordering** | Per-queue FIFO | Per-partition ordering | No ordering guarantee |
| **Routing** | Exchange types (rich) | Topic-based only | Channel-based only |
| **Throughput** | ~50K msg/s per node | ~1M+ msg/s per node | ~1M+ msg/s |
| **Replay** | No (message removed after ack) | Yes (offset-based) | No |
| **Consumer Groups** | Competing consumers | Native consumer groups | No |
| **Priority Queues** | Yes | No | No |
| **Request/Reply** | Native (correlation-id) | Possible but awkward | Possible |
| **Delivery Guarantee** | At-least-once, at-most-once | At-least-once, exactly-once | At-most-once |
| **Complexity** | Medium | High | Low |
| **Best For** | Task distribution, routing | Event streaming, logs | Simple real-time notifications |

**When to use RabbitMQ:**
- Task distribution among workers (competing consumers)
- Complex routing requirements (topic-based, header-based)
- Request/reply (RPC) patterns
- Priority message processing
- Moderate throughput with reliable delivery
- Delayed/scheduled message processing

**When NOT to use RabbitMQ:**
- High-throughput event streaming (millions/s) -- use Kafka
- Event sourcing with replay requirements -- use Kafka
- Simple pub/sub with no durability needed -- use Redis Pub/Sub
- Large message payloads (>128MB) -- use object storage + message reference

---

## Q2: Exchange Types

### Q: Explain all RabbitMQ exchange types, when to use each, and provide examples.

**Answer:**

Exchanges are the routing engine of RabbitMQ. Every message passes through an exchange before reaching a queue. The exchange type determines the routing algorithm.

### Direct Exchange

Routes messages to queues where the **binding key exactly matches the routing key**.

```
┌──────────┐   routingKey="pdf"   ┌────────────────┐   bindingKey="pdf"   ┌───────────┐
│ Producer │─────────────────────→│ Direct Exchange │──────────────────────→│ pdf_queue │
└──────────┘                      │                │                       └───────────┘
                                  │                │   bindingKey="email"  ┌─────────────┐
                                  │                │──────────────────────→│ email_queue │
                                  └────────────────┘                       └─────────────┘

Message with routingKey="pdf" → only goes to pdf_queue
Message with routingKey="email" → only goes to email_queue
```

```typescript
import * as amqplib from 'amqplib';

async function directExchangeExample() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const exchange = 'task_exchange';

  // Declare a direct exchange
  await channel.assertExchange(exchange, 'direct', { durable: true });

  // Declare and bind queues
  await channel.assertQueue('pdf_queue', { durable: true });
  await channel.assertQueue('email_queue', { durable: true });

  await channel.bindQueue('pdf_queue', exchange, 'pdf');
  await channel.bindQueue('email_queue', exchange, 'email');

  // Publish — this message goes ONLY to pdf_queue
  channel.publish(exchange, 'pdf', Buffer.from(JSON.stringify({
    file: 'report.pdf',
    userId: '123',
  })), {
    persistent: true,   // delivery_mode = 2
    contentType: 'application/json',
  });

  // This goes ONLY to email_queue
  channel.publish(exchange, 'email', Buffer.from(JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome',
  })), { persistent: true });
}
```

**Use case:** Task routing to specific worker types (PDF generation, email sending, SMS).

### Fanout Exchange

Broadcasts messages to **ALL bound queues**, ignoring the routing key entirely.

```
                                  ┌────────────────┐──→ ┌──────────────────┐
┌──────────┐                      │                │    │ notification_q   │
│ Producer │─────────────────────→│ Fanout Exchange│──→ ┌──────────────────┐
└──────────┘   (routing key       │                │    │ analytics_q      │
               is ignored)        │                │──→ ┌──────────────────┐
                                  └────────────────┘    │ audit_log_q      │
                                                         └──────────────────┘
Every bound queue gets a COPY of every message.
```

```typescript
async function fanoutExchangeExample() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const exchange = 'order_events';

  await channel.assertExchange(exchange, 'fanout', { durable: true });

  // Multiple services bind their own queues
  await channel.assertQueue('notification_service_q', { durable: true });
  await channel.assertQueue('analytics_service_q', { durable: true });
  await channel.assertQueue('audit_service_q', { durable: true });

  // Binding key is ignored for fanout — pass empty string
  await channel.bindQueue('notification_service_q', exchange, '');
  await channel.bindQueue('analytics_service_q', exchange, '');
  await channel.bindQueue('audit_service_q', exchange, '');

  // All three queues receive this message
  channel.publish(exchange, '', Buffer.from(JSON.stringify({
    event: 'order.created',
    orderId: 'ORD-456',
    total: 99.99,
  })), { persistent: true });
}
```

**Use case:** Event broadcasting where every subscriber must receive a copy (notifications, logging, analytics).

### Topic Exchange

Routes based on **routing key patterns** using wildcards:
- `*` matches exactly **one word**
- `#` matches **zero or more words**

Words are delimited by dots.

```
Routing Key: "order.us.created"

┌──────────┐                       ┌────────────────┐
│ Producer │──────────────────────→│ Topic Exchange  │
└──────────┘ routingKey=           │                 │
             "order.us.created"    │                 │
                                   └───────┬────────┘
                                           │
                     ┌─────────────────────┼──────────────────────┐
                     │                     │                      │
              "order.*.created"     "order.us.*"            "order.#"
              (matches!)            (matches!)              (matches!)
                     │                     │                      │
              ┌──────┴──────┐    ┌────────┴────────┐   ┌────────┴────────┐
              │ all_orders  │    │ us_orders_queue  │   │ order_audit_q   │
              │ _created_q  │    │                  │   │                 │
              └─────────────┘    └─────────────────┘   └─────────────────┘

Pattern examples:
  "order.*.created"  → matches "order.us.created", "order.eu.created"
  "order.us.*"       → matches "order.us.created", "order.us.cancelled"
  "order.#"          → matches "order.us.created", "order.created", "order.us.west.created"
  "#"                → matches everything (like fanout)
  "*.*.*"            → matches any 3-word key
```

```typescript
async function topicExchangeExample() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const exchange = 'events';

  await channel.assertExchange(exchange, 'topic', { durable: true });

  // Queue that receives ALL order events
  await channel.assertQueue('all_order_events', { durable: true });
  await channel.bindQueue('all_order_events', exchange, 'order.#');

  // Queue that receives only created events for any entity
  await channel.assertQueue('created_events', { durable: true });
  await channel.bindQueue('created_events', exchange, '*.*.created');

  // Queue that receives only US order events
  await channel.assertQueue('us_order_events', { durable: true });
  await channel.bindQueue('us_order_events', exchange, 'order.us.*');

  // This message matches: all_order_events, created_events, us_order_events
  channel.publish(exchange, 'order.us.created', Buffer.from(JSON.stringify({
    orderId: 'ORD-789',
    region: 'us',
  })), { persistent: true });

  // This matches: all_order_events only
  channel.publish(exchange, 'order.eu.cancelled', Buffer.from(JSON.stringify({
    orderId: 'ORD-790',
    region: 'eu',
  })), { persistent: true });
}
```

**Use case:** Selective event routing — microservices subscribe to exactly the events they care about. Logging systems with severity/source filtering (`log.error.payment`, `log.info.#`).

### Headers Exchange

Routes based on **message headers** instead of routing key. Supports `x-match: all` (AND) or `x-match: any` (OR).

```typescript
async function headersExchangeExample() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const exchange = 'header_routing';

  await channel.assertExchange(exchange, 'headers', { durable: true });

  await channel.assertQueue('pdf_reports', { durable: true });
  await channel.bindQueue('pdf_reports', exchange, '', {
    'x-match': 'all',     // ALL headers must match
    'format': 'pdf',
    'type': 'report',
  });

  await channel.assertQueue('any_urgent', { durable: true });
  await channel.bindQueue('any_urgent', exchange, '', {
    'x-match': 'any',     // ANY header can match
    'priority': 'urgent',
    'escalated': 'true',
  });

  // Goes to pdf_reports (both headers match)
  channel.publish(exchange, '', Buffer.from('report data'), {
    headers: { format: 'pdf', type: 'report' },
  });

  // Goes to any_urgent (priority matches)
  channel.publish(exchange, '', Buffer.from('alert data'), {
    headers: { priority: 'urgent', format: 'csv' },
  });
}
```

**Use case:** Rarely used in practice. Useful when routing logic depends on multiple attributes that don't fit a dot-delimited routing key. Headers exchange has performance overhead compared to topic.

### Default Exchange

A pre-declared **direct exchange** with no name (`""`). Every queue is automatically bound to it with the **queue name as the routing key**.

```typescript
// Publishing directly to a queue (through the default exchange)
channel.sendToQueue('my_queue', Buffer.from('hello'), { persistent: true });

// Equivalent to:
channel.publish('', 'my_queue', Buffer.from('hello'), { persistent: true });
```

### Dead Letter Exchange (DLX)

Not a separate exchange type — it's any exchange configured to receive "dead" messages. See [Q5](#q5-dead-letter-queues-dlq--error-handling) for full details.

### Exchange Type Decision Tree

```
Need to route messages?
│
├─ Broadcast to ALL subscribers?
│  └─ YES → Fanout Exchange
│
├─ Route to ONE specific queue by exact key?
│  └─ YES → Direct Exchange
│
├─ Route by pattern (wildcards)?
│  └─ YES → Topic Exchange
│
├─ Route by multiple header attributes?
│  └─ YES → Headers Exchange (rare)
│
└─ Send directly to a known queue?
   └─ YES → Default Exchange (sendToQueue)
```

---

## Q3: Queues & Queue Properties

### Q: What are the important queue properties and types? When would you use quorum queues vs classic queues?

**Answer:**

### Queue Declaration Properties

```typescript
await channel.assertQueue('my_queue', {
  durable: true,          // Survives broker restart (metadata + persistent messages)
  exclusive: false,        // Only this connection can use it; deleted on disconnect
  autoDelete: false,       // Deleted when last consumer unsubscribes
  arguments: {
    // Dead lettering
    'x-dead-letter-exchange': 'dlx_exchange',
    'x-dead-letter-routing-key': 'dead.my_queue',

    // TTL
    'x-message-ttl': 60000,            // Per-queue TTL: 60 seconds
    'x-expires': 1800000,               // Queue itself is deleted after 30 min of no use

    // Length limits
    'x-max-length': 100000,             // Max number of messages
    'x-max-length-bytes': 104857600,    // Max total size (100MB)
    'x-overflow': 'reject-publish',     // Or 'drop-head' (default)

    // Priority
    'x-max-priority': 10,               // Enable priority queue (1-255, keep low)

    // Queue type
    'x-queue-type': 'quorum',           // 'classic' (default), 'quorum', or 'stream'

    // Lazy queue (classic only)
    'x-queue-mode': 'lazy',             // Store messages on disk to save RAM
  },
});
```

### Key Properties Explained

| Property | Detail | Production Advice |
|----------|--------|-------------------|
| **durable** | Queue definition survives restart | Always `true` in production |
| **exclusive** | Scoped to declaring connection | Use for temp reply queues in RPC |
| **autoDelete** | Removed when no consumers left | Risky in production; use carefully |
| **x-message-ttl** | Messages expire after N ms | Use with DLX for delayed retry |
| **x-max-length** | Cap on message count | Pair with `reject-publish` for backpressure |
| **x-overflow** | `drop-head` discards oldest; `reject-publish` blocks publisher | `reject-publish` is safer with publisher confirms |
| **x-max-priority** | Enables priority levels | Keep low (e.g., 5-10); high values waste memory |

**Important:** `durable: true` only saves the queue definition. Messages must also be published with `persistent: true` (delivery_mode=2) to survive restart.

### Classic vs Quorum vs Stream Queues

| Feature | Classic Queue | Quorum Queue | Stream Queue |
|---------|---------------|--------------|--------------|
| **Introduced** | Original | RabbitMQ 3.8 | RabbitMQ 3.9 |
| **Replication** | Mirrored (deprecated) | Raft consensus | Raft-based log |
| **Data Safety** | Single node (or mirror) | Replicated to majority | Replicated log |
| **Ordering** | FIFO | FIFO | Offset-based |
| **Non-durable** | Supported | No (always durable) | No (always durable) |
| **Priority** | Supported | Not supported | Not supported |
| **Lazy mode** | Supported | Always lazy-like | Always on disk |
| **Poison msg handling** | Manual | Built-in delivery limit | N/A |
| **Performance** | Highest single-node | Slightly lower (consensus) | High throughput |
| **Message TTL** | Supported | Supported | Retention-based |
| **Use Case** | Non-critical, single-node | Production workloads | High-throughput, replay |

### Quorum Queues — Deep Dive

Quorum queues use the **Raft consensus algorithm** to replicate messages across multiple nodes. They replace the deprecated classic mirrored queues.

```typescript
// Declaring a quorum queue
await channel.assertQueue('orders_queue', {
  durable: true,    // Must be true for quorum
  arguments: {
    'x-queue-type': 'quorum',
    'x-quorum-initial-group-size': 3,   // Replicate to 3 nodes
    'x-delivery-limit': 5,              // After 5 redeliveries, dead-letter
    'x-dead-letter-exchange': 'dlx',
    'x-dead-letter-strategy': 'at-least-once',
  },
});
```

**Why quorum queues are preferred in production:**
- **Data safety:** Messages written to a majority of nodes before being confirmed
- **Automatic leader election:** If the leader node goes down, a follower takes over
- **Built-in poison message handling:** `x-delivery-limit` prevents infinite redelivery loops
- **No split-brain:** Raft consensus prevents conflicting state

### Stream Queues

Append-only log (similar concept to Kafka topics). Messages are not removed after consumption.

```typescript
// Declaring a stream queue
await channel.assertQueue('event_stream', {
  durable: true,
  arguments: {
    'x-queue-type': 'stream',
    'x-max-length-bytes': 5368709120,  // 5GB retention
    'x-max-age': '7D',                 // 7 days retention
    'x-stream-max-segment-size-bytes': 52428800,  // 50MB segments
  },
});

// Consuming from a stream — specify offset
await channel.consume('event_stream', (msg) => {
  console.log(msg.content.toString());
  // Streams use auto-ack; manual ack not supported in same way
}, {
  arguments: {
    'x-stream-offset': 'first',    // 'first', 'last', 'next', timestamp, or offset number
  },
});
```

---

## Q4: Message Acknowledgment & Reliability

### Q: How do you ensure messages are not lost in RabbitMQ? Explain the full reliability chain.

**Answer:**

Message reliability in RabbitMQ requires attention at **every stage** of the message lifecycle:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Reliability Chain                                   │
│                                                                       │
│  Producer ──→ Broker ──→ Queue ──→ Consumer                          │
│     │            │          │          │                              │
│  Publisher    Exchange    Durable    Manual                           │
│  Confirms    routing     queue +     Ack                             │
│  + mandatory  check     persistent                                   │
│  flag                    messages                                     │
│                                                                       │
│  If ANY link breaks, messages can be lost!                           │
└──────────────────────────────────────────────────────────────────────┘
```

### Consumer Acknowledgments

```typescript
async function reliableConsumer() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  // CRITICAL: Set prefetch BEFORE consuming
  await channel.prefetch(10);  // Process max 10 unacked messages at a time

  await channel.consume('task_queue', async (msg) => {
    if (!msg) return;

    try {
      const task = JSON.parse(msg.content.toString());
      await processTask(task);

      // ACK: Message processed successfully. Remove from queue.
      channel.ack(msg);

    } catch (error) {
      if (isRetryableError(error)) {
        // NACK + REQUEUE: Put message back in queue for retry.
        // WARNING: Can cause infinite loop if message always fails!
        channel.nack(msg, false, true);
        //              │      │
        //              │      └── requeue: true (put back in queue)
        //              └── allUpTo: false (only this message)
      } else {
        // NACK + NO REQUEUE: Send to DLQ (if DLX configured) or discard.
        // Use for permanent failures (bad data, business rule violation).
        channel.nack(msg, false, false);
        //              │      │
        //              │      └── requeue: false (dead-letter or discard)
        //              └── allUpTo: false
      }
    }
  }, {
    noAck: false,   // CRITICAL: manual acknowledgment mode
    //  noAck: true = auto-ack = message removed from queue on delivery
    //  DANGEROUS: if consumer crashes, message is lost forever
  });
}
```

### ack vs nack vs reject

| Method | Effect | When to Use |
|--------|--------|-------------|
| `ack(msg)` | Remove from queue | Successfully processed |
| `ack(msg, true)` | Ack this AND all previous unacked | Batch acknowledgment |
| `nack(msg, false, true)` | Requeue this message | Transient error, want retry |
| `nack(msg, false, false)` | Dead-letter or discard | Permanent failure |
| `nack(msg, true, false)` | Dead-letter all up to this msg | Bulk rejection |
| `reject(msg, true)` | Requeue (same as nack single) | Legacy; prefer nack |
| `reject(msg, false)` | Dead-letter or discard | Legacy; prefer nack |

**Key difference:** `nack` supports `allUpTo` (batch), `reject` does not.

### Prefetch Count (QoS)

Prefetch controls how many unacknowledged messages a consumer holds in its buffer.

```typescript
// Fair dispatch: each consumer gets 1 message at a time.
// Slow consumers get fewer messages. Best for uneven task durations.
await channel.prefetch(1);

// Higher throughput: consumer buffers 20 messages.
// Good when tasks are fast and uniform. Risk: memory spike if consumer dies.
await channel.prefetch(20);

// Per-channel vs per-consumer (global flag)
await channel.prefetch(10, false);  // Per-consumer (default)
await channel.prefetch(100, true);  // Per-channel (shared across all consumers on this channel)
```

**Tuning guidance:**
- `prefetch=1`: Fair dispatch, good for long-running tasks (>1s each)
- `prefetch=10-50`: Good balance for most workloads
- `prefetch=100+`: High throughput, fast tasks, risk memory
- Never use `prefetch=0` (unlimited) in production — memory bomb risk

### Publisher Confirms

Ensures the broker received and persisted the message before the producer moves on.

```typescript
async function reliableProducer() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createConfirmChannel();  // Confirm mode!

  const exchange = 'task_exchange';
  await channel.assertExchange(exchange, 'direct', { durable: true });

  // Publish with confirmation
  try {
    await new Promise<void>((resolve, reject) => {
      channel.publish(
        exchange,
        'pdf',
        Buffer.from(JSON.stringify({ file: 'report.pdf' })),
        {
          persistent: true,      // Survive broker restart
          mandatory: true,       // Return if no queue matches the routing key
          contentType: 'application/json',
          messageId: generateUUID(),
          timestamp: Date.now(),
        },
        (err) => {
          if (err) {
            // Broker NACK'd — message was NOT persisted
            reject(err);
          } else {
            // Broker ACK'd — message is safe
            resolve();
          }
        },
      );
    });

    console.log('Message confirmed by broker');
  } catch (error) {
    console.error('Message was NOT confirmed — implement retry logic');
  }

  // Handle returned messages (mandatory flag, no matching queue)
  channel.on('return', (msg) => {
    console.error('Message returned — no queue bound for routing key:', msg.fields.routingKey);
    // Retry with different routing key, alert, or store for later
  });
}
```

### Publisher Confirms vs Transactions

| Feature | Publisher Confirms | Transactions (tx) |
|---------|-------------------|-------------------|
| **Performance** | Asynchronous, fast | Synchronous, 250x slower |
| **Batching** | Confirm multiple messages | Per-transaction |
| **Recommended** | Yes | No (legacy) |
| **API** | `createConfirmChannel()` | `channel.txSelect()`, `txCommit()`, `txRollback()` |

**Always use publisher confirms. Transactions are a legacy feature with terrible performance.**

### Complete Reliability Checklist

```
Producer Side:
  ✓ Use publisher confirms (createConfirmChannel)
  ✓ Set persistent: true (delivery_mode = 2)
  ✓ Set mandatory: true (detect unroutable messages)
  ✓ Handle 'return' events
  ✓ Add messageId for deduplication
  ✓ Implement retry with backoff on confirm failure

Broker Side:
  ✓ Durable exchanges
  ✓ Durable queues (or quorum queues)
  ✓ Quorum queues for critical workloads (replicated)
  ✓ DLX configured for failed messages
  ✓ Cluster with at least 3 nodes

Consumer Side:
  ✓ Manual ack (noAck: false)
  ✓ Set appropriate prefetch count
  ✓ Process message BEFORE acking
  ✓ nack(requeue=false) for permanent failures → DLQ
  ✓ nack(requeue=true) only for transient failures
  ✓ Idempotent processing (handle duplicate deliveries)
```

---

## Q5: Dead Letter Queues (DLQ) & Error Handling

### Q: Explain dead letter queues, when messages get dead-lettered, and how to implement retry with exponential backoff.

**Answer:**

### What Causes Dead Lettering

A message is "dead-lettered" (moved to a DLX) when:

1. **Consumer rejects/nacks with `requeue: false`** — explicit rejection
2. **Message TTL expires** — `x-message-ttl` on queue or per-message `expiration` property
3. **Queue length limit exceeded** — `x-max-length` or `x-max-length-bytes` with `overflow: drop-head`
4. **Delivery limit reached** (quorum queues) — `x-delivery-limit`

### Basic DLQ Setup

```typescript
async function setupDLQ() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  // 1. Declare the Dead Letter Exchange
  await channel.assertExchange('dlx_exchange', 'direct', { durable: true });

  // 2. Declare the Dead Letter Queue
  await channel.assertQueue('main_queue_dlq', { durable: true });
  await channel.bindQueue('main_queue_dlq', 'dlx_exchange', 'main_queue');

  // 3. Declare the main queue WITH DLX configuration
  await channel.assertQueue('main_queue', {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'dlx_exchange',
      'x-dead-letter-routing-key': 'main_queue',  // Routes to main_queue_dlq
    },
  });

  // 4. Consumer: nack without requeue → message goes to main_queue_dlq
  await channel.consume('main_queue', async (msg) => {
    if (!msg) return;

    try {
      await processMessage(msg);
      channel.ack(msg);
    } catch (error) {
      console.error('Processing failed, sending to DLQ:', error.message);
      channel.nack(msg, false, false);  // requeue: false → goes to DLX
    }
  }, { noAck: false });
}
```

### Retry with Exponential Backoff (DLX Chain)

This is a critical pattern. Uses TTL queues that dead-letter back to the main exchange after a delay.

```
Message fails → nack(requeue=false) → DLX → retry_queue (TTL=5s) → expires → DLX → main_queue
                                                                                      │
If fails again → nack(requeue=false) → DLX → retry_queue (TTL=15s) → expires → DLX → main_queue
                                                                                      │
If fails again → nack(requeue=false) → DLX → retry_queue (TTL=60s) → expires → DLX → main_queue
                                                                                      │
If still fails → nack(requeue=false) → DLX → parking_lot_queue (permanent DLQ)
```

```typescript
interface RetryConfig {
  maxRetries: number;
  delays: number[];  // milliseconds: [5000, 15000, 60000]
}

async function setupExponentialBackoffRetry(config: RetryConfig) {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const mainExchange = 'main_exchange';
  const retryExchange = 'retry_exchange';
  const dlxExchange = 'dlx_final';

  // Main exchange for normal message flow
  await channel.assertExchange(mainExchange, 'direct', { durable: true });

  // Retry exchange: receives messages when TTL expires on retry queues
  await channel.assertExchange(retryExchange, 'direct', { durable: true });

  // Final DLX: for messages that exhausted all retries
  await channel.assertExchange(dlxExchange, 'direct', { durable: true });

  // Main processing queue
  await channel.assertQueue('processing_queue', {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': retryExchange,
      'x-dead-letter-routing-key': 'retry',
    },
  });
  await channel.bindQueue('processing_queue', mainExchange, 'process');

  // Retry delay queues (one per delay tier)
  for (let i = 0; i < config.delays.length; i++) {
    const delay = config.delays[i];
    const queueName = `retry_queue_${delay}ms`;

    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-message-ttl': delay,                      // Wait this long
        'x-dead-letter-exchange': mainExchange,      // Then re-route to main
        'x-dead-letter-routing-key': 'process',      // Back to processing_queue
      },
    });
    await channel.bindQueue(queueName, retryExchange, `retry_${i}`);
  }

  // Parking lot queue: permanent failure storage
  await channel.assertQueue('parking_lot_queue', { durable: true });
  await channel.bindQueue('parking_lot_queue', dlxExchange, 'dead');

  // Consumer with retry logic
  await channel.prefetch(10);
  await channel.consume('processing_queue', async (msg) => {
    if (!msg) return;

    const headers = msg.properties.headers || {};
    const retryCount = (headers['x-retry-count'] as number) || 0;

    try {
      const payload = JSON.parse(msg.content.toString());
      await processMessage(payload);
      channel.ack(msg);
    } catch (error) {
      if (retryCount < config.maxRetries) {
        // Route to the appropriate delay queue
        const delayIndex = Math.min(retryCount, config.delays.length - 1);
        const routingKey = `retry_${delayIndex}`;

        console.log(`Retry ${retryCount + 1}/${config.maxRetries}, ` +
          `delay: ${config.delays[delayIndex]}ms`);

        // Publish to retry exchange with incremented retry count
        channel.publish(retryExchange, routingKey, msg.content, {
          persistent: true,
          headers: {
            ...headers,
            'x-retry-count': retryCount + 1,
            'x-original-routing-key': msg.fields.routingKey,
            'x-first-failure-time': headers['x-first-failure-time'] || Date.now(),
            'x-last-error': (error as Error).message,
          },
        });

        // Ack the original (we've re-published it)
        channel.ack(msg);
      } else {
        // Exhausted all retries → parking lot
        console.error(`Message exhausted ${config.maxRetries} retries, parking`);

        channel.publish(dlxExchange, 'dead', msg.content, {
          persistent: true,
          headers: {
            ...headers,
            'x-retry-count': retryCount,
            'x-final-error': (error as Error).message,
            'x-dead-reason': 'max-retries-exceeded',
            'x-death-time': Date.now(),
          },
        });

        channel.ack(msg);
      }
    }
  }, { noAck: false });
}

// Usage
setupExponentialBackoffRetry({
  maxRetries: 3,
  delays: [5000, 15000, 60000],  // 5s, 15s, 1min
});
```

### Poison Message Handling

A "poison message" repeatedly fails processing, potentially blocking the queue.

```typescript
async function handlePoisonMessages(channel: amqplib.Channel, msg: amqplib.ConsumeMessage) {
  const headers = msg.properties.headers || {};
  const deathHistory = headers['x-death'] || [];
  const totalDeaths = deathHistory.reduce(
    (sum: number, d: any) => sum + (d.count || 0), 0,
  );

  if (totalDeaths > 5) {
    // This is a poison message — park it and alert
    console.error(`POISON MESSAGE DETECTED: ${msg.properties.messageId}`);
    await alertOpsTeam({
      messageId: msg.properties.messageId,
      queue: msg.fields.routingKey,
      deaths: totalDeaths,
      content: msg.content.toString().substring(0, 500),
    });
    channel.nack(msg, false, false);  // Send to DLQ permanently
    return true;
  }

  return false;
}
```

### DLQ Monitoring

```typescript
// Check DLQ depth periodically
async function monitorDLQ() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const { messageCount, consumerCount } = await channel.checkQueue('parking_lot_queue');

  if (messageCount > 100) {
    await alertOpsTeam({
      alert: 'DLQ_DEPTH_HIGH',
      queue: 'parking_lot_queue',
      depth: messageCount,
      consumers: consumerCount,
    });
  }
}
```

---

## Q6: RabbitMQ Patterns

### Q: Describe the common messaging patterns and when to use each.

**Answer:**

### Pattern 1: Work Queue (Competing Consumers)

Multiple consumers share the load from a single queue. RabbitMQ distributes messages round-robin.

```
                    ┌─────────────┐
               ┌───→│ Consumer 1  │  (processes odd messages)
┌─────────┐   │    └─────────────┘
│  Queue   │───┤
└─────────┘   │    ┌─────────────┐
               └───→│ Consumer 2  │  (processes even messages)
                    └─────────────┘
```

```typescript
// Producer: send tasks
async function sendTask(channel: amqplib.Channel, task: any) {
  await channel.assertQueue('task_queue', { durable: true });
  channel.sendToQueue('task_queue', Buffer.from(JSON.stringify(task)), {
    persistent: true,
  });
}

// Consumer: compete for tasks
async function startWorker(workerId: string) {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.prefetch(1);  // Fair dispatch — don't overload slow workers

  await channel.consume('task_queue', async (msg) => {
    if (!msg) return;
    const task = JSON.parse(msg.content.toString());
    console.log(`Worker ${workerId} processing:`, task.id);

    await processTask(task);
    channel.ack(msg);
  }, { noAck: false });
}

// Start multiple workers (different processes or containers)
startWorker('worker-1');
startWorker('worker-2');
startWorker('worker-3');
```

**Use case:** Background job processing (image resize, PDF generation, email sending).

### Pattern 2: Pub/Sub (Fanout)

Every subscriber gets every message.

```typescript
// Publisher
async function publishEvent(channel: amqplib.Channel, event: any) {
  await channel.assertExchange('app_events', 'fanout', { durable: true });
  channel.publish('app_events', '', Buffer.from(JSON.stringify(event)));
}

// Subscriber — each service creates its own queue
async function subscribeToEvents(serviceName: string, handler: (event: any) => Promise<void>) {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertExchange('app_events', 'fanout', { durable: true });

  // Exclusive, auto-named queue for this subscriber
  const { queue } = await channel.assertQueue('', {
    exclusive: true,
    autoDelete: true,
  });

  await channel.bindQueue(queue, 'app_events', '');

  await channel.consume(queue, async (msg) => {
    if (!msg) return;
    await handler(JSON.parse(msg.content.toString()));
    channel.ack(msg);
  }, { noAck: false });

  console.log(`${serviceName} subscribed to app_events`);
}
```

### Pattern 3: RPC (Request/Reply)

Synchronous-style request/reply over async messaging. Uses `correlationId` and `replyTo` queue.

```
┌────────┐  1. Request (correlationId, replyTo)  ┌──────────┐  2. Consume  ┌────────┐
│ Client │──────────────────────────────────────→ │ rpc_queue│ ───────────→ │ Server │
└────────┘                                        └──────────┘              └───┬────┘
     ↑                                                                          │
     │    4. Consume reply     ┌─────────────┐    3. Reply (correlationId)      │
     └─────────────────────────│ reply_queue  │←────────────────────────────────┘
                               └─────────────┘
```

```typescript
// RPC Client
class RpcClient {
  private channel: amqplib.Channel;
  private replyQueue: string;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }>();

  async init() {
    const connection = await amqplib.connect('amqp://localhost');
    this.channel = await connection.createChannel();

    // Create exclusive reply queue
    const { queue } = await this.channel.assertQueue('', {
      exclusive: true,
      autoDelete: true,
    });
    this.replyQueue = queue;

    // Listen for replies
    await this.channel.consume(this.replyQueue, (msg) => {
      if (!msg) return;

      const correlationId = msg.properties.correlationId;
      const pending = this.pendingRequests.get(correlationId);

      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(correlationId);

        const response = JSON.parse(msg.content.toString());
        if (response.error) {
          pending.reject(new Error(response.error));
        } else {
          pending.resolve(response.data);
        }
      }

      this.channel.ack(msg);
    }, { noAck: false });
  }

  async call(method: string, params: any, timeoutMs = 30000): Promise<any> {
    const correlationId = generateUUID();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`RPC timeout after ${timeoutMs}ms for method: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(correlationId, { resolve, reject, timer });

      this.channel.sendToQueue('rpc_queue', Buffer.from(JSON.stringify({
        method,
        params,
      })), {
        correlationId,
        replyTo: this.replyQueue,
        expiration: timeoutMs.toString(),  // Message TTL = timeout
      });
    });
  }
}

// RPC Server
async function startRpcServer() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertQueue('rpc_queue', { durable: true });
  await channel.prefetch(1);

  await channel.consume('rpc_queue', async (msg) => {
    if (!msg) return;

    const request = JSON.parse(msg.content.toString());
    let response: any;

    try {
      const result = await handleRpcMethod(request.method, request.params);
      response = { data: result };
    } catch (error) {
      response = { error: (error as Error).message };
    }

    // Send reply to the client's reply queue
    channel.sendToQueue(
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(response)),
      { correlationId: msg.properties.correlationId },
    );

    channel.ack(msg);
  }, { noAck: false });
}

// Usage
const client = new RpcClient();
await client.init();
const result = await client.call('getUserProfile', { userId: '123' });
```

### Pattern 4: Priority Queue

Process high-priority messages first.

```typescript
async function setupPriorityQueue() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  // Declare with max priority
  await channel.assertQueue('priority_tasks', {
    durable: true,
    arguments: { 'x-max-priority': 10 },
  });

  // Publish with different priorities
  const publishTask = (task: any, priority: number) => {
    channel.sendToQueue('priority_tasks', Buffer.from(JSON.stringify(task)), {
      persistent: true,
      priority,  // 0 (lowest) to 10 (highest)
    });
  };

  publishTask({ type: 'bulk_email', to: 'list@example.com' }, 1);    // Low
  publishTask({ type: 'password_reset', to: 'user@example.com' }, 9); // High — processed first
  publishTask({ type: 'welcome_email', to: 'new@example.com' }, 5);   // Medium
}
```

**Caveat:** Priority only works well when there are messages **waiting in the queue**. If the queue is empty and consumers are idle, priority has no effect because messages are delivered immediately.

### Pattern 5: Delayed Message

Using TTL + DLX trick (no plugin needed):

```typescript
async function setupDelayedMessage() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  // The actual processing exchange
  await channel.assertExchange('processing_exchange', 'direct', { durable: true });

  // Processing queue
  await channel.assertQueue('processing_queue', { durable: true });
  await channel.bindQueue('processing_queue', 'processing_exchange', 'process');

  // Delay queue: messages sit here until TTL expires, then go to processing_exchange
  await channel.assertQueue('delay_30s', {
    durable: true,
    arguments: {
      'x-message-ttl': 30000,                             // 30 second delay
      'x-dead-letter-exchange': 'processing_exchange',    // After TTL, route here
      'x-dead-letter-routing-key': 'process',
    },
  });

  // Schedule a message for 30 seconds from now
  channel.sendToQueue('delay_30s', Buffer.from(JSON.stringify({
    action: 'send_reminder',
    userId: '123',
    scheduledAt: new Date().toISOString(),
  })), { persistent: true });

  // For per-message delay (variable), use message expiration:
  channel.sendToQueue('delay_variable', Buffer.from(JSON.stringify({
    action: 'retry_payment',
  })), {
    persistent: true,
    expiration: '60000',  // This specific message expires in 60s
    // WARNING: per-message TTL only works if messages expire in order (FIFO).
    // A message with 60s TTL behind a message with 300s TTL won't expire on time!
  });
}
```

**For variable delays, use the `rabbitmq_delayed_message_exchange` plugin** which handles per-message delays correctly:

```typescript
// With rabbitmq_delayed_message_exchange plugin
await channel.assertExchange('delayed_exchange', 'x-delayed-message', {
  durable: true,
  arguments: { 'x-delayed-type': 'direct' },
});

channel.publish('delayed_exchange', 'process', Buffer.from(JSON.stringify(payload)), {
  headers: { 'x-delay': 45000 },  // Delay this message 45 seconds
  persistent: true,
});
```

---

## Q7: RabbitMQ Clustering & High Availability

### Q: How do you make RabbitMQ highly available? Explain clustering, quorum queues, and partition handling.

**Answer:**

### Clustering Basics

A RabbitMQ cluster shares **metadata** (exchange definitions, queue definitions, bindings, users) across all nodes. **Queue data** lives on the node that owns the queue (unless using quorum/mirrored queues).

```
┌────────────────────────────────────────────────────────────────┐
│                    RabbitMQ Cluster                              │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  Node 1  │    │  Node 2  │    │  Node 3  │                  │
│  │ (leader) │←──→│(follower)│←──→│(follower)│                  │
│  │          │    │          │    │          │                  │
│  │ Queue A  │    │ Queue A  │    │ Queue A  │  ← Quorum queue │
│  │ (leader) │    │ (replica)│    │ (replica)│    replicated    │
│  │          │    │          │    │          │                  │
│  │ Queue B  │    │          │    │          │  ← Classic queue │
│  │ (only    │    │          │    │          │    NOT replicated│
│  │  copy)   │    │          │    │          │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
│                                                                  │
│  Metadata (exchanges, bindings, users) → replicated everywhere  │
│  Classic queue data → single node only (unless mirrored)        │
│  Quorum queue data → replicated via Raft consensus              │
└────────────────────────────────────────────────────────────────┘
```

### Classic Mirrored Queues (DEPRECATED)

Do not use. They had race conditions, performance issues, and could lose messages during synchronization. Replaced by quorum queues.

### Quorum Queues (Recommended)

```typescript
// Production quorum queue setup
await channel.assertQueue('orders', {
  durable: true,
  arguments: {
    'x-queue-type': 'quorum',
    'x-quorum-initial-group-size': 3,   // 3 replicas (odd number for majority)
    'x-delivery-limit': 5,              // Auto dead-letter after 5 redeliveries
    'x-dead-letter-exchange': 'dlx',
    'x-dead-letter-routing-key': 'dead.orders',
  },
});
```

**How quorum queues work:**
1. One node is the **leader**, others are **followers**
2. Producer sends message to leader
3. Leader replicates to followers via **Raft consensus**
4. Message confirmed only when **majority** (quorum) acknowledges
5. If leader dies, a follower with the most up-to-date log is elected leader
6. For 3 nodes: tolerates 1 failure. For 5 nodes: tolerates 2 failures.

**Quorum = (N / 2) + 1** — a 3-node cluster needs 2 nodes alive, 5-node needs 3.

### Network Partition Strategies

When nodes lose connectivity, RabbitMQ must choose between consistency and availability:

| Strategy | Behavior | Trade-off |
|----------|----------|-----------|
| **pause-minority** | Nodes in the smaller partition pause | Consistent, but minority side is unavailable |
| **autoheal** | Losing partition restarts on reconnect | Available, but can lose messages from minority |
| **ignore** | Both sides continue (split-brain!) | DANGEROUS — data divergence |

**Recommendation:** Use `pause-minority` for most production setups. Quorum queues inherently handle partitions via Raft (minority cannot accept writes).

### Load Balancing

```
┌──────────┐     ┌───────────────┐     ┌──────────────────────┐
│  Client   │────→│   HAProxy /   │────→│   RabbitMQ Cluster   │
│  (App)    │     │   NGINX (L4)  │     │   ┌────┐ ┌────┐     │
└──────────┘     └───────────────┘     │   │ N1 │ │ N2 │     │
                                        │   └────┘ └────┘     │
                                        │      ┌────┐         │
                                        │      │ N3 │         │
                                        │      └────┘         │
                                        └──────────────────────┘
```

HAProxy configuration (key points):
- Use TCP mode (layer 4), not HTTP
- Health check against RabbitMQ management API (`/api/health/checks/alarms`)
- Sticky sessions are NOT needed (AMQP connections are long-lived)
- For quorum queues: any node can proxy to the leader node transparently

### Federation & Shovel

| Feature | Federation | Shovel |
|---------|-----------|--------|
| **Purpose** | Link exchanges/queues across clusters | Move messages between brokers |
| **Direction** | One-way (upstream → downstream) | One-way or bidirectional |
| **Topology** | Distributed, loose coupling | Point-to-point |
| **Use case** | Multi-region, multi-datacenter | Migration, bridging |
| **Message copy** | On-demand (when downstream has consumers) | Continuous transfer |

### AWS Amazon MQ vs Self-Managed

| Aspect | Amazon MQ (RabbitMQ) | Self-Managed |
|--------|---------------------|--------------|
| **Ops burden** | Managed (patching, backups) | You manage everything |
| **Clustering** | Single-instance or 3-node cluster | Any topology |
| **Customization** | Limited (no custom plugins) | Full control |
| **Cost** | Higher (managed service premium) | Lower (EC2/ECS cost) |
| **Monitoring** | CloudWatch integration | Prometheus + Grafana |
| **Networking** | VPC-only, private subnets | Any network topology |
| **Recommendation** | Good for small-medium teams | Large teams with RabbitMQ expertise |

---

## Q8: RabbitMQ Performance Tuning

### Q: How do you tune RabbitMQ for production performance?

**Answer:**

### Connection & Channel Management

```typescript
// GOOD: One connection, multiple channels
class RabbitMQConnectionManager {
  private connection: amqplib.Connection;
  private channels: Map<string, amqplib.Channel> = new Map();

  async init() {
    this.connection = await amqplib.connect('amqp://localhost', {
      heartbeat: 30,         // Detect dead connections (seconds)
      frameMax: 0,           // No limit on frame size (default)
    });

    this.connection.on('error', (err) => {
      console.error('Connection error:', err.message);
    });

    this.connection.on('close', () => {
      console.error('Connection closed, reconnecting...');
      this.reconnect();
    });
  }

  async getChannel(name: string): Promise<amqplib.Channel> {
    if (!this.channels.has(name)) {
      const channel = await this.connection.createChannel();
      channel.on('error', (err) => {
        console.error(`Channel ${name} error:`, err.message);
        this.channels.delete(name);
      });
      this.channels.set(name, channel);
    }
    return this.channels.get(name)!;
  }

  private async reconnect() {
    this.channels.clear();
    await new Promise((r) => setTimeout(r, 5000));
    await this.init();
  }
}

// BAD: Opening a connection per message
async function badPattern(message: string) {
  const conn = await amqplib.connect('amqp://localhost');  // Expensive!
  const ch = await conn.createChannel();
  ch.sendToQueue('q', Buffer.from(message));
  await ch.close();    // Wasteful!
  await conn.close();  // Wasteful!
}
```

**Connection/Channel Rules:**
- **1 TCP connection per application instance** (not per request!)
- **Separate channels for** publishing vs consuming (avoids flow control interference)
- **Never open/close channels per message** — reuse them
- **Channel per thread/worker** if concurrent (channels are NOT thread-safe)

### Prefetch Tuning

```typescript
// Scenario: Long-running tasks (image processing, 5-30s each)
await channel.prefetch(1);   // Fair dispatch, prevent starvation

// Scenario: Fast tasks (logging, metrics, <100ms each)
await channel.prefetch(50);  // Batch for throughput

// Scenario: Mixed workload
await channel.prefetch(10);  // Reasonable default
```

### Message Batching

```typescript
// Batch publish for high throughput
async function batchPublish(channel: amqplib.ConfirmChannel, messages: any[]) {
  const publishPromises = messages.map((msg) =>
    new Promise<void>((resolve, reject) => {
      channel.publish('exchange', 'key', Buffer.from(JSON.stringify(msg)),
        { persistent: true },
        (err) => err ? reject(err) : resolve(),
      );
    }),
  );

  // Wait for all confirms
  await Promise.all(publishPromises);
  await channel.waitForConfirms();  // Batch confirm
}
```

### Flow Control

When RabbitMQ memory or disk thresholds are hit:
1. **Memory alarm** (default 40% of RAM): all publishing connections are **blocked**
2. **Disk alarm** (default 50MB free): all publishing connections are **blocked**

```typescript
// Detect flow control
connection.on('blocked', (reason) => {
  console.warn('Connection BLOCKED by broker:', reason);
  // Stop publishing, buffer locally, alert ops
});

connection.on('unblocked', () => {
  console.info('Connection unblocked, resuming publishing');
  // Resume publishing
});
```

### Key Metrics to Monitor

| Metric | Healthy Range | Alert Threshold |
|--------|---------------|-----------------|
| Queue depth | Stable or decreasing | Growing for >5 min |
| Message rate (publish) | Matches consume rate | Publish >> consume |
| Consumer utilization | >90% | <50% (consumers idle) |
| Unacked messages | < prefetch * consumers | Growing unbounded |
| Memory usage | <70% of limit | >80% |
| Disk free | >1GB | <500MB |
| File descriptors | <80% of limit | >90% |
| Connection count | Stable | Sudden spike |
| Channel count | < 10 per connection | >100 per connection |

### Monitoring Stack

```
RabbitMQ ──→ Prometheus Plugin ──→ Prometheus ──→ Grafana Dashboard
   │
   └──→ Management UI (port 15672) — for debugging, NOT production monitoring
```

```bash
# Enable Prometheus plugin
rabbitmq-plugins enable rabbitmq_prometheus

# Key Prometheus metrics
rabbitmq_queue_messages              # Total messages in queue
rabbitmq_queue_messages_ready        # Ready to deliver
rabbitmq_queue_messages_unacked      # Delivered but not acked
rabbitmq_queue_consumers             # Consumer count
rabbitmq_channel_messages_published  # Publish rate
rabbitmq_channel_messages_delivered  # Delivery rate
rabbitmq_channel_messages_acked      # Ack rate
```

---

## Q9: RabbitMQ with NestJS

### Q: How do you integrate RabbitMQ with NestJS? Show different approaches.

**Answer:**

There are three main approaches, each with different levels of control:

### Approach 1: @nestjs/microservices (Built-in Transport)

Simple but limited — no exchange control, no DLQ.

```typescript
// main.ts — Microservice setup
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // HTTP server
  const app = await NestFactory.create(AppModule);

  // RabbitMQ microservice transport
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://user:pass@localhost:5672'],
      queue: 'orders_queue',
      queueOptions: {
        durable: true,
      },
      prefetchCount: 10,
      noAck: false,           // Manual ack
      persistent: true,
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}

// orders.controller.ts — Consumer
import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';

@Controller()
export class OrdersController {
  // Request/Reply pattern (waits for response)
  @MessagePattern('get_order')
  async getOrder(@Payload() data: { orderId: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const order = await this.orderService.findById(data.orderId);
      channel.ack(originalMsg);
      return order;  // Sent back as reply
    } catch (error) {
      channel.nack(originalMsg, false, false);
      throw error;
    }
  }

  // Fire-and-forget pattern (no response expected)
  @EventPattern('order_created')
  async handleOrderCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.notificationService.sendOrderConfirmation(data);
      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg, false, true);  // Requeue for retry
    }
  }
}

// Producer (from another service)
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class OrderProducerService {
  constructor(
    @Inject('ORDER_SERVICE') private readonly client: ClientProxy,
  ) {}

  // Request/Reply
  async getOrder(orderId: string) {
    return this.client.send('get_order', { orderId }).toPromise();
  }

  // Fire-and-forget
  async emitOrderCreated(order: any) {
    this.client.emit('order_created', order);
  }
}

// Module registration
@Module({
  imports: [
    ClientsModule.register([{
      name: 'ORDER_SERVICE',
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://user:pass@localhost:5672'],
        queue: 'orders_queue',
        queueOptions: { durable: true },
      },
    }]),
  ],
})
export class OrderModule {}
```

### Approach 2: @golevelup/nestjs-rabbitmq (Advanced, Recommended)

Full exchange control, multiple consumers, DLQ support, decorator-based.

```typescript
// app.module.ts
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

@Module({
  imports: [
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      useFactory: (configService: ConfigService) => ({
        exchanges: [
          { name: 'events', type: 'topic', options: { durable: true } },
          { name: 'tasks', type: 'direct', options: { durable: true } },
          { name: 'dlx', type: 'direct', options: { durable: true } },
        ],
        uri: configService.get<string>('RABBITMQ_URI'),
        connectionInitOptions: { wait: true, timeout: 10000 },
        channels: {
          'channel-publish': { prefetchCount: 50, default: true },
          'channel-consume': { prefetchCount: 10 },
        },
        enableControllerDiscovery: true,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}

// order.consumer.ts
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class OrderConsumer {
  @RabbitSubscribe({
    exchange: 'events',
    routingKey: 'order.*.created',
    queue: 'order_created_handler',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'dead.order_created_handler',
      },
      channel: 'channel-consume',
    },
  })
  async handleOrderCreated(msg: OrderCreatedEvent) {
    try {
      await this.notificationService.sendConfirmation(msg);
      // Return value is auto-acked (no explicit ack needed)
    } catch (error) {
      if (isRetryable(error)) {
        return new Nack(true);   // Requeue
      }
      return new Nack(false);    // Dead letter
    }
  }

  @RabbitSubscribe({
    exchange: 'tasks',
    routingKey: 'generate_report',
    queue: 'report_generation',
    queueOptions: {
      durable: true,
      arguments: {
        'x-queue-type': 'quorum',
        'x-delivery-limit': 3,
        'x-dead-letter-exchange': 'dlx',
      },
    },
  })
  async handleReportGeneration(msg: ReportRequest) {
    const report = await this.reportService.generate(msg);
    return report;  // Auto-acked
  }
}

// order.producer.ts
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class OrderProducer {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publishOrderCreated(order: Order) {
    await this.amqpConnection.publish('events', 'order.us.created', {
      orderId: order.id,
      userId: order.userId,
      total: order.total,
      createdAt: new Date().toISOString(),
    }, {
      persistent: true,
      messageId: `order-${order.id}-created`,
      timestamp: Date.now(),
    });
  }

  // RPC with timeout
  async requestReport(params: ReportRequest): Promise<Report> {
    return this.amqpConnection.request<Report>({
      exchange: 'tasks',
      routingKey: 'generate_report',
      payload: params,
      timeout: 30000,
    });
  }
}
```

### Approach 3: Raw amqplib (Maximum Control)

For complex scenarios where decorator libraries are insufficient.

```typescript
// rabbitmq.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqplib from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqplib.Connection;
  private publishChannel: amqplib.ConfirmChannel;
  private consumeChannel: amqplib.Channel;

  async onModuleInit() {
    this.connection = await amqplib.connect(process.env.RABBITMQ_URI);

    this.connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });

    this.connection.on('close', () => {
      console.warn('RabbitMQ connection closed, reconnecting...');
      setTimeout(() => this.onModuleInit(), 5000);
    });

    this.publishChannel = await this.connection.createConfirmChannel();
    this.consumeChannel = await this.connection.createChannel();

    await this.setupTopology();
    await this.startConsumers();
  }

  private async setupTopology() {
    // Exchanges
    await this.publishChannel.assertExchange('events', 'topic', { durable: true });
    await this.publishChannel.assertExchange('dlx', 'direct', { durable: true });

    // Main queue with DLX
    await this.consumeChannel.assertQueue('order_processing', {
      durable: true,
      arguments: {
        'x-queue-type': 'quorum',
        'x-delivery-limit': 5,
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'dead.order_processing',
      },
    });
    await this.consumeChannel.bindQueue('order_processing', 'events', 'order.#');

    // DLQ
    await this.consumeChannel.assertQueue('order_processing_dlq', { durable: true });
    await this.consumeChannel.bindQueue('order_processing_dlq', 'dlx', 'dead.order_processing');
  }

  private async startConsumers() {
    await this.consumeChannel.prefetch(10);

    await this.consumeChannel.consume('order_processing', async (msg) => {
      if (!msg) return;

      try {
        const order = JSON.parse(msg.content.toString());
        await this.processOrder(order);
        this.consumeChannel.ack(msg);
      } catch (error) {
        this.consumeChannel.nack(msg, false, false);  // To DLQ
      }
    }, { noAck: false });
  }

  async publish(routingKey: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.publishChannel.publish(
        'events',
        routingKey,
        Buffer.from(JSON.stringify(data)),
        { persistent: true, contentType: 'application/json' },
        (err) => err ? reject(err) : resolve(),
      );
    });
  }

  async onModuleDestroy() {
    await this.consumeChannel?.close();
    await this.publishChannel?.close();
    await this.connection?.close();
  }
}
```

### Health Check

```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthCheckError, HealthIndicatorResult } from '@nestjs/terminus';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
  constructor(private readonly amqpConnection: AmqpConnection) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const channel = this.amqpConnection.channel;
      // Simple check: try to assert a known queue (idempotent)
      await channel.checkQueue('health_check_queue');
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'RabbitMQ health check failed',
        this.getStatus(key, false, { error: (error as Error).message }),
      );
    }
  }
}
```

### Approach Comparison

| Feature | @nestjs/microservices | @golevelup/nestjs-rabbitmq | Raw amqplib |
|---------|----------------------|---------------------------|-------------|
| Ease of use | High | High | Low |
| Exchange control | No | Yes | Full |
| Multiple exchanges | No | Yes | Yes |
| Topic routing | No | Yes | Yes |
| DLQ setup | Manual | Declarative | Manual |
| Publisher confirms | No | Yes | Yes |
| RPC support | Built-in | Built-in | Manual |
| Quorum queues | No | Yes | Yes |
| Recommended for | Simple pub/sub | Most production apps | Complex custom scenarios |

---

## Q10: RabbitMQ Security

### Q: How do you secure RabbitMQ in production?

**Answer:**

### Authentication

RabbitMQ supports multiple authentication backends:

| Method | Use Case |
|--------|----------|
| Internal (default) | Small setups, development |
| LDAP/Active Directory | Enterprise SSO |
| OAuth 2.0 (JWT) | Modern microservices |
| x509 certificates | Mutual TLS |

### Authorization (Permissions)

Permissions are per-vhost with three operations:

| Permission | Controls |
|------------|----------|
| **configure** | Create/delete exchanges and queues |
| **write** | Publish to exchanges, bind queues |
| **read** | Consume from queues, bind queues, get messages |

```bash
# Grant permissions using CLI
# rabbitmqctl set_permissions -p <vhost> <user> <configure> <write> <read>

# App user: can only publish and consume, NOT create/delete
rabbitmqctl set_permissions -p /production app_user "" "^(events|tasks)$" "^(order_|notification_)"

# Admin: full access
rabbitmqctl set_permissions -p /production admin_user ".*" ".*" ".*"
```

### Virtual Hosts (Multi-Tenancy)

```bash
# Create separate vhosts for environments or tenants
rabbitmqctl add_vhost /production
rabbitmqctl add_vhost /staging
rabbitmqctl add_vhost /tenant-acme
rabbitmqctl add_vhost /tenant-globex

# Each vhost is completely isolated:
# - Separate exchanges, queues, bindings
# - Separate user permissions
# - Separate policies
```

### TLS/SSL Configuration

```typescript
// Secure connection with TLS
import * as amqplib from 'amqplib';
import * as fs from 'fs';

async function secureConnect() {
  const connection = await amqplib.connect({
    protocol: 'amqps',            // Note: amqps (with s)
    hostname: 'rabbitmq.production.internal',
    port: 5671,                    // TLS port (not 5672)
    username: process.env.RABBITMQ_USER,
    password: process.env.RABBITMQ_PASS,
    vhost: '/production',
    heartbeat: 30,
  }, {
    // TLS options
    ca: [fs.readFileSync('/certs/ca.pem')],
    cert: fs.readFileSync('/certs/client-cert.pem'),   // Mutual TLS
    key: fs.readFileSync('/certs/client-key.pem'),     // Mutual TLS
    rejectUnauthorized: true,
  });

  return connection;
}

// NestJS module configuration
RabbitMQModule.forRoot(RabbitMQModule, {
  uri: 'amqps://user:pass@rabbitmq.production.internal:5671/production',
  connectionInitOptions: {
    wait: true,
    timeout: 10000,
  },
});
```

### Security Checklist for Production

```
Authentication:
  ✓ Change default guest/guest credentials (only works on localhost by default)
  ✓ Use strong passwords or certificate-based auth
  ✓ Disable guest user: rabbitmqctl delete_user guest

Authorization:
  ✓ Principle of least privilege — apps only get needed permissions
  ✓ Separate users per service (not shared credentials)
  ✓ Use vhosts to isolate environments/tenants

Encryption:
  ✓ TLS for client connections (port 5671)
  ✓ TLS for inter-node clustering (Erlang distribution)
  ✓ TLS for management UI (port 15671)

Network:
  ✓ RabbitMQ in private subnet (no public access)
  ✓ Security groups: only allow app servers on 5671
  ✓ Management UI: restrict to VPN/bastion host only
  ✓ Disable management UI in production if not needed

Secrets:
  ✓ Credentials in environment variables or secrets manager
  ✓ Never hardcode connection strings
  ✓ Rotate credentials periodically
  ✓ Use AWS Secrets Manager / Vault for credential rotation
```

---

## Q11: RabbitMQ vs Kafka — Interview Decision Framework

### Q: Your team needs a messaging solution. How do you decide between RabbitMQ and Kafka?

**Answer:**

### Detailed Comparison

| Dimension | RabbitMQ | Kafka |
|-----------|----------|-------|
| **Architecture** | Smart broker, dumb consumer | Dumb broker (append-only log), smart consumer |
| **Protocol** | AMQP 0-9-1 (binary) | Custom binary over TCP |
| **Message Model** | Queue (consumed = removed) | Log (consumed = offset advances, message retained) |
| **Ordering** | Per-queue FIFO | Per-partition FIFO |
| **Routing** | Exchanges (direct, topic, fanout, headers) | Topic + partition key only |
| **Throughput** | ~50K msg/s per node | ~1M+ msg/s per broker |
| **Latency** | Sub-millisecond | Low milliseconds |
| **Replay** | No (once consumed, gone) | Yes (seek to any offset) |
| **Consumer Groups** | Competing consumers (ad-hoc) | Native consumer groups with rebalancing |
| **Retention** | Until consumed or TTL | Time or size-based (days/weeks) |
| **Priority Queues** | Native support | Not supported |
| **Request/Reply** | Native (correlation ID) | Awkward to implement |
| **Complex Routing** | Excellent (topic patterns, headers) | Limited (topic + key) |
| **Dead Letter** | Built-in DLX | No native DLQ (manual implementation) |
| **Delivery** | At-most-once, at-least-once | At-least-once, exactly-once (transactions) |
| **Scaling** | Add consumers (vertical per queue) | Add partitions (horizontal) |
| **Ops Complexity** | Medium (Erlang runtime) | High (ZooKeeper/KRaft, partition management) |
| **Message Size** | Optimized for small (<1MB) | Optimized for small, handles larger |

### Decision Framework

```
┌─────────────────────────────────────────────────────────────────┐
│                    Choose Your Messaging System                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Need message replay / event sourcing?                           │
│  ├─ YES → Kafka                                                  │
│  └─ NO ↓                                                         │
│                                                                   │
│  Need complex routing (topic patterns, headers)?                 │
│  ├─ YES → RabbitMQ                                               │
│  └─ NO ↓                                                         │
│                                                                   │
│  Need >500K msg/s sustained throughput?                          │
│  ├─ YES → Kafka                                                  │
│  └─ NO ↓                                                         │
│                                                                   │
│  Need priority queues or request/reply?                          │
│  ├─ YES → RabbitMQ                                               │
│  └─ NO ↓                                                         │
│                                                                   │
│  Need strict ordering with high throughput?                      │
│  ├─ YES → Kafka (partition key ordering)                         │
│  └─ NO ↓                                                         │
│                                                                   │
│  Team familiar with Erlang/AMQP or Java/Kafka?                  │
│  ├─ AMQP → RabbitMQ                                              │
│  ├─ Kafka → Kafka                                                │
│  └─ Neither → RabbitMQ (simpler to start)                        │
│                                                                   │
│  Moderate volume + task distribution?                            │
│  └─ RabbitMQ                                                     │
│                                                                   │
│  Event streaming + analytics pipeline?                           │
│  └─ Kafka                                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Interview Scenario: "Design a notification system — RabbitMQ or Kafka?"

**Recommended Answer:**

"I would use **RabbitMQ** for the notification system. Here's my reasoning:

1. **Complex routing** — Notifications need routing by type (email, SMS, push), urgency, and user preference. RabbitMQ's topic exchange handles `notification.email.urgent` or `notification.push.#` patterns naturally. Kafka would require separate topics or consumer-side filtering.

2. **Priority** — Urgent notifications (password reset, 2FA) must be processed before bulk marketing emails. RabbitMQ has native priority queues. Kafka doesn't.

3. **No replay needed** — Once a notification is sent, we don't need to re-send it. Kafka's retention is wasted here.

4. **Dead letter handling** — Failed notifications (invalid email, rate-limited SMS) need DLQ + retry. RabbitMQ DLX is built-in. Kafka requires a separate DLQ topic and manual implementation.

5. **Volume** — Notification systems typically handle thousands to tens of thousands per second, well within RabbitMQ's range.

However, I would **pair it with Kafka** for the **event pipeline** — tracking notification events (sent, delivered, opened, clicked) for analytics and audit. That data needs retention, replay capability, and feeds into the analytics pipeline."

### Hybrid Architecture (Real-World Pattern)

```
User Action
    │
    ├──→ Kafka (Event Stream)           ← Event sourcing, analytics, audit
    │      │
    │      └──→ Notification Decider    ← Reads events, decides what to notify
    │             │
    │             └──→ RabbitMQ         ← Task distribution with routing + priority
    │                    │
    │                    ├──→ Email Workers (priority queue)
    │                    ├──→ SMS Workers (rate-limited)
    │                    └──→ Push Workers (batch-optimized)
    │
    └──→ RabbitMQ (Task Queue)          ← Direct task processing (PDF, reports)
```

---

## Q12: RabbitMQ Design Interview Questions

### Q: Design a notification system with priority handling.

**Answer:**

```
┌───────────┐     ┌─────────────────┐     ┌──────────────────────────────┐
│ API/Event │────→│ Topic Exchange   │────→│ Queues by type + priority    │
│  Source   │     │ "notifications"  │     │                              │
└───────────┘     └─────────────────┘     │ ┌────────────────────────┐   │
                         │                │ │ email_high (priority=9) │──→ Email Worker
                         │                │ └────────────────────────┘   │
                         │                │ ┌────────────────────────┐   │
                         │                │ │ email_low (priority=1)  │──→ Email Worker
                         │                │ └────────────────────────┘   │
                         │                │ ┌────────────────────────┐   │
                         │                │ │ sms_queue               │──→ SMS Worker
                         │                │ └────────────────────────┘   │
                         │                │ ┌────────────────────────┐   │
                         │                │ │ push_queue              │──→ Push Worker
                         │                │ └────────────────────────┘   │
                         │                └──────────────────────────────┘
                         │
                    Routing keys:
                    notification.email.high
                    notification.email.low
                    notification.sms.*
                    notification.push.*
```

```typescript
// Notification system with priority
async function setupNotificationSystem() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();

  // Exchange
  await channel.assertExchange('notifications', 'topic', { durable: true });
  await channel.assertExchange('notification_dlx', 'direct', { durable: true });

  // High-priority email queue
  await channel.assertQueue('email_high_priority', {
    durable: true,
    arguments: {
      'x-max-priority': 10,
      'x-queue-type': 'quorum',
      'x-delivery-limit': 3,
      'x-dead-letter-exchange': 'notification_dlx',
      'x-dead-letter-routing-key': 'dead.email',
    },
  });
  await channel.bindQueue('email_high_priority', 'notifications', 'notification.email.high');

  // Low-priority email queue
  await channel.assertQueue('email_low_priority', {
    durable: true,
    arguments: {
      'x-max-priority': 5,
      'x-queue-type': 'quorum',
      'x-delivery-limit': 5,
      'x-dead-letter-exchange': 'notification_dlx',
    },
  });
  await channel.bindQueue('email_low_priority', 'notifications', 'notification.email.low');

  // SMS queue with rate limiting via prefetch
  await channel.assertQueue('sms_queue', {
    durable: true,
    arguments: {
      'x-queue-type': 'quorum',
      'x-delivery-limit': 3,
      'x-dead-letter-exchange': 'notification_dlx',
      'x-dead-letter-routing-key': 'dead.sms',
    },
  });
  await channel.bindQueue('sms_queue', 'notifications', 'notification.sms.*');

  // DLQ for all failed notifications
  await channel.assertQueue('notification_dlq', { durable: true });
  await channel.bindQueue('notification_dlq', 'notification_dlx', 'dead.email');
  await channel.bindQueue('notification_dlq', 'notification_dlx', 'dead.sms');

  // Publish notifications
  const sendNotification = (type: string, priority: 'high' | 'low', payload: any) => {
    const routingKey = `notification.${type}.${priority}`;
    const msgPriority = priority === 'high' ? 9 : 1;

    channel.publish('notifications', routingKey, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      priority: msgPriority,
      messageId: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      headers: {
        'x-notification-type': type,
        'x-priority-level': priority,
      },
    });
  };

  // Password reset — HIGH priority email
  sendNotification('email', 'high', {
    to: 'user@example.com',
    template: 'password_reset',
    data: { resetLink: 'https://...' },
  });

  // Marketing — LOW priority email
  sendNotification('email', 'low', {
    to: 'user@example.com',
    template: 'weekly_digest',
    data: { articles: [...] },
  });
}
```

### Q: Design an email sending pipeline with retry and DLQ.

**Answer:**

```typescript
async function setupEmailPipeline() {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createConfirmChannel();

  // Exchanges
  await channel.assertExchange('email', 'direct', { durable: true });
  await channel.assertExchange('email_retry', 'direct', { durable: true });
  await channel.assertExchange('email_dlx', 'direct', { durable: true });

  // Main processing queue
  await channel.assertQueue('email_send', {
    durable: true,
    arguments: {
      'x-queue-type': 'quorum',
      'x-delivery-limit': 5,
      'x-dead-letter-exchange': 'email_retry',
      'x-dead-letter-routing-key': 'retry',
    },
  });
  await channel.bindQueue('email_send', 'email', 'send');

  // Retry queues with increasing delays
  const retryDelays = [
    { name: 'email_retry_10s', ttl: 10000 },
    { name: 'email_retry_30s', ttl: 30000 },
    { name: 'email_retry_2m',  ttl: 120000 },
    { name: 'email_retry_10m', ttl: 600000 },
  ];

  for (const { name, ttl } of retryDelays) {
    await channel.assertQueue(name, {
      durable: true,
      arguments: {
        'x-message-ttl': ttl,
        'x-dead-letter-exchange': 'email',
        'x-dead-letter-routing-key': 'send',  // Back to main queue
      },
    });
  }

  // Permanent failure queue
  await channel.assertQueue('email_failed', { durable: true });
  await channel.bindQueue('email_failed', 'email_dlx', 'dead');

  // Consumer
  await channel.prefetch(5);
  await channel.consume('email_send', async (msg) => {
    if (!msg) return;

    const email = JSON.parse(msg.content.toString());
    const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) as number;

    try {
      await sendEmail(email);
      console.log(`Email sent to ${email.to}`);
      channel.ack(msg);
    } catch (error) {
      const err = error as Error;

      // Permanent failures — don't retry
      if (isPermanentFailure(err)) {
        console.error(`Permanent failure for ${email.to}: ${err.message}`);
        channel.publish('email_dlx', 'dead', msg.content, {
          persistent: true,
          headers: {
            ...msg.properties.headers,
            'x-failure-reason': err.message,
            'x-failure-type': 'permanent',
          },
        });
        channel.ack(msg);
        return;
      }

      // Transient failure — retry with backoff
      if (retryCount < retryDelays.length) {
        const retryQueue = retryDelays[retryCount].name;
        console.log(`Retry ${retryCount + 1} for ${email.to}, delay queue: ${retryQueue}`);

        channel.sendToQueue(retryQueue, msg.content, {
          persistent: true,
          headers: {
            ...msg.properties.headers,
            'x-retry-count': retryCount + 1,
            'x-last-error': err.message,
          },
        });
        channel.ack(msg);
      } else {
        // Exhausted retries
        console.error(`Email to ${email.to} failed after ${retryCount} retries`);
        channel.publish('email_dlx', 'dead', msg.content, {
          persistent: true,
          headers: {
            ...msg.properties.headers,
            'x-failure-reason': `Exhausted ${retryCount} retries: ${err.message}`,
            'x-failure-type': 'exhausted_retries',
          },
        });
        channel.ack(msg);
      }
    }
  }, { noAck: false });
}

function isPermanentFailure(error: Error): boolean {
  const permanent = [
    'Invalid email address',
    'Mailbox does not exist',
    'Domain not found',
    'Blocked by recipient',
  ];
  return permanent.some((msg) => error.message.includes(msg));
}
```

### Q: How would you handle a poison message that keeps failing?

**Answer:**

"A poison message is one that consistently causes consumer failures. Here's my multi-layered defense:

1. **Delivery limit (quorum queues):** Set `x-delivery-limit: 5`. After 5 redeliveries, the message is automatically dead-lettered. This is the simplest and most reliable defense.

2. **Application-level retry count:** Track retries in message headers. After N retries, route to a parking lot queue instead of requeuing.

3. **Poison message detection:** If a message causes an unhandled exception (not a business error), log the full message content and stack trace, then nack without requeue immediately.

4. **Circuit breaker:** If multiple consecutive messages fail, the consumer likely has a dependency issue (database down, API unavailable). Pause consumption and alert ops.

5. **DLQ monitoring:** Alert when DLQ depth exceeds a threshold. Have a tool/admin UI to inspect, replay, or discard parked messages.

6. **Idempotent processing:** Even if a poison message is redelivered, ensure the consumer can handle duplicates safely."

### Q: How do you monitor and alert on queue depth?

**Answer:**

```typescript
// Monitoring service (runs on a schedule)
@Injectable()
export class RabbitMQMonitoringService {
  private readonly logger = new Logger(RabbitMQMonitoringService.name);

  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly alertService: AlertService,
  ) {}

  @Cron('*/30 * * * * *')  // Every 30 seconds
  async checkQueueHealth() {
    const channel = this.amqpConnection.channel;
    const queues = [
      { name: 'order_processing', maxDepth: 1000, criticalDepth: 5000 },
      { name: 'email_send', maxDepth: 5000, criticalDepth: 20000 },
      { name: 'email_failed', maxDepth: 50, criticalDepth: 200 },
      { name: 'parking_lot', maxDepth: 10, criticalDepth: 50 },
    ];

    for (const queue of queues) {
      try {
        const { messageCount, consumerCount } = await channel.checkQueue(queue.name);

        // No consumers — immediate alert
        if (consumerCount === 0 && messageCount > 0) {
          await this.alertService.critical({
            alert: 'NO_CONSUMERS',
            queue: queue.name,
            messageCount,
          });
        }

        // Depth warnings
        if (messageCount > queue.criticalDepth) {
          await this.alertService.critical({
            alert: 'QUEUE_DEPTH_CRITICAL',
            queue: queue.name,
            depth: messageCount,
            threshold: queue.criticalDepth,
          });
        } else if (messageCount > queue.maxDepth) {
          await this.alertService.warn({
            alert: 'QUEUE_DEPTH_WARNING',
            queue: queue.name,
            depth: messageCount,
            threshold: queue.maxDepth,
          });
        }

        // DLQ should be near-empty
        if (queue.name.includes('failed') || queue.name.includes('parking')) {
          if (messageCount > 0) {
            await this.alertService.warn({
              alert: 'DLQ_NOT_EMPTY',
              queue: queue.name,
              depth: messageCount,
            });
          }
        }
      } catch (error) {
        this.logger.error(`Failed to check queue ${queue.name}:`, error);
      }
    }
  }
}
```

---

## Quick Reference

### RabbitMQ CLI Commands Cheat Sheet

```bash
# Cluster & Node
rabbitmqctl cluster_status              # Show cluster state
rabbitmqctl stop_app                     # Stop RabbitMQ app (keep Erlang)
rabbitmqctl start_app                    # Start RabbitMQ app
rabbitmqctl reset                        # Reset node (removes all data!)

# Users & Permissions
rabbitmqctl add_user <user> <pass>
rabbitmqctl set_user_tags <user> administrator
rabbitmqctl set_permissions -p <vhost> <user> ".*" ".*" ".*"
rabbitmqctl list_users
rabbitmqctl list_permissions -p <vhost>

# Virtual Hosts
rabbitmqctl add_vhost <name>
rabbitmqctl delete_vhost <name>
rabbitmqctl list_vhosts

# Queues & Messages
rabbitmqctl list_queues name messages consumers state
rabbitmqctl list_queues name messages_ready messages_unacknowledged
rabbitmqctl purge_queue <queue_name>     # Delete all messages
rabbitmqctl delete_queue <queue_name>

# Exchanges & Bindings
rabbitmqctl list_exchanges name type durable
rabbitmqctl list_bindings source destination routing_key

# Connections & Channels
rabbitmqctl list_connections user peer_host state
rabbitmqctl list_channels connection consumer_count messages_unacked

# Plugins
rabbitmq-plugins enable rabbitmq_management
rabbitmq-plugins enable rabbitmq_prometheus
rabbitmq-plugins enable rabbitmq_delayed_message_exchange
rabbitmq-plugins list
```

### Exchange Type Decision Tree

```
What routing behavior do you need?
│
├─ Every subscriber gets every message
│  └─→ FANOUT exchange
│
├─ Route to specific queue by exact key
│  └─→ DIRECT exchange
│
├─ Route by pattern with wildcards
│  └─→ TOPIC exchange (most flexible, slight overhead)
│
├─ Route by multiple header attributes
│  └─→ HEADERS exchange (rare, slower)
│
└─ Send to a known queue (no routing)
   └─→ Default exchange (sendToQueue)
```

### Configuration Best Practices

```
Queues:
  ✓ Always durable: true in production
  ✓ Use quorum queues for critical data
  ✓ Set x-dead-letter-exchange on all queues
  ✓ Set x-max-length as a safety net
  ✓ Set x-message-ttl to prevent unbounded growth
  ✓ Use x-delivery-limit on quorum queues

Producers:
  ✓ Publisher confirms (createConfirmChannel)
  ✓ persistent: true on all messages
  ✓ Set messageId for deduplication
  ✓ Set timestamp for debugging
  ✓ Set contentType: 'application/json'
  ✓ Handle connection/channel errors with reconnection

Consumers:
  ✓ Manual ack (noAck: false) — ALWAYS
  ✓ Set prefetch count (never 0/unlimited)
  ✓ Idempotent message processing
  ✓ Graceful shutdown: stop consuming, finish in-flight, then close

Cluster:
  ✓ Odd number of nodes (3 or 5) for quorum
  ✓ pause-minority partition handling
  ✓ HAProxy/NGINX in front for load balancing
  ✓ Monitor with Prometheus plugin + Grafana
```

### Monitoring Checklist

```
Queue Metrics:
  □ Queue depth (messages_ready)
  □ Unacked count (messages_unacked)
  □ Consumer count per queue
  □ Message rate (publish/deliver/ack per second)
  □ Queue memory usage

Node Metrics:
  □ Memory usage vs memory limit
  □ Disk free vs disk limit
  □ File descriptor usage
  □ Erlang process count
  □ Connection and channel count

Cluster Metrics:
  □ All nodes healthy
  □ Quorum queue leader distribution (balanced?)
  □ Network partition events
  □ Cluster link latency

Alerts:
  □ Queue depth exceeds threshold for >5 min
  □ No consumers on a queue with messages
  □ DLQ not empty
  □ Memory alarm triggered
  □ Disk alarm triggered
  □ Node unreachable
  □ Publisher confirms failing
```

### Common Interview Questions — Quick Answers

**Q: What happens if a consumer crashes before acking?**
A: Message is redelivered to another consumer (or the same one after restart). The `redelivered` flag is set to `true`. This is why idempotent processing is essential.

**Q: How do you handle duplicate messages?**
A: Use `messageId` for deduplication. Store processed message IDs in Redis/database with a TTL. Check before processing: if already seen, ack and skip.

**Q: What is the difference between a channel and a connection?**
A: A connection is a TCP socket. A channel is a virtual connection multiplexed over that socket. Use one TCP connection per app, multiple channels for concurrency. Channels are lightweight but NOT thread-safe.

**Q: Can you change a queue's properties after creation?**
A: No. You must delete and recreate it (or use a different queue name). Attempting to declare a queue with different properties causes a channel error (PRECONDITION_FAILED).

**Q: How do messages survive a broker restart?**
A: Two conditions: (1) Queue must be `durable: true`, (2) Message must be `persistent: true` (delivery_mode=2). Missing either one means messages are lost on restart.

**Q: What is the difference between push and pull in RabbitMQ?**
A: Push (`basic.consume`) is the standard — broker pushes messages to consumers. Pull (`basic.get`) polls one message at a time — inefficient, only for special cases. Always use push in production.

**Q: How does RabbitMQ handle back-pressure?**
A: Three mechanisms: (1) Prefetch limits how many messages a consumer holds, (2) Flow control blocks publishers when memory/disk alarms trigger, (3) `reject-publish` overflow policy rejects new messages when queue is full. Publisher confirms make the producer aware of back-pressure.

**Q: What happens when you publish to an exchange with no bound queues?**
A: The message is silently discarded — unless the `mandatory` flag is set, in which case the message is returned to the publisher via the `return` callback. Use `mandatory: true` in production to detect routing failures.

---

*Last updated: 2026-03-13*
