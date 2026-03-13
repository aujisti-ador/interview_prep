# Project 2: Event-Driven Order Processing System

> **Stack**: NestJS + Kafka + PostgreSQL + Redis + Bull Queue
> **Relevance**: Maps to Daraz e-commerce experience. Classic system design question. Demonstrates saga pattern.
> **Estimated Build Time**: 8-10 hours

---

## What You'll Learn

- Saga pattern (choreography) for distributed transactions
- Outbox pattern for reliable event publishing
- Idempotent consumer design
- Compensating transactions (rollback on failure)
- CQRS with separate read/write models

---

## System Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Order     │────▶│   Payment    │────▶│  Inventory   │────▶│   Shipping   │
│   Service    │     │   Service    │     │   Service    │     │   Service    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │         Kafka Topics (Events)          │                    │
       │◀───────────────────┼────────────────────┼────────────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (per-service database)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  order_db   │  │ payment_db  │  │inventory_db │  │shipping_db  │      │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘

       ┌──────────────────────────────────────────┐
       │   Redis (caching + Bull Queue broker)    │
       └──────────────────────────────────────────┘

       ┌──────────────────────────────────────────┐
       │   CQRS Read Service (order_view table)   │
       └──────────────────────────────────────────┘
```

Each service owns its own database. Services never reach into another service's DB. All cross-service communication flows through Kafka events.

---

## Complete Saga Flow

### Happy Path (Order Success)

```
1. User places order via REST API        → Order Service
2. Order Service creates order            → status: PENDING
   Writes to orders table + outbox table  → single DB transaction
3. Outbox Poller picks up event           → publishes "OrderCreated" to Kafka
4. Payment Service consumes "OrderCreated"
   → Charges user
   → Writes payment record + "PaymentCompleted" to its outbox
5. Inventory Service consumes "PaymentCompleted"
   → Reserves items (decrement stock)
   → Writes reservation + "InventoryReserved" to its outbox
6. Shipping Service consumes "InventoryReserved"
   → Creates shipment record
   → Writes shipment + "ShipmentCreated" to its outbox
7. Order Service consumes "ShipmentCreated"
   → Updates order status to CONFIRMED
8. Notification event fired
   → User gets "Order confirmed!" via WebSocket/push
```

### Failure Path: Payment Fails

```
1. Order Service creates order            → publishes "OrderCreated"
2. Payment Service tries to charge        → FAILS (insufficient funds)
3. Payment Service publishes "PaymentFailed" (compensating event)
4. Order Service consumes "PaymentFailed"  → updates order to CANCELLED
5. No inventory reserved, no shipment created (saga stopped early)
6. Notification: user gets "Payment failed, order cancelled"
```

### Failure Path: Inventory Insufficient

```
1. OrderCreated → PaymentCompleted → Inventory Service checks stock → NOT ENOUGH
2. Inventory Service publishes "InventoryReservationFailed"
3. Payment Service consumes "InventoryReservationFailed"
   → Initiates REFUND
   → Publishes "PaymentRefunded"
4. Order Service consumes "PaymentRefunded"
   → Updates order to CANCELLED
5. Notification: user gets "Item out of stock, refund initiated"
```

### Failure Path: Shipping Fails

```
1. OrderCreated → PaymentCompleted → InventoryReserved → Shipping Service FAILS
2. Shipping Service publishes "ShipmentFailed"
3. Inventory Service consumes "ShipmentFailed"
   → Releases reserved stock
   → Publishes "InventoryReleased"
4. Payment Service consumes "InventoryReleased"
   → Refunds payment
   → Publishes "PaymentRefunded"
5. Order Service consumes "PaymentRefunded"
   → Updates order to CANCELLED
