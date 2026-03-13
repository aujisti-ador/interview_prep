# Design Patterns in Practice — Interview Preparation Guide

> For Senior/Lead Backend Engineers | TypeScript, NestJS, Node.js Focus
> Covers Gang of Four patterns, SOLID principles, architectural patterns, and anti-patterns with real-world examples.

## Table of Contents
1. [Q1: SOLID Principles](#q1-solid-principles-with-real-nodejsnestjs-examples)
2. [Q2: Strategy Pattern](#q2-strategy-pattern)
3. [Q3: Observer Pattern](#q3-observer-pattern)
4. [Q4: Factory Pattern](#q4-factory-pattern-factory-method--abstract-factory)
5. [Q5: Singleton Pattern](#q5-singleton-pattern)
6. [Q6: Decorator Pattern](#q6-decorator-pattern)
7. [Q7: Adapter Pattern](#q7-adapter-pattern)
8. [Q8: Repository Pattern](#q8-repository-pattern)
9. [Q9: DTO (Data Transfer Object) Pattern](#q9-dto-data-transfer-object-pattern)
10. [Q10: Unit of Work Pattern](#q10-unit-of-work-pattern)
11. [Q11: Circuit Breaker Pattern](#q11-circuit-breaker-pattern)
12. [Q12: NestJS Request Pipeline (Middleware, Interceptor, Guard, Pipe)](#q12-middleware-interceptor-guard-pipe--nestjs-request-pipeline)
13. [Q13: CQRS Pattern](#q13-cqrs-pattern-command-query-responsibility-segregation)
14. [Q14: Clean Architecture / Hexagonal Architecture](#q14-clean-architecture--hexagonal-architecture)
15. [Quick Reference: Pattern Selection Cheat Sheet](#quick-reference-pattern-selection-cheat-sheet)

---

## Q1: SOLID Principles with Real Node.js/NestJS Examples

**Q: Walk me through the SOLID principles with concrete examples from your backend work.**

SOLID is a set of five design principles that guide writing maintainable, extensible, and testable object-oriented code. Every pattern in this guide traces back to one or more of these principles.

---

### S — Single Responsibility Principle (SRP)

**A class should have only one reason to change.**

**Before (violation):**

```typescript
// This controller does validation, business logic, data access, AND response formatting
@Controller('users')
export class UserController {
  constructor(private readonly db: DataSource) {}

  @Post()
  async createUser(@Body() body: any) {
    // Validation logic
    if (!body.email || !body.email.includes('@')) {
      throw new BadRequestException('Invalid email');
    }
    if (!body.password || body.password.length < 8) {
      throw new BadRequestException('Password too short');
    }

    // Business logic
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Data access
    const user = await this.db.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *',
      [body.email, hashedPassword],
    );

    // Response formatting
    return {
      id: user[0].id,
      email: user[0].email,
      createdAt: user[0].created_at,
    };
  }
}
```

**After (SRP applied):**

```typescript
// Validation: handled by DTO + class-validator
export class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}

// Data access: Repository
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }
}

// Business logic: Service
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashService: HashService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    const hashedPassword = await this.hashService.hash(dto.password);
    return this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
    });
  }
}

// Response formatting: Response DTO
export class UserResponseDto {
  id: string;
  email: string;
  createdAt: Date;

  static fromEntity(entity: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = entity.id;
    dto.email = entity.email;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

// Controller: only routing and orchestration
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.userService.createUser(dto);
    return UserResponseDto.fromEntity(user);
  }
}
```

Each class now has a single reason to change: the DTO changes if the API contract changes, the repository changes if the database changes, the service changes if the business rules change, and the controller changes if the routing changes.

---

### O — Open/Closed Principle (OCP)

**Software entities should be open for extension but closed for modification.**

**Before (violation):**

```typescript
@Injectable()
export class NotificationService {
  async send(type: string, to: string, message: string) {
    // Every time we add a new channel, we modify this method
    if (type === 'email') {
      await this.sendEmail(to, message);
    } else if (type === 'sms') {
      await this.sendSms(to, message);
    } else if (type === 'push') {
      await this.sendPush(to, message);
    } else if (type === 'slack') {
      // Newly added — we had to modify the existing class
      await this.sendSlack(to, message);
    }
  }

  private async sendEmail(to: string, message: string) { /* ... */ }
  private async sendSms(to: string, message: string) { /* ... */ }
  private async sendPush(to: string, message: string) { /* ... */ }
  private async sendSlack(to: string, message: string) { /* ... */ }
}
```

**After (OCP applied using Strategy Pattern):**

```typescript
// Abstraction — closed for modification
export interface NotificationChannel {
  readonly channelType: string;
  send(to: string, message: string): Promise<void>;
}

// Extensions — open for extension by adding new classes
@Injectable()
export class EmailChannel implements NotificationChannel {
  readonly channelType = 'email';
  async send(to: string, message: string): Promise<void> {
    // Send via SMTP / SES
  }
}

@Injectable()
export class SmsChannel implements NotificationChannel {
  readonly channelType = 'sms';
  async send(to: string, message: string): Promise<void> {
    // Send via Twilio
  }
}

@Injectable()
export class SlackChannel implements NotificationChannel {
  readonly channelType = 'slack';
  async send(to: string, message: string): Promise<void> {
    // Send via Slack webhook — no modification to existing code
  }
}

// Service does not change when new channels are added
@Injectable()
export class NotificationService {
  private readonly channelMap: Map<string, NotificationChannel>;

  constructor(
    @Inject('NOTIFICATION_CHANNELS')
    channels: NotificationChannel[],
  ) {
    this.channelMap = new Map(channels.map((c) => [c.channelType, c]));
  }

  async send(type: string, to: string, message: string): Promise<void> {
    const channel = this.channelMap.get(type);
    if (!channel) {
      throw new Error(`Unsupported notification channel: ${type}`);
    }
    await channel.send(to, message);
  }
}
```

Adding a new channel means creating a new class and registering it — the `NotificationService` class itself never changes.

---

### L — Liskov Substitution Principle (LSP)

**Subtypes must be substitutable for their base types without altering program correctness.**

**Before (violation):**

```typescript
class FileStorage {
  async save(path: string, data: Buffer): Promise<string> {
    await fs.writeFile(path, data);
    return path;
  }

  async delete(path: string): Promise<void> {
    await fs.unlink(path);
  }
}

// ReadOnlyStorage breaks the contract — callers expect save and delete to work
class ReadOnlyStorage extends FileStorage {
  async save(path: string, data: Buffer): Promise<string> {
    throw new Error('Cannot save to read-only storage'); // LSP violation
  }

  async delete(path: string): Promise<void> {
    throw new Error('Cannot delete from read-only storage'); // LSP violation
  }
}
```

**After (LSP applied):**

```typescript
// Separate interfaces by capability
interface ReadableStorage {
  read(path: string): Promise<Buffer>;
  exists(path: string): Promise<boolean>;
}

interface WritableStorage extends ReadableStorage {
  save(path: string, data: Buffer): Promise<string>;
  delete(path: string): Promise<void>;
}

class FileStorage implements WritableStorage {
  async read(path: string): Promise<Buffer> {
    return fs.readFile(path);
  }
  async exists(path: string): Promise<boolean> {
    return fs.access(path).then(() => true).catch(() => false);
  }
  async save(path: string, data: Buffer): Promise<string> {
    await fs.writeFile(path, data);
    return path;
  }
  async delete(path: string): Promise<void> {
    await fs.unlink(path);
  }
}

class S3ReadOnlyStorage implements ReadableStorage {
  async read(path: string): Promise<Buffer> {
    // Read from S3
  }
  async exists(path: string): Promise<boolean> {
    // Head object in S3
  }
  // No save/delete — and no LSP violation because the interface does not require them
}
```

Any function that depends on `ReadableStorage` can receive either `FileStorage` or `S3ReadOnlyStorage` without problems.

---

### I — Interface Segregation Principle (ISP)

**Clients should not be forced to depend on interfaces they do not use.**

**Before (violation):**

```typescript
interface UserService {
  createUser(dto: CreateUserDto): Promise<User>;
  updateUser(id: string, dto: UpdateUserDto): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getUserById(id: string): Promise<User>;
  searchUsers(query: string): Promise<User[]>;
  exportUsersCsv(): Promise<Buffer>;
  sendWelcomeEmail(userId: string): Promise<void>;
  resetPassword(userId: string): Promise<void>;
  generateReport(): Promise<Report>;
}

// A read-only dashboard component is forced to depend on mutation methods it never calls
class DashboardService {
  constructor(private readonly userService: UserService) {}

  async getStats() {
    const users = await this.userService.searchUsers('');
    // Only uses search — but depends on the entire 9-method interface
  }
}
```

**After (ISP applied):**

```typescript
interface UserReader {
  getUserById(id: string): Promise<User>;
  searchUsers(query: string): Promise<User[]>;
}

interface UserWriter {
  createUser(dto: CreateUserDto): Promise<User>;
  updateUser(id: string, dto: UpdateUserDto): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

interface UserNotifier {
  sendWelcomeEmail(userId: string): Promise<void>;
  resetPassword(userId: string): Promise<void>;
}

interface UserReporter {
  exportUsersCsv(): Promise<Buffer>;
  generateReport(): Promise<Report>;
}

// Concrete class can implement multiple interfaces
@Injectable()
class UserServiceImpl implements UserReader, UserWriter, UserNotifier, UserReporter {
  // ... full implementation
}

// Dashboard only depends on what it needs
class DashboardService {
  constructor(
    @Inject('USER_READER')
    private readonly userReader: UserReader,
  ) {}

  async getStats() {
    const users = await this.userReader.searchUsers('');
  }
}
```

---

### D — Dependency Inversion Principle (DIP)

**High-level modules should not depend on low-level modules. Both should depend on abstractions.**

**Before (violation):**

```typescript
// High-level module directly depends on low-level concrete class
@Injectable()
export class OrderService {
  private readonly stripe = new StripePaymentGateway(); // Tight coupling

  async placeOrder(order: Order): Promise<void> {
    await this.stripe.charge(order.total, order.currency);
  }
}
```

**After (DIP applied):**

```typescript
// Abstraction
export interface PaymentGateway {
  charge(amount: number, currency: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: number): Promise<RefundResult>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

// Low-level module depends on the abstraction
@Injectable()
export class StripePaymentGateway implements PaymentGateway {
  async charge(amount: number, currency: string): Promise<PaymentResult> {
    // Stripe SDK call
  }
  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    // Stripe refund
  }
}

// High-level module also depends on the abstraction
@Injectable()
export class OrderService {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async placeOrder(order: Order): Promise<void> {
    await this.paymentGateway.charge(order.total, order.currency);
  }
}

// NestJS wiring — swap implementation without touching OrderService
@Module({
  providers: [
    {
      provide: PAYMENT_GATEWAY,
      useClass:
        process.env.PAYMENT_PROVIDER === 'bkash'
          ? BkashPaymentGateway
          : StripePaymentGateway,
    },
    OrderService,
  ],
})
export class PaymentModule {}
```

**Interview Tip:**
> "Give me an example of a SOLID violation you fixed."
>
> Good answer structure: describe the original code, identify the principle violated, explain the impact (e.g., untestable, hard to extend), describe the refactored solution, and quantify the benefit (e.g., "allowed us to add two new payment providers in a sprint without touching the core order service").

---

## Q2: Strategy Pattern

**Q: Explain the Strategy pattern. When would you use it in a backend system?**

**Intent:** Define a family of algorithms, encapsulate each one, and make them interchangeable. Strategy lets the algorithm vary independently from the clients that use it.

**When to use:**
- Multiple algorithms for the same task (pricing, payment, notification)
- Runtime switching between algorithms based on configuration or user input
- Eliminating long if/else or switch chains
- Algorithms change or grow independently of the context that uses them

---

### TypeScript Implementation

```typescript
// Strategy interface
interface PricingStrategy {
  calculatePrice(basePrice: number, quantity: number): number;
}

// Concrete strategies
class RegularPricing implements PricingStrategy {
  calculatePrice(basePrice: number, quantity: number): number {
    return basePrice * quantity;
  }
}

class PremiumPricing implements PricingStrategy {
  private readonly discount = 0.15;
  calculatePrice(basePrice: number, quantity: number): number {
    return basePrice * quantity * (1 - this.discount);
  }
}

class WholesalePricing implements PricingStrategy {
  calculatePrice(basePrice: number, quantity: number): number {
    const discount = quantity >= 100 ? 0.30 : quantity >= 50 ? 0.20 : 0.10;
    return basePrice * quantity * (1 - discount);
  }
}

// Context
class OrderCalculator {
  constructor(private strategy: PricingStrategy) {}

  setStrategy(strategy: PricingStrategy): void {
    this.strategy = strategy;
  }

  calculateTotal(basePrice: number, quantity: number): number {
    return this.strategy.calculatePrice(basePrice, quantity);
  }
}

// Usage
const calculator = new OrderCalculator(new RegularPricing());
console.log(calculator.calculateTotal(100, 10)); // 1000

calculator.setStrategy(new PremiumPricing());
console.log(calculator.calculateTotal(100, 10)); // 850
```

---

### Real-World NestJS Example: Payment Processing

```typescript
// ---- Interfaces ----

export interface PaymentStrategy {
  readonly providerName: string;
  charge(amount: number, currency: string, metadata: PaymentMetadata): Promise<PaymentResult>;
  refund(transactionId: string, amount: number): Promise<RefundResult>;
  verifyWebhook(payload: Buffer, signature: string): boolean;
}

export interface PaymentResult {
  transactionId: string;
  status: 'success' | 'pending' | 'failed';
  providerRef: string;
}

export interface PaymentMetadata {
  customerId: string;
  orderId: string;
  description?: string;
}

// ---- Concrete Strategies ----

@Injectable()
export class StripeStrategy implements PaymentStrategy {
  readonly providerName = 'stripe';

  constructor(private readonly configService: ConfigService) {}

  async charge(amount: number, currency: string, metadata: PaymentMetadata): Promise<PaymentResult> {
    const stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'));
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency,
      metadata: { orderId: metadata.orderId },
    });
    return {
      transactionId: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'success' : 'pending',
      providerRef: paymentIntent.id,
    };
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    // Stripe refund implementation
  }

  verifyWebhook(payload: Buffer, signature: string): boolean {
    // Stripe signature verification
  }
}

@Injectable()
export class BkashStrategy implements PaymentStrategy {
  readonly providerName = 'bkash';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async charge(amount: number, currency: string, metadata: PaymentMetadata): Promise<PaymentResult> {
    const token = await this.getAuthToken();
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/checkout/create`, {
        amount: amount.toString(),
        merchantInvoiceNumber: metadata.orderId,
      }, {
        headers: { Authorization: token },
      }),
    );
    return {
      transactionId: response.data.paymentID,
      status: 'pending',
      providerRef: response.data.bkashURL,
    };
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    // bKash refund implementation
  }

  verifyWebhook(payload: Buffer, signature: string): boolean {
    // bKash webhook verification
  }

  private async getAuthToken(): Promise<string> { /* ... */ }
}

// ---- Context: PaymentService ----

@Injectable()
export class PaymentService {
  private readonly strategies: Map<string, PaymentStrategy>;

  constructor(
    @Inject('PAYMENT_STRATEGIES')
    strategies: PaymentStrategy[],
    private readonly paymentRepository: PaymentRepository,
  ) {
    this.strategies = new Map(strategies.map((s) => [s.providerName, s]));
  }

  async processPayment(
    provider: string,
    amount: number,
    currency: string,
    metadata: PaymentMetadata,
  ): Promise<PaymentResult> {
    const strategy = this.strategies.get(provider);
    if (!strategy) {
      throw new BadRequestException(`Unsupported payment provider: ${provider}`);
    }

    const result = await strategy.charge(amount, currency, metadata);

    await this.paymentRepository.save({
      transactionId: result.transactionId,
      provider,
      amount,
      currency,
      status: result.status,
      orderId: metadata.orderId,
    });

    return result;
  }
}

// ---- Module wiring ----

@Module({
  providers: [
    StripeStrategy,
    BkashStrategy,
    {
      provide: 'PAYMENT_STRATEGIES',
      useFactory: (stripe: StripeStrategy, bkash: BkashStrategy) => [stripe, bkash],
      inject: [StripeStrategy, BkashStrategy],
    },
    PaymentService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
```

**Trade-offs:**
- Adds indirection — if there is only one algorithm and it will never change, a direct implementation is simpler.
- Each strategy is its own class, which increases file count.
- The caller must know which strategy to select (or a factory/config must decide).

**Interview Tip:**
> "Strategy is the workhorse pattern for backends. Anywhere you see a switch statement deciding which service to call, you can probably extract a Strategy. The key benefit is that adding a new provider means adding a new class, not editing an existing one — which is also the Open/Closed Principle."

---

## Q3: Observer Pattern

**Q: How does the Observer pattern work, and how does it relate to Node.js EventEmitter?**

**Intent:** Define a one-to-many dependency between objects so that when one object changes state, all its dependents are notified and updated automatically.

**When to use:**
- Loosely coupled event notification (order placed, user registered, payment received)
- Multiple systems must react to the same event independently
- You want to decouple the "something happened" from "what to do about it"

---

### Node.js EventEmitter as Built-in Observer

```typescript
import { EventEmitter } from 'events';

// Typed event emitter for type safety
interface OrderEvents {
  'order.placed': (order: Order) => void;
  'order.shipped': (order: Order, trackingNumber: string) => void;
  'order.cancelled': (order: Order, reason: string) => void;
}

class TypedEventEmitter<T extends Record<string, (...args: any[]) => void>> {
  private emitter = new EventEmitter();

  on<K extends keyof T & string>(event: K, listener: T[K]): void {
    this.emitter.on(event, listener as any);
  }

  emit<K extends keyof T & string>(event: K, ...args: Parameters<T[K]>): void {
    this.emitter.emit(event, ...args);
  }

  off<K extends keyof T & string>(event: K, listener: T[K]): void {
    this.emitter.off(event, listener as any);
  }
}

// Usage
const orderEvents = new TypedEventEmitter<OrderEvents>();

// Observers register themselves
orderEvents.on('order.placed', (order) => {
  console.log(`Inventory: reserving stock for order ${order.id}`);
});

orderEvents.on('order.placed', (order) => {
  console.log(`Email: sending confirmation to ${order.customerEmail}`);
});

orderEvents.on('order.placed', (order) => {
  console.log(`Analytics: tracking order ${order.id}`);
});

// Subject emits
orderEvents.emit('order.placed', newOrder);
```

---

### Real-World NestJS Implementation Using @nestjs/event-emitter

```typescript
// ---- Events ----

export class OrderPlacedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly total: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}

// ---- Subject: OrderService emits events ----

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async placeOrder(dto: PlaceOrderDto): Promise<Order> {
    const order = await this.orderRepository.create({
      customerId: dto.customerId,
      items: dto.items,
      total: this.calculateTotal(dto.items),
      status: OrderStatus.PLACED,
    });

    // Emit event — OrderService does not know or care who listens
    this.eventEmitter.emit(
      'order.placed',
      new OrderPlacedEvent(order.id, order.customerId, order.items, order.total),
    );

    return order;
  }
}

// ---- Observers: independent handlers ----

@Injectable()
export class InventoryListener {
  constructor(private readonly inventoryService: InventoryService) {}

  @OnEvent('order.placed')
  async handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    for (const item of event.items) {
      await this.inventoryService.reserveStock(item.productId, item.quantity);
    }
  }
}

@Injectable()
export class NotificationListener {
  constructor(private readonly emailService: EmailService) {}

  @OnEvent('order.placed')
  async handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    await this.emailService.sendOrderConfirmation(event.customerId, event.orderId);
  }
}

@Injectable()
export class AnalyticsListener {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @OnEvent('order.placed', { async: true }) // non-blocking
  async handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    await this.analyticsService.trackEvent('order_placed', {
      orderId: event.orderId,
      total: event.total,
      itemCount: event.items.length,
    });
  }
}
```

---

### Observer vs Pub/Sub

| Aspect | Observer | Pub/Sub |
|--------|----------|---------|
| Coupling | Subject knows about observers (direct reference or in-process) | Publisher and subscriber are fully decoupled (message broker in between) |
| Communication | Synchronous (or async but in-process) | Asynchronous via broker (RabbitMQ, Kafka, Redis) |
| Scope | Single process | Cross-process / cross-service |
| Example | EventEmitter, NestJS @OnEvent | RabbitMQ topic exchange, Kafka consumer group |
| Reliability | If process crashes, events are lost | Broker persists messages, supports retries and dead-letter queues |

**Trade-offs:**
- In-process Observer is simple but not durable — events are lost on crash.
- For critical workflows (payment confirmation, inventory), prefer Pub/Sub with a message broker.
- Observer can lead to hard-to-trace execution flow if there are many listeners.

**Interview Tip:**
> "I use the Observer pattern (EventEmitter / NestJS events) for non-critical, in-process reactions — like logging or analytics. For anything that must survive a crash or span services, I switch to a message broker with guaranteed delivery."

---

## Q4: Factory Pattern (Factory Method + Abstract Factory)

**Q: Explain the Factory pattern. What is the difference between a simple factory, a factory method, and an abstract factory?**

**Intent:** Create objects without specifying the exact class. The factory encapsulates the creation logic.

**When to use:**
- Object creation is complex (many dependencies, configuration)
- The exact type to create depends on runtime input
- You want to decouple the consumer from the concrete class
- You need consistent initialization logic

---

### Simple Factory

A function or class that returns instances based on input. Not technically a GoF pattern, but the most common in practice.

```typescript
// Simple factory function
function createLogger(type: 'console' | 'file' | 'cloud'): Logger {
  switch (type) {
    case 'console':
      return new ConsoleLogger();
    case 'file':
      return new FileLogger('/var/log/app.log');
    case 'cloud':
      return new CloudWatchLogger('us-east-1', 'my-log-group');
    default:
      throw new Error(`Unknown logger type: ${type}`);
  }
}
```

### Factory Method

A method in a base class that subclasses override to produce different products.

```typescript
// Abstract creator
abstract class NotificationSender {
  // Factory method — subclasses decide which transport to create
  protected abstract createTransport(): NotificationTransport;

  async send(to: string, message: string): Promise<void> {
    const transport = this.createTransport();
    await transport.connect();
    await transport.deliver(to, message);
    await transport.disconnect();
  }
}

interface NotificationTransport {
  connect(): Promise<void>;
  deliver(to: string, message: string): Promise<void>;
  disconnect(): Promise<void>;
}

class EmailNotificationSender extends NotificationSender {
  protected createTransport(): NotificationTransport {
    return new SmtpTransport(this.smtpConfig);
  }
}

class SmsNotificationSender extends NotificationSender {
  protected createTransport(): NotificationTransport {
    return new TwilioTransport(this.twilioConfig);
  }
}
```

### Abstract Factory

A factory that produces families of related objects.

```typescript
// Abstract factory interface
interface DatabaseFactory {
  createConnection(): DatabaseConnection;
  createQueryBuilder(): QueryBuilder;
  createMigrationRunner(): MigrationRunner;
}

// Concrete factory for PostgreSQL
class PostgresFactory implements DatabaseFactory {
  constructor(private readonly config: PostgresConfig) {}

  createConnection(): DatabaseConnection {
    return new PgConnection(this.config);
  }
  createQueryBuilder(): QueryBuilder {
    return new PgQueryBuilder();
  }
  createMigrationRunner(): MigrationRunner {
    return new PgMigrationRunner(this.config);
  }
}

// Concrete factory for MySQL
class MysqlFactory implements DatabaseFactory {
  constructor(private readonly config: MysqlConfig) {}

  createConnection(): DatabaseConnection {
    return new MysqlConnection(this.config);
  }
  createQueryBuilder(): QueryBuilder {
    return new MysqlQueryBuilder();
  }
  createMigrationRunner(): MigrationRunner {
    return new MysqlMigrationRunner(this.config);
  }
}

// Client code works with the abstract factory — database can be swapped
class DataService {
  private connection: DatabaseConnection;
  private queryBuilder: QueryBuilder;

  constructor(factory: DatabaseFactory) {
    this.connection = factory.createConnection();
    this.queryBuilder = factory.createQueryBuilder();
  }
}
```

---

### NestJS Custom Providers as Factories

```typescript
@Module({
  providers: [
    // useFactory: runtime factory based on config
    {
      provide: 'CACHE_STORE',
      useFactory: (configService: ConfigService): CacheStore => {
        const driver = configService.get<string>('CACHE_DRIVER');
        switch (driver) {
          case 'redis':
            return new RedisCacheStore({
              host: configService.get('REDIS_HOST'),
              port: configService.get<number>('REDIS_PORT'),
            });
          case 'memcached':
            return new MemcachedCacheStore({
              servers: configService.get('MEMCACHED_SERVERS').split(','),
            });
          default:
            return new InMemoryCacheStore();
        }
      },
      inject: [ConfigService],
    },

    // Async factory — waits for connection to be established
    {
      provide: 'MONGO_CLIENT',
      useFactory: async (configService: ConfigService): Promise<MongoClient> => {
        const client = new MongoClient(configService.get('MONGO_URI'));
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
  ],
})
export class InfrastructureModule {}
```

### Generic Factory with TypeScript

```typescript
interface Constructable<T> {
  new (...args: any[]): T;
}

class GenericFactory<T> {
  private registry = new Map<string, Constructable<T>>();

  register(key: string, ctor: Constructable<T>): void {
    this.registry.set(key, ctor);
  }

  create(key: string, ...args: any[]): T {
    const Ctor = this.registry.get(key);
    if (!Ctor) {
      throw new Error(`No registration for key: ${key}`);
    }
    return new Ctor(...args);
  }
}

// Usage
const parserFactory = new GenericFactory<FileParser>();
parserFactory.register('csv', CsvParser);
parserFactory.register('json', JsonParser);
parserFactory.register('xml', XmlParser);

const parser = parserFactory.create('csv');
```

**Trade-offs:**
- Factory adds indirection — avoid it if you only ever create one type.
- Simple factory violates OCP (the switch grows). Factory method and abstract factory solve this.
- Abstract factory is heavy — justified only when you have families of related objects.

**Interview Tip:**
> "In NestJS, `useFactory` providers are the most practical form of the Factory pattern. I use them for environment-dependent service creation — connecting to Redis in production, in-memory in testing, all behind the same injection token."

---

## Q5: Singleton Pattern

**Q: How does the Singleton pattern work? Is it different in Node.js vs. traditional OOP languages?**

**Intent:** Ensure a class has exactly one instance and provide a global point of access to it.

**When to use:**
- Shared resource management (database connection pool, configuration)
- Logging service
- Application-wide caches

**When NOT to use:**
- Shared mutable state that makes testing hard
- When you actually need per-request isolation (use NestJS REQUEST scope)

---

### Classical Singleton in TypeScript

```typescript
class DatabasePool {
  private static instance: DatabasePool;
  private pool: Pool;

  private constructor(config: PoolConfig) {
    this.pool = new Pool(config);
  }

  static getInstance(config?: PoolConfig): DatabasePool {
    if (!DatabasePool.instance) {
      if (!config) throw new Error('Config required for first initialization');
      DatabasePool.instance = new DatabasePool(config);
    }
    return DatabasePool.instance;
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async shutdown(): Promise<void> {
    await this.pool.end();
  }
}
```

### Node.js Module Caching as a Natural Singleton

In Node.js, modules are cached after the first `require()` / `import`. This means any object exported from a module is effectively a singleton.

```typescript
// config.ts — this object is created once and reused across all imports
const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
};

export default Object.freeze(config); // Frozen to prevent mutation
```

```typescript
// logger.ts — single Winston instance shared across the app
import { createLogger, transports, format } from 'winston';

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
  ],
});
```

### NestJS Default Singleton Scope

```typescript
// NestJS providers are SINGLETON by default — one instance per module container
@Injectable() // scope: Scope.DEFAULT (singleton)
export class CacheService {
  private readonly cache = new Map<string, { value: any; expiresAt: number }>();

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set(key: string, value: any, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

// If you need per-request state, explicitly opt in:
@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  private userId: string;
  setUserId(id: string) { this.userId = id; }
  getUserId(): string { return this.userId; }
}
```

### Thread Safety in Node.js

Node.js runs on a single thread (event loop), so traditional race conditions between threads do not apply. However, async race conditions can still occur:

```typescript
// Potential async race condition
class LazyConnectionSingleton {
  private connection: Connection | null = null;
  private connecting: Promise<Connection> | null = null;

  async getConnection(): Promise<Connection> {
    if (this.connection) return this.connection;

    // Without the promise guard, two concurrent calls could create two connections
    if (!this.connecting) {
      this.connecting = this.createConnection();
    }

    this.connection = await this.connecting;
    return this.connection;
  }

  private async createConnection(): Promise<Connection> {
    // Expensive async operation
    return DatabaseClient.connect(config);
  }
}
```

**Trade-offs:**
- Singletons with mutable state make unit testing difficult (shared state bleeds between tests).
- Prefer NestJS DI over manual singletons — the container manages the lifecycle and makes testing trivial with `overrideProvider()`.
- If you need testability, inject the singleton via DI rather than importing a module directly.

**Interview Tip:**
> "In Node.js, I rarely write explicit Singleton classes because module caching gives me singletons for free, and NestJS providers are singleton-scoped by default. The key thing is knowing when to break out of singleton scope — for example, using REQUEST scope for per-request state like tenant context in a multi-tenant system."

---

## Q6: Decorator Pattern

**Q: Explain the Decorator pattern. How does it differ from TypeScript decorators?**

**Intent:** Attach additional behavior to an object dynamically without modifying its structure. Decorators provide a flexible alternative to subclassing for extending functionality.

**When to use:**
- Cross-cutting concerns: logging, caching, retry, timing, authorization
- You want to layer behaviors on top of each other
- You prefer composition over inheritance

---

### Structural Decorator Pattern in TypeScript

```typescript
// Component interface
interface HttpClient {
  request<T>(config: RequestConfig): Promise<T>;
}

// Concrete component
class BaseHttpClient implements HttpClient {
  async request<T>(config: RequestConfig): Promise<T> {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
    });
    return response.json() as Promise<T>;
  }
}

// Decorator: Logging
class LoggingHttpClient implements HttpClient {
  constructor(
    private readonly wrapped: HttpClient,
    private readonly logger: Logger,
  ) {}

  async request<T>(config: RequestConfig): Promise<T> {
    this.logger.info(`HTTP ${config.method} ${config.url}`);
    const start = Date.now();
    try {
      const result = await this.wrapped.request<T>(config);
      this.logger.info(`HTTP ${config.method} ${config.url} completed in ${Date.now() - start}ms`);
      return result;
    } catch (error) {
      this.logger.error(`HTTP ${config.method} ${config.url} failed after ${Date.now() - start}ms`, error);
      throw error;
    }
  }
}

// Decorator: Retry
class RetryHttpClient implements HttpClient {
  constructor(
    private readonly wrapped: HttpClient,
    private readonly maxRetries = 3,
    private readonly delayMs = 1000,
  ) {}

  async request<T>(config: RequestConfig): Promise<T> {
    let lastError: Error;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.wrapped.request<T>(config);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.delayMs * attempt));
        }
      }
    }
    throw lastError!;
  }
}

// Decorator: Caching
class CachingHttpClient implements HttpClient {
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();

  constructor(
    private readonly wrapped: HttpClient,
    private readonly ttlSeconds = 60,
  ) {}

  async request<T>(config: RequestConfig): Promise<T> {
    if (config.method !== 'GET') {
      return this.wrapped.request<T>(config);
    }

    const cacheKey = `${config.method}:${config.url}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }

    const result = await this.wrapped.request<T>(config);
    this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + this.ttlSeconds * 1000 });
    return result;
  }
}

// Compose decorators — order matters
const client: HttpClient = new CachingHttpClient(
  new RetryHttpClient(
    new LoggingHttpClient(
      new BaseHttpClient(),
      logger,
    ),
    3,
    1000,
  ),
  300,
);

// client.request() now logs, retries, and caches — all without modifying BaseHttpClient
```

---

### Method Execution Timer Decorator (TypeScript Decorator Syntax)

```typescript
// TypeScript decorator: syntactic sugar, different from the structural pattern
function Timed(label?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const timerLabel = label || `${target.constructor.name}.${propertyKey}`;
      const start = performance.now();
      try {
        const result = await originalMethod.apply(this, args);
        const elapsed = (performance.now() - start).toFixed(2);
        console.log(`[TIMER] ${timerLabel} completed in ${elapsed}ms`);
        return result;
      } catch (error) {
        const elapsed = (performance.now() - start).toFixed(2);
        console.log(`[TIMER] ${timerLabel} failed after ${elapsed}ms`);
        throw error;
      }
    };

    return descriptor;
  };
}

// Usage
class UserService {
  @Timed()
  async findUserById(id: string): Promise<User> {
    return this.userRepository.findOne(id);
  }

  @Timed('heavy-report-generation')
  async generateReport(): Promise<Report> {
    // ...
  }
}
```

---

### NestJS Interceptors as Decorator Pattern

NestJS Interceptors follow the decorator pattern by wrapping the route handler.

```typescript
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = `route:${request.url}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return of(cached); // Return cached response
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.set(cacheKey, response, 60);
      }),
    );
  }
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - start;
        this.logger.log(`${method} ${url} ${elapsed}ms`);
      }),
    );
  }
}

