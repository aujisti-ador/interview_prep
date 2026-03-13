# Performance Engineering — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with practical TypeScript/Node.js code examples
> **Last Updated:** 2026-03-13

---

## Table of Contents

1. [Performance Engineering Fundamentals](#q1-performance-engineering-fundamentals)
2. [Load Testing](#q2-load-testing)
3. [Node.js Profiling & Diagnostics](#q3-nodejs-profiling--diagnostics)
4. [Database Performance Optimization](#q4-database-performance-optimization)
5. [API Performance Optimization](#q5-api-performance-optimization)
6. [Caching Performance](#q6-caching-performance)
7. [Application-Level Optimization](#q7-application-level-optimization)
8. [Infrastructure-Level Optimization](#q8-infrastructure-level-optimization)
9. [Benchmarking & Performance Testing Strategy](#q9-benchmarking--performance-testing-strategy)
10. [Common Performance Interview Questions](#q10-common-performance-interview-questions)
11. [Quick Reference](#quick-reference)

---

## Q1: Performance Engineering Fundamentals

### Q: What is performance engineering and how does it differ from performance testing?

**A:** Performance engineering is a **proactive, end-to-end discipline** that embeds performance into every phase of the software lifecycle — from architecture and design through coding, testing, deployment, and operations. Performance testing is just one activity within that discipline.

| Aspect | Performance Testing | Performance Engineering |
|---|---|---|
| **Scope** | Test execution & measurement | Full lifecycle practice |
| **Timing** | Usually late in SDLC | From day 1 of design |
| **Focus** | "Does it meet the SLA?" | "How do we ensure it always meets the SLA?" |
| **Activities** | Load tests, stress tests | Profiling, architecture review, capacity planning, optimization, monitoring |
| **Mindset** | Reactive (find problems) | Proactive (prevent problems) |

> **Interview tip:** "At Banglalink, performance engineering meant designing for 41M subscribers from the start — choosing async message queues for notifications, connection pooling for database access, and caching layers for frequently accessed data — not just running load tests before release."

### Q: What are the key performance metrics and why do percentiles matter more than averages?

**A:** The four golden signals of performance:

| Metric | What It Measures | Example Target |
|---|---|---|
| **Latency** | Time to serve a request | p99 < 200ms |
| **Throughput** | Requests processed per unit time | > 5,000 RPS |
| **Error rate** | Percentage of failed requests | < 0.1% |
| **Saturation** | How full a resource is | CPU < 70%, Memory < 80% |

**Why percentiles, not averages:**

```
Scenario: 100 requests
- 99 requests: 50ms each
- 1 request: 5,000ms

Average: (99 × 50 + 1 × 5000) / 100 = 99.5ms  ← looks fine!
p50: 50ms   ← median user experience
p95: 50ms   ← still looks fine
p99: 5000ms ← 1% of users wait 100x longer!
```

Averages **hide outliers**. In a system serving 41M users, p99 = 5s means **410,000 users** experience a 5-second wait. That is not acceptable.

**Key percentiles:**

| Percentile | What It Tells You |
|---|---|
| **p50** (median) | Typical user experience |
| **p95** | What the "slightly unlucky" user sees |
| **p99** | Tail latency — worst 1% experience |
| **p99.9** | Extreme tail (important at massive scale) |

> **Interview tip:** "Never say average latency. Always talk in percentiles. A p50 of 50ms with p99 of 5s means 1% of your users wait 100x longer. At Banglalink scale (41M users), that 1% is 410,000 people."

### Q: Explain Amdahl's Law and Little's Law. How do they apply to backend systems?

**A:**

**Amdahl's Law** — speedup is limited by the sequential portion of work:

```
Speedup = 1 / (S + (1 - S) / N)

Where:
  S = fraction of work that is sequential (cannot be parallelized)
  N = number of parallel processors/workers
```

**Practical example:**

```
Your API handler:
  - 20% sequential (parse request, validate, serialize response)
  - 80% parallelizable (database queries, external API calls)

With 4 worker threads:
  Speedup = 1 / (0.2 + 0.8/4) = 1 / (0.2 + 0.2) = 1 / 0.4 = 2.5x

With 100 worker threads:
  Speedup = 1 / (0.2 + 0.8/100) = 1 / (0.2 + 0.008) = 1 / 0.208 = 4.8x

With infinite workers:
  Speedup = 1 / 0.2 = 5x maximum (never more!)
```

**Takeaway:** Adding more instances has **diminishing returns**. To get real speedup, reduce the sequential portion (optimize the critical path).

**Little's Law** — relates concurrency, throughput, and latency:

```
L = λ × W

Where:
  L = average number of concurrent requests in the system
  λ = average arrival rate (throughput, e.g., requests/second)
  W = average time each request spends in the system (latency)
```

**Practical example:**

```
Your API:
  - Handles 1,000 RPS (λ = 1000)
  - Average latency 200ms (W = 0.2s)
  - Concurrent requests: L = 1000 × 0.2 = 200

If your server has a connection pool of 100:
  → Bottleneck! You need at least 200 connections.
  → Or reduce latency to 100ms: L = 1000 × 0.1 = 100 (fits the pool)
```

**Performance budget:** Define hard limits your system must meet, e.g.:

```
Performance Budget:
  - p99 latency < 200ms
  - Throughput > 5,000 RPS
  - Error rate < 0.1%
  - CPU utilization < 70% at peak
  - Memory utilization < 80% at peak
```

---

## Q2: Load Testing

### Q: What are the different types of load tests and when do you use each?

**A:**

| Test Type | Purpose | Traffic Pattern | Duration | When to Use |
|---|---|---|---|---|
| **Load test** | Validate expected traffic | Ramp up to expected RPS | 15-60 min | Every release |
| **Stress test** | Find the breaking point | Go beyond expected RPS | 15-30 min | Capacity planning |
| **Spike test** | Handle sudden bursts | Jump from low to very high instantly | 5-10 min | Flash sale, viral event |
| **Soak/endurance** | Find memory leaks & degradation | Steady load for hours | 4-24 hours | Monthly or before major release |
| **Breakpoint** | Discover system limits | Gradual increase until failure | Until failure | Capacity planning |

> **BD context:** "At Banglalink, we load tested the notification service to ensure 1M notifications/minute without degradation. We also ran soak tests for 8 hours to catch memory leaks in the Node.js service that only showed up after hours of sustained load."

### Q: Show a practical load testing setup using k6 for a NestJS API.

**A:** k6 (by Grafana Labs) is the modern standard for load testing. It uses JavaScript for scripting and runs efficiently in Go.

**Basic k6 script for a NestJS API:**

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const productListTrend = new Trend('product_list_duration');

export const options = {
  scenarios: {
    // Scenario 1: Ramp up gradually (load test)
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Ramp up to 100 users
        { duration: '5m', target: 100 },   // Stay at 100 users
        { duration: '2m', target: 200 },   // Ramp up to 200
        { duration: '5m', target: 200 },   // Stay at 200
        { duration: '2m', target: 0 },     // Ramp down
      ],
    },
    // Scenario 2: Constant request rate (throughput test)
    throughput_test: {
      executor: 'constant-arrival-rate',
      rate: 1000,              // 1000 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 200,
      maxVUs: 500,
      startTime: '20m',       // Start after load_test
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],  // p95 < 200ms, p99 < 500ms
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    errors: ['rate<0.01'],                           // Custom error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://api:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

export default function () {
  group('Product API', () => {
    // GET /api/products — List products (cached)
    const listRes = http.get(`${BASE_URL}/api/products?page=1&limit=20`, {
      headers,
      tags: { name: 'GET /api/products' },
    });
    check(listRes, {
      'list: status is 200': (r) => r.status === 200,
      'list: response time < 200ms': (r) => r.timings.duration < 200,
      'list: has products': (r) => JSON.parse(r.body).data.length > 0,
    }) || errorRate.add(1);
    productListTrend.add(listRes.timings.duration);

    // GET /api/products/:id — Single product
    const detailRes = http.get(`${BASE_URL}/api/products/1`, {
      headers,
      tags: { name: 'GET /api/products/:id' },
    });
    check(detailRes, {
      'detail: status is 200': (r) => r.status === 200,
      'detail: response time < 100ms': (r) => r.timings.duration < 100,
    }) || errorRate.add(1);

    // POST /api/orders — Create order (write path)
    const orderPayload = JSON.stringify({
      productId: 1,
      quantity: Math.floor(Math.random() * 5) + 1,
    });
    const orderRes = http.post(`${BASE_URL}/api/orders`, orderPayload, {
      headers,
      tags: { name: 'POST /api/orders' },
    });
    check(orderRes, {
      'order: status is 201': (r) => r.status === 201,
      'order: response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);
  });

  sleep(1); // Think time between iterations
}

// Run with: k6 run --out json=results.json load-test.js
// With env vars: k6 run -e BASE_URL=http://staging:3000 -e AUTH_TOKEN=xxx load-test.js
```

**Spike test scenario:**

```javascript
export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1000 },  // Instant spike to 1000 users
        { duration: '1m', target: 1000 },    // Hold
        { duration: '10s', target: 0 },      // Drop to 0
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // Relaxed: p95 < 1s during spike
    http_req_failed: ['rate<0.05'],     // Allow up to 5% errors during spike
  },
};
```

### Q: How do you integrate load testing into CI/CD?

**A:**

```yaml
# .github/workflows/load-test.yml
name: Load Test on Staging

on:
  push:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        run: |
          # Deploy latest code to staging environment
          ./scripts/deploy-staging.sh

      - name: Run k6 load test
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/load/load-test.js
          flags: >-
            -e BASE_URL=${{ secrets.STAGING_URL }}
            -e AUTH_TOKEN=${{ secrets.STAGING_TOKEN }}
            --out json=results.json

      - name: Check results
        run: |
          # k6 exits with non-zero if thresholds are breached
          # Parse results for reporting
          node scripts/parse-k6-results.js results.json

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: results.json
```

**Load testing tool comparison:**

| Tool | Language | Protocol | Best For | Distributed |
|---|---|---|---|---|
| **k6** | JavaScript/Go | HTTP, gRPC, WS | Modern API testing | Yes (k6 Cloud) |
| **Artillery** | YAML/JS | HTTP, WS, Socket.IO | Quick YAML-based tests | Yes (Artillery Cloud) |
| **JMeter** | Java (GUI) | HTTP, JDBC, JMS | Complex scenarios with GUI | Yes (JMeter clusters) |
| **Locust** | Python | HTTP | Python teams | Yes (distributed mode) |
| **wrk** | Lua | HTTP | Simple benchmarking | No |
| **autocannon** | JavaScript | HTTP | Node.js native benchmarking | No |

---

## Q3: Node.js Profiling & Diagnostics

### Q: How do you profile a Node.js application and identify performance bottlenecks?

**A:** Node.js provides several built-in and ecosystem tools for profiling:

**Built-in profiling tools:**

| Tool | What It Measures | How to Use |
|---|---|---|
| `--prof` | V8 CPU profile (tick-based) | `node --prof app.js` then `node --prof-process isolate-*.log` |
| `--inspect` | Connects to Chrome DevTools | `node --inspect=0.0.0.0:9229 app.js` |
| `process.memoryUsage()` | Heap, RSS, external memory | Call periodically and log |
| `process.cpuUsage()` | User/system CPU time | Call before/after operation |
| `perf_hooks` | High-resolution timing | Wrap operations with performance marks |
| `--heap-prof` | Heap allocation profiling | `node --heap-prof app.js` |

**Clinic.js suite (by NearForm):**

```bash
# Overall health check — detects event loop delays, GC issues, I/O bottlenecks
npx clinic doctor -- node dist/main.js

# CPU flamegraph — identify hot functions consuming CPU
npx clinic flame -- node dist/main.js

# Async operations — visualize async flow and find bottlenecks
npx clinic bubbleprof -- node dist/main.js

# Heap profiler — find memory leaks
npx clinic heapprofiler -- node dist/main.js
```

**0x — lightweight flamegraph generator:**

```bash
npx 0x dist/main.js
# Generates an interactive flamegraph HTML file
# Wide bars = functions that consume the most CPU time
# Look for: JSON.parse, RegExp, synchronous file I/O
```

### Q: How do you monitor the event loop in Node.js and why does it matter?

**A:** The event loop is the heart of Node.js. If it is blocked, **every request waits**. Event loop lag > 100ms is a serious problem.

**Event loop lag monitoring middleware for NestJS:**

```typescript
// src/monitoring/event-loop.monitor.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { monitorEventLoopDelay } from 'perf_hooks';

@Injectable()
export class EventLoopMonitor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventLoopMonitor.name);
  private histogram = monitorEventLoopDelay({ resolution: 20 }); // 20ms resolution
  private intervalId: NodeJS.Timeout;

  onModuleInit() {
    this.histogram.enable();

    // Report every 5 seconds
    this.intervalId = setInterval(() => {
      const metrics = {
        eventLoopDelay: {
          min: this.ns2ms(this.histogram.min),
          max: this.ns2ms(this.histogram.max),
          mean: this.ns2ms(this.histogram.mean),
          stddev: this.ns2ms(this.histogram.stddev),
          p50: this.ns2ms(this.histogram.percentile(50)),
          p95: this.ns2ms(this.histogram.percentile(95)),
          p99: this.ns2ms(this.histogram.percentile(99)),
        },
      };

      // Alert if event loop lag is high
      if (metrics.eventLoopDelay.p99 > 100) {
        this.logger.warn(
          `Event loop lag p99: ${metrics.eventLoopDelay.p99.toFixed(2)}ms — investigate immediately`,
        );
      }

      // Send to monitoring system (Prometheus, CloudWatch, etc.)
      this.reportMetrics(metrics);
      this.histogram.reset();
    }, 5000);
  }

  onModuleDestroy() {
    clearInterval(this.intervalId);
    this.histogram.disable();
  }

  private ns2ms(ns: number): number {
    return ns / 1e6; // Nanoseconds to milliseconds
  }

  private reportMetrics(metrics: Record<string, unknown>) {
    // Example: push to Prometheus gauge
    // eventLoopDelayGauge.set({ percentile: 'p99' }, metrics.eventLoopDelay.p99);
    this.logger.debug(`Event loop metrics: ${JSON.stringify(metrics)}`);
  }
}
```

**Custom request timing middleware:**

```typescript
// src/middleware/performance.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger('PerformanceMiddleware');

  use(req: Request, res: Response, next: NextFunction) {
    const start = performance.now();
    const route = `${req.method} ${req.baseUrl}${req.path}`;

    // Track when response finishes
    res.on('finish', () => {
      const duration = performance.now() - start;
      const statusCode = res.statusCode;

      // Log slow requests (> 500ms)
      if (duration > 500) {
        this.logger.warn(
          `SLOW REQUEST: ${route} — ${duration.toFixed(2)}ms (status: ${statusCode})`,
        );
      }

      // Emit metric to monitoring system
      // httpRequestDuration.observe({ route, method: req.method, status: statusCode }, duration / 1000);
    });

    next();
  }
}
```

### Q: How do you detect and fix memory leaks in Node.js?

**A:** Memory leaks in Node.js manifest as **growing heap usage over time** during soak tests.

**Common memory leak patterns:**

| Pattern | Example | Fix |
|---|---|---|
| **Event listeners not removed** | `emitter.on('data', handler)` without `off` | Use `once()` or remove in cleanup |
| **Closures holding references** | Closure captures large object | Nullify references when done |
| **Unbounded caches** | `const cache = {}` grows forever | Use LRU cache with max size or `WeakMap` |
| **Leaked timers** | `setInterval` without `clearInterval` | Clean up in `onModuleDestroy` |
| **Global variables** | Appending to global arrays | Avoid globals, use bounded data structures |
| **Unreleased streams** | Stream not properly closed/consumed | Always handle `error` and `end` events |

**Memory leak detection with heap snapshots:**

```typescript
// src/debug/heap-snapshot.ts
import { writeHeapSnapshot } from 'v8';
import { Logger } from '@nestjs/common';

const logger = new Logger('HeapSnapshot');

// Take heap snapshot on demand (e.g., via admin endpoint)
export function takeHeapSnapshot(): string {
  const filename = writeHeapSnapshot();
  logger.log(`Heap snapshot written to: ${filename}`);
  return filename;
}

// Monitor memory usage over time
export function startMemoryMonitor(intervalMs = 30000) {
  const baseline = process.memoryUsage();

  setInterval(() => {
    const current = process.memoryUsage();
    const heapGrowth = current.heapUsed - baseline.heapUsed;
    const heapGrowthMB = (heapGrowth / 1024 / 1024).toFixed(2);

    logger.log({
      heapUsedMB: (current.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (current.heapTotal / 1024 / 1024).toFixed(2),
      rssMB: (current.rss / 1024 / 1024).toFixed(2),
      externalMB: (current.external / 1024 / 1024).toFixed(2),
      heapGrowthSinceStartMB: heapGrowthMB,
    });

    // Alert if heap has grown more than 100MB since start
    if (heapGrowth > 100 * 1024 * 1024) {
      logger.warn(`Possible memory leak: heap grew ${heapGrowthMB}MB since start`);
      takeHeapSnapshot(); // Auto-capture snapshot for analysis
    }
  }, intervalMs);
}
```

**Fix: Use LRU cache instead of unbounded object:**

```typescript
// BAD: unbounded cache — memory leak
const cache: Record<string, unknown> = {};
function getCached(key: string) {
  if (!cache[key]) {
    cache[key] = expensiveComputation(key); // Grows forever!
  }
  return cache[key];
}

// GOOD: LRU cache with max size
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, unknown>({
  max: 10_000,              // Maximum 10,000 entries
  ttl: 1000 * 60 * 5,      // 5-minute TTL
  maxSize: 50 * 1024 * 1024, // 50MB max memory
  sizeCalculation: (value) => JSON.stringify(value).length,
});

function getCached(key: string) {
  let value = cache.get(key);
  if (!value) {
    value = expensiveComputation(key);
    cache.set(key, value);
  }
  return value;
}
```

---

## Q4: Database Performance Optimization

### Q: How do you identify and fix slow database queries?

**A:**

**Step 1: Enable slow query logging**

```sql
-- PostgreSQL: log queries taking > 200ms
ALTER SYSTEM SET log_min_duration_statement = 200;
SELECT pg_reload_conf();
```

**Step 2: Use EXPLAIN ANALYZE to read execution plans**

```sql
EXPLAIN ANALYZE
SELECT p.*, c.name AS category_name
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE p.price > 100
  AND p.status = 'active'
ORDER BY p.created_at DESC
LIMIT 20;
```

**What to look for in the plan:**

| Red Flag | Meaning | Fix |
|---|---|---|
| **Seq Scan** on large table | Full table scan | Add index on filter columns |
| **Nested Loop** with many rows | O(n*m) join | Add index on join column, consider Hash Join |
| **Sort** with high cost | In-memory or disk sort | Add index matching ORDER BY |
| **Rows removed by filter** very high | Scanning too many rows | Better index or query rewrite |
| **Actual rows >> estimated rows** | Bad statistics | Run `ANALYZE table_name` |

**Step 3: Index strategies**

```sql
-- Single column index for WHERE clause
CREATE INDEX idx_products_status ON products (status);

-- Composite index for common query patterns
CREATE INDEX idx_products_status_price ON products (status, price);

-- Covering index — includes all SELECT columns, avoids table lookup
CREATE INDEX idx_products_covering ON products (status, price)
  INCLUDE (name, category_id, created_at);

-- Partial index — only index active products (smaller, faster)
CREATE INDEX idx_products_active ON products (price, created_at)
  WHERE status = 'active';

-- Expression index for computed lookups
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
```

### Q: How do you configure and tune database connection pooling?

**A:** Creating a database connection is expensive: TCP handshake + TLS negotiation + authentication + session setup = 20-50ms per connection.

**Connection pool sizing formula (PostgreSQL):**

```
connections = (core_count * 2) + effective_spindle_count

Example for a 4-core server with SSD:
  connections = (4 * 2) + 1 = 9 connections
```

**Smaller pools perform better** because they reduce context switching and lock contention. A pool of 10 connections can outperform a pool of 100.

**NestJS with TypeORM connection pooling:**

```typescript
// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        // Connection pool settings
        extra: {
          // Pool configuration (node-postgres pg-pool)
          max: 20,                // Maximum pool size
          min: 5,                 // Minimum idle connections
          idleTimeoutMillis: 30000,  // Close idle connections after 30s
          connectionTimeoutMillis: 5000, // Fail if connection takes > 5s
          // Statement timeout — kill queries running > 30s
          statement_timeout: 30000,
        },
        // TypeORM query logging for slow queries
        logging: ['error', 'warn'],
        maxQueryExecutionTime: 1000, // Log queries > 1s
      }),
    }),
  ],
})
export class DatabaseModule {}
```

**pgBouncer for external connection pooling (recommended for production):**

```ini
; pgbouncer.ini
[databases]
mydb = host=db-primary.internal port=5432 dbname=mydb

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0

; Pool mode
pool_mode = transaction    ; Recommended for most apps
; 'session' = connection per client session (default, least efficient)
; 'transaction' = connection per transaction (best for web apps)
; 'statement' = connection per statement (most restrictive)

; Pool sizing
default_pool_size = 20     ; Connections per user/database pair
min_pool_size = 5
reserve_pool_size = 5      ; Extra connections for bursts
reserve_pool_timeout = 3

max_client_conn = 1000     ; Can handle 1000 application connections
                           ; with only 20 actual DB connections
```

### Q: How do you solve the N+1 query problem?

**A:** The N+1 problem: 1 query fetches N parent records, then N queries fetch children. For 1000 products with categories, that is 1001 queries instead of 2.

```typescript
// BAD: N+1 queries
const products = await productRepo.find(); // 1 query
for (const product of products) {
  product.category = await categoryRepo.findOne({  // N queries!
    where: { id: product.categoryId },
  });
}

// GOOD: Eager loading with JOIN (TypeORM)
const products = await productRepo.find({
  relations: ['category'],  // Single query with LEFT JOIN
});

// GOOD: Explicit query builder with JOIN
const products = await productRepo
  .createQueryBuilder('product')
  .leftJoinAndSelect('product.category', 'category')
  .where('product.status = :status', { status: 'active' })
  .getMany();

// GOOD: DataLoader pattern for GraphQL (batches N queries into 1)
import DataLoader from 'dataloader';

const categoryLoader = new DataLoader<number, Category>(async (ids) => {
  const categories = await categoryRepo.findByIds([...ids]);
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  return ids.map(id => categoryMap.get(id)!);
});

// Each resolve call is batched automatically
const category = await categoryLoader.load(product.categoryId);
```

---

## Q5: API Performance Optimization

### Q: How do you optimize API response times in a NestJS application?

**A:** API optimization happens at multiple layers. Here is a comprehensive example:

**Optimized NestJS controller with caching, pagination, and compression:**

```typescript
// src/products/products.controller.ts
import {
  Controller, Get, Query, Param,
  UseInterceptors, Header, HttpStatus,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ProductsService } from './products.service';
import { CursorPaginationDto } from './dto/cursor-pagination.dto';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 1. Cache responses at application level
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 60 seconds
  // 2. Set Cache-Control for CDN/browser caching
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
  async findAll(@Query() pagination: CursorPaginationDto) {
    // 3. Cursor-based pagination (O(1) vs offset's O(n))
    return this.productsService.findAllCursor(pagination);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes (product details change less often)
  @Header('Cache-Control', 'public, max-age=300')
  async findOne(@Param('id') id: number) {
    return this.productsService.findOne(id);
  }
}
```

**Cursor-based pagination (constant time regardless of page depth):**

```typescript
// src/products/products.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Product } from './product.entity';

interface CursorPaginationDto {
  cursor?: string;  // Last item's ID (or encoded cursor)
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findAllCursor(
    pagination: CursorPaginationDto,
  ): Promise<PaginatedResult<Product>> {
    const limit = pagination.limit || 20;

    const queryBuilder = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category') // Avoid N+1
      .select(['product.id', 'product.name', 'product.price', 'category.name']) // Only needed fields
      .where('product.status = :status', { status: 'active' })
      .orderBy('product.id', 'DESC')
      .take(limit + 1); // Fetch one extra to check if there are more

    // Apply cursor (WHERE id < cursor)
    if (pagination.cursor) {
      queryBuilder.andWhere('product.id < :cursor', {
        cursor: parseInt(pagination.cursor, 10),
      });
    }

    const products = await queryBuilder.getMany();
    const hasMore = products.length > limit;

    if (hasMore) {
      products.pop(); // Remove the extra item
    }

    return {
      data: products,
      nextCursor: products.length > 0
        ? String(products[products.length - 1].id)
        : null,
      hasMore,
    };
  }
}
```

**Why cursor > offset pagination:**

```
Offset pagination:  SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 100000;
→ DB must scan and skip 100,000 rows — O(n) slower as page increases

Cursor pagination:  SELECT * FROM products WHERE id < 12345 ORDER BY id DESC LIMIT 20;
→ Uses index directly — O(1) constant time regardless of depth
```

### Q: What are the key API-level performance techniques?

**A:**

| Technique | Impact | Implementation |
|---|---|---|
| **Response compression** | 60-80% size reduction | NGINX `gzip on;` or NestJS `compression` middleware |
| **Cursor pagination** | O(1) vs O(n) for deep pages | WHERE clause instead of OFFSET |
| **Field selection** | Reduce payload by 50-90% | `?fields=id,name` or GraphQL |
| **HTTP caching** | Eliminate redundant requests | `Cache-Control`, `ETag` headers |
| **Async processing** | Return 202, process later | Queue (SQS/RabbitMQ) + worker |
| **HTTP/2** | Multiplexed connections | NGINX or ALB config |
| **Connection keep-alive** | Reuse TCP connections | Default in HTTP/1.1 |
| **Batch APIs** | Reduce round trips | `/api/batch` endpoint |
| **CDN** | Cache at edge globally | CloudFront in front of API |

**Async processing pattern (return 202 Accepted):**

```typescript
// Instead of processing 10,000 records synchronously:
@Post('reports/generate')
async generateReport(@Body() dto: GenerateReportDto) {
  // Queue the job — return immediately
  const jobId = await this.reportQueue.add('generate', {
    userId: dto.userId,
    dateRange: dto.dateRange,
  });

  // Return 202 Accepted with job ID for polling
  return {
    statusCode: HttpStatus.ACCEPTED,
    jobId: jobId.id,
    statusUrl: `/api/reports/status/${jobId.id}`,
    message: 'Report generation started. Poll statusUrl for progress.',
  };
}

@Get('reports/status/:jobId')
async getReportStatus(@Param('jobId') jobId: string) {
  const job = await this.reportQueue.getJob(jobId);
  return {
    status: await job.getState(),    // 'waiting' | 'active' | 'completed' | 'failed'
    progress: job.progress(),         // 0-100
    result: job.returnvalue,          // Available when completed
  };
}
```

---

## Q6: Caching Performance

### Q: What cache hit ratio should you target and how do you tune Redis for performance?

**A:**

**Cache hit ratio targets:**

| Hit Ratio | Assessment | Action |
|---|---|---|
| **> 95%** | Excellent | Maintain current strategy |
| **80-95%** | Good | Review TTLs, pre-warm cold paths |
| **50-80%** | Needs work | Revisit cache keys, increase TTL |
| **< 50%** | Cache is adding overhead | Rethink what you are caching |

**Cache-aside pattern with performance impact:**

```
Without cache: API → DB (20ms)
With cache:    API → Redis (1ms) — 20x faster on cache hit
               API → Redis miss → DB (20ms) → Set cache → 22ms on miss
```

**Redis performance tuning:**

```typescript
// src/cache/redis-performance.config.ts
import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ConfigService } from '@nestjs/config';

