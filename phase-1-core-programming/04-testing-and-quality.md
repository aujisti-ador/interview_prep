# Testing & Quality — Interview Preparation Guide

> **Focus:** TypeScript, Node.js, NestJS | **Level:** Senior / Lead Backend Engineer

## Table of Contents
1. [Q1: Testing Pyramid and Testing Strategy](#q1-testing-pyramid-and-testing-strategy)
2. [Q2: Unit Testing with Jest](#q2-unit-testing-with-jest)
3. [Q3: Test Doubles — Mocks, Stubs, Spies, Fakes](#q3-test-doubles--mocks-stubs-spies-fakes)
4. [Q4: Testing NestJS Applications](#q4-testing-nestjs-applications)
5. [Q5: Integration Testing](#q5-integration-testing)
6. [Q6: E2E Testing Basics](#q6-e2e-testing-basics)
7. [Q7: TDD (Test-Driven Development)](#q7-tdd-test-driven-development)
8. [Q8: Code Coverage](#q8-code-coverage)
9. [Q9: Testing Async Code and Event-Driven Systems](#q9-testing-async-code-and-event-driven-systems)
10. [Q10: Testing Best Practices for Senior Engineers](#q10-testing-best-practices-for-senior-engineers)
11. [Q11: Testing Database Interactions](#q11-testing-database-interactions)
12. [Q12: Code Quality Tools](#q12-code-quality-tools)
13. [Q13: Testing Strategies for Senior/Lead Roles](#q13-testing-strategies-for-seniorlead-roles)
14. [Quick Reference](#quick-reference)
15. [Summary](#summary-what-to-know-for-interviews)

---

## Q1: Testing Pyramid and Testing Strategy

**Q: Explain the testing pyramid and how you would design a testing strategy for a new microservice.**

**A:**

The testing pyramid is a model that guides how many tests you should write at each level of granularity. From bottom to top:

### The Classic Testing Pyramid

```
        /  E2E   \        ← Few (slow, expensive, brittle)
       / Integration\     ← Moderate (medium speed, real dependencies)
      /    Unit Tests \   ← Many (fast, isolated, cheap)
     /__________________\
```

| Level       | Speed   | Cost  | Confidence in Real Behavior | Typical Ratio |
|-------------|---------|-------|-----------------------------|---------------|
| Unit        | Fast    | Low   | Low-Medium                  | ~70%          |
| Integration | Medium  | Medium| High                        | ~20%          |
| E2E         | Slow    | High  | Very High                   | ~10%          |

### Testing Trophy (Kent C. Dodds)

Kent C. Dodds proposed the "testing trophy" as an alternative, emphasizing integration tests over unit tests:

```
        /   E2E    \        ← Few
       /  Integration \     ← MOST tests here
      /   Unit Tests   \   ← Some
     / Static Analysis  \  ← Linting, TypeScript compiler
     \__________________/
```

The argument: integration tests give you the most confidence per line of test code because they test how things actually work together, not just in isolation.

### Designing a Testing Strategy for a New Microservice

When asked this in an interview, structure your answer around these layers:

**1. Static Analysis (TypeScript + ESLint)**
- TypeScript strict mode catches type errors at compile time.
- ESLint catches common bugs and enforces style.
- This is your cheapest safety net.

**2. Unit Tests (~60-70% of tests)**
- Pure business logic functions.
- Service methods with mocked dependencies.
- Utility/helper functions.
- Input validation logic.

**3. Integration Tests (~20-25% of tests)**
- API endpoint tests with Supertest.
- Database queries against a real (test) database.
- Tests that wire together multiple services.
- Message queue producer/consumer flows.

**4. E2E Tests (~5-10% of tests)**
- Critical user flows (registration, payment, etc.).
- Cross-service communication.
- Contract tests between services.

**5. Non-functional Tests (added as needed)**
- Load/performance tests for key endpoints.
- Security scanning (OWASP ZAP, Snyk).
- Chaos engineering for resilience.

### Example: Microservice Testing Plan

```typescript
// For an Order Service microservice, here is how I would distribute tests:

// UNIT (~70%)
// - OrderService.calculateTotal()
// - OrderService.applyDiscount()
// - OrderValidator.validate()
// - PriceCalculator.computeTax()
// - All DTOs and value objects

// INTEGRATION (~20%)
// - POST /orders → creates order in DB, returns 201
// - GET /orders/:id → returns order from DB
// - OrderService + OrderRepository together against test DB
// - Kafka producer sends OrderCreated event

// E2E (~10%)
// - Full order flow: create → pay → confirm → ship
// - Contract test with Payment Service (Pact)
// - Contract test with Inventory Service (Pact)
```

### Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| Heavy unit testing | Fast CI, easy to debug | False confidence; mocks can lie |
| Heavy integration testing | High confidence, tests real wiring | Slower, harder setup |
| Heavy E2E testing | Tests real behavior | Slow, flaky, hard to debug |

### What Senior/Lead Engineers Look For

- Tests are part of the Definition of Done, not an afterthought.
- The strategy is documented and the team agrees on it.
- Tests run in CI on every PR; failures block merge.
- Coverage targets are meaningful, not just a number.
- Flaky tests are treated as bugs and fixed immediately.

> **Interview Tip:** When asked "How would you design a testing strategy?", start with the business context. Say something like: "First, I would identify the critical paths — what absolutely cannot break. Those get the heaviest coverage. Then I would allocate tests across the pyramid based on the nature of the service. A service with complex business logic gets more unit tests. A service that is mostly CRUD and integrations gets more integration tests."

> **Common Follow-up:** "How do you handle testing in a microservices architecture?" Answer: contract testing (Pact), shared test fixtures for common data models, and independent test databases per service.

### Chaos Engineering Basics (Lead/Architecture Level)

**Q: What is Chaos Engineering and how would you implement it for resilience testing?**

**A:**
Chaos Engineering is the discipline of experimenting on a system in production (or a production-like staging environment) in order to build confidence in the system's capability to withstand turbulent conditions in unexpected failures.

As a Lead Engineer, integrating Chaos Engineering proves your architecture is resilient.

**Key Concepts:**
1. **Define the Steady State:** What does "healthy" look like? (e.g., 99% HTTP 200 responses, < 200ms latency).
2. **Formulate a Hypothesis:** "If the primary database goes down, the system will automatically failover to the replica within 10 seconds without dropping more than 50 requests."
3. **Inject Faults:** Introduce real-world failures.
   - Kill node processes randomly (Chaos Monkey).
   - Inject network latency between microservices (e.g., add 500ms delay to Redis calls).
   - Simulate database connection limits or CPU exhaustion.
4. **Observe & Automate:** Did the system recover as expected? Automate these tests in CI/CD pipelines.

**Practical Implementation in Node.js/NestJS:**
- **Failure Injection Middleware:** You can create chaos middleware that randomly drops requests or adds latency based on a configuration flag.
```typescript
@Injectable()
export class ChaosMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.ENABLE_CHAOS !== 'true') return next();
    
    const random = Math.random();
    if (random < 0.05) { // 5% chance to drop request
      return res.status(503).json({ error: 'Chaos: Service Unavailable' });
    }
    if (random < 0.15) { // 10% chance to add 2s latency
      return setTimeout(() => next(), 2000);
    }
    
    next();
  }
}
```
- **Tools:** Use tools like Gremlin, AWS Fault Injection Simulator (FIS), or Toxiproxy to simulate network partitions at the infrastructure level.

---

## Q2: Unit Testing with Jest

**Q: Walk me through how you set up and write unit tests with Jest in a TypeScript/Node.js project.**

**A:**

### Jest Setup for TypeScript

```bash
npm install --save-dev jest ts-jest @types/jest
```

**jest.config.ts:**
```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default config;
```

### describe / it / expect Patterns

```typescript
// price-calculator.ts
export class PriceCalculator {
  calculateTotal(items: { price: number; quantity: number }[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  applyDiscount(total: number, discountPercent: number): number {
    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error('Discount must be between 0 and 100');
    }
    return total * (1 - discountPercent / 100);
  }
}
```

```typescript
// price-calculator.spec.ts
import { PriceCalculator } from './price-calculator';

describe('PriceCalculator', () => {
  let calculator: PriceCalculator;

  beforeEach(() => {
    // Fresh instance for each test — test isolation
    calculator = new PriceCalculator();
  });

  describe('calculateTotal', () => {
    it('should return 0 for an empty array', () => {
      expect(calculator.calculateTotal([])).toBe(0);
    });

    it('should calculate total for a single item', () => {
      const items = [{ price: 10, quantity: 2 }];
      expect(calculator.calculateTotal(items)).toBe(20);
    });

    it('should calculate total for multiple items', () => {
      const items = [
        { price: 10, quantity: 2 },
        { price: 5, quantity: 3 },
      ];
      expect(calculator.calculateTotal(items)).toBe(35);
    });

    it('should handle decimal prices correctly', () => {
      const items = [{ price: 19.99, quantity: 1 }];
      expect(calculator.calculateTotal(items)).toBeCloseTo(19.99);
    });
  });

  describe('applyDiscount', () => {
    it('should apply a 10% discount', () => {
      expect(calculator.applyDiscount(100, 10)).toBe(90);
    });

    it('should return full price for 0% discount', () => {
      expect(calculator.applyDiscount(100, 0)).toBe(100);
    });

    it('should return 0 for 100% discount', () => {
      expect(calculator.applyDiscount(100, 100)).toBe(0);
    });

    it('should throw for negative discount', () => {
      expect(() => calculator.applyDiscount(100, -5)).toThrow(
        'Discount must be between 0 and 100',
      );
    });

    it('should throw for discount over 100', () => {
      expect(() => calculator.applyDiscount(100, 150)).toThrow(
        'Discount must be between 0 and 100',
      );
    });
  });
});
```

### Lifecycle Hooks

```typescript
describe('DatabaseService', () => {
  // Runs ONCE before all tests in this describe block
  beforeAll(async () => {
    await connectToTestDatabase();
  });

  // Runs ONCE after all tests in this describe block
  afterAll(async () => {
    await disconnectFromTestDatabase();
  });

  // Runs before EACH test — great for resetting state
  beforeEach(async () => {
    await clearTestData();
    await seedTestData();
  });

  // Runs after EACH test — great for cleanup
  afterEach(() => {
    jest.restoreAllMocks(); // Restore all spies/mocks
  });

  it('should query users', async () => {
    // test code here
  });
});
```

### Key Jest Matchers

```typescript
// Equality
expect(value).toBe(primitive);              // === strict equality (primitives)
expect(value).toEqual(object);              // Deep equality (objects/arrays)
expect(value).toStrictEqual(object);        // Deep equality + checks undefined props

// Partial matching
expect(obj).toMatchObject({ name: 'Fazle' }); // Object contains these keys
expect(arr).toContain(item);                   // Array includes item
expect(arr).toContainEqual({ id: 1 });         // Array includes object matching

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(num).toBeGreaterThan(3);
expect(num).toBeGreaterThanOrEqual(3);
expect(num).toBeLessThan(5);
expect(num).toBeCloseTo(0.3, 5); // floating point

// Strings
expect(str).toMatch(/regex/);
expect(str).toContain('substring');

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('specific message');
expect(() => fn()).toThrow(CustomError);

// Asymmetric matchers (powerful for partial matching)
expect(user).toEqual(
  expect.objectContaining({
    email: expect.stringContaining('@'),
    id: expect.any(String),
    roles: expect.arrayContaining(['admin']),
  }),
);
```

### Async Testing

```typescript
// Testing promises with async/await (preferred)
it('should fetch user by id', async () => {
  const user = await userService.findById('123');
  expect(user).toMatchObject({ id: '123', name: 'Fazle' });
});

// Testing that an async function rejects
it('should throw if user not found', async () => {
  await expect(userService.findById('nonexistent')).rejects.toThrow(
    'User not found',
  );
});

// Testing that an async function resolves to a value
it('should resolve with user data', async () => {
  await expect(userService.findById('123')).resolves.toMatchObject({
    id: '123',
  });
});

// done callback (legacy pattern — avoid unless necessary)
it('should emit event', (done) => {
  emitter.on('user.created', (data) => {
    expect(data.id).toBe('123');
    done(); // Signal that the async test is complete
  });
  emitter.emit('user.created', { id: '123' });
});
```

### Testing a Service Class

```typescript
// user.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new Error('User with this email already exists');
    }
    return this.userRepository.save({ ...dto, createdAt: new Date() });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }
}
```

```typescript
// user.service.spec.ts
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // Create a mock repository with jest.fn() for each method
    repository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
    } as any;

    service = new UserService(repository);
  });

  describe('create', () => {
    const createDto = { email: 'fazle@example.com', name: 'Fazle' };

    it('should create a new user when email is not taken', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.save.mockResolvedValue({ id: '1', ...createDto, createdAt: new Date() });

      const result = await service.create(createDto);

      expect(repository.findByEmail).toHaveBeenCalledWith('fazle@example.com');
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'fazle@example.com',
          name: 'Fazle',
          createdAt: expect.any(Date),
        }),
      );
      expect(result).toMatchObject({ id: '1', email: 'fazle@example.com' });
    });

    it('should throw if email already exists', async () => {
      repository.findByEmail.mockResolvedValue({ id: '2', ...createDto } as any);

      await expect(service.create(createDto)).rejects.toThrow(
        'User with this email already exists',
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const user = { id: '1', email: 'fazle@example.com', name: 'Fazle' };
      repository.findById.mockResolvedValue(user as any);

      const result = await service.findById('1');

      expect(result).toEqual(user);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

> **Interview Tip:** Interviewers want to see that you test both the happy path and edge cases. Always test: success case, error case, boundary values, and null/empty inputs. Name your tests clearly so they serve as documentation.

> **Common Follow-up:** "How do you decide what to unit test vs integration test?" Answer: If the logic is pure computation or business rules, unit test it. If it involves wiring multiple components together or hitting real I/O, that belongs in integration tests.

---

## Q3: Test Doubles — Mocks, Stubs, Spies, Fakes

**Q: Explain the differences between mocks, stubs, spies, and fakes. When do you use each?**

**A:**

### Definitions

| Type | Purpose | Verifies Behavior? | Returns Data? |
|------|---------|-------------------|---------------|
| **Stub** | Returns predetermined data. Replaces a dependency so the test can proceed. | No | Yes |
| **Mock** | Pre-programmed with expectations. Verifies that it was called correctly. | Yes | Optionally |
| **Spy** | Wraps the real implementation, recording calls. The real code still runs (unless overridden). | Yes | Uses real return |
| **Fake** | A simplified but working implementation (e.g., in-memory database). | No | Yes (real-ish) |

### jest.fn() — Creating Mocks and Stubs

```typescript
// A simple mock function (starts as a no-op that returns undefined)
const mockFn = jest.fn();
mockFn('hello');
expect(mockFn).toHaveBeenCalledWith('hello');
expect(mockFn).toHaveBeenCalledTimes(1);

// A stub: returns predetermined data
const getUser = jest.fn().mockResolvedValue({ id: '1', name: 'Fazle' });
const user = await getUser('1');
expect(user.name).toBe('Fazle');

// Mock with different return values per call
const fetchPage = jest.fn()
  .mockResolvedValueOnce({ data: [1, 2, 3], hasMore: true })
  .mockResolvedValueOnce({ data: [4, 5], hasMore: false });

// Mock implementation
const calculateTax = jest.fn().mockImplementation((amount: number) => {
  return amount * 0.1;
});
```

### jest.spyOn() — Spying on Real Methods

```typescript
import { EmailService } from './email.service';

describe('OrderService', () => {
  it('should send confirmation email after order is placed', async () => {
    const emailService = new EmailService();

    // Spy on the real method — you can still call through or mock the return
    const sendSpy = jest.spyOn(emailService, 'sendConfirmation')
      .mockResolvedValue(undefined); // Prevent actual email sending

    const orderService = new OrderService(emailService);
    await orderService.placeOrder({ productId: '1', quantity: 2 });

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ productId: '1' }),
    );

    sendSpy.mockRestore(); // Important: restore original implementation
  });
});

// Spying on a module-level function
import * as utils from './utils';

it('should call formatCurrency', () => {
  const spy = jest.spyOn(utils, 'formatCurrency');
  // ... run code that uses formatCurrency
  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});
```

### jest.mock() — Mocking Entire Modules

```typescript
// Automatically mock all exports of a module
jest.mock('./email.service');

import { EmailService } from './email.service';
// Now EmailService is auto-mocked: all methods return undefined

// Manual mock with specific implementations
jest.mock('./email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendConfirmation: jest.fn().mockResolvedValue({ messageId: 'abc' }),
    sendPasswordReset: jest.fn().mockResolvedValue({ messageId: 'def' }),
  })),
}));

// Mocking a third-party module
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

it('should fetch data from external API', async () => {
  mockedAxios.get.mockResolvedValue({
    data: { users: [{ id: '1', name: 'Fazle' }] },
  });

  const result = await externalApiService.getUsers();

  expect(mockedAxios.get).toHaveBeenCalledWith('https://api.example.com/users');
  expect(result).toHaveLength(1);
});
```

### Fakes — Simplified Implementations

```typescript
// Fake in-memory repository (useful for service-level tests)
class FakeUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find(u => u.email === email) || null;
  }

  async save(user: Partial<User>): Promise<User> {
    const id = user.id || crypto.randomUUID();
    const newUser = { ...user, id } as User;
    this.users.set(id, newUser);
    return newUser;
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  // Helper for tests
  clear(): void {
    this.users.clear();
  }
}

// Usage in tests
describe('UserService with FakeRepository', () => {
  let service: UserService;
  let fakeRepo: FakeUserRepository;

  beforeEach(() => {
    fakeRepo = new FakeUserRepository();
    service = new UserService(fakeRepo);
  });

  it('should create and retrieve a user', async () => {
    const created = await service.create({ email: 'test@example.com', name: 'Test' });
    const found = await service.findById(created.id);
    expect(found).toEqual(created);
  });
});
```

### When to Use Each

| Scenario | Best Double |
|----------|-------------|
| Need to control what a dependency returns | **Stub** (`jest.fn().mockReturnValue()`) |
| Need to verify a dependency was called correctly | **Mock** (`jest.fn()` + `expect().toHaveBeenCalled()`) |
| Want to observe calls but keep real behavior | **Spy** (`jest.spyOn()`) |
| Need a working but simplified dependency | **Fake** (in-memory implementation) |
| Testing interaction with external API | **Mock** the HTTP client |
| Testing complex workflows with a database | **Fake** repository or test container |

### Code Example: Mocking Database and External API

```typescript
// order.service.ts
@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly inventoryService: InventoryService,
    private readonly eventBus: EventBus,
  ) {}

  async placeOrder(dto: CreateOrderDto): Promise<Order> {
    // Check inventory
    const available = await this.inventoryService.checkStock(dto.productId, dto.quantity);
    if (!available) {
      throw new BadRequestException('Insufficient stock');
    }

    // Process payment
    const payment = await this.paymentGateway.charge(dto.amount, dto.paymentMethod);
    if (!payment.success) {
      throw new BadRequestException('Payment failed');
    }

    // Save order
    const order = await this.orderRepo.save({
      ...dto,
      status: 'confirmed',
      paymentId: payment.id,
    });

    // Emit event
    await this.eventBus.publish('order.placed', { orderId: order.id });

    return order;
  }
}
```

```typescript
// order.service.spec.ts
describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: jest.Mocked<OrderRepository>;
  let paymentGateway: jest.Mocked<PaymentGateway>;
  let inventoryService: jest.Mocked<InventoryService>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    orderRepo = { save: jest.fn(), findById: jest.fn() } as any;
    paymentGateway = { charge: jest.fn() } as any;
    inventoryService = { checkStock: jest.fn() } as any;
    eventBus = { publish: jest.fn() } as any;

    service = new OrderService(orderRepo, paymentGateway, inventoryService, eventBus);
  });

  describe('placeOrder', () => {
    const dto: CreateOrderDto = {
      productId: 'prod-1',
      quantity: 2,
      amount: 5000,
      paymentMethod: 'card_xxx',
    };

    it('should place order successfully', async () => {
      // Arrange — stubs
      inventoryService.checkStock.mockResolvedValue(true);
      paymentGateway.charge.mockResolvedValue({ success: true, id: 'pay-1' });
      orderRepo.save.mockResolvedValue({ id: 'ord-1', ...dto, status: 'confirmed', paymentId: 'pay-1' } as any);
      eventBus.publish.mockResolvedValue(undefined);

      // Act
      const result = await service.placeOrder(dto);

      // Assert — mock verifications
      expect(inventoryService.checkStock).toHaveBeenCalledWith('prod-1', 2);
      expect(paymentGateway.charge).toHaveBeenCalledWith(5000, 'card_xxx');
      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'confirmed', paymentId: 'pay-1' }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith('order.placed', { orderId: 'ord-1' });
      expect(result.status).toBe('confirmed');
    });

    it('should throw when stock is insufficient', async () => {
      inventoryService.checkStock.mockResolvedValue(false);

      await expect(service.placeOrder(dto)).rejects.toThrow('Insufficient stock');
      expect(paymentGateway.charge).not.toHaveBeenCalled();
      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('should throw when payment fails', async () => {
      inventoryService.checkStock.mockResolvedValue(true);
      paymentGateway.charge.mockResolvedValue({ success: false, id: null });

      await expect(service.placeOrder(dto)).rejects.toThrow('Payment failed');
      expect(orderRepo.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
```

> **Interview Tip:** When discussing test doubles, always mention that over-mocking is a code smell. If you need to mock ten things to test one function, the function probably has too many responsibilities. This shows architectural thinking.

> **Common Follow-up:** "What is the danger of mocking too much?" Answer: Mocks can pass even when the real integration is broken. You are testing your assumptions about the dependency, not the dependency itself. This is why integration tests are essential.

---

## Q4: Testing NestJS Applications

**Q: How do you test NestJS applications? Walk through testing controllers, services, and other components.**

**A:**

NestJS provides `@nestjs/testing` with `Test.createTestingModule()` which mirrors the real dependency injection container, making it easy to swap real providers with test doubles.

### Testing Module Setup

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

describe('UserService', () => {
  let module: TestingModule;
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Testing a Controller

```typescript
// user.controller.ts
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.userService.create(dto);
    return UserResponseDto.fromEntity(user);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.userService.findById(id);
    return UserResponseDto.fromEntity(user);
  }

  @Get()
  async findAll(@Query() query: PaginationDto): Promise<PaginatedResponse<UserResponseDto>> {
    return this.userService.findAll(query);
  }
}
```

```typescript
// user.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { NotFoundException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get(UserService);
  });

  describe('create', () => {
    it('should create a user and return the response DTO', async () => {
      const dto = { email: 'test@example.com', name: 'Test', password: 'pass123' };
      const user = { id: '1', email: 'test@example.com', name: 'Test', createdAt: new Date() };
      service.create.mockResolvedValue(user as any);

      const result = await controller.create(dto as any);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      service.findById.mockResolvedValue(user as any);

      const result = await controller.findOne('1');
      expect(result).toBeDefined();
    });

    it('should propagate NotFoundException from service', async () => {
      service.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### Testing Guards

```typescript
// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return requiredRoles.some((role) => user?.roles?.includes(role));
  }
}
```

```typescript
// roles.guard.spec.ts
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as any);

  it('should allow access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = createMockContext({ roles: ['user'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    const context = createMockContext({ roles: ['admin', 'user'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    const context = createMockContext({ roles: ['user'] });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny access when user has no roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    const context = createMockContext({});
    expect(guard.canActivate(context)).toBe(false);
  });
});
```

### Testing Pipes

```typescript
// parse-date.pipe.spec.ts
import { ParseDatePipe } from './parse-date.pipe';
import { BadRequestException } from '@nestjs/common';

describe('ParseDatePipe', () => {
  let pipe: ParseDatePipe;

  beforeEach(() => {
    pipe = new ParseDatePipe();
  });

  it('should parse a valid ISO date string', () => {
    const result = pipe.transform('2024-01-15T00:00:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2024-01-15T00:00:00.000Z');
  });

  it('should throw BadRequestException for invalid date', () => {
    expect(() => pipe.transform('not-a-date')).toThrow(BadRequestException);
  });
});
```

### Testing Interceptors

```typescript
// logging.interceptor.spec.ts
import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('should log request timing', (done) => {
    const context: ExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/users' }),
      }),
      getClass: () => ({ name: 'UserController' }),
      getHandler: () => ({ name: 'findAll' }),
    } as any;

    const callHandler: CallHandler = {
      handle: () => of({ data: 'test' }),
    };

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    interceptor.intercept(context, callHandler).subscribe({
      next: (value) => {
        expect(value).toEqual({ data: 'test' });
      },
      complete: () => {
        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
        done();
      },
    });
  });
});
```

### Complete CRUD Service Test

```typescript
// product.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from './entities/product.entity';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('ProductService', () => {
  let service: ProductService;
  let repository: MockRepository<Product>;

  beforeEach(async () => {
    repository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const products = [
        { id: '1', name: 'Widget', price: 999 },
        { id: '2', name: 'Gadget', price: 1999 },
      ];
      repository.find.mockResolvedValue(products);

      const result = await service.findAll();

      expect(result).toEqual(products);
      expect(repository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const product = { id: '1', name: 'Widget', price: 999 };
      repository.findOne.mockResolvedValue(product);

      const result = await service.findOne('1');

      expect(result).toEqual(product);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if product not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new product', async () => {
      const dto = { name: 'New Product', price: 2999, description: 'A great product' };
      const created = { id: '3', ...dto };

      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update and return the product', async () => {
      const existing = { id: '1', name: 'Widget', price: 999 };
      const updateDto = { price: 1299 };
      const updated = { ...existing, ...updateDto };

      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      const result = await service.update('1', updateDto);

      expect(result.price).toBe(1299);
    });

    it('should throw NotFoundException if product to update not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('999', { price: 100 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete the product', async () => {
      const existing = { id: '1', name: 'Widget', price: 999 };
      repository.findOne.mockResolvedValue(existing);
      repository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if product to delete not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

> **Interview Tip:** NestJS testing with `Test.createTestingModule()` is the idiomatic way to test. Mention that you use `overrideProvider()` and `overrideGuard()` in integration tests to swap out real implementations. Show that you understand the DI container and how it makes testing straightforward.

> **Common Follow-up:** "How do you test middleware or exception filters?" Answer: Middleware can be tested by creating a mock `Request`, `Response`, and `next` function. Exception filters are tested by calling their `catch()` method directly with a mock `ArgumentsHost`.

---

## Q5: Integration Testing

**Q: How do you approach integration testing for backend services? Show me how you test API endpoints with real (or near-real) dependencies.**

**A:**

Integration tests verify that multiple components work together. For backend services, this typically means testing HTTP endpoints with a real database, or at least real service wiring.

### Testing API Endpoints with Supertest

```typescript
// app.e2e-spec.ts (NestJS convention for integration tests)
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('UserController (Integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // Import the REAL module
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same pipes/interceptors as the real app
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up tables before each test
    await dataSource.synchronize(true); // Drop and recreate schema
  });

  describe('POST /users', () => {
    it('should create a user and return 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'fazle@example.com',
          name: 'Fazle Rabbi',
          password: 'SecurePass123!',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        email: 'fazle@example.com',
        name: 'Fazle Rabbi',
      });
      // Password should NOT be in the response
      expect(response.body.password).toBeUndefined();
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'not-an-email',
          name: 'Test',
          password: 'pass123',
        })
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        name: 'Test',
        password: 'pass123',
      };

      await request(app.getHttpServer()).post('/users').send(userData).expect(201);
      await request(app.getHttpServer()).post('/users').send(userData).expect(409);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      // First create a user
      const createRes = await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'test@example.com', name: 'Test', password: 'pass123' });

      const userId = createRes.body.id;

      // Then fetch it
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        email: 'test@example.com',
      });
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/users/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('GET /users (with auth)', () => {
    let authToken: string;

    beforeEach(async () => {
      // Create a user and log in to get a token
      await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'admin@example.com', name: 'Admin', password: 'admin123' });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'admin123' });

      authToken = loginRes.body.accessToken;
    });

    it('should return paginated users when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        meta: expect.objectContaining({
          page: 1,
          limit: 10,
          total: expect.any(Number),
        }),
      });
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });
  });
});
```

### Test Containers for Real Databases

```typescript
// test/setup/test-containers.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

let postgresContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;

export async function startContainers() {
  // Start real PostgreSQL and Redis containers for testing
  [postgresContainer, redisContainer] = await Promise.all([
    new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test_db')
      .withUsername('test')
      .withPassword('test')
      .start(),
    new RedisContainer('redis:7-alpine').start(),
  ]);

  // Set environment variables so the app uses these containers
  process.env.DATABASE_URL = postgresContainer.getConnectionUri();
  process.env.REDIS_HOST = redisContainer.getHost();
  process.env.REDIS_PORT = redisContainer.getMappedPort(6379).toString();
}

export async function stopContainers() {
  await Promise.all([
    postgresContainer?.stop(),
    redisContainer?.stop(),
  ]);
}

export function getPostgresContainer() {
  return postgresContainer;
}
```

```typescript
// jest.integration.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.integration.spec.ts'],
  globalSetup: '<rootDir>/test/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/setup/global-teardown.ts',
  testTimeout: 30000, // Container tests need more time
};

export default config;
```

```typescript
// test/setup/global-setup.ts
import { startContainers } from './test-containers';

export default async function globalSetup() {
  console.log('Starting test containers...');
  await startContainers();
  console.log('Test containers ready.');
}
```

### Database Seeding and Cleanup

```typescript
// test/helpers/database.helper.ts
import { DataSource } from 'typeorm';

