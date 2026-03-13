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

---

## Schema Registry and Event Serialization

### Q12: Explain Schema Registry and why it matters in event-driven systems.

**Answer:**

A schema registry is a centralized service that stores and manages event schemas. It acts as the **contract between producers and consumers** — producers register the schema they write, consumers fetch the schema to deserialize correctly. Without it, you get runtime deserialization failures when schemas evolve.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Schema Registry Architecture                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Producer                     Schema Registry              Consumer          │
│  ┌──────────┐                ┌───────────────┐           ┌──────────┐      │
│  │          │── 1. Register ─→│               │←─ 3. Get ──│          │      │
│  │  Order   │    Schema       │  Schema Store │   Schema   │ Inventory│      │
│  │  Service │                 │               │            │ Service  │      │
│  │          │── 2. Produce ──→│  - Version 1  │            │          │      │
│  └──────────┘    (with        │  - Version 2  │            └──────────┘      │
│                  schema ID)   │  - Version 3  │                              │
│                               │               │                              │
│         Message Envelope:     │  Compatibility │                              │
│         ┌──────────────┐      │  Rules:        │                              │
│         │ Schema ID: 3 │      │  - BACKWARD    │                              │
│         │ Payload: ...  │      │  - FORWARD     │                              │
│         └──────────────┘      │  - FULL        │                              │
│                               └───────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Avro vs Protobuf vs JSON Schema — Trade-offs:**

| Feature | Avro | Protobuf | JSON Schema |
|---------|------|----------|-------------|
| Schema Evolution | Excellent (reader/writer schemas) | Good (field numbers) | Limited |
| Binary Size | Smallest (no field names in payload) | Small (varint encoding) | Largest (text-based) |
| Human Readable | No (binary) | No (binary) | Yes |
| Code Generation | Optional | Required | Not needed |
| Schema Registry Support | Native (Confluent) | Supported | Supported |
| Best For | Kafka-heavy systems | gRPC + events | Simple systems, debugging |
| Language Support | Excellent | Excellent | Universal |

**Schema Evolution Compatibility Types:**

- **Backward compatible**: New schema can read data written by old schema. You can *add* optional fields, *remove* fields with defaults. Safe to upgrade consumers first.
- **Forward compatible**: Old schema can read data written by new schema. Safe to upgrade producers first.
- **Full compatible**: Both backward AND forward compatible. Safest but most restrictive — only add/remove optional fields with defaults.

**Breaking vs Non-Breaking Changes:**

| Change | Breaking? | Notes |
|--------|-----------|-------|
| Add optional field with default | No | Safe in all modes |
| Remove field with default | No | Safe in backward mode |
| Rename a field | Yes | Old consumers can't find it |
| Change field type | Yes | Deserialization fails |
| Remove a required field | Yes | Old consumers expect it |
| Add required field without default | Yes | Old data lacks it |

```typescript
// ========== Kafka Producer/Consumer with Avro Schema Registry ==========

import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';

// --- Schema Registry Client ---
@Injectable()
export class SchemaRegistryService {
  private registry: SchemaRegistry;

  constructor(private readonly configService: ConfigService) {
    this.registry = new SchemaRegistry({
      host: this.configService.get('SCHEMA_REGISTRY_URL') || 'http://localhost:8081',
      auth: {
        username: this.configService.get('SCHEMA_REGISTRY_USER'),
        password: this.configService.get('SCHEMA_REGISTRY_PASSWORD'),
      },
    });
  }

  // Register a new schema (or get existing)
  async registerSchema(subject: string, schema: string): Promise<number> {
    const { id } = await this.registry.register({
      type: SchemaType.AVRO,
      schema,
    }, {
      subject,
    });
    return id;
  }

  // Encode a message using the schema
  async encode(schemaId: number, payload: any): Promise<Buffer> {
    return this.registry.encode(schemaId, payload);
  }

  // Decode a message (schema ID is embedded in the binary)
  async decode(buffer: Buffer): Promise<any> {
    return this.registry.decode(buffer);
  }

  getRegistry(): SchemaRegistry {
    return this.registry;
  }
}

// --- Avro Schema Definitions ---
const ORDER_CREATED_SCHEMA_V1 = JSON.stringify({
  type: 'record',
  name: 'OrderCreated',
  namespace: 'com.example.events',
  fields: [
    { name: 'eventId', type: 'string' },
    { name: 'orderId', type: 'string' },
    { name: 'userId', type: 'string' },
    { name: 'items', type: {
      type: 'array',
      items: {
        type: 'record',
        name: 'OrderItem',
        fields: [
          { name: 'productId', type: 'string' },
          { name: 'quantity', type: 'int' },
          { name: 'price', type: 'double' },
        ],
      },
    }},
    { name: 'totalAmount', type: 'double' },
    { name: 'timestamp', type: 'long' },
  ],
});

// V2: Added optional fields (backward compatible)
const ORDER_CREATED_SCHEMA_V2 = JSON.stringify({
  type: 'record',
  name: 'OrderCreated',
  namespace: 'com.example.events',
  fields: [
    { name: 'eventId', type: 'string' },
    { name: 'orderId', type: 'string' },
    { name: 'userId', type: 'string' },
    { name: 'items', type: {
      type: 'array',
      items: {
        type: 'record',
        name: 'OrderItem',
        fields: [
          { name: 'productId', type: 'string' },
          { name: 'quantity', type: 'int' },
          { name: 'price', type: 'double' },
        ],
      },
    }},
    { name: 'totalAmount', type: 'double' },
    { name: 'timestamp', type: 'long' },
    // New optional fields (backward compatible — have defaults)
    { name: 'currency', type: ['null', 'string'], default: null },
    { name: 'metadata', type: ['null', { type: 'map', values: 'string' }], default: null },
    { name: 'version', type: 'int', default: 2 },
  ],
});

// --- Producer with Schema Validation ---
@Injectable()
export class OrderEventProducer implements OnModuleInit {
  private producer: Producer;
  private schemaId: number;

  constructor(
    private readonly kafka: Kafka,
    private readonly schemaRegistryService: SchemaRegistryService,
  ) {
    this.producer = this.kafka.producer({
      idempotent: true, // Exactly-once semantics
    });
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();

    // Register schema (idempotent — returns existing ID if schema hasn't changed)
    this.schemaId = await this.schemaRegistryService.registerSchema(
      'order-events-value', // Subject name convention: <topic>-value
      ORDER_CREATED_SCHEMA_V2,
    );
  }

  async publishOrderCreated(order: Order): Promise<void> {
    const event = {
      eventId: crypto.randomUUID(),
      orderId: order.id,
      userId: order.userId,
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: order.totalAmount,
      timestamp: Date.now(),
      currency: order.currency || null,
      metadata: order.metadata || null,
      version: 2,
    };

    // Encode with Avro schema — validates against the registered schema
    // If validation fails, this throws BEFORE sending to Kafka
    const encodedValue = await this.schemaRegistryService.encode(
      this.schemaId,
      event,
    );

    await this.producer.send({
      topic: 'order-events',
      messages: [
        {
          key: order.id, // Partition by order ID for ordering
          value: encodedValue,
          headers: {
            'event-type': 'OrderCreated',
            'schema-version': '2',
            'correlation-id': order.correlationId,
          },
        },
      ],
    });
  }
}

// --- Consumer with Schema Deserialization ---
@Injectable()
export class OrderEventConsumer implements OnModuleInit {
  private consumer: Consumer;
  private readonly logger = new Logger(OrderEventConsumer.name);

  constructor(
    private readonly kafka: Kafka,
    private readonly schemaRegistryService: SchemaRegistryService,
    private readonly inventoryService: InventoryService,
  ) {
    this.consumer = this.kafka.consumer({
      groupId: 'inventory-service',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'order-events', fromBeginning: false });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;

    try {
      // Decode using schema registry — automatically uses the schema ID
      // embedded in the binary. Works even if producer used V1 or V2.
      const event = await this.schemaRegistryService.decode(message.value as Buffer);

      const eventType = message.headers?.['event-type']?.toString();

      switch (eventType) {
        case 'OrderCreated':
          await this.handleOrderCreated(event);
          break;
        default:
          this.logger.warn(`Unknown event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error('Failed to process message', error);
      // Send to DLQ for investigation
    }
  }

  private async handleOrderCreated(event: any): Promise<void> {
    // Handle both V1 and V2 events gracefully
    const currency = event.currency || 'USD'; // V1 won't have this field
    const metadata = event.metadata || {};

    await this.inventoryService.reserveForOrder(
      event.orderId,
      event.items,
    );

    this.logger.log(
      `Processed OrderCreated: ${event.orderId} (${currency})`,
    );
  }
}
```

> **Interview Tip:** Schema registry is often overlooked but it is critical in production event-driven systems. Without it, a producer can silently change the event shape and break all consumers. The key insight: "Schema registry shifts schema validation from runtime (consumer crash) to deploy time (producer rejects incompatible changes)." Mention that Confluent Schema Registry is the industry standard for Kafka, and that the subject naming convention is `<topic>-key` and `<topic>-value`.

---

## Kafka Advanced — Partition Rebalancing and Consumer Groups

### Q13: Explain Kafka partition rebalancing, consumer groups, and consumer lag.

**Answer:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Consumer Group Rebalancing                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Topic: order-events (6 partitions)                                         │
│                                                                              │
│  BEFORE (2 consumers):           AFTER (3 consumers — rebalance):           │
│                                                                              │
│  Consumer A: [P0, P1, P2]        Consumer A: [P0, P1]                       │
│  Consumer B: [P3, P4, P5]        Consumer B: [P2, P3]                       │
│                                   Consumer C: [P4, P5]  ← new              │
│                                                                              │
│  Rebalancing Triggers:                                                      │
│  1. New consumer joins the group                                            │
│  2. Consumer crashes or leaves                                              │
│  3. New partitions added to topic                                           │
│  4. Consumer session timeout expires                                        │
│                                                                              │
│  Eager Rebalancing (default):                                               │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │  ALL consumers STOP processing → revoke ALL partitions →      │          │
│  │  reassign ALL partitions → resume processing                  │          │
│  │  ⚠ STOP-THE-WORLD: complete processing pause                 │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  Cooperative Rebalancing:                                                   │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │  Only AFFECTED partitions are revoked and reassigned →        │          │
│  │  other consumers keep processing unaffected partitions        │          │
│  │  ✓ Minimal disruption, incremental migration                  │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Eager vs Cooperative Rebalancing:**

| Aspect | Eager (Stop-the-World) | Cooperative (Incremental) |
|--------|----------------------|--------------------------|
| Disruption | All consumers pause | Only affected consumers pause |
| Speed | Fast (single round) | Slower (2+ rounds) |
| Complexity | Simple | More complex |
| Default? | Yes (legacy) | No (opt-in) |
| Best For | Small consumer groups | Large groups, latency-sensitive |

**Partition Assignment Strategies:**

- **Range**: Assigns contiguous partition ranges to consumers. Can cause imbalance if partition count isn't divisible by consumer count.
- **RoundRobin**: Distributes partitions evenly across consumers in round-robin. Better balance.
- **Sticky**: Like RoundRobin but tries to minimize partition movement during rebalancing. Reduces the number of partitions that change hands.
- **CooperativeSticky**: Sticky + cooperative rebalancing. Best of both worlds.

**Static Group Membership:**

By assigning a `group.instance.id` to each consumer, Kafka treats it as a "static member." If the consumer disconnects and reconnects with the same instance ID, Kafka skips rebalancing entirely during the session timeout window. This dramatically reduces rebalancing frequency in containerized environments where pods restart often.

**Consumer Lag:**

Consumer lag is the difference between the latest offset in a partition and the consumer's committed offset. It tells you how far behind a consumer is.

- **Healthy**: Lag near 0, consumer keeps up with producers
- **Warning**: Lag growing, consumer is slower than production rate
- **Critical**: Lag growing continuously, consumer will never catch up without intervention (add consumers, optimize processing, increase partitions)

```typescript
// ========== Consumer Group with Cooperative Rebalancing ==========