6. Notification: user gets "Shipping unavailable, refund initiated"
```

---

## Directory Structure

```
order-processing-system/               # Monorepo root
├── docker-compose.yml
├── package.json                        # Workspace root
├── tsconfig.base.json
│
├── apps/
│   ├── order-service/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── order.module.ts
│   │   │   ├── order.controller.ts        # REST API for placing orders
│   │   │   ├── order.service.ts           # Business logic
│   │   │   ├── saga/
│   │   │   │   ├── order-saga.handler.ts  # Consumes events, updates saga state
│   │   │   │   └── order-saga.state.ts    # State machine definition
│   │   │   ├── outbox/
│   │   │   │   ├── outbox.service.ts      # Writes to outbox table
│   │   │   │   └── outbox.poller.ts       # Polls outbox, publishes to Kafka
│   │   │   ├── entities/
│   │   │   │   ├── order.entity.ts
│   │   │   │   ├── order-item.entity.ts
│   │   │   │   ├── order-saga-state.entity.ts
│   │   │   │   └── outbox.entity.ts
│   │   │   └── dto/
│   │   │       └── create-order.dto.ts
│   │   └── test/
│   │
│   ├── payment-service/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── payment.module.ts
│   │   │   ├── payment.controller.ts      # Kafka consumer handler
│   │   │   ├── payment.service.ts         # Charge / refund logic
│   │   │   ├── idempotency/
│   │   │   │   └── idempotency.guard.ts   # Checks processed_events
│   │   │   ├── outbox/
│   │   │   │   ├── outbox.service.ts
│   │   │   │   └── outbox.poller.ts
│   │   │   └── entities/
│   │   │       ├── payment.entity.ts
│   │   │       ├── refund.entity.ts
│   │   │       ├── processed-event.entity.ts
│   │   │       └── outbox.entity.ts
│   │   └── test/
│   │
│   ├── inventory-service/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── inventory.module.ts
│   │   │   ├── inventory.controller.ts    # Kafka consumer handler
│   │   │   ├── inventory.service.ts       # Reserve / release stock
│   │   │   ├── cache/
│   │   │   │   └── stock-cache.service.ts # Redis hot stock cache
│   │   │   ├── idempotency/
│   │   │   │   └── idempotency.guard.ts
│   │   │   ├── outbox/
│   │   │   │   ├── outbox.service.ts
│   │   │   │   └── outbox.poller.ts
│   │   │   └── entities/
│   │   │       ├── product.entity.ts
│   │   │       ├── reservation.entity.ts
│   │   │       ├── processed-event.entity.ts
│   │   │       └── outbox.entity.ts
│   │   └── test/
│   │
│   ├── shipping-service/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── shipping.module.ts
│   │   │   ├── shipping.controller.ts     # Kafka consumer handler
│   │   │   ├── shipping.service.ts        # Create shipment logic
│   │   │   ├── idempotency/
│   │   │   │   └── idempotency.guard.ts
│   │   │   ├── outbox/
│   │   │   │   ├── outbox.service.ts
│   │   │   │   └── outbox.poller.ts
│   │   │   └── entities/
│   │   │       ├── shipment.entity.ts
│   │   │       ├── processed-event.entity.ts
│   │   │       └── outbox.entity.ts
│   │   └── test/
│   │
│   └── read-service/                      # CQRS read model
│       ├── src/
│       │   ├── main.ts
│       │   ├── read.module.ts
│       │   ├── read.controller.ts         # REST API for order queries
│       │   ├── projections/
│       │   │   └── order-view.projector.ts # Consumes all topics, builds view
│       │   └── entities/
│       │       └── order-view.entity.ts
│       └── test/
│
└── libs/
    └── shared/
        ├── src/
        │   ├── events/
        │   │   ├── order.events.ts
        │   │   ├── payment.events.ts
        │   │   ├── inventory.events.ts
        │   │   ├── shipping.events.ts
        │   │   └── notification.events.ts
        │   ├── dto/
        │   │   └── common.dto.ts
        │   ├── constants/
        │   │   ├── kafka-topics.ts
        │   │   └── order-status.ts
        │   └── interfaces/
        │       └── base-event.interface.ts
        └── index.ts
```

---

## Docker Compose (Pseudo Config)

```yaml
version: "3.8"

services:
  # --- Kafka Cluster (3 brokers) ---
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    ports: ["2181:2181"]
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka-1:
    image: confluentinc/cp-kafka:7.5.0
    ports: ["9092:9092"]
    depends_on: [zookeeper]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_NUM_PARTITIONS: 6            # default partitions per topic
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2       # at least 2 replicas must ACK

  kafka-2:
    image: confluentinc/cp-kafka:7.5.0
    ports: ["9093:9093"]
    depends_on: [zookeeper]
    environment:
      KAFKA_BROKER_ID: 2
      # ... same config, different port

  kafka-3:
    image: confluentinc/cp-kafka:7.5.0
    ports: ["9094:9094"]
    depends_on: [zookeeper]
    environment:
      KAFKA_BROKER_ID: 3
      # ... same config, different port

  # --- Database per Service ---
  order-db:
    image: postgres:16
    environment:
      POSTGRES_DB: order_db
      POSTGRES_USER: order_user
      POSTGRES_PASSWORD: order_pass
    ports: ["5432:5432"]
    volumes: ["order-data:/var/lib/postgresql/data"]

  payment-db:
    image: postgres:16
    environment:
      POSTGRES_DB: payment_db
      POSTGRES_USER: payment_user
      POSTGRES_PASSWORD: payment_pass
    ports: ["5433:5432"]
    volumes: ["payment-data:/var/lib/postgresql/data"]

  inventory-db:
    image: postgres:16
    environment:
      POSTGRES_DB: inventory_db
      POSTGRES_USER: inventory_user
      POSTGRES_PASSWORD: inventory_pass
    ports: ["5434:5432"]
    volumes: ["inventory-data:/var/lib/postgresql/data"]

  shipping-db:
    image: postgres:16
    environment:
      POSTGRES_DB: shipping_db
      POSTGRES_USER: shipping_user
      POSTGRES_PASSWORD: shipping_pass
    ports: ["5435:5432"]
    volumes: ["shipping-data:/var/lib/postgresql/data"]

  # --- Redis ---
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  # --- Services ---
  order-service:
    build: ./apps/order-service
    ports: ["3001:3000"]
    depends_on: [kafka-1, kafka-2, kafka-3, order-db, redis]

  payment-service:
    build: ./apps/payment-service
    ports: ["3002:3000"]
    depends_on: [kafka-1, kafka-2, kafka-3, payment-db]

  inventory-service:
    build: ./apps/inventory-service
    ports: ["3003:3000"]
    depends_on: [kafka-1, kafka-2, kafka-3, inventory-db, redis]

  shipping-service:
    build: ./apps/shipping-service
    ports: ["3004:3000"]
    depends_on: [kafka-1, kafka-2, kafka-3, shipping-db]

  read-service:
    build: ./apps/read-service
    ports: ["3005:3000"]
    depends_on: [kafka-1, kafka-2, kafka-3, order-db]