export class TestDatabaseHelper {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Truncate all tables — fast way to clean between tests.
   * Cascade ensures foreign key constraints don't block.
   */
  async cleanAll(): Promise<void> {
    const entities = this.dataSource.entityMetadatas;
    const tableNames = entities
      .map((entity) => `"${entity.tableName}"`)
      .join(', ');

    if (tableNames.length > 0) {
      await this.dataSource.query(`TRUNCATE TABLE ${tableNames} CASCADE`);
    }
  }

  /**
   * Seed test data for a specific scenario.
   */
  async seedUsers(): Promise<void> {
    const userRepo = this.dataSource.getRepository('User');
    await userRepo.save([
      { email: 'alice@example.com', name: 'Alice', role: 'admin', passwordHash: 'xxx' },
      { email: 'bob@example.com', name: 'Bob', role: 'user', passwordHash: 'xxx' },
      { email: 'charlie@example.com', name: 'Charlie', role: 'user', passwordHash: 'xxx' },
    ]);
  }

  async seedProducts(): Promise<void> {
    const productRepo = this.dataSource.getRepository('Product');
    await productRepo.save([
      { name: 'Widget A', price: 1099, stock: 50 },
      { name: 'Widget B', price: 2099, stock: 0 }, // Out of stock
    ]);
  }
}
```

### Testing with Real Redis

```typescript
// cache.service.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../src/cache/cache.service';
import { RedisModule } from '../src/redis/redis.module';
import Redis from 'ioredis';

describe('CacheService (Integration)', () => {
  let service: CacheService;
  let redis: Redis;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [RedisModule], // Uses REDIS_HOST/REDIS_PORT from test containers
      providers: [CacheService],
    }).compile();

    service = module.get(CacheService);
    redis = module.get('REDIS_CLIENT');
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await redis.flushdb(); // Clean Redis before each test
  });

  it('should set and get a cached value', async () => {
    await service.set('user:1', { id: '1', name: 'Fazle' }, 60);

    const cached = await service.get('user:1');
    expect(cached).toEqual({ id: '1', name: 'Fazle' });
  });

  it('should return null for expired keys', async () => {
    await service.set('temp', 'data', 1); // 1 second TTL

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 1100));

    const result = await service.get('temp');
    expect(result).toBeNull();
  });

  it('should invalidate cache by pattern', async () => {
    await service.set('user:1', { id: '1' }, 60);
    await service.set('user:2', { id: '2' }, 60);
    await service.set('product:1', { id: '1' }, 60);

    await service.invalidateByPattern('user:*');

    expect(await service.get('user:1')).toBeNull();
    expect(await service.get('user:2')).toBeNull();
    expect(await service.get('product:1')).not.toBeNull(); // Untouched
  });
});
```

> **Interview Tip:** When asked about integration testing, mention the trade-off between speed and confidence. Test containers give you real databases but are slower. SQLite in-memory is faster but may not catch PostgreSQL-specific issues. A Senior engineer picks the right approach for the context.

> **Common Follow-up:** "How do you handle test data isolation when running integration tests in parallel?" Answer: Each test suite gets its own schema or database. With test containers, each test file can spin up its own container. Alternatively, use transactions that roll back after each test.

---

## Q6: E2E Testing Basics

**Q: What do backend E2E tests cover, and when are they worth the cost?**

**A:**

Backend E2E tests exercise the full request/response cycle from the HTTP layer through to the database and external services. Unlike integration tests (which may mock some external services), E2E tests aim to run against the real system — or as close to it as possible.

### What Backend E2E Tests Cover

- Complete API request/response flows with authentication.
- Multi-step business processes (register -> verify email -> login).
- Cross-service communication (if in a monorepo or controlled environment).
- Data consistency across multiple operations.
- Error handling and edge cases with real error responses.

### When E2E Is Worth It vs Overkill

**Worth it:**
- Critical business flows (payment, registration, order placement).
- Flows that span multiple services.
- Regression testing after major refactors.
- Compliance-sensitive operations (audit trails, data handling).

**Overkill:**
- Simple CRUD endpoints (integration tests are sufficient).
- Internal utility services.
- Read-only endpoints with no complex logic.
- Anything adequately covered by integration tests.

### E2E Test: User Registration Flow

```typescript
// test/e2e/user-registration.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { MailService } from '../../src/mail/mail.service';

describe('User Registration Flow (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let capturedEmails: Array<{ to: string; subject: string; body: string }>;

  beforeAll(async () => {
    capturedEmails = [];

    // Create a spy mail service that captures emails instead of sending them
    const mockMailService = {
      sendVerificationEmail: jest.fn().mockImplementation(async (to, token) => {
        capturedEmails.push({
          to,
          subject: 'Verify your email',
          body: `token=${token}`,
        });
      }),
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    capturedEmails = [];
    await dataSource.synchronize(true);
  });

  it('should complete the full registration flow', async () => {
    // Step 1: Register a new user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'newuser@example.com',
        name: 'New User',
        password: 'SecureP@ss1',
      })
      .expect(201);

    expect(registerResponse.body).toMatchObject({
      message: 'Registration successful. Please verify your email.',
      userId: expect.any(String),
    });

    const userId = registerResponse.body.userId;

    // Step 2: Verify that a verification email was "sent"
    expect(capturedEmails).toHaveLength(1);
    expect(capturedEmails[0].to).toBe('newuser@example.com');

    // Extract verification token from the captured email
    const tokenMatch = capturedEmails[0].body.match(/token=(.+)/);
    expect(tokenMatch).not.toBeNull();
    const verificationToken = tokenMatch![1];

    // Step 3: Try to login before verification — should fail
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'newuser@example.com',
        password: 'SecureP@ss1',
      })
      .expect(403); // Account not verified

    // Step 4: Verify email
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: verificationToken })
      .expect(200);

    // Step 5: Login after verification — should succeed
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'newuser@example.com',
        password: 'SecureP@ss1',
      })
      .expect(200);

    expect(loginResponse.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });

    // Step 6: Access a protected resource with the token
    const profileResponse = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(profileResponse.body).toMatchObject({
      id: userId,
      email: 'newuser@example.com',
      name: 'New User',
      emailVerified: true,
    });
  });

  it('should reject registration with weak password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        name: 'Test',
        password: '123', // Too weak
      })
      .expect(400);
  });

  it('should reject duplicate registration', async () => {
    const userData = {
      email: 'dupe@example.com',
      name: 'Test',
      password: 'SecureP@ss1',
    };

    await request(app.getHttpServer()).post('/auth/register').send(userData).expect(201);

    const dupeResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userData)
      .expect(409);

    expect(dupeResponse.body.message).toContain('already exists');
  });

  it('should reject invalid verification token', async () => {
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: 'invalid-token-12345' })
      .expect(400);
  });
});
```

### Contract Testing with Pact

Contract testing verifies that the API a provider exposes matches what consumers expect. This is critical in microservices.

```typescript
// consumer side — what the Order Service expects from Payment Service
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const { like, eachLike, string, integer } = MatchersV3;

const provider = new PactV3({
  consumer: 'OrderService',
  provider: 'PaymentService',
});

describe('PaymentService Contract', () => {
  it('should process a payment', async () => {
    // Define the expected interaction
    await provider
      .given('a valid payment method exists')
      .uponReceiving('a request to charge a payment')
      .withRequest({
        method: 'POST',
        path: '/payments/charge',
        headers: { 'Content-Type': 'application/json' },
        body: {
          amount: integer(5000),
          currency: string('USD'),
          paymentMethodId: string('pm_12345'),
        },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: string('pay_abc123'),
          status: string('succeeded'),
          amount: integer(5000),
        },
      })
      .executeTest(async (mockserver) => {
        // Point the payment client at the mock server
        const client = new PaymentClient(mockserver.url);
        const result = await client.charge({
          amount: 5000,
          currency: 'USD',
          paymentMethodId: 'pm_12345',
        });

        expect(result.status).toBe('succeeded');
      });
  });
});
```

### E2E Test Organization

```
test/
  e2e/
    auth/
      registration.e2e-spec.ts
      login.e2e-spec.ts
      password-reset.e2e-spec.ts
    orders/
      order-flow.e2e-spec.ts
      order-cancellation.e2e-spec.ts
    setup/
      global-setup.ts       # Start containers, migrations
      global-teardown.ts     # Stop containers
      test-helpers.ts        # Shared seed/cleanup functions
  jest.e2e.config.ts