import { Kafka, Consumer, ConsumerConfig, EachMessagePayload } from 'kafkajs';

@Injectable()
export class OptimizedKafkaConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;
  private readonly logger = new Logger(OptimizedKafkaConsumer.name);
  private isProcessing = true;

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: ConsumerMetricsService,
  ) {
    const kafka = new Kafka({
      clientId: this.configService.get('KAFKA_CLIENT_ID'),
      brokers: this.configService.get<string[]>('KAFKA_BROKERS'),
    });

    const consumerConfig: ConsumerConfig = {
      groupId: 'order-processing-group',

      // --- Cooperative Rebalancing ---
      // KafkaJS uses cooperative rebalancing by default (since v2.0+)
      // For older versions or kafkajs, configure the partition assigner:
      rebalanceTimeout: 60000, // 60 seconds for rebalance

      // --- Static Group Membership ---
      // Unique per instance — use pod name in Kubernetes
      // Prevents rebalancing when a consumer restarts within session timeout
      // groupInstanceId: process.env.POD_NAME || `instance-${process.pid}`,

      // --- Session and Heartbeat ---
      sessionTimeout: 30000,    // 30s — consumer considered dead after this
      heartbeatInterval: 3000,  // 3s — send heartbeat to coordinator

      // --- Offset management ---
      maxWaitTimeInMs: 500,     // Max wait for new messages
      maxBytesPerPartition: 1048576, // 1MB per partition per fetch
    };

    this.consumer = kafka.consumer(consumerConfig);
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();

    // Subscribe to topics
    await this.consumer.subscribe({
      topics: ['order-events', 'payment-events'],
      fromBeginning: false,
    });

    // --- Handle Rebalance Events ---
    this.consumer.on('consumer.rebalancing', () => {
      this.logger.warn('Rebalancing started — pausing processing');
      this.isProcessing = false;
    });

    this.consumer.on('consumer.group_join', ({ payload }) => {
      this.logger.log(`Rebalancing complete. Assigned partitions: ${
        JSON.stringify(payload.memberAssignment)
      }`);
      this.isProcessing = true;
    });

    // --- Start consuming ---
    await this.consumer.run({
      // Process messages one at a time per partition (ordered)
      partitionsConsumedConcurrently: 3, // Process 3 partitions in parallel

      eachMessage: async (payload: EachMessagePayload) => {
        if (!this.isProcessing) {
          // Skip during rebalancing — message will be re-delivered
          return;
        }

        const startTime = Date.now();

        try {
          await this.handleMessage(payload);

          // Track consumer lag metrics
          this.metricsService.recordProcessingTime(
            payload.topic,
            payload.partition,
            Date.now() - startTime,
          );
        } catch (error) {
          this.logger.error(
            `Error processing ${payload.topic}[${payload.partition}]@${payload.message.offset}`,
            error,
          );
          // Don't commit offset — message will be retried
          throw error;
        }
      },
    });
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    this.logger.debug(
      `Processing ${topic}[${partition}]@${message.offset}`,
    );

    // Route to appropriate handler based on topic
    switch (topic) {
      case 'order-events':
        await this.handleOrderEvent(message);
        break;
      case 'payment-events':
        await this.handlePaymentEvent(message);
        break;
    }
  }

  // Graceful shutdown during rebalancing
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down consumer gracefully...');
    this.isProcessing = false;

    // Disconnect triggers a clean leave from the consumer group
    // This avoids waiting for session timeout and speeds up rebalancing
    await this.consumer.disconnect();
    this.logger.log('Consumer disconnected');
  }

  private async handleOrderEvent(message: any): Promise<void> {
    // Process order event
  }

  private async handlePaymentEvent(message: any): Promise<void> {
    // Process payment event
  }
}

// --- Consumer Lag Monitoring ---
@Injectable()
export class ConsumerMetricsService {
  private readonly logger = new Logger(ConsumerMetricsService.name);

  constructor(
    private readonly kafka: Kafka,
    private readonly alertService: AlertService,
  ) {}

  // Check consumer lag periodically
  @Cron('*/30 * * * * *') // Every 30 seconds
  async checkConsumerLag(): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();

