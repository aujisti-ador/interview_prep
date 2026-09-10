# Project 1: Real-Time Notification System (Scalable for 41M+ Users)

> **Stack**: NestJS + Kafka + Redis + WebSocket (Socket.io) + PostgreSQL + Bull Queue
> **Relevance**: Maps directly to Banglalink BL-Power experience (41M+ users). Top system design interview question.
> **Estimated Build Time**: 10-12 hours

---

## In 60 seconds

1. **Build this one first.** It is the closest thing in this repo to the work you already did at
   telecom scale, which means every part of it becomes a resume bullet you can defend.
2. **The core problem is fan-out:** one event has to reach many users, across several channels
   (push, SMS, email, in-app), when some of those channels are down.
3. **The three things that make this a senior project, not a tutorial:**
   - **Idempotency** — the same event arriving twice must not send two notifications
   - **Per-channel circuit breakers** — SMS being down must not stop push notifications
   - **The outbox pattern** — the notification is saved and published in one transaction
4. **The interview story this gives you:** "delivering N messages/day, holding p99 under 2s
   through provider outages." That sentence is the shape of a strong resume bullet.
5. **Do not skip the failure handling to get it working faster.** The retry logic and the dead
   letter queue *are* the project. A version that only works when everything is healthy
   demonstrates nothing.