```

> **Interview Tip:** E2E tests are expensive — be selective. A strong answer mentions that you focus E2E tests on business-critical paths and use integration tests for everything else. Mention contract testing as a way to verify cross-service communication without spinning up the entire system.

> **Common Follow-up:** "How do you keep E2E tests from being flaky?" Answer: Deterministic test data (no random values), isolated environments per test suite, proper wait conditions (not `setTimeout`), and idempotent test operations.

---

## Q7: TDD (Test-Driven Development)

**Q: Do you practice TDD? Explain the Red-Green-Refactor cycle and when TDD is most valuable.**

**A:**

### Red-Green-Refactor Cycle

```
 ┌─────────┐     ┌─────────┐     ┌───────────┐
 │   RED   │ ──→ │  GREEN  │ ──→ │ REFACTOR  │ ──→ (repeat)
 │Write a  │     │Write the│     │Clean up   │
 │failing  │     │minimum  │     │the code,  │
 │test     │     │code to  │     │tests still│
 │         │     │pass     │     │pass       │
 └─────────┘     └─────────┘     └───────────┘
```

1. **RED:** Write a test for the behavior you want. Run it — it fails. This confirms the test is actually checking something.
2. **GREEN:** Write the minimum code to make the test pass. Do not optimize or generalize yet.
3. **REFACTOR:** Clean up the code (remove duplication, improve naming, extract methods). Run the tests after each change — they must stay green.

### TDD Step-by-Step Example: Password Validator

**Step 1 (RED): Write the first failing test**

```typescript
// password-validator.spec.ts
import { PasswordValidator } from './password-validator';

describe('PasswordValidator', () => {
  let validator: PasswordValidator;

  beforeEach(() => {
    validator = new PasswordValidator();
  });

  it('should reject passwords shorter than 8 characters', () => {
    const result = validator.validate('Abc1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });
});
```

```typescript
// password-validator.ts — minimum to compile
export class PasswordValidator {
  validate(password: string): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] }; // Will fail the test
  }
}
```

Run tests: FAILS (RED). Good.

**Step 2 (GREEN): Make it pass**

```typescript
export class PasswordValidator {
  validate(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    return { isValid: errors.length === 0, errors };
  }
}
```

Run tests: PASSES (GREEN).

**Step 3 (RED): Add next requirement**

```typescript
it('should reject passwords without uppercase letters', () => {
  const result = validator.validate('abcdefg1!');
  expect(result.isValid).toBe(false);
  expect(result.errors).toContain('Password must contain at least one uppercase letter');
});
```

Run tests: FAILS. Good.

**Step 4 (GREEN): Make it pass**

```typescript
export class PasswordValidator {
  validate(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    return { isValid: errors.length === 0, errors };
  }
}
```

**Continue the cycle for remaining rules:**

```typescript
it('should reject passwords without a number', () => {
  const result = validator.validate('Abcdefgh!');
  expect(result.isValid).toBe(false);
  expect(result.errors).toContain('Password must contain at least one number');
});

it('should reject passwords without a special character', () => {
  const result = validator.validate('Abcdefg1');
  expect(result.isValid).toBe(false);
  expect(result.errors).toContain('Password must contain at least one special character');
});

it('should accept a valid password', () => {
  const result = validator.validate('SecureP@ss1');
  expect(result.isValid).toBe(true);
  expect(result.errors).toHaveLength(0);
});

it('should return multiple errors at once', () => {
  const result = validator.validate('abc');
  expect(result.isValid).toBe(false);
  expect(result.errors.length).toBeGreaterThanOrEqual(3);
});
```

**Step 5 (REFACTOR): Clean up**

```typescript
interface ValidationRule {
  test: (password: string) => boolean;
  message: string;
}

export class PasswordValidator {
  private readonly rules: ValidationRule[] = [
    {
      test: (p) => p.length >= 8,
      message: 'Password must be at least 8 characters',
    },
    {
      test: (p) => /[A-Z]/.test(p),
      message: 'Password must contain at least one uppercase letter',
    },
    {
      test: (p) => /[a-z]/.test(p),
      message: 'Password must contain at least one lowercase letter',
    },
    {
      test: (p) => /[0-9]/.test(p),
      message: 'Password must contain at least one number',
    },
    {
      test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
      message: 'Password must contain at least one special character',
    },
  ];

  validate(password: string): { isValid: boolean; errors: string[] } {
    const errors = this.rules
      .filter((rule) => !rule.test(password))
      .map((rule) => rule.message);

    return { isValid: errors.length === 0, errors };
  }
}
```

Run all tests: still GREEN. Refactoring is done.

### When TDD Is Most Valuable

| Scenario | Why TDD Helps |
|----------|--------------|
| Complex business logic | Forces you to think about edge cases upfront |
| Bug fixes | Write a test that reproduces the bug, then fix it — it can never regress |
| Algorithm implementation | Tests clarify expected behavior before you get lost in code |
| Public API design | Writing tests first helps you design the API from the consumer's perspective |
| New team members | TDD produces comprehensive tests that document behavior |

### When TDD Is Less Practical

| Scenario | Why |
|----------|-----|
| Prototyping / spike work | You are exploring, not building for keeps |
| UI/frontend work | Visual behavior is hard to specify upfront (though component tests help) |
| Simple CRUD | The logic is trivial; tests written after are fine |
| Rapidly changing requirements | Tests keep breaking because requirements shift hourly |

### Benefits and Criticisms

**Benefits:**
- Forces small, testable design. Code written with TDD tends to have lower coupling.
- Acts as living documentation.
- Catches regressions immediately.
- Gives confidence to refactor.
- Reduces debugging time — you know exactly when something broke.

**Criticisms:**
- Can slow down initial development (but speeds up total lifecycle).
- Can lead to over-testing trivial code.
- Poorly practiced TDD (testing implementation details) creates brittle tests.
- Some developers write tests just to pass, missing the design feedback.

> **Interview Tip:** When asked "Do you practice TDD?", give an honest, nuanced answer. Something like: "I use TDD for complex business logic and bug fixes. For CRUD operations and straightforward wiring code, I write tests after implementation. The key is that every PR includes tests — whether they were written first or second matters less than having them."

> **Common Follow-up:** "How do you TDD in a codebase that was not built with TDD?" Answer: Start with the "test-first bug fix" approach — every bug fix starts with a test that reproduces the bug. Gradually, the test suite grows and the team builds the habit.

---

## Q8: Code Coverage

**Q: What do code coverage metrics mean, and what are good coverage targets?**

**A:**

### Coverage Metrics Explained

```typescript
function processOrder(order: Order): string {  // ← Function coverage: was this function called?
  let status = 'pending';                       // ← Statement coverage: was this line executed?

  if (order.total > 1000) {                     // ← Branch coverage: were both true AND false tested?
    status = 'requires_approval';               // ← Line coverage: was this line reached?
    if (order.priority === 'high') {            // ← Another branch
      status = 'auto_approved';
    }
  } else {
    status = 'approved';
  }

  return status;
}
```

| Metric | What It Measures | Missed By |
|--------|------------------|-----------|
| **Line/Statement** | Was each line executed? | Dead code, unreachable branches |
| **Branch** | Was each if/else/switch path taken? | Missing edge cases |
| **Function** | Was each function called at least once? | Unused functions |
| **Condition** | Was each boolean sub-expression tested for true and false? | Complex conditionals like `a && b` |

### Setting Up Coverage with Jest

```jsonc
// jest.config.ts (or package.json)
{
  "collectCoverage": true,
  "coverageDirectory": "coverage",
  "coverageReporters": ["text", "text-summary", "lcov", "html"],
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!src/**/*.module.ts",
    "!src/main.ts",
    "!src/**/*.dto.ts",
    "!src/**/*.entity.ts",
    "!src/**/index.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    },
    // Per-directory overrides for critical code
    "./src/billing/": {
      "branches": 95,
      "functions": 95,
      "lines": 95,
      "statements": 95
    }
  }
}
```

```bash
# Run tests with coverage
npx jest --coverage

# Output looks like:
# ----------------------|---------|----------|---------|---------|
# File                  | % Stmts | % Branch | % Funcs | % Lines |
# ----------------------|---------|----------|---------|---------|
# All files             |   87.5  |   82.3   |   90.1  |   87.5  |
#  order.service.ts     |   95.2  |   88.9   |  100    |   95.2  |
#  payment.service.ts   |   72.1  |   65.4   |   80    |   72.1  |
# ----------------------|---------|----------|---------|---------|
```

### Good Coverage Targets

| Context | Target | Reasoning |
|---------|--------|-----------|
| General backend services | **80%** | Industry standard; catches most issues |
| Business-critical logic (billing, auth) | **90-95%** | High-risk code deserves thorough testing |
| Utility/helper functions | **90%+** | Pure functions are easy to test; no excuse |
| DTOs/Entities | **Skip** | These are data structures, not logic |
| Generated code (migrations, etc.) | **Skip** | Do not test generated code |
| New code (PRs) | **80%+ diff coverage** | Prevent coverage from degrading over time |

### Meaningful Coverage vs Gaming the Numbers

**Bad: Gaming coverage**
```typescript
// This test achieves 100% coverage but tests NOTHING meaningful
it('should exist', () => {
  const service = new OrderService(mockRepo, mockPayment);
  expect(service).toBeDefined(); // Useless — just instantiates the class
});

// Or calling a method without asserting results
it('should call processOrder', async () => {
  await service.processOrder(mockOrder);
  // No assertions! Just running the code to hit coverage lines.
});
```

**Good: Meaningful tests**
```typescript
it('should require approval for orders over $1000', async () => {
  const order = createOrder({ total: 1500 });
  const result = await service.processOrder(order);

  expect(result.status).toBe('requires_approval');
  expect(result.approver).toBeDefined();
  expect(notificationService.send).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'approval_request' }),
  );
});
```

### When 100% Coverage Is Harmful

- **It wastes time** testing trivial code (getters, constructors, type guards).
- **It creates brittle tests** that break when implementation details change.
- **It gives false confidence** — 100% line coverage does not mean all edge cases are tested (you can have 100% line coverage and 0% branch coverage on `if` statements where only one path is taken).
- **It slows down development** because every change requires updating many tests.

### Enforcing Coverage in CI

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: npm run test:cov

- name: Check coverage thresholds
  run: npx jest --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80}}'
  # This command will EXIT with code 1 if thresholds are not met, failing the CI build
```

> **Interview Tip:** Show that you understand coverage is a tool, not a goal. Say: "I target 80% as a baseline and enforce it in CI to prevent regression. For critical paths like billing or authentication, I aim for 90%+. But I focus on meaningful assertions — I would rather have 80% coverage with thorough assertions than 100% coverage with shallow tests."

> **Common Follow-up:** "How do you handle legacy code with 0% coverage?" Answer: Do not try to backfill all at once. Use the "boy scout rule" — every time you touch a file, add tests for the part you changed. Over time, coverage grows organically where it matters most.

---

## Q9: Testing Async Code and Event-Driven Systems

**Q: How do you test asynchronous code, event-driven systems, and background jobs?**

**A:**

Async code and event-driven systems are some of the hardest things to test because the results are not immediately available and timing matters.

### Testing Promises and Async/Await

```typescript
// retry.util.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError!;
}
```

```typescript
// retry.util.spec.ts
describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return on first success', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, 3, 100);

    // Fast-forward through the delays
    await jest.advanceTimersByTimeAsync(100); // After first retry delay
    await jest.advanceTimersByTimeAsync(100); // After second retry delay

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after exhausting retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

    const promise = withRetry(fn, 3, 100);

    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(100);

    await expect(promise).rejects.toThrow('persistent failure');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
```

### Testing Event Emitters

```typescript
// notification.service.ts
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async notifyOrderPlaced(order: Order): Promise<void> {
    // Sends email, updates dashboard, logs analytics
    this.eventEmitter.emit('order.placed', {
      orderId: order.id,
      userId: order.userId,
      total: order.total,
      timestamp: new Date(),
    });
  }
}
```