    try {
      const topics = await admin.listTopics();
      const groupId = 'order-processing-group';

      // Get committed offsets for the consumer group
      const offsets = await admin.fetchOffsets({ groupId, topics });

      // Get latest offsets (end of each partition)
      for (const topicOffset of offsets) {
        const topicOffsets = await admin.fetchTopicOffsets(topicOffset.topic);

        for (const partition of topicOffset.partitions) {
          const latestOffset = topicOffsets.find(
            (t) => t.partition === partition.partition,
          );

          if (latestOffset) {
            const lag = parseInt(latestOffset.offset) - parseInt(partition.offset);

            // Record metric
            this.recordLag(topicOffset.topic, partition.partition, lag);

            // Alert if lag exceeds threshold
            if (lag > 10000) {
              this.alertService.warn(
                `High consumer lag: ${topicOffset.topic}[${partition.partition}] = ${lag}`,
              );
            }

            if (lag > 100000) {
              this.alertService.critical(
                `Critical consumer lag: ${topicOffset.topic}[${partition.partition}] = ${lag}`,
              );
            }
          }
        }
      }
    } finally {
      await admin.disconnect();
    }
  }

  recordProcessingTime(topic: string, partition: number, durationMs: number): void {
    // Push to Prometheus / StatsD / CloudWatch
    this.logger.debug(
      `Processed ${topic}[${partition}] in ${durationMs}ms`,
    );
  }

  private recordLag(topic: string, partition: number, lag: number): void {
    // Push to monitoring system
    this.logger.debug(`Lag: ${topic}[${partition}] = ${lag}`);
  }
}
```

> **Interview Tip:** Rebalancing is one of the most common pain points in Kafka. Always mention cooperative rebalancing as the solution to stop-the-world pauses. If asked "how would you reduce rebalancing in Kubernetes?", the answer is static group membership — assign `group.instance.id` to the pod name so restarts within session timeout don't trigger rebalancing. For consumer lag, explain it as "the distance between where the producer is writing and where the consumer is reading" — if it grows, your consumer can't keep up.

---

## Event Versioning Strategies

### Q14: How do you handle event versioning as your system evolves?

**Answer:**

Events are immutable facts that happened. Once published, they can't be changed. But your business evolves — new fields are needed, old fields become irrelevant, data types change. You need a strategy to handle this without breaking consumers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Event Versioning Strategies                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Strategy 1: Version Field in Event                                         │
│  ┌─────────────────────────────────────────────────┐                        │
│  │ { "version": 2, "orderId": "...", ... }         │                        │
│  │ Consumer checks version and routes to handler   │                        │
│  └─────────────────────────────────────────────────┘                        │
│  + Simple, all versions on same topic                                       │
│  - Consumer must handle all versions forever                                │
│                                                                              │
│  Strategy 2: Separate Topics per Version                                    │
│  ┌────────────────────┐  ┌────────────────────┐                            │
│  │ order-events-v1    │  │ order-events-v2    │                            │
│  └────────────────────┘  └────────────────────┘                            │
│  + Clean separation, consumers subscribe to their version                   │
│  - Topic proliferation, producers might dual-write                          │
│                                                                              │
│  Strategy 3: Upcasting (Transform on Read)                                  │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐                             │
│  │ Old Event│───→│ Upcaster  │───→│ New Event│                             │
│  │ (v1)     │    │ v1 → v2   │    │ (v2)     │                             │
│  └──────────┘    └───────────┘    └──────────┘                             │
│  + Consumers always work with latest version                                │
│  - Adds processing overhead, chain of upcasters                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Upcasting Pattern:**

Upcasting transforms old event versions to the latest version at read time. Consumers only need to handle the latest version. When an event store returns a V1 event, it passes through a chain of upcasters: V1 -> V2 -> V3 (current).

**Backward and Forward Compatibility Rules:**

- **Adding an optional field with a default value**: Backward AND forward compatible. Old consumers ignore it, old events get the default.
- **Removing a field that has a default**: Backward compatible. Old events still have the field, new events don't — but the default fills in.
- **Changing field type**: BREAKING. Must use a new field name or create a new event version.
- **Renaming a field**: BREAKING. Old consumers look for the old name.

**Handling Breaking Changes:**

When you absolutely must make a breaking change:
1. Start producing BOTH old and new versions (dual-write period)
2. Migrate consumers one by one to the new version
3. Once all consumers are migrated, stop producing the old version
4. Keep the old schema in the registry for replaying historical events

```typescript
// ========== Event Upcaster for Version Migration ==========

// --- Event Version Types ---
interface OrderCreatedV1 {
  version: 1;
  orderId: string;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
  createdAt: string;
}

interface OrderCreatedV2 {
  version: 2;
  orderId: string;
  userId: string; // Added in V2
  items: Array<{ productId: string; quantity: number; unitPrice: number }>; // price added
  total: number;
  currency: string; // Added in V2
  createdAt: string;
}

interface OrderCreatedV3 {
  version: 3;
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number; // Added in V3
  }>;
  total: number;
  currency: string;
  shippingAddress: { // Added in V3
    street: string;
    city: string;
    country: string;
    zipCode: string;
  } | null;
  createdAt: string;
  metadata: Record<string, string>; // Added in V3
}

// Current version that consumers work with
type OrderCreatedEvent = OrderCreatedV3;

// --- Upcaster Chain ---
@Injectable()
export class EventUpcasterService {
  private readonly upcasters: Map<string, Map<number, (event: any) => any>> = new Map();

  constructor() {
    this.registerUpcasters();
  }

  private registerUpcasters(): void {
    // OrderCreated upcasters
    const orderCreatedUpcasters = new Map<number, (event: any) => any>();

    // V1 → V2
    orderCreatedUpcasters.set(1, (event: OrderCreatedV1): OrderCreatedV2 => ({
      version: 2,
      orderId: event.orderId,
      userId: 'unknown', // V1 didn't track userId — use placeholder
      items: event.items.map((item) => ({
        ...item,
        unitPrice: 0, // V1 didn't have per-item prices
      })),
      total: event.total,
      currency: 'USD', // Default for V1 events
      createdAt: event.createdAt,
    }));

    // V2 → V3
    orderCreatedUpcasters.set(2, (event: OrderCreatedV2): OrderCreatedV3 => ({
      version: 3,
      orderId: event.orderId,
      userId: event.userId,
      items: event.items.map((item) => ({
        ...item,
        discount: 0, // V2 didn't have discounts
      })),
      total: event.total,
      currency: event.currency,
      shippingAddress: null, // V2 didn't have shipping address
      createdAt: event.createdAt,
      metadata: {}, // V2 didn't have metadata
    }));

    this.upcasters.set('OrderCreated', orderCreatedUpcasters);
  }

  // Upcast an event to the latest version
  upcast(eventType: string, event: any): any {
    const typeUpcasters = this.upcasters.get(eventType);
    if (!typeUpcasters) return event;

    let current = event;
    const LATEST_VERSION = 3;

    // Apply upcasters sequentially: V1 → V2 → V3
    while (current.version < LATEST_VERSION) {
      const upcaster = typeUpcasters.get(current.version);
      if (!upcaster) {
        throw new Error(
          `No upcaster found for ${eventType} v${current.version}`,
        );
      }
      current = upcaster(current);
    }

    return current;
  }
}

// --- Consumer That Uses Upcasting ---
@Injectable()
export class OrderEventConsumerV3 {
  constructor(
    private readonly upcasterService: EventUpcasterService,
    private readonly orderService: OrderService,
  ) {}

  async handleEvent(rawEvent: any): Promise<void> {
    const eventType = rawEvent.eventType || rawEvent.type;

    // Upcast to latest version regardless of what version was stored
    const event: OrderCreatedEvent = this.upcasterService.upcast(
      eventType,
      rawEvent.payload,
    );

    // Consumer only handles V3 — no version switch statements needed
    await this.orderService.processOrder({
      orderId: event.orderId,
      userId: event.userId,
      items: event.items,
      total: event.total,
      currency: event.currency,
      shippingAddress: event.shippingAddress,
      metadata: event.metadata,
    });
  }
}

// --- Versioned Event Producer (Dual-Write During Migration) ---
@Injectable()
export class VersionedEventProducer {
  private currentVersion = 3;

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly configService: ConfigService,
  ) {}

  async publish(event: OrderCreatedEvent): Promise<void> {
    const envelope = {
      eventId: crypto.randomUUID(),
      eventType: 'OrderCreated',
      version: this.currentVersion,
      payload: event,
      timestamp: new Date().toISOString(),
      source: 'order-service',
    };

    // Primary topic (latest version)
    await firstValueFrom(
      this.kafkaClient.emit('order-events', {
        key: event.orderId,
        value: JSON.stringify(envelope),
      }),
    );

    // During migration period: also publish to legacy topic
    // Remove this once all consumers are migrated
    const isMigrating = this.configService.get('DUAL_WRITE_ENABLED') === 'true';
    if (isMigrating) {
      const legacyEvent = this.downcastToV2(event);
      await firstValueFrom(
        this.kafkaClient.emit('order-events-v2', {
          key: event.orderId,
          value: JSON.stringify({ ...envelope, version: 2, payload: legacyEvent }),
        }),
      );
    }
  }

  private downcastToV2(event: OrderCreatedV3): OrderCreatedV2 {
    return {
      version: 2,
      orderId: event.orderId,
      userId: event.userId,
      items: event.items.map(({ discount, ...rest }) => rest),
      total: event.total,
      currency: event.currency,
      createdAt: event.createdAt,
    };
  }
}
```

> **Interview Tip:** When asked about event versioning, start with "events are immutable, so we can't change them after they're published." Then explain the three strategies. Upcasting is the most elegant for event-sourced systems because the event store can replay old events through the upcaster chain, and consumers only ever see the latest version. For Kafka-based systems, schema registry with Avro compatibility rules is the practical choice. Always mention the dual-write migration pattern for breaking changes.

---

## Testing Event-Driven Systems

### Q15: How do you test event-driven systems?

**Answer:**

Testing event-driven systems is challenging because of asynchronous flows, eventual consistency, and distributed state. You need a layered testing strategy:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Testing Pyramid for EDA                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│            /\                                                                │
│           /  \    E2E Tests                                                  │
│          / ── \   (Full pipeline with real Kafka)                            │
│         /      \  Slow, expensive, catch integration issues                  │
│        /────────\                                                            │
│       /          \    Contract Tests                                         │
│      /   ──────   \   (Producer/consumer schema agreement)                   │
│     /              \   Medium speed, catch compatibility issues              │
│    /────────────────\                                                        │
│   /                  \    Integration Tests                                   │
│  /     ──────────     \   (Testcontainers with embedded Kafka)               │
│ /                      \   Moderate speed, test real Kafka behavior          │
│/────────────────────────\                                                    │
│                          \    Unit Tests                                      │
│  ────────────────────────  \  (Isolated handler logic, mocked deps)          │
│                              \ Fast, test business logic only               │
│──────────────────────────────\                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Testing Challenges in EDA:**

1. **Eventual consistency**: You can't assert immediately — you need polling or waiting patterns
2. **Ordering**: Messages may arrive in unexpected order
3. **Idempotency**: You must test that processing the same message twice produces the same result
4. **Saga compensation**: Test both the happy path and every possible failure/compensation path
5. **Dead letter queue**: Verify that poison messages end up in the DLQ, not in an infinite retry loop

```typescript
// ========== Testing a Kafka Consumer with Testcontainers ==========