export const redisCacheConfig: CacheModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => ({
    store: await redisStore({
      socket: {
        host: config.get('REDIS_HOST'),
        port: config.get('REDIS_PORT'),
        // Connection pool (ioredis)
        connectTimeout: 5000,
        keepAlive: 30000,
      },
      // Default TTL: 5 minutes
      ttl: 300 * 1000,
    }),
  }),
};
```

**Redis pipeline for batch operations (huge performance gain):**

```typescript
// src/cache/redis-pipeline.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisPipelineService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  // BAD: 100 sequential commands = 100 round trips
  async getMultipleSlow(keys: string[]): Promise<(string | null)[]> {
    const results: (string | null)[] = [];
    for (const key of keys) {
      results.push(await this.redis.get(key)); // One round trip each!
    }
    return results;
  }

  // GOOD: Pipeline = 1 round trip for 100 commands
  async getMultipleFast(keys: string[]): Promise<(string | null)[]> {
    const pipeline = this.redis.pipeline();
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();
    return results!.map(([err, val]) => (err ? null : val as string | null));
  }

  // GOOD: MGET for simple multi-get (even simpler)
  async getMultipleMget(keys: string[]): Promise<(string | null)[]> {
    return this.redis.mget(...keys);
  }

  // Pipeline SET with different TTLs
  async setMultiple(
    entries: Array<{ key: string; value: string; ttlSeconds: number }>,
  ): Promise<void> {
    const pipeline = this.redis.pipeline();
    entries.forEach(({ key, value, ttlSeconds }) => {
      pipeline.setex(key, ttlSeconds, value);
    });
    await pipeline.exec();
  }
}
```

**Performance comparison:**

```
100 individual GET commands:
  100 round trips × 0.5ms network latency = 50ms minimum