```typescript
// notification.service.spec.ts
describe('NotificationService', () => {
  let service: NotificationService;
  let eventEmitter: EventEmitter2;

  beforeEach(() => {
    eventEmitter = new EventEmitter2();
    service = new NotificationService(eventEmitter);
  });

  it('should emit order.placed event with correct payload', (done) => {
    const order = { id: 'ord-1', userId: 'usr-1', total: 5000 } as Order;

    eventEmitter.on('order.placed', (payload) => {
      expect(payload).toMatchObject({
        orderId: 'ord-1',
        userId: 'usr-1',
        total: 5000,
        timestamp: expect.any(Date),
      });
      done();
    });

    service.notifyOrderPlaced(order);
  });

  it('should emit event that triggers multiple listeners', async () => {
    const emailHandler = jest.fn();
    const analyticsHandler = jest.fn();

    eventEmitter.on('order.placed', emailHandler);
    eventEmitter.on('order.placed', analyticsHandler);

    await service.notifyOrderPlaced({ id: '1', userId: '1', total: 100 } as Order);

    expect(emailHandler).toHaveBeenCalledTimes(1);
    expect(analyticsHandler).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Timers (jest.useFakeTimers)

```typescript
// scheduler.service.ts
export class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private readonly cleanupService: CleanupService) {}

  startPeriodicCleanup(intervalMs: number): void {
    this.intervalId = setInterval(async () => {
      await this.cleanupService.removeExpiredSessions();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

```typescript
// scheduler.service.spec.ts
describe('SchedulerService', () => {
  let scheduler: SchedulerService;
  let cleanupService: jest.Mocked<CleanupService>;

  beforeEach(() => {
    jest.useFakeTimers();
    cleanupService = { removeExpiredSessions: jest.fn().mockResolvedValue(undefined) } as any;
    scheduler = new SchedulerService(cleanupService);
  });

  afterEach(() => {
    scheduler.stop();
    jest.useRealTimers();
  });

  it('should call cleanup at the specified interval', () => {
    scheduler.startPeriodicCleanup(60_000); // Every minute

    // No calls yet
    expect(cleanupService.removeExpiredSessions).not.toHaveBeenCalled();

    // Advance by 1 minute
    jest.advanceTimersByTime(60_000);
    expect(cleanupService.removeExpiredSessions).toHaveBeenCalledTimes(1);

    // Advance by another minute
    jest.advanceTimersByTime(60_000);
    expect(cleanupService.removeExpiredSessions).toHaveBeenCalledTimes(2);
  });

  it('should stop calling after stop()', () => {
    scheduler.startPeriodicCleanup(60_000);

    jest.advanceTimersByTime(60_000);
    expect(cleanupService.removeExpiredSessions).toHaveBeenCalledTimes(1);

    scheduler.stop();

    jest.advanceTimersByTime(120_000);
    expect(cleanupService.removeExpiredSessions).toHaveBeenCalledTimes(1); // No more calls
  });
});
```

### Testing a Kafka Consumer

```typescript
// order-event.consumer.ts
@Injectable()
export class OrderEventConsumer {
  constructor(
    private readonly orderService: OrderService,
    private readonly logger: Logger,
  ) {}

  async handleOrderCreated(message: KafkaMessage): Promise<void> {
    const payload = JSON.parse(message.value!.toString());

    // Idempotency check
    const existing = await this.orderService.findByExternalId(payload.externalId);
    if (existing) {
      this.logger.warn(`Duplicate event for order ${payload.externalId}, skipping`);
      return;
    }

    await this.orderService.createFromEvent({
      externalId: payload.externalId,
      items: payload.items,
      total: payload.total,
      userId: payload.userId,
    });
  }
}
```

```typescript
// order-event.consumer.spec.ts
describe('OrderEventConsumer', () => {
  let consumer: OrderEventConsumer;
  let orderService: jest.Mocked<OrderService>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    orderService = {
      findByExternalId: jest.fn(),
      createFromEvent: jest.fn(),
    } as any;
    logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() } as any;
    consumer = new OrderEventConsumer(orderService, logger);
  });

  const createMessage = (payload: object): KafkaMessage => ({
    key: null,
    value: Buffer.from(JSON.stringify(payload)),
    timestamp: Date.now().toString(),
    headers: {},
    offset: '0',
    size: 0,
    attributes: 0,
  });

  it('should process a new order event', async () => {
    const payload = {
      externalId: 'ext-1',
      items: [{ productId: 'p1', quantity: 2 }],
      total: 5000,
      userId: 'u1',
    };

    orderService.findByExternalId.mockResolvedValue(null); // Not a duplicate
    orderService.createFromEvent.mockResolvedValue({ id: 'ord-1' } as any);

    await consumer.handleOrderCreated(createMessage(payload));

    expect(orderService.findByExternalId).toHaveBeenCalledWith('ext-1');
    expect(orderService.createFromEvent).toHaveBeenCalledWith({
      externalId: 'ext-1',
      items: [{ productId: 'p1', quantity: 2 }],
      total: 5000,
      userId: 'u1',
    });
  });

  it('should skip duplicate events (idempotency)', async () => {
    const payload = { externalId: 'ext-1', items: [], total: 0, userId: 'u1' };

    orderService.findByExternalId.mockResolvedValue({ id: 'existing' } as any);

    await consumer.handleOrderCreated(createMessage(payload));

    expect(orderService.createFromEvent).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Duplicate event'),
    );
  });

  it('should handle malformed messages gracefully', async () => {
    const badMessage: KafkaMessage = {
      key: null,
      value: Buffer.from('not json'),
      timestamp: Date.now().toString(),
      headers: {},
      offset: '0',
      size: 0,
      attributes: 0,
    };

    await expect(consumer.handleOrderCreated(badMessage)).rejects.toThrow();
  });
});
```

### Testing Scheduled Jobs (Cron)

```typescript
// cleanup.cron.spec.ts
describe('CleanupCronJob', () => {
  let job: CleanupCronJob;
  let sessionService: jest.Mocked<SessionService>;

  beforeEach(() => {
    jest.useFakeTimers();
    sessionService = {
      deleteExpired: jest.fn().mockResolvedValue(5),
      countExpired: jest.fn().mockResolvedValue(5),
    } as any;
    job = new CleanupCronJob(sessionService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should delete expired sessions and log the count', async () => {
    const result = await job.handleCron();

    expect(sessionService.deleteExpired).toHaveBeenCalled();
    expect(result).toEqual({ deletedCount: 5 });
  });

  it('should handle errors without crashing', async () => {
    sessionService.deleteExpired.mockRejectedValue(new Error('DB down'));

    // Should not throw — cron jobs must be resilient
    await expect(job.handleCron()).resolves.not.toThrow();
  });
});
```

### Testing WebSocket Handlers

```typescript
// chat.gateway.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatGateway],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);

    mockSocket = {
      id: 'socket-1',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      broadcast: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
      data: {},
    } as any;
  });

  it('should handle connection and join user room', () => {
    mockSocket.data = { userId: 'user-1' };

    gateway.handleConnection(mockSocket);

    expect(mockSocket.join).toHaveBeenCalledWith('user:user-1');
  });

  it('should broadcast message to room', async () => {
    const payload = { roomId: 'room-1', message: 'Hello!' };

    await gateway.handleMessage(mockSocket, payload);

    expect(mockSocket.to).toHaveBeenCalledWith('room-1');
  });
});
```

> **Interview Tip:** When discussing async testing, emphasize idempotency and resilience. Show that you think about: "What happens if this event is delivered twice?" and "What happens if the handler crashes?" These are production-level concerns that distinguish senior engineers.

> **Common Follow-up:** "How do you test a system that uses both Kafka and a database?" Answer: For unit tests, mock both. For integration tests, use test containers for both Kafka and PostgreSQL. Test the full flow: produce message, consume it, verify the database state changed.

---

## Q10: Testing Best Practices for Senior Engineers

**Q: What makes a good test? What are the practices you enforce on your team?**

**A:**

### Test Naming Conventions

Use descriptive names that explain the scenario and expected outcome. The test name should read like a specification.

```typescript
// BAD — vague, tells you nothing about what is being tested
it('should work', () => { ... });
it('test create', () => { ... });
it('handles error', () => { ... });

// GOOD — "should [expected behavior] when [scenario]"
it('should return 201 when creating a valid user', () => { ... });
it('should throw NotFoundException when user does not exist', () => { ... });
it('should apply 10% discount when order total exceeds $100', () => { ... });

// ALSO GOOD — "given [context], when [action], then [outcome]"
describe('given an authenticated admin user', () => {
  describe('when deleting another user', () => {
    it('then it should remove the user and return 204', () => { ... });
  });
});

// ALSO GOOD — context-based describe blocks
describe('OrderService', () => {
  describe('placeOrder', () => {
    describe('when stock is available', () => {
      it('should create order with confirmed status', () => { ... });
      it('should emit order.placed event', () => { ... });
    });

    describe('when stock is insufficient', () => {
      it('should throw BadRequestException', () => { ... });
      it('should not charge payment', () => { ... });
    });
  });
});
```

### Arrange-Act-Assert (AAA) Pattern

Every test should have three clearly separated sections:

```typescript
it('should calculate discounted price for premium users', async () => {
  // ARRANGE — set up the scenario
  const user = { id: '1', tier: 'premium' } as User;
  const product = { id: 'p1', price: 10000 } as Product; // $100.00
  userRepository.findById.mockResolvedValue(user);
  discountService.getDiscount.mockResolvedValue(0.2); // 20% off

  // ACT — perform the action
  const result = await pricingService.calculatePrice(user.id, product);

  // ASSERT — verify the outcome
  expect(result).toEqual({
    originalPrice: 10000,
    discount: 2000,
    finalPrice: 8000,
    discountPercent: 20,
  });
  expect(discountService.getDiscount).toHaveBeenCalledWith('premium');
});
```

### Test Isolation and Independence

```typescript
// BAD — tests depend on each other's side effects
describe('UserService', () => {
  let userId: string;

  it('should create user', async () => {
    const user = await service.create({ name: 'Test' });
    userId = user.id; // Shared state!
  });

  it('should find the created user', async () => {
    const user = await service.findById(userId); // Depends on previous test!
    expect(user.name).toBe('Test');
  });
});

// GOOD — each test is self-contained
describe('UserService', () => {
  it('should create and return a user', async () => {
    const user = await service.create({ name: 'Test' });
    expect(user).toMatchObject({ name: 'Test', id: expect.any(String) });
  });

  it('should find an existing user', async () => {
    // Arrange — create its own data
    const created = await service.create({ name: 'Test' });

    // Act
    const found = await service.findById(created.id);

    // Assert
    expect(found).toEqual(created);
  });
});
```

### Flaky Tests: Causes and Fixes

| Cause | Fix |
|-------|-----|
| **Race conditions** | Use proper `await`, avoid `setTimeout` in tests |
| **Shared state** | Reset state in `beforeEach`, use unique test data |
| **Time-dependent logic** | Use `jest.useFakeTimers()` or freeze `Date.now()` |
| **External service dependency** | Mock external calls; use test containers for databases |
| **Non-deterministic data** | Use factories with deterministic values, not `Math.random()` |
| **Test ordering** | Each test must set up its own state; use `--randomize` flag |
| **Port conflicts** | Use random ports (`0`) or `--detectOpenHandles` |

```typescript
// Fixing time-dependent tests
describe('TokenService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should detect expired token', () => {
    const token = service.generateToken({ expiresIn: 3600 }); // 1 hour

    // Advance time by 2 hours
    jest.advanceTimersByTime(2 * 60 * 60 * 1000);

    expect(service.isExpired(token)).toBe(true);
  });

  it('should detect valid token', () => {
    const token = service.generateToken({ expiresIn: 3600 });

    // Only 30 minutes have passed
    jest.advanceTimersByTime(30 * 60 * 1000);

    expect(service.isExpired(token)).toBe(false);
  });
});
```

### Testing in CI/CD Pipelines

```yaml
# .github/workflows/test.yml
name: Test

on:
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --ci --coverage --maxWorkers=2
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]  # Only run if others pass
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:e2e
```

### Code Review Checklist for Tests

When reviewing tests as a senior/lead engineer, check for:

```markdown
## Test Review Checklist

### Structure
- [ ] Tests use AAA (Arrange-Act-Assert) pattern
- [ ] Test names clearly describe the scenario and expectation
- [ ] Tests are grouped logically with describe blocks
- [ ] No test depends on another test's outcome

### Coverage
- [ ] Happy path is tested
- [ ] Error/edge cases are tested (null, empty, boundary values)
- [ ] All branches in the implementation are covered
- [ ] New public methods have corresponding tests

### Quality
- [ ] Assertions are meaningful (not just `toBeDefined()`)
- [ ] Tests verify behavior, not implementation details
- [ ] Mock setup is minimal — only mock what you must
- [ ] No commented-out tests or skipped tests without a reason
- [ ] Tests run in isolation (no shared mutable state)

### Maintenance
- [ ] Test data is created via factories or helpers, not hardcoded
- [ ] No magic numbers — use named constants
- [ ] Cleanup is handled (afterEach/afterAll)
- [ ] Tests are not brittle (won't break from unrelated changes)
```

### Test Factories (Reducing Boilerplate)

```typescript
// test/factories/user.factory.ts
import { User } from '../../src/user/entities/user.entity';

let counter = 0;

export function createUser(overrides: Partial<User> = {}): User {
  counter++;
  return {
    id: `user-${counter}`,
    email: `user${counter}@test.com`,
    name: `Test User ${counter}`,
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as User;
}

export function createAdmin(overrides: Partial<User> = {}): User {
  return createUser({ role: 'admin', ...overrides });
}

// Usage in tests
it('should allow admin to delete users', async () => {
  const admin = createAdmin();
  const target = createUser();
  // ...
});
```

```typescript
// test/factories/order.factory.ts
import { Order } from '../../src/order/entities/order.entity';

export function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-1',
    userId: 'user-1',
    items: [{ productId: 'p1', quantity: 1, price: 1000 }],
    total: 1000,
    status: 'pending',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  } as Order;
}

// Usage
it('should reject order with zero total', async () => {
  const order = createOrder({ total: 0 });
  await expect(service.validate(order)).rejects.toThrow();
});
```

### What Makes a Good Test — The Senior Engineer's Perspective

A good test has these properties:

1. **Readable** — A developer who has never seen the code can understand what is being tested and why.
2. **Reliable** — It passes or fails deterministically. No flakiness.
3. **Fast** — Unit tests run in milliseconds. Integration tests run in seconds. Anything slower is a problem.
4. **Isolated** — It does not depend on other tests, external state, or execution order.
5. **Meaningful** — It tests behavior, not implementation. If you refactor the internals without changing behavior, the test should still pass.
6. **Maintainable** — It does not require constant updates when the code changes in unrelated ways.
7. **Focused** — It tests one thing. When it fails, you know exactly what broke.

> **Interview Tip:** When asked "What makes a good test?", do not just list qualities. Give a concrete example of a bad test and explain how to improve it. This demonstrates real experience.

> **Common Follow-up:** "How do you introduce testing culture to a team that does not write tests?" Answer: Start with CI enforcement — require tests for new code. Lead by example. Pair with developers to write tests for their features. Celebrate when tests catch real bugs. Do not mandate retroactive test coverage — focus on new code first.

---

## Q11: Testing Database Interactions

**Q: How do you test code that interacts with a database? What patterns ensure testability and isolation?**

**A:**

Database testing is one of the most critical — and most debated — areas. The key tension is between speed (use mocks) and confidence (use a real database). Senior engineers know when to use each approach.

### Repository Pattern for Testability

The repository pattern abstracts database access behind an interface, making it easy to swap implementations in tests.

```typescript
// interfaces/user-repository.interface.ts
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(options?: PaginationOptions): Promise<PaginatedResult<User>>;
  save(user: Partial<User>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}
```

```typescript
// repositories/user.repository.ts — real implementation
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repo.findOne({ where: { email } });
    return entity ? this.toDomain(entity) : null;
  }

  async save(user: Partial<User>): Promise<User> {
    const entity = this.repo.create(user);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  // ... other methods

  private toDomain(entity: UserEntity): User {
    return { id: entity.id, email: entity.email, name: entity.name, role: entity.role };
  }
}
```

```typescript
// In your NestJS module, bind the interface to the real implementation:
@Module({
  providers: [
    UserService,
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
  ],
})
export class UserModule {}

// In UserService, inject by token:
@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepo: IUserRepository,
  ) {}
}
```

Now in tests, you can swap in a fake:

```typescript
// In test setup:
const module = await Test.createTestingModule({
  providers: [
    UserService,
    {
      provide: 'IUserRepository',
      useClass: FakeUserRepository, // In-memory implementation
    },
  ],
}).compile();
```

### In-Memory Database vs Real Database for Tests

| Approach | Pros | Cons |
|----------|------|------|
| **In-memory fake** (Map-based) | Blazing fast, no setup, no cleanup | Does not test SQL, joins, constraints |
| **SQLite in-memory** | Fast, real SQL engine | Different SQL dialect; misses PG-specific features (JSONB, arrays, CTEs) |
| **Real PostgreSQL (test containers)** | Exact parity with production | Slower, requires Docker, more setup |
| **Shared test database** | Simple setup | Parallel test conflicts, cleanup headaches |

**Recommendation for senior engineers:**
- **Unit tests:** Use in-memory fakes or mocks. Test business logic, not SQL.
- **Integration tests:** Use a real PostgreSQL via test containers. This catches SQL bugs, constraint violations, and migration issues.
- **Never rely solely on mocks for database tests.** Mocks cannot catch a typo in a column name or a missing index.

### Test Data Factories (Factory Pattern)

Test data factories produce consistent, valid test entities with sensible defaults that can be overridden per test.

```typescript
// test/factories/index.ts
import { faker } from '@faker-js/faker';
import { User } from '../../src/user/entities/user.entity';
import { Order } from '../../src/order/entities/order.entity';
import { Product } from '../../src/product/entities/product.entity';

// Deterministic seed for reproducible tests
faker.seed(42);

export class TestFactory {
  private static userCounter = 0;
  private static orderCounter = 0;

  static createUser(overrides: Partial<User> = {}): User {
    this.userCounter++;
    return {
      id: `usr-${this.userCounter}`,
      email: `user${this.userCounter}@test.com`,
      name: `Test User ${this.userCounter}`,
      role: 'user',
      passwordHash: '$2b$10$fakehash',
      emailVerified: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      ...overrides,
    } as User;
  }

  static createAdmin(overrides: Partial<User> = {}): User {
    return this.createUser({ role: 'admin', ...overrides });
  }

  static createOrder(overrides: Partial<Order> = {}): Order {
    this.orderCounter++;
    return {
      id: `ord-${this.orderCounter}`,
      userId: `usr-1`,
      items: [
        { productId: 'prod-1', quantity: 1, unitPrice: 2500 },
      ],
      total: 2500,
      status: 'pending',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      ...overrides,
    } as Order;
  }

  static createProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: `prod-${Date.now()}`,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseInt(faker.commerce.price({ min: 100, max: 10000, dec: 0 })),
      stock: faker.number.int({ min: 0, max: 500 }),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      ...overrides,
    } as Product;
  }

  /**
   * Bulk create for pagination/list testing.
   */
  static createUsers(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }

  /**
   * Reset counters between test suites.
   */
  static reset(): void {
    this.userCounter = 0;
    this.orderCounter = 0;
  }
}

// Usage in tests:
describe('OrderService', () => {
  beforeEach(() => TestFactory.reset());

  it('should reject order with out-of-stock product', async () => {
    const product = TestFactory.createProduct({ stock: 0 });
    const order = TestFactory.createOrder({
      items: [{ productId: product.id, quantity: 5, unitPrice: product.price }],
    });

    productRepo.findById.mockResolvedValue(product);

    await expect(service.placeOrder(order)).rejects.toThrow('Insufficient stock');
  });
});
```

### Database Seeding and Cleanup Strategies

```typescript
// Strategy 1: TRUNCATE between tests (fast, clean)
beforeEach(async () => {
  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
  }
});

// Strategy 2: Transaction rollback (fastest, no actual writes)
// Each test runs in a transaction that is rolled back after the test.
let queryRunner: QueryRunner;

beforeEach(async () => {
  queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  // Replace the connection's manager so all queries go through this transaction
  // This is framework-specific; some ORMs support this natively.
});

afterEach(async () => {
  await queryRunner.rollbackTransaction();
  await queryRunner.release();
});

// Strategy 3: Unique schema per test suite
beforeAll(async () => {
  const schemaName = `test_${Date.now()}`;
  await dataSource.query(`CREATE SCHEMA "${schemaName}"`);
  await dataSource.query(`SET search_path TO "${schemaName}"`);
  await dataSource.synchronize(); // Create tables in new schema
});

afterAll(async () => {
  await dataSource.query(`DROP SCHEMA "${schemaName}" CASCADE`);
});
```

### Transaction Rollback Pattern — Deep Dive

The transaction rollback pattern is the gold standard for fast, isolated database tests. The idea: wrap each test in a database transaction and roll it back when the test finishes. No data persists, no cleanup needed.

```typescript
// test/helpers/transactional-test.helper.ts
import { DataSource, QueryRunner } from 'typeorm';

export class TransactionalTestContext {
  private queryRunner: QueryRunner;

  constructor(private readonly dataSource: DataSource) {}

  async start(): Promise<void> {
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();

    // Monkey-patch the dataSource manager to use our transaction
    // This ensures all repository operations use the same transaction
    Object.defineProperty(this.dataSource, 'manager', {
      value: this.queryRunner.manager,
      configurable: true,
    });
  }

  async finish(): Promise<void> {
    await this.queryRunner.rollbackTransaction();
    await this.queryRunner.release();
  }
}

// Usage in integration tests:
describe('UserRepository (Integration)', () => {
  let transactionalContext: TransactionalTestContext;

  beforeEach(async () => {
    transactionalContext = new TransactionalTestContext(dataSource);
    await transactionalContext.start();
  });

  afterEach(async () => {
    await transactionalContext.finish(); // Rolls back — database is clean
  });

  it('should save and retrieve a user', async () => {
    const repo = dataSource.getRepository(UserEntity);

    const saved = await repo.save({
      email: 'test@example.com',
      name: 'Test',
      passwordHash: 'xxx',
    });

    const found = await repo.findOne({ where: { id: saved.id } });
    expect(found).toMatchObject({ email: 'test@example.com', name: 'Test' });
    // After the test, the transaction rolls back — this user does not persist
  });
});
```

### Testing Migrations

```typescript
// test/migrations/migration.integration.spec.ts
import { DataSource } from 'typeorm';

describe('Database Migrations', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      migrations: ['src/migrations/*.ts'],
      migrationsRun: false, // We will run them manually
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should run all migrations up successfully', async () => {
    const pendingMigrations = await dataSource.showMigrations();
    expect(pendingMigrations).toBe(true); // There are pending migrations

    await dataSource.runMigrations();

    const stillPending = await dataSource.showMigrations();
    expect(stillPending).toBe(false); // All migrations applied
  });

  it('should revert all migrations successfully', async () => {
    // Run all migrations first
    await dataSource.runMigrations();

    // Get the count of applied migrations
    const migrations = await dataSource.query(
      'SELECT * FROM migrations ORDER BY timestamp DESC',
    );

    // Revert each migration one by one
    for (let i = 0; i < migrations.length; i++) {
      await dataSource.undoLastMigration();
    }

    // Verify all reverted
    const remaining = await dataSource.query('SELECT * FROM migrations');
    expect(remaining).toHaveLength(0);
  });

  it('should produce the correct schema after all migrations', async () => {
    await dataSource.runMigrations();

    // Verify key tables exist with expected columns
    const columns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column_name: 'id', data_type: 'uuid' }),
        expect.objectContaining({ column_name: 'email', data_type: 'character varying' }),
        expect.objectContaining({ column_name: 'name', data_type: 'character varying' }),
        expect.objectContaining({ column_name: 'created_at', data_type: 'timestamp with time zone' }),
      ]),
    );

    // Verify indexes exist
    const indexes = await dataSource.query(`
      SELECT indexname FROM pg_indexes WHERE tablename = 'users'
    `);
    const indexNames = indexes.map((i: any) => i.indexname);
    expect(indexNames).toContain('idx_users_email');
  });
});
```

### Testing Complex Queries

```typescript
// order.repository.integration.spec.ts
describe('OrderRepository (Integration)', () => {
  let orderRepo: Repository<OrderEntity>;
  let userRepo: Repository<UserEntity>;

  beforeAll(async () => {
    orderRepo = dataSource.getRepository(OrderEntity);
    userRepo = dataSource.getRepository(UserEntity);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE orders, users CASCADE');

    // Seed base data
    await userRepo.save([
      { id: 'u1', email: 'alice@test.com', name: 'Alice', passwordHash: 'x' },
      { id: 'u2', email: 'bob@test.com', name: 'Bob', passwordHash: 'x' },
    ]);
  });

  it('should find orders with total greater than threshold', async () => {
    await orderRepo.save([
      { userId: 'u1', total: 5000, status: 'confirmed' },
      { userId: 'u1', total: 500, status: 'confirmed' },
      { userId: 'u2', total: 15000, status: 'confirmed' },
    ]);

    const highValueOrders = await orderRepo
      .createQueryBuilder('order')
      .where('order.total > :threshold', { threshold: 1000 })
      .orderBy('order.total', 'DESC')
      .getMany();

    expect(highValueOrders).toHaveLength(2);
    expect(highValueOrders[0].total).toBe(15000);
    expect(highValueOrders[1].total).toBe(5000);
  });

  it('should correctly aggregate order totals per user', async () => {
    await orderRepo.save([
      { userId: 'u1', total: 1000, status: 'confirmed' },
      { userId: 'u1', total: 2000, status: 'confirmed' },
      { userId: 'u1', total: 500, status: 'cancelled' }, // Should be excluded
      { userId: 'u2', total: 3000, status: 'confirmed' },
    ]);

    const result = await orderRepo
      .createQueryBuilder('order')
      .select('order.userId', 'userId')
      .addSelect('SUM(order.total)', 'totalSpent')
      .addSelect('COUNT(*)', 'orderCount')
      .where('order.status = :status', { status: 'confirmed' })
      .groupBy('order.userId')
      .orderBy('"totalSpent"', 'DESC')
      .getRawMany();

    expect(result).toEqual([
      { userId: 'u1', totalSpent: '3000', orderCount: '2' },
      { userId: 'u2', totalSpent: '3000', orderCount: '1' },
    ]);
  });

  it('should enforce unique constraint on user email', async () => {
    await expect(
      userRepo.save({ id: 'u3', email: 'alice@test.com', name: 'Duplicate', passwordHash: 'x' }),
    ).rejects.toThrow(); // Unique constraint violation
  });
});
```

> **Interview Tip:** When asked about testing database interactions, emphasize the repository pattern and how it enables different testing strategies at different levels. Say: "I mock repositories in unit tests to keep them fast. In integration tests, I use test containers with real PostgreSQL to catch SQL-level bugs. The repository pattern makes this swap trivial."

> **Common Follow-up:** "How do you handle test data for a large test suite?" Answer: Test data factories with sensible defaults and per-test overrides. Each test creates only the data it needs. I use TRUNCATE CASCADE between tests for speed, or transaction rollback for maximum isolation with zero cleanup cost.

---

## Q12: Code Quality Tools

**Q: Beyond testing, what tools and practices do you use to maintain code quality? How do you set up a quality pipeline?**

**A:**

Testing catches bugs in behavior. Code quality tools catch bugs in style, structure, security, and maintainability before the code is even executed.

### ESLint: Static Analysis for TypeScript/Node.js

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-config-prettier eslint-plugin-import
```

```typescript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/typescript',
    'prettier', // Must be last — disables formatting rules that conflict with Prettier
  ],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/'],
  rules: {
    // Catch real bugs
    '@typescript-eslint/no-floating-promises': 'error',   // Unhandled promises
    '@typescript-eslint/no-misused-promises': 'error',     // Passing async fn where sync expected
    '@typescript-eslint/await-thenable': 'error',          // Await on non-promise
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off', // Too noisy in NestJS
    '@typescript-eslint/no-explicit-any': 'warn',          // Warn, not error — sometimes needed
    'no-console': ['warn', { allow: ['warn', 'error'] }],  // Use a logger instead

    // Import hygiene
    'import/order': ['error', {
      groups: [['builtin', 'external'], 'internal', ['parent', 'sibling']],
      'newlines-between': 'always',
      alphabetize: { order: 'asc' },
    }],
    'import/no-duplicates': 'error',

    // Best practices
    'no-return-await': 'error',       // Unnecessary return await
    'prefer-const': 'error',           // Use const when not reassigned
    'no-var': 'error',                 // Always let/const
    'eqeqeq': ['error', 'always'],    // === instead of ==
  },
};
```

**The rules that matter most for backend Node.js:**
- `@typescript-eslint/no-floating-promises` — Catches unhandled promise rejections, the #1 source of silent failures in Node.js.
- `@typescript-eslint/no-misused-promises` — Catches passing async functions to array methods like `.forEach()` that do not await them.
- `no-console` — Forces the team to use a structured logger (Pino, Winston) instead of `console.log`.

### Prettier: Consistent Formatting

```bash
npm install --save-dev prettier
```

```jsonc
// .prettierrc
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf",
  "arrowParens": "always"
}
```

```
// .prettierignore
dist
coverage
node_modules
*.md
```

**Key principle:** Prettier handles formatting. ESLint handles logic. Never configure formatting rules in ESLint when you use Prettier.

### Husky + lint-staged: Pre-Commit Hooks

```bash
npm install --save-dev husky lint-staged
npx husky init
```

```jsonc
// package.json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