volumes:
  order-data:
  payment-data:
  inventory-data:
  shipping-data:
```

---

## Kafka Topics Design

```
Topics:
  order-events         OrderCreated, OrderCancelled, OrderCompleted
  payment-events       PaymentCompleted, PaymentFailed, PaymentRefunded
  inventory-events     InventoryReserved, InventoryReservationFailed, InventoryReleased
  shipping-events      ShipmentCreated, ShipmentFailed, ShipmentDelivered
  notification-events  NotifyUser

Partitioning Strategy:
  Key = orderId
  Why: All events for one order land on the same partition
       → guarantees ordering per order
       → one consumer in a group handles entire order lifecycle

Partition Count:
  6 partitions per topic (good starting point, scale up for flash sales)

Replication:
  Factor = 3 (across 3 brokers)
  min.insync.replicas = 2
  acks = all (producer setting — no data loss)

Consumer Groups:
  order-service-group      → subscribes to: payment-events, shipping-events
  payment-service-group    → subscribes to: order-events, inventory-events
  inventory-service-group  → subscribes to: payment-events, shipping-events
  shipping-service-group   → subscribes to: inventory-events
  read-service-group       → subscribes to: ALL topics (builds materialized view)
```

---

## Event Schemas (TypeScript Interfaces)

```typescript
// libs/shared/src/interfaces/base-event.interface.ts
interface BaseEvent {
  eventId: string;          // UUID — used for idempotency
  eventType: string;
  aggregateId: string;      // orderId — used as Kafka partition key
  timestamp: string;        // ISO 8601
  version: number;          // schema version for forward compatibility
  metadata: {
    correlationId: string;  // traces entire saga
    causationId: string;    // eventId of the event that caused this one
    source: string;         // which service produced it
  };
}

// --- Order Events ---
interface OrderCreated extends BaseEvent {
  eventType: 'OrderCreated';
  payload: {
    orderId: string;
    userId: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
    totalAmount: number;
    currency: string;
    shippingAddress: {
      street: string;
      city: string;
      country: string;
      postalCode: string;
    };
  };
}

interface OrderCancelled extends BaseEvent {
  eventType: 'OrderCancelled';
  payload: {
    orderId: string;
    reason: string;
    cancelledAt: string;
  };
}

interface OrderCompleted extends BaseEvent {
  eventType: 'OrderCompleted';
  payload: {
    orderId: string;
    completedAt: string;
  };
}

// --- Payment Events ---
interface PaymentCompleted extends BaseEvent {
  eventType: 'PaymentCompleted';
  payload: {
    paymentId: string;
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    transactionRef: string;
  };
}

interface PaymentFailed extends BaseEvent {
  eventType: 'PaymentFailed';
  payload: {
    orderId: string;
    userId: string;
    amount: number;
    reason: string;          // 'INSUFFICIENT_FUNDS' | 'CARD_DECLINED' | 'TIMEOUT'
    failedAt: string;
  };
}

interface PaymentRefunded extends BaseEvent {
  eventType: 'PaymentRefunded';
  payload: {
    refundId: string;
    paymentId: string;
    orderId: string;
    amount: number;
    reason: string;
    refundedAt: string;
  };
}

// --- Inventory Events ---
interface InventoryReserved extends BaseEvent {
  eventType: 'InventoryReserved';
  payload: {
    orderId: string;
    reservations: Array<{
      productId: string;
      quantity: number;
      warehouseId: string;
    }>;
    reservedAt: string;
  };
}

interface InventoryReservationFailed extends BaseEvent {
  eventType: 'InventoryReservationFailed';
  payload: {
    orderId: string;
    failedItems: Array<{
      productId: string;
      requested: number;
      available: number;
    }>;
    reason: string;
  };
}

interface InventoryReleased extends BaseEvent {
  eventType: 'InventoryReleased';
  payload: {
    orderId: string;
    releasedItems: Array<{
      productId: string;
      quantity: number;
    }>;
    reason: string;
  };
}

// --- Shipping Events ---
interface ShipmentCreated extends BaseEvent {
  eventType: 'ShipmentCreated';
  payload: {
    shipmentId: string;
    orderId: string;
    trackingNumber: string;
    carrier: string;
    estimatedDelivery: string;
  };
}