// Stack interceptors — each decorates the handler
@UseInterceptors(LoggingInterceptor, CacheInterceptor)
@Controller('products')
export class ProductController {
  @Get()
  findAll(): Promise<Product[]> {
    return this.productService.findAll();
  }
}
```

**Structural Decorator vs. TypeScript Decorator:**

| Aspect | Structural Decorator (GoF) | TypeScript Decorator (@) |
|--------|---------------------------|-------------------------|
| What it is | A design pattern — wrapping objects | A language feature — metadata + method replacement |
| Applied to | Object instances at runtime | Classes, methods, properties at definition time |
| Composable | Wrap decorators around each other | Stack multiple @ decorators on a class/method |
| Use case | Layered behavior (retry, cache, log) | Metadata (validation), AOP (timing), framework hooks |

**Trade-offs:**
- Too many decorators stacked make debugging harder — call stack becomes deep.
- Structural decorators must implement the full interface, which can be tedious.
- TypeScript decorators are still stage 3 / experimental and have some edge cases.

**Interview Tip:**
> "Decorator is my go-to for cross-cutting concerns. In NestJS, I use interceptors for things like caching and logging, guards for authorization, and pipes for validation. Each follows the Decorator pattern by wrapping the core handler with additional behavior."

---

## Q7: Adapter Pattern

**Q: When would you use the Adapter pattern in a backend system?**

**Intent:** Convert the interface of a class into another interface that clients expect. Adapter lets classes work together that could not otherwise due to incompatible interfaces.

**When to use:**
- Wrapping third-party APIs behind your own interface
- Migrating between providers (e.g., switching from SendGrid to SES)
- Normalizing different data formats into a common internal model
- Writing tests by adapting real services to in-memory implementations

---

### Real-World Example: Email Service Adapters

```typescript
// ---- Your internal interface ----