Pipeline with 100 GET commands:
  1 round trip = 0.5ms + processing time ≈ 2ms

MGET with 100 keys:
  1 round trip = 0.5ms + processing time ≈ 1.5ms
```

### Q: How do you prevent cache stampede (thundering herd)?

**A:** A cache stampede happens when a popular cache key expires and **hundreds of concurrent requests** all try to rebuild the cache simultaneously, overwhelming the database.

```typescript
// src/cache/stampede-prevention.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class StampedePreventionService {
  private readonly logger = new Logger(StampedePreventionService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Strategy 1: Lock-based rebuild (mutex)
   * Only one request rebuilds cache, others wait or get stale data
   */
  async getWithLock<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
    lockTimeoutMs = 5000,
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss — try to acquire lock
    const lockKey = `lock:${key}`;
    const lockAcquired = await this.redis.set(
      lockKey,
      '1',
      'PX', lockTimeoutMs,  // Lock expires after timeout
      'NX',                  // Only set if not exists
    );

    if (lockAcquired) {
      try {
        // This request rebuilds the cache
        const data = await fetchFn();
        await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
        return data;
      } finally {
        await this.redis.del(lockKey);
      }
    } else {
      // Another request is rebuilding — wait and retry
      await this.sleep(100);
      const retryResult = await this.redis.get(key);
      if (retryResult) {
        return JSON.parse(retryResult);
      }
      // Fallback: just fetch directly (avoids infinite wait)
      return fetchFn();
    }
  }

  /**
   * Strategy 2: Stale-while-revalidate
   * Serve stale data immediately, refresh in background
   */
  async getWithStaleRefresh<T>(
    key: string,
    ttlSeconds: number,
    staleTtlSeconds: number,   // How long stale data is acceptable
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    const dataKey = key;
    const staleKey = `stale:${key}`;

    // Try fresh cache
    const fresh = await this.redis.get(dataKey);
    if (fresh) {
      return JSON.parse(fresh);
    }

    // Try stale cache — return immediately, refresh in background
    const stale = await this.redis.get(staleKey);
    if (stale) {
      // Trigger background refresh (non-blocking)
      this.refreshInBackground(dataKey, staleKey, ttlSeconds, staleTtlSeconds, fetchFn);
      return JSON.parse(stale);
    }

    // No data at all — must fetch synchronously
    const data = await fetchFn();
    await this.setWithStale(dataKey, staleKey, ttlSeconds, staleTtlSeconds, data);
    return data;
  }

  private async refreshInBackground<T>(
    dataKey: string,
    staleKey: string,
    ttlSeconds: number,
    staleTtlSeconds: number,
    fetchFn: () => Promise<T>,
  ): Promise<void> {
    // Use lock to prevent multiple background refreshes
    const lockKey = `refresh-lock:${dataKey}`;
    const acquired = await this.redis.set(lockKey, '1', 'PX', 10000, 'NX');
    if (!acquired) return;

    try {
      const data = await fetchFn();
      await this.setWithStale(dataKey, staleKey, ttlSeconds, staleTtlSeconds, data);
    } catch (error) {
      this.logger.error(`Background refresh failed for ${dataKey}: ${error}`);
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async setWithStale<T>(
    dataKey: string,
    staleKey: string,
    ttlSeconds: number,
    staleTtlSeconds: number,
    data: T,
  ): Promise<void> {
    const serialized = JSON.stringify(data);
    const pipeline = this.redis.pipeline();
    pipeline.setex(dataKey, ttlSeconds, serialized);
    pipeline.setex(staleKey, ttlSeconds + staleTtlSeconds, serialized);
    await pipeline.exec();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Usage in a service:**

```typescript
@Injectable()
export class ProductsService {
  constructor(
    private readonly stampede: StampedePreventionService,
    private readonly productRepo: Repository<Product>,
  ) {}

  async getPopularProducts(): Promise<Product[]> {
    return this.stampede.getWithStaleRefresh(
      'popular-products',
      60,    // Fresh TTL: 60 seconds
      300,   // Stale TTL: 5 minutes (serve stale data for up to 5 min)
      () => this.productRepo.find({
        where: { status: 'active' },
        order: { salesCount: 'DESC' },
        take: 50,
      }),
    );
  }
}
```

---

## Q7: Application-Level Optimization

### Q: How do you handle CPU-intensive work in Node.js without blocking the event loop?

**A:** Node.js is single-threaded. CPU-intensive work blocks the event loop, making **all requests wait**. Solutions:

| Approach | Best For | Example |
|---|---|---|
| **Worker Threads** | CPU-intensive computation (in-process) | Image processing, CSV parsing, crypto |
| **Child Process** | Heavy external programs | FFmpeg, ImageMagick |
| **External Queue** | Background processing | Report generation, bulk email |
| **Cluster Mode** | Utilizing all CPU cores | PM2 cluster, Node.js cluster module |

**Worker Threads for CPU-intensive operations:**

```typescript
// src/workers/heavy-computation.worker.ts
import { parentPort, workerData } from 'worker_threads';

interface WorkerInput {
  data: number[];
  operation: 'sort' | 'aggregate' | 'transform';
}

const input = workerData as WorkerInput;

function heavyComputation(input: WorkerInput): unknown {
  switch (input.operation) {
    case 'sort':
      return input.data.sort((a, b) => a - b);
    case 'aggregate':
      return {
        sum: input.data.reduce((a, b) => a + b, 0),
        avg: input.data.reduce((a, b) => a + b, 0) / input.data.length,
        min: Math.min(...input.data),
        max: Math.max(...input.data),
        count: input.data.length,
      };
    case 'transform':
      // Simulate CPU-heavy transformation
      return input.data.map(n => {
        let result = n;
        for (let i = 0; i < 1000; i++) {
          result = Math.sqrt(result * result + i);
        }
        return result;
      });
    default:
      throw new Error(`Unknown operation: ${input.operation}`);
  }
}

const result = heavyComputation(input);
parentPort?.postMessage(result);
```

```typescript
// src/workers/worker-pool.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { join } from 'path';

interface QueuedTask {
  workerData: unknown;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

@Injectable()
export class WorkerPoolService {
  private readonly logger = new Logger(WorkerPoolService.name);
  private readonly poolSize = Math.max(cpus().length - 1, 1);
  private workers: Worker[] = [];
  private busyWorkers = new Set<Worker>();
  private taskQueue: QueuedTask[] = [];

  constructor() {
    this.logger.log(`Initializing worker pool with ${this.poolSize} workers`);
    for (let i = 0; i < this.poolSize; i++) {
      this.addWorker();
    }
  }

  private addWorker(): void {
    const worker = new Worker(
      join(__dirname, 'heavy-computation.worker.js'),
      { workerData: null }, // Will be set per task
    );
    this.workers.push(worker);
  }

  async runTask<T>(workerData: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const availableWorker = this.workers.find(
        w => !this.busyWorkers.has(w),
      );

      if (availableWorker) {
        this.executeTask(availableWorker, { workerData, resolve, reject });
      } else {
        // Queue the task if all workers are busy
        this.taskQueue.push({ workerData, resolve, reject });
      }
    });
  }

  private executeTask(worker: Worker, task: QueuedTask): void {
    this.busyWorkers.add(worker);

    // Create a new worker for each task (workers can only process workerData once)
    const taskWorker = new Worker(
      join(__dirname, 'heavy-computation.worker.js'),
      { workerData: task.workerData },
    );

    taskWorker.on('message', (result) => {
      task.resolve(result);
      this.busyWorkers.delete(worker);
      taskWorker.terminate();
      this.processQueue();
    });

    taskWorker.on('error', (error) => {
      task.reject(error);
      this.busyWorkers.delete(worker);
      taskWorker.terminate();
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;
    const availableWorker = this.workers.find(
      w => !this.busyWorkers.has(w),
    );
    if (availableWorker) {
      const task = this.taskQueue.shift()!;
      this.executeTask(availableWorker, task);
    }
  }
}
```

### Q: How do you use streams for large data processing?

**A:** Never buffer entire files in memory. Use streams to process data chunk by chunk:

```typescript
// BAD: Loading entire CSV into memory
async function processCSVBad(filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8'); // 500MB in memory!
  const rows = content.split('\n');
  for (const row of rows) {
    await processRow(row);
  }
}

// GOOD: Stream processing — constant memory usage
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

async function processCSVStream(filePath: string): Promise<void> {
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let processedCount = 0;

  for await (const line of rl) {
    await processRow(line);
    processedCount++;

    if (processedCount % 10000 === 0) {
      console.log(`Processed ${processedCount} rows`);
    }
  }
}

// GOOD: Stream with backpressure using Transform
async function processWithBackpressure(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  const transformStream = new Transform({
    objectMode: true,
    async transform(chunk, encoding, callback) {
      try {
        const transformed = await processChunk(chunk);
        callback(null, transformed);
      } catch (error) {
        callback(error as Error);
      }
    },
    highWaterMark: 100, // Buffer up to 100 items
  });

  await pipelineAsync(
    createReadStream(inputPath),
    transformStream,
    createWriteStream(outputPath),
  );
}
```

### Q: What are other key application-level optimizations?

**A:**

**JSON serialization optimization:**

```typescript
// Standard JSON.stringify is slow for large payloads
// fast-json-stringify is 2-5x faster by pre-compiling the schema

import fastJson from 'fast-json-stringify';

const stringify = fastJson({
  title: 'Product',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    price: { type: 'number' },
    status: { type: 'string' },
  },
});

// Pre-compiled — 2-5x faster than JSON.stringify
const json = stringify({ id: 1, name: 'Product A', price: 29.99, status: 'active' });
```

**Cluster mode with PM2 (utilize all CPU cores):**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/main.js',
    instances: 'max',       // Use all CPU cores
    exec_mode: 'cluster',   // Cluster mode
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 10000,
    // Auto-restart on memory leak
    max_memory_restart: '500M',
  }],
};