interface ShipmentFailed extends BaseEvent {
  eventType: 'ShipmentFailed';
  payload: {
    orderId: string;
    reason: string;
  };
}

interface ShipmentDelivered extends BaseEvent {
  eventType: 'ShipmentDelivered';
  payload: {
    shipmentId: string;
    orderId: string;
    deliveredAt: string;
    signature: string;
  };
}

// --- Notification Events ---
interface NotifyUser extends BaseEvent {
  eventType: 'NotifyUser';
  payload: {
    userId: string;
    orderId: string;
    channel: 'EMAIL' | 'SMS' | 'PUSH' | 'WEBSOCKET';
    template: string;
    data: Record<string, any>;
  };
}
```

---

## Outbox Pattern

### Why Not Publish Directly to Kafka?

```
PROBLEM — dual-write inconsistency:

  BEGIN transaction
    INSERT INTO orders (...)           ← DB write succeeds
  COMMIT

  kafkaProducer.send("OrderCreated")   ← Kafka write FAILS (network blip)

  Result: order exists in DB but no event was published. System is inconsistent.
  Other services never learn about this order.

SOLUTION — outbox pattern:

  BEGIN transaction
    INSERT INTO orders (...)
    INSERT INTO outbox (event_type, payload, ...)   ← same transaction
  COMMIT

  Both writes succeed or both fail. Atomicity guaranteed by the database.
  A separate poller reads outbox rows and publishes to Kafka.
```

### Outbox Table Schema

```sql
CREATE TABLE outbox (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  VARCHAR(50) NOT NULL,     -- 'Order', 'Payment', etc.
    aggregate_id    VARCHAR(50) NOT NULL,     -- orderId (becomes Kafka key)
    event_type      VARCHAR(100) NOT NULL,    -- 'OrderCreated'
    payload         JSONB NOT NULL,           -- full event JSON
    created_at      TIMESTAMP DEFAULT NOW(),
    published_at    TIMESTAMP NULL,           -- NULL = not yet published
    retry_count     INT DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'PENDING'  -- PENDING | PUBLISHED | FAILED
);

CREATE INDEX idx_outbox_pending ON outbox (status, created_at)
    WHERE status = 'PENDING';
```

### Polling Mechanism (Pseudo Logic)

```
// OutboxPoller — runs every 500ms via setInterval or Bull scheduled job

async function pollOutbox():
    // 1. Grab a batch of unpublished events (with row-level lock)
    events = SELECT * FROM outbox
             WHERE status = 'PENDING'
             ORDER BY created_at ASC
             LIMIT 100
             FOR UPDATE SKIP LOCKED;

    // 2. Publish each to Kafka
    for each event in events:
        try:
            await kafkaProducer.send({
                topic: topicFor(event.aggregate_type),
                messages: [{
                    key: event.aggregate_id,
                    value: JSON.stringify(event.payload),
                    headers: { eventId: event.id }
                }]
            });

            UPDATE outbox SET status = 'PUBLISHED', published_at = NOW()
                WHERE id = event.id;

        catch error:
            UPDATE outbox SET retry_count = retry_count + 1
                WHERE id = event.id;

            if event.retry_count >= 5:
                UPDATE outbox SET status = 'FAILED' WHERE id = event.id;
                // Alert: push to dead letter / monitoring

    // 3. Cleanup: delete published events older than 7 days (background job)
```

### Alternative: CDC with Debezium

```
Instead of polling, use Debezium to capture changes from the outbox table
via PostgreSQL WAL (Write-Ahead Log) and stream them directly to Kafka.

Pros: Lower latency, no polling overhead
Cons: Additional infrastructure (Debezium + Kafka Connect)

For interviews, mention both approaches. Polling is simpler to explain;
CDC is what you'd use in production at Daraz-scale.
```

---

## Idempotency

### Why?

Kafka guarantees at-least-once delivery. If a consumer crashes after processing but before committing its offset, Kafka redelivers the message. Without idempotency, you might charge a customer twice.

### Processed Events Table

```sql
CREATE TABLE processed_events (
    event_id    UUID PRIMARY KEY,           -- from BaseEvent.eventId
    event_type  VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP DEFAULT NOW()
);
```

### Consumer Guard (Pseudo Logic)

```
// Runs before every event handler

async function handleEvent(event: BaseEvent):
    // 1. Check if already processed
    existing = SELECT 1 FROM processed_events WHERE event_id = event.eventId;
    if existing:
        log.info("Duplicate event, skipping", event.eventId);
        return;  // ACK the message, do nothing

    // 2. Process in a single transaction
    BEGIN transaction:
        INSERT INTO processed_events (event_id, event_type) VALUES (event.eventId, event.eventType);
        // ... actual business logic ...
        INSERT INTO outbox (...) VALUES (...);  // outgoing event
    COMMIT;

    // 3. If transaction fails, Kafka will redeliver → retry naturally