export interface EmailService {
  sendEmail(options: SendEmailOptions): Promise<EmailResult>;
  sendBulkEmail(options: SendBulkEmailOptions): Promise<EmailResult[]>;
}

export interface SendEmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
}

export interface EmailResult {
  messageId: string;
  accepted: boolean;
}

export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

// ---- Adapter: SendGrid ----

@Injectable()
export class SendGridAdapter implements EmailService {
  private readonly client: SendGridClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new SendGridClient(configService.get('SENDGRID_API_KEY'));
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    // Adapt your interface to SendGrid's API
    const [response] = await this.client.send({
      to: options.to,
      from: options.from,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((a) => ({
        content: a.content.toString('base64'),
        filename: a.filename,
        type: a.mimeType,
        disposition: 'attachment',
      })),
    });

    return {
      messageId: response.headers['x-message-id'],
      accepted: response.statusCode === 202,
    };
  }

  async sendBulkEmail(options: SendBulkEmailOptions): Promise<EmailResult[]> {
    // SendGrid-specific bulk API
    const messages = options.recipients.map((r) => ({
      to: r.email,
      from: options.from,
      subject: options.subject,
      html: options.html,
      substitutions: r.variables,
    }));
    // ...
  }
}

// ---- Adapter: AWS SES ----