// 1. Unit Testing Event Handlers (isolated, no Kafka)
describe('OrderEventHandler', () => {
  let handler: OrderEventHandler;
  let inventoryService: jest.Mocked<InventoryService>;
  let idempotencyService: jest.Mocked<IdempotentEventHandler>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderEventHandler,
        {
          provide: InventoryService,
          useValue: {
            reserveForOrder: jest.fn().mockResolvedValue({ reserved: true }),
            releaseReservation: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: IdempotentEventHandler,
          useValue: {
            handleIdempotently: jest.fn().mockImplementation(
              (eventId, consumerId, handler) => handler(),
            ),
          },
        },
      ],
    }).compile();

    handler = module.get(OrderEventHandler);
    inventoryService = module.get(InventoryService);
    idempotencyService = module.get(IdempotentEventHandler);
  });

  it('should reserve inventory when order is created', async () => {
    const event = {
      eventId: 'evt-123',
      orderId: 'order-456',
      userId: 'user-789',
      items: [
        { productId: 'prod-1', quantity: 2, unitPrice: 29.99 },
        { productId: 'prod-2', quantity: 1, unitPrice: 49.99 },
      ],
      total: 109.97,
      currency: 'USD',
    };

    await handler.handleOrderCreated(event);

    expect(inventoryService.reserveForOrder).toHaveBeenCalledWith(
      'order-456',
      expect.arrayContaining([
        expect.objectContaining({ productId: 'prod-1', quantity: 2 }),
        expect.objectContaining({ productId: 'prod-2', quantity: 1 }),
      ]),
    );
  });

  // Test idempotency — same event processed twice
  it('should be idempotent — processing same event twice has same effect', async () => {
    const event = {
      eventId: 'evt-123',
      orderId: 'order-456',
      userId: 'user-789',
      items: [{ productId: 'prod-1', quantity: 2, unitPrice: 29.99 }],
      total: 59.98,
      currency: 'USD',
    };

    // First call processes normally
    await handler.handleOrderCreated(event);

    // Second call — idempotency service returns cached result
    idempotencyService.handleIdempotently.mockImplementation(
      async (eventId, consumerId, fn) => {
        // Simulate already-processed
        return { reserved: true };
      },
    );

    await handler.handleOrderCreated(event);

    // Inventory reservation only called once
    expect(inventoryService.reserveForOrder).toHaveBeenCalledTimes(1);
  });

  it('should handle missing optional fields gracefully', async () => {
    // V1 event without currency and metadata
    const legacyEvent = {
      eventId: 'evt-old',
      orderId: 'order-old',
      items: [{ productId: 'prod-1', quantity: 1 }],
      total: 29.99,
      // No userId, no currency — V1 event
    };

    await handler.handleOrderCreated(legacyEvent);

    expect(inventoryService.reserveForOrder).toHaveBeenCalled();
  });
});

// 2. Integration Testing with Testcontainers (real Kafka)
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka, Producer, Consumer } from 'kafkajs';

describe('Order Event Pipeline (Integration)', () => {
  let kafkaContainer: StartedKafkaContainer;
  let kafka: Kafka;
  let producer: Producer;
  let consumer: Consumer;

  // Start Kafka container before all tests
  beforeAll(async () => {
    kafkaContainer = await new KafkaContainer('confluentinc/cp-kafka:7.4.0')
      .withExposedPorts(9093)
      .start();

    kafka = new Kafka({
      brokers: [kafkaContainer.getBrokers()[0]],
    });

    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'test-group' });

    await producer.connect();
    await consumer.connect();

    // Create topic
    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: [{ topic: 'order-events', numPartitions: 3 }],
    });
    await admin.disconnect();
  }, 60000); // 60s timeout for container startup

  afterAll(async () => {
    await producer.disconnect();
    await consumer.disconnect();
    await kafkaContainer.stop();
  });

  it('should produce and consume an order event', async () => {
    const receivedMessages: any[] = [];

    await consumer.subscribe({ topic: 'order-events', fromBeginning: true });
    await consumer.run({
      eachMessage: async ({ message }) => {
        receivedMessages.push(JSON.parse(message.value.toString()));
      },
    });

    // Produce an event
    const orderEvent = {
      eventId: 'evt-integration-1',
      eventType: 'OrderCreated',
      orderId: 'order-int-1',
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 3, unitPrice: 19.99 }],
      total: 59.97,
      currency: 'USD',
      timestamp: Date.now(),
    };

    await producer.send({
      topic: 'order-events',
      messages: [
        { key: orderEvent.orderId, value: JSON.stringify(orderEvent) },
      ],
    });

    // Wait for eventual consistency — poll until message arrives
    await waitForCondition(
      () => receivedMessages.length > 0,
      5000, // timeout
      100,  // poll interval
    );

    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0].orderId).toBe('order-int-1');
    expect(receivedMessages[0].eventType).toBe('OrderCreated');
  });

  it('should maintain message ordering within a partition', async () => {
    const receivedMessages: any[] = [];

    await consumer.subscribe({ topic: 'order-events', fromBeginning: true });
    await consumer.run({
      eachMessage: async ({ message }) => {
        receivedMessages.push(JSON.parse(message.value.toString()));
      },
    });

    // Send 3 messages with the same key (same partition)
    const orderId = 'order-ordering-test';
    const events = ['OrderCreated', 'OrderPaid', 'OrderShipped'];

    for (const eventType of events) {
      await producer.send({
        topic: 'order-events',
        messages: [
          { key: orderId, value: JSON.stringify({ eventType, orderId, seq: events.indexOf(eventType) }) },
        ],
      });
    }

    await waitForCondition(
      () => receivedMessages.filter((m) => m.orderId === orderId).length >= 3,
      5000,
      100,
    );

    const orderMessages = receivedMessages
      .filter((m) => m.orderId === orderId)
      .sort((a, b) => a.seq - b.seq);

    // Messages should arrive in order (same key = same partition)
    expect(orderMessages[0].eventType).toBe('OrderCreated');
    expect(orderMessages[1].eventType).toBe('OrderPaid');
    expect(orderMessages[2].eventType).toBe('OrderShipped');
  });
});

// 3. Testing Eventual Consistency — Polling Helper
async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number,
  pollIntervalMs: number,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await condition();
    if (result) return;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