```

### Key Insight for Interviews

```
The processed_events INSERT and the business logic INSERT happen in the SAME
transaction. This means:
  - If the transaction commits → event is marked processed AND business effect applied
  - If the transaction rolls back → neither happens, Kafka redelivers, we retry cleanly

This is the "exactly-once processing" pattern built on at-least-once delivery.
```

---

## Database Schemas (Per Service)

### Order Service (order_db)

```sql
-- Core order data
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    total_amount    DECIMAL(12,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'BDT',
    shipping_address JSONB NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID REFERENCES orders(id),
    product_id  UUID NOT NULL,
    quantity    INT NOT NULL,
    unit_price  DECIMAL(12,2) NOT NULL
);

-- Tracks saga progress for each order
CREATE TABLE order_saga_state (
    order_id        UUID PRIMARY KEY REFERENCES orders(id),
    current_step    VARCHAR(50) NOT NULL,    -- e.g., 'INVENTORY_RESERVING'
    history         JSONB DEFAULT '[]',      -- array of { step, timestamp, eventId }
    failure_reason  TEXT,
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Outbox (same schema as above)
CREATE TABLE outbox (...);
```

### Payment Service (payment_db)

```sql
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL,
    user_id         UUID NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'BDT',
    payment_method  VARCHAR(30) NOT NULL,
    transaction_ref VARCHAR(100),
    status          VARCHAR(20) NOT NULL,    -- PENDING | COMPLETED | FAILED
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refunds (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id  UUID REFERENCES payments(id),
    order_id    UUID NOT NULL,
    amount      DECIMAL(12,2) NOT NULL,
    reason      TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL,        -- PENDING | COMPLETED | FAILED
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE processed_events (...);
CREATE TABLE outbox (...);
```

### Inventory Service (inventory_db)

```sql
CREATE TABLE products (
    id              UUID PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    sku             VARCHAR(50) UNIQUE NOT NULL,
    stock_count     INT NOT NULL DEFAULT 0,
    reserved_count  INT NOT NULL DEFAULT 0,    -- soft lock
    warehouse_id    UUID NOT NULL,
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Prevents overselling: available = stock_count - reserved_count
CREATE INDEX idx_products_sku ON products(sku);

CREATE TABLE reservations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL,
    product_id  UUID REFERENCES products(id),
    quantity    INT NOT NULL,
    status      VARCHAR(20) NOT NULL,          -- RESERVED | RELEASED | CONFIRMED
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE processed_events (...);
CREATE TABLE outbox (...);
```

### Shipping Service (shipping_db)

```sql
CREATE TABLE shipments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL,
    tracking_number     VARCHAR(100) UNIQUE,
    carrier             VARCHAR(50) NOT NULL,
    status              VARCHAR(20) NOT NULL,  -- CREATED | IN_TRANSIT | DELIVERED | FAILED
    estimated_delivery  DATE,
    actual_delivery     TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE processed_events (...);
CREATE TABLE outbox (...);
```

---

## Saga State Machine

```
                        ┌──────────────────────────────┐
                        │           PENDING             │
                        └──────────────┬───────────────┘
                                       │ OrderCreated
                                       ▼
                        ┌──────────────────────────────┐
                   ┌───│     PAYMENT_PROCESSING        │
                   │    └──────────────┬───────────────┘
                   │                   │ PaymentCompleted
        PaymentFailed                  ▼
                   │    ┌──────────────────────────────┐
                   │    │     PAYMENT_COMPLETED         │
                   │    └──────────────┬───────────────┘
                   │                   │ (auto-transition)
                   │                   ▼
                   │    ┌──────────────────────────────┐
                   │  ┌─│     INVENTORY_RESERVING       │
                   │  │ └──────────────┬───────────────┘
                   │  │                │ InventoryReserved
                   │  │ InvFailed      ▼
                   │  │ ┌──────────────────────────────┐
                   │  │ │     INVENTORY_RESERVED        │
                   │  │ └──────────────┬───────────────┘
                   │  │                │ (auto-transition)
                   │  │                ▼
                   │  │ ┌──────────────────────────────┐
                   │  │ │         SHIPPING              │
                   │  │ └──────────────┬───────────────┘
                   │  │                │ ShipmentCreated
                   │  │                ▼
                   │  │ ┌──────────────────────────────┐
                   │  │ │         CONFIRMED             │
                   │  │ └──────────────┬───────────────┘
                   │  │                │ ShipmentDelivered
                   │  │                ▼
                   │  │ ┌──────────────────────────────┐
                   │  │ │         DELIVERED              │
                   │  │ └──────────────────────────────┘
                   │  │
                   │  │  Failure / Compensation Paths
                   │  │
                   ▼  ▼
        ┌──────────────────────────────┐
        │          REFUNDING            │  ← PaymentRefunded in progress
        └──────────────┬───────────────┘
                       │ PaymentRefunded
                       ▼
        ┌──────────────────────────────┐
        │          CANCELLED            │
        └──────────────────────────────┘

Valid Transitions (code-level enum):
  PENDING                → PAYMENT_PROCESSING
  PAYMENT_PROCESSING     → PAYMENT_COMPLETED | CANCELLED
  PAYMENT_COMPLETED      → INVENTORY_RESERVING
  INVENTORY_RESERVING    → INVENTORY_RESERVED | REFUNDING
  INVENTORY_RESERVED     → SHIPPING
  SHIPPING               → CONFIRMED
  CONFIRMED              → DELIVERED
  REFUNDING              → CANCELLED
```

---

## Pseudo Configs for Each Service

### Order Service — Module Setup

```typescript
// order.module.ts — conceptual structure

@Module({
  imports: [
    TypeOrmModule.forRoot({
      host: 'order-db',
      port: 5432,
      database: 'order_db',
      entities: [Order, OrderItem, OrderSagaState, Outbox],
      synchronize: false,  // use migrations
    }),

    ClientsModule.register([{
      name: 'KAFKA_SERVICE',
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'order-service',
          brokers: ['kafka-1:9092', 'kafka-2:9093', 'kafka-3:9094'],
        },
        consumer: {
          groupId: 'order-service-group',
          sessionTimeout: 30000,
          heartbeatInterval: 3000,
        },
        producer: {
          allowAutoTopicCreation: false,
          idempotent: true,    // Kafka producer-level idempotency
        },
      },
    }]),

    BullModule.forRoot({ redis: { host: 'redis', port: 6379 } }),
    BullModule.registerQueue({ name: 'outbox-polling' }),
  ],
  controllers: [OrderController, OrderSagaHandler],
  providers: [OrderService, OutboxService, OutboxPoller],
})
export class OrderModule {}
```

### Order Service — REST Controller (Entry Point)

```typescript
// order.controller.ts — the only REST endpoint in the saga

@Controller('orders')
class OrderController {
  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    // 1. Validate input
    // 2. Start DB transaction
    // 3. Insert into orders + order_items
    // 4. Insert OrderCreated event into outbox table
    // 5. Commit transaction
    // 6. Return { orderId, status: 'PENDING' }
    // Outbox poller will pick up the event and publish to Kafka
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    // Queries the CQRS read model for fast denormalized response
  }
}
```

### Order Service — Saga Event Handler

```typescript
// order-saga.handler.ts