@Injectable()
export class AwsSesAdapter implements EmailService {
  private readonly ses: SESClient;

  constructor(private readonly configService: ConfigService) {
    this.ses = new SESClient({
      region: configService.get('AWS_REGION'),
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    // Adapt your interface to AWS SES's very different API
    const command = new SendEmailCommand({
      Source: options.from,
      Destination: { ToAddresses: [options.to] },
      Message: {
        Subject: { Data: options.subject, Charset: 'UTF-8' },
        Body: { Html: { Data: options.html, Charset: 'UTF-8' } },
      },
    });

    const result = await this.ses.send(command);

    return {
      messageId: result.MessageId || '',
      accepted: result.$metadata.httpStatusCode === 200,
    };
  }

  async sendBulkEmail(options: SendBulkEmailOptions): Promise<EmailResult[]> {
    // SES bulk sending via SendBulkTemplatedEmail
    // ...
  }
}

// ---- Adapter: In-memory (for testing) ----

@Injectable()
export class InMemoryEmailAdapter implements EmailService {
  public readonly sentEmails: SendEmailOptions[] = [];

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    this.sentEmails.push(options);
    return { messageId: `test-${Date.now()}`, accepted: true };
  }

  async sendBulkEmail(options: SendBulkEmailOptions): Promise<EmailResult[]> {
    return options.recipients.map((r) => {
      this.sentEmails.push({
        to: r.email,
        from: options.from,
        subject: options.subject,
        html: options.html,
      });
      return { messageId: `test-${Date.now()}`, accepted: true };
    });
  }
}

// ---- Module wiring ----

@Module({
  providers: [
    {
      provide: EMAIL_SERVICE,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get('EMAIL_PROVIDER');
        switch (provider) {
          case 'sendgrid':
            return new SendGridAdapter(configService);
          case 'ses':
            return new AwsSesAdapter(configService);
          default:
            return new InMemoryEmailAdapter();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}

// ---- Consumer does not know or care which provider is used ----

@Injectable()
export class UserService {
  constructor(
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailService,
  ) {}

  async onUserRegistered(user: User): Promise<void> {
    await this.emailService.sendEmail({
      to: user.email,
      from: 'noreply@myapp.com',
      subject: 'Welcome!',
      html: `<h1>Welcome, ${user.name}!</h1>`,
    });
  }
}
```

**Trade-offs:**
- Adds a layer of indirection for each third-party service.
- The common interface must be generic enough for all providers but specific enough to be useful — finding this balance is the hard part.
- If you only ever use one provider and never plan to switch, an adapter is over-engineering.

**Interview Tip:**
> "Every third-party integration in my systems goes behind an adapter. The cost is one extra interface and class per provider. The payoff is that switching from SendGrid to SES was a config change plus a new adapter class — zero changes to any business logic."

---

## Q8: Repository Pattern

**Q: What is the Repository pattern and how do you implement it with NestJS and TypeORM?**

**Intent:** Mediate between the domain and data mapping layers using a collection-like interface for accessing domain objects. The domain layer does not know how or where data is stored.

**When to use:**
- You want to unit-test business logic without a real database
- You might switch databases or ORMs in the future
- You want to centralize query logic and avoid query duplication
- You need to compose repositories with a Unit of Work for transactions

---

### Generic Repository Interface

```typescript
export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(options?: FindOptions): Promise<T[]>;
  findOne(filter: Partial<T>): Promise<T | null>;
  create(entity: Partial<T>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
  count(filter?: Partial<T>): Promise<number>;
}

export interface FindOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### Concrete Implementation with TypeORM

```typescript
// ---- Entity ----

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => OrderEntity, (order) => order.user)
  orders: OrderEntity[];
}

// ---- Repository Interface (domain layer) ----

export interface IUserRepository extends IRepository<UserEntity> {
  findByEmail(email: string): Promise<UserEntity | null>;
  findActiveUsers(options?: FindOptions): Promise<PaginatedResult<UserEntity>>;
  findWithOrders(userId: string): Promise<UserEntity | null>;
  softDelete(userId: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

// ---- Concrete Implementation (infrastructure layer) ----

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOneBy({ id });
  }

  async findAll(options?: FindOptions): Promise<UserEntity[]> {
    const qb = this.repo.createQueryBuilder('user');
    if (options?.orderBy) {
      qb.orderBy(`user.${options.orderBy}`, options.orderDirection || 'ASC');
    }
    if (options?.page && options?.limit) {
      qb.skip((options.page - 1) * options.limit).take(options.limit);
    }
    return qb.getMany();
  }

  async findOne(filter: Partial<UserEntity>): Promise<UserEntity | null> {
    return this.repo.findOneBy(filter as FindOptionsWhere<UserEntity>);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password') // password is excluded by default
      .where('user.email = :email', { email })
      .getOne();
  }

  async findActiveUsers(options?: FindOptions): Promise<PaginatedResult<UserEntity>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await this.repo.findAndCount({
      where: { isActive: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findWithOrders(userId: string): Promise<UserEntity | null> {
    return this.repo.findOne({
      where: { id: userId },
      relations: ['orders'],
    });
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async softDelete(userId: string): Promise<void> {
    await this.repo.update(userId, { isActive: false });
  }

  async count(filter?: Partial<UserEntity>): Promise<number> {
    return this.repo.countBy(filter as FindOptionsWhere<UserEntity>);
  }
}
```

### Unit of Work Pattern Alongside Repository

```typescript
export interface IUnitOfWork {
  readonly userRepository: IUserRepository;
  readonly orderRepository: IOrderRepository;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

@Injectable()
export class TypeOrmUnitOfWork implements IUnitOfWork {
  private queryRunner: QueryRunner;
  private _userRepository: IUserRepository;
  private _orderRepository: IOrderRepository;

  constructor(private readonly dataSource: DataSource) {}

  get userRepository(): IUserRepository {
    if (!this._userRepository) {
      this._userRepository = new TypeOrmUserRepository(
        this.queryRunner.manager.getRepository(UserEntity),
      );
    }
    return this._userRepository;
  }

  get orderRepository(): IOrderRepository {
    if (!this._orderRepository) {
      this._orderRepository = new TypeOrmOrderRepository(
        this.queryRunner.manager.getRepository(OrderEntity),
      );
    }
    return this._orderRepository;
  }

  async begin(): Promise<void> {
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
  }

  async commit(): Promise<void> {
    await this.queryRunner.commitTransaction();
    await this.queryRunner.release();
  }

  async rollback(): Promise<void> {
    await this.queryRunner.rollbackTransaction();
    await this.queryRunner.release();
  }
}

// Usage in a service
@Injectable()
export class OrderService {
  constructor(
    @Inject('UNIT_OF_WORK')
    private readonly uowFactory: () => IUnitOfWork,
  ) {}

  async placeOrder(dto: PlaceOrderDto): Promise<Order> {
    const uow = this.uowFactory();
    await uow.begin();

    try {
      const user = await uow.userRepository.findById(dto.userId);
      if (!user) throw new NotFoundException('User not found');

      const order = await uow.orderRepository.create({
        userId: dto.userId,
        items: dto.items,
        total: dto.total,
        status: OrderStatus.PLACED,
      });

      // Both operations share the same transaction
      await uow.userRepository.update(user.id, {
        lastOrderAt: new Date(),
      });

      await uow.commit();
      return order;
    } catch (error) {
      await uow.rollback();
      throw error;
    }
  }
}
```

### NestJS Module Wiring

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, OrderEntity])],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    {
      provide: 'UNIT_OF_WORK',
      useFactory: (dataSource: DataSource) => {
        return () => new TypeOrmUnitOfWork(dataSource);
      },
      inject: [DataSource],
    },
    UserService,
    OrderService,
  ],
  exports: [USER_REPOSITORY, UserService],
})
export class UserModule {}
```

**Trade-offs:**
- Repository adds abstraction overhead — if you are committed to TypeORM forever, using its repository directly is simpler.
- Generic repositories can become leaky abstractions when you need ORM-specific features.
- The benefit is testability: in tests, swap `TypeOrmUserRepository` with an `InMemoryUserRepository`.

**Interview Tip:**
> "The Repository pattern shines in two scenarios: when I need to test business logic without a database (inject an in-memory repo), and when multiple services share the same query logic. I pair it with Unit of Work for any operation that spans multiple aggregates."

---

## Q9: DTO (Data Transfer Object) Pattern

**Q: Why use DTOs? Why not just pass the entity directly to the API?**

**Intent:** Define separate objects for transferring data across boundaries (API to service, service to database). DTOs decouple internal domain models from external API contracts.

**Why not expose entities directly:**
- Entities may contain sensitive fields (password, internal IDs)
- API changes should not require database schema changes and vice versa
- Validation rules apply at the API boundary, not the domain layer
- Different endpoints may need different shapes of the same data
- Over-fetching: entities may load relations the client does not need

---

### Full Example: User CRUD DTOs in NestJS

```typescript
// ---- Request DTOs ----

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one lowercase, one uppercase, and one number',
  })
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class QueryUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

