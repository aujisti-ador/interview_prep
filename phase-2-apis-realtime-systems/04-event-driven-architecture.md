# Event-Driven Architecture (EDA) - Interview Q&A

## Table of Contents
1. [EDA Fundamentals](#eda-fundamentals)
2. [Events vs Commands](#events-vs-commands)
3. [Event Brokers](#event-brokers)
4. [Kafka Deep Dive](#kafka-deep-dive)
5. [RabbitMQ Deep Dive](#rabbitmq-deep-dive)
6. [Event Sourcing](#event-sourcing)
7. [CQRS Pattern](#cqrs-pattern)
8. [Saga Pattern](#saga-pattern)
9. [Outbox Pattern](#outbox-pattern)
10. [Idempotency & Deduplication](#idempotency--deduplication)
11. [Best Practices](#best-practices)

---

## EDA Fundamentals

### Q1: What is Event-Driven Architecture and what are its benefits?

**Answer:**

Event-Driven Architecture (EDA) is a software design pattern where the flow of the program is determined by events - significant changes in state.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Event-Driven Architecture                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRADITIONAL (Request-Response)           EVENT-DRIVEN                       │
│  ─────────────────────────────           ─────────────                       │
│                                                                              │
│  ┌─────────┐ ────────→ ┌─────────┐      ┌─────────┐                        │
│  │Service A│          │Service B│      │Service A│                         │
│  └─────────┘ ←──────── └─────────┘      └────┬────┘                        │
│       │                    │                 │ publish                      │
│       │ waits              │                 ▼                              │
│       ▼                    ▼            ┌─────────┐                        │
│  Tightly Coupled      Synchronous       │  Event  │                        │
│  Blocking             Dependent         │  Bus    │                        │
│                                         └────┬────┘                        │
│                                              │ subscribe                    │
│                                         ┌────┴────┐                        │
│                                         ▼         ▼                        │
│                                    ┌─────────┐ ┌─────────┐                 │
│                                    │Service B│ │Service C│                 │
│                                    └─────────┘ └─────────┘                 │
│                                                                              │
│  Loosely Coupled, Asynchronous, Independent Scaling                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Benefits:**

| Benefit | Description |
|---------|-------------|
| Loose Coupling | Services don't know about each other |
| Scalability | Scale producers/consumers independently |
| Resilience | Failures don't cascade immediately |
| Flexibility | Add new consumers without changing producers |
| Audit Trail | Events provide natural logging |
| Replay | Re-process historical events |

**Drawbacks:**

| Drawback | Description |
|----------|-------------|
| Eventual Consistency | Data isn't immediately consistent |
| Complexity | Harder to debug and trace |
| Ordering | Maintaining event order is challenging |
| Duplicate Handling | Must handle duplicate events |

```typescript
// Simple Event-Driven Example (NestJS)
@Injectable()
export class OrderService {
  constructor(
    private readonly eventBus: EventEmitter2,
    private readonly orderRepository: OrderRepository,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // 1. Create order
    const order = await this.orderRepository.save({
      ...dto,
      status: 'CREATED',
    });

    // 2. Emit event (fire and forget)
    this.eventBus.emit('order.created', {
      orderId: order.id,
      userId: order.userId,
      items: order.items,
      total: order.total,
      timestamp: new Date(),
    });

    // 3. Return immediately (don't wait for event handlers)
    return order;
  }
}

// Event Handlers (can be in different services)
@Injectable()
export class InventoryService {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    // Reserve inventory
    await this.reserveInventory(event.items);
  }
}

@Injectable()
export class NotificationService {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    // Send confirmation email
    await this.sendOrderConfirmation(event.userId, event.orderId);
  }
}

@Injectable()
export class AnalyticsService {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    // Track analytics
    await this.trackOrderMetrics(event);
  }
}
```

---

## Events vs Commands

### Q2: What is the difference between Events and Commands?

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Events vs Commands                                   │
├───────────────────────────────┬─────────────────────────────────────────────┤
│           EVENTS              │              COMMANDS                        │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ • Past tense (happened)       │ • Imperative (request to do)                │
│ • OrderCreated, UserRegistered│ • CreateOrder, RegisterUser                 │
│ • Cannot be rejected          │ • Can be rejected                           │
│ • Multiple subscribers        │ • Single handler                            │
│ • Immutable facts             │ • Mutable requests                          │
│ • Producer doesn't care who   │ • Sender expects response                   │
│   consumes                    │                                             │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

```typescript
// EVENT - Something that happened (notification)
interface OrderCreatedEvent {
  eventType: 'ORDER_CREATED';
  eventId: string;
  timestamp: Date;
  payload: {
    orderId: string;
    userId: string;
    items: OrderItem[];
    total: number;
  };
}

// Event is immutable and represents a fact
// Multiple services can react to it

// COMMAND - Request to do something
interface CreateOrderCommand {
  commandType: 'CREATE_ORDER';
  commandId: string;
  payload: {
    userId: string;
    items: OrderItem[];
    shippingAddress: Address;
  };
}

// Command expects a response (success/failure)
// Only one handler processes it

// Implementation Pattern
@Injectable()
export class OrderCommandHandler {
  @CommandHandler(CreateOrderCommand)
  async handle(command: CreateOrderCommand): Promise<Order> {
    // Validate command
    this.validateCommand(command);

    // Execute business logic
    const order = await this.createOrder(command.payload);

    // Emit event AFTER successful execution
    await this.eventBus.publish(new OrderCreatedEvent({
      orderId: order.id,
      userId: command.payload.userId,
      items: command.payload.items,
      total: order.total,
    }));

    return order;
  }
}

// Event Flow
// Command → Handler → Event → Multiple Subscribers
//
// CreateOrderCommand
//     │
//     ▼
// OrderCommandHandler
//     │
//     ▼
// OrderCreatedEvent
//     │
//     ├─→ InventoryService (reserve stock)
//     ├─→ PaymentService (process payment)
//     ├─→ NotificationService (send email)
//     └─→ AnalyticsService (track metrics)
```

---

## Event Brokers

### Q3: Compare different event brokers (Kafka, RabbitMQ, Redis Pub/Sub).

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Event Broker Comparison                              │
├──────────────────┬──────────────────┬──────────────────┬───────────────────┤
│     Feature      │      Kafka       │    RabbitMQ      │   Redis Pub/Sub   │
├──────────────────┼──────────────────┼──────────────────┼───────────────────┤
│ Model            │ Log-based        │ Queue-based      │ Pub/Sub           │
│ Persistence      │ Yes (disk)       │ Yes (optional)   │ No (memory)       │
│ Message Order    │ Per partition    │ Per queue        │ No guarantee      │
│ Replay           │ Yes              │ No               │ No                │
│ Consumer Groups  │ Yes              │ Via exchanges    │ No                │
│ Throughput       │ Very High        │ High             │ Very High         │
│ Latency          │ Low-Medium       │ Low              │ Very Low          │
│ Exactly Once     │ Yes (2.0+)       │ With effort      │ No                │
│ Use Case         │ Streaming, logs  │ Task queues      │ Real-time notify  │
│ Complexity       │ High             │ Medium           │ Low               │
│ Scaling          │ Horizontal       │ Vertical first   │ Horizontal        │
└──────────────────┴──────────────────┴──────────────────┴───────────────────┘
```

**When to use each:**

```typescript
// KAFKA - High throughput, event streaming, replay needed
// - Order processing at scale
// - Log aggregation
// - Real-time analytics
// - Microservices event bus

// RABBITMQ - Task queues, complex routing, work distribution
// - Background job processing
// - Request/Reply patterns
// - Complex routing requirements
// - Traditional message queuing

// REDIS PUB/SUB - Simple real-time notifications
// - WebSocket event distribution
// - Cache invalidation
// - Simple notifications
// - Low-latency requirements
```

---

## Kafka Deep Dive

### Q4: Explain Kafka architecture and implementation.

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Kafka Architecture                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRODUCERS                     KAFKA CLUSTER                    CONSUMERS   │
│                                                                              │
│  ┌──────────┐              ┌─────────────────────┐                          │
│  │Producer 1│──────────────│      Topic A        │                          │
│  └──────────┘              │  ┌─────┬─────┬─────┐│         ┌──────────────┐ │
│                            │  │ P0  │ P1  │ P2  ││─────────│Consumer Group│ │
│  ┌──────────┐              │  └─────┴─────┴─────┘│         │      A       │ │
│  │Producer 2│──────────────│                     │         │ ┌──────────┐ │ │
│  └──────────┘              │  Leader  Follower   │         │ │Consumer 1│ │ │
│                            │                     │         │ │  (P0,P1) │ │ │
│                            └─────────────────────┘         │ └──────────┘ │ │
│                                                            │ ┌──────────┐ │ │
│                            ┌─────────────────────┐         │ │Consumer 2│ │ │
│                            │      Topic B        │         │ │  (P2)    │ │ │
│                            │  ┌─────┬─────┐      │         │ └──────────┘ │ │
│                            │  │ P0  │ P1  │      │         └──────────────┘ │
│                            │  └─────┴─────┘      │                          │
│                            └─────────────────────┘         ┌──────────────┐ │
│                                                            │Consumer Group│ │
│  Broker 1   Broker 2   Broker 3                            │      B       │ │
│  ┌──────┐   ┌──────┐   ┌──────┐                           └──────────────┘ │
│  │      │   │      │   │      │                                             │
│  │ P0   │   │ P1   │   │ P2   │  ← Partition distribution                  │
│  │(lead)│   │(lead)│   │(lead)│                                             │
│  │ P1   │   │ P2   │   │ P0   │  ← Replicas                                │
│  │(repl)│   │(repl)│   │(repl)│                                             │
│  └──────┘   └──────┘   └──────┘                                             │
│                                                                              │
│  ZooKeeper / KRaft (metadata, leader election)                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// ========== NestJS Kafka Implementation ==========

// 1. Module Configuration
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'order-service',
            brokers: ['localhost:9092', 'localhost:9093'],
          },
          consumer: {
            groupId: 'order-consumer-group',
          },
          producer: {
            allowAutoTopicCreation: true,
          },
        },
      },
    ]),
  ],
})
export class KafkaModule {}

// 2. Producer Service
@Injectable()
export class OrderProducer implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Subscribe to response topics if needed
    this.kafkaClient.subscribeToResponseOf('order.process');
    await this.kafkaClient.connect();
  }

  // Fire and forget
  async publishOrderCreated(order: Order): Promise<void> {
    this.kafkaClient.emit('order.created', {
      key: order.id, // Ensures ordering per order
      value: JSON.stringify({
        eventId: uuid(),
        eventType: 'ORDER_CREATED',
        timestamp: new Date().toISOString(),
        payload: order,
      }),
      headers: {
        'correlation-id': order.correlationId,
        'source-service': 'order-service',
      },
    });
  }

  // Request-Reply pattern
  async processOrder(order: Order): Promise<ProcessOrderResult> {
    return firstValueFrom(
      this.kafkaClient.send('order.process', {
        key: order.id,
        value: JSON.stringify(order),
      }),
    );
  }
}

// 3. Consumer Controller
@Controller()
export class OrderConsumer {
  @EventPattern('order.created')
  async handleOrderCreated(@Payload() message: OrderCreatedEvent) {
    console.log('Received order:', message.payload.orderId);

    // Process event
    await this.processOrder(message.payload);
  }

  @MessagePattern('order.process')
  async handleOrderProcess(
    @Payload() order: Order,
    @Ctx() context: KafkaContext,
  ): Promise<ProcessOrderResult> {
    const { offset, partition, topic } = context.getMessage();
    console.log(`Processing order from ${topic}[${partition}]@${offset}`);

    // Process and return result
    return this.orderService.process(order);
  }
}

// 4. Advanced Producer with Transactions
@Injectable()
export class TransactionalProducer {
  private producer: Producer;

  async publishWithTransaction(events: KafkaEvent[]): Promise<void> {
    const transaction = await this.producer.transaction();

    try {
      for (const event of events) {
        await transaction.send({
          topic: event.topic,
          messages: [{ key: event.key, value: event.value }],
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.abort();
      throw error;
    }
  }
}

// 5. Consumer with Manual Offset Management
@Controller()
export class ManualOffsetConsumer {
  @EventPattern('critical.events')
  async handleCriticalEvent(
    @Payload() message: any,
    @Ctx() context: KafkaContext,
  ) {
    const heartbeat = context.getHeartbeat();
    const { offset, partition, topic } = context.getMessage();

    try {
      // Process event
      await this.processEvent(message);

      // Send heartbeat for long processing
      await heartbeat();

      // Commit offset after successful processing
      await context.getConsumer().commitOffsets([
        { topic, partition, offset: (parseInt(offset) + 1).toString() },
      ]);
    } catch (error) {
      // Don't commit - message will be reprocessed
      console.error('Failed to process:', error);
      throw error;
    }
  }
}

// 6. Partitioner for custom routing
class OrderPartitioner implements Partitioner {
  partition(args: PartitionerArgs): number {
    const { topic, partitionMetadata, message } = args;
    const numPartitions = partitionMetadata.length;

    // Route by user ID to ensure user's orders go to same partition
    const userId = JSON.parse(message.value as string).userId;
    const hash = this.hashCode(userId);

    return Math.abs(hash) % numPartitions;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
```

---

## RabbitMQ Deep Dive

### Q5: Explain RabbitMQ exchanges, queues, and routing.

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RabbitMQ Architecture                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Producer ───→ Exchange ───→ Queue ───→ Consumer                            │
│                   │                                                          │
│                   │ Binding (routing key)                                    │
│                   │                                                          │
│  EXCHANGE TYPES:                                                             │
│                                                                              │
│  1. DIRECT - Exact routing key match                                         │
│     ┌──────────┐     routing_key: "order.created"                           │
│     │  Direct  │────────────────────────────────→ order_created_queue       │
│     │ Exchange │     routing_key: "order.updated"                           │
│     └──────────┘────────────────────────────────→ order_updated_queue       │
│                                                                              │
│  2. TOPIC - Pattern matching (* one word, # zero or more)                   │
│     ┌──────────┐     routing_key: "order.*"                                 │
│     │  Topic   │────────────────────────────────→ all_order_events_queue    │
│     │ Exchange │     routing_key: "order.created.#"                         │
│     └──────────┘────────────────────────────────→ order_created_queue       │
│                                                                              │
│  3. FANOUT - Broadcast to all bound queues                                  │
│     ┌──────────┐                                                            │
│     │  Fanout  │────────→ notification_queue                                │
│     │ Exchange │────────→ analytics_queue                                   │
│     └──────────┘────────→ audit_queue                                       │
│                                                                              │
│  4. HEADERS - Match on message headers                                       │
│     ┌──────────┐     x-match: all, type: "order", priority: "high"          │
│     │ Headers  │────────────────────────────────→ high_priority_queue       │
│     │ Exchange │                                                             │
│     └──────────┘                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// ========== NestJS RabbitMQ Implementation ==========

// 1. Module Configuration
@Module({
  imports: [
    RabbitMQModule.forRoot(RabbitMQModule, {
      uri: 'amqp://localhost:5672',
      exchanges: [
        {
          name: 'order.exchange',
          type: 'topic',
          options: { durable: true },
        },
        {
          name: 'notification.exchange',
          type: 'fanout',
          options: { durable: true },
        },
      ],
      queues: [
        {
          name: 'order.created.queue',
          options: {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': 'dlx.exchange',
              'x-dead-letter-routing-key': 'order.created.dlq',
            },
          },
        },
      ],
      bindings: [
        {
          exchange: 'order.exchange',
          routingKey: 'order.created',
          queue: 'order.created.queue',
        },
      ],
    }),
  ],
})
export class RabbitModule {}

// 2. Publisher Service
@Injectable()
export class OrderPublisher {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publishOrderCreated(order: Order): Promise<void> {
    await this.amqpConnection.publish(
      'order.exchange',
      'order.created',
      {
        eventId: uuid(),
        eventType: 'ORDER_CREATED',
        timestamp: new Date(),
        payload: order,
      },
      {
        persistent: true, // Survives broker restart
        messageId: uuid(),
        correlationId: order.correlationId,
        headers: {
          'x-retry-count': 0,
          'x-source-service': 'order-service',
        },
      },
    );
  }

  // Request-Reply pattern (RPC)
  async processOrderSync(order: Order): Promise<ProcessResult> {
    return this.amqpConnection.request<ProcessResult>({
      exchange: 'order.exchange',
      routingKey: 'order.process',
      payload: order,
      timeout: 30000,
    });
  }
}

// 3. Consumer Service
@Injectable()
export class OrderConsumer {
  @RabbitSubscribe({
    exchange: 'order.exchange',
    routingKey: 'order.created',
    queue: 'order.created.queue',
    queueOptions: {
      durable: true,
    },
  })
  async handleOrderCreated(message: OrderCreatedEvent, amqpMsg: ConsumeMessage) {
    const channel = this.amqpConnection.channel;

    try {
      // Process message
      await this.processOrder(message.payload);

      // Acknowledge
      channel.ack(amqpMsg);
    } catch (error) {
      const retryCount = amqpMsg.properties.headers['x-retry-count'] || 0;

      if (retryCount < 3) {
        // Retry with delay
        channel.nack(amqpMsg, false, false); // Don't requeue
        await this.publishForRetry(message, retryCount + 1);
      } else {
        // Send to DLQ
        channel.nack(amqpMsg, false, false);
      }
    }
  }

  private async publishForRetry(message: any, retryCount: number): Promise<void> {
    const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff

    await this.amqpConnection.publish(
      'retry.exchange',
      'order.created.retry',
      message,
      {
        headers: {
          'x-retry-count': retryCount,
          'x-delay': delay, // Requires delayed message plugin
        },
      },
    );
  }

  // RPC Handler
  @RabbitRPC({
    exchange: 'order.exchange',
    routingKey: 'order.process',
    queue: 'order.process.queue',
  })
  async handleOrderProcess(order: Order): Promise<ProcessResult> {
    return this.orderService.process(order);
  }
}

// 4. Dead Letter Queue Handler
@Injectable()
export class DLQHandler {
  @RabbitSubscribe({
    exchange: 'dlx.exchange',
    routingKey: 'order.created.dlq',
    queue: 'order.created.dlq',
  })
  async handleDeadLetter(message: any, amqpMsg: ConsumeMessage) {
    const originalRoutingKey = amqpMsg.properties.headers['x-first-death-queue'];
    const reason = amqpMsg.properties.headers['x-first-death-reason'];

    // Log for investigation
    await this.alertService.sendAlert({
      type: 'DEAD_LETTER',
      queue: originalRoutingKey,
      reason,
      message,
    });

    // Store for manual processing
    await this.dlqRepository.save({
      originalQueue: originalRoutingKey,
      message: JSON.stringify(message),
      failedAt: new Date(),
      reason,
    });
  }
}

// 5. Priority Queue
@Module({
  imports: [
    RabbitMQModule.forRoot(RabbitMQModule, {
      queues: [
        {
          name: 'priority.queue',
          options: {
            durable: true,
            arguments: {
              'x-max-priority': 10, // Priority 0-10
            },
          },
        },
      ],
    }),
  ],
})
export class PriorityQueueModule {}

// Publishing with priority
async publishWithPriority(message: any, priority: number): Promise<void> {
  await this.amqpConnection.publish(
    'exchange',
    'routing.key',
    message,
    {
      priority, // 0-10, higher = more priority
    },
  );
}
```

---

## Event Sourcing

### Q6: What is Event Sourcing and how do you implement it?

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Event Sourcing                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRADITIONAL (State Storage)         EVENT SOURCING                          │
│                                                                              │
│  ┌──────────────────┐               ┌──────────────────┐                    │
│  │     Orders       │               │   Event Store    │                    │
│  ├──────────────────┤               ├──────────────────┤                    │
│  │ id: 123          │               │ OrderCreated     │                    │
│  │ status: SHIPPED  │    vs         │ ItemAdded        │                    │
│  │ total: $100      │               │ PaymentReceived  │                    │
│  │ items: [...]     │               │ OrderShipped     │                    │
│  └──────────────────┘               └──────────────────┘                    │
│                                            │                                │
│  Only current state                        ▼                                │
│  No history                          Rebuild state                          │
│                                      from events                            │
│                                                                              │
│  Benefits of Event Sourcing:                                                │
│  ✓ Complete audit trail                                                     │
│  ✓ Temporal queries (state at any point)                                    │
│  ✓ Event replay for debugging                                               │
│  ✓ Easy to add new projections                                              │
│  ✓ Natural fit for CQRS                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// ========== Event Sourcing Implementation ==========

// 1. Event Base Classes
abstract class DomainEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly aggregateId: string;
  readonly version: number;

  constructor(aggregateId: string, version: number) {
    this.eventId = uuid();
    this.timestamp = new Date();
    this.aggregateId = aggregateId;
    this.version = version;
  }

  abstract get eventType(): string;
}

// 2. Order Events
class OrderCreatedEvent extends DomainEvent {
  get eventType() { return 'ORDER_CREATED'; }

  constructor(
    aggregateId: string,
    version: number,
    public readonly userId: string,
    public readonly items: OrderItem[],
  ) {
    super(aggregateId, version);
  }
}

class OrderItemAddedEvent extends DomainEvent {
  get eventType() { return 'ORDER_ITEM_ADDED'; }

  constructor(
    aggregateId: string,
    version: number,
    public readonly item: OrderItem,
  ) {
    super(aggregateId, version);
  }
}

class OrderShippedEvent extends DomainEvent {
  get eventType() { return 'ORDER_SHIPPED'; }

  constructor(
    aggregateId: string,
    version: number,
    public readonly shippingAddress: Address,
    public readonly trackingNumber: string,
  ) {
    super(aggregateId, version);
  }
}

// 3. Order Aggregate
class Order {
  private _id: string;
  private _userId: string;
  private _items: OrderItem[] = [];
  private _status: OrderStatus = 'DRAFT';
  private _shippingAddress: Address | null = null;
  private _version: number = 0;
  private _uncommittedEvents: DomainEvent[] = [];

  get id() { return this._id; }
  get userId() { return this._userId; }
  get items() { return [...this._items]; }
  get status() { return this._status; }
  get version() { return this._version; }
  get uncommittedEvents() { return [...this._uncommittedEvents]; }

  // Create new order
  static create(id: string, userId: string, items: OrderItem[]): Order {
    const order = new Order();
    order.apply(new OrderCreatedEvent(id, 1, userId, items));
    return order;
  }

  // Reconstitute from events
  static fromHistory(events: DomainEvent[]): Order {
    const order = new Order();
    for (const event of events) {
      order.applyFromHistory(event);
    }
    return order;
  }

  // Commands
  addItem(item: OrderItem): void {
    if (this._status !== 'DRAFT') {
      throw new Error('Cannot add items to non-draft order');
    }
    this.apply(new OrderItemAddedEvent(this._id, this._version + 1, item));
  }

  ship(address: Address, trackingNumber: string): void {
    if (this._status !== 'PAID') {
      throw new Error('Cannot ship unpaid order');
    }
    this.apply(new OrderShippedEvent(
      this._id,
      this._version + 1,
      address,
      trackingNumber,
    ));
  }

  // Apply event (for new events)
  private apply(event: DomainEvent): void {
    this.when(event);
    this._uncommittedEvents.push(event);
  }

  // Apply event from history (replay)
  private applyFromHistory(event: DomainEvent): void {
    this.when(event);
    this._version = event.version;
  }

  // Event handlers (state changes)
  private when(event: DomainEvent): void {
    if (event instanceof OrderCreatedEvent) {
      this._id = event.aggregateId;
      this._userId = event.userId;
      this._items = [...event.items];
      this._status = 'DRAFT';
    } else if (event instanceof OrderItemAddedEvent) {
      this._items.push(event.item);
    } else if (event instanceof OrderShippedEvent) {
      this._status = 'SHIPPED';
      this._shippingAddress = event.shippingAddress;
    }
  }

  clearUncommittedEvents(): void {
    this._uncommittedEvents = [];
  }
}

// 4. Event Store
@Injectable()
export class EventStore {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    private readonly eventBus: EventBus,
  ) {}

  async saveEvents(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void> {
    // Optimistic concurrency check
    const lastEvent = await this.eventRepository.findOne({
      where: { aggregateId },
      order: { version: 'DESC' },
    });

    if (lastEvent && lastEvent.version !== expectedVersion) {
      throw new ConcurrencyError(
        `Expected version ${expectedVersion}, but found ${lastEvent.version}`,
      );
    }

    // Save events
    const entities = events.map(event => ({
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      version: event.version,
      data: JSON.stringify(event),
      timestamp: event.timestamp,
    }));

    await this.eventRepository.save(entities);

    // Publish events
    for (const event of events) {
      await this.eventBus.publish(event);
    }
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    const entities = await this.eventRepository.find({
      where: { aggregateId },
      order: { version: 'ASC' },
    });

    return entities.map(entity => this.deserialize(entity));
  }

  async getEventsAfterVersion(
    aggregateId: string,
    afterVersion: number,
  ): Promise<DomainEvent[]> {
    const entities = await this.eventRepository.find({
      where: {
        aggregateId,
        version: MoreThan(afterVersion),
      },
      order: { version: 'ASC' },
    });

    return entities.map(entity => this.deserialize(entity));
  }

  private deserialize(entity: EventEntity): DomainEvent {
    const eventData = JSON.parse(entity.data);

    switch (entity.eventType) {
      case 'ORDER_CREATED':
        return Object.assign(
          new OrderCreatedEvent(entity.aggregateId, entity.version, '', []),
          eventData,
        );
      // ... other event types
      default:
        throw new Error(`Unknown event type: ${entity.eventType}`);
    }
  }
}

// 5. Order Repository
@Injectable()
export class OrderRepository {
  constructor(private readonly eventStore: EventStore) {}

  async save(order: Order): Promise<void> {
    const uncommittedEvents = order.uncommittedEvents;

    if (uncommittedEvents.length === 0) {
      return;
    }

    await this.eventStore.saveEvents(
      order.id,
      uncommittedEvents,
      order.version - uncommittedEvents.length,
    );

    order.clearUncommittedEvents();
  }

  async getById(id: string): Promise<Order | null> {
    const events = await this.eventStore.getEvents(id);

    if (events.length === 0) {
      return null;
    }

    return Order.fromHistory(events);
  }
}

// 6. Snapshot for Performance
@Injectable()
export class SnapshotStore {
  constructor(
    @InjectRepository(SnapshotEntity)
    private readonly snapshotRepository: Repository<SnapshotEntity>,
  ) {}

  async saveSnapshot(order: Order): Promise<void> {
    await this.snapshotRepository.save({
      aggregateId: order.id,
      version: order.version,
      data: JSON.stringify({
        userId: order.userId,
        items: order.items,
        status: order.status,
      }),
      createdAt: new Date(),
    });
  }

  async getLatestSnapshot(aggregateId: string): Promise<{
    state: any;
    version: number;
  } | null> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { aggregateId },
      order: { version: 'DESC' },
    });

    if (!snapshot) return null;

    return {
      state: JSON.parse(snapshot.data),
      version: snapshot.version,
    };
  }
}

// 7. Repository with Snapshots
@Injectable()
export class OptimizedOrderRepository {
  constructor(
    private readonly eventStore: EventStore,
    private readonly snapshotStore: SnapshotStore,
  ) {}

  async getById(id: string): Promise<Order | null> {
    // Try to load from snapshot
    const snapshot = await this.snapshotStore.getLatestSnapshot(id);

    if (snapshot) {
      // Load events after snapshot
      const events = await this.eventStore.getEventsAfterVersion(
        id,
        snapshot.version,
      );

      // Rebuild from snapshot + new events
      const order = Order.fromSnapshot(snapshot.state, snapshot.version);
      for (const event of events) {
        order.applyFromHistory(event);
      }

      return order;
    }

    // No snapshot, load all events
    const events = await this.eventStore.getEvents(id);
    return events.length > 0 ? Order.fromHistory(events) : null;
  }

  async save(order: Order): Promise<void> {
    await this.eventStore.saveEvents(
      order.id,
      order.uncommittedEvents,
      order.version - order.uncommittedEvents.length,
    );

    // Create snapshot every 10 events
    if (order.version % 10 === 0) {
      await this.snapshotStore.saveSnapshot(order);
    }

    order.clearUncommittedEvents();
  }
}
```

---

## CQRS Pattern

### Q7: Explain CQRS and how it complements Event Sourcing.

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CQRS (Command Query Responsibility Segregation)           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ┌──────────┐                                   │
│                              │  Client  │                                   │
│                              └────┬─────┘                                   │
│                      ┌────────────┴────────────┐                            │
│                      │                         │                            │
│                      ▼                         ▼                            │
│               ┌──────────────┐          ┌──────────────┐                   │
│               │   Command    │          │    Query     │                   │
│               │   Handler    │          │   Handler    │                   │
│               └──────┬───────┘          └──────┬───────┘                   │
│                      │                         │                            │
│                      ▼                         ▼                            │
│               ┌──────────────┐          ┌──────────────┐                   │
│               │    Write     │──Events─→│    Read      │                   │
│               │    Model     │          │    Model     │                   │
│               │  (Domain)    │          │ (Projections)│                   │
│               └──────────────┘          └──────────────┘                   │
│                      │                         │                            │
│                      ▼                         ▼                            │
│               ┌──────────────┐          ┌──────────────┐                   │
│               │ Event Store  │          │  Read DB     │                   │
│               │ (PostgreSQL) │          │ (MongoDB/ES) │                   │
│               └──────────────┘          └──────────────┘                   │
│                                                                              │
│  Commands: CreateOrder, AddItem, ShipOrder                                  │
│  Queries: GetOrder, ListOrders, SearchOrders                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// ========== CQRS Implementation ==========

// 1. Commands
class CreateOrderCommand {
  constructor(
    public readonly userId: string,
    public readonly items: OrderItem[],
  ) {}
}

class ShipOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly shippingAddress: Address,
  ) {}
}

// 2. Command Handlers
@Injectable()
export class CreateOrderHandler {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  @CommandHandler(CreateOrderCommand)
  async execute(command: CreateOrderCommand): Promise<string> {
    // Create aggregate
    const order = Order.create(
      uuid(),
      command.userId,
      command.items,
    );

    // Save (events will be published)
    await this.orderRepository.save(order);

    return order.id;
  }
}

@Injectable()
export class ShipOrderHandler {
  constructor(private readonly orderRepository: OrderRepository) {}

  @CommandHandler(ShipOrderCommand)
  async execute(command: ShipOrderCommand): Promise<void> {
    const order = await this.orderRepository.getById(command.orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.ship(command.shippingAddress, this.generateTrackingNumber());

    await this.orderRepository.save(order);
  }
}

// 3. Read Model (Projection)
@Entity('order_read_model')
export class OrderReadModel {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  @Column()
  status: string;

  @Column('decimal')
  total: number;

  @Column('int')
  itemCount: number;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  shippedAt: Date;

  @Column({ type: 'jsonb' })
  items: any[];

  @Column({ nullable: true })
  trackingNumber: string;
}

// 4. Projection Handler (Event Handlers that update read model)
@Injectable()
export class OrderProjection {
  constructor(
    @InjectRepository(OrderReadModel)
    private readonly readRepository: Repository<OrderReadModel>,
  ) {}

  @EventHandler(OrderCreatedEvent)
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const readModel = new OrderReadModel();
    readModel.id = event.aggregateId;
    readModel.userId = event.userId;
    readModel.status = 'DRAFT';
    readModel.items = event.items;
    readModel.itemCount = event.items.length;
    readModel.total = this.calculateTotal(event.items);
    readModel.createdAt = event.timestamp;

    await this.readRepository.save(readModel);
  }

  @EventHandler(OrderItemAddedEvent)
  async onItemAdded(event: OrderItemAddedEvent): Promise<void> {
    const readModel = await this.readRepository.findOne({
      where: { id: event.aggregateId },
    });

    if (readModel) {
      readModel.items.push(event.item);
      readModel.itemCount++;
      readModel.total = this.calculateTotal(readModel.items);

      await this.readRepository.save(readModel);
    }
  }

  @EventHandler(OrderShippedEvent)
  async onOrderShipped(event: OrderShippedEvent): Promise<void> {
    await this.readRepository.update(
      { id: event.aggregateId },
      {
        status: 'SHIPPED',
        shippedAt: event.timestamp,
        trackingNumber: event.trackingNumber,
      },
    );
  }

  private calculateTotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}

// 5. Query Handlers
@Injectable()
export class GetOrderQueryHandler {
  constructor(
    @InjectRepository(OrderReadModel)
    private readonly readRepository: Repository<OrderReadModel>,
  ) {}

  @QueryHandler(GetOrderQuery)
  async execute(query: GetOrderQuery): Promise<OrderReadModel> {
    const order = await this.readRepository.findOne({
      where: { id: query.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}

@Injectable()
export class SearchOrdersQueryHandler {
  constructor(
    @InjectRepository(OrderReadModel)
    private readonly readRepository: Repository<OrderReadModel>,
  ) {}

  @QueryHandler(SearchOrdersQuery)
  async execute(query: SearchOrdersQuery): Promise<PaginatedResult<OrderReadModel>> {
    const [items, total] = await this.readRepository.findAndCount({
      where: {
        userId: query.userId,
        ...(query.status && { status: query.status }),
      },
      order: { createdAt: 'DESC' },
      skip: query.offset,
      take: query.limit,
    });

    return { items, total, offset: query.offset, limit: query.limit };
  }
}

// 6. Controller using CQRS
@Controller('orders')
export class OrderController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async createOrder(@Body() dto: CreateOrderDto): Promise<{ orderId: string }> {
    const orderId = await this.commandBus.execute(
      new CreateOrderCommand(dto.userId, dto.items),
    );
    return { orderId };
  }

  @Get(':id')
  async getOrder(@Param('id') id: string): Promise<OrderReadModel> {
    return this.queryBus.execute(new GetOrderQuery(id));
  }

  @Get()
  async searchOrders(
    @Query() query: SearchOrdersDto,
  ): Promise<PaginatedResult<OrderReadModel>> {
    return this.queryBus.execute(new SearchOrdersQuery(
      query.userId,
      query.status,
      query.offset || 0,
      query.limit || 20,
    ));
  }

  @Post(':id/ship')
  async shipOrder(
    @Param('id') id: string,
    @Body() dto: ShipOrderDto,
  ): Promise<void> {
    await this.commandBus.execute(new ShipOrderCommand(id, dto.address));
  }
}
```

---

## Saga Pattern

### Q8: Explain the Saga pattern for distributed transactions.

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Saga Pattern                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CHOREOGRAPHY (Event-driven)           ORCHESTRATION (Central coordinator)  │
│                                                                              │
│  ┌─────────┐ event ┌─────────┐        ┌─────────────────────┐              │
│  │ Order   │──────→│Inventory│        │    Saga            │              │
│  │ Service │       │ Service │        │    Orchestrator     │              │
│  └─────────┘       └────┬────┘        └──────────┬──────────┘              │
│       ▲                 │                        │                          │
│       │    event        │event                   │ command                  │
│       │                 ▼                        ▼                          │
│  ┌─────────┐       ┌─────────┐        ┌──────────────────────────────────┐ │
│  │Shipping │←──────│ Payment │        │   Order  │ Inventory │ Payment  │ │
│  │ Service │       │ Service │        │  Service │  Service  │ Service  │ │
│  └─────────┘       └─────────┘        └──────────────────────────────────┘ │
│                                                                              │
│  Pros:                                 Pros:                                 │
│  - No single point of failure         - Centralized logic                   │
│  - Loose coupling                      - Easier to understand               │
│  - Simple services                     - Better error handling              │
│                                                                              │
│  Cons:                                 Cons:                                 │
│  - Hard to track                       - Single point of failure            │
│  - Complex flow                        - Coupling to orchestrator           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// ========== Orchestration Saga Implementation ==========

// 1. Saga Definition
interface SagaStep<T> {
  name: string;
  execute: (context: T) => Promise<void>;
  compensate: (context: T) => Promise<void>;
}

class OrderSaga {
  private steps: SagaStep<OrderSagaContext>[] = [];
  private executedSteps: SagaStep<OrderSagaContext>[] = [];

  constructor(private readonly context: OrderSagaContext) {
    this.defineSteps();
  }

  private defineSteps(): void {
    this.steps = [
      {
        name: 'ReserveInventory',
        execute: async (ctx) => {
          ctx.inventoryReservationId = await this.inventoryService.reserve(
            ctx.orderId,
            ctx.items,
          );
        },
        compensate: async (ctx) => {
          if (ctx.inventoryReservationId) {
            await this.inventoryService.cancelReservation(
              ctx.inventoryReservationId,
            );
          }
        },
      },
      {
        name: 'ProcessPayment',
        execute: async (ctx) => {
          ctx.paymentId = await this.paymentService.charge(
            ctx.userId,
            ctx.total,
            ctx.orderId,
          );
        },
        compensate: async (ctx) => {
          if (ctx.paymentId) {
            await this.paymentService.refund(ctx.paymentId);
          }
        },
      },
      {
        name: 'ConfirmInventory',
        execute: async (ctx) => {
          await this.inventoryService.confirmReservation(
            ctx.inventoryReservationId,
          );
        },
        compensate: async (ctx) => {
          // Inventory was already compensated in first step
        },
      },
      {
        name: 'CreateShipment',
        execute: async (ctx) => {
          ctx.shipmentId = await this.shippingService.createShipment(
            ctx.orderId,
            ctx.shippingAddress,
          );
        },
        compensate: async (ctx) => {
          if (ctx.shipmentId) {
            await this.shippingService.cancelShipment(ctx.shipmentId);
          }
        },
      },
    ];
  }

  async execute(): Promise<void> {
    for (const step of this.steps) {
      try {
        await step.execute(this.context);
        this.executedSteps.push(step);
      } catch (error) {
        console.error(`Step ${step.name} failed:`, error);
        await this.compensate();
        throw error;
      }
    }
  }

  private async compensate(): Promise<void> {
    // Execute compensations in reverse order
    for (const step of this.executedSteps.reverse()) {
      try {
        await step.compensate(this.context);
      } catch (error) {
        console.error(`Compensation for ${step.name} failed:`, error);
        // Log for manual intervention
        await this.alertService.sendCompensationFailure(step.name, error);
      }
    }
  }
}

// 2. Saga Orchestrator Service
@Injectable()
export class OrderSagaOrchestrator {
  constructor(
    private readonly sagaRepository: SagaRepository,
    private readonly inventoryClient: ClientProxy,
    private readonly paymentClient: ClientProxy,
    private readonly shippingClient: ClientProxy,
    private readonly eventBus: EventBus,
  ) {}

  async processOrder(order: Order): Promise<void> {
    // Create saga state
    const sagaState = await this.sagaRepository.create({
      orderId: order.id,
      status: 'STARTED',
      currentStep: 'RESERVE_INVENTORY',
      context: {
        orderId: order.id,
        userId: order.userId,
        items: order.items,
        total: order.total,
        shippingAddress: order.shippingAddress,
      },
    });

    try {
      // Step 1: Reserve Inventory
      const inventoryResult = await firstValueFrom(
        this.inventoryClient.send('inventory.reserve', {
          orderId: order.id,
          items: order.items,
        }),
      );

      await this.updateSagaState(sagaState.id, {
        currentStep: 'PROCESS_PAYMENT',
        context: { ...sagaState.context, inventoryReservationId: inventoryResult.reservationId },
      });

      // Step 2: Process Payment
      const paymentResult = await firstValueFrom(
        this.paymentClient.send('payment.charge', {
          userId: order.userId,
          amount: order.total,
          orderId: order.id,
        }),
      );

      await this.updateSagaState(sagaState.id, {
        currentStep: 'CREATE_SHIPMENT',
        context: { ...sagaState.context, paymentId: paymentResult.paymentId },
      });

      // Step 3: Create Shipment
      const shipmentResult = await firstValueFrom(
        this.shippingClient.send('shipping.create', {
          orderId: order.id,
          address: order.shippingAddress,
        }),
      );

      // Saga completed
      await this.updateSagaState(sagaState.id, {
        status: 'COMPLETED',
        context: { ...sagaState.context, shipmentId: shipmentResult.shipmentId },
      });

      this.eventBus.emit('order.saga.completed', { orderId: order.id });

    } catch (error) {
      await this.compensate(sagaState);
      throw error;
    }
  }

  private async compensate(sagaState: SagaState): Promise<void> {
    await this.updateSagaState(sagaState.id, { status: 'COMPENSATING' });

    const context = sagaState.context;

    try {
      // Compensate in reverse order
      if (context.shipmentId) {
        await firstValueFrom(
          this.shippingClient.send('shipping.cancel', { shipmentId: context.shipmentId }),
        );
      }

      if (context.paymentId) {
        await firstValueFrom(
          this.paymentClient.send('payment.refund', { paymentId: context.paymentId }),
        );
      }

      if (context.inventoryReservationId) {
        await firstValueFrom(
          this.inventoryClient.send('inventory.release', {
            reservationId: context.inventoryReservationId,
          }),
        );
      }

      await this.updateSagaState(sagaState.id, { status: 'COMPENSATED' });
      this.eventBus.emit('order.saga.compensated', { orderId: context.orderId });

    } catch (compensationError) {
      await this.updateSagaState(sagaState.id, {
        status: 'COMPENSATION_FAILED',
        error: compensationError.message,
      });
      // Alert for manual intervention
      this.alertService.sendSagaCompensationFailure(sagaState.id, compensationError);
    }
  }
}

// 3. Choreography Saga (Event-driven)
@Injectable()
export class InventoryService {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      const reservation = await this.reserveInventory(event.items);

      // Emit success event
      this.eventBus.emit('inventory.reserved', {
        orderId: event.orderId,
        reservationId: reservation.id,
      });
    } catch (error) {
      // Emit failure event
      this.eventBus.emit('inventory.reservation.failed', {
        orderId: event.orderId,
        reason: error.message,
      });
    }
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    // Compensate: release inventory
    await this.releaseReservation(event.orderId);
  }
}

@Injectable()
export class PaymentService {
  @OnEvent('inventory.reserved')
  async handleInventoryReserved(event: InventoryReservedEvent): Promise<void> {
    try {
      const payment = await this.processPayment(event.orderId);

      this.eventBus.emit('payment.completed', {
        orderId: event.orderId,
        paymentId: payment.id,
      });
    } catch (error) {
      this.eventBus.emit('payment.failed', {
        orderId: event.orderId,
        reason: error.message,
      });
    }
  }
}
```

---

## Outbox Pattern

### Q9: Explain the Outbox Pattern for reliable event publishing.

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Outbox Pattern                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Problem: Database write and event publish must be atomic                   │
│                                                                              │
│  ❌ WRONG (Two-phase problem)                                               │
│                                                                              │
│  1. Save to DB ─────→ Success                                               │
│  2. Publish Event ──→ FAILURE! (Event lost, data inconsistent)              │
│                                                                              │
│  ✓ OUTBOX SOLUTION                                                          │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐             │
│  │                    Single Transaction                       │             │
│  │  ┌──────────────┐        ┌──────────────┐                  │             │
│  │  │   Orders     │        │   Outbox     │                  │             │
│  │  │              │        │              │                  │             │
│  │  │ INSERT order │        │ INSERT event │                  │             │
│  │  └──────────────┘        └──────────────┘                  │             │
│  └────────────────────────────────────────────────────────────┘             │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐             │
│  │              Outbox Processor (async)                       │             │
│  │                                                             │             │
│  │  1. Read pending events from outbox                        │             │
│  │  2. Publish to message broker                              │             │
│  │  3. Mark event as published                                │             │
│  └────────────────────────────────────────────────────────────┘             │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐             │
│  │                   Message Broker                            │             │
│  │                  (Kafka/RabbitMQ)                           │             │
│  └────────────────────────────────────────────────────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// ========== Outbox Pattern Implementation ==========

// 1. Outbox Entity
@Entity('outbox')
export class OutboxMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  aggregateType: string; // e.g., 'Order'

  @Column()
  aggregateId: string;

  @Column()
  eventType: string; // e.g., 'OrderCreated'

  @Column('jsonb')
  payload: any;

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';

  @Column({ default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  publishedAt: Date;

  @Column({ nullable: true })
  error: string;
}

// 2. Repository with Outbox
@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OutboxMessage)
    private readonly outboxRepo: Repository<OutboxMessage>,
    private readonly dataSource: DataSource,
  ) {}

  async save(order: Order, events: DomainEvent[]): Promise<void> {
    // Use transaction to ensure atomicity
    await this.dataSource.transaction(async (manager) => {
      // Save order
      await manager.save(order);

      // Save events to outbox
      for (const event of events) {
        await manager.save(OutboxMessage, {
          aggregateType: 'Order',
          aggregateId: order.id,
          eventType: event.constructor.name,
          payload: event,
          status: 'PENDING',
        });
      }
    });
  }
}

// 3. Outbox Processor (Polling-based)
@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    @InjectRepository(OutboxMessage)
    private readonly outboxRepo: Repository<OutboxMessage>,
    private readonly kafkaClient: ClientKafka,
  ) {}

  @Cron('*/5 * * * * *') // Every 5 seconds
  async processOutbox(): Promise<void> {
    const messages = await this.outboxRepo.find({
      where: { status: 'PENDING' },
      order: { createdAt: 'ASC' },
      take: 100, // Batch size
    });

    for (const message of messages) {
      try {
        await this.publishMessage(message);
        await this.markAsPublished(message);
      } catch (error) {
        await this.handleFailure(message, error);
      }
    }
  }

  private async publishMessage(message: OutboxMessage): Promise<void> {
    const topic = this.getTopicForEventType(message.eventType);

    await firstValueFrom(
      this.kafkaClient.emit(topic, {
        key: message.aggregateId,
        value: JSON.stringify({
          eventId: message.id,
          eventType: message.eventType,
          aggregateId: message.aggregateId,
          payload: message.payload,
          timestamp: message.createdAt,
        }),
      }),
    );
  }

  private async markAsPublished(message: OutboxMessage): Promise<void> {
    await this.outboxRepo.update(message.id, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });
  }

  private async handleFailure(message: OutboxMessage, error: Error): Promise<void> {
    const maxRetries = 5;

    if (message.retryCount >= maxRetries) {
      await this.outboxRepo.update(message.id, {
        status: 'FAILED',
        error: error.message,
      });
      this.logger.error(`Message ${message.id} failed permanently`, error);
    } else {
      await this.outboxRepo.update(message.id, {
        retryCount: message.retryCount + 1,
        error: error.message,
      });
    }
  }

  private getTopicForEventType(eventType: string): string {
    const mapping = {
      OrderCreated: 'order.events',
      PaymentCompleted: 'payment.events',
      ShipmentCreated: 'shipping.events',
    };
    return mapping[eventType] || 'default.events';
  }
}

// 4. CDC-based Outbox (Debezium approach)
// Instead of polling, use Change Data Capture to stream outbox changes

// docker-compose.yml for Debezium
/*
debezium:
  image: debezium/connect:latest
  environment:
    BOOTSTRAP_SERVERS: kafka:9092
    CONFIG_STORAGE_TOPIC: debezium_configs
    OFFSET_STORAGE_TOPIC: debezium_offsets
    STATUS_STORAGE_TOPIC: debezium_statuses
*/

// Debezium connector configuration
/*
{
  "name": "outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "app",
    "database.password": "password",
    "database.dbname": "orders",
    "table.include.list": "public.outbox",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.payload": "payload",
    "transforms.outbox.route.topic.replacement": "${routedByValue}",
    "transforms.outbox.table.fields.additional.placement": "aggregate_type:header,event_type:header"
  }
}
*/

// 5. Cleanup old published messages
@Cron('0 0 * * *') // Daily at midnight
async cleanupPublishedMessages(): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days

  await this.outboxRepo.delete({
    status: 'PUBLISHED',
    publishedAt: LessThan(cutoffDate),
  });
}
```

---

## Idempotency & Deduplication

### Q10: How do you handle duplicate events and ensure idempotency?

**Answer:**

```typescript
// ========== Idempotency Implementation ==========

// 1. Idempotency Table
@Entity('processed_events')
export class ProcessedEvent {
  @PrimaryColumn()
  eventId: string;

  @Column()
  consumerId: string;

  @Column()
  eventType: string;

  @CreateDateColumn()
  processedAt: Date;

  @Column({ nullable: true })
  result: string;
}

// 2. Idempotent Event Handler
@Injectable()
export class IdempotentEventHandler {
  constructor(
    @InjectRepository(ProcessedEvent)
    private readonly processedRepo: Repository<ProcessedEvent>,
    private readonly dataSource: DataSource,
  ) {}

  async handleIdempotently<T>(
    eventId: string,
    consumerId: string,
    handler: () => Promise<T>,
  ): Promise<T | null> {
    // Check if already processed
    const existing = await this.processedRepo.findOne({
      where: { eventId, consumerId },
    });

    if (existing) {
      console.log(`Event ${eventId} already processed by ${consumerId}`);
      return JSON.parse(existing.result);
    }

    // Process with transaction
    return this.dataSource.transaction(async (manager) => {
      // Double-check with lock
      const locked = await manager.findOne(ProcessedEvent, {
        where: { eventId, consumerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (locked) {
        return JSON.parse(locked.result);
      }

      // Execute handler
      const result = await handler();

      // Record processing
      await manager.save(ProcessedEvent, {
        eventId,
        consumerId,
        eventType: 'unknown',
        result: JSON.stringify(result),
      });

      return result;
    });
  }
}

// 3. Usage in Consumer
@Injectable()
export class OrderEventConsumer {
  constructor(
    private readonly idempotentHandler: IdempotentEventHandler,
    private readonly inventoryService: InventoryService,
  ) {}

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.idempotentHandler.handleIdempotently(
      event.eventId,
      'inventory-service',
      async () => {
        await this.inventoryService.reserveForOrder(
          event.payload.orderId,
          event.payload.items,
        );
        return { reserved: true };
      },
    );
  }
}

// 4. Idempotency with Redis (faster for high throughput)
@Injectable()
export class RedisIdempotencyService {
  constructor(private readonly redis: Redis) {}

  async processOnce<T>(
    eventId: string,
    consumerId: string,
    ttlSeconds: number,
    handler: () => Promise<T>,
  ): Promise<{ processed: boolean; result: T | null }> {
    const key = `idempotency:${consumerId}:${eventId}`;

    // Try to acquire lock
    const acquired = await this.redis.set(
      key,
      'processing',
      'EX',
      ttlSeconds,
      'NX',
    );

    if (!acquired) {
      // Already processing or processed
      const existing = await this.redis.get(key);
      if (existing && existing !== 'processing') {
        return { processed: false, result: JSON.parse(existing) };
      }
      // Wait for processing to complete
      return { processed: false, result: null };
    }

    try {
      const result = await handler();

      // Store result
      await this.redis.setex(key, ttlSeconds, JSON.stringify(result));

      return { processed: true, result };
    } catch (error) {
      // Release lock on failure
      await this.redis.del(key);
      throw error;
    }
  }
}

// 5. Deduplication with Bloom Filter (probabilistic, memory-efficient)
@Injectable()
export class BloomFilterDeduplication {
  private filter: BloomFilter;

  constructor() {
    // 1 million items, 0.01% false positive rate
    this.filter = new BloomFilter(1000000, 0.0001);
  }

  mightBeProcessed(eventId: string): boolean {
    return this.filter.has(eventId);
  }

  markAsProcessed(eventId: string): void {
    this.filter.add(eventId);
  }

  // Use with exact check fallback
  async processWithBloomFilter<T>(
    eventId: string,
    exactChecker: (id: string) => Promise<boolean>,
    handler: () => Promise<T>,
  ): Promise<T | null> {
    // Fast path: not in bloom filter = definitely not processed
    if (!this.mightBeProcessed(eventId)) {
      const result = await handler();
      this.markAsProcessed(eventId);
      return result;
    }

    // Slow path: might be processed, check exactly
    const isProcessed = await exactChecker(eventId);
    if (isProcessed) {
      return null;
    }

    const result = await handler();
    this.markAsProcessed(eventId);
    return result;
  }
}

// 6. Idempotent Business Operations
@Injectable()
export class PaymentService {
  async processPayment(
    orderId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<Payment> {
    // Check for existing payment with this idempotency key
    const existing = await this.paymentRepository.findOne({
      where: { idempotencyKey },
    });

    if (existing) {
      // Return existing payment (idempotent)
      return existing;
    }

    // Create new payment
    return this.paymentRepository.save({
      orderId,
      amount,
      idempotencyKey,
      status: 'PENDING',
    });
  }
}
```

---

## Best Practices

### Q11: What are EDA best practices?

**Answer:**

```typescript
// 1. Event Naming Convention
// Past tense, specific, includes context
// Good: OrderCreated, PaymentProcessed, InventoryReserved
// Bad: CreateOrder, ProcessPayment, Order

// 2. Event Schema Evolution
interface OrderCreatedEventV1 {
  version: 1;
  orderId: string;
  items: OrderItem[];
}

interface OrderCreatedEventV2 {
  version: 2;
  orderId: string;
  items: OrderItem[];
  customerId: string; // New field
  metadata: Record<string, string>; // New field
}

// Backward compatible consumer
@OnEvent('order.created')
async handleOrderCreated(event: OrderCreatedEventV1 | OrderCreatedEventV2) {
  const customerId = 'customerId' in event
    ? event.customerId
    : await this.lookupCustomerId(event.orderId); // Fallback for v1
}

// 3. Error Handling with Dead Letter Queue
@Injectable()
export class ResilientConsumer {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      await this.processOrder(event);
    } catch (error) {
      if (this.isRetryable(error)) {
        throw error; // Will be retried
      }

      // Send to DLQ for manual handling
      await this.dlqService.send({
        originalEvent: event,
        error: error.message,
        failedAt: new Date(),
      });
    }
  }

  private isRetryable(error: Error): boolean {
    return error instanceof NetworkError
      || error instanceof TimeoutError;
  }
}

// 4. Correlation IDs for Tracing
interface EventEnvelope<T> {
  eventId: string;
  correlationId: string; // Trace across services
  causationId: string;   // Direct parent event
  timestamp: Date;
  source: string;
  payload: T;
}

// 5. Event Documentation
/**
 * @event OrderCreated
 * @description Emitted when a new order is successfully created
 * @version 2
 * @producer order-service
 * @consumers
 *   - inventory-service: Reserves inventory
 *   - notification-service: Sends confirmation email
 *   - analytics-service: Tracks order metrics
 */

// 6. Testing Events
describe('OrderEventConsumer', () => {
  it('should reserve inventory on OrderCreated', async () => {
    const event: OrderCreatedEvent = {
      eventId: 'evt-123',
      orderId: 'order-456',
      items: [{ productId: 'prod-1', quantity: 2 }],
    };

    await consumer.handleOrderCreated(event);

    expect(inventoryService.reserve).toHaveBeenCalledWith(
      'order-456',
      expect.arrayContaining([
        expect.objectContaining({ productId: 'prod-1' }),
      ]),
    );
  });

  it('should be idempotent', async () => {
    const event = createTestEvent();

    // Process twice
    await consumer.handleOrderCreated(event);
    await consumer.handleOrderCreated(event);

    // Should only process once
    expect(inventoryService.reserve).toHaveBeenCalledTimes(1);
  });
});

// 7. Monitoring and Alerting
// - Event processing latency
// - Consumer lag (Kafka)
// - Dead letter queue size
// - Event throughput
// - Error rates by event type
```

---

## Quick Reference

| Pattern | Use Case |
|---------|----------|
| Event Sourcing | Full audit trail, temporal queries |
| CQRS | Different read/write models |
| Saga | Distributed transactions |
| Outbox | Reliable event publishing |
| Idempotency | Duplicate handling |

| Broker | Best For |
|--------|----------|
| Kafka | High throughput, event streaming |
| RabbitMQ | Complex routing, task queues |
| Redis Pub/Sub | Real-time notifications |

---

## Common Interview Questions

1. What is the difference between Events and Commands?
2. When would you use Kafka vs RabbitMQ?
3. Explain Event Sourcing with an example.
4. How does CQRS work with Event Sourcing?
5. What is the Saga pattern? Choreography vs Orchestration?
6. How do you handle duplicate events?
7. Explain the Outbox pattern.
8. How do you ensure ordering in distributed systems?
9. What are the drawbacks of EDA?
10. How do you debug issues in event-driven systems?