@Controller()
class OrderSagaHandler {
  // Listens to payment-events topic
  @EventPattern('payment-events')
  async handlePaymentEvent(@Payload() event: BaseEvent) {
    switch (event.eventType) {
      case 'PaymentCompleted':
        // Update saga state → PAYMENT_COMPLETED
        // Order status stays, waiting for inventory
        break;
      case 'PaymentFailed':
        // Update order status → CANCELLED
        // Update saga state → terminal
        // Write NotifyUser event to outbox
        break;
      case 'PaymentRefunded':
        // Update order status → CANCELLED (compensation complete)
        // Write NotifyUser event to outbox
        break;
    }
  }

  // Listens to shipping-events topic
  @EventPattern('shipping-events')
  async handleShippingEvent(@Payload() event: BaseEvent) {
    switch (event.eventType) {
      case 'ShipmentCreated':
        // Update order status → CONFIRMED
        // Update saga state
        // Write NotifyUser event to outbox
        break;
      case 'ShipmentDelivered':
        // Update order status → DELIVERED
        break;
    }
  }
}
```

### Payment Service — Consumer Handler

```typescript
// payment.controller.ts

@Controller()
class PaymentController {
  @EventPattern('order-events')
  async handleOrderEvent(@Payload() event: BaseEvent) {
    // Idempotency check first
    if (await this.isAlreadyProcessed(event.eventId)) return;

    if (event.eventType === 'OrderCreated') {
      // BEGIN transaction:
      //   1. Record in processed_events
      //   2. Attempt charge via payment gateway
      //   3. Insert payment record
      //   4. Write PaymentCompleted or PaymentFailed to outbox
      // COMMIT
    }
  }

  @EventPattern('inventory-events')
  async handleInventoryEvent(@Payload() event: BaseEvent) {
    if (await this.isAlreadyProcessed(event.eventId)) return;

    if (event.eventType === 'InventoryReservationFailed') {
      // Compensating action: REFUND
      // BEGIN transaction:
      //   1. Record in processed_events
      //   2. Process refund
      //   3. Insert refund record
      //   4. Write PaymentRefunded to outbox
      // COMMIT
    }
  }
}
```

### Inventory Service — Consumer Handler

```typescript
// inventory.controller.ts

@Controller()
class InventoryController {
  @EventPattern('payment-events')
  async handlePaymentEvent(@Payload() event: BaseEvent) {
    if (await this.isAlreadyProcessed(event.eventId)) return;

    if (event.eventType === 'PaymentCompleted') {
      // BEGIN transaction:
      //   1. Record in processed_events
      //   2. For each item in order:
      //        SELECT stock_count, reserved_count FROM products WHERE id = ? FOR UPDATE
      //        if (stock_count - reserved_count) < requested_quantity → FAIL
      //        UPDATE products SET reserved_count = reserved_count + quantity
      //        INSERT INTO reservations
      //   3. If all items reserved → write InventoryReserved to outbox
      //      If any item fails → write InventoryReservationFailed to outbox
      // COMMIT
    }
  }