// Start: pm2 start ecosystem.config.js --env production
// Monitor: pm2 monit
```

**Lazy loading and debouncing:**

```typescript
// Lazy loading: defer expensive initialization until first use
class ExpensiveService {
  private _client: SomeClient | null = null;

  private async getClient(): Promise<SomeClient> {
    if (!this._client) {
      this._client = await SomeClient.connect(config); // Only connect on first use
    }
    return this._client;
  }

  async query(params: QueryParams) {
    const client = await this.getClient();
    return client.query(params);
  }
}

// Debouncing: batch multiple rapid calls into one
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
): T {
  let timer: NodeJS.Timeout;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  }) as unknown as T;
}

// Throttling: limit execution rate
function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number,
): T {
  let lastRun = 0;
  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - lastRun >= limitMs) {
      lastRun = now;
      return fn(...args);
    }
  }) as unknown as T;
}
```

---

## Q8: Infrastructure-Level Optimization

### Q: How do you design auto-scaling for a Node.js backend?

**A:**

| Scaling Type | How | Best For | Limitation |
|---|---|---|---|
| **Horizontal** | Add more instances | Stateless web servers | Requires stateless design |
| **Vertical** | Bigger instance | Database servers | Has a ceiling, requires restart |
| **Predictive** | Pre-scale before traffic spike | Known patterns (daily peak) | Needs historical data |

**AWS Auto Scaling configuration (ECS/Fargate):**

```typescript
// CDK example: auto-scaling for NestJS API on ECS Fargate
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';