// 4. Testing Saga Compensation
describe('OrderSaga', () => {
  let saga: OrderSaga;
  let inventoryService: jest.Mocked<InventoryService>;
  let paymentService: jest.Mocked<PaymentService>;
  let shippingService: jest.Mocked<ShippingService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderSaga,
        { provide: InventoryService, useValue: createMock<InventoryService>() },
        { provide: PaymentService, useValue: createMock<PaymentService>() },
        { provide: ShippingService, useValue: createMock<ShippingService>() },
      ],
    }).compile();

    saga = module.get(OrderSaga);
    inventoryService = module.get(InventoryService);
    paymentService = module.get(PaymentService);
    shippingService = module.get(ShippingService);
  });

  it('should complete successfully when all steps pass', async () => {
    inventoryService.reserve.mockResolvedValue({ reservationId: 'res-1' });
    paymentService.charge.mockResolvedValue({ paymentId: 'pay-1' });
    shippingService.createShipment.mockResolvedValue({ shipmentId: 'ship-1' });

    await saga.execute(testOrder);

    expect(inventoryService.reserve).toHaveBeenCalled();
    expect(paymentService.charge).toHaveBeenCalled();
    expect(shippingService.createShipment).toHaveBeenCalled();
  });

  it('should compensate when payment fails', async () => {
    inventoryService.reserve.mockResolvedValue({ reservationId: 'res-1' });
    paymentService.charge.mockRejectedValue(new Error('Insufficient funds'));

    await expect(saga.execute(testOrder)).rejects.toThrow('Insufficient funds');

    // Inventory should be released (compensated)
    expect(inventoryService.releaseReservation).toHaveBeenCalledWith('res-1');
    // Shipping should NOT have been called
    expect(shippingService.createShipment).not.toHaveBeenCalled();
  });

  it('should compensate all completed steps when shipping fails', async () => {
    inventoryService.reserve.mockResolvedValue({ reservationId: 'res-1' });
    paymentService.charge.mockResolvedValue({ paymentId: 'pay-1' });
    shippingService.createShipment.mockRejectedValue(new Error('Address invalid'));

    await expect(saga.execute(testOrder)).rejects.toThrow('Address invalid');

    // Both inventory and payment should be compensated (reverse order)
    expect(paymentService.refund).toHaveBeenCalledWith('pay-1');
    expect(inventoryService.releaseReservation).toHaveBeenCalledWith('res-1');
  });
});

// 5. Contract Testing for Events (Consumer-Driven)
describe('OrderCreated Event Contract', () => {
  it('should match the agreed schema', () => {
    const event = produceOrderCreatedEvent(testOrder);

    // Validate required fields exist
    expect(event).toHaveProperty('eventId');
    expect(event).toHaveProperty('orderId');
    expect(event).toHaveProperty('items');
    expect(event).toHaveProperty('total');
    expect(event).toHaveProperty('timestamp');

    // Validate types
    expect(typeof event.eventId).toBe('string');
    expect(typeof event.orderId).toBe('string');
    expect(Array.isArray(event.items)).toBe(true);
    expect(typeof event.total).toBe('number');

    // Validate items structure
    for (const item of event.items) {
      expect(item).toHaveProperty('productId');
      expect(item).toHaveProperty('quantity');
      expect(typeof item.quantity).toBe('number');
      expect(item.quantity).toBeGreaterThan(0);
    }
  });

  it('should be deserializable by inventory consumer', () => {
    const event = produceOrderCreatedEvent(testOrder);

    // Simulate what the inventory consumer does
    const parsed = inventoryConsumerDeserialize(event);

    expect(parsed.orderId).toBeDefined();
    expect(parsed.items.length).toBeGreaterThan(0);
  });
});
```

> **Interview Tip:** Emphasize the testing pyramid — unit tests for business logic (fast, many), integration tests with testcontainers for real Kafka behavior (medium, some), and E2E tests for the full pipeline (slow, few). The most commonly missed testing area is saga compensation — always test every failure point in the saga, not just the happy path. Mention `waitForCondition` or polling patterns for testing eventual consistency — never use fixed `sleep()` in tests.

---

## Observability in Event-Driven Architecture

### Q16: How do you implement observability across event-driven services?

**Answer:**

Observability in event-driven systems is harder than in synchronous architectures because a single business operation spans multiple services connected by asynchronous events. A request doesn't follow a single thread — it hops across services via message brokers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              Observability in Event-Driven Architecture                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Three Pillars:                                                             │
│                                                                              │
│  1. DISTRIBUTED TRACING (OpenTelemetry)                                     │
│     ┌───────┐  trace-id  ┌───────┐  trace-id  ┌───────┐                   │
│     │ Order │ ─────────→ │ Kafka │ ─────────→ │ Inv.  │                   │
│     │ Svc   │  in header │       │  propagated │ Svc   │                   │
│     └───────┘            └───────┘             └───────┘                   │
│     Trace ID follows the event across every service                        │
│                                                                              │
│  2. METRICS (Prometheus/Grafana)                                            │
│     - Consumer lag per topic/partition                                       │
│     - Message throughput (produced/consumed per second)                      │
│     - Processing time per event type                                        │
│     - Error rate per consumer group                                         │
│     - DLQ depth                                                             │
│                                                                              │
│  3. LOGGING (Structured, with correlation IDs)                              │
│     Every log line includes: traceId, correlationId, eventId, service       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**The Core Problem: Correlation**

In a synchronous REST call chain, a single request ID can be passed through HTTP headers. In EDA, the "request" becomes an event that triggers other events — you need:
- **Trace ID**: Spans the entire business operation across all services (same as distributed tracing)
- **Correlation ID**: Groups related events from the same business trigger (e.g., all events from one order)
- **Causation ID**: The specific event that caused this event (direct parent in the event chain)

**Tools:**
- **Jaeger / Zipkin**: Distributed tracing visualization — see the full journey of a request across services
- **Kafka UI / Conduktor**: Inspect topics, consumer groups, messages, and lag
- **OpenTelemetry**: Vendor-neutral instrumentation for traces, metrics, and logs
- **Grafana + Prometheus**: Dashboards for consumer lag, throughput, error rates

```typescript
// ========== Adding Trace Context to Kafka Messages ==========

import { trace, context, SpanKind, propagation } from '@opentelemetry/api';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';

// --- OpenTelemetry Setup (bootstrap) ---
// Usually in a separate tracing.ts file, initialized before the app starts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { KafkaJsInstrumentation } from 'opentelemetry-instrumentation-kafkajs';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'order-service',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces',
  }),
  instrumentations: [
    new KafkaJsInstrumentation(), // Auto-instruments KafkaJS
  ],
});

sdk.start();

// --- Traced Event Producer ---
@Injectable()
export class TracedEventProducer {
  private producer: Producer;
  private readonly tracer = trace.getTracer('order-service');

  constructor(private readonly kafka: Kafka) {
    this.producer = this.kafka.producer();
  }

  async publishWithTracing(
    topic: string,
    key: string,
    event: any,
    correlationId: string,
  ): Promise<void> {
    // Create a span for the produce operation
    const span = this.tracer.startSpan(`kafka.produce ${topic}`, {
      kind: SpanKind.PRODUCER,
      attributes: {
        'messaging.system': 'kafka',
        'messaging.destination': topic,
        'messaging.destination_kind': 'topic',
        'messaging.message.key': key,
        'app.event.type': event.eventType,
        'app.correlation.id': correlationId,
      },
    });

    try {
      // Inject trace context into message headers
      const headers: Record<string, string> = {
        'event-type': event.eventType,
        'correlation-id': correlationId,
        'causation-id': event.causationId || event.eventId,
        'produced-at': new Date().toISOString(),
        'source-service': 'order-service',
      };

      // Propagate OpenTelemetry context via headers
      propagation.inject(context.active(), headers);

      await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(event),
            headers,
          },
        ],
      });

      span.setStatus({ code: 0 }); // OK
    } catch (error) {
      span.setStatus({ code: 2, message: error.message }); // ERROR
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}

// --- Traced Event Consumer ---
@Injectable()
export class TracedEventConsumer {
  private consumer: Consumer;
  private readonly tracer = trace.getTracer('inventory-service');
  private readonly logger = new Logger(TracedEventConsumer.name);

  constructor(
    private readonly kafka: Kafka,
    private readonly metricsService: EventMetricsService,
  ) {
    this.consumer = this.kafka.consumer({ groupId: 'inventory-service' });
  }