// ---- Response DTOs ----

export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;

  // No password, no isActive flag, no internal fields

  static fromEntity(entity: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.email = entity.email;
    dto.role = entity.role;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}

export class UserDetailResponseDto extends UserResponseDto {
  orderCount: number;
  lastLoginAt: string | null;

  static fromEntityWithDetails(
    entity: UserEntity,
    orderCount: number,
  ): UserDetailResponseDto {
    const dto = new UserDetailResponseDto();
    Object.assign(dto, UserResponseDto.fromEntity(entity));
    dto.orderCount = orderCount;
    dto.lastLoginAt = entity.lastLoginAt?.toISOString() || null;
    return dto;
  }
}

export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  static of<T>(data: T[], total: number, page: number, limit: number): PaginatedResponseDto<T> {
    const dto = new PaginatedResponseDto<T>();
    dto.data = data;
    dto.meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
    return dto;
  }
}
```

### Using a Mapper Class for Complex Transformations

```typescript
@Injectable()
export class UserMapper {
  toResponseDto(entity: UserEntity): UserResponseDto {
    return UserResponseDto.fromEntity(entity);
  }

  toResponseDtoList(entities: UserEntity[]): UserResponseDto[] {
    return entities.map((e) => this.toResponseDto(e));
  }

  toEntity(dto: CreateUserDto): Partial<UserEntity> {
    return {
      name: dto.name,
      email: dto.email,
      password: dto.password, // will be hashed by service
      role: dto.role || UserRole.USER,
    };
  }

  applyUpdate(entity: UserEntity, dto: UpdateUserDto): UserEntity {
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.email !== undefined) entity.email = dto.email;
    return entity;
  }
}
```

### Controller Using DTOs

```typescript
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userMapper: UserMapper,
  ) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.userService.createUser(dto);
    return this.userMapper.toResponseDto(user);
  }

  @Get()
  async findAll(@Query() query: QueryUsersDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    const result = await this.userService.findUsers(query);
    return PaginatedResponseDto.of(
      this.userMapper.toResponseDtoList(result.data),
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDetailResponseDto> {
    const { user, orderCount } = await this.userService.getUserDetail(id);
    return UserDetailResponseDto.fromEntityWithDetails(user, orderCount);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userService.updateUser(id, dto);
    return this.userMapper.toResponseDto(user);
  }
}
```

**Trade-offs:**
- DTOs add boilerplate — every entity needs request + response DTOs plus mapping code.
- For small/internal APIs, passing entities directly can be acceptable.
- Auto-mapping libraries reduce boilerplate but add magic that can be hard to debug.

**Interview Tip:**
> "I always use DTOs at API boundaries. The mapping takes five minutes to write but prevents accidental password leaks, decouples my API from my schema, and gives me a clean place for validation. The one exception is internal microservice-to-microservice calls where both sides control the contract."

---

## Q10: Unit of Work Pattern

**Q: What is the Unit of Work pattern? How do you implement atomic operations across multiple repositories?**

**Intent:** Track changes to multiple entities during a business transaction and commit or roll back all changes as a single atomic operation. The Unit of Work coordinates the work of multiple repositories and ensures data consistency.

**Problem it solves:**
- Multiple database operations that must succeed or fail together
- Preventing partial writes that leave data in an inconsistent state
- Coordinating changes across multiple tables/entities without scattering transaction logic everywhere

**When to use:**
- Operations that span multiple repositories (e.g., transferring money between accounts)
- Order placement: create order + deduct inventory + create payment record
- Any business operation where "half-done" is worse than "not done at all"

---

### How TypeORM Implements Unit of Work

TypeORM's `EntityManager` and `QueryRunner` are built on the Unit of Work concept. The `QueryRunner` gives you manual control over transactions.

```typescript
// BAD: Separate operations with no atomicity guarantee
@Injectable()
export class TransferService {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly transactionRepo: TransactionRepository,
  ) {}

  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    const fromAccount = await this.accountRepo.findById(fromId);
    const toAccount = await this.accountRepo.findById(toId);

    fromAccount.balance -= amount; // What if the app crashes here?
    await this.accountRepo.save(fromAccount);

    toAccount.balance += amount; // This never executes — money vanishes
    await this.accountRepo.save(toAccount);

    await this.transactionRepo.create({ fromId, toId, amount });
  }
}
```

```typescript
// GOOD: Unit of Work with TypeORM QueryRunner
@Injectable()
export class TransferService {
  constructor(private readonly dataSource: DataSource) {}

  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fromAccount = await queryRunner.manager.findOneOrFail(Account, {
        where: { id: fromId },
        lock: { mode: 'pessimistic_write' }, // Lock row to prevent race conditions
      });
      const toAccount = await queryRunner.manager.findOneOrFail(Account, {
        where: { id: toId },
        lock: { mode: 'pessimistic_write' },
      });

      if (fromAccount.balance < amount) {
        throw new BadRequestException('Insufficient funds');
      }

      fromAccount.balance -= amount;
      toAccount.balance += amount;

      await queryRunner.manager.save(fromAccount);
      await queryRunner.manager.save(toAccount);

      await queryRunner.manager.save(
        queryRunner.manager.create(TransactionRecord, {
          fromAccountId: fromId,
          toAccountId: toId,
          amount,
          type: 'transfer',
        }),
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release(); // Always release the connection
    }
  }
}
```

### Prisma's $transaction as Unit of Work

Prisma provides an interactive transaction API that acts as a Unit of Work.

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async placeOrder(dto: PlaceOrderDto): Promise<Order> {
    // All operations inside $transaction succeed or fail together
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the order
      const order = await tx.order.create({
        data: {
          userId: dto.userId,
          status: 'CONFIRMED',
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: { items: true },
      });

      // 2. Deduct inventory for each item
      for (const item of dto.items) {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
        });

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}`,
          );
          // This throw rolls back EVERYTHING — order creation included
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 3. Create payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: order.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
          status: 'PENDING',
        },
      });

      return order;
    });
  }
}
```

### Reusable Unit of Work Abstraction

For larger codebases, you can create a reusable Unit of Work wrapper.

```typescript
// Generic Unit of Work interface
export interface IUnitOfWork {
  execute<T>(work: (tx: TransactionClient) => Promise<T>): Promise<T>;
}

@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async execute<T>(work: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return work(tx);
    }, {
      maxWait: 5000,     // Max time to wait for a connection from the pool
      timeout: 10000,    // Max time for the transaction to complete
      isolationLevel: 'Serializable', // Strictest isolation
    });
  }
}

// Usage in services
@Injectable()
export class TransferService {
  constructor(
    @Inject('UNIT_OF_WORK')
    private readonly uow: IUnitOfWork,
  ) {}

  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    await this.uow.execute(async (tx) => {
      // All repository operations use the same transaction context
      await this.debit(tx, fromId, amount);
      await this.credit(tx, toId, amount);
      await this.recordTransaction(tx, fromId, toId, amount);
    });
  }
}
```

**Trade-offs:**
- Adds complexity — simple single-table CRUD does not need this.
- Long-running transactions hold locks and can cause contention under high load.
- Transaction isolation levels matter: READ COMMITTED vs SERIALIZABLE have very different performance and correctness guarantees.
- In microservices, database transactions only work within a single database. For cross-service atomicity, you need the Saga pattern instead.

**Interview Tip:**
> "I use the Unit of Work pattern whenever a business operation touches multiple tables that must stay consistent. In NestJS with Prisma, I wrap the logic in $transaction. With TypeORM, I use a QueryRunner. The key insight is that the Unit of Work boundary should match the business operation boundary — not too broad (holding locks too long) and not too narrow (risking partial writes)."

---

## Q11: Circuit Breaker Pattern

**Q: How do you prevent cascade failures when an external dependency goes down?**

**Intent:** Detect when an external service is failing and stop sending requests to it temporarily. This prevents your system from wasting resources on calls that will fail and gives the downstream service time to recover.

**Problem it solves:**
- An external API (payment gateway, email service, third-party data provider) starts timing out
- Without a circuit breaker, every request to your service also hangs or fails
- Thread pools / connection pools get exhausted waiting for the dead dependency
- One failing service cascades into a full system outage

---

### Circuit Breaker States

```
                  Success threshold met
                ┌──────────────────────┐
                │                      v