```bash
# .husky/pre-push (optional — run tests before pushing)
npm run test -- --bail --changedSince=main
```

**Why this matters:** Code that does not pass lint and format checks never makes it into the repository. This prevents "fix lint" commits and keeps the codebase clean from the start.

### SonarQube / SonarCloud

SonarQube provides deeper static analysis: code smells, security vulnerabilities, duplication, and complexity metrics.

```yaml
# sonar-project.properties
sonar.projectKey=my-backend-service
sonar.sources=src
sonar.tests=test
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.exclusions=**/node_modules/**,**/dist/**,**/*.spec.ts

# Quality gate thresholds
# - No new bugs
# - No new vulnerabilities
# - New code coverage > 80%
# - Duplicated lines on new code < 3%
# - Maintainability rating A
```

**What SonarQube catches that ESLint does not:**
- Cognitive complexity (functions that are too hard to understand)
- Duplicated code blocks across files
- Security hotspots (hardcoded credentials, SQL injection patterns)
- Technical debt estimation

### Dependency Vulnerability Scanning

```bash
# Built-in npm audit
npm audit
npm audit fix

# More comprehensive: Snyk
npx snyk test            # Check for known vulnerabilities
npx snyk monitor         # Continuously monitor in CI
```

```yaml
# In CI pipeline:
- name: Security audit
  run: |
    npm audit --audit-level=high
    # Fail the build if there are high or critical vulnerabilities

- name: Snyk scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**Additional tools:**
- **Dependabot / Renovate** — Automated dependency update PRs.
- **Socket.dev** — Detects supply chain attacks in npm packages.
- **Trivy** — Scans Docker images for vulnerabilities.

### Code Review Checklist for Senior/Lead Engineers

```markdown
## Code Review Quality Checklist