const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
  this, 'ApiService', {
    cluster,
    cpu: 1024,         // 1 vCPU
    memoryLimitMiB: 2048, // 2 GB
    desiredCount: 4,   // Start with 4 instances
    taskImageOptions: {
      image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
      containerPort: 3000,
      environment: {
        NODE_ENV: 'production',
      },
    },
    healthCheck: {
      path: '/health',
      interval: cdk.Duration.seconds(10),
    },
  },
);

// Auto-scaling rules
const scaling = fargateService.service.autoScaleTaskCount({
  minCapacity: 2,    // Never go below 2 instances
  maxCapacity: 20,   // Never exceed 20 instances
});

// Scale on CPU utilization
scaling.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 60,   // Target 60% CPU
  scaleInCooldown: cdk.Duration.seconds(300),  // Wait 5 min before scaling down
  scaleOutCooldown: cdk.Duration.seconds(60),  // Scale up faster (1 min)
});

// Scale on request count per target
scaling.scaleOnRequestCount('RequestScaling', {
  requestsPerTarget: 1000,   // 1000 requests per instance
  targetGroup: fargateService.targetGroup,
});

// Scheduled scaling for known traffic patterns
scaling.scaleOnSchedule('MorningScaleUp', {
  schedule: appscaling.Schedule.cron({ hour: '8', minute: '0' }),
  minCapacity: 8,   // Scale up before morning traffic
});