┌──────────┐  Failure threshold  ┌──────────┐  Timeout expires  ┌───────────┐
│  CLOSED  │ ──────────────────> │   OPEN   │ ────────────────> │ HALF-OPEN │
│ (normal) │                     │ (reject  │                   │ (test one │
│          │ <────────────────── │  all)    │ <──────────────── │  request) │
└──────────┘  Reset on success   └──────────┘   Failure: back   └───────────┘
                                                to OPEN
```

- **CLOSED** (normal): Requests pass through. Failures are counted.
- **OPEN** (tripped): All requests are immediately rejected with a fallback. No calls to the failing service.
- **HALF-OPEN** (testing): After a timeout, allow one test request through. If it succeeds, move to CLOSED. If it fails, go back to OPEN.

### Configuration Parameters

| Parameter | Purpose | Typical Value |
|-----------|---------|---------------|
| `failureThreshold` | Number of failures before opening | 5 |
| `successThreshold` | Successes in half-open before closing | 2 |
| `timeout` | How long to stay OPEN before trying half-open | 30 seconds |
| `resetTimeout` | Window for counting failures | 60 seconds |

---

### Implementation with opossum (Node.js)

```typescript
import CircuitBreaker from 'opossum';

@Injectable()
export class PaymentGatewayService {
  private readonly breaker: CircuitBreaker;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: Logger,
  ) {
    // Wrap the actual HTTP call in a circuit breaker
    this.breaker = new CircuitBreaker(
      (payload: ChargeRequest) => this.callPaymentApi(payload),
      {
        timeout: 5000,           // If the call takes > 5s, count as failure
        errorThresholdPercentage: 50,  // Open if 50% of requests fail
        resetTimeout: 30000,     // Try half-open after 30 seconds
        volumeThreshold: 5,      // Minimum calls before tripping (avoid tripping on 1 failure)
      },
    );

    // Event listeners for monitoring
    this.breaker.on('open', () => {
      this.logger.warn('Circuit breaker OPENED — payment gateway is down');
    });
    this.breaker.on('halfOpen', () => {
      this.logger.log('Circuit breaker HALF-OPEN — testing payment gateway');
    });
    this.breaker.on('close', () => {
      this.logger.log('Circuit breaker CLOSED — payment gateway recovered');
    });
    this.breaker.on('fallback', () => {
      this.logger.warn('Circuit breaker fallback triggered');
    });

    // Provide a fallback when circuit is open
    this.breaker.fallback((payload: ChargeRequest) => {
      return {
        success: false,
        message: 'Payment service temporarily unavailable. Your order has been queued.',
        queued: true,
      };
    });
  }

  async charge(request: ChargeRequest): Promise<ChargeResponse> {
    // fire() routes through the circuit breaker
    return this.breaker.fire(request);
  }

  private async callPaymentApi(payload: ChargeRequest): Promise<ChargeResponse> {
    const { data } = await firstValueFrom(
      this.httpService.post<ChargeResponse>(
        'https://api.payment-gateway.com/charges',
        payload,
        { timeout: 4000 },
      ),
    );
    return data;
  }

  // Expose circuit state for health checks
  getCircuitState(): string {
    return this.breaker.status.toString();
  }
}
```

### Custom Circuit Breaker (Interview Whiteboard Version)

If asked to implement from scratch, here is a minimal version:

```typescript
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // ms to wait before moving from OPEN to HALF_OPEN
}

class CircuitBreaker<T extends (...args: any[]) => Promise<any>> {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;

  constructor(
    private readonly fn: T,
    private readonly options: CircuitBreakerOptions,
  ) {}

  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime! >= this.options.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit is OPEN — request rejected');
      }
    }

    try {
      const result = await this.fn(...args);

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.options.successThreshold) {
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
        }
      } else {
        this.failureCount = 0; // Reset on success in CLOSED state
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (
        this.state === CircuitState.HALF_OPEN ||
        this.failureCount >= this.options.failureThreshold
      ) {
        this.state = CircuitState.OPEN;
      }

      throw error;
    }
  }
}

// Usage
const breaker = new CircuitBreaker(
  (url: string) => fetch(url).then((r) => r.json()),
  { failureThreshold: 3, successThreshold: 2, timeout: 30000 },
);

try {
  const data = await breaker.execute('https://api.example.com/data');
} catch (err) {
  // Either the call failed or the circuit is open
}
```

### NestJS Integration: Circuit Breaker as an Interceptor

```typescript
@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly breakers = new Map<string, CircuitBreaker<any>>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const key = `${context.getClass().name}.${handler.name}`;

    if (!this.breakers.has(key)) {
      this.breakers.set(
        key,
        new CircuitBreaker(async () => firstValueFrom(next.handle()), {
          failureThreshold: 5,
          successThreshold: 2,
          timeout: 30000,
        }),
      );
    }

    return from(this.breakers.get(key)!.execute());
  }
}

// Usage on a controller method
@UseInterceptors(CircuitBreakerInterceptor)
@Get('external-data')
async getExternalData(): Promise<any> {
  return this.externalApiService.fetchData();
}
```

**Trade-offs:**
- Adds latency monitoring overhead (minimal but exists).
- Choosing the right thresholds is tricky — too sensitive and the circuit flaps open/closed; too tolerant and you do not protect the system.
- Fallback logic can be complex (queue for later? return cached data? return a degraded response?).
- Circuit breaker handles transient failures well but does not fix the root cause — you still need alerting and remediation.

**Interview Tip:**
> "I use circuit breakers around every external dependency: payment gateways, email services, third-party APIs. The key parameters are failure threshold, timeout, and fallback strategy. In production, I combine circuit breakers with retry logic (retry first for transient errors, then trip the circuit for sustained failures) and health checks that can manually reset the breaker."

---

## Q12: Middleware, Interceptor, Guard, Pipe — NestJS Request Pipeline

**Q: Walk me through the NestJS request lifecycle. When do you use middleware vs guards vs interceptors vs pipes?**

Understanding the NestJS request pipeline is fundamental to architecting NestJS applications correctly. Each component in the pipeline has a specific purpose.

---

### The Full Request Lifecycle

```
Client Request
      │
      v
┌─────────────────────┐
│     Middleware       │  (Express/Fastify-compatible, runs first)
│  (logging, cors,    │
│   body parsing)     │
└─────────┬───────────┘
          │
          v
┌─────────────────────┐
│       Guards        │  (Authorization: should this user access this route?)
│  (AuthGuard,        │
│   RolesGuard)       │
└─────────┬───────────┘
          │
          v
┌─────────────────────┐
│   Interceptors      │  (Before — transform request, start timer, etc.)
│  (pre-handler)      │
└─────────┬───────────┘
          │
          v
┌─────────────────────┐
│       Pipes         │  (Validation & transformation of parameters)
│  (ValidationPipe,   │
│   ParseIntPipe)     │
└─────────┬───────────┘
          │
          v
┌─────────────────────┐
│   Route Handler     │  (Your controller method)
└─────────┬───────────┘
          │
          v
┌─────────────────────┐
│   Interceptors      │  (After — transform response, cache, log timing)
│  (post-handler)     │
└─────────┬───────────┘
          │
          v
┌─────────────────────┐
│  Exception Filters  │  (Catch and format errors — runs if anything throws)
└─────────┬───────────┘
          │
          v
    Client Response
```

---

### When to Use Each (Decision Tree)

| Component | Purpose | Has Access To | Can Short-Circuit? |
|-----------|---------|---------------|-------------------|
| **Middleware** | Low-level request processing (logging, CORS, body parsing, request ID) | `req`, `res`, `next` (Express API) | Yes (don't call `next()`) |
| **Guard** | Authorization — "should this request be allowed?" | `ExecutionContext` (access to handler metadata, class) | Yes (return `false` or throw) |
| **Interceptor** | Transform request/response, timing, caching, logging | `ExecutionContext` + `CallHandler` (wraps the handler as an Observable) | Yes (return early without calling `next.handle()`) |
| **Pipe** | Validate and transform individual parameters | The parameter value only | Yes (throw `BadRequestException`) |
| **Exception Filter** | Catch and format errors into HTTP responses | The thrown exception | Produces the final error response |

---

### Real-World Example: Complete Pipeline for an Authenticated, Validated, Cached Endpoint

```typescript
// ── MIDDLEWARE: Attach a unique request ID ──
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    req['requestId'] = randomUUID();
    res.setHeader('X-Request-Id', req['requestId']);
    next();
  }
}

// ── GUARD: Check JWT and roles ──
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('Missing token');

    try {
      request.user = this.jwtService.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// ── INTERCEPTOR: Logging + response timing ──
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`${method} ${url} — ${duration}ms`);
      }),
    );
  }
}

// ── INTERCEPTOR: Cache responses ──
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_SERVICE) private readonly cache: ICacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = `cache:${request.url}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return of(cached); // Return cached data — skip handler entirely
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cache.set(cacheKey, response, 300); // Cache for 5 minutes
      }),
    );
  }
}

// ── PIPE: Validate request body (global or per-parameter) ──
// NestJS built-in ValidationPipe handles this with class-validator DTOs

// ── EXCEPTION FILTER: Format all errors consistently ──
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url} ${status}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request['requestId'],
    });
  }
}

// ── PUTTING IT ALL TOGETHER ──
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(LoggingInterceptor)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get(':id')
  @Roles('user', 'admin')
  @UseInterceptors(CacheInterceptor)
  async getProduct(
    @Param('id', ParseUUIDPipe) id: string, // Pipe validates UUID format
  ): Promise<ProductResponseDto> {
    // Pipeline:
    // 1. RequestIdMiddleware → attaches request ID
    // 2. JwtAuthGuard → verifies token
    // 3. RolesGuard → checks user has 'user' or 'admin' role
    // 4. LoggingInterceptor (pre) → starts timer
    // 5. CacheInterceptor → returns cached data or continues
    // 6. ParseUUIDPipe → validates 'id' is a valid UUID
    // 7. Handler executes → calls productService
    // 8. CacheInterceptor (post) → caches the response
    // 9. LoggingInterceptor (post) → logs duration
    // 10. If anything threw: AllExceptionsFilter formats the error
    return this.productService.findById(id);
  }

  @Post()
  @Roles('admin')
  async createProduct(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productService.create(dto);
  }
}

// Module wiring
@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class ProductModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
```

### Custom Parameter Decorator (Bonus)

```typescript
// Extract the authenticated user from the request cleanly
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// Usage
@Get('profile')
async getProfile(@CurrentUser() user: User): Promise<UserResponseDto> {
  return this.userService.findById(user.id);
}

@Get('my-email')
async getEmail(@CurrentUser('email') email: string): Promise<string> {
  return email;
}
```