### Correctness
- [ ] Does the code do what the PR description says?
- [ ] Are edge cases handled (null, empty, boundary values)?
- [ ] Are errors handled properly (not swallowed, logged, returned to caller)?
- [ ] Are database transactions used where needed (multi-step operations)?

### Security
- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all external data (DTOs, query params)
- [ ] SQL injection protection (parameterized queries, never string concatenation)
- [ ] Authorization checks on all endpoints
- [ ] Sensitive data not logged or returned in API responses

### Performance
- [ ] No N+1 queries (use eager loading or DataLoader)
- [ ] Database queries have appropriate indexes
- [ ] Large datasets use pagination
- [ ] Expensive operations are cached or queued

### Testing
- [ ] New code has tests (unit and/or integration as appropriate)
- [ ] Tests cover happy path AND error cases
- [ ] Tests are meaningful (not just toBeDefined)
- [ ] No flaky patterns (shared state, time-dependent, random data)

### Maintainability
- [ ] Code follows existing patterns and conventions
- [ ] Functions are focused (single responsibility)
- [ ] Variable names are descriptive
- [ ] Complex logic has comments explaining WHY (not what)
- [ ] No dead code or commented-out blocks
```

### CI/CD Quality Gates — What to Enforce

```yaml
# .github/workflows/quality.yml
name: Quality Gate

on:
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci

      # Gate 1: TypeScript compilation
      - name: Type check
        run: npx tsc --noEmit

      # Gate 2: Linting
      - name: Lint
        run: npx eslint 'src/**/*.ts' --max-warnings 0

      # Gate 3: Formatting
      - name: Format check
        run: npx prettier --check 'src/**/*.ts'

      # Gate 4: Unit tests with coverage
      - name: Unit tests
        run: npm run test -- --ci --coverage --maxWorkers=2

      # Gate 5: Coverage threshold
      - name: Check coverage
        run: |
          npx jest --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80}}'

      # Gate 6: Security audit
      - name: Audit dependencies
        run: npm audit --audit-level=high

      # Gate 7: Build succeeds
      - name: Build
        run: npm run build
```

**Order matters:** Type check and lint first (fast, catches obvious errors), then tests (slower), then build (slowest). Fail fast.

> **Interview Tip:** When asked about code quality, go beyond "we use ESLint." Describe the full pipeline: static analysis, formatting, pre-commit hooks, CI quality gates, dependency scanning, and code review standards. Show that you think about quality as a system, not just a tool.

> **Common Follow-up:** "How do you balance speed of development with quality enforcement?" Answer: Automate everything possible. Developers should not spend mental energy on formatting or import ordering — tools handle that. The CI pipeline catches the rest. The only manual step is code review, which focuses on design decisions and business logic, not style.

---

## Q13: Testing Strategies for Senior/Lead Roles

**Q: You inherit a codebase with 0% test coverage. What is your plan? How do you build a testing culture?**

**A:**

This is one of the most common and revealing senior/lead interview questions. It tests your ability to think strategically, prioritize, and lead change.

### The 0% Coverage Rescue Plan

**Phase 1: Stop the bleeding (Week 1-2)**

```markdown
1. Add CI pipeline that runs lint + type-check on every PR.
2. Require tests for ALL new code going forward (enforce in code review).
3. Set initial coverage threshold at current level (0%) — this prevents
   it from going further down. Ratchet it up over time.
4. Add pre-commit hooks (Husky + lint-staged) for formatting and linting.
```

**Phase 2: Test the riskiest paths (Week 3-8)**

```markdown
1. Identify the "blast radius" — what code, if broken, causes the most damage?
   - Payment processing
   - Authentication/authorization
   - Data mutations (create, update, delete)
   - External integrations (APIs, queues)

2. Write integration tests for critical API endpoints FIRST.
   Why integration over unit? Because you get the most confidence per test
   in a legacy codebase where you do not fully understand the internals.

3. Write unit tests for complex business logic.
   Find functions with many branches, complex calculations, or error handling.

4. Create test utilities: factories, database helpers, mock builders.
   This makes it easy for the team to write tests.
```

**Phase 3: Build the habit (Week 9+)**

```markdown
1. Every bug fix starts with a test that reproduces the bug ("test-first bug fix").
2. Every feature PR must include tests (enforced in code review, not just CI).
3. Gradually increase coverage threshold by 5% per sprint.
4. Track and celebrate improvements: "We went from 0% to 45% in 3 months."
5. Share "tests saved us" stories with the team.
```

### Introducing Testing Culture to a Resistant Team

| Resistance | Response |
|-----------|----------|
| "We don't have time for tests" | Tests reduce debugging time and prevent regression bugs. Show data: time spent fixing bugs vs time spent writing tests. |
| "Tests slow us down" | Only at first. After a few weeks, tests speed you up because you stop manually verifying everything. |
| "Our code is too messy to test" | Start with integration tests that treat the code as a black box. Refactor toward testability incrementally. |
| "I don't know how to write tests" | Pair programming sessions. Write the first tests together. Create templates and examples. |
| "Tests are boring" | Make it about confidence: "With tests, you can refactor fearlessly and deploy on Friday." |

### Testing Strategy Document

As a lead, you should create a testing strategy document for your team. Here is what it includes:

```markdown
# Testing Strategy: Order Service

## Testing Levels

### Unit Tests
- **What to test:** Business logic, validation, calculations, transformations
- **Framework:** Jest with ts-jest
- **Convention:** `*.spec.ts` colocated with source files
- **Coverage target:** 80% line coverage
- **Run command:** `npm test`

### Integration Tests
- **What to test:** API endpoints, database queries, service wiring
- **Framework:** Jest + Supertest + Test Containers
- **Convention:** `*.integration.spec.ts` in `test/integration/`
- **Database:** Real PostgreSQL via @testcontainers/postgresql
- **Run command:** `npm run test:integration`

### E2E Tests
- **What to test:** Critical business flows only
  - Order creation -> payment -> confirmation
  - User registration -> email verification -> login
- **Convention:** `*.e2e-spec.ts` in `test/e2e/`
- **Run command:** `npm run test:e2e`

## What NOT to Test
- TypeORM entity definitions (tested implicitly by integration tests)
- NestJS module definitions
- DTOs (tested implicitly by validation pipe tests)
- Third-party library internals

## Test Data
- Use TestFactory (see `test/factories/`) for creating test entities
- Each test creates its own data — no shared fixtures
- Database is cleaned via TRUNCATE CASCADE between tests

## CI Pipeline
- Unit tests: every PR (blocking)
- Integration tests: every PR (blocking)
- E2E tests: before merge to main (blocking)
- Coverage report: uploaded to Codecov