scaling.scaleOnSchedule('NightScaleDown', {
  schedule: appscaling.Schedule.cron({ hour: '22', minute: '0' }),
  minCapacity: 2,   // Scale down after evening
});
```

### Q: How do you optimize CDN and network configuration?

**A:**

**CloudFront CDN for API caching:**

```typescript
// CDK: CloudFront distribution for API + static assets
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

const distribution = new cloudfront.Distribution(this, 'ApiCDN', {
  defaultBehavior: {
    // Static assets from S3
    origin: new origins.S3Origin(assetsBucket),
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  additionalBehaviors: {
    // API responses — cache selectively
    '/api/products*': {
      origin: new origins.HttpOrigin(albDomainName),
      cachePolicy: new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
        defaultTtl: cdk.Duration.seconds(60),
        maxTtl: cdk.Duration.seconds(300),
        // Cache based on these request attributes
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList(
          'page', 'limit', 'cursor', 'category',
        ),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          'Accept', 'Accept-Encoding',
        ),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
    },
    // Non-cacheable endpoints (user-specific)
    '/api/users*': {
      origin: new origins.HttpOrigin(albDomainName),
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
    },
  },
});
```

**Infrastructure optimization checklist:**

| Area | Optimization | Impact |
|---|---|---|
| **Network** | Keep services in same AZ/VPC | Reduce latency by 1-5ms per call |
| **DNS** | Low TTL for failover, GeoDNS for global | Faster failover, lower latency |
| **Load balancer** | Connection draining, health checks | Zero-downtime deploys |
| **CDN** | Static + API response caching | 50-90% reduction in origin requests |
| **Right-sizing** | Monitor utilization, downsize | 30-50% cost reduction |
| **Spot instances** | For batch/background workers | 60-90% cost reduction |
| **Compression** | Brotli at CDN, gzip at origin | 60-80% payload reduction |

> **BD startup context:** "For BD startups, start with the cheapest setup that can handle your load: single AZ, t3.medium instances, basic ALB. Optimize as you grow. Don't over-engineer infrastructure for 1000 users. But at Banglalink scale (41M users), every millisecond of network latency and every unnecessary byte costs real money."

---

## Q9: Benchmarking & Performance Testing Strategy

### Q: How do you set up benchmarking for a Node.js application?

**A:**

**autocannon for HTTP benchmarking (Node.js native):**

```typescript
// benchmarks/api-benchmark.ts
import autocannon from 'autocannon';

interface BenchmarkResult {
  endpoint: string;
  latency: { p50: number; p95: number; p99: number; avg: number };
  throughput: { avg: number; max: number };
  errors: number;
  timeouts: number;
}

async function runBenchmark(
  url: string,
  options?: Partial<autocannon.Options>,
): Promise<BenchmarkResult> {
  const result = await autocannon({
    url,
    connections: 100,      // 100 concurrent connections
    duration: 30,           // 30 seconds
    pipelining: 10,         // 10 pipelined requests per connection
    ...options,
  });

  return {
    endpoint: url,
    latency: {
      p50: result.latency.p50,
      p95: result.latency.p95,
      p99: result.latency.p99,
      avg: result.latency.average,
    },
    throughput: {
      avg: result.requests.average,
      max: result.requests.max,
    },
    errors: result.errors,
    timeouts: result.timeouts,
  };
}