  async startConsuming(): Promise<void> {
    await this.consumer.subscribe({ topic: 'order-events' });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processWithTracing(payload);
      },
    });
  }

  private async processWithTracing(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const headers = this.parseHeaders(message.headers);

    // Extract trace context from message headers
    const parentContext = propagation.extract(context.active(), headers);

    // Create a consumer span linked to the producer span
    const span = this.tracer.startSpan(
      `kafka.consume ${topic}`,
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          'messaging.system': 'kafka',
          'messaging.source': topic,
          'messaging.kafka.partition': partition,
          'messaging.kafka.offset': message.offset,
          'app.event.type': headers['event-type'],
          'app.correlation.id': headers['correlation-id'],
        },
      },
      parentContext, // Link to producer's trace
    );

    const startTime = Date.now();

    try {
      await context.with(trace.setSpan(parentContext, span), async () => {
        // All downstream operations inherit this trace context
        const event = JSON.parse(message.value.toString());

        // Structured logging with trace context
        this.logger.log({
          message: `Processing event: ${headers['event-type']}`,
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          correlationId: headers['correlation-id'],
          eventType: headers['event-type'],
          topic,
          partition,
          offset: message.offset,
        });

        await this.handleEvent(event, headers);
      });

      span.setStatus({ code: 0 });

      // Record success metric
      this.metricsService.recordEventProcessed(
        topic,
        headers['event-type'],
        'success',
        Date.now() - startTime,
      );
    } catch (error) {
      span.setStatus({ code: 2, message: error.message });
      span.recordException(error);

      this.metricsService.recordEventProcessed(
        topic,
        headers['event-type'],
        'error',
        Date.now() - startTime,
      );

      throw error;
    } finally {
      span.end();
    }
  }

  private parseHeaders(headers: any): Record<string, string> {
    const result: Record<string, string> = {};
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        result[key] = value?.toString() || '';
      }
    }
    return result;
  }

  private async handleEvent(event: any, headers: Record<string, string>): Promise<void> {
    // Process the event...
  }
}

// --- Event Metrics Service (Prometheus-style) ---
@Injectable()
export class EventMetricsService {
  // In production, use prom-client or OpenTelemetry metrics
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  recordEventProcessed(
    topic: string,
    eventType: string,
    status: 'success' | 'error',
    durationMs: number,
  ): void {
    // Counter: events_processed_total{topic, event_type, status}
    const counterKey = `events_processed:${topic}:${eventType}:${status}`;
    this.counters.set(counterKey, (this.counters.get(counterKey) || 0) + 1);

    // Histogram: event_processing_duration_ms{topic, event_type}
    const histKey = `processing_duration:${topic}:${eventType}`;
    const values = this.histograms.get(histKey) || [];
    values.push(durationMs);
    this.histograms.set(histKey, values);
  }

  recordConsumerLag(topic: string, partition: number, lag: number): void {
    // Gauge: kafka_consumer_lag{topic, partition}
    const key = `consumer_lag:${topic}:${partition}`;
    this.counters.set(key, lag);
  }

  recordDlqDepth(topic: string, depth: number): void {
    // Gauge: dlq_depth{topic}
    this.counters.set(`dlq_depth:${topic}`, depth);
  }

  // End-to-end latency: time from event production to consumption
  recordEndToEndLatency(
    producedAt: string,
    consumedAt: number,
  ): void {
    const e2eLatency = consumedAt - new Date(producedAt).getTime();
    const values = this.histograms.get('e2e_latency') || [];
    values.push(e2eLatency);
    this.histograms.set('e2e_latency', values);
  }
}

// --- DLQ Monitor and Replay ---
@Injectable()
export class DlqMonitorService {
  private readonly logger = new Logger(DlqMonitorService.name);

  constructor(
    private readonly kafka: Kafka,
    private readonly alertService: AlertService,
    private readonly metricsService: EventMetricsService,
  ) {}

  // Monitor DLQ depth
  @Cron('*/60 * * * * *') // Every minute
  async checkDlqDepth(): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();

    try {
      const dlqTopics = ['order-events.DLQ', 'payment-events.DLQ'];

      for (const topic of dlqTopics) {
        const offsets = await admin.fetchTopicOffsets(topic);
        const totalMessages = offsets.reduce(
          (sum, p) => sum + parseInt(p.offset),
          0,
        );

        this.metricsService.recordDlqDepth(topic, totalMessages);

        if (totalMessages > 100) {
          this.alertService.warn(
            `DLQ ${topic} has ${totalMessages} messages — investigate failures`,
          );
        }
      }
    } finally {
      await admin.disconnect();
    }
  }

  // Replay messages from DLQ back to the original topic
  async replayDlqMessages(
    dlqTopic: string,
    targetTopic: string,
    filter?: (message: any) => boolean,
  ): Promise<{ replayed: number; skipped: number }> {
    const consumer = this.kafka.consumer({ groupId: 'dlq-replay' });
    const producer = this.kafka.producer();

    await Promise.all([consumer.connect(), producer.connect()]);

    let replayed = 0;
    let skipped = 0;

    try {
      await consumer.subscribe({ topic: dlqTopic, fromBeginning: true });

      await consumer.run({
        eachMessage: async ({ message }) => {
          const event = JSON.parse(message.value.toString());

          if (filter && !filter(event)) {
            skipped++;
            return;
          }

          // Replay to original topic
          await producer.send({
            topic: targetTopic,
            messages: [
              {
                key: message.key,
                value: message.value,
                headers: {
                  ...message.headers,
                  'replayed-from': dlqTopic,
                  'replayed-at': new Date().toISOString(),
                },
              },
            ],
          });

          replayed++;
        },
      });

      this.logger.log(
        `DLQ replay complete: ${replayed} replayed, ${skipped} skipped`,
      );
      return { replayed, skipped };

    } finally {
      await consumer.disconnect();
      await producer.disconnect();
    }
  }
}
```

> **Interview Tip:** Observability in EDA is a top interview topic for senior roles. The key points to hit: (1) Trace context must be explicitly propagated through message headers — it doesn't happen automatically like with HTTP. (2) Correlation IDs are essential for grouping all events from one business operation. (3) Consumer lag is your primary health indicator — if it grows, processing can't keep up. (4) DLQ monitoring prevents silent failures. When asked "how do you debug an issue in an event-driven system?", walk through: "I'd start with the correlation ID to find all related events in Jaeger, check consumer lag to see if the consumer is behind, look at the DLQ for failed messages, and check structured logs filtered by the trace ID."

---

## Q12: Schema Registry & Event Serialization

**Q: How do you manage event schemas across microservices?**

**A:**

As event-driven systems grow, schema management becomes critical. Without it, a producer changing an event format can break every consumer.

### The Problem
```
Order Service publishes: { orderId: "123", total: 50.00, currency: "BDT" }
  ↓ (developer adds field and renames one)
Order Service publishes: { order_id: "123", amount: 50.00, currency: "BDT", tax: 5.00 }
  ↓
Payment Service CRASHES: expects 'orderId' and 'total'
```

### Solution: Schema Registry
```
Producer → Schema Registry (validates schema) → Kafka → Consumer
                ↕
        Schema Store (Avro/Protobuf/JSON Schema)
```

### Confluent Schema Registry with Kafka
```typescript
import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry';

const registry = new SchemaRegistry({ host: 'http://schema-registry:8081' });

// Register a schema
const schema = {
  type: 'record',
  name: 'OrderCreated',
  namespace: 'com.example.events',
  fields: [
    { name: 'orderId', type: 'string' },
    { name: 'userId', type: 'string' },
    { name: 'total', type: 'double' },
    { name: 'currency', type: 'string', default: 'BDT' },
    { name: 'createdAt', type: 'long' },
  ],
};

const { id: schemaId } = await registry.register({
  type: SchemaType.AVRO,
  schema: JSON.stringify(schema),
});

// Produce with schema validation
async function publishOrderCreated(order: any) {
  const encodedValue = await registry.encode(schemaId, {
    orderId: order.id,
    userId: order.userId,
    total: order.total,
    currency: order.currency || 'BDT',
    createdAt: Date.now(),
  });

  await producer.send({
    topic: 'order-events',
    messages: [{ key: order.id, value: encodedValue }],
  });
}

// Consume with automatic schema resolution
async function consumeOrderEvents() {
  await consumer.run({
    eachMessage: async ({ message }) => {
      const decodedValue = await registry.decode(message.value);
      // decodedValue is typed according to the schema
      console.log('Order:', decodedValue.orderId, decodedValue.total);
    },
  });
}
```

### Schema Compatibility Modes
| Mode | Allowed Changes | Use Case |
|------|----------------|----------|
| BACKWARD | Delete fields, add optional fields | Consumer upgraded first |
| FORWARD | Add fields, delete optional fields | Producer upgraded first |
| FULL | Add/delete optional fields only | Safest — both directions |
| NONE | Any change allowed | Development only |

### Schema Evolution Rules
```
✅ SAFE Changes (Backward Compatible):
  - Add a new field WITH a default value
  - Remove a field that has a default value
  - Add a new optional field

❌ BREAKING Changes:
  - Remove a field WITHOUT a default value
  - Rename a field (wire format changes)
  - Change a field's type (int → string)
  - Add a required field without default
```

### Avro vs Protobuf vs JSON Schema
| Feature | Avro | Protobuf | JSON Schema |
|---------|------|----------|-------------|
| Size | Smallest (no field names) | Small (binary) | Largest (text) |
| Schema required to read | Yes | Yes (generated code) | No |
| Schema evolution | Excellent | Good | Basic |
| Code generation | Optional | Required | Optional |
| Kafka ecosystem | Best supported | Growing | Supported |
| Learning curve | Medium | Medium | Low |

### JSON Schema Alternative (Simpler)
```typescript
// For teams not ready for Avro/Protobuf
import Ajv from 'ajv';
const ajv = new Ajv();