**Trade-offs:**
- Using the wrong component for the job (e.g., authorization in middleware instead of guards) makes the code harder to maintain and test.
- Global interceptors/guards apply to all routes — be careful with endpoints that should not have them (e.g., health checks).
- Exception filters should be the single source of error formatting — avoid try/catch in controllers that format HTTP responses.

**Interview Tip:**
> "When someone asks me where to put logic in NestJS, I follow this rule: if it is about 'who is making this request,' it is a guard. If it is about 'is this data valid,' it is a pipe. If it is about 'transform the request or response,' it is an interceptor. If it is low-level HTTP plumbing, it is middleware. If it is about handling errors, it is an exception filter. This separation keeps NestJS applications clean and testable."

---

## Q13: CQRS Pattern (Command Query Responsibility Segregation)

**Q: What is CQRS and when would you use it over standard CRUD?**

**Intent:** Separate the read side (queries) from the write side (commands) of your application. Instead of one model that handles both reads and writes, you have two specialized models optimized for their respective tasks.

> See also: Event-Driven Architecture doc (phase-2) for deeper coverage of CQRS with Event Sourcing.

---

### Command vs Query

| Aspect | Command | Query |
|--------|---------|-------|
| **Purpose** | Change state (create, update, delete) | Read state (get, list, search) |
| **Return value** | Typically void or an ID | Data (DTOs, projections) |
| **Side effects** | Yes (writes to DB, emits events) | No (read-only) |
| **Validation** | Business rule validation | Pagination, filtering, sorting |
| **Model** | Domain model (rich entities) | Read model (optimized projections, denormalized views) |

### When CQRS Is Overkill

Most CRUD applications do NOT need CQRS. Use standard repository + service + controller when:
- Read and write shapes are the same or very similar
- Low to moderate traffic
- Simple domain logic
- Small team that does not want extra complexity

### When CQRS Shines

- **High read-to-write ratio:** Read model can be denormalized and cached aggressively (e.g., product catalog).
- **Complex domain:** Write side uses rich domain models; read side uses flat DTOs.
- **Different scaling needs:** Scale reads independently of writes (read replicas, Elasticsearch for search).
- **Event sourcing:** CQRS is almost always paired with event sourcing.
- **Multiple read representations:** The same data needs to be served as a list view, detail view, analytics dashboard, and search result.

---

### NestJS CQRS Module (@nestjs/cqrs)

```typescript
// ── COMMANDS (Write Side) ──

// Command: a simple data object describing the intent
export class PlaceOrderCommand {
  constructor(
    public readonly userId: string,
    public readonly items: { productId: string; quantity: number }[],
    public readonly shippingAddress: string,
  ) {}
}

// Command Handler: executes the business logic
@CommandHandler(PlaceOrderCommand)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly inventoryService: InventoryService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: PlaceOrderCommand): Promise<string> {
    // Validate business rules
    for (const item of command.items) {
      const available = await this.inventoryService.checkStock(item.productId);
      if (available < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.productId}`);
      }
    }

    // Create the order using the write model (rich domain entity)
    const order = Order.create({
      userId: command.userId,
      items: command.items,
      shippingAddress: command.shippingAddress,
    });

    await this.orderRepository.save(order);

    // Publish domain events to update the read side
    this.eventBus.publish(new OrderPlacedEvent(order.id, order.userId, order.total));

    return order.id;
  }
}

// ── EVENTS ──

export class OrderPlacedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly total: number,
  ) {}
}

// Event handler: updates the read model (denormalized view)
@EventsHandler(OrderPlacedEvent)
export class OrderPlacedReadModelUpdater implements IEventHandler<OrderPlacedEvent> {
  constructor(private readonly readDb: ReadDatabaseService) {}

  async handle(event: OrderPlacedEvent): Promise<void> {
    // Update a denormalized read table optimized for queries
    await this.readDb.upsertOrderSummary({
      orderId: event.orderId,
      userId: event.userId,
      total: event.total,
      status: 'PLACED',
      placedAt: new Date(),
    });
  }
}

// ── QUERIES (Read Side) ──

// Query: describes what data is needed
export class GetOrdersByUserQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {}
}

// Query Handler: reads from the optimized read model
@QueryHandler(GetOrdersByUserQuery)
export class GetOrdersByUserHandler
  implements IQueryHandler<GetOrdersByUserQuery>
{
  constructor(private readonly readDb: ReadDatabaseService) {}

  async execute(query: GetOrdersByUserQuery): Promise<OrderSummaryDto[]> {
    // Read from the denormalized view — fast, no joins
    return this.readDb.findOrderSummaries({
      userId: query.userId,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }
}
```

### Controller Using CQRS

```typescript
@Controller('orders')
export class OrderController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async placeOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: PlaceOrderDto,
  ): Promise<{ orderId: string }> {
    // Command — modifies state
    const orderId = await this.commandBus.execute(
      new PlaceOrderCommand(userId, dto.items, dto.shippingAddress),
    );
    return { orderId };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMyOrders(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<OrderSummaryDto[]> {
    // Query — reads state from optimized read model
    return this.queryBus.execute(
      new GetOrdersByUserQuery(userId, page, limit),
    );
  }
}
```

### Module Setup

```typescript
@Module({
  imports: [CqrsModule],
  controllers: [OrderController],
  providers: [
    // Commands
    PlaceOrderHandler,
    // Queries
    GetOrdersByUserHandler,
    // Events
    OrderPlacedReadModelUpdater,
    // Infrastructure
    OrderRepository,
    ReadDatabaseService,
    InventoryService,
  ],
})
export class OrderModule {}
```

**Trade-offs:**
- Significant added complexity (command classes, handler classes, event handlers, read model sync).
- Eventual consistency: the read model may lag behind the write model.
- More classes and files — for a simple CRUD entity, CQRS creates unnecessary indirection.
- Debugging is harder — you need to trace commands through handlers through events through read model updates.

**Interview Tip:**
> "I would not reach for CQRS on day one. I start with a standard service + repository and only introduce CQRS when I see a clear need: either the read and write models are diverging significantly, or I need to scale reads and writes independently, or I am moving toward event sourcing. The NestJS @nestjs/cqrs module makes it straightforward, but the complexity cost is real."

---

## Q14: Clean Architecture / Hexagonal Architecture

**Q: How do you structure a NestJS application for long-term maintainability? What is clean architecture?**

**Intent:** Organize code into layers with a strict dependency rule: inner layers (domain/business logic) never depend on outer layers (frameworks, databases, HTTP). This makes the core business logic testable and framework-independent.

---

### Layers (Inside Out)

```
┌───��─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│   Controllers, DTOs, Middleware, Guards, Interceptors           │
│   (NestJS HTTP / GraphQL / WebSocket)                          │
├─────────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE LAYER                        │
│   TypeORM Repositories, Prisma Client, Redis, HTTP Clients,    │
│   Email Providers, AWS SDK, Message Queues                     │
├─────────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                           │
│   Use Cases / Application Services, Command/Query Handlers,    │
│   Orchestration, DTOs                                          │
├─────────────────────────────────────────────────────────────────┤
│                     DOMAIN LAYER (innermost)                    │
│   Entities, Value Objects, Domain Events, Repository            │
│   Interfaces (Ports), Domain Services, Business Rules           │
└─────────────────────────────────────────────────────────────────┘

Dependency Rule: arrows point INWARD only.
Presentation → Application → Domain ← Infrastructure
Infrastructure implements interfaces defined in Domain.
```

### Ports and Adapters (Hexagonal Architecture)

The "Ports and Adapters" name highlights the key idea:
- **Ports**: Interfaces defined in the domain/application layer (e.g., `IOrderRepository`, `IPaymentGateway`, `IEmailService`).
- **Adapters**: Concrete implementations in the infrastructure layer (e.g., `TypeOrmOrderRepository`, `StripePaymentGateway`, `SesEmailService`).

The domain defines what it needs (ports). Infrastructure provides it (adapters). The domain never imports from infrastructure.

---

### NestJS Modules Mapped to Clean Architecture

```
src/
├── modules/
│   └── order/
│       ├── domain/                     # DOMAIN LAYER
│       │   ├── entities/
│       │   │   ├── order.entity.ts     # Rich domain entity with behavior
│       │   │   └── order-item.vo.ts    # Value object
│       │   ├── events/
│       │   │   └── order-placed.event.ts
│       │   ├── ports/                  # Interfaces (ports)
│       │   │   ├── order.repository.ts # IOrderRepository interface
│       │   │   └── payment.gateway.ts  # IPaymentGateway interface
│       │   └── services/
│       │       └── order-pricing.service.ts  # Pure domain logic
│       │
│       ├── application/                # APPLICATION LAYER
│       │   ├── commands/
│       │   │   ├── place-order.command.ts
│       │   │   └── place-order.handler.ts
│       │   ├── queries/
│       │   │   ├── get-order.query.ts
│       │   │   └── get-order.handler.ts
│       │   └── dtos/
│       │       ├── place-order.dto.ts
│       │       └── order-response.dto.ts
│       │
│       ├── infrastructure/             # INFRASTRUCTURE LAYER
│       │   ├── persistence/
│       │   │   ├── typeorm-order.repository.ts  # Implements IOrderRepository
│       │   │   └── order.schema.ts              # Database schema/entity
│       │   ├── payment/
│       │   │   └── stripe-payment.gateway.ts    # Implements IPaymentGateway
│       │   └── mappers/
│       │       └── order.mapper.ts              # DB entity <-> Domain entity
│       │
│       ├── presentation/               # PRESENTATION LAYER
│       │   └── order.controller.ts
│       │
│       └── order.module.ts             # Wires everything together
```

### Code Example: Order Module as Clean Architecture

```typescript
// ── DOMAIN LAYER ──

// Domain Entity: contains business logic, no framework dependencies
export class Order {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    private _items: OrderItem[],
    private _status: OrderStatus,
    public readonly createdAt: Date,
  ) {}

  static create(props: { userId: string; items: OrderItem[] }): Order {
    if (props.items.length === 0) {
      throw new DomainException('Order must have at least one item');
    }
    return new Order(
      randomUUID(),
      props.userId,
      props.items,
      OrderStatus.PENDING,
      new Date(),
    );
  }

  get total(): number {
    return this._items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }

  get status(): OrderStatus {
    return this._status;
  }

  get items(): ReadonlyArray<OrderItem> {
    return [...this._items];
  }

  confirm(): void {
    if (this._status !== OrderStatus.PENDING) {
      throw new DomainException(`Cannot confirm order in ${this._status} status`);
    }
    this._status = OrderStatus.CONFIRMED;
  }

  cancel(): void {
    if (this._status === OrderStatus.SHIPPED || this._status === OrderStatus.DELIVERED) {
      throw new DomainException(`Cannot cancel order in ${this._status} status`);
    }
    this._status = OrderStatus.CANCELLED;
  }
}

// Value Object
export class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly productName: string,
    public readonly quantity: number,
    public readonly price: number,
  ) {
    if (quantity <= 0) throw new DomainException('Quantity must be positive');
    if (price < 0) throw new DomainException('Price cannot be negative');
  }
}