  @EventPattern('shipping-events')
  async handleShippingEvent(@Payload() event: BaseEvent) {
    if (await this.isAlreadyProcessed(event.eventId)) return;

    if (event.eventType === 'ShipmentFailed') {
      // Compensating action: RELEASE stock
      // Reverse reservations
      // Write InventoryReleased to outbox
    }
  }
}
```

### Shipping Service — Consumer Handler

```typescript
// shipping.controller.ts

@Controller()
class ShippingController {
  @EventPattern('inventory-events')
  async handleInventoryEvent(@Payload() event: BaseEvent) {
    if (await this.isAlreadyProcessed(event.eventId)) return;

    if (event.eventType === 'InventoryReserved') {
      // BEGIN transaction:
      //   1. Record in processed_events
      //   2. Create shipment record with tracking number
      //   3. Call carrier API (or mock it)
      //   4. Write ShipmentCreated to outbox
      // COMMIT
    }
  }
}
```

---

## CQRS Read Model

### Problem

A customer dashboard query like "show me my order with payment status, shipment tracking, and items" would require joining data across 4 services. In a microservices architecture, you cannot do cross-service joins.

### Solution: Event-Sourced Read Projection

```
                     ┌─────────────────┐
  order-events ─────▶│                 │
  payment-events ───▶│  Read Service   │──▶  order_view table (denormalized)
  inventory-events ─▶│  (Projector)    │
  shipping-events ──▶│                 │
                     └─────────────────┘