const orderCreatedSchema = {
  type: 'object',
  required: ['orderId', 'userId', 'total'],
  properties: {
    orderId: { type: 'string' },
    userId: { type: 'string' },
    total: { type: 'number' },
    currency: { type: 'string', default: 'BDT' },
    tax: { type: 'number' }, // New optional field — backward compatible
  },
  additionalProperties: false,
};

const validate = ajv.compile(orderCreatedSchema);

// Validate before publishing
function publishEvent(topic: string, event: any) {
  if (!validate(event)) {
    throw new Error(`Schema validation failed: ${JSON.stringify(validate.errors)}`);
  }
  return producer.send({ topic, messages: [{ value: JSON.stringify(event) }] });
}
```

**Interview Tip:** "For a BD startup, I'd start with JSON Schema validation for simplicity. As the system grows to 5+ services, move to Confluent Schema Registry with Avro for stronger guarantees. The registry acts as the contract between teams."

---

## Q13: Kafka Partition Rebalancing & Consumer Groups

**Q: How does Kafka partition rebalancing work, and how do you minimize its impact?**

**A:**

### What Triggers Rebalancing
```
Consumer Group "order-processors" has 3 consumers, 6 partitions:
  Consumer A: [P0, P1]
  Consumer B: [P2, P3]
  Consumer C: [P4, P5]

When Consumer C dies:
  → REBALANCE triggered
  Consumer A: [P0, P1, P4]  (took over P4)
  Consumer B: [P2, P3, P5]  (took over P5)

When Consumer D joins:
  → REBALANCE triggered
  Consumer A: [P0, P1]
  Consumer B: [P2, P3]
  Consumer D: [P4, P5]
```

### Rebalancing Triggers
- Consumer joins/leaves the group
- Consumer crashes (heartbeat timeout)
- New partitions added to a topic
- Consumer's subscription changes

### The "Stop-the-World" Problem
```
During rebalance (Eager protocol):
1. ALL consumers STOP processing ← This is the problem
2. ALL partition assignments revoked
3. Group coordinator reassigns ALL partitions
4. Consumers resume

Duration: seconds to minutes depending on group size
Impact: Message processing halts entirely
```

### Solution: Cooperative Incremental Rebalancing
```typescript
const kafka = new Kafka({ brokers: ['kafka:9092'] });