// Port: Repository Interface (defined in domain, implemented in infrastructure)
export interface IOrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string): Promise<Order[]>;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

// Port: Payment Gateway Interface
export interface IPaymentGateway {
  charge(amount: number, userId: string): Promise<PaymentResult>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
```

```typescript
// ── APPLICATION LAYER ──

// Use Case / Application Service
@Injectable()
export class PlaceOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: PlaceOrderDto): Promise<string> {
    // 1. Create domain entity (validates business rules internally)
    const order = Order.create({
      userId: dto.userId,
      items: dto.items.map(
        (i) => new OrderItem(i.productId, i.productName, i.quantity, i.price),
      ),
    });

    // 2. Charge payment through the port
    const paymentResult = await this.paymentGateway.charge(
      order.total,
      order.userId,
    );
    if (!paymentResult.success) {
      throw new BadRequestException('Payment failed: ' + paymentResult.error);
    }

    // 3. Confirm the order (domain state transition)
    order.confirm();

    // 4. Persist through the port
    await this.orderRepository.save(order);

    // 5. Publish domain event
    this.eventEmitter.emit('order.placed', {
      orderId: order.id,
      userId: order.userId,
      total: order.total,
    });

    return order.id;
  }
}
```

```typescript
// ── INFRASTRUCTURE LAYER ──

// Adapter: TypeORM implementation of IOrderRepository
@Injectable()
export class TypeOrmOrderRepository implements IOrderRepository {
  constructor(
    @InjectRepository(OrderSchema)
    private readonly repo: Repository<OrderSchema>,
    private readonly mapper: OrderMapper,
  ) {}

  async save(order: Order): Promise<void> {
    const schema = this.mapper.toSchema(order);
    await this.repo.save(schema);
  }

  async findById(id: string): Promise<Order | null> {
    const schema = await this.repo.findOne({
      where: { id },
      relations: ['items'],
    });
    return schema ? this.mapper.toDomain(schema) : null;
  }

  async findByUserId(userId: string): Promise<Order[]> {
    const schemas = await this.repo.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
    return schemas.map((s) => this.mapper.toDomain(s));
  }
}

// Adapter: Stripe implementation of IPaymentGateway
@Injectable()
export class StripePaymentGateway implements IPaymentGateway {
  constructor(private readonly configService: ConfigService) {}

  async charge(amount: number, userId: string): Promise<PaymentResult> {
    try {
      const stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'));
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses cents
        currency: 'usd',
        metadata: { userId },
      });
      return { success: true, transactionId: intent.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Mapper: converts between domain entity and database schema
@Injectable()
export class OrderMapper {
  toDomain(schema: OrderSchema): Order {
    return Order.reconstruct({
      id: schema.id,
      userId: schema.userId,
      items: schema.items.map(
        (i) => new OrderItem(i.productId, i.productName, i.quantity, i.price),
      ),
      status: schema.status as OrderStatus,
      createdAt: schema.createdAt,
    });
  }

  toSchema(domain: Order): OrderSchema {
    const schema = new OrderSchema();
    schema.id = domain.id;
    schema.userId = domain.userId;
    schema.status = domain.status;
    schema.createdAt = domain.createdAt;
    schema.items = domain.items.map((item) => {
      const itemSchema = new OrderItemSchema();
      itemSchema.productId = item.productId;
      itemSchema.productName = item.productName;
      itemSchema.quantity = item.quantity;
      itemSchema.price = item.price;
      return itemSchema;
    });
    return schema;
  }
}
```

```typescript
// ── PRESENTATION LAYER ──

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private readonly placeOrderUseCase: PlaceOrderUseCase,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  @Post()
  async placeOrder(
    @CurrentUser('id') userId: string,
    @Body(ValidationPipe) dto: PlaceOrderDto,
  ): Promise<{ orderId: string }> {
    const orderId = await this.placeOrderUseCase.execute({
      ...dto,
      userId,
    });
    return { orderId };
  }

  @Get()
  async getMyOrders(
    @CurrentUser('id') userId: string,
  ): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.findByUserId(userId);
    return orders.map(OrderResponseDto.fromDomain);
  }
}
```

```typescript
// ── MODULE: Wires ports to adapters ──

@Module({
  imports: [TypeOrmModule.forFeature([OrderSchema, OrderItemSchema])],
  controllers: [OrderController],
  providers: [
    PlaceOrderUseCase,
    OrderMapper,
    // Port -> Adapter binding
    {
      provide: ORDER_REPOSITORY,
      useClass: TypeOrmOrderRepository,
    },
    {
      provide: PAYMENT_GATEWAY,
      useClass: StripePaymentGateway,
    },
  ],
})
export class OrderModule {}
```

### How NestJS Uses Adapters Itself

NestJS itself follows the adapter pattern at the framework level:

```typescript
// NestJS can run on Express or Fastify — same application code, different adapter
const app = await NestFactory.create(AppModule); // Express by default

// Or with Fastify:
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
);

// Your controllers, services, guards, interceptors do not change.
// The HTTP adapter is swappable — that is the Adapter pattern.
```

### When to Use Clean Architecture vs Simpler Approaches

| Scenario | Recommended Approach |
|----------|---------------------|
| Simple CRUD API, 1-5 entities, small team | Standard NestJS (controller -> service -> repository). No layers needed. |
| Medium complexity, 10-20 entities, growing team | Separate DTOs from entities, use repository interfaces for testability. Partial clean architecture. |
| Complex domain, multiple integrations, large team | Full clean architecture with domain layer, ports/adapters, use cases. |
| Microservice that mostly proxies calls | Keep it flat and simple — over-structuring a thin service wastes effort. |

**Trade-offs:**
- Clean architecture adds significant boilerplate (mapper classes, port interfaces, separate domain entities from ORM entities).
- For a 5-endpoint CRUD API, clean architecture is massive over-engineering.
- The value shows up in long-lived, complex applications where business logic changes frequently and infrastructure can be swapped.
- Requires discipline: the team must agree on the dependency rule and enforce it (linting rules, code review).

**Interview Tip:**
> "I do not start with clean architecture. I start with a standard NestJS module and let the complexity grow naturally. When I notice that my service is doing too much, that I cannot test business logic without a database, or that I need to swap an infrastructure component, I start extracting layers. The key rule is: the domain layer should have zero imports from NestJS, TypeORM, or any framework. If I can run my domain tests with just `jest` and no database, I know the architecture is clean."

---

## Quick Reference: Pattern Selection Cheat Sheet

### "I need to..." Decision Guide

| I need to... | Use this pattern |
|--------------|-----------------|
| Vary behavior at runtime without if/else chains | **Strategy** |
| Create objects without specifying the exact class | **Factory** |
| Ensure only one instance of a resource | **Singleton** (NestJS default scope) |
| Add behavior without modifying existing code | **Decorator** |
| Notify multiple components when something happens | **Observer / Event Emitter** |
| Make incompatible interfaces work together | **Adapter** |
| Abstract data access from business logic | **Repository** |
| Separate API shape from domain/database shape | **DTO** |
| Commit multiple changes as one atomic operation | **Unit of Work** |
| Prevent cascade failures from a failing dependency | **Circuit Breaker** |
| Separate read and write models for different scaling needs | **CQRS** |
| Isolate business logic from frameworks and databases | **Clean / Hexagonal Architecture** |
| Process requests through a pipeline of handlers | **Chain of Responsibility** (NestJS middleware, guards, pipes) |

### SOLID Violations Cheat Sheet

| Violation | Symptom | Fix |
|-----------|---------|-----|
| **SRP violation** | Class has 20+ methods, touches DB and sends emails | Split into focused services |
| **OCP violation** | Adding a feature means modifying existing switch/if-else | Strategy or Factory pattern |
| **LSP violation** | Subclass throws `NotImplementedException` for inherited methods | Redesign the hierarchy |
| **ISP violation** | Class implements an interface but leaves half the methods empty | Split the interface |
| **DIP violation** | Service directly instantiates `new StripeClient()` | Inject via interface + DI |

### NestJS Patterns Mapping Table

| NestJS Concept | Design Pattern |
|----------------|---------------|
| `@Injectable()` service with default scope | Singleton |
| `@Injectable({ scope: Scope.REQUEST })` | Per-request instance |
| Module `providers` with `useFactory` | Factory |
| Constructor injection | Dependency Inversion / DI |
| `@UseGuards()`, `@UseInterceptors()` | Chain of Responsibility |
| Custom decorators (`@Cacheable()`, `@LogExecutionTime()`) | Decorator |
| `EventEmitter2` with `@OnEvent()` | Observer / Pub-Sub |
| `NestFactory.create(AppModule, new FastifyAdapter())` | Adapter |
| `TypeOrmModule.forFeature()` / custom repos | Repository |
| DTOs with `class-validator` | DTO |
| `@nestjs/cqrs` CommandBus / QueryBus | CQRS |

### Common Interview Questions About Design Patterns

1. **"Tell me about a time you refactored code using design patterns."** -- Have a real story ready. Describe the pain, the pattern you chose, and the measurable improvement.
2. **"What is the difference between Strategy and Factory?"** -- Strategy varies *behavior*. Factory varies *object creation*. Strategy is about "how to do it." Factory is about "what to create."
3. **"How does NestJS implement DI?"** -- It uses a container that reads `@Injectable()` metadata, resolves the dependency graph at startup, and provides singleton instances by default.
4. **"When would you NOT use a pattern?"** -- When the problem is simple enough that a plain function or if/else solves it. Patterns exist to manage complexity, not to create it.
5. **"What is the difference between Observer and Pub/Sub?"** -- Observer is direct: the subject knows its observers. Pub/Sub uses a broker/channel: publishers and subscribers do not know each other.
6. **"How do you handle transactions across multiple repositories?"** -- Unit of Work pattern. In TypeORM, use a QueryRunner. In Prisma, use $transaction. In microservices, use the Saga pattern.
7. **"How do you prevent one failing microservice from taking down your whole system?"** -- Circuit Breaker pattern with fallback logic, retry with exponential backoff, and bulkhead isolation.

---

## Study Strategy

1. **Do not memorize** -- understand the problem each pattern solves.
2. **Have one real story** for each pattern: "In project X, we had problem Y, so we applied pattern Z, and the result was W."
3. **Code it from scratch** at least once -- interviewers can tell if you have only read about it.
4. **Know when NOT to use it** -- this separates senior from mid-level answers.
5. **Connect patterns to SOLID** -- every pattern maps to one or more principles.
6. **Practice explaining in 60 seconds** -- whiteboard time is limited.