6. **Write the README as you go**, not at the end. It is the artifact a hiring manager actually
   reads — see [../resume/02-linkedin-and-profiles.md](../resume/02-linkedin-and-profiles.md#7-making-two-repos-count).

**What to be able to explain afterwards:** why Kafka rather than a database table polled by a
cron; what happens when a user has 50,000 followers; and how you would know, at 3am, that
notifications had stopped.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Fan-out** | One event delivered to many recipients |
| **Channel** | A delivery route — push, SMS, email, in-app |
| **Idempotency key** | An id used to recognise and ignore a duplicate event |
| **Outbox pattern** | Save the event in the same DB transaction as the data; publish separately |
| **Circuit breaker** | Stop calling a failing provider for a while instead of retrying forever |
| **Dead letter queue** | Where permanently failing messages go, so they stop blocking the queue |
| **Retry with backoff** | Waiting longer between each attempt, with randomness added |
| **Bull queue** | A Redis-backed job queue for Node — used here for scheduled and retried sends |
| **WebSocket / Socket.io** | The live connection delivering in-app notifications |
| **Consumer group** | Kafka consumers sharing the work of a topic |
| **Delivery receipt** | Confirmation from a provider that a message actually arrived |
| **Throttling** | Limiting how many notifications one user can receive |

## What You'll Learn
- Fan-out notification patterns (push vs pull)
- Kafka for high-throughput event ingestion
- WebSocket for real-time delivery
- Redis for online user presence tracking
- Bull queues for async processing (email, SMS, push)
- Horizontal scaling with Redis adapter for Socket.io
- Rate limiting notifications to prevent spam

---

## System Architecture
```
┌──────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Trigger      │────▶│  Kafka      │────▶│  Notification    │
│  Services     │     │  (Ingest)   │     │  Processor       │
│ (Order, Auth, │     │             │     │  (NestJS Worker)  │
│  Marketing)   │     └─────────────┘     └────────┬─────────┘
└──────────────┘                                    │
                                          ┌─────────┼─────────┐
                                          │         │         │
                                    ┌─────▼──┐ ┌───▼────┐ ┌──▼─────┐
                                    │ In-App │ │ Push   │ │ Email/ │
                                    │ (WS)   │ │ (FCM)  │ │ SMS    │
                                    └────┬───┘ └───┬────┘ └───┬────┘
                                         │         │          │
                                    ┌────▼─────────▼──────────▼────┐
                                    │     Delivery Tracking DB      │
                                    │     (PostgreSQL + Redis)      │
                                    └──────────────────────────────┘
```

**How to read this diagram:**
- **Trigger Services** are any upstream microservice that generates a notification-worthy event (order placed, payment received, marketing campaign launched).
- **Kafka** acts as the central event bus -- decouples producers from consumers, provides durability, replay, and ordering guarantees.
- **Notification Processor** is the brain -- it consumes events, resolves templates, checks preferences, enforces rate limits, and routes to the correct delivery channel(s).
- **Delivery channels** (In-App via WebSocket, Push via FCM/APNs, Email/SMS) are independent and can fail without affecting each other.
- **Delivery Tracking DB** records every attempt and outcome for auditability and retry logic.

---

## Notification Flow

### Single User Notification (e.g., "Your order shipped")
```
1. Order Service publishes event:
   { type: "ORDER_SHIPPED", userId: "123", orderId: "456" }

2. Kafka topic "notification-triggers" receives event
   - Key: userId ("123") ensures ordering per user
   - Partition assignment: hash("123") % 20 = partition 7

3. Notification Processor consumes from partition 7:
   a. Idempotency check: has notificationId already been processed? (Redis SET lookup)
   b. Looks up user notification preferences (Redis cache → DB fallback)
   c. Renders notification from template:
      - Fetches template for "ORDER_SHIPPED" + user locale (bn/en)
      - Resolves variables: "Your order #{{orderId}} has shipped"
   d. Checks rate limits:
      - Redis INCR "rate-limit:notif:123" with EXPIRE
      - If count > 10/hour → drop or delay
   e. Routes to channels based on preference + online status:
      - In-app: Check Redis SET "online-users" → if userId present, push via WebSocket
      - Push: Enqueue to Bull "push-notifications" queue → FCM/APNs worker picks up
      - Email: Enqueue to Bull "email-notifications" queue → SES/SendGrid worker picks up
      - SMS: Enqueue to Bull "sms-notifications" queue → Twilio/BulkSMS worker picks up
   f. Writes notification record to PostgreSQL (status: "pending")
   g. Tracks delivery status per channel in delivery_log table

4. Delivery workers (Bull processors) execute:
   - Push worker: calls FCM API → gets delivery receipt → updates delivery_log
   - Email worker: calls SES API → gets messageId → updates delivery_log
   - SMS worker: calls Twilio API → gets sid → updates delivery_log

5. On success: notification status updated to "delivered"
   On failure: retry with exponential backoff (3 attempts) → DLQ → alert ops team
```

### Mass Notification (e.g., "System maintenance in 1 hour" to 41M users)
```
1. Admin triggers mass notification via admin API
   → Publishes campaign event to Kafka "mass-notifications" topic
   → Campaign record created in PostgreSQL (status: "in_progress")

2. Fan-out service consumes from "mass-notifications":
   a. Reads segment filter from campaign record (e.g., "all active users" or "users in Dhaka")
   b. Fetches user IDs from DB in batches of 10,000 using cursor-based pagination
   c. For each batch of 10,000 users:
      - Creates 10,000 individual notification events
      - Publishes to Kafka "notification-triggers" topic in bulk
      - Key = userId for each event → even distribution across 20 partitions
   d. Updates campaign progress: delivered_count += batch_size

3. Multiple Notification Processor instances (20+ consumers in consumer group) handle the load
   - Each consumer reads from assigned partitions
   - Processing is parallel across partitions, sequential within a partition

4. Throughput estimation:
   - Each processor handles ~2,500 events/second
   - 20 processors = ~50,000 notifications/second total
   - 41M users / 50K/s = ~820 seconds = ~14 minutes for full fan-out

5. Progress tracking:
   - Campaign dashboard polls campaign table for delivered_count
   - Final status: "completed" when delivered_count = total_recipients

6. Backpressure handling:
   - If consumers lag behind, Kafka retains messages (7-day retention)
   - Consumer lag monitored via Kafka consumer group metrics
   - Alert if lag exceeds threshold (e.g., > 100K messages behind)
```

---

## Directory Structure
```
notification-system/
├── apps/
│   ├── api-gateway/              # REST/GraphQL API for clients
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── notifications/
│   │   │   │   ├── notifications.controller.ts    # POST /notifications/send
│   │   │   │   ├── notifications.service.ts       # Validates & publishes to Kafka
│   │   │   │   └── dto/
│   │   │   │       └── send-notification.dto.ts
│   │   │   ├── campaigns/
│   │   │   │   ├── campaigns.controller.ts        # POST /campaigns (mass notifs)
│   │   │   │   └── campaigns.service.ts
│   │   │   └── main.ts
│   │   └── Dockerfile
│   │
│   ├── notification-processor/   # Kafka consumer, routing logic
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── consumers/
│   │   │   │   ├── notification.consumer.ts       # Consumes "notification-triggers"
│   │   │   │   └── mass-notification.consumer.ts  # Consumes "mass-notifications"
│   │   │   ├── services/
│   │   │   │   ├── delivery-router.service.ts     # Routes to correct channel
│   │   │   │   ├── rate-limiter.service.ts        # Redis-based rate limiting
│   │   │   │   ├── template-renderer.service.ts   # Resolves notification templates
│   │   │   │   └── preference.service.ts          # User preference lookup
│   │   │   └── main.ts
│   │   └── Dockerfile
│   │
│   ├── websocket-gateway/        # Socket.io server for real-time
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── gateway/
│   │   │   │   ├── notification.gateway.ts        # Socket.io gateway handler
│   │   │   │   └── presence.service.ts            # Track user online status in Redis
│   │   │   └── main.ts
│   │   └── Dockerfile
│   │
│   └── delivery-workers/         # Bull queue processors
│       ├── src/
│       │   ├── app.module.ts
│       │   ├── processors/
│       │   │   ├── push.processor.ts              # FCM/APNs delivery
│       │   │   ├── email.processor.ts             # SES/SendGrid delivery
│       │   │   └── sms.processor.ts               # Twilio/BulkSMS delivery
│       │   ├── services/
│       │   │   └── delivery-tracker.service.ts    # Updates delivery_log in DB
│       │   └── main.ts
│       └── Dockerfile
│
├── libs/
│   ├── shared/                   # DTOs, events, constants
│   │   ├── events/
│   │   │   ├── notification-trigger.event.ts
│   │   │   ├── mass-notification.event.ts
│   │   │   └── delivery-status.event.ts
│   │   ├── interfaces/
│   │   │   ├── notification.interface.ts
│   │   │   └── delivery-channel.interface.ts
│   │   └── constants/
│   │       ├── kafka-topics.ts
│   │       └── notification-types.ts
│   │
│   ├── notification-templates/   # Handlebars/Mustache templates
│   │   ├── order-shipped.hbs
│   │   ├── payment-received.hbs
│   │   ├── security-alert.hbs
│   │   └── promo-campaign.hbs
│   │
│   └── delivery-adapters/        # External provider adapters
│       ├── fcm.adapter.ts        # Firebase Cloud Messaging
│       ├── ses.adapter.ts        # AWS Simple Email Service
│       ├── twilio.adapter.ts     # Twilio SMS
│       └── bulksms-bd.adapter.ts # Local BD SMS provider
│
├── docker-compose.yml
└── infrastructure/
    └── k8s/                      # Helm charts for production
        ├── api-gateway/
        ├── notification-processor/
        ├── websocket-gateway/
        └── delivery-workers/
```

---

## Docker Compose (Pseudo Config)
```yaml
version: '3.8'
services:
  # --- Infrastructure ---
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka-1:
    image: confluentinc/cp-kafka:7.5.0
    depends_on: [zookeeper]
    ports: ["9092:9092"]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-1:9092
      KAFKA_NUM_PARTITIONS: 20
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2

  kafka-2:
    image: confluentinc/cp-kafka:7.5.0
    depends_on: [zookeeper]
    ports: ["9093:9093"]
    environment:
      KAFKA_BROKER_ID: 2
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-2:9093

  kafka-3:
    image: confluentinc/cp-kafka:7.5.0
    depends_on: [zookeeper]
    ports: ["9094:9094"]
    environment:
      KAFKA_BROKER_ID: 3
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-3:9094

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: notifications
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data

  # --- Tooling UIs ---
  redis-commander:
    image: rediscommander/redis-commander:latest
    environment:
      REDIS_HOSTS: local:redis:6379
    ports: ["8081:8081"]

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports: ["8080:8080"]
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka-1:9092,kafka-2:9093,kafka-3:9094

  # --- Application Services ---
  api-gateway:
    build: ./apps/api-gateway
    ports: ["3000:3000"]
    depends_on: [kafka-1, postgres]
    environment:
      KAFKA_BROKERS: kafka-1:9092,kafka-2:9093,kafka-3:9094
      DATABASE_URL: postgresql://app:secret@postgres:5432/notifications
      REDIS_URL: redis://redis:6379

  notification-processor:
    build: ./apps/notification-processor
    depends_on: [kafka-1, redis, postgres]
    environment:
      KAFKA_BROKERS: kafka-1:9092,kafka-2:9093,kafka-3:9094
      REDIS_URL: redis://redis:6379
      DATABASE_URL: postgresql://app:secret@postgres:5432/notifications
    deploy:
      replicas: 3                    # Scale consumers for parallelism

  websocket-gateway:
    build: ./apps/websocket-gateway
    ports: ["3001:3001"]
    depends_on: [redis]
    environment:
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-secret-key

  delivery-workers:
    build: ./apps/delivery-workers
    depends_on: [redis, postgres]
    environment:
      REDIS_URL: redis://redis:6379
      DATABASE_URL: postgresql://app:secret@postgres:5432/notifications
      FCM_SERVICE_ACCOUNT: /secrets/fcm.json
      SES_REGION: ap-southeast-1
      TWILIO_ACCOUNT_SID: ACxxxxx
      TWILIO_AUTH_TOKEN: xxxxx
    deploy:
      replicas: 5                    # More workers for delivery throughput

volumes:
  pgdata:
```

---

## Kafka Topics
```
Topics:

1. notification-triggers
   Purpose: Individual notification requests (one per user per event)
   Partitions: 20
   Key: userId (ensures ordering per user)
   Retention: 7 days
   Consumers: notification-processor consumer group

2. mass-notifications
   Purpose: Bulk campaign triggers (one event per campaign)
   Partitions: 5
   Key: campaignId
   Retention: 7 days
   Consumers: fan-out service within notification-processor

3. notification-delivery-status
   Purpose: Delivery confirmations and failures from workers
   Partitions: 10
   Key: notificationId
   Retention: 30 days (for auditing)
   Consumers: delivery tracker service

4. notification-dlq
   Purpose: Failed notifications for manual review/retry
   Partitions: 3
   Key: original notificationId
   Retention: 90 days
   Consumers: ops team tooling / retry scheduler
```

**Why 20 partitions for notification-triggers?**
- Each partition can be consumed by one consumer in a group
- 20 partitions allow scaling up to 20 parallel processor instances
- Key = userId ensures all notifications for a user land on the same partition (preserves ordering)
- Partition assignment: hash(userId) % 20

---

## Redis Data Structures
```
1. Online Users (presence tracking):
   Structure: SET "online-users"
   Members: { userId1, userId2, ... }
   Operations:
     SADD "online-users" "user-123"           # User connects
     SREM "online-users" "user-123"           # User disconnects
     SISMEMBER "online-users" "user-123"      # Check if online (O(1))

   Alternative (with socket mapping):
   Structure: HASH "ws-connections"
   Fields: { userId: "serverId:socketId" }
   Operations:
     HSET "ws-connections" "user-123" "ws-server-2:socket-abc"
     HGET "ws-connections" "user-123"         # Find which server user is on
     HDEL "ws-connections" "user-123"         # Cleanup on disconnect

   Server cleanup set (for crash recovery):
   Structure: SET "server:{serverId}:users"
   Members: all userIds connected to that server
   On server crash: SMEMBERS → bulk HDEL from ws-connections

2. User Preferences Cache:
   Structure: HASH "user-prefs:{userId}"
   Fields: { email: "true", sms: "false", push: "true", inApp: "true", locale: "bn" }
   TTL: 1 hour (auto-refresh from DB)
   Operations:
     HGETALL "user-prefs:user-123"            # Get all prefs
     HSET "user-prefs:user-123" "sms" "true"  # Update single pref

3. Rate Limiting (sliding window counter):
   Key: "rate-limit:notif:{userId}"
   Operations:
     result = INCR "rate-limit:notif:user-123"
     if result == 1: EXPIRE "rate-limit:notif:user-123" 3600  # 1 hour window
     if result > 10: REJECT (rate limit exceeded)

   Per-channel rate limits:
     "rate-limit:sms:user-123"   → max 3/day    (EXPIRE 86400)
     "rate-limit:push:user-123"  → max 5/hour   (EXPIRE 3600)
     "rate-limit:email:user-123" → max 20/day   (EXPIRE 86400)

4. Notification Count (unread badge):
   Key: "unread-count:{userId}"
   Operations:
     INCR "unread-count:user-123"             # New notification arrives
     GET "unread-count:user-123"              # Client polls badge count
     SET "unread-count:user-123" 0            # User taps "mark all read"

5. Idempotency Guard:
   Key: "processed-notif:{notificationId}"
   Operations:
     result = SETNX "processed-notif:notif-abc" "1"
     EXPIRE "processed-notif:notif-abc" 86400  # 24h dedup window
     if result == 0: SKIP (already processed)
```

---

## Database Schema
```sql
-- Core notifications table
-- Stores every notification sent to every user
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(255) NOT NULL,
    type            VARCHAR(50) NOT NULL,         -- 'ORDER_SHIPPED', 'PAYMENT_RECEIVED', 'PROMO'
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    data_json       JSONB DEFAULT '{}',           -- Extra payload (orderId, amount, etc.)
    channel         VARCHAR(20),                  -- 'websocket', 'push', 'email', 'sms'
    status          VARCHAR(20) DEFAULT 'pending',-- 'pending', 'delivered', 'read', 'failed'
    created_at      TIMESTAMP DEFAULT NOW(),
    read_at         TIMESTAMP
);

CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, status)
    WHERE status != 'read';                       -- Partial index for unread queries

-- Delivery tracking (one row per channel attempt)
-- A single notification can be delivered via multiple channels
CREATE TABLE delivery_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id     UUID NOT NULL REFERENCES notifications(id),
    channel             VARCHAR(20) NOT NULL,      -- 'websocket', 'push', 'email', 'sms'
    status              VARCHAR(20) NOT NULL,      -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
    provider_response   JSONB,                     -- Raw response from FCM/SES/Twilio
    attempt_count       INT DEFAULT 1,
    attempted_at        TIMESTAMP DEFAULT NOW(),
    delivered_at        TIMESTAMP
);

CREATE INDEX idx_delivery_notification ON delivery_log (notification_id);
CREATE INDEX idx_delivery_status ON delivery_log (status) WHERE status = 'failed';

-- User notification preferences
CREATE TABLE notification_preferences (
    user_id             VARCHAR(255) PRIMARY KEY,
    channel_email       BOOLEAN DEFAULT true,
    channel_sms         BOOLEAN DEFAULT false,     -- SMS costs money, default off
    channel_push        BOOLEAN DEFAULT true,
    channel_in_app      BOOLEAN DEFAULT true,
    quiet_hours_start   TIME DEFAULT '23:00',      -- BD local time
    quiet_hours_end     TIME DEFAULT '07:00',
    locale              VARCHAR(5) DEFAULT 'bn',   -- Bangla default
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Notification templates
CREATE TABLE notification_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type                VARCHAR(50) UNIQUE NOT NULL,-- 'ORDER_SHIPPED', 'PAYMENT_RECEIVED'
    channel             VARCHAR(20) NOT NULL,       -- Template varies by channel
    locale              VARCHAR(5) DEFAULT 'en',
    subject_template    VARCHAR(500),               -- For email subject line
    body_template       TEXT NOT NULL,              -- Handlebars: "Your order #{{orderId}} shipped"
    variables           JSONB,                      -- Schema of expected variables
    UNIQUE(type, channel, locale)
);

-- Mass notification campaigns
CREATE TABLE campaigns (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    segment_filter      JSONB NOT NULL,            -- { "region": "dhaka", "plan": "prepaid" }
    template_id         UUID REFERENCES notification_templates(id),
    total_recipients    BIGINT DEFAULT 0,
    delivered_count     BIGINT DEFAULT 0,
    failed_count        BIGINT DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'draft',-- 'draft', 'in_progress', 'completed', 'cancelled'
    created_by          VARCHAR(255),
    created_at          TIMESTAMP DEFAULT NOW(),
    completed_at        TIMESTAMP
);
```

---

## WebSocket Gateway -- Walkthrough

### Connection Lifecycle
```
1. CLIENT CONNECTS
   Client sends: ws://api.example.com/notifications?token=<JWT>

2. SERVER VALIDATES
   Gateway extracts JWT from query params
   → Verifies signature and expiration
   → Extracts userId from payload
   → If invalid: socket.disconnect() with error

3. REGISTER PRESENCE
   On successful auth:
   → client.join(`user:${userId}`)           # Socket.io room for targeted delivery
   → SADD "online-users" userId              # Redis presence tracking
   → HSET "ws-connections" userId "server-2:socket-abc"  # Socket mapping
   → SADD "server:server-2:users" userId     # Per-server tracking

4. DELIVER NOTIFICATION
   When notification processor needs to send to userId:
   → server.to(`user:${userId}`).emit("notification", payload)
   → Socket.io Redis adapter broadcasts to all servers
   → Only the server where user is connected actually delivers

5. CLIENT DISCONNECTS
   On disconnect event:
   → SREM "online-users" userId
   → HDEL "ws-connections" userId
   → SREM "server:server-2:users" userId
   → Optionally: update "last_seen" timestamp in DB

6. HEARTBEAT / KEEPALIVE
   Socket.io built-in ping/pong (default: 25s interval)
   If no pong received in 20s → consider disconnected → cleanup
```

### Horizontal Scaling with Redis Adapter
```
Problem:
  User-A is on WS-Server-1
  User-B is on WS-Server-2
  Notification processor sends to User-B via WS-Server-1 (random routing)

Without Redis adapter:
  WS-Server-1 has no socket for User-B → notification lost

With Redis adapter (@socket.io/redis-adapter):
  WS-Server-1 broadcasts "emit to room user:B" to Redis Pub/Sub
  → All WS servers subscribed to Redis Pub/Sub receive the broadcast
  → WS-Server-2 has User-B's socket → delivers the notification
  → WS-Server-1 and WS-Server-3 ignore (no matching socket)

Setup (pseudo):
  const pubClient = createClient({ url: REDIS_URL });
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Now server.to("user:B").emit("notification", data)
  // works across ALL server instances automatically
```

---

## Notification Template System

### Template Rendering Flow
```
1. Event arrives: { type: "ORDER_SHIPPED", userId: "123", data: { orderId: "456", trackingUrl: "..." } }

2. Look up template:
   SELECT body_template, subject_template, variables
   FROM notification_templates
   WHERE type = 'ORDER_SHIPPED'
     AND channel = 'email'          -- Channel-specific template
     AND locale = 'bn'              -- User's preferred locale

3. Template example (Handlebars):
   Subject: "অর্ডার #{{orderId}} শিপ হয়েছে"
   Body: "প্রিয় {{userName}}, আপনার অর্ডার #{{orderId}} শিপ করা হয়েছে।
          ট্র্যাকিং লিঙ্ক: {{trackingUrl}}"

4. Resolve variables:
   - orderId → from event.data.orderId
   - userName → fetched from user service (cached in Redis)
   - trackingUrl → from event.data.trackingUrl

5. Render: Handlebars.compile(template)(variables)
   Output: "প্রিয় Fazle, আপনার অর্ডার #456 শিপ করা হয়েছে।
            ট্র্যাকিং লিঙ্ক: https://track.example.com/456"

6. Channel-specific formatting:
   - In-app: Short title + body, no HTML
   - Push: Title (max 65 chars) + body (max 240 chars)
   - Email: Full HTML with header, footer, branding
   - SMS: Plain text, max 160 chars, no URL shortener (or use bit.ly)
```

---

## Rate Limiting Strategy

### Per-User Limits
```
Channel        Limit                Window     Redis Key Pattern
─────────────────────────────────────────────────────────────────
In-app         10 notifications     1 hour     rate-limit:inapp:{userId}
Push (FCM)     5 notifications      1 hour     rate-limit:push:{userId}
Email          20 notifications     1 day      rate-limit:email:{userId}
SMS            3 notifications      1 day      rate-limit:sms:{userId}
Marketing      1 notification       1 day      rate-limit:marketing:{userId}
```

### Global / Provider Limits
```
Provider       Rate Limit           How Enforced
─────────────────────────────────────────────────────────────────
Twilio SMS     100 requests/sec     Bull queue concurrency: 100
FCM Push       500 requests/sec     Bull queue concurrency: 500
SES Email      50/sec (sandbox)     Bull queue concurrency: 50
               200/sec (prod)       Bull queue concurrency: 200
BulkSMS BD     200 requests/sec     Bull queue concurrency: 200
```

### Rate Limit Decision Flow
```
1. Check per-user limit:
   count = INCR "rate-limit:{channel}:{userId}"
   if count == 1: EXPIRE key {window_seconds}
   if count > max_for_channel: → REJECT

2. If rejected:
   - Priority notification (security, payment)? → bypass rate limit
   - Marketing notification? → schedule for next available window
   - Standard notification? → drop silently, log for analytics

3. Check quiet hours:
   - Get user preference: quiet_hours_start, quiet_hours_end
   - If current time (BD timezone, UTC+6) is within quiet hours:
     → Delay delivery: Bull queue delayed job, scheduled for quiet_hours_end
   - Exception: security alerts bypass quiet hours
```

---

## Scaling Strategy

### Component-by-Component Scaling
```
┌─────────────────────────┬──────────────────────────────────────────────────┐
│ Component               │ Scaling Approach                                 │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ API Gateway             │ Horizontal, stateless                            │
│                         │ Behind ALB, auto-scale on CPU/request count      │
│                         │ Target: 2-10 instances                           │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ Kafka Consumers         │ Add consumers up to partition count              │
│ (Notification Processor)│ 20 partitions → max 20 consumers                │
│                         │ Scale trigger: consumer lag > 50K messages       │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ WebSocket Gateway       │ Horizontal with Redis adapter                    │
│                         │ Sticky sessions via ALB (connection affinity)    │
│                         │ Each instance: ~50K concurrent connections       │
│                         │ 2M concurrent users → ~40 instances              │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ Bull Workers            │ Horizontal, independent per queue                │
│ (Delivery)              │ Push: 10 workers, Email: 5 workers, SMS: 3      │
│                         │ Scale based on queue depth                       │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ PostgreSQL              │ Primary for writes                               │
│                         │ 2-3 read replicas for notification history       │
│                         │ Partition notifications table by created_at      │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ Redis                   │ Cluster mode: 3 masters + 3 replicas            │
│                         │ Separate clusters for presence vs caching        │
│                         │ Memory budget: ~2GB for 2M online users          │
└─────────────────────────┴──────────────────────────────────────────────────┘
```

### 41M Users Capacity Planning
```
Assumptions:
- 41M total registered users
- 5% concurrent at peak = 2.05M WebSocket connections
- Average 3 notifications per user per day = 123M notifications/day
- Peak: 10x average = ~14,200 notifications/second

Infrastructure sizing:
- Kafka: 3 brokers, 20 partitions on main topic
- Notification processors: 10-20 instances (scale with load)
- WebSocket servers: 40 instances (50K connections each)
- Bull workers: 18 total (10 push + 5 email + 3 SMS)
- Redis cluster: 6 nodes (3 master + 3 replica), 16GB total
- PostgreSQL: 1 primary + 3 read replicas, 500GB storage

Cost optimization:
- Use Fargate Spot for notification processors and delivery workers (70% savings)
- Compress Kafka messages with lz4 (reduces storage + network)
- TTL on Redis keys (auto-cleanup stale presence data)
- Batch DB inserts (100 notifications per INSERT)
- Archive old notifications to S3 (> 90 days)
```

---

## Failure Handling

### Failure Scenarios and Recovery
```
Scenario                    │ Impact                      │ Recovery
────────────────────────────┼─────────────────────────────┼──────────────────────────────
Kafka consumer crashes      │ Partition stops processing   │ Consumer group rebalances
                            │                              │ Other consumers pick up
                            │                              │ Messages NOT lost (committed)
────────────────────────────┼─────────────────────────────┼──────────────────────────────
WebSocket server crashes    │ Users on that server lose    │ Cleanup: SMEMBERS server:X:users
                            │ connection                   │ → bulk remove from online-users
                            │                              │ Clients auto-reconnect (Socket.io)
────────────────────────────┼─────────────────────────────┼──────────────────────────────
Redis goes down             │ No presence tracking         │ Fallback: treat all users as offline
                            │ No rate limiting             │ → send push instead of WebSocket
                            │ No caching                   │ Rate limits: use DB-based fallback
                            │                              │ Redis Cluster: failover to replica
────────────────────────────┼─────────────────────────────┼──────────────────────────────
Email provider (SES) down   │ Emails fail to send          │ Bull retry: exponential backoff
                            │                              │ 3 attempts: 30s, 2min, 10min
                            │                              │ After 3 fails → move to DLQ
                            │                              │ Alert ops team via PagerDuty
────────────────────────────┼─────────────────────────────┼──────────────────────────────
SMS provider down           │ SMS fails to send            │ Same retry pattern as email
                            │                              │ Fallback: try secondary provider
                            │                              │ (e.g., Twilio → BulkSMS BD)
────────────────────────────┼─────────────────────────────┼──────────────────────────────
PostgreSQL write failure    │ Notification not persisted   │ Retry 3 times with backoff
                            │                              │ If still fails → DLQ for later
                            │                              │ Notification still delivered via WS
────────────────────────────┼─────────────────────────────┼──────────────────────────────
Rate limit exceeded         │ Notification blocked         │ If priority: bypass and deliver
                            │                              │ If standard: Bull delayed job
                            │                              │ scheduled for next window
────────────────────────────┼─────────────────────────────┼──────────────────────────────
Duplicate event from Kafka  │ User gets duplicate notif    │ Idempotency: Redis SETNX check
                            │                              │ on notificationId before processing
```

### Dead Letter Queue (DLQ) Strategy
```
1. Failed notification → Kafka "notification-dlq" topic
2. DLQ message includes:
   - Original notification payload
   - Failure reason
   - Attempt count
   - Last error message
3. DLQ consumer (ops tooling):
   - Dashboard shows failed notifications
   - Manual retry button
   - Auto-retry scheduler (every 6 hours for up to 3 days)
   - After 3 days: mark as permanently failed, notify ops
```

---

## BD Context (Bangladesh-Specific Considerations)

### Banglalink BL-Power Context
```
- 41M subscribers: mix of prepaid (90%) and postpaid (10%)
- Notification types: recharge reminders, data pack offers, service alerts, billing
- Peak hours: 9-11 AM, 7-10 PM (BD time, UTC+6)
- Network: 2G/3G still common in rural areas → push notifications may fail
- Language: 80% Bangla (bn), 20% English (en) → template localization critical
```

### SMS Cost Optimization
```
Provider          Cost per SMS     Best For
──────────────────────────────────────────────
BulkSMS BD        ~0.25 BDT       BD local numbers (cheapest)
SSL Wireless      ~0.30 BDT       BD local with delivery reports
Twilio            ~1.50 BDT       International / fallback only

Strategy:
1. Primary: BulkSMS BD for all BD numbers
2. Fallback: SSL Wireless if BulkSMS down
3. Last resort: Twilio for international numbers only

Push notifications (FCM): FREE → always prioritize over SMS
Email (SES): ~0.07 BDT per email → second priority after push
SMS: ~0.25 BDT → last resort, only for critical + opted-in users
```

### Channel Priority (Cost + Effectiveness)
```
Priority 1: In-app (WebSocket) → FREE, instant, requires user online
Priority 2: Push (FCM/APNs)   → FREE, near-instant, requires app installed
Priority 3: Email (SES)       → ~0.07 BDT, async, may go to spam
Priority 4: SMS               → ~0.25 BDT, reliable, expensive at scale

For 41M users, sending SMS to all = 41M x 0.25 BDT = 10.25M BDT (~$93K)
Same via push notification = FREE
```

---

## Interview Talking Points

### Architecture Questions
```
Q: "How would you send notifications to 41M users within 15 minutes?"
A: Fan-out via Kafka with 20 partitions, 20 consumer instances processing in parallel.
   Batch user ID fetching (10K per batch), publish individual events to Kafka.
   50K notifications/second across all consumers. 41M / 50K = ~14 minutes.

Q: "Why Kafka over RabbitMQ for this use case?"
A: Three reasons:
   1. Throughput: Kafka handles 100K+ msg/s vs RabbitMQ's ~20K msg/s
   2. Replay: Kafka retains messages (7 days) → can replay failed batches
   3. Partitioning: Key-based partitioning ensures per-user ordering
   RabbitMQ advantage: simpler routing, better for complex queue patterns
   But for high-throughput fan-out at telecom scale, Kafka wins.

Q: "How do you handle exactly-once delivery?"
A: True exactly-once is impractical. We use at-least-once + idempotency:
   - Kafka consumer commits offset AFTER processing
   - Redis SETNX on notificationId prevents duplicate processing
   - DB unique constraint on notification ID as final safety net

Q: "What if Redis goes down?"
A: Graceful degradation:
   - Presence: assume all users offline → send push instead of WebSocket
   - Rate limiting: fallback to DB-based counting (slower but functional)
   - Caching: read directly from DB (higher latency, acceptable)
   - Redis Cluster with replicas: automatic failover in <30 seconds
```

### Cost and Scale Questions
```
Q: "How do you optimize notification costs for 41M users?"
A: Channel priority: in-app (free) → push (free) → email ($0.001) → SMS ($0.003)
   For mass campaigns: only SMS users who haven't opened the app in 30 days.
   Result: 90% of notifications via free channels, SMS only for ~5% of users.

Q: "How do you handle traffic spikes (e.g., Eid promotions)?"
A: Kafka absorbs the spike (buffering). Consumers process at their own pace.
   Auto-scale consumers based on consumer lag metric.
   Pre-scale WebSocket servers before known events.
   Rate limiting prevents any single user from being overwhelmed.
```

---

## What to Practice
- [ ] Draw the full architecture diagram from memory in under 5 minutes
- [ ] Explain the complete single-user notification flow step by step
- [ ] Explain the mass notification fan-out flow with throughput numbers
- [ ] Discuss trade-offs: real-time (WebSocket) vs near-real-time (push) vs async (email)
- [ ] Walk through the Redis data structures and why each exists
- [ ] Explain horizontal scaling for each component
- [ ] Handle failure scenario follow-ups: "What if Redis goes down?", "What if Kafka consumer crashes?", "How do you handle user timezone for quiet hours?"
- [ ] Discuss cost optimization: channel priority, SMS vs push economics
- [ ] Explain the rate limiting strategy with Redis pseudo-operations
- [ ] Compare Kafka vs RabbitMQ for this specific use case with concrete numbers