const consumer = kafka.consumer({
  groupId: 'order-processors',
  // Use CooperativeSticky for minimal disruption
  rebalanceTimeout: 60000,
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

// KafkaJS uses cooperative rebalancing by default
// Only affected partitions are revoked, not all of them
```

### Cooperative vs Eager Rebalancing
| Aspect | Eager (Default in older clients) | Cooperative (Modern) |
|--------|--------------------------------|---------------------|
| During rebalance | ALL consumers stop | Only affected consumers pause |
| Partition movement | Revoke all, reassign all | Revoke only moving partitions |
| Downtime | Seconds to minutes | Milliseconds to seconds |
| Implementation | Simpler | More complex |
| KafkaJS | Not default | Default behavior |

### Static Group Membership (Avoid Unnecessary Rebalances)
```typescript
const consumer = kafka.consumer({
  groupId: 'order-processors',
  // Static membership: consumer gets fixed ID
  // Short restarts don't trigger rebalance
  groupInstanceId: `order-processor-${hostname()}`,
  sessionTimeout: 300000, // 5 minutes — tolerates restarts
});

// Without static membership: restart = rebalance
// With static membership: restart within sessionTimeout = no rebalance
```

### Graceful Shutdown (Prevent Unnecessary Rebalances)
```typescript
async function gracefulShutdown() {
  console.log('Shutting down consumer gracefully...');

  // 1. Stop fetching new messages
  await consumer.stop();

  // 2. Commit current offsets
  // (KafkaJS does this automatically on stop)

  // 3. Leave the group cleanly (triggers immediate rebalance instead of waiting for session timeout)
  await consumer.disconnect();

  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

### Monitoring Consumer Group Health
```typescript
// Check consumer group lag
const admin = kafka.admin();
await admin.connect();

const groupDescription = await admin.describeGroups(['order-processors']);
const offsets = await admin.fetchOffsets({ groupId: 'order-processors', topics: ['orders'] });
const topicOffsets = await admin.fetchTopicOffsets('orders');

// Calculate lag per partition
topicOffsets.forEach(partition => {
  const consumerOffset = offsets.find(o =>
    o.partitions.find(p => p.partition === partition.partition)
  );
  const lag = parseInt(partition.offset) - parseInt(consumerOffset?.partitions[0]?.offset || '0');
  console.log(`Partition ${partition.partition}: lag = ${lag} messages`);
});
```

**Interview Tip:** "At Banglalink, we used static group membership for our notification processors to avoid rebalances during rolling deployments. Combined with cooperative rebalancing, we reduced deployment-related message processing pauses from 30s to under 1s."

---

## Q14: Event Versioning & Evolution Strategies

**Q: How do you handle event schema changes without breaking consumers?**

**A:**

### Strategy 1: Backward-Compatible Changes Only
```typescript
// Version 1
interface OrderCreatedV1 {
  orderId: string;
  userId: string;
  total: number;
}

// Version 2 — only ADD optional fields
interface OrderCreatedV2 {
  orderId: string;
  userId: string;
  total: number;
  currency?: string;   // NEW — optional, default 'BDT'
  discount?: number;   // NEW — optional, default 0
}

// Old consumers still work — they ignore new fields
// New consumers can use new fields with fallbacks
function handleOrderCreated(event: Record<string, any>) {
  const currency = event.currency || 'BDT';     // Fallback for v1 events
  const discount = event.discount || 0;          // Fallback for v1 events
}
```

### Strategy 2: Explicit Versioning in Events
```typescript
// Include version in every event
interface VersionedEvent {
  eventType: string;
  version: number;
  timestamp: string;
  correlationId: string;
  data: Record<string, any>;
}

// Publish with version
await publishEvent({
  eventType: 'OrderCreated',
  version: 2,
  timestamp: new Date().toISOString(),
  correlationId: uuid(),
  data: { orderId: '123', userId: 'user-1', total: 50, currency: 'BDT' },
});

// Consumer handles multiple versions
async function handleEvent(event: VersionedEvent) {
  switch (event.eventType) {
    case 'OrderCreated':
      if (event.version === 1) {
        return handleOrderCreatedV1(event.data);
      } else if (event.version >= 2) {
        return handleOrderCreatedV2(event.data);
      }
      break;
  }
}
```

### Strategy 3: Event Upcasting
```typescript
// Transform old events to new format at read time
const upcasters = new Map<string, (event: any) => any>();

upcasters.set('OrderCreated:1->2', (v1Event) => ({
  ...v1Event,
  currency: 'BDT',  // Default for old events
  discount: 0,
}));

upcasters.set('OrderCreated:2->3', (v2Event) => ({
  ...v2Event,
  taxAmount: v2Event.total * 0.15, // Calculate tax for old events
}));

function upcastEvent(event: VersionedEvent, targetVersion: number): VersionedEvent {
  let current = event;
  while (current.version < targetVersion) {
    const key = `${current.eventType}:${current.version}->${current.version + 1}`;
    const upcaster = upcasters.get(key);
    if (!upcaster) throw new Error(`No upcaster for ${key}`);
    current = { ...current, data: upcaster(current.data), version: current.version + 1 };
  }
  return current;
}
```

### Strategy 4: Separate Topics per Version (Last Resort)
```
Topic: order-events-v1  ← Old consumers read here
Topic: order-events-v2  ← New consumers read here

Bridge: Consumer reads v1 → upcasts → publishes to v2
```
- Use only for major breaking changes
- Run bridge temporarily during migration

### Event Versioning Decision Tree
```
Need to change an event schema?
  │
  ├─ Adding optional field → Just add it (backward compatible) ✅
  │
  ├─ Removing a field → Mark as deprecated, remove after all consumers updated
  │
  ├─ Renaming a field → Add new field + keep old field → deprecate old ← Expand-Contract
  │
  ├─ Changing field type → New version + upcaster
  │
  └─ Completely new structure → New event type (OrderCreatedV2 as separate event)
```

**Interview Tip:** "I follow the expand-contract pattern for most schema changes. Add new fields alongside old ones, migrate all consumers, then remove old fields. For event sourcing systems, I use upcasters so historical events can be replayed with the current schema."

---

## Q15: Dead Letter Queue (DLQ) Handling Patterns

**Q: How do you handle failed messages in event-driven systems?**

**A:**

### What Goes Into a DLQ
```
Message fails processing → Retry (3-5 times with backoff) → Still fails → DLQ

Common failure reasons:
- Invalid message format (schema mismatch)
- Business logic failure (e.g., user not found)
- Transient errors that exceeded retry limit
- Bugs in consumer code
- Downstream service permanently down
```

### Kafka DLQ Implementation
```typescript
const DLQ_TOPIC = 'order-events.dlq';

async function processWithDLQ(message: KafkaMessage) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await processOrder(JSON.parse(message.value.toString()));
      return; // Success
    } catch (error) {
      attempt++;

      if (isRetryable(error) && attempt < maxRetries) {
        // Transient error — retry with backoff
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }

      // Non-retryable or exhausted retries — send to DLQ
      await producer.send({
        topic: DLQ_TOPIC,
        messages: [{
          key: message.key,
          value: message.value,
          headers: {
            ...message.headers,
            'x-original-topic': 'order-events',
            'x-failure-reason': error.message,
            'x-failure-timestamp': Date.now().toString(),
            'x-retry-count': attempt.toString(),
            'x-original-partition': message.partition?.toString(),
            'x-original-offset': message.offset,
          },
        }],
      });

      logger.error('Message sent to DLQ', {
        topic: 'order-events',
        offset: message.offset,
        error: error.message,
      });
      return;
    }
  }
}

function isRetryable(error: Error): boolean {
  // Network errors, timeouts → retryable
  // Validation errors, business logic → not retryable
  return error instanceof TimeoutError ||
         error instanceof ConnectionError ||
         error.message.includes('ECONNREFUSED');
}
```

### DLQ Monitoring & Alerting
```typescript
// Monitor DLQ topic for messages
const dlqConsumer = kafka.consumer({ groupId: 'dlq-monitor' });
await dlqConsumer.subscribe({ topic: DLQ_TOPIC });

await dlqConsumer.run({
  eachMessage: async ({ message }) => {
    const failureReason = message.headers['x-failure-reason']?.toString();
    const originalTopic = message.headers['x-original-topic']?.toString();

    // Alert on DLQ messages
    await alertService.send({
      channel: '#backend-alerts',
      message: `⚠️ DLQ message from ${originalTopic}: ${failureReason}`,
      severity: 'warning',
    });

    // Track metrics
    dlqMessageCounter.inc({
      original_topic: originalTopic,
      failure_reason: categorizeError(failureReason),
    });
  },
});
```

### DLQ Replay/Reprocessing
```typescript
// CLI tool or admin endpoint to replay DLQ messages
async function replayDLQ(options: {
  fromTimestamp?: number;
  limit?: number;
  originalTopic: string;
}) {
  const dlqConsumer = kafka.consumer({ groupId: `dlq-replay-${Date.now()}` });
  await dlqConsumer.subscribe({ topic: DLQ_TOPIC, fromBeginning: true });

  let replayed = 0;

  await dlqConsumer.run({
    eachMessage: async ({ message }) => {
      const originalTopic = message.headers['x-original-topic']?.toString();
      if (originalTopic !== options.originalTopic) return;

      const timestamp = parseInt(message.headers['x-failure-timestamp']?.toString() || '0');
      if (options.fromTimestamp && timestamp < options.fromTimestamp) return;

      // Republish to original topic
      await producer.send({
        topic: originalTopic,
        messages: [{
          key: message.key,
          value: message.value,
          headers: {
            ...message.headers,
            'x-replayed-from-dlq': 'true',
            'x-replayed-at': Date.now().toString(),
          },
        }],
      });

      replayed++;
      if (options.limit && replayed >= options.limit) {
        await dlqConsumer.disconnect();
      }
    },
  });

  return { replayed };
}
```

### DLQ Best Practices
| Practice | Why |
|----------|-----|
| Include original metadata in headers | Know where the message came from |
| Categorize failure reasons | Distinguish transient vs permanent failures |
| Set up alerts on DLQ message count | Don't let failures go unnoticed |
| Build replay tooling | Fix the bug, then replay the messages |
| Set DLQ retention longer than main topic | Don't lose failed messages before reviewing |
| Review DLQ regularly (daily/weekly) | Part of operational hygiene |

**Interview Tip:** "A DLQ without monitoring and replay tooling is just a message graveyard. I always build three things together: the DLQ routing, an alerting pipeline, and a replay mechanism. At Banglalink, we had a daily DLQ review as part of our ops process."

---

## Q16: Testing Event-Driven Systems

**Q: How do you test event-driven architectures?**

**A:**

### Unit Testing: Event Handlers in Isolation
```typescript
describe('OrderCreatedHandler', () => {
  let handler: OrderCreatedHandler;
  let mockPaymentService: jest.Mocked<PaymentService>;
  let mockInventoryService: jest.Mocked<InventoryService>;

  beforeEach(() => {
    mockPaymentService = { initiatePayment: jest.fn() } as any;
    mockInventoryService = { reserveItems: jest.fn() } as any;
    handler = new OrderCreatedHandler(mockPaymentService, mockInventoryService);
  });

  it('should initiate payment and reserve inventory', async () => {
    const event = {
      orderId: 'order-123',
      userId: 'user-1',
      items: [{ productId: 'p1', qty: 2 }],
      total: 100,
    };

    await handler.handle(event);

    expect(mockPaymentService.initiatePayment).toHaveBeenCalledWith({
      orderId: 'order-123',
      amount: 100,
    });
    expect(mockInventoryService.reserveItems).toHaveBeenCalledWith(event.items);
  });

  it('should handle payment failure gracefully', async () => {
    mockPaymentService.initiatePayment.mockRejectedValue(new Error('Payment failed'));

    const event = { orderId: 'order-123', userId: 'user-1', items: [], total: 100 };

    await expect(handler.handle(event)).rejects.toThrow('Payment failed');
    expect(mockInventoryService.reserveItems).not.toHaveBeenCalled();
  });
});
```

### Integration Testing: With Real Broker
```typescript
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';

describe('Order Event Integration', () => {
  let kafkaContainer: StartedKafkaContainer;
  let producer: Producer;
  let consumer: Consumer;

  beforeAll(async () => {
    // Start real Kafka in Docker for tests
    kafkaContainer = await new KafkaContainer().start();

    const kafka = new Kafka({
      brokers: [kafkaContainer.getBrokers()],
    });

    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'test-group' });
    await producer.connect();
    await consumer.connect();
  }, 60000);

  afterAll(async () => {
    await producer.disconnect();
    await consumer.disconnect();
    await kafkaContainer.stop();
  });

  it('should process OrderCreated event end-to-end', async () => {
    const receivedMessages: any[] = [];

    await consumer.subscribe({ topic: 'order-events', fromBeginning: true });
    await consumer.run({
      eachMessage: async ({ message }) => {
        receivedMessages.push(JSON.parse(message.value.toString()));
      },
    });

    // Publish event
    await producer.send({
      topic: 'order-events',
      messages: [{ value: JSON.stringify({ orderId: '123', total: 50 }) }],
    });

    // Wait for processing
    await waitFor(() => expect(receivedMessages).toHaveLength(1));
    expect(receivedMessages[0].orderId).toBe('123');
  });
});
```

### Testing Eventual Consistency
```typescript
// Helper: poll until condition is met or timeout
async function waitForCondition(
  checkFn: () => Promise<boolean>,
  timeoutMs = 10000,
  intervalMs = 200,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkFn()) return;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Condition not met within timeout');
}

// Usage in test
it('should update read model after event processing', async () => {
  // Publish OrderCreated event
  await publishEvent('OrderCreated', { orderId: '123', userId: 'user-1', total: 50 });

  // Wait for read model to be updated (eventual consistency)
  await waitForCondition(async () => {
    const order = await orderReadRepository.findById('123');
    return order !== null && order.status === 'CREATED';
  }, 5000);

  const order = await orderReadRepository.findById('123');
  expect(order.total).toBe(50);
});
```

### Testing Idempotency
```typescript
it('should process the same event only once', async () => {
  const event = { eventId: 'evt-1', orderId: '123', total: 50 };

  // Process same event twice
  await handler.handle(event);
  await handler.handle(event); // Duplicate

  // Should only create one order
  const orders = await orderRepository.findByOrderId('123');
  expect(orders).toHaveLength(1);
});
```

**Interview Tip:** "I use testcontainers for integration tests with real Kafka/RabbitMQ instances. For unit tests, I mock the broker and test handler logic in isolation. The key challenge in testing EDA is handling eventual consistency — I use polling helpers with reasonable timeouts."