```

### order_view Table (Denormalized)

```sql
CREATE TABLE order_view (
    order_id            UUID PRIMARY KEY,
    user_id             UUID NOT NULL,
    order_status        VARCHAR(30),
    items               JSONB,               -- array of { productId, name, qty, price }
    total_amount        DECIMAL(12,2),
    currency            VARCHAR(3),

    -- Payment info
    payment_status      VARCHAR(20),
    payment_method      VARCHAR(30),
    paid_at             TIMESTAMP,

    -- Inventory info
    reservation_status  VARCHAR(20),
    reserved_at         TIMESTAMP,

    -- Shipping info
    tracking_number     VARCHAR(100),
    carrier             VARCHAR(50),
    shipment_status     VARCHAR(20),
    estimated_delivery  DATE,
    delivered_at        TIMESTAMP,

    -- Metadata
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_view_user ON order_view(user_id);
CREATE INDEX idx_order_view_status ON order_view(order_status);
```

### Projector Logic

```
// order-view.projector.ts — subscribes to ALL event topics

onEvent(event):
  switch event.eventType:
    case 'OrderCreated':
      INSERT INTO order_view (order_id, user_id, order_status, items, total_amount, ...)
      VALUES (event.payload.orderId, ..., 'PENDING', ...)

    case 'PaymentCompleted':
      UPDATE order_view
      SET payment_status = 'COMPLETED',
          payment_method = event.payload.paymentMethod,
          paid_at = event.timestamp,
          order_status = 'PAYMENT_COMPLETED'
      WHERE order_id = event.payload.orderId

    case 'InventoryReserved':
      UPDATE order_view
      SET reservation_status = 'RESERVED',
          reserved_at = event.timestamp,
          order_status = 'INVENTORY_RESERVED'
      WHERE order_id = event.payload.orderId

    case 'ShipmentCreated':
      UPDATE order_view
      SET tracking_number = event.payload.trackingNumber,
          carrier = event.payload.carrier,
          shipment_status = 'CREATED',
          estimated_delivery = event.payload.estimatedDelivery,
          order_status = 'CONFIRMED'
      WHERE order_id = event.payload.orderId

    case 'PaymentFailed' | 'OrderCancelled':
      UPDATE order_view
      SET order_status = 'CANCELLED',
          payment_status = 'FAILED'
      WHERE order_id = event.payload.orderId

    // ... handle all other events similarly
```

### Query API

```
GET /orders/:id         → single order with full denormalized data
GET /orders?userId=X    → all orders for a user (paginated)
GET /orders?status=X    → filter by status (admin dashboard)

Response is a single row read — no joins, no cross-service calls.
Fast enough for Daraz-scale dashboards.
```

---

## Scaling and Production Considerations

### Kafka Tuning

```
Per-topic partition count:
  - Start with 6 partitions (matches max consumer instances per group)
  - Flash sale: scale order-events to 12-24 partitions
  - Rebalance consumers accordingly

Consumer config:
  max.poll.records = 500
  max.poll.interval.ms = 300000
  enable.auto.commit = false          ← manual commit after processing
  auto.offset.reset = earliest        ← don't miss events on new consumer
```

### Retry Strategy

```
Attempt 1:  immediate
Attempt 2:  1 second delay
Attempt 3:  5 second delay
Attempt 4:  30 second delay
Attempt 5:  → Dead Letter Queue (DLQ)

DLQ topic naming:  {original-topic}.dlq
  e.g., order-events.dlq

DLQ consumers: alert on-call engineers, surface in monitoring dashboard.
Optional: auto-retry DLQ messages after manual inspection.
```

### Monitoring

```
Key metrics to track:
  - Consumer lag per partition         → are consumers keeping up?
  - Event processing latency (p99)    → how long from publish to consume?
  - Outbox table pending count        → is the poller falling behind?
  - DLQ message count                 → are failures piling up?
  - Saga completion rate              → % of orders reaching CONFIRMED
  - Saga timeout                      → orders stuck in intermediate state > 5 min

Tools: Prometheus + Grafana, or Datadog
Alert: consumer lag > 1000, DLQ count > 0, saga stuck > 5 min
```

### Flash Sale Scaling (Daraz 11.11 Context)

```
Pre-scale strategy:
  1. Inventory Service is the bottleneck → scale to 12 instances
  2. Redis cache for hot product stock counts (read from cache, write-through to DB)
  3. Pre-warm: load flash sale products into Redis before event starts
  4. Rate limiting on Order Service: Bull Queue to throttle order creation
  5. Kafka: increase partitions for order-events and payment-events
  6. DB: read replicas for inventory queries, connection pooling via PgBouncer

During sale:
  - Inventory checks hit Redis first (sub-ms)
  - Only write to PostgreSQL on actual reservation
  - Bull Queue smooths out burst traffic

Post-sale:
  - Scale back down
  - Process DLQ backlog
  - Reconciliation job: compare Kafka events vs DB state
```

---

## Interview Talking Points

### Saga Choreography vs Orchestration

```
Choreography (what this project uses):
  - Each service listens to events and decides what to do
  - No central coordinator
  - Pros: loose coupling, each service is autonomous, easy to add new services
  - Cons: hard to track overall saga state, complex failure flows,
          debugging requires correlating logs across services

Orchestration (alternative):
  - A central Saga Orchestrator service tells each service what to do
  - Orchestrator holds the state machine
  - Pros: clear flow control, easier to debug, saga state in one place
  - Cons: single point of failure, tighter coupling to orchestrator

When to use which:
  - Choreography: 3-5 services, well-defined events, team autonomy matters
  - Orchestration: 6+ services, complex branching logic, need visibility
  - "At Daraz, we started with choreography for order processing (4 services)
     but moved to orchestration for the returns/refund flow (7 services)
     because the branching logic got too complex to reason about."
```

### Why Outbox Over Direct Kafka Publish?

```
"If I write to the database and then publish to Kafka, I have a dual-write
problem. If either fails, the system is inconsistent. The outbox pattern
makes it a single atomic write — both the business data and the event go
into the same database transaction. A separate poller handles the Kafka
publish. Worst case: the event is published with a slight delay, but
it's NEVER lost."
```

### Exactly-Once vs At-Least-Once

```
"Kafka provides at-least-once delivery by default. We achieve effectively
exactly-once processing through idempotent consumers — each consumer checks
a processed_events table before processing. The idempotency check and
business logic run in the same DB transaction, so it's all-or-nothing."
```

### Handling Interviewer Follow-Ups

```
Q: "What if Kafka is down?"
A: "Events accumulate in the outbox table. When Kafka recovers, the poller
    catches up. We might add a circuit breaker on the poller to stop
    hammering a dead Kafka cluster, and an alert when outbox backlog > 1000."

Q: "What about duplicate payments?"
A: "The payment service checks processed_events before charging. The check
    and the charge happen in one transaction. Even if Kafka delivers
    OrderCreated twice, the second time is a no-op."

Q: "How do you handle poison messages (malformed events)?"
A: "Schema validation on consume. If validation fails, send directly to DLQ
    with the validation error. Don't retry — it will never succeed."

Q: "What if a service is slow and the saga takes too long?"
A: "We have a saga timeout job (Bull scheduled job). If an order stays in
    an intermediate state for more than 5 minutes, we trigger a compensating
    flow to cancel and refund. This prevents zombie orders."

Q: "How would you test this?"
A: "Integration tests with Testcontainers — spin up Kafka, PostgreSQL, Redis
    in Docker. Publish an event, assert the saga completes. Also test each
    failure path: payment failure, inventory shortage, shipping failure."
```

---

## What to Practice

- [ ] Draw the full saga flow on a whiteboard from memory (both happy and failure paths)
- [ ] Explain the outbox pattern without looking at notes — draw the table, the poller, the Kafka publish
- [ ] Walk through a compensating transaction scenario step by step
- [ ] Discuss exactly-once vs at-least-once semantics and how idempotent consumers bridge the gap
- [ ] Handle these follow-ups cold: "What if Kafka is down?", "What about duplicate payments?", "How do you scale for flash sales?"
- [ ] Explain CQRS: why separate read/write models, how the projection works, eventual consistency trade-off
- [ ] Compare choreography vs orchestration — when to use each, with a real example from your experience
- [ ] Describe the database-per-service pattern and why cross-service joins are not allowed