async function main() {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  console.log('Starting benchmarks...\n');

  // Benchmark each endpoint
  const endpoints = [
    { url: `${BASE_URL}/api/products`, name: 'Product List (cached)' },
    { url: `${BASE_URL}/api/products/1`, name: 'Product Detail (cached)' },
    { url: `${BASE_URL}/health`, name: 'Health Check' },
  ];

  const results: BenchmarkResult[] = [];

  for (const endpoint of endpoints) {
    console.log(`Benchmarking: ${endpoint.name}`);
    const result = await runBenchmark(endpoint.url);
    results.push(result);

    console.log(`  p50: ${result.latency.p50}ms | p99: ${result.latency.p99}ms | RPS: ${result.throughput.avg}`);
    console.log();
  }

  // POST endpoint benchmark
  console.log('Benchmarking: Create Order (write path)');
  const writeResult = await runBenchmark(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
    body: JSON.stringify({
      productId: 1,
      quantity: 1,
    }),
    connections: 50,    // Fewer connections for write path
    duration: 15,
  });
  results.push(writeResult);
  console.log(`  p50: ${writeResult.latency.p50}ms | p99: ${writeResult.latency.p99}ms | RPS: ${writeResult.throughput.avg}`);

  // Summary
  console.log('\n=== Summary ===');
  console.table(results.map(r => ({
    Endpoint: r.endpoint.replace(BASE_URL, ''),
    'p50 (ms)': r.latency.p50,
    'p95 (ms)': r.latency.p95,
    'p99 (ms)': r.latency.p99,
    'RPS (avg)': r.throughput.avg,
    Errors: r.errors,
  })));
}

main().catch(console.error);
```

### Q: How do you implement performance regression testing in CI?

**A:**

```typescript
// scripts/performance-regression-check.ts
import { readFileSync } from 'fs';

interface BenchmarkBaseline {
  endpoint: string;
  p99MaxMs: number;
  minRps: number;
}

const BASELINES: BenchmarkBaseline[] = [
  { endpoint: '/api/products', p99MaxMs: 200, minRps: 5000 },
  { endpoint: '/api/products/1', p99MaxMs: 100, minRps: 8000 },
  { endpoint: '/health', p99MaxMs: 10, minRps: 20000 },
];

const REGRESSION_THRESHOLD = 0.10; // 10% regression triggers failure

function checkRegressions(currentResults: BenchmarkResult[]): {
  passed: boolean;
  report: string[];
} {
  const report: string[] = [];
  let passed = true;

  for (const baseline of BASELINES) {
    const current = currentResults.find(r =>
      r.endpoint.endsWith(baseline.endpoint),
    );

    if (!current) {
      report.push(`MISSING: No results for ${baseline.endpoint}`);
      passed = false;
      continue;
    }

    // Check p99 latency
    if (current.latency.p99 > baseline.p99MaxMs) {
      const percentOver = ((current.latency.p99 - baseline.p99MaxMs) / baseline.p99MaxMs * 100).toFixed(1);
      report.push(
        `FAIL: ${baseline.endpoint} p99 = ${current.latency.p99}ms (max: ${baseline.p99MaxMs}ms, ${percentOver}% over)`,
      );
      passed = false;
    } else {
      report.push(
        `PASS: ${baseline.endpoint} p99 = ${current.latency.p99}ms (max: ${baseline.p99MaxMs}ms)`,
      );
    }

    // Check throughput
    if (current.throughput.avg < baseline.minRps) {
      const percentUnder = ((baseline.minRps - current.throughput.avg) / baseline.minRps * 100).toFixed(1);
      report.push(
        `FAIL: ${baseline.endpoint} RPS = ${current.throughput.avg} (min: ${baseline.minRps}, ${percentUnder}% under)`,
      );
      passed = false;
    } else {
      report.push(
        `PASS: ${baseline.endpoint} RPS = ${current.throughput.avg} (min: ${baseline.minRps})`,
      );
    }
  }

  return { passed, report };
}

// Run check
const resultsFile = process.argv[2] || 'benchmark-results.json';
const results = JSON.parse(readFileSync(resultsFile, 'utf-8'));
const { passed, report } = checkRegressions(results);

console.log('\n=== Performance Regression Report ===');
report.forEach(line => console.log(line));
console.log(`\nOverall: ${passed ? 'PASSED' : 'FAILED'}`);

process.exit(passed ? 0 : 1);
```

### Q: How do you approach capacity planning?

**A:**

```
Capacity Planning Framework:

1. Measure current capacity:
   - 4 instances × t3.large
   - Handles 4,000 RPS at p99 < 200ms
   - CPU: 60% at peak, Memory: 50%

2. Project future demand:
   - Current: 4,000 RPS
   - Expected growth: 2x in 6 months (business projection)
   - Target: 8,000 RPS

3. Calculate gap:
   - Need: 8,000 RPS
   - Current: 4,000 RPS
   - Gap: 4,000 RPS (100% increase)

4. Options:
   Option A: Scale horizontally
     - Add 4 more instances (8 total)
     - Cost: 2x current ($X/month → $2X/month)
     - Timeline: Immediate (auto-scaling)

   Option B: Optimize first, then scale
     - Add Redis caching → 40% reduction in DB calls
     - Optimize slow queries → 30% latency improvement
     - Result: Same 4 instances handle 6,500 RPS
     - Then add 2 more instances for 8,000+ RPS
     - Cost: 1.5x current + Redis ($50/month)
     - Timeline: 2-3 weeks of optimization

   Option C: Re-architect
     - Move to event-driven (queue-based) for writes
     - CDN caching for reads
     - Result: 4 instances handle 12,000 RPS
     - Cost: Similar (queue + CDN offset by fewer instances)
     - Timeline: 1-2 months

   Recommendation: Option B for short term, Option C for long term
```

> **BD context:** "At Banglalink with 41M subscribers, capacity planning was not optional — it was survival. We planned for Eid peak traffic (3x normal), mobile data promotions (spike), and seasonal patterns. The key was building auto-scaling with scheduled policies for known events and reactive policies for unexpected spikes."

---

## Q10: Common Performance Interview Questions

### Q: "Your API p99 latency spiked from 100ms to 2s. How do you debug it?"

**A:** Follow a structured approach — do not guess randomly:

```
Step 1: SCOPE — Which endpoint? When did it start?
  → Check monitoring dashboard (Grafana/CloudWatch)
  → Is it all endpoints or a specific one?
  → Correlate with deployment timeline

Step 2: IDENTIFY — Where is the time spent?
  → Check distributed traces (Jaeger/X-Ray)
  → Break down: network + app processing + DB + external calls
  → Example: DB query went from 10ms → 1.5s

Step 3: CORRELATE — What changed?
  → Recent deployment? (git log, deployment history)
  → Traffic spike? (check RPS metrics)
  → Database issue? (check slow query log, connection pool, locks)
  → External service degradation? (check third-party status)
  → Infrastructure issue? (CPU, memory, disk I/O, network)

Step 4: DIAGNOSE — Root cause analysis
  Common causes:
  ┌─────────────────────────────┬────────────────────────────────────┐
  │ Symptom                     │ Likely Cause                       │
  ├─────────────────────────────┼────────────────────────────────────┤
  │ All endpoints slow          │ Resource exhaustion (CPU/memory)   │
  │ One endpoint slow           │ Bad query, missing index, N+1     │
  │ Slow after deploy           │ Code regression                   │
  │ Gradual degradation         │ Memory leak, connection pool leak  │
  │ Intermittent spikes         │ GC pauses, noisy neighbor, locks  │
  │ Slow at specific times      │ Cron jobs, batch processes         │
  └─────────────────────────────┴────────────────────────────────────┘

Step 5: FIX — Apply the fix, verify, monitor
  → Fix the root cause (add index, fix query, increase pool, add cache)
  → Deploy fix, monitor p99 returning to baseline
  → Add alerting to catch recurrence
```

### Q: "How would you optimize a service that handles 10,000 requests per second?"

**A:**

```
Current state: 10,000 RPS, p99 = 500ms, target p99 < 100ms

Layer 1: Quick wins (days)
  - Add Redis caching for hot paths → 60% DB load reduction
  - Enable response compression → 70% bandwidth reduction
  - Connection pool tuning → eliminate connection wait time
  - Expected result: p99 → 200ms

Layer 2: Application optimization (1-2 weeks)
  - Profile with clinic.js flame → identify hot functions
  - Fix N+1 queries → reduce DB calls 5x
  - Add cursor pagination → eliminate slow offset queries
  - Move CPU-intensive work to worker threads
  - Expected result: p99 → 100ms