## Ownership
- Every developer writes tests for their own code
- Test failures are treated as bugs — fixed immediately, not skipped
- Flaky tests must be fixed within 24 hours or quarantined
```

### Measuring Test Effectiveness with Mutation Testing

Code coverage tells you which lines are executed. Mutation testing tells you if your tests actually catch bugs.

```bash
# Install Stryker for TypeScript
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner \
  @stryker-mutator/typescript-checker
```

```typescript
// stryker.conf.mts
import { type PartialStrykerOptions } from '@stryker-mutator/api/core';

const config: PartialStrykerOptions = {
  mutate: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
  testRunner: 'jest',
  jest: {
    configFile: 'jest.config.ts',
  },
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  reporters: ['html', 'clear-text', 'progress'],
  thresholds: {
    high: 80,
    low: 60,
    break: 50, // Fail if mutation score drops below 50%
  },
};

export default config;
```

**How mutation testing works:**
1. Stryker modifies (mutates) your source code in small ways:
   - Changes `>` to `>=` or `<`
   - Changes `true` to `false`
   - Removes function calls
   - Changes `+` to `-`
2. For each mutation, it runs your tests.
3. If the tests pass with the mutation — your tests did not catch it (a "survived mutant").
4. If the tests fail — your tests caught it (a "killed mutant").

```
Mutation score: 85% (170/200 mutants killed)

Surviving mutants (your tests missed these):
- src/order.service.ts:45 — Changed > to >= (boundary bug!)
- src/discount.ts:12 — Removed call to validateCoupon() (missing side effect test!)
```

**When to use mutation testing:**
- On critical business logic (billing, authorization).
- When you suspect your tests are shallow despite high coverage.
- As a periodic audit (monthly or quarterly), not on every CI run (it is slow).

### Flaky Tests: Diagnosis and Prevention

```typescript
// Common flaky test patterns and fixes:

// FLAKY: Relies on timing
it('should debounce calls', async () => {
  service.debouncedSave(data);
  await new Promise(r => setTimeout(r, 500)); // Might not be enough!
  expect(repo.save).toHaveBeenCalledTimes(1);
});

// FIXED: Use fake timers
it('should debounce calls', async () => {
  jest.useFakeTimers();
  service.debouncedSave(data);
  jest.advanceTimersByTime(500);
  expect(repo.save).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

// FLAKY: Relies on object key ordering
it('should return user data', async () => {
  const result = await service.getUser('1');
  expect(JSON.stringify(result)).toBe('{"id":"1","name":"Test","email":"test@t.com"}');
});

// FIXED: Use structural comparison
it('should return user data', async () => {
  const result = await service.getUser('1');
  expect(result).toMatchObject({ id: '1', name: 'Test', email: 'test@t.com' });
});

// FLAKY: Tests run in parallel and share a database row
it('should update user count', async () => {
  await service.incrementUserCount(); // Another test might also be modifying this!
  const count = await service.getUserCount();
  expect(count).toBe(1); // Might be 2 if another test ran concurrently
});

// FIXED: Each test uses its own isolated data
it('should update user count', async () => {
  const tenant = await createIsolatedTenant(); // Unique per test
  await service.incrementUserCount(tenant.id);
  const count = await service.getUserCount(tenant.id);
  expect(count).toBe(1);
});
```

### Keeping Test Suites Fast

| Technique | Impact |
|-----------|--------|
| **Run tests in parallel** (`--maxWorkers`) | High — uses all CPU cores |
| **Use `--bail`** flag | Stop on first failure in CI — fast feedback |
| **Use `--changedSince=main`** | Only run tests for changed files (great for local dev) |
| **Separate unit and integration configs** | Unit tests run in <10s; integration tests run separately |
| **Mock heavy dependencies** in unit tests | Removes I/O latency |
| **Use transaction rollback** instead of TRUNCATE | Faster DB cleanup |
| **Cache Docker images** in CI | Avoids re-pulling test containers |
| **Shard tests across CI runners** | `jest --shard=1/3` for parallel CI jobs |

```bash
# Local development: only run tests for files you changed
npx jest --watch                    # Re-runs on file save
npx jest --changedSince=main        # Only files changed since main branch
npx jest --onlyChanged              # Only uncommitted changes

# CI: fast feedback
npx jest --bail --ci --maxWorkers=2

# CI: parallel sharding across 3 runners
# Runner 1: npx jest --shard=1/3
# Runner 2: npx jest --shard=2/3
# Runner 3: npx jest --shard=3/3
```

> **Interview Tip:** The "0% coverage rescue plan" question tests leadership, not just technical knowledge. Structure your answer in phases. Show that you are pragmatic (not "rewrite everything"), empathetic to the team (not "you should have been testing"), and strategic (focus on risk, not coverage numbers).

> **Common Follow-up:** "How do you measure if your testing strategy is working?" Answer: Track four metrics: (1) bug escape rate (bugs found in production vs caught in testing), (2) coverage trend over time, (3) test suite run time, and (4) developer confidence — are people comfortable deploying on Friday?

---

## Quick Reference

### Jest CLI Commands Cheat Sheet

```bash
# Run all tests
npx jest

# Run tests in watch mode (re-runs on file change)
npx jest --watch

# Run a specific test file
npx jest user.service.spec.ts

# Run tests matching a name pattern
npx jest --testNamePattern="should create"

# Run tests matching a file path pattern
npx jest --testPathPattern="order"

# Run with coverage
npx jest --coverage

# Run only changed files (CI optimization)
npx jest --changedSince=main

# Run only uncommitted changes
npx jest --onlyChanged

# Run integration tests (separate config)
npx jest --config jest.integration.config.ts

# Run E2E tests (separate config)
npx jest --config jest.e2e.config.ts

# Stop on first failure
npx jest --bail

# Run tests serially (useful for debugging)
npx jest --runInBand

# Debug a specific test file
node --inspect-brk node_modules/.bin/jest --runInBand user.service.spec.ts

# Clear Jest cache (fixes mysterious failures)
npx jest --clearCache

# List all tests without running them
npx jest --listTests

# Run with verbose output (show individual test names)
npx jest --verbose

# Shard tests for parallel CI (runner 1 of 3)
npx jest --shard=1/3

# Detect tests that do not clean up properly
npx jest --detectOpenHandles --forceExit
```

### Common Assertion Patterns

```typescript
// === VALUE ASSERTIONS ===
expect(value).toBe(5);                          // Strict equality (===)
expect(obj).toEqual({ a: 1, b: 2 });            // Deep equality
expect(obj).toStrictEqual({ a: 1 });             // Deep equality + no extra undefined props
expect(obj).toMatchObject({ a: 1 });             // Partial match (obj can have more keys)

// === TRUTHINESS ===
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// === NUMBERS ===
expect(num).toBeGreaterThan(3);
expect(num).toBeLessThanOrEqual(10);
expect(0.1 + 0.2).toBeCloseTo(0.3, 5);          // Floating point

// === STRINGS ===
expect(str).toMatch(/pattern/);
expect(str).toContain('substring');
expect(str).toHaveLength(5);

// === ARRAYS ===
expect(arr).toContain('item');                    // Primitive item
expect(arr).toContainEqual({ id: 1 });            // Object item (deep equal)
expect(arr).toHaveLength(3);
expect(arr).toEqual(expect.arrayContaining([1, 3])); // Contains at least these

// === ERRORS ===
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('specific message');
expect(() => fn()).toThrow(CustomError);
await expect(asyncFn()).rejects.toThrow('message');
await expect(asyncFn()).resolves.toEqual(value);

// === MOCK/SPY ASSERTIONS ===
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenLastCalledWith('arg');
expect(mockFn).toHaveBeenNthCalledWith(1, 'first call arg');
expect(mockFn).not.toHaveBeenCalled();
expect(mockFn).toHaveReturnedWith(value);

// === ASYMMETRIC MATCHERS (powerful for partial matching) ===
expect(result).toEqual({
  id: expect.any(String),
  email: expect.stringContaining('@'),
  roles: expect.arrayContaining(['user']),
  metadata: expect.objectContaining({ version: 2 }),
  createdAt: expect.any(Date),
});

// Negation
expect(result).toEqual(expect.not.objectContaining({ password: expect.anything() }));
```

### NestJS Testing Utilities Reference

```typescript
import { Test, TestingModule } from '@nestjs/testing';

// --- Creating a test module ---
const module: TestingModule = await Test.createTestingModule({
  imports: [AppModule],          // Import real modules
  controllers: [UserController], // Or specify individual components
  providers: [
    UserService,
    { provide: UserRepository, useValue: mockRepo }, // Mock a provider
  ],
})
  .overrideProvider(UserRepository).useValue(mockRepo)  // Override after definition
  .overrideGuard(AuthGuard).useValue({ canActivate: () => true }) // Bypass auth
  .overrideInterceptor(LoggingInterceptor).useValue({})  // Remove interceptor
  .overridePipe(ValidationPipe).useValue(new ValidationPipe()) // Custom pipe
  .compile();

// --- Getting instances ---
const service = module.get<UserService>(UserService);
const controller = module.get<UserController>(UserController);
const repo = module.get<UserRepository>(UserRepository);

// --- Creating an app for HTTP testing ---
const app: INestApplication = module.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.useGlobalFilters(new HttpExceptionFilter());
app.useGlobalInterceptors(new TransformInterceptor());
await app.init();

// --- Cleanup ---
await app.close();
await module.close();
```

### Testing Decision Flowchart

```
What are you testing?
│
├── Pure business logic / calculation / validation?
│   └── UNIT TEST with mocked dependencies
│       Tool: Jest + jest.fn()
│
├── API endpoint behavior (HTTP request → response)?
│   └── INTEGRATION TEST with Supertest
│       Tool: Jest + Supertest + Test.createTestingModule()
│       Database: Test containers (real PostgreSQL)
│
├── Database query / repository method?
│   ├── Simple CRUD? → Tested implicitly by integration tests
│   └── Complex query (joins, aggregations)? → INTEGRATION TEST with real DB
│       Tool: Jest + TypeORM + Test containers
│
├── Cross-service contract (microservices)?
│   └── CONTRACT TEST with Pact
│       Tool: @pact-foundation/pact
│
├── Critical multi-step business flow?
│   └── E2E TEST
│       Tool: Jest + Supertest + real DB + mocked external services
│
├── Event consumer (Kafka, RabbitMQ)?
│   └── UNIT TEST the handler logic (mock the broker)
│       + INTEGRATION TEST the full consume → process → persist flow
│
├── Scheduled job / cron?
│   └── UNIT TEST the job handler (test business logic, not the schedule)
│
├── Guard / Pipe / Interceptor?
│   └── UNIT TEST with mock ExecutionContext
│
└── External API client?
    └── UNIT TEST with mocked HTTP client
        + CONTRACT TEST against the provider's Pact
```

```
Should you mock it?
│
├── Database → Mock in unit tests, real in integration tests
├── HTTP client → Always mock (use nock or jest.mock)
├── Message broker → Always mock the transport, test the handler logic
├── Redis/Cache → Mock in unit tests, real (test container) in integration tests
├── File system → Mock (use memfs or jest.mock('fs'))
├── Time (Date.now, setTimeout) → Use jest.useFakeTimers()
├── Logger → Mock (verify log calls, prevent noise)
└── Same-service classes → Prefer real instances; mock only external boundaries
```

---

## Summary: What to Know for Interviews

| Topic | Key Point to Mention |
|-------|---------------------|
| Testing Pyramid | Know the levels and trade-offs; adapt strategy to the codebase, not dogma |
| Jest | Comfortable with matchers, async testing, lifecycle hooks, fake timers |
| Test Doubles | Know the difference between mock, stub, spy, fake — and when to use each |
| NestJS Testing | Use `Test.createTestingModule()`, override providers, test all component types |
| Integration Tests | Supertest for HTTP, test containers for real databases |
| E2E Tests | Selective, focused on critical paths, not a replacement for integration tests |
| TDD | Understand Red-Green-Refactor; honest about when you use it and when you do not |
| Coverage | 80% baseline, higher for critical code; meaningful assertions over numbers |
| Code Coverage | Know line vs branch vs function coverage; 100% is a trap |
| Async Testing | Fake timers, proper awaiting, idempotency for event consumers |
| Database Testing | Repository pattern, test containers, transaction rollback, test data factories |
| Code Quality | ESLint + Prettier + Husky + CI quality gates as a system |
| Mutation Testing | Stryker for measuring test effectiveness beyond line coverage |
| Legacy Codebases | Phase-based approach: stop bleeding, test risky paths, build the habit |
| Leadership | Testing strategy document, culture building, metrics (bug escape rate) |
| Flaky Tests | Causes (shared state, timing, randomness) and systematic fixes |
| Best Practices | AAA pattern, test isolation, factories, flaky test prevention |