Layer 3: Architecture optimization (2-4 weeks)
  - Add CDN for cacheable API responses → 50% fewer origin hits
  - Implement async processing for writes → return 202 faster
  - Read replicas for read-heavy queries → distribute DB load
  - Event-driven architecture for decoupling → reduce cascade failures
  - Expected result: p99 → 50ms, can handle 30,000+ RPS

Layer 4: Infrastructure optimization (ongoing)
  - Auto-scaling with predictive + reactive policies
  - Right-size instances based on actual utilization
  - Multi-AZ for redundancy without latency penalty
  - Monitor everything: custom dashboards, alerts on degradation
```

### Q: "Design a caching strategy for an e-commerce product catalog"

**A:**

```
Requirements:
  - 100,000 products, 50,000 categories
  - 80% reads (browse, search), 20% writes (admin updates)
  - Product updates must reflect within 30 seconds
  - Peak: 20,000 RPS on product listing

Caching layers:

Layer 1: CDN (CloudFront) — TTL 60s
  - Cache product listing pages at edge
  - Cache-Control: public, max-age=60, stale-while-revalidate=30
  - Handles 70% of read traffic at edge
  - Invalidate on product update via CloudFront invalidation API

Layer 2: Application cache (Redis) — TTL 300s
  - Cache individual product details: product:{id}
  - Cache search results: search:{hash(query)}
  - Cache category listings: category:{id}:products
  - Use stale-while-revalidate pattern
  - Pipeline reads for batch operations

Layer 3: Database query cache — TTL 60s
  - Cache expensive aggregations (trending, most viewed)
  - Cache faceted search results

Write path (cache invalidation):
  1. Admin updates product in DB
  2. Publish event to SNS/EventBridge
  3. Consumer invalidates Redis keys: product:{id}, category:{categoryId}:products
  4. Optionally invalidate CDN for that product URL
  5. Search cache expires naturally (short TTL)

Cache key design:
  product:{id}                         → Single product
  product:{id}:v{version}              → Versioned (for atomic updates)
  products:list:cursor:{cursor}:limit:{limit}  → Paginated list
  products:category:{categoryId}:cursor:{cursor} → Category listing
  products:search:{md5(queryParams)}   → Search results
```

### Q: "How do you prevent a thundering herd when cache expires?"

**A:** (See Q6 for detailed implementation)

```
Three strategies:

1. Lock-based rebuild (mutex):
   → First request acquires lock and rebuilds cache
   → Other requests wait briefly, then get refreshed data
   → Pros: Simple, guaranteed fresh data
   → Cons: Brief wait for other requests

2. Stale-while-revalidate:
   → Serve stale data immediately
   → Refresh cache in background
   → Pros: No waiting, always fast
   → Cons: Brief window of stale data

3. Probabilistic early expiration (XFetch):
   → Randomly recompute cache BEFORE expiry
   → Each request has a small probability of refreshing
   → Prob(recompute) increases as TTL approaches expiry
   → Pros: Self-balancing, no coordination needed
   → Cons: More complex to implement

Recommendation: Use stale-while-revalidate for most cases.
Use lock-based when stale data is not acceptable (e.g., inventory counts).
```

---

## Quick Reference

### Performance Metrics Cheat Sheet

| Metric | Good | Warning | Critical |
|---|---|---|---|
| **p50 latency** | < 50ms | 50-200ms | > 200ms |
| **p99 latency** | < 200ms | 200ms-1s | > 1s |
| **Error rate** | < 0.1% | 0.1-1% | > 1% |
| **CPU utilization** | < 60% | 60-80% | > 80% |
| **Memory utilization** | < 70% | 70-85% | > 85% |
| **Event loop lag** | < 10ms | 10-100ms | > 100ms |
| **Cache hit ratio** | > 95% | 80-95% | < 80% |
| **DB connection pool** | < 70% used | 70-90% used | > 90% used |

### Load Testing Tool Comparison

| Tool | Best For | Language | Learning Curve |
|---|---|---|---|
| **k6** | Modern API testing | JavaScript | Low |
| **Artillery** | Quick YAML tests | YAML/JS | Very low |
| **JMeter** | Complex GUI scenarios | Java | Medium |
| **Locust** | Python teams | Python | Low |
| **autocannon** | Node.js benchmarking | JavaScript | Very low |
| **wrk** | Simple HTTP benchmarks | Lua | Very low |

### Node.js Profiling Tools

| Tool | Purpose | When to Use |
|---|---|---|
| `--prof` | V8 CPU profile | Production profiling |
| `--inspect` | Chrome DevTools | Development debugging |
| clinic doctor | Health check | First pass diagnosis |
| clinic flame | CPU flamegraph | CPU bottlenecks |
| clinic bubbleprof | Async visualization | Async bottlenecks |
| 0x | Lightweight flamegraph | Quick CPU analysis |
| `process.memoryUsage()` | Memory tracking | Leak detection |
| `monitorEventLoopDelay()` | Event loop health | Production monitoring |

### Optimization Checklist by Layer

```
Application Layer:
  [ ] Profile CPU with flamegraph — fix hot functions
  [ ] Check for event loop blocking — move CPU work to workers
  [ ] Fix memory leaks — use LRU cache, clean up listeners
  [ ] Optimize JSON serialization — fast-json-stringify
  [ ] Use streams for large data — never buffer entire files
  [ ] Enable cluster mode — utilize all CPU cores

API Layer:
  [ ] Enable response compression (gzip/brotli)
  [ ] Implement cursor-based pagination
  [ ] Add Cache-Control headers
  [ ] Return 202 for long-running operations
  [ ] Implement field selection (?fields=id,name)
  [ ] Use HTTP/2

Database Layer:
  [ ] Run EXPLAIN ANALYZE on slow queries
  [ ] Add missing indexes (composite, covering, partial)
  [ ] Configure connection pooling (pgBouncer)
  [ ] Fix N+1 queries (DataLoader, eager loading)
  [ ] Set up read replicas for read-heavy workloads
  [ ] Enable slow query logging and alerting

Caching Layer:
  [ ] Add Redis caching for hot paths
  [ ] Target >95% cache hit ratio
  [ ] Use pipelines for batch Redis operations
  [ ] Implement stampede prevention
  [ ] Set up cache warming on deployment
  [ ] Configure appropriate TTLs and eviction policies

Infrastructure Layer:
  [ ] Configure auto-scaling (CPU + request count)
  [ ] Set up CDN for static and cacheable API responses
  [ ] Right-size instances based on utilization
  [ ] Keep services in same AZ to minimize latency
  [ ] Enable connection draining on load balancer
  [ ] Set up comprehensive monitoring and alerting
```

### Common Interview Questions (Quick Answers)

| Question | Key Points |
|---|---|
| "p99 spiked, how to debug?" | Scope → Identify (traces) → Correlate (what changed?) → Fix |
| "Optimize for 10K RPS?" | Cache → Profile → Fix queries → Async → Scale |
| "Cache stampede prevention?" | Lock-based rebuild or stale-while-revalidate |
| "How to handle memory leaks?" | Soak test → Heap snapshots → Compare → Fix (LRU, cleanup) |
| "Event loop blocked, what now?" | Monitor lag → Flamegraph → Move CPU work to worker threads |
| "Cursor vs offset pagination?" | Cursor: O(1) always. Offset: O(n) degrades on deep pages |
| "Connection pool sizing?" | `(cores × 2) + spindles`. Smaller pools often faster |
| "When to scale up vs out?" | Out (horizontal) for stateless. Up (vertical) for databases |
| "How to approach capacity planning?" | Measure current → Project growth → Calculate gap → Optimize then scale |
| "Amdahl's Law significance?" | Speedup limited by sequential work. Optimize the critical path first |
